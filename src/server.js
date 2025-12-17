require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Middleware
app.use(helmet());

// Enable CORS for Android app
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS || '*',
    credentials: true,
}));

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Blockchain Health Wallet API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/ipfs', require('./routes/ipfs'));

// Error handling

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('');
  console.log('=================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log('=================================');
  console.log('');
});

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('\n Shutting down...');
  process.exit(0);
});