require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Database
connectDB();

const server = app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`HarvestLink AI Backend REST API Server`);
  console.log(`Server running on port: ${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
  console.log(`===================================================`);
});

process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err.message);
});
