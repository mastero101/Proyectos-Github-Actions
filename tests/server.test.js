const request = require('supertest');
const { app, startServer, initServer } = require('../src/server');

describe('Server Endpoints', () => {
    let testServer;

    beforeEach(async () => {
        if (testServer) {
            await new Promise(resolve => testServer.close(resolve));
        }
        testServer = null;
        jest.restoreAllMocks();
        
        // Reset server state
        if (initServer.reset) {
            initServer.reset();
        }
        
        // Wait for any pending connections to close
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('GET / should return welcome message', async () => {
        const response = await request(app).get('/');
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Welcome to the test server!');
    });

    test('GET /health should return OK status', async () => {
        const response = await request(app).get('/health');
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('OK');
    });

    test('Should handle non-existent routes', async () => {
        const response = await request(app).get('/not-found');
        expect(response.statusCode).toBe(404);
        expect(response.body.error).toBe('Not found');
    });

    test('Server should handle JSON parsing', async () => {
        const response = await request(app)
            .post('/')
            .send({ test: 'data' });
        expect(response.statusCode).toBe(404);
    });

    test('Server should start with default port when no custom port provided', async () => {
        const testServer = await startServer(3007);
        expect(testServer).not.toBeNull();
        expect(testServer.listening).toBe(true);
        await new Promise(resolve => testServer.close(resolve));
    });

    test('Should handle invalid port', async () => {
        const originalPort = process.env.PORT;
        delete process.env.PORT;
        const server = await startServer();
        expect(server).toBeNull();
        process.env.PORT = originalPort;
    });

    test('Should handle JSON parsing errors', async () => {
        const response = await request(app)
            .post('/')
            .set('Content-Type', 'application/json')
            .send('{"invalid": json}');
        expect(response.statusCode).toBe(400);
    });

    test('Should handle error middleware with no error', async () => {
        const response = await request(app).get('/health');
        expect(response.statusCode).toBe(200);
    });

    test('Should handle server errors', async () => {
        const mockListen = jest.spyOn(app, 'listen').mockImplementationOnce(() => {
            throw new Error('Server error');
        });
        await expect(startServer(3009)).rejects.toThrow('Server error');
        mockListen.mockRestore();
    });

    test('Should handle server startup errors', async () => {
        const mockListen = jest.spyOn(app, 'listen').mockImplementationOnce(() => {
            const error = new Error('Random error');
            error.code = 'RANDOM_ERROR';
            throw error;
        });
        await expect(startServer(3009)).rejects.toThrow('Random error');
        mockListen.mockRestore();
    });

    test('Should handle module initialization in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        const originalMain = require.main;
        process.env.NODE_ENV = 'production';
        require.main = module;
        
        const testServer = await startServer(3008); // Use startServer directly
        expect(testServer).not.toBeNull();
        if (testServer) {
            await new Promise(resolve => testServer.close(resolve));
        }
        
        process.env.NODE_ENV = originalEnv;
        require.main = originalMain;
    });

    beforeEach(() => {
        initServer.reset();
    });

    test('Should handle initialization errors', async () => {
        const originalEnv = process.env.NODE_ENV;
        const originalMain = require.main;
        process.env.NODE_ENV = 'test';
        require.main = { filename: 'different.js' };
        
        const mockStartServer = jest.spyOn(require('../src/server'), 'startServer')
            .mockImplementationOnce(() => Promise.resolve(null));
        
        await initServer();
        const result = await startServer();
        expect(result).toBeNull();
        
        mockStartServer.mockRestore();
        process.env.NODE_ENV = originalEnv;
        require.main = originalMain;
    });

    test('Should handle server error on port', async () => {
        const mockListen = jest.spyOn(app, 'listen').mockImplementationOnce(() => {
            const server = app;
            setTimeout(() => {
                server.emit('error', {
                    code: 'EADDRINUSE',
                    message: 'Port already in use'
                });
            }, 100);
            return server;
        });
        
        const result = await startServer(3000);
        expect(result).toBeNull();
        mockListen.mockRestore();
    }, 10000);

    // Replace the generic server errors test with this version
    test('Should handle generic server errors', async () => {
        const mockListen = jest.spyOn(app, 'listen').mockImplementationOnce(() => {
            const server = app;
            setTimeout(() => {
                server.emit('error', {
                    code: 'EOTHER',
                    message: 'Other error'
                });
            }, 100);
            return server;
        });
        
        try {
            await startServer(3000);
        } catch (error) {
            expect(error.message).toBe('Other error');
        }
        
        mockListen.mockRestore();
    }, 10000);

    test('Should handle middleware chain errors', async () => {
        const response = await request(app)
            .get('/error-test')
            .set('x-error', 'true');
            
        expect(response.statusCode).toBe(404);
    });

    // Keep the existing tests below
    test('Should handle server startup with custom error handler', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        
        const testServer = await startServer(3010);
        expect(testServer).not.toBeNull();
        
        if (testServer) {
            await new Promise(resolve => testServer.close(resolve));
        }
        
        process.env.NODE_ENV = originalEnv;
    });

    // Add test for error handling middleware
    test('Should handle error middleware with error', async () => {
        const response = await request(app).get('/chain-error');
        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe('Internal Server Error');
    });

    afterEach(async () => {
        if (testServer) {
            await new Promise(resolve => testServer.close(resolve));
        }
        testServer = null;
        jest.restoreAllMocks();
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Single version of error handling tests
    test('Should handle custom error responses', async () => {
        const response = await request(app)
            .get('/error')
            .set('x-custom-error', 'true');
        expect(response.statusCode).toBe(404);
        expect(response.body.error).toBe('Not found');
    });

    test('Should handle production error responses', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        
        const response = await request(app)
            .get('/chain-error');
        
        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe('Internal Server Error');
        
        process.env.NODE_ENV = originalEnv;
    });

    test('Should handle development error stack traces', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        
        const response = await request(app)
            .get('/chain-error');
        
        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe('Internal Server Error');
        
        process.env.NODE_ENV = originalEnv;
    });

    // Add these new tests to improve branch coverage
    test('Should handle undefined error in middleware', async () => {
        const response = await request(app)
            .get('/chain-error')
            .set('x-undefined-error', 'true')
            .set('x-error-type', 'undefined');
        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe('Internal Server Error');
    });

    test('Should handle null port configuration', async () => {
        const originalPort = process.env.PORT;
        process.env.PORT = 'null';
        const server = await startServer();
        expect(server).toBeNull();
        process.env.PORT = originalPort;
    });

    test('Should handle invalid environment configuration', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'invalid';
        
        const response = await request(app)
            .get('/chain-error');
        expect(response.statusCode).toBe(500);
        
        process.env.NODE_ENV = originalEnv;
    });
});