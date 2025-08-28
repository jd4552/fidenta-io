const mongoose = require('mongoose');

// Enhanced lead schema with multi-product scoring
const leadSchema = new mongoose.Schema({
    businessName: String,
    contactName: String,
    email: String,
    phone: String,
    annualRevenue: Number,
    monthlyRevenue: Number,
    loanAmount: Number,
    creditScore: Number,
    monthsInBusiness: Number,
    leadScore: Number,
    leadGrade: String,
    scoringTier: String,
    productScores: {
        mca: {
            score: Number,
            qualified: Boolean,
            grade: String
        },
        termLoan: {
            score: Number,
            qualified: Boolean,
            grade: String
        },
        sbaLoan: {
            score: Number,
            qualified: Boolean,
            grade: String
        },
        lineOfCredit: {
            score: Number,
            qualified: Boolean,
            grade: String
        },
        creditCardStacking: {
            score: Number,
            qualified: Boolean,
            grade: String
        },
        equipmentFinancing: {
            score: Number,
            qualified: Boolean,
            grade: String
        }
    },
    routing: {
        recommendedProduct: String,
        creditRepairCandidate: Boolean,
        estimatedValue: Number,
        qualifiedProducts: [String]
    },
    city: String,
    state: String,
    zipCode: String,
    industry: String,
    urgency: String,
    source: String,
    ipAddress: String,
    userAgent: String,
    createdAt: { type: Date, default: Date.now }
});

// Industry risk multipliers (lower is better)
const industryRiskMultipliers = {
    'Technology': 1.0,
    'Healthcare': 1.1,
    'Professional Services': 1.2,
    'Manufacturing': 1.3,
    'Real Estate': 1.3,
    'E-commerce': 1.4,
    'Retail': 1.5,
    'Transportation': 1.5,
    'Construction': 1.6,
    'Hospitality': 1.7,
    'Restaurant': 1.8,
    'Food Service': 1.8
};

// Calculate grade from score
function getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C-';
    if (score >= 45) return 'D';
    if (score < 45) return 'F';
    return 'NQ'; // Not Qualified
}

// Calculate MCA score (heavily weighted on revenue)
function calculateMCAScore(leadData) {
    const monthlyRevenue = leadData.monthlyRevenue || (leadData.annualRevenue ? leadData.annualRevenue / 12 : 0);
    const creditScore = leadData.creditScore || 0;
    const monthsInBusiness = leadData.monthsInBusiness || 0;
    
    // Check minimum requirements
    if (creditScore < 550 || monthlyRevenue < 10000 || monthsInBusiness < 6) {
        return { score: 0, qualified: false, grade: 'NQ' };
    }
    
    let score = 0;
    
    // Monthly Revenue (40% weight)
    if (monthlyRevenue >= 100000) score += 40;
    else if (monthlyRevenue >= 75000) score += 35;
    else if (monthlyRevenue >= 50000) score += 30;
    else if (monthlyRevenue >= 30000) score += 25;
    else if (monthlyRevenue >= 20000) score += 20;
    else if (monthlyRevenue >= 15000) score += 15;
    else score += 10;
    
    // Bank Deposits (20% weight) - using revenue as proxy
    if (monthlyRevenue >= 80000) score += 20;
    else if (monthlyRevenue >= 50000) score += 15;
    else if (monthlyRevenue >= 30000) score += 10;
    else score += 5;
    
    // Credit Score (15% weight)
    if (creditScore >= 700) score += 15;
    else if (creditScore >= 650) score += 12;
    else if (creditScore >= 600) score += 8;
    else score += 5;
    
    // Existing MCA positions (15% weight) - assuming none for now
    score += 15;
    
    // Time in Business (10% weight)
    if (monthsInBusiness >= 36) score += 10;
    else if (monthsInBusiness >= 24) score += 8;
    else if (monthsInBusiness >= 12) score += 6;
    else score += 4;
    
    // Apply industry risk multiplier
    const industry = leadData.industry || 'Other';
    const riskMultiplier = industryRiskMultipliers[industry] || 1.5;
    score = Math.round(score / riskMultiplier);
    
    return {
        score: Math.min(100, score),
        qualified: true,
        grade: getGrade(score)
    };
}

// Calculate Term Loan score
function calculateTermLoanScore(leadData) {
    const monthlyRevenue = leadData.monthlyRevenue || (leadData.annualRevenue ? leadData.annualRevenue / 12 : 0);
    const creditScore = leadData.creditScore || 0;
    const monthsInBusiness = leadData.monthsInBusiness || 0;
    
    // Check minimum requirements
    if (creditScore < 680 || monthlyRevenue < 15000 || monthsInBusiness < 24) {
        return { score: 0, qualified: false, grade: 'NQ' };
    }
    
    let score = 0;
    
    // Credit Score (35% weight)
    if (creditScore >= 750) score += 35;
    else if (creditScore >= 720) score += 30;
    else if (creditScore >= 700) score += 25;
    else score += 20;
    
    // Monthly Revenue (25% weight)
    if (monthlyRevenue >= 100000) score += 25;
    else if (monthlyRevenue >= 50000) score += 20;
    else if (monthlyRevenue >= 30000) score += 15;
    else score += 10;
    
    // Time in Business (15% weight)
    if (monthsInBusiness >= 60) score += 15;
    else if (monthsInBusiness >= 48) score += 12;
    else if (monthsInBusiness >= 36) score += 10;
    else score += 7;
    
    // Bank Balance (10% weight) - using revenue as proxy
    if (monthlyRevenue >= 50000) score += 10;
    else if (monthlyRevenue >= 30000) score += 7;
    else score += 5;
    
    // Industry Risk (10% weight)
    const industry = leadData.industry || 'Other';
    const riskMultiplier = industryRiskMultipliers[industry] || 1.5;
    const industryScore = Math.round(10 / riskMultiplier);
    score += industryScore;
    
    // Debt Service Ratio (5% weight)
    score += 5;
    
    return {
        score: Math.min(100, score),
        qualified: true,
        grade: getGrade(score)
    };
}

// Calculate SBA Loan score
function calculateSBAScore(leadData) {
    const monthlyRevenue = leadData.monthlyRevenue || (leadData.annualRevenue ? leadData.annualRevenue / 12 : 0);
    const creditScore = leadData.creditScore || 0;
    const monthsInBusiness = leadData.monthsInBusiness || 0;
    
    // Check minimum requirements
    if (creditScore < 680 || monthlyRevenue < 10000 || monthsInBusiness < 24) {
        return { score: 0, qualified: false, grade: 'NQ' };
    }
    
    let score = 0;
    
    // Credit Score (30% weight)
    if (creditScore >= 750) score += 30;
    else if (creditScore >= 720) score += 25;
    else if (creditScore >= 700) score += 20;
    else score += 15;
    
    // Business Plan Quality (20% weight) - assuming average
    score += 10;
    
    // Collateral (20% weight) - assuming some collateral
    score += 10;
    
    // Time in Business (15% weight)
    if (monthsInBusiness >= 60) score += 15;
    else if (monthsInBusiness >= 48) score += 12;
    else if (monthsInBusiness >= 36) score += 10;
    else score += 7;
    
    // Monthly Revenue (15% weight)
    if (monthlyRevenue >= 50000) score += 15;
    else if (monthlyRevenue >= 30000) score += 12;
    else if (monthlyRevenue >= 20000) score += 9;
    else score += 6;
    
    return {
        score: Math.min(100, score),
        qualified: true,
        grade: getGrade(score)
    };
}

// Calculate Line of Credit score
function calculateLineOfCreditScore(leadData) {
    const monthlyRevenue = leadData.monthlyRevenue || (leadData.annualRevenue ? leadData.annualRevenue / 12 : 0);
    const creditScore = leadData.creditScore || 0;
    const monthsInBusiness = leadData.monthsInBusiness || 0;
    
    // Check minimum requirements
    if (creditScore < 630 || monthlyRevenue < 10000 || monthsInBusiness < 12) {
        return { score: 0, qualified: false, grade: 'NQ' };
    }
    
    let score = 0;
    
    // Credit Score (35% weight)
    if (creditScore >= 750) score += 35;
    else if (creditScore >= 700) score += 30;
    else if (creditScore >= 680) score += 25;
    else if (creditScore >= 650) score += 20;
    else score += 15;
    
    // Monthly Revenue (25% weight)
    if (monthlyRevenue >= 100000) score += 25;
    else if (monthlyRevenue >= 50000) score += 20;
    else if (monthlyRevenue >= 30000) score += 15;
    else score += 10;
    
    // Cash Flow (20% weight) - using revenue as proxy
    if (monthlyRevenue >= 50000) score += 20;
    else if (monthlyRevenue >= 30000) score += 15;
    else score += 10;
    
    // Time in Business (10% weight)
    if (monthsInBusiness >= 36) score += 10;
    else if (monthsInBusiness >= 24) score += 8;
    else score += 6;
    
    // Bank Balance (10% weight) - using revenue as proxy
    if (monthlyRevenue >= 30000) score += 10;
    else score += 5;
    
    return {
        score: Math.min(100, score),
        qualified: true,
        grade: getGrade(score)
    };
}

// Calculate Credit Card Stacking score
function calculateCreditCardStackingScore(leadData) {
    const creditScore = leadData.creditScore || 0;
    const personalIncome = leadData.personalIncome || leadData.annualRevenue || 0;
    
    // Check minimum requirements
    if (creditScore < 680 || personalIncome < 40000) {
        return { score: 0, qualified: false, grade: 'NQ' };
    }
    
    let score = 0;
    
    // Personal Credit (50% weight)
    if (creditScore >= 750) score += 50;
    else if (creditScore >= 720) score += 45;
    else if (creditScore >= 700) score += 40;
    else score += 35;
    
    // Personal Income (25% weight)
    if (personalIncome >= 150000) score += 25;
    else if (personalIncome >= 100000) score += 20;
    else if (personalIncome >= 75000) score += 15;
    else if (personalIncome >= 50000) score += 10;
    else score += 5;
    
    // Debt-to-Income (15% weight) - assuming good
    score += 10;
    
    // Credit Utilization (10% weight) - assuming good
    score += 8;
    
    return {
        score: Math.min(100, score),
        qualified: true,
        grade: getGrade(score)
    };
}

// Calculate Equipment Financing score
function calculateEquipmentFinancingScore(leadData) {
    const monthlyRevenue = leadData.monthlyRevenue || (leadData.annualRevenue ? leadData.annualRevenue / 12 : 0);
    const creditScore = leadData.creditScore || 0;
    const monthsInBusiness = leadData.monthsInBusiness || 0;
    
    // Check minimum requirements
    if (creditScore < 600 || monthlyRevenue < 10000 || monthsInBusiness < 12) {
        return { score: 0, qualified: false, grade: 'NQ' };
    }
    
    let score = 0;
    
    // Credit Score (30% weight)
    if (creditScore >= 700) score += 30;
    else if (creditScore >= 650) score += 25;
    else if (creditScore >= 625) score += 20;
    else score += 15;
    
    // Monthly Revenue (25% weight)
    if (monthlyRevenue >= 50000) score += 25;
    else if (monthlyRevenue >= 30000) score += 20;
    else if (monthlyRevenue >= 20000) score += 15;
    else score += 10;
    
    // Equipment as Collateral (25% weight) - assuming yes
    score += 20;
    
    // Time in Business (10% weight)
    if (monthsInBusiness >= 36) score += 10;
    else if (monthsInBusiness >= 24) score += 8;
    else score += 6;
    
    // Industry (10% weight)
    const industry = leadData.industry || 'Other';
    const riskMultiplier = industryRiskMultipliers[industry] || 1.5;
    const industryScore = Math.round(10 / riskMultiplier);
    score += industryScore;
    
    return {
        score: Math.min(100, score),
        qualified: true,
        grade: getGrade(score)
    };
}

// Calculate all product scores
function calculateProductScores(leadData) {
    // Ensure we have monthly revenue
    if (!leadData.monthlyRevenue && leadData.annualRevenue) {
        leadData.monthlyRevenue = leadData.annualRevenue / 12;
    }
    
    const productScores = {
        mca: calculateMCAScore(leadData),
        termLoan: calculateTermLoanScore(leadData),
        sbaLoan: calculateSBAScore(leadData),
        lineOfCredit: calculateLineOfCreditScore(leadData),
        creditCardStacking: calculateCreditCardStackingScore(leadData),
        equipmentFinancing: calculateEquipmentFinancingScore(leadData)
    };
    
    // Find qualified products and best product
    const qualifiedProducts = [];
    let bestProduct = null;
    let bestScore = 0;
    
    for (const [product, data] of Object.entries(productScores)) {
        if (data.qualified && data.score > 0) {
            qualifiedProducts.push(product);
            if (data.score > bestScore) {
                bestScore = data.score;
                bestProduct = product;
            }
        }
    }
    
    // Calculate estimated value based on best score
    let estimatedValue = 10; // Base value
    if (bestScore >= 90) estimatedValue = 150;
    else if (bestScore >= 80) estimatedValue = 100;
    else if (bestScore >= 70) estimatedValue = 75;
    else if (bestScore >= 60) estimatedValue = 50;
    else if (bestScore >= 40) estimatedValue = 25;
    
    // Adjust for urgency
    if (leadData.urgency === 'Emergency' || leadData.urgency === 'Immediate') {
        estimatedValue = Math.round(estimatedValue * 1.3);
    }
    
    return {
        productScores,
        routing: {
            recommendedProduct: bestProduct,
            creditRepairCandidate: leadData.creditScore < 650,
            estimatedValue,
            qualifiedProducts
        }
    };
}

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

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    // Handle OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
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
        
        if (event.httpMethod === 'POST') {
            // Parse body
            const leadData = JSON.parse(event.body);
            
            // Calculate multi-product scores
            const scoringResults = calculateProductScores(leadData);
            
            // Add product scores and routing info to lead data
            leadData.productScores = scoringResults.productScores;
            leadData.routing = scoringResults.routing;
            
            // Calculate overall score (average of qualified products or 0)
            let overallScore = 0;
            const qualifiedScores = Object.values(scoringResults.productScores)
                .filter(p => p.qualified && p.score > 0)
                .map(p => p.score);
            
            if (qualifiedScores.length > 0) {
                overallScore = Math.round(qualifiedScores.reduce((a, b) => a + b, 0) / qualifiedScores.length);
            }
            
            leadData.leadScore = overallScore;
            
            // Grade and tier based on best product score
            const bestScore = scoringResults.routing.estimatedValue >= 150 ? 90 :
                             scoringResults.routing.estimatedValue >= 100 ? 80 :
                             scoringResults.routing.estimatedValue >= 75 ? 70 :
                             scoringResults.routing.estimatedValue >= 50 ? 60 :
                             scoringResults.routing.estimatedValue >= 25 ? 40 : 20;
            
            let grade = 'D';
            if (bestScore >= 85) grade = 'A';
            else if (bestScore >= 70) grade = 'B';
            else if (bestScore >= 55) grade = 'C';
            
            let tier = 'BASIC';
            if (bestScore >= 85) tier = 'PLATINUM';
            else if (bestScore >= 70) tier = 'GOLD';
            else if (bestScore >= 55) tier = 'SILVER';
            
            leadData.leadGrade = grade;
            leadData.scoringTier = tier;
            
            // Save if database is available
            if (Lead) {
                const lead = new Lead(leadData);
                await lead.save();
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'Lead saved successfully',
                        lead: lead
                    })
                };
            } else {
                // No database, just return the scored lead
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'Lead scored (database not configured)',
                        lead: {
                            ...leadData,
                            _id: 'temp-' + Date.now()
                        }
                    })
                };
            }
        } else if (event.httpMethod === 'GET') {
            // Get leads
            if (Lead) {
                const leads = await Lead.find().sort({ createdAt: -1 }).limit(50);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        count: leads.length,
                        leads: leads
                    })
                };
            } else {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'Database not configured',
                        leads: []
                    })
                };
            }
        } else {
            return {
                statusCode: 405,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Method not allowed'
                })
            };
        }
        
    } catch (error) {
        console.error('API Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message || 'Server error'
            })
        };
    }
};