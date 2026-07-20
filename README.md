# 🌾 HarvestLink AI

> **Smart Agricultural Platform Bridging the Gap Between Farmers & Buyers**

🚜 **HarvestLink AI** is a premium digital connection hub that empowers farmers to manage crop listings, track incoming enquiries, analyze market trends, and leverage real-time AI-powered advisory features.

---

### 🛡️ Technologies & Specifications

![HTML5](https://img.shields.io/badge/Structure-HTML5-orange?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/Styling-Vanilla%20CSS-blue?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/Logic-Vanilla%20JS-yellow?style=for-the-badge&logo=javascript&logoColor=black)
![Gemini AI](https://img.shields.io/badge/AI%20Engine-Gemini%202.5%20Flash-green?style=for-the-badge&logo=google-gemini&logoColor=white)
![Responsive](https://img.shields.io/badge/Design-Mobile%20Friendly-purple?style=for-the-badge)
![Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge)

---

## ✨ Key Features

### 👨‍🌾 1. Profile & Multi-Role Switching
Toggle seamlessly between **Farmer** and **Buyer** modes in a click. The interface adapts instantly, displaying custom dashboards, action options, and metrics relevant to each side of the agricultural supply chain.

### 📊 2. Interactive Analytics Dashboard
* **Mandi price history graphics** powered by Chart.js. Includes interactive dropdown selection to check pricing indexes for different crops over a six-month window.
* **Aggregated KPIs** highlighting listing counts, buyer enquiry levels, active inventory quantities, and total sales estimates.

### 📝 3. Crop Inventory CRUD
Farmers can easily add, edit, change status, and delete crop listings. Listings contain details including variety, unit pricing, harvest dates, and pickup locations.

### 💬 4. Dynamic Buyer Enquiries
* Buyers can apply real-time filtering (categories, location, pricing, availability status) to find and purchase crops.
* Submit quotes specifying proposed purchase volume, target unit rate, and messages directly to the farmer's private dashboard to accept or reject.

### 🧠 5. Gemini AI Advisor Hub
> [!TIP]
> HarvestLink AI contains direct API integrations (using browser client-side requests) to Google's Generative AI.
* **AI Description Generator**: Autogenerates structured, professional listing copy directly within the crop registration modal.
* **Smart Selling recommendations**: Click a button to get target pricing recommendations, regional demand assessments, and quality preservation tips based on your inventory parameters.
* **Agricultural Q&A Chatbot**: A scrollable chat interface to ask farming advice on pests, crop damage, rain drainage preparation, or soil fertilizers.

---

## 🛠️ Installation & Setup

HarvestLink AI runs entirely client-side, making deployment extremely easy. **No complex backend compilation, node modules, or npm builds are required!**

### Run Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/WHENKEY2007/HarvestLink.git
   ```
2. Navigate into the folder:
   ```bash
   cd HarvestLink/HarvestLink
   ```
3. Open `index.html` directly in any web browser (Chrome, Edge, Safari, Firefox).

---

## 🔑 AI Live Mode Configuration

The application is built with a dual operational engine:

> [!IMPORTANT]
> **Demo Mode (Default)**: Runs realistic, simulated AI copy generators, market reports, and chatbot replies locally. No configuration needed!
>
> **Live Mode**: Uses live requests to Google's **Gemini 2.5 Flash** models. To activate, navigate to **Profile & Settings** (or click the orange **Demo Mode** pill in the top header) and paste your **Google Gemini API Key**. The key is stored securely in your local browser storage.

---

## 📂 File Architecture

```bash
HarvestLink/
│
├── index.html     # App Shell, layout sections, modals, and templates
├── styles.css     # Premium custom CSS, variable color themes, dark mode rules, responsive layouts
├── app.js         # State controller, localStorage handlers, routing, and Chart.js animations
├── gemini.js      # Gemini API integrations, request wrappers, and mock simulation algorithms
└── mockData.js    # Pre-seeded database to ensure the dashboard displays data on initial run
```

---

## 🎨 Design Theme & Aesthetics

HarvestLink AI was built using modern web design principles:
* **Color Palette**: A curated agricultural system of Forest Green (`#1b4332`), Soft Sage (`#2d6a4f`), Leaf Green (`#52b788`), and Golden Amber (`#ff9f1c`).
* **Glassmorphism**: Elegant card borders and background blur backdrops for modern overlay modals.
* **Responsive Layouts**: Collapsible sidebar menu for tablets and mobile devices.
* **Premium Dark Mode**: Seamless dark theme transition with specialized color filters on data charts, inputs, and badges.
