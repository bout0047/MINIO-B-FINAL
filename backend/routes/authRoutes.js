const express = require('express');
const router = express.Router();
const Minio = require('minio');

// Login route for validating MinIO credentials
router.post('/login', async (req, res) => {
    const { accessKey, secretKey } = req.body;

    // Validate the presence of credentials
    if (!accessKey || !secretKey) {
        console.error('Missing Access Key or Secret Key in request body');
        return res.status(400).json({
            success: false,
            message: 'Access Key and Secret Key are required',
        });
    }

    try {
        // Create a temporary MinIO client with the provided credentials
        const client = new Minio.Client({
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT, 10) || 9000,
            useSSL: process.env.MINIO_USE_SSL === 'false', // Optional, supports SSL if configured
            accessKey,
            secretKey,
        });

        // Attempt to list buckets to verify credentials
        await client.listBuckets();

        // Log successful authentication
        console.log('MinIO authentication successful for provided credentials');

        // Send a success response if credentials are valid
        res.status(200).json({
            success: true,
            message: 'Login successful',
            accessKey,
            secretKey,
        });
    } catch (error) {
        console.error('MinIO authentication failed:', error.message);

        // Handle invalid credentials or other MinIO errors
        if (error.code === 'AccessDenied') {
            return res.status(401).json({
                success: false,
                message: 'Invalid Access Key or Secret Key',
            });
        }

        // Catch-all for unexpected errors
        return res.status(500).json({
            success: false,
            message: 'An error occurred during authentication',
            error: error.message,
        });
    }
});

module.exports = router;
