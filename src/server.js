const express = require('express');
const app = express();
const port = process.env.PORT || 3006;

app.use(express.json());

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the test server!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = app;