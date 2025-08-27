const mongoose = require('mongoose');

// Simple lead schema
const leadSchema = new mongoose.Schema({
    businessName: String,
    contactName: String,
    email: String,
    phone: String,
    annualRevenue: Number,
    loanAmount: Number,
    creditScore: Number,
    monthsInBusiness: Number,
    leadScore: Number,
    leadGrade: String,
    scoringTier: String,
    createdAt: { type: Date, default: Date.now }
});

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise && process.env.MONGODB_URI) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000,
        };

        cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
            return mongoose;
        });
    }
    
    if (cached.promise) {
        cached.conn = await cached.promise;
    }
    
    return cached.conn;
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        // Try to connect to database
        let Lead = null;
        if (process.env.MONGODB_URI) {
            await dbConnect();
            
            // Get or create model
            if (!mongoose.models.Lead) {
                Lead = mongoose.model('Lead', leadSchema);
            } else {
                Lead = mongoose.models.Lead;
            }
        }
        
        if (req.method === 'POST') {
            // Calculate lead score
            const leadData = req.body;
            let score = 50; // Base score
            
            // Score based on loan amount
            const loanAmount = leadData.loanAmount || 0;
            if (loanAmount >= 500000) score += 25;
            else if (loanAmount >= 250000) score += 20;
            else if (loanAmount >= 100000) score += 15;
            else if (loanAmount >= 50000) score += 10;
            
            // Score based on credit
            const creditScore = leadData.creditScore || 0;
            if (creditScore >= 750) score += 15;
            else if (creditScore >= 700) score += 10;
            else if (creditScore >= 650) score += 5;
            
            // Score based on business age
            const monthsInBusiness = leadData.monthsInBusiness || 0;
            if (monthsInBusiness >= 36) score += 10;
            else if (monthsInBusiness >= 24) score += 7;
            else if (monthsInBusiness >= 12) score += 5;
            
            // Grade and tier
            let grade = 'D';
            if (score >= 85) grade = 'A';
            else if (score >= 70) grade = 'B';
            else if (score >= 55) grade = 'C';
            
            let tier = 'BASIC';
            if (score >= 85) tier = 'PLATINUM';
            else if (score >= 70) tier = 'GOLD';
            else if (score >= 55) tier = 'SILVER';
            
            leadData.leadScore = score;
            leadData.leadGrade = grade;
            leadData.scoringTier = tier;
            
            // Save if database is available
            if (Lead) {
                const lead = new Lead(leadData);
                await lead.save();
                
                return res.status(200).json({
                    success: true,
                    message: 'Lead saved successfully',
                    lead: lead
                });
            } else {
                // No database, just return the scored lead
                return res.status(200).json({
                    success: true,
                    message: 'Lead scored (database not configured)',
                    lead: {
                        ...leadData,
                        _id: 'temp-' + Date.now()
                    }
                });
            }
        } else if (req.method === 'GET') {
            // Get leads
            if (Lead) {
                const leads = await Lead.find().sort({ createdAt: -1 }).limit(50);
                return res.status(200).json({
                    success: true,
                    count: leads.length,
                    leads: leads
                });
            } else {
                return res.status(200).json({
                    success: true,
                    message: 'Database not configured',
                    leads: []
                });
            }
        } else {
            return res.status(405).json({
                success: false,
                error: 'Method not allowed'
            });
        }
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
};