// Netlify serverless function
exports.handler = async (event, context) => {
    // Handle CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    // Handle OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    // Return API info
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: "Fidenta API - Backend is Working!",
            status: "Running",
            timestamp: new Date().toISOString(),
            endpoints: {
                root: "/",
                hello: "/api/hello",
                leads: "/api/leads"
            }
        })
    };
};