# 🌾 HarvestLink AI

**HarvestLink AI** is an AI-powered agricultural marketplace that connects farmers directly with buyers, enabling crop listings, enquiries, price negotiation, market insights, and intelligent farming assistance through a unified platform.

## 🌐 Live Demo

**Frontend:**  
https://harvestlink-ai.vercel.app

**Backend API:**  
https://harvestlink-api.onrender.com

**API Health Check:**  
https://harvestlink-api.onrender.com/api/health

---

## 📸 Screenshots

### Dashboard

![HarvestLink Dashboard](screenshots/dashboard.png)

### Crop Marketplace

![Crop Marketplace](screenshots/marketplace.png)

### AI Farming Assistant

![HarvestLink AI Assistant](screenshots/ai-assistant.png)

### Crop Listing / Management

![Crop Management](screenshots/crop-management.png)

> Add your screenshots inside a `screenshots/` folder in the repository root using the filenames shown above.

---

## ✨ Features

- 🔐 **Firebase Authentication**
  - Google Sign-In
  - Secure Firebase ID-token-based authentication
  - Protected user functionality

- 👨‍🌾 **Farmer Dashboard**
  - View personalized dashboard statistics
  - Manage crop listings
  - Track buyer enquiries
  - Respond to offers and negotiations

- 🛒 **Buyer Dashboard**
  - Browse available crop listings
  - Search and filter crops
  - Send purchase enquiries
  - Track submitted enquiries

- 🌾 **Crop Marketplace**
  - Create crop listings
  - View crop information
  - Update existing listings
  - Delete listings
  - Store listing information persistently in MongoDB Atlas

- 🤝 **Enquiry & Negotiation System**
  - Buyers can contact farmers regarding listings
  - Farmers can accept, reject, or counter offers
  - Buyers can track enquiry status

- 🤖 **HarvestLink AI**
  - AI-powered farming chatbot
  - Agricultural guidance
  - Crop management suggestions
  - Pest and disease guidance
  - Post-harvest and storage advice

- 📈 **AI Market Advisor**
  - Crop selling recommendations
  - Pricing assessment
  - Market-oriented insights
  - Buyer purchase recommendations

- ✍️ **AI Crop Description Generator**
  - Generates professional crop listing descriptions
  - Uses crop, variety, quantity, price, location, and harvest information

- 📱 **Responsive UI**
  - Mobile-friendly interface
  - Tablet support
  - Laptop and desktop layouts
  - Responsive cards, forms, dashboards, and modals

- ⚡ **REST API Architecture**
  - Dedicated Express backend
  - Reusable frontend API service
  - Centralized API communication
  - Loading and error handling

---

## 🛠️ Tech Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- Firebase Authentication
- Responsive CSS

### Backend

- Node.js
- Express.js
- REST API
- Firebase Admin SDK

### Database

- MongoDB
- MongoDB Atlas
- Mongoose

### Artificial Intelligence

- Google Gemini API
- `@google/generative-ai`

### Authentication

- Firebase Authentication
- Google Sign-In
- Firebase ID Tokens
- Firebase Admin SDK

### Deployment

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** MongoDB Atlas
- **Authentication:** Firebase
- **Source Control:** GitHub

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/WHENKEY2007/HarvestLink.git
cd HarvestLink
```

### 2. Install Backend Dependencies

Navigate to the backend:

```bash
cd server
```

Install dependencies:

```bash
npm install
```

### 3. Configure Environment Variables

Create:

```text
server/.env
```

Add the following variables:

```env
MONGODB_URI=your_mongodb_atlas_connection_string

GEMINI_API_KEY=your_gemini_api_key

FIREBASE_PROJECT_ID=your_firebase_project_id

FIREBASE_CLIENT_EMAIL=your_firebase_service_account_email

FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"

FRONTEND_URL=http://localhost:3000
```

> Never commit `.env` or private credentials to GitHub.

### 4. Start the Backend

Development mode:

```bash
npm run dev
```

Or production mode:

```bash
npm start
```

The local backend runs at:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

### 5. Start the Frontend

Open another terminal from the repository root.

Use a local development server on port `3000`.

For example, using VS Code Live Server or another static HTTP server, serve the frontend at:

```text
http://localhost:3000
```

> Do not open `index.html` directly using `file://`. The application should be served through a local HTTP server.

### 6. Configure Firebase Authentication

Create/configure a Firebase project and enable:

```text
Authentication → Sign-in method → Google
```

For local development, ensure:

```text
localhost
```

is present under Firebase Authentication authorized domains.

For production, add your deployed frontend domain.

### 7. Verify the Application

Check the backend:

```text
GET http://localhost:5000/api/health
```

Then open:

```text
http://localhost:3000
```

Test:

- Google Sign-In
- Dashboard
- Crop listings
- Create/update/delete operations
- Enquiries
- AI chatbot
- AI crop description
- AI market recommendations

---

## 📡 API Documentation

Production API base URL:

```text
https://harvestlink-api.onrender.com/api
```

Local API base URL:

```text
http://localhost:5000/api
```

### Health Check

```http
GET /api/health
```

Example response:

```json
{
  "status": "OK",
  "message": "HarvestLink AI REST API is running"
}
```

### User

```http
GET /api/users/me
```

Returns information associated with the authenticated user.

Authentication:

```http
Authorization: Bearer <firebase-id-token>
```

### Profile

```http
GET /api/profile
```

Get the authenticated user's profile.

```http
PUT /api/profile
```

Update profile information.

Example request:

```json
{
  "name": "Farmer Name",
  "location": "Nashik, Maharashtra"
}
```

### Listings

Get crop listings:

```http
GET /api/listings
```

Get one listing:

```http
GET /api/listings/:id
```

Create listing:

```http
POST /api/listings
```

Example request:

```json
{
  "cropName": "Tomato",
  "variety": "Hybrid",
  "quantity": 500,
  "unit": "kg",
  "price": 30,
  "location": "Nashik"
}
```

Update listing:

```http
PUT /api/listings/:id
```

Delete listing:

```http
DELETE /api/listings/:id
```

### Enquiries

Get enquiries:

```http
GET /api/enquiries
```

Create an enquiry:

```http
POST /api/enquiries
```

Example:

```json
{
  "listingId": "LISTING_ID",
  "quantity": 100,
  "priceOffered": 28,
  "message": "Interested in purchasing this crop."
}
```

Update enquiry status:

```http
PATCH /api/enquiries/:id/status
```

Counter an offer:

```http
PATCH /api/enquiries/:id/counter
```

### Dashboard

```http
GET /api/dashboard
```

Returns dashboard information scoped to the authenticated user.

### Market Data

```http
GET /api/market
```

Returns agricultural market-related information used by the frontend.

### AI Farming Chat

```http
POST /api/ai/chat
```

Example request:

```json
{
  "question": "What are the best storage conditions for onions?",
  "history": []
}
```

Example response:

```json
{
  "success": true,
  "answer": "AI-generated agricultural guidance..."
}
```

### AI Crop Description

```http
POST /api/ai/description
```

Generates an AI-assisted crop listing description.

### AI Market Recommendation

```http
POST /api/ai/recommendation
```

Example request:

```json
{
  "crop": {
    "cropName": "Tomato",
    "quantity": 500,
    "unit": "kg",
    "price": 30,
    "location": "Nashik"
  },
  "isBuyer": false
}
```

Returns an AI-generated market recommendation.

> Protected API endpoints require a valid Firebase ID token in the `Authorization` header.

---

## 🏗️ Architecture / Folder Structure

HarvestLink follows a separated frontend/backend architecture:

```text
HarvestLink/
│
├── index.html
├── app.js
├── auth.js
├── gemini.js
│
├── js/
│   └── api.js
│
├── css/
│   └── ...
│
├── screenshots/
│   ├── dashboard.png
│   ├── marketplace.png
│   ├── ai-assistant.png
│   └── crop-management.png
│
├── server/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   │
│   ├── app.js
│   ├── server.js
│   ├── seed.js
│   ├── package.json
│   └── .env.example
│
├── .gitignore
└── README.md
```

### Application Flow

```text
Browser
   │
   ▼
Vercel Frontend
   │
   │ HTTPS REST API
   ▼
Render / Express Backend
   │
   ├────────► Firebase Admin
   │          Authentication
   │
   ├────────► MongoDB Atlas
   │          Application Data
   │
   └────────► Google Gemini
              AI Services
```

The frontend communicates with the backend through the reusable `ApiService`. Sensitive credentials such as MongoDB credentials, Firebase Admin credentials, and Gemini API keys remain exclusively on the backend.

---

## ⚠️ Known Limitations

- **Render Free Tier Cold Starts:** The backend may spin down after a period of inactivity. The first API request after inactivity can therefore take additional time while the service wakes up.

- **AI Availability:** HarvestLink AI depends on the availability, quota, and rate limits of the configured Gemini API.

- **Market Recommendations:** AI-generated market recommendations should be treated as advisory information rather than guaranteed real-time commodity pricing.

- **Network Dependency:** Authentication, AI features, marketplace operations, and database functionality require an active internet connection.

- **Deployment Wake-Up Time:** When the Render backend is sleeping, the frontend may temporarily appear slower during the first request.

- **Development Stage:** HarvestLink is currently an academic/full-stack project and may require additional security, monitoring, testing, analytics, and scalability improvements before large-scale commercial use.

---

## 🌾 HarvestLink AI

**Connecting Farmers. Empowering Buyers. Enabling Smarter Agriculture.**
