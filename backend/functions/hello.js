module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    res.status(200).json({ 
        message: 'Hello from Fidenta Backend API!',
        endpoint: '/api/hello',
        timestamp: new Date().toISOString()
    });
};