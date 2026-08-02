const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiBackendService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
  }

  getApiKey() {
    return process.env.GEMINI_API_KEY || this.apiKey || '';
  }

  async callGeminiAPI(prompt) {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('Gemini API key is not configured on the backend server.');
    }

    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (sdkError) {
      console.warn('[Gemini SDK Warning, attempting REST API fallback]:', sdkError.message);
      // REST API fallback
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API HTTP Error ${res.status}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Received empty text from Gemini API response.');
      return text;
    }
  }

  async generateCropDescription(crop) {
    const name = crop.cropName || crop.name || 'Crop';
    const category = crop.category || '';
    const variety = crop.variety || '';
    const quantity = crop.quantity || 0;
    const unit = crop.unit || 'kg';
    const price = crop.price || 0;
    const location = crop.location || '';
    const harvestDate = crop.harvestDate || '';

    const prompt = `You are an expert agricultural copywriter. Write a compelling, professional, and appealing product description for a crop listing.
Crop Details:
- Crop Name: ${name}
- Category: ${category}
- Variety: ${variety || "Standard"}
- Available Quantity: ${quantity} ${unit}
- Expected Price: Rs. ${price} per ${unit}
- Farm Location: ${location}
- Harvest Date: ${harvestDate}

Write a description that highlights the freshness, quality, potential uses, and storage conditions. Keep it clean, professional, and under 150 words. Do not include markdown titles.`;

    try {
      if (this.getApiKey()) {
        return await this.callGeminiAPI(prompt);
      }
    } catch (err) {
      console.error('[Gemini Service Error]', err.message);
    }

    // High quality server-side fallback when API key is unconfigured or unavailable
    return this.fallbackDescription(crop);
  }

  async getMarketRecommendation(crop, isBuyer = false) {
    const name = crop.cropName || crop.name || 'Crop';
    const category = crop.category || '';
    const variety = crop.variety || '';
    const quantity = crop.quantity || 0;
    const unit = crop.unit || 'kg';
    const price = crop.price || 0;
    const location = crop.location || '';

    let prompt = '';
    if (isBuyer) {
      prompt = `You are a smart agricultural procurement analyst. Provide purchase evaluation suggestions for a buyer interested in this crop listing.
Crop Details:
- Crop Name: ${name}
- Category: ${category}
- Variety: ${variety || "Standard"}
- Quantity: ${quantity} ${unit}
- Seller Asking Price: Rs. ${price} per ${unit}
- Location: ${location}

Provide a structured analysis in simple, encouraging language:
1. Pricing Assessment: Is the seller's asking price of Rs. ${price} per ${unit} fair compared to market rates? Should the buyer negotiate, and what is a reasonable target range?
2. Demand & Availability: Is this crop variety in short supply or high availability?
3. Logistics & Transport: One practical tip for transporting/storing this crop from ${location}.
4. Purchasing Recommendation: Buy immediately, negotiate, or look for other listings?
Make the layout highly readable, and keep the total response under 250 words.`;
    } else {
      prompt = `You are a smart agricultural market analyst. Provide data-driven selling recommendations and market insights for the following crop listing.
Crop Details:
- Crop Name: ${name}
- Category: ${category}
- Variety: ${variety || "Standard"}
- Quantity: ${quantity} ${unit}
- Current Seller Target Price: Rs. ${price} per ${unit}
- Location: ${location}

Provide a structured analysis in simple, encouraging language:
1. Demand Status: Is the demand high, moderate, or low currently?
2. Recommended Selling Window: Should the farmer sell immediately or hold? Why?
3. Pricing Assessment: Is Rs. ${price} per ${unit} fair, or should they adjust it?
4. Storage Advisory: One practical advice to preserve quality while waiting to sell.
5. AI Insight: High-level market summary.
Make the layout highly readable, and keep the total response under 250 words.`;
    }

    try {
      if (this.getApiKey()) {
        return await this.callGeminiAPI(prompt);
      }
    } catch (err) {
      console.error('[Gemini Service Error]', err.message);
    }

    return this.fallbackRecommendation(crop, isBuyer);
  }

  async askFarmingQuestion(question, chatHistory = []) {
    const systemContext = "You are HarvestLink AI, an expert agricultural advisor. Your job is to help farmers and agricultural buyers with crop listings, market pricing insights, pest control, weather preparation, organic farming techniques, and logistics. Be encouraging, concise, practical, and clear. Format responses with markdown lists where appropriate.";
    
    let prompt = `${systemContext}\n\n`;
    if (Array.isArray(chatHistory)) {
      chatHistory.forEach(msg => {
        prompt += `${msg.sender === "user" ? "User" : "HarvestLink AI"}: ${msg.text}\n`;
      });
    }
    prompt += `User: ${question}\nHarvestLink AI:`;

    try {
      if (this.getApiKey()) {
        return await this.callGeminiAPI(prompt);
      }
    } catch (err) {
      console.error('[Gemini Service Error]', err.message);
    }

    return this.fallbackChatResponse(question);
  }

  fallbackDescription(crop) {
    const name = crop.cropName || crop.name || 'Crop';
    const loc = crop.location || 'Nashik';
    const price = crop.price || 0;
    const unit = crop.unit || 'kg';

    return `Premium high-quality harvest of ${name} (${crop.variety || 'Standard Variety'}), grown with sustainable farming practices in ${loc}. Excellent texture, color, and nutritional profile. Properly cleaned, sorted, and packaged in moisture-proof containers. Offered at an estimated price of Rs. ${price} per ${unit}. Ready for prompt procurement and transport.`;
  }

  fallbackRecommendation(crop, isBuyer = false) {
    const name = crop.cropName || crop.name || 'Crop';
    const price = crop.price || 0;
    const unit = crop.unit || 'kg';

    if (isBuyer) {
      return `### AI Purchase Valuation for ${name}

* **Pricing Assessment**: The asking price of Rs. ${price} per ${unit} is within reasonable market range.
* **Market Demand / Supply**: Supply is currently steady with steady regional mandi arrivals.
* **Logistics Advice**: Use ventilated transportation crates to preserve freshness during transit.
* **Purchasing Recommendation**: **Negotiate** — Consider offering a 3-5% discount for bulk orders.

**AI Purchase Insight:**
Direct procurement from this seller provides a reliable supply line. Verify quality parameters upon delivery.`;
    } else {
      return `### Market Analysis for ${name}

* **Demand Status**: **High Demand**
* **Recommended Window**: Sell within 1-2 weeks for optimal pricing.
* **Pricing Assessment**: Target price of Rs. ${price} per ${unit} aligns with current market demand.
* **Storage Advisory**: Store in a cool, well-ventilated dry warehouse off the floor.

**AI Market Insight Summary:**
Regional mandi trends show strong demand for quality harvest. Maintain good storage conditions to retain top pricing.`;
    }
  }

  fallbackChatResponse(question) {
    const q = question.toLowerCase();
    if (q.includes('pest') || q.includes('disease') || q.includes('insects')) {
      return `For pest and disease management:
* **Neem Oil Spray**: Mix 15-20ml neem oil per liter of water with soap to target aphids and whiteflies.
* **Crop Rotation**: Alternate crop families every season to disrupt soil-borne pathogens.
* **Monitoring**: Install sticky traps across field borders to track insect counts early.`;
    } else if (q.includes('price') || q.includes('market') || q.includes('sell')) {
      return `Based on agricultural mandi trends:
* **Grains**: Prices remain stable. Good demand for well-cured batches with moisture under 12%.
* **Vegetables**: Prices fluctuate daily depending on weather and transit conditions.
* **Direct Selling**: Listing your crops on HarvestLink allows direct negotiation with buyers without intermediary margins.`;
    } else {
      return `Hello! I am HarvestLink AI. I can assist you with crop management, pest control, market pricing strategies, post-harvest storage, and buyer negotiations. Feel free to ask any question about your farming operations!`;
    }
  }
}

module.exports = new GeminiBackendService();
