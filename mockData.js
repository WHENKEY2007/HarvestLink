const INITIAL_PROFILE = {
  name: "Ramesh Patel",
  location: "Nashik, Maharashtra",
  phone: "+91 98765 43210",
  email: "ramesh.patel@greenvalley.com",
  farmName: "Green Valley Farm",
  farmSize: "12 Acres",
  mainCrops: "Wheat, Tomatoes, Onion",
  role: "Farmer" // 'Farmer' or 'Buyer'
};

const INITIAL_LISTINGS = [
  {
    id: "list-1",
    farmerName: "Ramesh Patel",
    cropName: "Premium Sharbati Wheat",
    category: "Grains",
    variety: "Sharbati",
    quantity: 5000,
    unit: "kg",
    price: 28,
    location: "Nashik, MH",
    harvestDate: "2026-06-15",
    status: "Available",
    description: "High-quality Sharbati wheat, harvested under optimal dry weather conditions. Excellent grain size and luster. Stored in moisture-proof bags.",
    createdAt: "2026-06-20"
  },
  {
    id: "list-2",
    farmerName: "Ramesh Patel",
    cropName: "Organic Roma Tomatoes",
    category: "Vegetables",
    variety: "Roma",
    quantity: 1200,
    unit: "kg",
    price: 40,
    location: "Nashik, MH",
    harvestDate: "2026-07-02",
    status: "Reserved",
    description: "Freshly harvested organic Roma tomatoes. Firm, deep red, and perfectly ripe. Handpicked and packed in crates, suitable for local distribution or processing.",
    createdAt: "2026-07-03"
  },
  {
    id: "list-3",
    farmerName: "Ramesh Patel",
    cropName: "Basmati Rice (1121)",
    category: "Grains",
    variety: "1121 Extra Long",
    quantity: 8000,
    unit: "kg",
    price: 85,
    location: "Gondia, MH",
    harvestDate: "2026-05-10",
    status: "Sold",
    description: "Extra-long grain Basmati Rice, aged for 12 months to bring out the maximum aroma and fluffiness when cooked. Triple sorted for impurities.",
    createdAt: "2026-05-15"
  },
  {
    id: "list-4",
    farmerName: "Suresh Kumar",
    cropName: "Red Onions",
    category: "Vegetables",
    variety: "Nasik Red",
    quantity: 4500,
    unit: "kg",
    price: 22,
    location: "Lasalgaon, MH",
    harvestDate: "2026-07-01",
    status: "Available",
    description: "Medium to large sized Nasik red onions, known for their pungency and long storage life. Completely dried and cleaned.",
    createdAt: "2026-07-02"
  },
  {
    id: "list-5",
    farmerName: "Ananya Rao",
    cropName: "Alfonso Mangoes",
    category: "Fruits",
    variety: "Ratnagiri Hapus",
    quantity: 150,
    unit: "crates",
    price: 1200,
    location: "Ratnagiri, MH",
    harvestDate: "2026-05-28",
    status: "Available",
    description: "A-grade export-quality Alphonso Mangoes (Hapus). Organically grown, naturally ripened, packed with dry grass in wooden crates. 12 pieces per crate.",
    createdAt: "2026-06-01"
  }
];

const INITIAL_ENQUIRIES = [
  {
    id: "enq-1",
    listingId: "list-1",
    cropName: "Premium Sharbati Wheat",
    buyerName: "Karan Johar",
    buyerCompany: "Heritage Flour Mills",
    buyerPhone: "+91 99988 87766",
    buyerEmail: "procurement@heritagemills.com",
    quantityRequested: 4000,
    priceOffered: 27,
    message: "We are interested in purchasing 4 tons of your Sharbati wheat. Can you arrange transport to our processing plant in Pune? Willing to finalize immediately.",
    expectedDeliveryDate: "2026-07-05",
    preferredPayment: "Bank Transfer",
    status: "Pending",
    createdAt: "2026-06-25T10:30:00Z"
  },
  {
    id: "enq-2",
    listingId: "list-2",
    cropName: "Organic Roma Tomatoes",
    buyerName: "Sourcing Manager",
    buyerCompany: "FreshBasket Supermarkets",
    buyerPhone: "+91 98877 66554",
    buyerEmail: "sourcing@freshbasket.in",
    quantityRequested: 1200,
    priceOffered: 40,
    message: "We want to lock in the full batch of Roma tomatoes for our Mumbai stores. We will handle pickup directly from your farm.",
    expectedDeliveryDate: "2026-07-10",
    preferredPayment: "UPI",
    status: "Accepted",
    createdAt: "2026-07-04T14:20:00Z"
  },
  {
    id: "enq-3",
    listingId: "list-1",
    cropName: "Premium Sharbati Wheat",
    buyerName: "Representative",
    buyerCompany: "Local Grain Traders Association",
    buyerPhone: "+91 91122 33445",
    buyerEmail: "trader.nashik@grainboard.org",
    quantityRequested: 5000,
    priceOffered: 25,
    message: "Offering 25 Rs/kg for the full lot. Quick cash payment on pickup.",
    expectedDeliveryDate: "2026-06-30",
    preferredPayment: "Cash on Delivery",
    status: "Rejected",
    createdAt: "2026-06-22T09:00:00Z"
  },
  {
    id: "enq-mock-buyer",
    listingId: "list-4",
    cropName: "Red Onions",
    buyerName: "Ramesh Patel",
    buyerCompany: "Green Valley Farm",
    buyerPhone: "+91 98765 43210",
    buyerEmail: "ramesh.patel@greenvalley.com",
    quantityRequested: 1000,
    priceOffered: 21,
    message: "Interested in purchasing 1 ton of Red Onions. Can we coordinate delivery to Nashik?",
    expectedDeliveryDate: "2026-07-28",
    preferredPayment: "Bank Transfer",
    status: "Pending",
    createdAt: "2026-07-18T11:00:00Z"
  }
];

const MARKET_TRENDS_SEED = {
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  crops: {
    "Wheat": [24, 25, 26, 25, 27, 28],
    "Basmati Rice (1121)": [78, 80, 81, 83, 84, 85],
    "Organic Roma Tomatoes": [20, 35, 55, 30, 25, 40],
    "Red Onions": [18, 16, 20, 24, 25, 22],
    "Alfonso Mangoes": [1500, 1400, 1350, 1200, 1150, 1200]
  }
};

window.HarvestLinkMockData = {
  INITIAL_PROFILE,
  INITIAL_LISTINGS,
  INITIAL_ENQUIRIES,
  MARKET_TRENDS_SEED
};
