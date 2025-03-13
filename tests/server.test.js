const request = require('supertest');
const app = require('../src/server');

describe('Server Endpoints', () => {
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
});