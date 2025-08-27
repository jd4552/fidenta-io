const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Simple test endpoint
app.get('/', (req, res) => {
    res.json({
        message: "Fidenta API - Simplified Test",
        status: "Running",
        timestamp: new Date().toISOString(),
        env: {
            hasMongoURI: !!process.env.MONGODB_URI,
            nodeEnv: process.env.NODE_ENV,
            vercel: !!process.env.VERCEL
        }
    });
});

// Test endpoint for leads
app.post('/api/leads', (req, res) => {
    res.json({
        success: true,
        message: "Test lead received (not saved - no DB)",
        data: req.body
    });
});

// Export for Vercel
module.exports = app;

// Start locally if not in Vercel
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Test server running on port ${PORT}`);
    });
}