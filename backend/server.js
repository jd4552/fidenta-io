const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');

// Load environment variables
dotenv.config();

// Import CRM integration
const { sendToGoHighLevel, sendToCRM } = require('./crm-integration');

// Create Express app
const app = express();

// Middleware - Simplified CORS for testing
app.use(cors({
    origin: '*', // Allow all origins temporarily for testing
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/documents/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and documents are allowed'));
        }
    }
});

// Email configuration - Make it optional to prevent crashes
let emailTransporter = null;
try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        emailTransporter = nodemailer.createTransporter({
            service: 'gmail', // or your email service
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        console.log('Email transporter configured successfully');
    } else {
        console.log('Email credentials not configured - email notifications disabled');
    }
} catch (error) {
    console.error('Failed to configure email transporter:', error);
    // Continue without email functionality
}

// JWT middleware for authentication
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'autopal-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Basic route to test server
app.get('/', (req, res) => {
    res.json({ 
        message: 'Fidenta Lead Generation API',
        status: 'Running',
        timestamp: new Date().toISOString()
    });
});

// Lead Schema
const leadSchema = new mongoose.Schema({
    // Business Information
    businessName: { type: String, required: true },
    dba: String,
    entityType: String,
    taxId: String,
    
    // Contact Information
    contactName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    alternatePhone: String,
    
    // Business Details
    industry: String,
    yearEstablished: Number,
    monthsInBusiness: Number,
    annualRevenue: Number,
    monthlyRevenue: Number,
    numberOfEmployees: Number,
    
    // Location
    address: String,
    city: String,
    state: String,
    zipCode: String,
    
    // Funding Information
    loanAmount: { type: Number, required: true },
    loanPurpose: String,
    urgency: String,
    
    // Financial Information
    creditScore: Number,
    bankruptcyHistory: Boolean,
    existingLoans: Boolean,
    monthlyDebtPayments: Number,
    
    // Documents
    bankStatementsUploaded: { type: Boolean, default: false },
    taxReturnsUploaded: { type: Boolean, default: false },
    
    // Lead Scoring
    leadScore: { type: Number, default: 0 },
    leadGrade: String,
    scoringTier: String,
    
    // Marketplace fields
    marketplaceVisible: { type: Boolean, default: true },
    isExclusive: { type: Boolean, default: false },
    purchaseCount: { type: Number, default: 0 },
    maxPurchases: { type: Number, default: 5 },
    
    // Tracking
    source: String,
    ipAddress: String,
    userAgent: String,
    
    // GoHighLevel Integration
    ghlContactId: String,
    ghlOpportunityId: String,
    ghlSyncStatus: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
    ghlLastSyncedAt: Date,
    ghlTags: [String],
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Create Lead model
const Lead = mongoose.model('Lead', leadSchema);

// AUTOPAL Credit Application Schema
const creditApplicationSchema = new mongoose.Schema({
    // Personal Information
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    dateOfBirth: Date,
    ssn: String, // Encrypted in production
    
    // Address Information
    address: String,
    city: String,
    state: String,
    zipCode: String,
    monthsAtAddress: Number,
    
    // Employment Information
    employerName: String,
    jobTitle: String,
    employmentLength: Number, // in months
    monthlyIncome: Number,
    annualIncome: Number,
    additionalIncome: Number,
    
    // Vehicle Information
    vehicleOfInterest: {
        make: String,
        model: String,
        year: Number,
        trim: String,
        vin: String,
        msrp: Number,
        leaseTermPreference: Number, // 24, 36, 48 months
        mileagePreference: Number, // 10k, 12k, 15k
        downPayment: Number
    },
    
    // Credit Information
    creditScore: Number,
    bankruptcyHistory: Boolean,
    repoHistory: Boolean,
    currentAutoLoan: Boolean,
    currentMonthlyPayment: Number,
    
    // References
    references: [{
        name: String,
        relationship: String,
        phone: String
    }],
    
    // Application Status
    status: { 
        type: String, 
        enum: ['new', 'reviewing', 'approved', 'conditional', 'declined', 'completed'], 
        default: 'new' 
    },
    creditPulled: { type: Boolean, default: false },
    creditScore: Number,
    approvedTerms: {
        monthlyPayment: Number,
        downPayment: Number,
        term: Number,
        apr: Number,
        approvedAt: Date
    },
    
    // Notes and Communications
    notes: [{
        note: String,
        addedBy: String,
        addedAt: { type: Date, default: Date.now }
    }],
    
    // Tracking
    source: { type: String, default: 'autopal-website' },
    ipAddress: String,
    userAgent: String,
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Add client portal fields to credit application schema
creditApplicationSchema.add({
    // Client Portal Authentication
    clientPortalPassword: String, // Hashed password for client login
    clientPortalActive: { type: Boolean, default: false },
    clientLastLogin: Date,
    
    // Document Management
    requiredDocuments: [{
        name: String, // e.g., "Driver's License", "Pay Stubs", "Bank Statements"
        description: String,
        required: { type: Boolean, default: true },
        uploaded: { type: Boolean, default: false },
        filename: String,
        uploadedAt: Date,
        status: { type: String, enum: ['pending', 'uploaded', 'approved', 'rejected'], default: 'pending' },
        rejectionReason: String
    }],
    
    // Application Progress Tracking
    progressSteps: [{
        step: String, // e.g., "Application Submitted", "Documents Required", "Credit Check", "Approved", "Vehicle Delivery"
        status: { type: String, enum: ['pending', 'current', 'completed'], default: 'pending' },
        completedAt: Date,
        description: String
    }],
    
    // Delivery Tracking
    deliveryInfo: {
        scheduledDate: Date,
        timeWindow: String, // e.g., "10AM-12PM"
        address: String,
        status: { type: String, enum: ['pending', 'scheduled', 'in_transit', 'delivered'], default: 'pending' },
        trackingNumber: String,
        deliveredAt: Date,
        deliveryNotes: String
    },
    
    // Communication History
    communications: [{
        type: { type: String, enum: ['email', 'sms', 'call', 'system'], default: 'system' },
        subject: String,
        message: String,
        sentAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['sent', 'delivered', 'failed'], default: 'sent' }
    }],
    
    // Lease Information (for renewals and marketing)
    leaseInfo: {
        startDate: Date,
        endDate: Date,
        monthlyPayment: Number,
        mileageAllowance: Number,
        currentMileage: Number,
        renewalNotificationSent: { type: Boolean, default: false },
        renewalReminderDate: Date
    }
});

// Create Credit Application model
const CreditApplication = mongoose.model('CreditApplication', creditApplicationSchema);

// API Routes

// Create a new lead
app.post('/api/leads', async (req, res) => {
    try {
        // Ensure DB is connected
        await connectDB();
        
        // Calculate lead score based on criteria
        const leadData = req.body;
        leadData.leadScore = calculateLeadScore(leadData);
        leadData.leadGrade = getLeadGrade(leadData.leadScore);
        leadData.scoringTier = getScoringTier(leadData.leadScore);
        
        const lead = new Lead(leadData);
        await lead.save();
        
        // Send to GoHighLevel if configured
        if (process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID) {
            try {
                await sendToGoHighLevel(lead);
                console.log('✅ Lead sent to GoHighLevel');
            } catch (ghlError) {
                console.error('⚠️ GHL sync failed (lead still saved):', ghlError);
                // Don't fail the request if GHL fails - lead is already saved
            }
        }
        
        res.status(201).json({
            success: true,
            message: 'Lead created successfully',
            lead: lead
        });
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(400).json({
            success: false,
            message: 'Error creating lead',
            error: error.message
        });
    }
});

// Get all leads (for internal dashboard)
app.get('/api/leads', async (req, res) => {
    try {
        // Ensure DB is connected
        await connectDB();
        
        const leads = await Lead.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: leads.length,
            leads: leads
        });
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leads - DB connection issue',
            error: error.message,
            details: process.env.NODE_ENV === 'production' ? 'Database connection error' : error.message
        });
    }
});

// Get marketplace leads (anonymized for brokers)
app.get('/api/marketplace/leads', async (req, res) => {
    try {
        const leads = await Lead.find({
            marketplaceVisible: true,
            purchaseCount: { $lt: mongoose.path('maxPurchases') }
        })
        .select('-businessName -contactName -email -phone -taxId -address')
        .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: leads.length,
            leads: leads
        });
    } catch (error) {
        console.error('Error fetching marketplace leads:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching marketplace leads',
            error: error.message
        });
    }
});

// AUTOPAL Credit Application endpoints

// Create a new credit application
app.post('/api/credit-applications', async (req, res) => {
    try {
        // Ensure DB is connected
        await connectDB();
        
        const applicationData = req.body;
        
        // Add tracking info
        applicationData.ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        applicationData.userAgent = req.headers['user-agent'];
        applicationData.updatedAt = new Date();
        
        const application = new CreditApplication(applicationData);
        await application.save();
        
        // Initialize default required documents and progress steps
        await initializeApplicationDefaults(application._id);
        
        // Send welcome email with portal access
        await sendWelcomeEmail(application);
        
        res.status(201).json({
            success: true,
            message: 'Credit application submitted successfully',
            applicationId: application._id,
            status: application.status
        });
    } catch (error) {
        console.error('Error creating credit application:', error);
        res.status(400).json({
            success: false,
            message: 'Error submitting credit application',
            error: error.message
        });
    }
});

// Get all credit applications (admin dashboard)
app.get('/api/credit-applications', async (req, res) => {
    try {
        await connectDB();
        
        const { status, limit = 50, page = 1 } = req.query;
        const skip = (page - 1) * limit;
        
        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        
        const applications = await CreditApplication.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);
            
        const total = await CreditApplication.countDocuments(query);
        
        res.json({
            success: true,
            count: applications.length,
            total: total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            applications: applications
        });
    } catch (error) {
        console.error('Error fetching credit applications:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching credit applications',
            error: error.message
        });
    }
});

// Get single credit application
app.get('/api/credit-applications/:id', async (req, res) => {
    try {
        await connectDB();
        
        const application = await CreditApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Credit application not found'
            });
        }
        
        res.json({
            success: true,
            application: application
        });
    } catch (error) {
        console.error('Error fetching credit application:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching credit application',
            error: error.message
        });
    }
});

// Update credit application status
app.put('/api/credit-applications/:id/status', async (req, res) => {
    try {
        await connectDB();
        
        const { status, note, addedBy } = req.body;
        
        const updateData = {
            status: status,
            updatedAt: new Date()
        };
        
        // Add note if provided
        const application = await CreditApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Credit application not found'
            });
        }
        
        if (note) {
            application.notes.push({
                note: note,
                addedBy: addedBy || 'Admin',
                addedAt: new Date()
            });
        }
        
        Object.assign(application, updateData);
        await application.save();
        
        res.json({
            success: true,
            message: 'Application status updated successfully',
            application: application
        });
    } catch (error) {
        console.error('Error updating credit application:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating credit application',
            error: error.message
        });
    }
});

// Add note to credit application
app.post('/api/credit-applications/:id/notes', async (req, res) => {
    try {
        await connectDB();
        
        const { note, addedBy } = req.body;
        
        const application = await CreditApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Credit application not found'
            });
        }
        
        application.notes.push({
            note: note,
            addedBy: addedBy || 'Admin',
            addedAt: new Date()
        });
        
        application.updatedAt = new Date();
        await application.save();
        
        res.json({
            success: true,
            message: 'Note added successfully',
            application: application
        });
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding note',
            error: error.message
        });
    }
});

// CLIENT PORTAL ENDPOINTS

// Client portal setup - generate password for application
app.post('/api/client-portal/setup', async (req, res) => {
    try {
        await connectDB();
        
        const { applicationId, email, temporaryPassword } = req.body;
        
        const application = await CreditApplication.findById(applicationId);
        if (!application || application.email !== email) {
            return res.status(404).json({
                success: false,
                message: 'Application not found or email mismatch'
            });
        }
        
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
        application.clientPortalPassword = hashedPassword;
        application.clientPortalActive = true;
        await application.save();
        
        res.json({
            success: true,
            message: 'Client portal access enabled'
        });
    } catch (error) {
        console.error('Error setting up client portal:', error);
        res.status(500).json({
            success: false,
            message: 'Error setting up client portal',
            error: error.message
        });
    }
});

// Client login
app.post('/api/client-portal/login', async (req, res) => {
    try {
        await connectDB();
        
        const { email, password, applicationId } = req.body;
        
        const application = await CreditApplication.findOne({
            $or: [
                { email: email },
                { _id: applicationId }
            ]
        });
        
        if (!application || !application.clientPortalActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials or portal not active'
            });
        }
        
        const isValidPassword = await bcrypt.compare(password, application.clientPortalPassword);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Update last login
        application.clientLastLogin = new Date();
        await application.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                applicationId: application._id, 
                email: application.email,
                role: 'client'
            },
            process.env.JWT_SECRET || 'autopal-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token: token,
            applicationId: application._id,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Error during client login:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
});

// Client dashboard - get application details and progress
app.get('/api/client-portal/dashboard', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        
        const application = await CreditApplication.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        
        // Return sanitized application data (no SSN, admin notes, etc.)
        const clientData = {
            applicationId: application._id,
            status: application.status,
            firstName: application.firstName,
            lastName: application.lastName,
            email: application.email,
            createdAt: application.createdAt,
            vehicleOfInterest: application.vehicleOfInterest,
            requiredDocuments: application.requiredDocuments,
            progressSteps: application.progressSteps,
            deliveryInfo: application.deliveryInfo,
            communications: application.communications.filter(comm => comm.type !== 'system' || !comm.internal),
            leaseInfo: application.leaseInfo
        };
        
        res.json({
            success: true,
            application: clientData
        });
    } catch (error) {
        console.error('Error loading client dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading dashboard',
            error: error.message
        });
    }
});

// Document upload
app.post('/api/client-portal/upload-document', authenticateToken, upload.single('document'), async (req, res) => {
    try {
        await connectDB();
        
        const { documentType, description } = req.body;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        
        const application = await CreditApplication.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        
        // Find the required document and update it
        const docIndex = application.requiredDocuments.findIndex(doc => doc.name === documentType);
        if (docIndex === -1) {
            return res.status(400).json({
                success: false,
                message: 'Document type not found in requirements'
            });
        }
        
        application.requiredDocuments[docIndex].uploaded = true;
        application.requiredDocuments[docIndex].filename = file.filename;
        application.requiredDocuments[docIndex].uploadedAt = new Date();
        application.requiredDocuments[docIndex].status = 'uploaded';
        
        await application.save();
        
        // Check if all required documents are uploaded
        const allRequiredUploaded = application.requiredDocuments
            .filter(doc => doc.required)
            .every(doc => doc.uploaded);
        
        if (allRequiredUploaded) {
            await updateApplicationProgress(application._id, 'Documents Submitted');
            await sendAdminNotification(application._id, 'All required documents uploaded');
        }
        
        res.json({
            success: true,
            message: 'Document uploaded successfully',
            filename: file.filename
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading document',
            error: error.message
        });
    }
});

// Get missing documents notification
app.get('/api/client-portal/missing-documents', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        
        const application = await CreditApplication.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        
        const missingDocuments = application.requiredDocuments.filter(doc => 
            doc.required && !doc.uploaded
        );
        
        res.json({
            success: true,
            missingDocuments: missingDocuments,
            hasIncompleteDocuments: missingDocuments.length > 0
        });
    } catch (error) {
        console.error('Error checking missing documents:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking documents',
            error: error.message
        });
    }
});

// Update delivery preferences
app.post('/api/client-portal/delivery-preferences', authenticateToken, async (req, res) => {
    try {
        await connectDB();
        
        const { preferredDate, timeWindow, address } = req.body;
        
        const application = await CreditApplication.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        
        if (!application.deliveryInfo) {
            application.deliveryInfo = {};
        }
        
        application.deliveryInfo.scheduledDate = new Date(preferredDate);
        application.deliveryInfo.timeWindow = timeWindow;
        application.deliveryInfo.address = address || application.address;
        
        await application.save();
        
        // Notify admin of delivery preference update
        await sendAdminNotification(application._id, 'Client updated delivery preferences');
        
        res.json({
            success: true,
            message: 'Delivery preferences updated successfully'
        });
    } catch (error) {
        console.error('Error updating delivery preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating preferences',
            error: error.message
        });
    }
});

// GoHighLevel webhook endpoint
app.post('/api/webhooks/gohighlevel', async (req, res) => {
    try {
        const webhookData = req.body;
        
        // Log webhook event
        console.log('📥 GHL Webhook received:', webhookData.type || 'Unknown event');
        
        // Handle different webhook events
        switch (webhookData.type) {
            case 'ContactCreate':
            case 'ContactUpdate':
                // Update lead status in our database if needed
                if (webhookData.email) {
                    await Lead.findOneAndUpdate(
                        { email: webhookData.email },
                        { 
                            ghlContactId: webhookData.id,
                            ghlSyncStatus: 'synced',
                            updatedAt: new Date()
                        }
                    );
                }
                break;
            
            case 'OpportunityStatusUpdate':
                // Track opportunity progress
                console.log('Opportunity updated:', webhookData);
                break;
                
            default:
                console.log('Unhandled webhook type:', webhookData.type);
        }
        
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('GHL webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Lead scoring function
function calculateLeadScore(lead) {
    let score = 50; // Base score
    
    // Credit score impact (0-30 points)
    if (lead.creditScore >= 750) score += 30;
    else if (lead.creditScore >= 700) score += 25;
    else if (lead.creditScore >= 650) score += 20;
    else if (lead.creditScore >= 600) score += 10;
    else if (lead.creditScore >= 550) score += 5;
    
    // Annual revenue impact (0-20 points)
    if (lead.annualRevenue >= 1000000) score += 20;
    else if (lead.annualRevenue >= 500000) score += 15;
    else if (lead.annualRevenue >= 250000) score += 10;
    else if (lead.annualRevenue >= 100000) score += 5;
    
    // Time in business (0-15 points)
    if (lead.monthsInBusiness >= 60) score += 15;
    else if (lead.monthsInBusiness >= 36) score += 10;
    else if (lead.monthsInBusiness >= 24) score += 7;
    else if (lead.monthsInBusiness >= 12) score += 3;
    
    // Documents uploaded (0-15 points)
    if (lead.bankStatementsUploaded) score += 8;
    if (lead.taxReturnsUploaded) score += 7;
    
    // Urgency (affects value, not quality)
    if (lead.urgency === 'immediate') score += 5;
    else if (lead.urgency === 'week') score += 3;
    
    return Math.min(100, Math.max(0, score));
}

function getLeadGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C+';
    if (score >= 40) return 'C';
    return 'D';
}

function getScoringTier(score) {
    if (score >= 90) return 'PLATINUM';
    if (score >= 80) return 'GOLD';
    if (score >= 70) return 'SILVER';
    if (score >= 60) return 'BRONZE';
    if (score >= 40) return 'STANDARD';
    return 'BASIC';
}

// Database connection
let dbConnected = false;
const connectDB = async () => {
    try {
        if (!dbConnected && process.env.MONGODB_URI) {
            await mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
                connectTimeoutMS: 10000,
            });
            dbConnected = true;
            console.log('✅ MongoDB connected successfully');
        } else if (!process.env.MONGODB_URI) {
            console.warn('⚠️ MONGODB_URI not configured - database features disabled');
        }
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        // Don't exit or throw - just log the error
    }
};

// Initialize MongoDB connection on first request (for serverless)
if (process.env.VERCEL) {
    console.log('Running in Vercel serverless environment');
}

// HELPER FUNCTIONS

// Initialize default documents and progress steps for new applications
async function initializeApplicationDefaults(applicationId) {
    try {
        const application = await CreditApplication.findById(applicationId);
        if (!application) return;
        
        // Default required documents
        const defaultDocuments = [
            { name: "Driver's License", description: "Front and back of valid driver's license", required: true },
            { name: "Pay Stubs", description: "Last 2 pay stubs", required: true },
            { name: "Bank Statements", description: "Last 3 months bank statements", required: true },
            { name: "Proof of Insurance", description: "Current auto insurance policy", required: true },
            { name: "Utility Bill", description: "Recent utility bill for address verification", required: false }
        ];
        
        // Default progress steps
        const defaultSteps = [
            { step: "Application Submitted", status: "completed", completedAt: new Date(), description: "Your application has been received" },
            { step: "Documents Required", status: "current", description: "Please upload required documents" },
            { step: "Credit Check", status: "pending", description: "We'll run a credit check once documents are received" },
            { step: "Approval Decision", status: "pending", description: "Final approval decision" },
            { step: "Vehicle Preparation", status: "pending", description: "Your vehicle is being prepared" },
            { step: "Delivery Scheduled", status: "pending", description: "Coordinate delivery details" },
            { step: "Vehicle Delivered", status: "pending", description: "Your vehicle will be delivered to you" }
        ];
        
        application.requiredDocuments = defaultDocuments;
        application.progressSteps = defaultSteps;
        await application.save();
        
    } catch (error) {
        console.error('Error initializing application defaults:', error);
    }
}

// Update application progress
async function updateApplicationProgress(applicationId, stepName) {
    try {
        const application = await CreditApplication.findById(applicationId);
        if (!application) return;
        
        const stepIndex = application.progressSteps.findIndex(step => step.step === stepName);
        if (stepIndex === -1) return;
        
        // Mark current step as completed and move to next
        application.progressSteps[stepIndex].status = 'completed';
        application.progressSteps[stepIndex].completedAt = new Date();
        
        // Mark next step as current
        if (stepIndex + 1 < application.progressSteps.length) {
            application.progressSteps[stepIndex + 1].status = 'current';
        }
        
        await application.save();
        
        // Send progress update email to client
        await sendProgressUpdateEmail(application, stepName);
        
    } catch (error) {
        console.error('Error updating application progress:', error);
    }
}

// Send welcome email with portal access
async function sendWelcomeEmail(application) {
    try {
        if (!process.env.EMAIL_USER) return;
        
        // Generate temporary password (client will be asked to change it)
        const tempPassword = Math.random().toString(36).slice(-8);
        
        // Setup portal access
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        application.clientPortalPassword = hashedPassword;
        application.clientPortalActive = true;
        await application.save();
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: application.email,
            subject: 'Welcome to AUTOPAL - Your Application Portal Access',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #000; color: white; padding: 20px; text-align: center;">
                        <h1>AUTOPAL</h1>
                        <h2>Welcome to Your Client Portal</h2>
                    </div>
                    
                    <div style="padding: 30px;">
                        <p>Dear ${application.firstName},</p>
                        
                        <p>Thank you for submitting your lease application! Your application has been received and assigned reference number: <strong>#APL${application._id.slice(-6).toUpperCase()}</strong></p>
                        
                        <p>We've created a secure client portal where you can:</p>
                        <ul>
                            <li>Track your application progress</li>
                            <li>Upload required documents</li>
                            <li>View delivery status</li>
                            <li>Communicate with our team</li>
                        </ul>
                        
                        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3>Your Portal Access:</h3>
                            <p><strong>Email:</strong> ${application.email}</p>
                            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                            <p><strong>Portal URL:</strong> <a href="https://autopal.com/client-portal">https://autopal.com/client-portal</a></p>
                        </div>
                        
                        <p style="color: #dc2626;"><strong>Important:</strong> Please change your password after first login for security.</p>
                        
                        <p>Our team will review your application and contact you within 24 hours. In the meantime, please log into your portal and upload the required documents to speed up the process.</p>
                        
                        <p>If you have any questions, please don't hesitate to contact us at (954) 987-2277.</p>
                        
                        <p>Best regards,<br>The AUTOPAL Team</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6b7280;">
                        <p>2401 Stirling Road, Suite 208, Fort Lauderdale, FL 33312</p>
                        <p>(954) 987-2277 | info@autopal.com</p>
                    </div>
                </div>
            `
        };
        
        if (emailTransporter) {
            await emailTransporter.sendMail(mailOptions);
        } else {
            console.log('Email transporter not configured - skipping email notification');
        }
        
        // Log communication
        application.communications.push({
            type: 'email',
            subject: 'Welcome to AUTOPAL - Portal Access',
            message: 'Welcome email sent with portal access credentials',
            sentAt: new Date(),
            status: 'sent'
        });
        await application.save();
        
    } catch (error) {
        console.error('Error sending welcome email:', error);
    }
}

// Send progress update email
async function sendProgressUpdateEmail(application, stepName) {
    try {
        if (!process.env.EMAIL_USER) return;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: application.email,
            subject: `AUTOPAL Update: ${stepName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #000; color: white; padding: 20px; text-align: center;">
                        <h1>AUTOPAL</h1>
                        <h2>Application Progress Update</h2>
                    </div>
                    
                    <div style="padding: 30px;">
                        <p>Dear ${application.firstName},</p>
                        
                        <p>Great news! Your application (#APL${application._id.slice(-6).toUpperCase()}) has progressed to: <strong>${stepName}</strong></p>
                        
                        <p>Log into your client portal to see the latest updates and check if any additional actions are required from you.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://autopal.com/client-portal" style="background: #0066ff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Portal</a>
                        </div>
                        
                        <p>If you have any questions, please contact us at (954) 987-2277.</p>
                        
                        <p>Best regards,<br>The AUTOPAL Team</p>
                    </div>
                </div>
            `
        };
        
        if (emailTransporter) {
            await emailTransporter.sendMail(mailOptions);
        } else {
            console.log('Email transporter not configured - skipping email notification');
        }
        
        // Log communication
        application.communications.push({
            type: 'email',
            subject: `Progress Update: ${stepName}`,
            message: `Application progressed to ${stepName}`,
            sentAt: new Date(),
            status: 'sent'
        });
        await application.save();
        
    } catch (error) {
        console.error('Error sending progress update email:', error);
    }
}

// Send admin notification
async function sendAdminNotification(applicationId, message) {
    try {
        if (!process.env.ADMIN_EMAIL) return;
        
        const application = await CreditApplication.findById(applicationId);
        if (!application) return;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `AUTOPAL Admin Alert: ${message}`,
            html: `
                <h2>Application Update</h2>
                <p><strong>Application:</strong> #APL${application._id.slice(-6).toUpperCase()}</p>
                <p><strong>Client:</strong> ${application.firstName} ${application.lastName}</p>
                <p><strong>Email:</strong> ${application.email}</p>
                <p><strong>Alert:</strong> ${message}</p>
                
                <p><a href="https://autopal.com/admin-dashboard">View in Admin Dashboard</a></p>
            `
        };
        
        if (emailTransporter) {
            await emailTransporter.sendMail(mailOptions);
        } else {
            console.log('Email transporter not configured - skipping email notification');
        }
        
    } catch (error) {
        console.error('Error sending admin notification:', error);
    }
}

// Lease renewal reminder system (run via cron job)
async function checkLeaseRenewals() {
    try {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        const applications = await CreditApplication.find({
            'leaseInfo.endDate': { $lte: thirtyDaysFromNow },
            'leaseInfo.renewalNotificationSent': false,
            status: 'completed'
        });
        
        for (const application of applications) {
            await sendLeaseRenewalEmail(application);
            application.leaseInfo.renewalNotificationSent = true;
            await application.save();
        }
        
    } catch (error) {
        console.error('Error checking lease renewals:', error);
    }
}

// Send lease renewal email
async function sendLeaseRenewalEmail(application) {
    try {
        if (!process.env.EMAIL_USER) return;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: application.email,
            subject: 'Your AUTOPAL lease is expiring soon - Renewal options available',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #000; color: white; padding: 20px; text-align: center;">
                        <h1>AUTOPAL</h1>
                        <h2>Lease Renewal Opportunity</h2>
                    </div>
                    
                    <div style="padding: 30px;">
                        <p>Dear ${application.firstName},</p>
                        
                        <p>Your current lease is expiring soon! We'd love to help you with your next vehicle.</p>
                        
                        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3>Current Lease Details:</h3>
                            <p><strong>Vehicle:</strong> ${application.vehicleOfInterest?.year} ${application.vehicleOfInterest?.make} ${application.vehicleOfInterest?.model}</p>
                            <p><strong>Lease End Date:</strong> ${application.leaseInfo?.endDate ? new Date(application.leaseInfo.endDate).toLocaleDateString() : 'N/A'}</p>
                            <p><strong>Current Payment:</strong> $${application.leaseInfo?.monthlyPayment || 'N/A'}/month</p>
                        </div>
                        
                        <p>🎉 <strong>Special Renewal Offer:</strong> Returning customers get priority access to our best deals!</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://autopal.com/renewal?ref=${application._id}" style="background: #0066ff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">View New Vehicles</a>
                            <a href="https://autopal.com/client-portal" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">Client Portal</a>
                        </div>
                        
                        <p>Contact us at (954) 987-2277 to discuss your renewal options or browse our latest inventory online.</p>
                        
                        <p>Best regards,<br>The AUTOPAL Team</p>
                    </div>
                </div>
            `
        };
        
        if (emailTransporter) {
            await emailTransporter.sendMail(mailOptions);
        } else {
            console.log('Email transporter not configured - skipping email notification');
        }
        
    } catch (error) {
        console.error('Error sending lease renewal email:', error);
    }
}

// API endpoint to manually trigger lease renewal check (for admin)
app.post('/api/admin/check-lease-renewals', async (req, res) => {
    try {
        await checkLeaseRenewals();
        res.json({ success: true, message: 'Lease renewal check completed' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error checking renewals', error: error.message });
    }
});

// Export for Vercel serverless
module.exports = app;

// Start server only for local development
if (!process.env.VERCEL && require.main === module) {
    const PORT = process.env.PORT || 3000;
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }).catch(err => {
        console.error('Failed to start server:', err);
    });
}