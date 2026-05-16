const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
        logger.error('MONGODB_URI is not defined in .env file');
        process.exit(1);
    }

    // Hardening DNS resolution for MongoDB Atlas SRV records
    try {
        const dns = require('node:dns');
        dns.setServers(['8.8.8.8', '8.8.4.4']);
    } catch (e) {
        logger.warn('DNS hardening failed, using system defaults');
    }

    const options = {
        serverSelectionTimeoutMS: 20000, 
        socketTimeoutMS: 60000,
        heartbeatFrequencyMS: 10000,
        family: 4 // Force IPv4 to avoid resolution issues on Windows
    };

    try {
        const conn = await mongoose.connect(mongoUri, options);
        logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
        
        mongoose.connection.on('error', err => {
            logger.error(`MongoDB connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });

    } catch (error) {
        logger.error(`❌ MongoDB Connection Error: ${error.message}`);
        
        // Initial connection failure: retry after 5 seconds
        logger.info('Retrying MongoDB connection in 5 seconds...');
        setTimeout(connectDB, 5000);
    }
};

module.exports = connectDB;
