exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
            message: 'Hello from Fidenta Backend API!',
            endpoint: '/api/hello',
            timestamp: new Date().toISOString()
        })
    };
};