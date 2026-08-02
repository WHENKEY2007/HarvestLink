const geminiService = require('../services/geminiService');

const generateDescription = async (req, res, next) => {
  try {
    const crop = req.body;
    if (!crop || (!crop.cropName && !crop.name)) {
      return res.status(400).json({
        success: false,
        error: 'Crop details with cropName are required'
      });
    }

    const description = await geminiService.generateCropDescription(crop);

    return res.status(200).json({
      success: true,
      description
    });
  } catch (error) {
    next(error);
  }
};

const getRecommendation = async (req, res, next) => {
  try {
    const { crop, isBuyer } = req.body;
    if (!crop) {
      return res.status(400).json({
        success: false,
        error: 'Crop object is required'
      });
    }

    const recommendation = await geminiService.getMarketRecommendation(crop, !!isBuyer);

    return res.status(200).json({
      success: true,
      recommendation
    });
  } catch (error) {
    next(error);
  }
};

const askChat = async (req, res, next) => {
  try {
    const { question, history } = req.body;
    if (!question || typeof question !== 'string' || question.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'A valid question string is required'
      });
    }

    const answer = await geminiService.askFarmingQuestion(question.trim(), history || []);

    return res.status(200).json({
      success: true,
      answer
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateDescription,
  getRecommendation,
  askChat
};
