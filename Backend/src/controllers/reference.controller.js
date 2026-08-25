const crops = require('../data/crops.json');
const practices = require('../data/irrigationPractices.json');

function getRecommendationReferenceData(req, res) {
  res.json({
    status: 'SUCCESS',
    data: {
      crops: crops.crops,
      irrigationPractices: practices.practices
    }
  });
}

module.exports = { getRecommendationReferenceData };
