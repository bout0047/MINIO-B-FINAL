const express = require('express');
const router = express.Router();
const { createMinioClient } = require('../minioClient');

// Middleware to validate MinIO credentials
const validateMinioCredentials = (req, res, next) => {
    const accessKey = req.headers['x-access-key'];
    const secretKey = req.headers['x-secret-key'];

    if (!accessKey || !secretKey) {
        return res.status(400).json({ message: 'Access Key and Secret Key are required' });
    }

    try {
        req.minioClient = createMinioClient(accessKey, secretKey);
        next();
    } catch (error) {
        console.error('Error creating MinIO client:', error.message);
        res.status(500).json({ message: 'Failed to initialize MinIO client', error: error.message });
    }
};


// List all buckets
router.get('/', validateMinioCredentials, async (req, res) => {
    try {
        const buckets = await req.minioClient.listBuckets();
        const bucketDetails = buckets.map((bucket) => ({
            name: bucket.name,
            created: bucket.creationDate,
            access: 'Read/Write', // Assuming default access for simplicity
        }));
        res.json(bucketDetails);
    } catch (err) {
        console.error('Error fetching buckets:', err.message);
        res.status(500).json({ message: 'Error fetching buckets', error: err.message });
    }
});

// List objects in a bucket
router.get('/:bucketName/files', validateMinioCredentials, async (req, res) => {
    const { bucketName } = req.params;

    try {
        const stream = req.minioClient.listObjectsV2(bucketName, '', true);
        const files = [];

        stream.on('data', (obj) => files.push(obj));
        stream.on('end', () => {
            res.json(
                files.map((file) => ({
                    name: file.name,
                    size: file.size,
                    lastModified: file.lastModified,
                    etag: file.etag,
                }))
            );
        });
        stream.on('error', (err) => {
            console.error(`Error fetching files from bucket ${bucketName}:`, err.message);
            res.status(500).json({ message: `Error fetching files from bucket: ${bucketName}`, error: err.message });
        });
    } catch (err) {
        console.error(`Error fetching files from bucket ${bucketName}:`, err.message);
        res.status(500).json({ message: 'Error fetching files', error: err.message });
    }
});

// Create a new bucket
router.post('/create', validateMinioCredentials, async (req, res) => {
    const { bucketName } = req.body;

    if (!bucketName) {
        return res.status(400).json({ message: 'Bucket name is required' });
    }

    if (!/^[a-z0-9-]+$/.test(bucketName)) {
        return res.status(400).json({ message: 'Bucket name must be lowercase and contain only letters, numbers, and dashes' });
    }

    try {
        await req.minioClient.makeBucket(bucketName);
        res.json({
            message: 'Bucket created successfully',
            bucket: {
                name: bucketName,
                created: new Date().toISOString(),
                access: 'Read/Write',
            },
        });
    } catch (err) {
        if (err.code === 'BucketAlreadyOwnedByYou') {
            res.status(409).json({ message: 'Bucket already exists and is owned by you' });
        } else {
            console.error('Error creating bucket:', err.message);
            res.status(500).json({ message: 'Error creating bucket', error: err.message });
        }
    }
});

module.exports = router;
