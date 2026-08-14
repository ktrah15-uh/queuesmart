const express = require('express');
const router = express.Router();
const smartService = require('./smart.service');

const { requireAuth } = require('../../middleware/auth');
const { ValidationError, ApiError} = require('../../utils/validate');

router.use(requireAuth); // only logged users can 

//endpoint for insight panel
router.get('/services/:id/insight', (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw new ValidationError({ id: 'Invalid service ID' });
        }
            const position = req.query.position ? parseInt(req.query.position) : undefined; // get position from query
            res.json(smartService.getInsight(id, position));

        } catch (err) {

        next(err);
        }

    });
//best times
router.get('/services/:id/best-times', (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw new ValidationError({ id: 'Invalid service ID' });
        }
        res.json(smartService.bestTimeToJoin(id));
    } catch (err) {
        next(err);
    }
});
//rate endpoint
router.get('/services/:id/rate',(req,res,next) => {
    try{
        const id = parseInt(req.params.id);

        if(isNaN(id)){
            throw new ValidationError({ id: 'Invalid service ID'});
        }

        res.json(smartService.learnServiceMinutes(id));
    } catch (err){

        next(err);
    }

});

module.exports = router;
