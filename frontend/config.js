// Fidenta.io Configuration
const config = {
    // Domain configuration
    domain: 'fidenta.io',
    
    // API endpoints based on environment
    getApiUrl: function() {
        // Check if running locally
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        // Production API (will be updated once backend is deployed to custom domain)
        return 'https://api.fidenta.io';
    },
    
    // Frontend URL
    getFrontendUrl: function() {
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8080';
        }
        return 'https://fidenta.io';
    },
    
    // Temporary Vercel backend (until we set up api.fidenta.io)
    tempBackendUrl: 'https://backend-onttc7h2s-yacovs-projects-7233b556.vercel.app',
    
    // Business information
    businessName: 'Fidenta',
    tagline: 'Smart Business Funding Solutions',
    supportEmail: 'support@fidenta.io',
    
    // Features
    features: {
        goHighLevel: false, // Will enable when API keys are added
        stripe: false,      // Will enable when Stripe is configured
        emailNotifications: false // Will enable when SMTP is configured
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}