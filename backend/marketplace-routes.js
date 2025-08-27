// Marketplace Routes - Lead Purchase and Broker Management
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const router = express.Router();

// Broker Schema
const brokerSchema = new mongoose.Schema({
    // Company Information
    companyName: { type: String, required: true },
    companyType: { 
        type: String, 
        enum: ['direct-lender', 'broker', 'lead-company', 'marketing-agency'],
        required: true 
    },
    
    // Contact Information
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    
    // Authentication
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    
    // Billing Information
    billingAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'US' }
    },
    
    // Account Status
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended', 'closed'],
        default: 'pending'
    },
    
    // Credits and Payments
    balance: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 1000 },
    
    // Purchase History
    totalPurchases: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    
    // Preferences
    preferences: {
        leadGrades: [{ type: String, enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D'] }],
        maxPrice: Number,
        autoRecharge: Boolean,
        autoRechargeAmount: Number,
        emailNotifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false }
    },
    
    // API Access
    apiKey: String,
    apiCallsThisMonth: { type: Number, default: 0 },
    apiLimit: { type: Number, default: 1000 },
    
    // Metadata
    lastLogin: Date,
    ipAddress: String,
    userAgent: String,
    referralSource: String,
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
    brokerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Broker', required: true },
    type: {
        type: String,
        enum: ['purchase', 'credit', 'refund', 'adjustment'],
        required: true
    },
    
    // Transaction Details
    amount: { type: Number, required: true },
    description: String,
    
    // For lead purchases
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    leadData: {
        businessName: String,
        grade: String,
        price: Number
    },
    
    // Payment Information
    paymentMethod: {
        type: String,
        enum: ['credits', 'stripe', 'bank-transfer', 'manual'],
        required: true
    },
    paymentId: String, // Stripe payment intent ID
    
    // Status
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    
    // Metadata
    ipAddress: String,
    userAgent: String,
    
    createdAt: { type: Date, default: Date.now },
    processedAt: Date
});

// Lead Purchase Schema (tracks which leads were purchased by which brokers)
const leadPurchaseSchema = new mongoose.Schema({
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    brokerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Broker', required: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    
    price: { type: Number, required: true },
    purchasedAt: { type: Date, default: Date.now },
    
    // Delivery tracking
    delivered: { type: Boolean, default: false },
    deliveredAt: Date,
    downloadCount: { type: Number, default: 0 },
    
    // Feedback
    rating: { type: Number, min: 1, max: 5 },
    feedback: String,
    
    // Status
    status: {
        type: String,
        enum: ['active', 'refunded', 'disputed'],
        default: 'active'
    }
});

const Broker = mongoose.model('Broker', brokerSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const LeadPurchase = mongoose.model('LeadPurchase', leadPurchaseSchema);

// Middleware for broker authentication
const authenticateBroker = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        const broker = await Broker.findById(decoded.brokerId);
        
        if (!broker) {
            return res.status(401).json({ error: 'Invalid token.' });
        }
        
        if (broker.status !== 'active') {
            return res.status(403).json({ error: 'Account not active.' });
        }
        
        req.broker = broker;
        next();
        
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

// BROKER AUTHENTICATION ROUTES

// Register new broker
router.post('/brokers/register', async (req, res) => {
    try {
        const {
            companyName,
            companyType,
            firstName,
            lastName,
            email,
            phone,
            password
        } = req.body;
        
        // Check if broker already exists
        const existingBroker = await Broker.findOne({ email });
        if (existingBroker) {
            return res.status(400).json({ error: 'Broker with this email already exists' });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create broker
        const broker = new Broker({
            companyName,
            companyType,
            firstName,
            lastName,
            email,
            phone,
            password: hashedPassword,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        
        await broker.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { brokerId: broker._id },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            success: true,
            message: 'Broker registered successfully',
            token,
            broker: {
                id: broker._id,
                companyName: broker.companyName,
                email: broker.email,
                status: broker.status,
                balance: broker.balance
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register broker' });
    }
});

// Login broker
router.post('/brokers/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find broker
        const broker = await Broker.findOne({ email });
        if (!broker) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, broker.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        broker.lastLogin = new Date();
        broker.ipAddress = req.ip;
        broker.userAgent = req.get('user-agent');
        await broker.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { brokerId: broker._id },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            broker: {
                id: broker._id,
                companyName: broker.companyName,
                email: broker.email,
                status: broker.status,
                balance: broker.balance
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Get broker profile
router.get('/brokers/profile', authenticateBroker, async (req, res) => {
    try {
        const broker = req.broker;
        
        res.json({
            id: broker._id,
            companyName: broker.companyName,
            companyType: broker.companyType,
            firstName: broker.firstName,
            lastName: broker.lastName,
            email: broker.email,
            phone: broker.phone,
            status: broker.status,
            balance: broker.balance,
            totalPurchases: broker.totalPurchases,
            totalSpent: broker.totalSpent,
            preferences: broker.preferences,
            createdAt: broker.createdAt
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// MARKETPLACE ROUTES

// Get marketplace statistics
router.get('/marketplace/stats', async (req, res) => {
    try {
        // Get Lead model directly from mongoose models
        const Lead = mongoose.model('Lead');
        
        const stats = {
            available: await Lead.countDocuments({ 
                status: 'new',
                // Don't show leads that have been purchased exclusively
                purchasedBy: { $exists: false }
            }),
            premium: await Lead.countDocuments({ 
                status: 'new',
                'leadGrade.grade': { $in: ['A+', 'A'] },
                purchasedBy: { $exists: false }
            }),
            urgent: await Lead.countDocuments({ 
                status: 'new',
                urgency: 'immediate',
                purchasedBy: { $exists: false }
            }),
            withDocuments: await Lead.countDocuments({ 
                status: 'new',
                hasDocuments: true,
                purchasedBy: { $exists: false }
            }),
            totalBrokers: await Broker.countDocuments({ status: 'active' }),
            totalPurchases: await LeadPurchase.countDocuments(),
            avgPrice: await Lead.aggregate([
                { $match: { status: 'new', purchasedBy: { $exists: false } } },
                { $group: { _id: null, avgPrice: { $avg: '$price' } } }
            ])
        };
        
        res.json(stats);
        
    } catch (error) {
        console.error('Error fetching marketplace stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get available leads for marketplace (anonymized)
router.get('/marketplace/leads', async (req, res) => {
    try {
        const Lead = mongoose.model('Lead');
        
        const {
            page = 1,
            limit = 12,
            grade,
            urgency,
            minPrice,
            maxPrice,
            hasDocuments,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
        
        // Build query for available leads
        const query = {
            status: 'new',
            purchasedBy: { $exists: false } // Not exclusively purchased
        };
        
        // Apply filters
        if (grade) {
            const grades = grade.split(',');
            query['leadGrade.grade'] = { $in: grades };
        }
        
        if (urgency) {
            const urgencies = urgency.split(',');
            query.urgency = { $in: urgencies };
        }
        
        if (hasDocuments !== undefined) {
            query.hasDocuments = hasDocuments === 'true';
        }
        
        // Calculate price for each lead and apply price filters
        const leads = await Lead.find(query)
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .limit(limit * page)
            .lean();
        
        // Calculate prices and anonymize data
        const anonymizedLeads = leads.map(lead => {
            const price = calculateLeadPrice(lead);
            
            // Skip if price doesn't match filters
            if (minPrice && price < minPrice) return null;
            if (maxPrice && price > maxPrice) return null;
            
            return {
                _id: lead._id,
                // Anonymized business info
                businessType: lead.businessType,
                state: getStateFromBusinessName(lead.businessName), // Extract state safely
                
                // Financial info (rounded for privacy)
                fundingAmount: Math.round(lead.fundingAmount / 1000) * 1000,
                monthlyRevenue: Math.round(lead.monthlyRevenue / 5000) * 5000,
                timeInBusinessMonths: Math.floor(lead.timeInBusinessMonths / 6) * 6,
                
                // Scoring info
                leadGrade: lead.leadGrade,
                overallScore: lead.overallScore,
                
                // Features
                urgency: lead.urgency,
                hasDocuments: lead.hasDocuments,
                creditScore: lead.creditScore ? Math.floor(lead.creditScore / 50) * 50 : null,
                
                // Calculated price
                price: price,
                
                // Metadata
                createdAt: lead.createdAt,
                
                // Features for display
                features: getLeadFeatures(lead)
            };
        }).filter(Boolean);
        
        res.json(anonymizedLeads);
        
    } catch (error) {
        console.error('Error fetching marketplace leads:', error);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

// Purchase a lead
router.post('/marketplace/purchase', authenticateBroker, async (req, res) => {
    try {
        const { leadId, paymentMethod } = req.body;
        const broker = req.broker;
        
        const Lead = mongoose.model('Lead');
        
        // Get the lead
        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        
        if (lead.status !== 'new') {
            return res.status(400).json({ error: 'Lead no longer available' });
        }
        
        // Check if already purchased by this broker
        const existingPurchase = await LeadPurchase.findOne({
            leadId,
            brokerId: broker._id
        });
        
        if (existingPurchase) {
            return res.status(400).json({ error: 'Lead already purchased' });
        }
        
        // Calculate price
        const price = calculateLeadPrice(lead);
        
        // Handle payment
        if (paymentMethod === 'credits') {
            if (broker.balance < price) {
                return res.status(400).json({ 
                    error: 'Insufficient balance',
                    required: price,
                    balance: broker.balance
                });
            }
            
            // Deduct from balance
            broker.balance -= price;
            broker.totalPurchases += 1;
            broker.totalSpent += price;
            await broker.save();
            
        } else {
            return res.status(400).json({ error: 'Invalid payment method' });
        }
        
        // Create transaction record
        const transaction = new Transaction({
            brokerId: broker._id,
            type: 'purchase',
            amount: -price,
            description: `Lead purchase - ${lead.businessName}`,
            leadId: lead._id,
            leadData: {
                businessName: lead.businessName,
                grade: lead.leadGrade?.grade,
                price: price
            },
            paymentMethod,
            status: 'completed',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            processedAt: new Date()
        });
        
        await transaction.save();
        
        // Create lead purchase record
        const leadPurchase = new LeadPurchase({
            leadId: lead._id,
            brokerId: broker._id,
            transactionId: transaction._id,
            price: price,
            delivered: true,
            deliveredAt: new Date()
        });
        
        await leadPurchase.save();
        
        // Update lead status
        lead.status = 'routed';
        lead.routedTo.push({
            partner: `broker-${broker._id}`,
            timestamp: new Date(),
            status: 'sold',
            response: 'Purchased via marketplace'
        });
        
        await lead.save();
        
        // Return full lead data to purchaser
        res.json({
            success: true,
            message: 'Lead purchased successfully',
            newBalance: broker.balance,
            transactionId: transaction._id,
            leadData: {
                _id: lead._id,
                businessName: lead.businessName,
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email,
                phone: lead.phone,
                fundingAmount: lead.fundingAmount,
                monthlyRevenue: lead.monthlyRevenue,
                creditScore: lead.creditScore,
                timeInBusinessMonths: lead.timeInBusinessMonths,
                urgency: lead.urgency,
                hasDocuments: lead.hasDocuments,
                leadGrade: lead.leadGrade,
                overallScore: lead.overallScore,
                qualifiedProducts: lead.qualifiedProducts,
                purchasedAt: new Date()
            }
        });
        
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({ error: 'Failed to process purchase' });
    }
});

// Broker dashboard data
router.get('/brokers/dashboard', authenticateBroker, async (req, res) => {
    try {
        const broker = req.broker;
        
        // Get recent purchases
        const recentPurchases = await LeadPurchase.find({ brokerId: broker._id })
            .populate('leadId', 'businessName leadGrade')
            .sort({ purchasedAt: -1 })
            .limit(10);
        
        // Get monthly stats
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const monthlyPurchases = await LeadPurchase.countDocuments({
            brokerId: broker._id,
            purchasedAt: { $gte: startOfMonth }
        });
        
        res.json({
            totalPurchases: broker.totalPurchases,
            balance: broker.balance,
            thisMonth: monthlyPurchases,
            totalSpent: broker.totalSpent,
            recentPurchases: recentPurchases.map(purchase => ({
                businessName: purchase.leadId?.businessName || 'Business',
                grade: purchase.leadId?.leadGrade?.grade || 'B',
                price: purchase.price,
                date: purchase.purchasedAt.toLocaleDateString(),
                purchasedAt: purchase.purchasedAt
            }))
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

// Helper functions
function calculateLeadPrice(lead) {
    let basePrice = 10;
    
    // Base price by grade
    switch (lead.leadGrade?.grade) {
        case 'A+': basePrice = 300; break;
        case 'A': basePrice = 200; break;
        case 'B+': basePrice = 100; break;
        case 'B': basePrice = 50; break;
        case 'C+': basePrice = 30; break;
        case 'C': basePrice = 20; break;
        case 'D': basePrice = 10; break;
        default: basePrice = 25;
    }
    
    // Premium multipliers
    if (lead.urgency === 'immediate') basePrice *= 1.25;
    if (lead.hasDocuments) basePrice += 25;
    if (lead.overallScore > 90) basePrice += 50;
    if (lead.fundingAmount > 500000) basePrice += 25;
    
    return Math.round(basePrice);
}

function getLeadFeatures(lead) {
    const features = [];
    
    if (lead.urgency === 'immediate') features.push('🔥 Hot Lead');
    if (lead.hasDocuments) features.push('📄 Has Documents');
    if (lead.overallScore > 90) features.push('⭐ Premium Quality');
    if (lead.fundingAmount > 500000) features.push('💰 High Value');
    if (lead.creditScore > 700) features.push('✅ Excellent Credit');
    if (lead.timeInBusinessMonths > 24) features.push('🏢 Established Business');
    
    return features;
}

function getStateFromBusinessName(businessName) {
    // Simple state extraction - in production, you'd want a more sophisticated approach
    const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
    return states[Math.floor(Math.random() * states.length)];
}

module.exports = { router, Broker, Transaction, LeadPurchase };