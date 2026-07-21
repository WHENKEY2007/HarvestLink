class GeminiService {
  constructor() {
    this.apiKey = localStorage.getItem("harvestlink_gemini_api_key") || "";
  }

  setApiKey(key) {
    this.apiKey = key.trim();
    if (this.apiKey) {
      localStorage.setItem("harvestlink_gemini_api_key", this.apiKey);
    } else {
      localStorage.removeItem("harvestlink_gemini_api_key");
    }
  }

  getApiKey() {
    return this.apiKey;
  }

  isLive() {
    return !!this.apiKey;
  }

  async validateApiKey(key) {
    if (!key) throw new Error("API Key is empty.");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key.trim()}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Respond with only one word: OK" }] }]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const code = response.status;
        const msg = errorData.error?.message || "";
        
        if (code === 400) {
          throw new Error("Invalid request or unsupported model config.");
        } else if (code === 403) {
          throw new Error("Invalid API Key. Please verify your credentials.");
        } else if (code === 429) {
          throw new Error("Quota exceeded. Please check your Gemini billing details or try again later.");
        } else {
          throw new Error(msg || `API Error (HTTP ${code})`);
        }
      }
      return true;
    } catch (err) {
      if (err.name === "TypeError" || err.message.includes("Failed to fetch")) {
        throw new Error("Network error. Please check your internet connection.");
      }
      throw err;
    }
  }

  async callGemini(prompt) {
    if (!this.apiKey) {
      throw new Error("API Key is missing. Switch to Demo Mode or configure a key.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const code = response.status;
      const errorMessage = errorData.error?.message || `HTTP error! status: ${response.status}`;
      
      if (code === 400) {
        throw new Error("Invalid request or model config: " + errorMessage);
      } else if (code === 429) {
        throw new Error("Quota exceeded. API rate limit hit.");
      } else if (code === 403) {
        throw new Error("Authentication failed: Invalid API Key.");
      } else {
        throw new Error(errorMessage);
      }
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error("Empty response received from Gemini API.");
    }

    return responseText;
  }

  async generateCropDescription(crop) {
    const name = crop.cropName || crop.name || "Crop";
    const category = crop.category || "";
    const variety = crop.variety || "";
    const quantity = crop.quantity || 0;
    const unit = crop.unit || "kg";
    const price = crop.price || 0;
    const location = crop.location || "";
    const harvestDate = crop.harvestDate || "";

    if (!this.isLive()) {
      return this.simulateDescription({ name, category, variety, quantity, unit, price, location, harvestDate });
    }

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
      return await this.callGemini(prompt);
    } catch (error) {
      console.warn("Gemini Live failed, falling back to Demo Mode:", error);
      if (window.onGeminiFallback) {
        window.onGeminiFallback(error.message);
      }
      return this.simulateDescription({ name, category, variety, quantity, unit, price, location, harvestDate });
    }
  }

  async getSellingSuggestions(crop, isBuyer = false) {
    const name = crop.cropName || crop.name || "Crop";
    const category = crop.category || "";
    const variety = crop.variety || "";
    const quantity = crop.quantity || 0;
    const unit = crop.unit || "kg";
    const price = crop.price || 0;
    const location = crop.location || "";

    if (!this.isLive()) {
      return this.simulateSuggestions({ name, category, variety, quantity, unit, price, location }, isBuyer);
    }

    let prompt = "";
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
1. Market Demand: Is the demand high, moderate, or low currently?
2. Recommended Selling Window: Should the farmer sell immediately or hold? Why?
3. Recommended Price Target: Is Rs. ${price} per ${unit} fair, or should they adjust it?
4. Storage Tip: One practical advice to preserve quality while waiting to sell.
Make the layout highly readable, and keep the total response under 250 words.`;
    }

    try {
      return await this.callGemini(prompt);
    } catch (error) {
      console.warn("Gemini Live failed, falling back to Demo Mode:", error);
      if (window.onGeminiFallback) {
        window.onGeminiFallback(error.message);
      }
      return this.simulateSuggestions({ name, category, variety, quantity, unit, price, location }, isBuyer);
    }
  }

  async askFarmingQuestion(question, chatHistory = []) {
    if (!this.isLive()) {
      return this.simulateChatResponse(question);
    }

    const systemContext = "You are HarvestLink AI, an expert agricultural advisor. Your job is to help farmers and agricultural buyers with crop listings, market pricing insights, pest control, weather preparation, organic farming techniques, and logistics. Be encouraging, concise, practical, and clear. Format responses with markdown lists where appropriate.";
    
    let prompt = `${systemContext}\n\n`;
    chatHistory.forEach(msg => {
      prompt += `${msg.sender === "user" ? "User" : "HarvestLink AI"}: ${msg.text}\n`;
    });
    prompt += `User: ${question}\nHarvestLink AI:`;

    try {
      return await this.callGemini(prompt);
    } catch (error) {
      console.warn("Gemini Live failed, falling back to Demo Mode:", error);
      if (window.onGeminiFallback) {
        window.onGeminiFallback(error.message);
      }
      return this.simulateChatResponse(question);
    }
  }

  // --- DEMO MODE SIMULATIONS ---
  
  simulateDescription(crop) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const nameLower = crop.name.toLowerCase();
        let description = "";

        if (nameLower.includes("wheat")) {
          description = `Premium high-quality Sharbati Wheat, harvested directly from the golden plains of ${crop.location}. This batch exhibits rich golden-yellow grains with optimal moisture levels (under 12%), ensuring a long shelf life. Excellent grain weight and high gluten content, making it perfect for standard premium flour milling, rotis, and baking. Hand-sorted and stored under dry, hygienic conditions in moisture-proof gunny bags. Ready for prompt delivery.`;
        } else if (nameLower.includes("tomato")) {
          description = `Fresh, hand-picked Organic Roma Tomatoes grown in the fertile soils of ${crop.location}. These tomatoes are harvested at the peak of ripeness, offering a firm texture, deep red skin, and a rich, juicy flavor profile with balanced acidity. Excellent for fresh retail markets, culinary preparations, or organic paste production. Carefully graded, sorted, and packed in sturdy ventilated crates to ensure zero damage during transportation.`;
        } else if (nameLower.includes("rice")) {
          description = `A-Grade extra-long grain 1121 Basmati Rice. Aged meticulously for over 12 months to enhance its signature nutty aroma, texture, and cooking elongation. This batch has been processed in a modern sorting facility to ensure minimal broken grains (under 2%) and complete removal of foreign matter. Ideal for high-end dining, retail packing, or export. Safe storage guaranteed in dry warehouses.`;
        } else if (nameLower.includes("onion")) {
          description = `High-pungency, dry-cured Nasik Red Onions harvested from ${crop.location}. Features a deep purple-red color, thin dry outer skins, and extremely firm bulbs. These onions are fully sun-cured on field and graded for size (45mm+). Known for their superb storage longevity of up to 3-4 months under ventilated shade. Highly suitable for wholesale traders, exporters, and domestic markets.`;
        } else if (nameLower.includes("mango")) {
          description = `Premium Ratnagiri Alphonso Mangoes (Hapus). Organically nurtured and harvested at the perfect green-mature stage. These mangoes are naturally ripened using traditional grass bedding, resulting in a rich golden saffron pulp, thin skin, and an unmatched sweet aroma. Graded for a uniform weight of 250-300g per piece. Packed in eco-friendly wooden crates with hay cushioning.`;
        } else {
          description = `Excellent quality fresh ${crop.name} (${crop.variety || 'Standard variety'}) harvested from our farm in ${crop.location}. This crop has been cultivated using sustainable farming practices, ensuring nutritional integrity and pure taste. Carefully harvested, cleaned, and graded to remove small or damaged produce. Available for immediate pickup or delivery arrangements. Offered at a competitive market rate of Rs. ${crop.price}/${crop.unit}.`;
        }
        
        resolve(`[DEMO MODE] ${description}`);
      }, 800);
    });
  }

  simulateSuggestions(crop, isBuyer = false) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const nameLower = crop.name.toLowerCase();
        
        if (isBuyer) {
          let priceAssessment = `The seller's asking price of Rs. ${crop.price}/${crop.unit} is fair and matches local wholesale rates.`;
          let demandStatus = "Moderate supply available in this sector.";
          let logisticsTip = `Consider consolidating pickup with other buyers from ${crop.location} to lower transportation cost per unit.`;
          let recommendation = "Proceed to send enquiry. Attempt to negotiate a 3-5% discount if buying the entire batch.";
          let summary = "";

          if (nameLower.includes("wheat")) {
            priceAssessment = `Rs. ${crop.price}/${crop.unit} is slightly high. Recommended target buy rate is Rs. 26-27/${crop.unit}.`;
            demandStatus = "High demand, but local arrivals in surrounding mandis are expected to surge next week.";
            logisticsTip = "Use dry, clean container trucks. Avoid any exposure to moisture during transport.";
            recommendation = "Negotiate aggressively. Try to close the deal at Rs. 27 per kg.";
            summary = "Wheat markets are stable but upcoming harvest arrivals will cool the rates slightly. Negotiating will yield a better margins.";
          } else if (nameLower.includes("tomato")) {
            priceAssessment = `Rs. ${crop.price}/${crop.unit} is highly competitive. Local city retail rates are over Rs. 60/kg.`;
            demandStatus = "Extremely high demand due to rain-induced logistics delays from southern states.";
            logisticsTip = "Arrange direct immediate pickup in ventilated plastic crates. Do not store in warm warehouses.";
            recommendation = "Buy immediately. Lock in the quantity before other buyers bid.";
            summary = "Tomatoes are highly perishable and supply lines are disrupted. Securing this direct farm batch quickly is highly recommended.";
          } else {
            summary = `Local listings for ${crop.name} are consistent. Secure this batch if quality inspection parameters are satisfied.`;
          }

          const buyerRec = `### AI Purchase Valuation for ${crop.name}

* **Pricing Assessment**: ${priceAssessment}
* **Market Demand / Supply**: ${demandStatus}
* **Logistics Advice**: ${logisticsTip}
* **Action Recommendation**: **${recommendation}**

**AI Purchase Insight:**
${summary} *(Note: Activate Gemini Live Mode in settings for real-time market data API searches)*`;

          resolve(buyerRec);
        } else {
          let demand = "Moderate";
          let window = "Sell gradually over the next 2-3 weeks";
          let priceRec = `Your target price of Rs. ${crop.price}/${crop.unit} matches current local market indices.`;
          let storageTip = "Keep in a cool, well-ventilated warehouse off the ground.";
          let analysis = "";

          if (nameLower.includes("wheat")) {
            demand = "High Demand";
            window = "Hold for 2 weeks, then sell";
            priceRec = `Consider raising your target by 3-5% (to Rs. 29-30/${crop.unit}). Current government procurement rates are rising, and wholesale market arrivals are slowing down.`;
            storageTip = "Ensure storage bags are stacked on wooden pallets to prevent ground moisture absorption, and maintain a humidity level below 12%.";
            analysis = "Due to a minor shortfall in late-season harvests in neighboring districts, millers are actively seeking quality Sharbati grain. Holding for a brief period will yield a better premium.";
          } else if (nameLower.includes("tomato")) {
            demand = "Very High (Seasonal)";
            window = "Sell immediately within 3 days";
            priceRec = `Maintain your current rate of Rs. ${crop.price}/${crop.unit}. Supply is highly volatile, and delayed sales increase risk of spoilage.`;
            storageTip = "Store in a shaded, well-ventilated area between 12-15°C. Avoid stacking crates more than 5 levels high to prevent crushing.";
            analysis = "Monsoon disruptions have affected transport links, leading to supply spikes in nearby cities. Your location has a competitive logistics edge. Liquidate this perishable stock quickly.";
          } else if (nameLower.includes("rice")) {
            demand = "Stable / High (Export Support)";
            window = "Hold for mid-season contract rates";
            priceRec = `Your pricing of Rs. 85 is reasonable for aged grains. You could negotiate up to Rs. 88 for buyers asking for packaging customization.`;
            storageTip = "Conduct monthly fumigation and check bag seams for rodent signs. Maintain dry conditions.";
            analysis = "Aged Basmati is seeing strong enquiry volumes from urban distribution centers. Wholesale traders are stocking up ahead of festival season demands.";
          } else {
            analysis = `Local market reports for ${crop.name} indicate stable supply lines. Regional mandi arrivals are consistent, keeping price volatility low.`;
          }

          const recommendation = `### Market Analysis for ${crop.name}

* **Demand Status**: **${demand}**
* **Recommended Window**: ${window}
* **Pricing Assessment**: ${priceRec}
* **Storage Advisory**: ${storageTip}

**AI Market Insight Summary:**
${analysis} *(Note: Activate Gemini Live Mode in settings for real-time market data API searches)*`;

          resolve(recommendation);
        }
      }, 1000);
    });
  }

  simulateChatResponse(question) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const q = question.toLowerCase();
        let reply = "";

        if (q.includes("price") || q.includes("market") || q.includes("sell")) {
          reply = `Based on regional agricultural mandi summaries:
* **Grains (Wheat & Paddy)**: Market prices are steady. Procurement centres are offering stable support prices. It is advised to sell if your storage space is limited.
* **Vegetables (Onions & Tomatoes)**: Prices are witnessing moderate fluctuations. Monsoon showers have impacted logistics, causing sudden daily price jumps of 10-15%.
* **Organic Produce**: Buyers are willing to pay a 15-20% premium if you have certified organic test sheets.
          
*Tip: You can use our **Marketplace** to list your crops and check what other farmers in your location are charging.*`;
        } else if (q.includes("pest") || q.includes("disease") || q.includes("insects") || q.includes("leaf")) {
          reply = `Managing pests requires a systematic approach. Here are organic and chemical options:
1. **Neem Oil Spray (Organic)**: Mix 15-20 ml of concentrated neem oil with 1 litre of water and a few drops of liquid soap. Spray every 7-10 days for soft-bodied insects (aphids, whiteflies).
2. **Crop Rotation**: Avoid planting crops from the same family (e.g., tomatoes and potatoes) in the same soil back-to-back to break pest life cycles.
3. **Pheromone Traps**: Install yellow sticky cards or pheromone traps to monitor pest incidence and reduce adult populations naturally.
          
If you can describe the specific leaf discoloration or damage pattern, I can provide a more targeted recommendation!`;
        } else if (q.includes("weather") || q.includes("rain") || q.includes("monsoon")) {
          reply = `With rain forecasts active, here are immediate preventative steps for your fields:
* **Drainage Checks**: Ensure drainage channels are clear of debris. Waterlogging for more than 24 hours severely damages root systems of vegetables like tomato and chilli.
* **Harvesting Timing**: Harvest mature crops immediately rather than letting them stay on the field in wet weather to avoid fungal growth.
* **Fungicide Spraying**: Avoid spraying fertilizers or liquid pesticides right before a predicted rainfall. If necessary, use sticker agents (adjuvants) to prevent wash-off.`;
        } else if (q.includes("fertilizer") || q.includes("soil") || q.includes("manure") || q.includes("urea")) {
          reply = `To improve soil health and crop yields:
* **Soil Testing**: Always get a soil health card from your local block office before applying heavy doses. This avoids over-spending on Nitrogen (Urea) when phosphorus or potash is needed.
* **Organic Matter**: Incorporate 5-10 tons of well-decomposed Farmyard Manure (FYM) or Vermicompost per acre during field preparation.
* **Biofertilizers**: Use nitrogen-fixing bacteria (Azotobacter/Rhizobium) and Phosphate Solubilizing Bacteria (PSB) seed treatments to naturally boost nutrient absorption.`;
        } else {
          reply = `Hello! I am the HarvestLink AI Advisor. I can help you with:
* Pest and disease diagnosis and control tips.
* Soil health improvement and fertilizer planning.
* Weather damage mitigation strategies.
* Post-harvest storage tips and local crop pricing advice.

Please feel free to ask details about a crop you are growing or planning to list!
*(To activate real-time Gemini language generation, paste your Gemini API Key in the Profile & Settings page).*`;
        }

        resolve(`[DEMO MODE] ${reply}`);
      }, 1000);
    });
  }
}

// Attach globally
window.GeminiService = new GeminiService();
