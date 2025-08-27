// Minimal Vercel serverless function
module.exports = (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    res.status(200).json({
        message: "Fidenta API - Backend is Working!",
        status: "Running",
        timestamp: new Date().toISOString(),
        endpoints: {
            root: "/",
            hello: "/api/hello",
            leads: "/api/leads"
        }
    });
};