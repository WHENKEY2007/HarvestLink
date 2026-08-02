const mongoose = require('mongoose');
const dns = require('node:dns');

dns.setServers([
  '8.8.8.8',
  '8.8.4.4'
]);

let mongoServer = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/harvestlink';

  try {
    // Attempt standard connection with 3 sec timeout
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`[MongoDB] Connected to database: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[MongoDB Warning] Could not connect to standard URI (${error.message}).`);
    console.log(`[MongoDB] Spawning embedded MongoMemoryServer for zero-config local operation...`);

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();

      const conn = await mongoose.connect(mongoUri);
      console.log(`[MongoDB Embedded] Connected to in-memory MongoDB: ${mongoUri}`);

      // Seed initial data if in-memory instance is fresh
      await seedInMemoryDB();
    } catch (memErr) {
      console.error('[MongoDB Critical Error]', memErr.message);
    }
  }
};

const seedInMemoryDB = async () => {
  try {
    const CropListing = require('../models/CropListing');
    const Enquiry = require('../models/Enquiry');
    const User = require('../models/User');
    const Profile = require('../models/Profile');

    const count = await CropListing.countDocuments();
    if (count === 0) {
      console.log('[MongoDB Embedded] Seeding initial crops and enquiries...');

      await User.create({
        firebaseUid: 'demo-user-123',
        name: 'Ramesh Patel',
        email: 'ramesh.patel@greenvalley.com',
        photoURL: '',
        activeRole: 'Farmer'
      });

      await Profile.create({
        firebaseUid: 'demo-user-123',
        farmer: {
          name: 'Ramesh Patel',
          location: 'Nashik, Maharashtra',
          phone: '+91 98765 43210',
          email: 'ramesh.patel@greenvalley.com',
          farmName: 'Green Valley Farm',
          farmSize: '12 Acres',
          mainCrops: 'Wheat, Tomatoes, Onion'
        },
        buyer: {
          name: 'Sourcing Officer',
          location: 'Mumbai, Maharashtra',
          phone: '+91 98877 66554',
          email: 'sourcing@bigbasket.in',
          companyName: 'BigBasket Procurement',
          businessType: 'Retail & Wholesale',
          preferredCrops: 'Fruits, Vegetables, Grains'
        }
      });

      const listings = await CropListing.insertMany([
        {
          farmerId: 'demo-user-123',
          farmerName: 'Ramesh Patel',
          farmerEmail: 'ramesh.patel@greenvalley.com',
          cropName: 'Premium Sharbati Wheat',
          category: 'Grains',
          variety: 'Sharbati',
          quantity: 5000,
          unit: 'kg',
          price: 28,
          location: 'Nashik, MH',
          harvestDate: '2026-06-15',
          status: 'Available',
          description: 'High-quality Sharbati wheat, harvested under optimal dry weather conditions. Excellent grain size and luster. Stored in moisture-proof bags.'
        },
        {
          farmerId: 'demo-user-123',
          farmerName: 'Ramesh Patel',
          farmerEmail: 'ramesh.patel@greenvalley.com',
          cropName: 'Organic Roma Tomatoes',
          category: 'Vegetables',
          variety: 'Roma',
          quantity: 1200,
          unit: 'kg',
          price: 40,
          location: 'Nashik, MH',
          harvestDate: '2026-07-02',
          status: 'Reserved',
          description: 'Freshly harvested organic Roma tomatoes. Firm, deep red, and perfectly ripe. Handpicked and packed in crates, suitable for local distribution or processing.'
        },
        {
          farmerId: 'demo-user-123',
          farmerName: 'Ramesh Patel',
          farmerEmail: 'ramesh.patel@greenvalley.com',
          cropName: 'Basmati Rice (1121)',
          category: 'Grains',
          variety: '1121 Extra Long',
          quantity: 8000,
          unit: 'kg',
          price: 85,
          location: 'Gondia, MH',
          harvestDate: '2026-05-10',
          status: 'Sold',
          description: 'Extra-long grain Basmati Rice, aged for 12 months to bring out maximum aroma and fluffiness when cooked. Triple sorted for impurities.'
        },
        {
          farmerId: 'other-farmer-456',
          farmerName: 'Suresh Kumar',
          farmerEmail: 'suresh.kumar@farmreach.in',
          cropName: 'Red Onions',
          category: 'Vegetables',
          variety: 'Nasik Red',
          quantity: 4500,
          unit: 'kg',
          price: 22,
          location: 'Lasalgaon, MH',
          harvestDate: '2026-07-01',
          status: 'Available',
          description: 'Medium to large sized Nasik red onions, known for high pungency and long storage life. Completely dried and sun-cured.'
        },
        {
          farmerId: 'other-farmer-789',
          farmerName: 'Ananya Rao',
          farmerEmail: 'ananya.rao@mangoorchards.in',
          cropName: 'Alfonso Mangoes',
          category: 'Fruits',
          variety: 'Ratnagiri Hapus',
          quantity: 150,
          unit: 'crates',
          price: 1200,
          location: 'Ratnagiri, MH',
          harvestDate: '2026-05-28',
          status: 'Available',
          description: 'A-grade export-quality Alphonso Mangoes (Hapus). Organically grown, naturally ripened, packed with dry grass in wooden crates. 12 pieces per crate.'
        }
      ]);

      await Enquiry.insertMany([
        {
          listingId: listings[0]._id,
          farmerId: 'demo-user-123',
          farmerName: 'Ramesh Patel',
          farmerEmail: 'ramesh.patel@greenvalley.com',
          buyerId: 'buyer-karan',
          buyerName: 'Karan Johar',
          buyerEmail: 'procurement@heritagemills.com',
          buyerCompany: 'Heritage Flour Mills',
          buyerPhone: '+91 99988 87766',
          cropName: 'Premium Sharbati Wheat',
          quantity: 4000,
          offeredPrice: 27,
          message: 'We are interested in purchasing 4 tons of your Sharbati wheat. Can you arrange transport to our processing plant in Pune?',
          paymentMethod: 'Bank Transfer',
          status: 'Pending'
        },
        {
          listingId: listings[1]._id,
          farmerId: 'demo-user-123',
          farmerName: 'Ramesh Patel',
          farmerEmail: 'ramesh.patel@greenvalley.com',
          buyerId: 'buyer-freshbasket',
          buyerName: 'Sourcing Manager',
          buyerEmail: 'sourcing@freshbasket.in',
          buyerCompany: 'FreshBasket Supermarkets',
          buyerPhone: '+91 98877 66554',
          cropName: 'Organic Roma Tomatoes',
          quantity: 1200,
          offeredPrice: 40,
          message: 'We want to lock in the full batch of Roma tomatoes for our Mumbai stores. We will handle pickup directly from your farm.',
          paymentMethod: 'UPI',
          status: 'Accepted'
        },
        {
          listingId: listings[3]._id,
          farmerId: 'other-farmer-456',
          farmerName: 'Suresh Kumar',
          farmerEmail: 'suresh.kumar@farmreach.in',
          buyerId: 'demo-user-123',
          buyerName: 'Sourcing Officer',
          buyerEmail: 'sourcing@bigbasket.in',
          buyerCompany: 'BigBasket Procurement',
          buyerPhone: '+91 98765 43210',
          cropName: 'Red Onions',
          quantity: 1000,
          offeredPrice: 21,
          message: 'Interested in purchasing 1 ton of Red Onions. Can we coordinate delivery to Nashik?',
          paymentMethod: 'Bank Transfer',
          status: 'Pending'
        }
      ]);

      console.log('[MongoDB Embedded] Seeding completed successfully!');
    }
  } catch (err) {
    console.error('[MongoDB Embedded Seed Error]', err.message);
  }
};

module.exports = connectDB;
