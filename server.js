const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pino = require('pino');
const pinoHttp = require('pino-http');
const { PrismaClient } = require('@prisma/client');

const app = express();
const port = 3000;
const prisma = new PrismaClient();

// Logging
const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    }
});
app.use(pinoHttp({ logger }));

app.use((req, res, next) => {
    console.log(`[DEBUG] Request received: ${req.method} ${req.url}`);
    next();
});

// Security Middleware
app.use(helmet()); // Secure HTTP headers
app.use(cors({
    origin: 'http://localhost:3000' // Only allow same origin for now
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// Serve static files
app.use(express.static(__dirname));

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Graceful Shutdown
const server = app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
});

const shutdown = async () => {
    logger.info('Shutting down server...');
    server.close(() => {
        logger.info('HTTP server closed');
    });
    await prisma.$disconnect();
    logger.info('Prisma disconnected');
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
