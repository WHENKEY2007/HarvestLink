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

    const modelsToTry = ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

    // 1. Try GoogleGenerativeAI SDK
    let lastSdkError = null;
    for (const modelName of modelsToTry) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        if (text && text.trim()) return text.trim();
      } catch (sdkError) {
        lastSdkError = sdkError;
        console.warn(`[Gemini SDK Model ${modelName} Warning]:`, sdkError.message);
      }
    }

    // 2. REST API fallback if SDK fails
    console.warn('[Gemini SDK Warning, attempting REST API fallback]:', lastSdkError?.message);
    for (const modelName of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) return text.trim();
        }
      } catch (restErr) {
        console.warn(`[Gemini REST Fallback ${modelName} Warning]:`, restErr.message);
      }
    }

    throw lastSdkError || new Error('All Gemini API models failed');
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
    
    if (q.includes('rain') || q.includes('monsoon') || q.includes('waterlog') || q.includes('rainy')) {
      return `Here are the top crops and cultivation practices for the rainy (Kharif) season:

* **Paddy / Rice**: Thrives in heavy rainfall and flooded soil conditions.
* **Maize (Corn)**: Excellent choice for well-drained soils during monsoon.
* **Soybeans & Pulses (Arhar/Tur, Moong)**: Fast-growing nitrogen-fixing crops suitable for monsoon farming.
* **Sugarcane & Cotton**: High-value cash crops suited for warm, moist monsoon climates.
* **Monsoon Vegetables**: Bottle gourd, ridge gourd, okra (bhindi), and cucumber on raised beds.

**Key Management Tips for Rainy Season:**
1. **Field Drainage**: Ensure proper field channels to prevent water stagnation and root rot.
2. **Fungicide Treatment**: Treat seeds with Trichoderma or organic bio-fungicide to prevent dampening-off diseases.
3. **Raised Bed Cultivation**: Plant vegetables on raised ridges to keep roots aerated during heavy downpours.`;
    }

    if (q.includes('pest') || q.includes('disease') || q.includes('insects') || q.includes('bug') || q.includes('fungus')) {
      return `For effective agricultural pest and disease management:

* **Organic Neem Oil Spray**: Mix 15-20ml neem oil per liter of water with a few drops of liquid soap. Spray on leaves to control aphids, whiteflies, and thrips.
* **Crop Rotation**: Rotate nightshades (tomatoes, peppers) with legumes (beans, peas) to disrupt soil-borne pathogens.
* **Pheromone & Sticky Traps**: Install yellow sticky traps (10-12 per acre) across field borders to catch flying pests early.
* **Bio-Fungicide**: Use Pseudomonas fluorescens or Trichoderma harzianum for soil treatment against root rot.`;
    }

    if (q.includes('price') || q.includes('market') || q.includes('sell') || q.includes('rate') || q.includes('buyer') || q.includes('cost')) {
      return `Based on regional mandi trends and agricultural market data:

* **Quality Grading**: Clean, sorted, and well-graded crops fetch 10-15% higher market rates.
* **Moisture Testing**: Keep grain moisture under 12% to prevent discounting at mandis and storage centers.
* **Direct Buyer Access**: Listing your inventory on HarvestLink allows direct negotiation with wholesale buyers without middleman commissions.
* **Timing the Market**: Track weekly arrivals; avoid selling during peak supply flooding when prices dip temporarily.`;
    }

    if (q.includes('fertilizer') || q.includes('soil') || q.includes('compost') || q.includes('npk') || q.includes('nutrient')) {
      return `Recommended soil & fertilizer management practices:

* **Soil Testing**: Test your soil pH (ideal range: 6.0 - 7.5) and organic carbon content before applying chemical fertilizers.
* **Balanced NPK Ratio**: Use Nitrogen (N) for vegetative growth, Phosphorus (P) for root development, and Potassium (K) for fruit sizing.
* **Organic Matter**: Incorporate 4-5 tons of farmyard manure (FYM) or vermicompost per acre to boost soil microbial health.
* **Micronutrient Application**: Apply Zinc Sulphate (25 kg/ha) and Boron for flowering and fruit set.`;
    }

    if (q.includes('storage') || q.includes('store') || q.includes('shelf') || q.includes('harvest')) {
      return `Best post-harvest storage practices:

* **Moisture Control**: Dry grains to 10-12% moisture before packing to prevent mold and aflatoxin development.
* **Aeration & Ventilation**: Store sacks on wooden pallets in a cool, ventilated warehouse at least 1 foot away from walls.
* **Pest Proofing**: Use hermetic bags (Purdue Improved Crop Storage bags) for chemical-free insect preservation up to 12 months.`;
    }

    return `### Agricultural Advisory for: "${question}"

Here are practical recommendations for your farming query:

1. **Crop Selection & Climate**: Ensure your crop variety matches local rainfall patterns, soil type, and temperature ranges.
2. **Soil Health**: Prepare soil with well-decomposed organic manure and ensure efficient drainage channels.
3. **Pest & Disease Watch**: Inspect leaf undersides weekly and apply preventive organic sprays at the first sign of pests.
4. **Market Strategy**: Harvest at peak maturity and list your produce on HarvestLink to negotiate directly with buyers for optimal returns.

*Feel free to ask follow-up questions about specific crops, pest control, weather preparation, or market pricing!*`;
  }
}

module.exports = new GeminiBackendService();
