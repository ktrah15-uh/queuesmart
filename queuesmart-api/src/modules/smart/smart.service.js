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


let totalGap = 0;
let validCount = 0;

for (let i = 1; i < history.length; i++) {
    const prev = new Date(history[i - 1].endedAt);
    const curr = new Date(history[i].endedAt);

    const gap = (prev - curr) / 60000; // convert milliseconds to minutes

    //if gap is too large then the service was not available at that time and dont want to ruin the average
    if (gap <= 120) {
        totalGap = totalGap + gap;
        validCount++;
    }
}

//if we throw out too many gaps likely 
if (validCount < 3){
    return {rate: service.expectedDuration, source: 'expectedDuration'};
}

return {rate:Math.round(totalGap /validCount), source: 'history'};
}

//estimates the wait time for a given service and position
function estimateWait(serviceId,position){
    getService(serviceId);
    const {rate} = learnServiceMinutes(serviceId);

    
    let peopleAhead = 0;

    //check if frontend has position and if not check database
    if(position !== undefined && position !== null){
        peopleAhead = parseInt(position) || 0;
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
            return bestAlt;
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

        
        for(const row of hourData){
            if(row.visits >=3){ //only trust hours with at least 3 people
                //updates as we loop through hours
                if(!quietest || row.avgWait < quietest.avgWait) quietest = { hour: row.hour, wait: 
                    Math.round(row.avgWait) };
                if(!busiest || row.avgWait > busiest.avgWait) busiest = { hour: row.hour, wait: 
                    Math.round(row.avgWait) };
            }
        }

        return {quietest, busiest};
    }
//provides insight on the service including wait time, recommendation, and best times to join
    function getInsight(serviceId,position){
        const { rate, source } = learnServiceMinutes(serviceId);
        const estimate = estimateWait(serviceId, position);
        const recommendation = recommendAlternative(serviceId);
        const { quietest, busiest } = bestTimeToJoin(serviceId);

        return { rate, source, estimateWait: estimate, recommendation, bestTimes: { quietest, busiest}};
    }

    module.exports = {
        learnServiceMinutes,
        estimateWait,
        recommendAlternative,
        bestTimeToJoin,
        getInsight
    };