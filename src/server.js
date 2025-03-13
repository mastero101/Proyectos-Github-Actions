const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the test server!' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

let server = null;

if (require.main === module) {
    server = app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

module.exports = { app, server };