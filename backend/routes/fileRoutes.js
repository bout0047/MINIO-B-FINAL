const express = require('express');
const router = express.Router();
const multer = require('multer');
const mime = require('mime-types');
const { createMinioClient } = require('../minioClient');

// Middleware to validate MinIO credentials
const validateMinioCredentials = (req, res, next) => {
    const accessKey = req.headers['x-access-key'];
    const secretKey = req.headers['x-secret-key'];

    if (!accessKey || !secretKey) {
        return res.status(400).json({ message: 'Access Key and Secret Key are required for authentication.' });
    }

    try {
        req.minioClient = createMinioClient(accessKey, secretKey);
        next();
    } catch (error) {
        console.error('Error creating MinIO client:', error.message);
        res.status(500).json({ message: 'Failed to initialize MinIO client', error: error.message });
    }
};

// Set up memory storage for multer
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to convert tags to MinIO's format
const parseTags = (tagsArray) => {
    return tagsArray.reduce((acc, tag) => {
        if (tag.key && tag.value) {
            acc[tag.key] = tag.value;
        }
        return acc;
    }, {});
};

// Route to upload a file with optional tags
router.post('/:bucketName/upload', validateMinioCredentials, upload.single('file'), async (req, res) => {
    const { bucketName } = req.params;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    let tagsArray = [];
    try {
        tagsArray = req.body.tags ? JSON.parse(req.body.tags) : [];
    } catch (err) {
        return res.status(400).json({ error: 'Invalid tags format. Tags must be a valid JSON array.' });
    }

    const tags = parseTags(tagsArray);

    try {
        console.log(`Uploading file: ${file.originalname} to bucket: ${bucketName}`);
        await req.minioClient.putObject(bucketName, file.originalname, file.buffer, { 'Content-Type': file.mimetype });

        if (Object.keys(tags).length > 0) {
            await req.minioClient.setObjectTagging(bucketName, file.originalname, tags);
        }

        res.status(200).json({ message: 'File uploaded and tagged successfully.' });
    } catch (err) {
        console.error('Error uploading file:', err.message);
        res.status(500).json({ error: 'Error uploading file.', details: err.message });
    }
});

// Route to get metadata and tags for a specific file
router.get('/:bucketName/:fileName/metadata', validateMinioCredentials, async (req, res) => {
    const { bucketName, fileName } = req.params;

    try {
        const metadata = await req.minioClient.statObject(bucketName, fileName);
        const tags = await req.minioClient.getObjectTagging(bucketName, fileName);

        res.status(200).json({ metadata, tags });
    } catch (err) {
        console.error('Error fetching file metadata or tags:', err.message);
        res.status(500).json({ error: 'Error fetching file metadata or tags.', details: err.message });
    }
});

// Route to delete a file
router.delete('/:bucketName/:fileName', validateMinioCredentials, async (req, res) => {
    const { bucketName, fileName } = req.params;

    try {
        await req.minioClient.removeObject(bucketName, fileName);
        res.status(200).json({ message: 'File deleted successfully.' });
    } catch (err) {
        console.error('Error deleting file:', err.message);
        res.status(500).json({ error: 'Error deleting file.', details: err.message });
    }
});

// Route to download or preview a file
router.get('/:bucketName/:fileName', validateMinioCredentials, async (req, res) => {
    const { bucketName, fileName } = req.params;

    try {
        const dataStream = await req.minioClient.getObject(bucketName, fileName);
        const contentType = mime.lookup(fileName) || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

        dataStream.pipe(res);
    } catch (err) {
        console.error('Error fetching file:', err.message);
        res.status(404).json({ error: 'File not found.', details: err.message });
    }
});

module.exports = router;
