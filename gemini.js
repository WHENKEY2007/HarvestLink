/**
 * HarvestLink AI - Frontend Gemini Proxy Service
 * Delegates AI Crop Description, AI Market Advisor, and AI Farming Chat requests to Express REST API endpoints.
 * The Gemini API Key is maintained exclusively on the backend server environment.
 */

class GeminiService {
  constructor() {}

  isLive() {
    return true;
  }

  async generateCropDescription(crop) {
    try {
      const response = await window.ApiService.post('/ai/description', crop);
      if (response && response.success && response.description) {
        return response.description;
      }
      throw new Error(response.error || 'Failed to generate crop description');
    } catch (error) {
      console.warn('[Gemini Proxy Error] generateCropDescription:', error.message);
      throw error;
    }
  }

  async getSellingSuggestions(crop, isBuyer = false) {
    try {
      const response = await window.ApiService.post('/ai/recommendation', { crop, isBuyer });
      if (response && response.success && response.recommendation) {
        return response.recommendation;
      }
      throw new Error(response.error || 'Failed to fetch AI market recommendation');
    } catch (error) {
      console.warn('[Gemini Proxy Error] getSellingSuggestions:', error.message);
      throw error;
    }
  }

  async askFarmingQuestion(question, chatHistory = []) {
    try {
      const response = await window.ApiService.post('/ai/chat', { question, history: chatHistory });
      if (response && response.success && response.answer) {
        return response.answer;
      }
      throw new Error(response.error || 'Failed to get answer from AI Advisor');
    } catch (error) {
      console.warn('[Gemini Proxy Error] askFarmingQuestion:', error.message);
      throw error;
    }
  }
}

// Attach globally
window.GeminiService = new GeminiService();
