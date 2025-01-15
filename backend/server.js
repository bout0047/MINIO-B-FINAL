const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(
    cors({
        origin: ['http://localhost:3000', 'http://localhost:3005'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Access-Key', 'X-Secret-Key'],
        credentials: true,
    })
);

// Middleware
app.use(express.json()); // Parse JSON requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded requests

// Import routes
const bucketRoutes = require('./routes/bucketRoutes');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');

// API Routes
app.use('/buckets', bucketRoutes);
app.use('/files', fileRoutes);
app.use('/auth', authRoutes);

// Error handling for unknown routes
app.use((req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message || err);
    res.status(err.status || 500).json({
        message: 'Internal server error',
        error: err.message || 'An unknown error occurred',
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
