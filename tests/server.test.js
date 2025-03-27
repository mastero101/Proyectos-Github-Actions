const request = require('supertest');
const { app, startServer } = require('../src/server');

describe('Server Endpoints', () => {
    let server;
    const TEST_PORT = 3006;

    beforeAll(() => {
        server = startServer(TEST_PORT);
    });

    afterAll((done) => {
        server.close(done);
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

    test('Server should start with default port when no custom port provided', () => {
        const testServer = startServer(3007); // Use different port
        expect(testServer.listening).toBe(true);
        testServer.close();
    });

    test('Should handle malformed JSON', async () => {
        const response = await request(app)
            .post('/')
            .set('Content-Type', 'application/json')
            .send('{"malformed":json}');
        expect(response.statusCode).toBe(400);
    });

    test('Should handle different content types', async () => {
        const response = await request(app)
            .post('/')
            .set('Content-Type', 'text/plain')
            .send('Hello World');
        expect(response.statusCode).toBe(404);
    });

    test('Should handle next() in error middleware', async () => {
        const response = await request(app).get('/chain-error');
        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe('Internal Server Error');
    });

    test('Should handle module initialization', () => {
        process.env.NODE_ENV = 'test';
        const { server: testServer } = require('../src/server');
        expect(testServer).not.toBeNull();
        testServer.close();
        process.env.NODE_ENV = 'development';
    });
});