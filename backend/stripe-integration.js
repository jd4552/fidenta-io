// Stripe Integration for Lead Marketplace
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require('express');
const { Broker, Transaction } = require('./marketplace-routes');

const router = express.Router();

// Middleware for broker authentication (reuse from marketplace-routes)
const jwt = require('jsonwebtoken');
const authenticateBroker = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        const broker = await Broker.findById(decoded.brokerId);
        
        if (!broker || broker.status !== 'active') {
            return res.status(401).json({ error: 'Invalid token or inactive account.' });
        }
        
        req.broker = broker;
        next();
        
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

// Create payment intent for lead purchase
router.post('/create-payment-intent', authenticateBroker, async (req, res) => {
    try {
        const { leadId, amount } = req.body; // amount in cents
        const broker = req.broker;
        
        if (!leadId || !amount || amount < 50) { // Minimum 50 cents
            return res.status(400).json({ error: 'Invalid lead or amount' });
        }
        
        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount), // Ensure integer
            currency: 'usd',
            metadata: {
                leadId: leadId,
                brokerId: broker._id.toString(),
                type: 'lead_purchase'
            },
            description: `Lead purchase - Broker: ${broker.companyName}`,
            // Add customer if you have Stripe customer IDs
        });
        
        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
        
    } catch (error) {
        console.error('Payment intent creation error:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
});

// Create payment intent for adding credits
router.post('/create-credits-payment-intent', authenticateBroker, async (req, res) => {
    try {
        const { amount } = req.body; // amount in cents
        const broker = req.broker;
        
        if (!amount || amount < 1000) { // Minimum $10
            return res.status(400).json({ error: 'Minimum credit purchase is $10' });
        }
        
        // Calculate bonus credits
        const bonusAmount = calculateBonusCredits(amount / 100); // Convert to dollars
        
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount),
            currency: 'usd',
            metadata: {
                brokerId: broker._id.toString(),
                type: 'credit_purchase',
                baseAmount: (amount / 100).toString(),
                bonusAmount: bonusAmount.toString()
            },
            description: `Credit purchase - Broker: ${broker.companyName} - $${amount/100} + $${bonusAmount} bonus`,
        });
        
        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            bonusAmount: bonusAmount
        });
        
    } catch (error) {
        console.error('Credits payment intent error:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
});

// Confirm lead purchase after successful payment
router.post('/confirm-purchase', authenticateBroker, async (req, res) => {
    try {
        const { leadId, paymentIntentId } = req.body;
        const broker = req.broker;
        
        // Verify payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ error: 'Payment not completed' });
        }
        
        if (paymentIntent.metadata.leadId !== leadId || 
            paymentIntent.metadata.brokerId !== broker._id.toString()) {
            return res.status(400).json({ error: 'Payment validation failed' });
        }
        
        // Process the purchase (similar to credit purchase logic)
        const mongoose = require('mongoose');
        const Lead = mongoose.model('Lead');
        const LeadPurchase = mongoose.model('LeadPurchase');
        
        const lead = await Lead.findById(leadId);
        if (!lead || lead.status !== 'new') {
            return res.status(400).json({ error: 'Lead no longer available' });
        }
        
        const price = paymentIntent.amount / 100; // Convert from cents
        
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
            paymentMethod: 'stripe',
            paymentId: paymentIntentId,
            status: 'completed',
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
        
        // Update broker stats
        broker.totalPurchases += 1;
        broker.totalSpent += price;
        await broker.save();
        
        // Update lead status
        lead.status = 'routed';
        lead.routedTo.push({
            partner: `broker-${broker._id}`,
            timestamp: new Date(),
            status: 'sold',
            response: 'Purchased via marketplace (Stripe)'
        });
        
        await lead.save();
        
        res.json({
            success: true,
            message: 'Lead purchased successfully',
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
        console.error('Purchase confirmation error:', error);
        res.status(500).json({ error: 'Failed to confirm purchase' });
    }
});

// Confirm credit purchase after successful payment
router.post('/confirm-credits', authenticateBroker, async (req, res) => {
    try {
        const { paymentIntentId } = req.body;
        const broker = req.broker;
        
        // Verify payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ error: 'Payment not completed' });
        }
        
        if (paymentIntent.metadata.brokerId !== broker._id.toString() ||
            paymentIntent.metadata.type !== 'credit_purchase') {
            return res.status(400).json({ error: 'Payment validation failed' });
        }
        
        const baseAmount = parseFloat(paymentIntent.metadata.baseAmount);
        const bonusAmount = parseFloat(paymentIntent.metadata.bonusAmount);
        const totalCredits = baseAmount + bonusAmount;
        
        // Add credits to broker account
        broker.balance += totalCredits;
        await broker.save();
        
        // Create transaction record
        const transaction = new Transaction({
            brokerId: broker._id,
            type: 'credit',
            amount: totalCredits,
            description: `Credit purchase - $${baseAmount} + $${bonusAmount} bonus`,
            paymentMethod: 'stripe',
            paymentId: paymentIntentId,
            status: 'completed',
            processedAt: new Date()
        });
        
        await transaction.save();
        
        res.json({
            success: true,
            message: 'Credits added successfully',
            newBalance: broker.balance,
            creditsAdded: totalCredits,
            bonusReceived: bonusAmount,
            transactionId: transaction._id
        });
        
    } catch (error) {
        console.error('Credits confirmation error:', error);
        res.status(500).json({ error: 'Failed to confirm credit purchase' });
    }
});

// Get transaction history
router.get('/transactions', authenticateBroker, async (req, res) => {
    try {
        const broker = req.broker;
        const { page = 1, limit = 20, type } = req.query;
        
        const query = { brokerId: broker._id };
        if (type) query.type = type;
        
        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * page)
            .select('-paymentId'); // Don't expose payment IDs
        
        res.json({
            transactions: transactions.map(t => ({
                id: t._id,
                type: t.type,
                amount: t.amount,
                description: t.description,
                status: t.status,
                createdAt: t.createdAt,
                processedAt: t.processedAt,
                leadData: t.leadData
            })),
            currentPage: page,
            hasMore: transactions.length === limit
        });
        
    } catch (error) {
        console.error('Transaction history error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                await handleSuccessfulPayment(paymentIntent);
                break;
                
            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                await handleFailedPayment(failedPayment);
                break;
                
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
        
        res.json({ received: true });
        
    } catch (error) {
        console.error('Webhook handling error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Helper functions
function calculateBonusCredits(amount) {
    // Bonus credit structure
    if (amount >= 1000) return 200;      // $1000+ gets $200 bonus
    if (amount >= 500) return 75;        // $500+ gets $75 bonus
    if (amount >= 250) return 30;        // $250+ gets $30 bonus
    if (amount >= 100) return 10;        // $100+ gets $10 bonus
    return 0;
}

async function handleSuccessfulPayment(paymentIntent) {
    try {
        const { brokerId, type } = paymentIntent.metadata;
        
        if (type === 'credit_purchase') {
            // Credits are handled via confirm-credits endpoint
            console.log('Credit purchase completed:', paymentIntent.id);
        } else if (type === 'lead_purchase') {
            // Lead purchases are handled via confirm-purchase endpoint
            console.log('Lead purchase completed:', paymentIntent.id);
        }
        
        // Could add additional logging or notifications here
        
    } catch (error) {
        console.error('Error handling successful payment:', error);
    }
}

async function handleFailedPayment(paymentIntent) {
    try {
        const { brokerId, type } = paymentIntent.metadata;
        
        // Log failed payment
        console.log('Payment failed:', {
            paymentIntentId: paymentIntent.id,
            brokerId,
            type,
            amount: paymentIntent.amount / 100
        });
        
        // Could add notification to broker about failed payment
        
    } catch (error) {
        console.error('Error handling failed payment:', error);
    }
}

module.exports = router;