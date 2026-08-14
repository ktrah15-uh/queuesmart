const { db } = require('../../data/db');
const {ApiError} = require('../../utils/validate');

//checks if service exists or not in database
function getService(serviceId) {
    const service = db.prepare('SELECT * FROM Service WHERE id = ?').get(serviceId);
    if (!service) {
        throw new ApiError(404, 'SERVICE_NOT_FOUND', `Service ${serviceId} not found`);
    }
    return service;
}

//History holds two timestamp formats: 'YYYY-MM-DD HH:MM:SS' from the seed script
//and full ISO with a Z from live app writes. new Date() reads the first as local
//time and the second as UTC, so mixing them invents a whole timezone offset.
//Normalising to UTC minutes keeps every gap honest.
function toMinutes(timestamp) {
    const iso = timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T') + 'Z';
    return new Date(iso).getTime() / 60000;
}

//learns the time of queue services based on history
function learnServiceMinutes(serviceId) {

    const service = getService(serviceId);

    //last 50 people
    const history = db.prepare(`Select endedAt FROM History WHERE serviceId = ? AND outcome = 'served'
         AND endedAt IS NOT NULL ORDER BY endedAt DESC LIMIT 50`).all(serviceId);

         // not enough data to learn
if (history.length < 2){
    return {rate: service.expectedDuration, source: 'expectedDuration'};
}


const gaps = [];

for (let i = 1; i < history.length; i++) {
    const prev = toMinutes(history[i - 1].endedAt);
    const curr = toMinutes(history[i].endedAt);

    const gap = prev - curr; // minutes between two consecutive completions

    //if gap is too large then the service was not available at that time and dont want to ruin the average
    if (gap > 0 && gap <= 120) {
        gaps.push(gap);
    }
}

//if we throw out too many gaps likely 
if (gaps.length < 3){
    return {rate: service.expectedDuration, source: 'expectedDuration'};
}

//median, not mean. a desk goes quiet between rushes and those idle gaps are not
//service time - one 55 minute lull would drag a mean way above what someone
//standing in line actually experiences
gaps.sort((a, b) => a - b);
const mid = Math.floor(gaps.length / 2);
const median = gaps.length % 2 === 0 ? (gaps[mid - 1] + gaps[mid]) / 2 : gaps[mid];

return {rate: Math.max(1, Math.round(median)), source: 'history', samples: gaps.length};
}

//estimates the wait time for a given service and position
function estimateWait(serviceId,position){
    getService(serviceId);
    const {rate} = learnServiceMinutes(serviceId);

    
    let peopleAhead = 0;

    //check if frontend has position and if not check database
    if(position !== undefined && position !== null){
        //position 1 means you are at the front, so nobody is ahead of you
        peopleAhead = Math.max(0, (parseInt(position) || 0) - 1);
    }else{
        const waitRow = db.prepare(`SELECT COUNT(*) as count FROM QueueEntry qe join Queue q ON qe.queueId = q.id
            WHERE q.serviceId = ? AND qe.status = 'waiting'`).get(serviceId);
        peopleAhead = waitRow.count;
    }

    return peopleAhead * rate;
}
//recommends an alternative service if it saves at least 10 minutes and 25% of the wait time
function recommendAlternative(serviceId){


    getService(serviceId);
    const currentWait = estimateWait(serviceId);

    const openQueues = db.prepare(`SELECT s.id, s.name FROM Service s
        JOIN Queue q ON s.id = q.serviceId
        WHERE q.status = 'open' AND s.id != ?`).all(serviceId);

        let bestAlt = null;
        let lowestWait = 99999;

        //find wait time for every service
        for(const alt of openQueues){
            const altWait = estimateWait(alt.id);
            if(altWait < lowestWait){
                lowestWait = altWait;
                bestAlt = { id: alt.id, name: alt.name, estimate: altWait };
            }
        }

        // queue n/a
        if(!bestAlt){
            return null;
        }

        const timeSaved = currentWait - bestAlt.estimate;
        const percentSaved = (timeSaved / currentWait);

        //only if saves at least 10 minutes and cuts their wait by 25%
        if(timeSaved >= 10 && percentSaved >= 0.25){
            return { ...bestAlt, savingMinutes: Math.round(timeSaved) };
        }

        return null;
}
//finds the best time to join a queue based on historical data
function bestTimeToJoin(serviceId){
    getService(serviceId);

    //group historical data and ind wait time in minutes from the database
    const hourData = db.prepare(`SELECT CAST(strftime('%H', joinedAt) AS INTEGER) AS hour,
        AVG((julianday(endedAt) - julianday(joinedAt)) * 1440) as avgWait, 
        COUNT(*) AS visits FROM History WHERE serviceId = ? AND joinedAt IS NOT NULL AND endedAt IS NOT NULL 
        GROUP BY CAST(strftime('%H', joinedAt) AS INTEGER)`).all(serviceId);

        let quietest = null;
        let busiest = null;
        const byHour = [];

        
        for(const row of hourData){
            if(row.visits >=3){ //only trust hours with at least 3 people
                const entry = { hour: row.hour, visits: row.visits,
                    avgWaitMinutes: Math.round(row.avgWait * 10) / 10 };
                byHour.push(entry);

                //compare against avgWaitMinutes - comparing against a key that was
                //never stored makes every test undefined and freezes both values
                //on whichever hour came back first
                if(!quietest || entry.avgWaitMinutes < quietest.avgWaitMinutes) quietest = entry;
                if(!busiest || entry.avgWaitMinutes > busiest.avgWaitMinutes) busiest = entry;
            }
        }

        //one hour on its own cannot be both the quietest and the busiest
        if(byHour.length < 2){
            return {quietest: byHour.length === 1 ? byHour[0] : null, busiest: null, byHour};
        }

        return {quietest, busiest, byHour};
    }
//provides insight on the service including wait time, recommendation, and best times to join
    function getInsight(serviceId,position){
        const service = getService(serviceId);
        const { rate, source, samples } = learnServiceMinutes(serviceId);
        const estimatedMinutes = estimateWait(serviceId, position);
        const recommendation = recommendAlternative(serviceId);
        const { quietest, busiest, byHour } = bestTimeToJoin(serviceId);

        const peopleAhead = rate > 0 ? Math.round(estimatedMinutes / rate) : 0;

        //say where the number came from in plain english - this is the whole point
        //of the feature, so the UI has to be able to show it
        let explanation;
        if (peopleAhead === 0) {
            explanation = 'Nobody ahead of you - you should be seen shortly.';
        } else if (source === 'history') {
            explanation = `${peopleAhead} ahead of you, and this desk has been clearing ` +
                `one person every ${rate} minutes lately.`;
        } else {
            explanation = `${peopleAhead} ahead of you, at the ${rate} minutes this service ` +
                `is scheduled to take. Not enough completed visits yet to measure the real rate.`;
        }

        let note = null;
        if (quietest && busiest) {
            note = `Quietest around ${formatHour(quietest.hour)} (about ` +
                `${quietest.avgWaitMinutes} min), busiest around ${formatHour(busiest.hour)} ` +
                `(about ${busiest.avgWaitMinutes} min).`;
        }

        //shape agreed with David for <SmartInsight />
        return {
            serviceId: service.id,
            serviceName: service.name,
            estimate: {
                estimatedMinutes,
                peopleAhead,
                minutesPerPerson: rate,
                basis: source,
                samples: samples || 0,
                explanation
            },
            alternative: recommendation ? {
                serviceId: recommendation.id,
                serviceName: recommendation.name,
                estimatedMinutes: recommendation.estimate,
                savingMinutes: recommendation.savingMinutes
            } : null,
            bestTime: {
                byHour,
                quietest: quietest ? quietest.hour : null,
                busiest: busiest ? busiest.hour : null,
                note
            }
        };
    }

    //0 -> midnight, 12 -> noon, 15 -> 3pm
    function formatHour(hour){
        if (hour === 0) return 'midnight';
        if (hour === 12) return 'noon';
        return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
    }

    module.exports = {
        formatHour,
        learnServiceMinutes,
        estimateWait,
        recommendAlternative,
        bestTimeToJoin,
        getInsight
    };