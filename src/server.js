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
    if (!customPort && !process.env.PORT) {
        return Promise.resolve(null);
    }
    const serverPort = customPort || port;
    return new Promise((resolve, reject) => {
        try {
            const server = app.listen(serverPort)
                .once('listening', () => {
                    console.log(`Server is running on port ${serverPort}`);
                    resolve(server);
                })
                .once('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        console.error(`Port ${serverPort} is already in use`);
                        resolve(null);
                    } else {
                        reject(error);
                    }
                });
        } catch (error) {
            reject(error);
        }
    });
};

let server = null;
const initServer = async () => {
    try {
        if (!server && (require.main === module || process.env.NODE_ENV === 'test')) {
            const testPort = process.env.NODE_ENV === 'test' ? 3000 : port;
            server = await startServer(testPort);
        }
        return server;
    } catch (error) {
        console.error('Server initialization failed:', error);
        return null;
    }
};

// Initialize server if in main module
if (require.main === module) {
    initServer().catch(() => {
        process.exit(1);
    });
}

module.exports = { app, startServer, initServer };