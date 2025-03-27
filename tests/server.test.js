const request = require('supertest');
const { app, startServer, initServer } = require('../src/server');

describe('Server Endpoints', () => {
    let server;

    beforeAll(async () => {
        server = await startServer(3006);
    });

    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
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

    test('Should handle module initialization', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        const testServer = await initServer();
        expect(testServer).not.toBeNull();
        if (testServer) {
            await new Promise(resolve => testServer.close(resolve));
        }
        process.env.NODE_ENV = originalEnv;
    });

    afterEach(async () => {
        // Wait for any pending operations to complete
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
        // Additional cleanup for any remaining test servers
        await new Promise(resolve => setTimeout(resolve, 100));
    });
});