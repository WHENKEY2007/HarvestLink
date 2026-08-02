const express = require('express');
const cors = require('cors');

const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
const listingRoutes = require('./routes/listingRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const marketRoutes = require('./routes/marketRoutes');
const aiRoutes = require('./routes/aiRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'HarvestLink AI REST API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/ai', aiRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
