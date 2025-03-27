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

// Test error route - eliminar esta versión duplicada
app.get('/chain-error', (req, res, next) => {
    next(new Error('Test error'));
});

// Error handling middleware - must be before 404 handler
// Error handling middleware
app.use((err, req, res) => {
    const status = err?.status || 500;
    const errorResponse = { 
        error: 'Internal Server Error'
    };
    
    if (process.env.NODE_ENV === 'development' && err?.stack) {
        errorResponse.stack = err.stack;
    }
    
    return res.status(status).json(errorResponse);
});

// Test error routes
app.get('/error-test', (req, res, next) => {
    const error = new Error('Custom error');
    error.status = req.get('x-error') ? (parseInt(req.get('x-error-status')) || 404) : 500;
    next(error);
});

app.get('/chain-error', (req, res, next) => {
    const error = new Error('Test error');
    error.status = parseInt(req.get('x-error-status')) || 500;
    next(error);
});

// Handle 404s - mover después de todas las rutas
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

const startServer = (customPort) => {
    if (!customPort && (!process.env.PORT || process.env.PORT === 'null')) {
        console.error('No port specified');
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
                    console.error(error.code === 'EADDRINUSE' 
                        ? `Port ${serverPort} is already in use`
                        : `Server error on port ${serverPort}: ${error.message}`);
                    error.code === 'EADDRINUSE' ? resolve(null) : reject(error);
                });
        } catch (error) {
            console.error('Server startup error:', error.message);
            reject(error);
        }
    });
};

const initServer = (() => {
    let serverInstance = null;
    
    const reset = async () => {
        if (serverInstance) {
            await new Promise(resolve => {
                serverInstance.close(resolve);
                serverInstance = null;
            });
        }
    };
    
    const init = async () => {
        await reset();
        try {
            const isTest = process.env.NODE_ENV === 'test';
            serverInstance = await startServer(isTest ? 3000 : port);
            return serverInstance;
        } catch (error) {
            console.error('Failed to start server:', error.message);
            return null;
        }
    };

    init.reset = reset;
    return init;
})();

// Initialize server if in main module
if (require.main === module) {
    initServer().catch(console.error);
}

module.exports = { app, startServer, initServer };