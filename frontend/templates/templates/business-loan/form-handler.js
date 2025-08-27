// Fidenta.io deployment pending: API will move to https://backend-three-omega-83.vercel.app
// Form Handler - Connects the lead form to the backend API
document.addEventListener('DOMContentLoaded', function() {
    console.log('Form handler loaded');
    
    // Configuration
    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api/leads'
        : 'https://backend-three-omega-83.vercel.app/api/leads';
    
    // Find the form
    const form = document.getElementById('leadForm') || document.querySelector('form');
    
    if (!form) {
        console.error('No form found on page');
        return;
    }
    
    console.log('Form found, attaching submit handler');
    
    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Form submitted');
        
        // Get form data
        const formData = new FormData(form);
        const leadData = {};
        
        // Convert FormData to object
        for (let [key, value] of formData.entries()) {
            // Convert number fields
            if (['annualRevenue', 'monthlyRevenue', 'loanAmount', 'creditScore', 'monthsInBusiness', 'numberOfEmployees'].includes(key)) {
                leadData[key] = parseInt(value) || 0;
            } else {
                leadData[key] = value;
            }
        }
        
        // Add default values for required fields if missing
        leadData.businessName = leadData.businessName || 'Test Business';
        leadData.contactName = leadData.contactName || leadData.firstName + ' ' + leadData.lastName || 'Test Contact';
        leadData.email = leadData.email || 'test@example.com';
        leadData.phone = leadData.phone || '555-0100';
        leadData.loanAmount = leadData.loanAmount || leadData.fundingAmount || 50000;
        
        // Add calculated fields
        if (leadData.yearEstablished) {
            leadData.monthsInBusiness = (new Date().getFullYear() - parseInt(leadData.yearEstablished)) * 12;
        }
        
        // Add tracking data
        leadData.source = 'website';
        leadData.ipAddress = 'pending';
        leadData.userAgent = navigator.userAgent;
        
        console.log('Sending lead data:', leadData);
        
        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton ? submitButton.textContent : '';
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
        }
        
        try {
            // Send to backend
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(leadData)
            });
            
            const result = await response.json();
            console.log('Server response:', result);
            
            if (result.success) {
                // Success!
                alert(`Success! Your lead has been submitted.\n\nLead Score: ${result.lead.leadScore}\nGrade: ${result.lead.leadGrade}\nTier: ${result.lead.scoringTier}`);
                
                // Reset form
                form.reset();
                
                // Redirect to thank you page if it exists
                if (window.location.pathname.includes('index')) {
                    // Try to redirect to results page
                    window.location.href = 'prequalification-results.html?leadId=' + result.lead._id;
                }
            } else {
                throw new Error(result.message || 'Submission failed');
            }
            
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Error: ' + error.message + '\n\nPlease make sure the backend server is running.');
        } finally {
            // Reset button
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        }
    });
    
    // Also handle any input changes for real-time validation
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', function() {
            console.log(`Field ${input.name} changed to:`, input.value);
        });
    });
});

// Test function you can run from console
window.testLeadSubmission = async function() {
    const testLead = {
        businessName: "Test Company " + Date.now(),
        contactName: "John Doe",
        email: "test@example.com",
        phone: "555-0123",
        industry: "Technology",
        yearEstablished: 2020,
        monthsInBusiness: 48,
        annualRevenue: 500000,
        monthlyRevenue: 41666,
        numberOfEmployees: 10,
        city: "New York",
        state: "NY",
        zipCode: "10001",
        loanAmount: 100000,
        loanPurpose: "Equipment Purchase",
        urgency: "week",
        creditScore: 720,
        bankruptcyHistory: false,
        existingLoans: true,
        source: "test",
        ipAddress: "127.0.0.1",
        userAgent: "Test Script"
    };
    
    try {
        const response = await fetch('http://localhost:3000/api/leads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testLead)
        });
        
        const result = await response.json();
        console.log('Test lead created:', result);
        return result;
    } catch (error) {
        console.error('Test failed:', error);
        return error;
    }
}

console.log('Form handler ready. You can test by calling: testLeadSubmission()');