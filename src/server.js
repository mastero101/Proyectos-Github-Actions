const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// JSON parsing error handler
app.use(express.json({
    strict: true,
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            res.status(400).json({ error: 'Invalid JSON' });
            throw new Error('Invalid JSON');
        }
    }
}));

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the test server!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

// Test error route
app.get('/chain-error', (req, res, next) => {
    next(new Error('Test error'));
});

// Error handling middleware - must be before 404 handler
app.use((err, req, res, next) => {
    if (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
    next();
});

// Handle 404s
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

const startServer = (customPort) => {
    const serverPort = customPort || port;
    try {
        const server = app.listen(serverPort, () => {
            console.log(`Server is running on port ${serverPort}`);
        });
        return server;
    } catch (error) {
        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${serverPort} is already in use`);
            return null;
        }
        throw error;
    }
};

let server = null;
if (require.main === module) {
    server = startServer();
}

// For testing purposes
if (process.env.NODE_ENV === 'test') {
    server = startServer(3000);
}

module.exports = { app, server, startServer };