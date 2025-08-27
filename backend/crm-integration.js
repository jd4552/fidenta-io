// CRM Integration Module - Add to your backend/server.js

// Popular CRM Integration Examples

// ============ GOHIGHLEVEL ============
async function sendToGoHighLevel(lead) {
    const GHL_API_KEY = process.env.GHL_API_KEY;
    const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
    
    try {
        const response = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GHL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                locationId: GHL_LOCATION_ID,
                firstName: lead.contactName.split(' ')[0],
                lastName: lead.contactName.split(' ')[1] || '',
                email: lead.email,
                phone: lead.phone,
                source: 'Website',
                customField: {
                    business_name: lead.businessName,
                    loan_amount: lead.loanAmount,
                    lead_score: lead.leadScore,
                    lead_tier: lead.scoringTier
                },
                tags: [lead.scoringTier, `Score-${lead.leadGrade}`]
            })
        });
        
        console.log('✅ Lead sent to GoHighLevel');
        return await response.json();
    } catch (error) {
        console.error('❌ GoHighLevel error:', error);
    }
}

// ============ HUBSPOT ============
async function sendToHubSpot(lead) {
    const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
    
    try {
        const response = await fetch(`https://api.hubapi.com/contacts/v1/contact/?hapikey=${HUBSPOT_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: [
                    { property: 'email', value: lead.email },
                    { property: 'firstname', value: lead.contactName.split(' ')[0] },
                    { property: 'lastname', value: lead.contactName.split(' ')[1] || '' },
                    { property: 'phone', value: lead.phone },
                    { property: 'company', value: lead.businessName },
                    { property: 'loan_amount', value: lead.loanAmount },
                    { property: 'lead_score', value: lead.leadScore },
                    { property: 'lead_tier', value: lead.scoringTier }
                ]
            })
        });
        
        console.log('✅ Lead sent to HubSpot');
        return await response.json();
    } catch (error) {
        console.error('❌ HubSpot error:', error);
    }
}

// ============ SALESFORCE ============
async function sendToSalesforce(lead) {
    const SF_INSTANCE_URL = process.env.SF_INSTANCE_URL;
    const SF_ACCESS_TOKEN = process.env.SF_ACCESS_TOKEN;
    
    try {
        const response = await fetch(`${SF_INSTANCE_URL}/services/data/v57.0/sobjects/Lead/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SF_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                FirstName: lead.contactName.split(' ')[0],
                LastName: lead.contactName.split(' ')[1] || 'Unknown',
                Company: lead.businessName,
                Email: lead.email,
                Phone: lead.phone,
                AnnualRevenue: lead.annualRevenue,
                Description: `Loan Amount: $${lead.loanAmount}, Score: ${lead.leadScore}/100, Tier: ${lead.scoringTier}`,
                LeadSource: 'Website',
                Rating: lead.leadGrade
            })
        });
        
        console.log('✅ Lead sent to Salesforce');
        return await response.json();
    } catch (error) {
        console.error('❌ Salesforce error:', error);
    }
}

// ============ PIPEDRIVE ============
async function sendToPipedrive(lead) {
    const PIPEDRIVE_API_TOKEN = process.env.PIPEDRIVE_API_TOKEN;
    
    try {
        // First create person
        const personResponse = await fetch(`https://api.pipedrive.com/v1/persons?api_token=${PIPEDRIVE_API_TOKEN}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: lead.contactName,
                email: lead.email,
                phone: lead.phone
            })
        });
        
        const person = await personResponse.json();
        
        // Then create deal
        const dealResponse = await fetch(`https://api.pipedrive.com/v1/deals?api_token=${PIPEDRIVE_API_TOKEN}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: `${lead.businessName} - $${lead.loanAmount}`,
                value: lead.loanAmount,
                person_id: person.data.id,
                status: 'open'
            })
        });
        
        console.log('✅ Lead sent to Pipedrive');
        return await dealResponse.json();
    } catch (error) {
        console.error('❌ Pipedrive error:', error);
    }
}

// ============ WEBHOOK (Universal) ============
async function sendToWebhook(lead) {
    const WEBHOOK_URL = process.env.CRM_WEBHOOK_URL;
    
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(lead)
        });
        
        console.log('✅ Lead sent to webhook');
        return await response.json();
    } catch (error) {
        console.error('❌ Webhook error:', error);
    }
}

// ============ ZAPIER Integration ============
async function sendToZapier(lead) {
    const ZAPIER_WEBHOOK = process.env.ZAPIER_WEBHOOK_URL;
    
    try {
        const response = await fetch(ZAPIER_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...lead,
                timestamp: new Date().toISOString(),
                source: 'Lead Gen Form'
            })
        });
        
        console.log('✅ Lead sent to Zapier');
        return await response.json();
    } catch (error) {
        console.error('❌ Zapier error:', error);
    }
}

// ============ MAIN INTEGRATION FUNCTION ============
// Add this to your lead creation endpoint in server.js

async function sendToCRM(lead) {
    const CRM_TYPE = process.env.CRM_TYPE; // 'gohighlevel', 'hubspot', 'salesforce', etc.
    
    switch(CRM_TYPE) {
        case 'gohighlevel':
            return await sendToGoHighLevel(lead);
        case 'hubspot':
            return await sendToHubSpot(lead);
        case 'salesforce':
            return await sendToSalesforce(lead);
        case 'pipedrive':
            return await sendToPipedrive(lead);
        case 'zapier':
            return await sendToZapier(lead);
        case 'webhook':
            return await sendToWebhook(lead);
        default:
            console.log('No CRM integration configured');
    }
}

// Export for use in server.js
module.exports = {
    sendToCRM,
    sendToGoHighLevel,
    sendToHubSpot,
    sendToSalesforce,
    sendToPipedrive,
    sendToZapier,
    sendToWebhook
};