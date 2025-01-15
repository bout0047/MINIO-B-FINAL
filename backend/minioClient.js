const Minio = require('minio');

// Function to create a MinIO client dynamically
const createMinioClient = (accessKey, secretKey) => {
    return new Minio.Client({
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT, 10) || 9000,
        useSSL: process.env.MINIO_USE_SSL === 'false',
        accessKey,
        secretKey,
    });
};

module.exports = { createMinioClient };
