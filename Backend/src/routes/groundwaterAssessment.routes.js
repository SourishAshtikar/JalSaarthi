const express = require('express');
const router = express.Router();
const groundwaterAssessmentController = require('../controllers/groundwaterAssessment.controller');

router.get('/years', groundwaterAssessmentController.getYears);
router.get('/', groundwaterAssessmentController.getAssessments);
router.get('/details', groundwaterAssessmentController.getDetails);

module.exports = router;
