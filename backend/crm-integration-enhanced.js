// Enhanced CRM Integration with Multi-Product Scoring Support

// ============ GOHIGHLEVEL (Enhanced) ============
async function sendToGoHighLevel(lead) {
    const GHL_API_KEY = process.env.GHL_API_KEY;
    const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
    
    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
        console.log('⚠️ GoHighLevel credentials not configured');
        return { error: 'GHL credentials missing' };
    }
    
    try {
        // Prepare tags based on product qualifications
        const tags = [lead.scoringTier, `Score-${lead.leadGrade}`];
        
        // Add product qualification tags
        if (lead.productScores) {
            if (lead.productScores.mca?.qualified) tags.push('MCA-Qualified');
            if (lead.productScores.termLoan?.qualified) tags.push('TermLoan-Qualified');
            if (lead.productScores.sbaLoan?.qualified) tags.push('SBA-Qualified');
            if (lead.productScores.lineOfCredit?.qualified) tags.push('LOC-Qualified');
            if (lead.productScores.creditCardStacking?.qualified) tags.push('CC-Stacking-Qualified');
        }
        
        // Add urgency tag
        if (lead.urgency === 'Immediate') tags.push('HOT-LEAD');
        
        // Prepare custom fields with all scoring data
        const customFields = {
            business_name: lead.businessName,
            loan_amount: lead.loanAmount,
            monthly_revenue: lead.monthlyRevenue,
            annual_revenue: lead.annualRevenue,
            credit_score: lead.creditScore,
            months_in_business: lead.monthsInBusiness,
            industry: lead.industry,
            urgency: lead.urgency,
            
            // Overall scoring
            lead_score: lead.leadScore,
            lead_grade: lead.leadGrade,
            lead_tier: lead.scoringTier,
            
            // Product scores
            mca_score: lead.productScores?.mca?.score || 0,
            mca_grade: lead.productScores?.mca?.grade || 'NQ',
            termloan_score: lead.productScores?.termLoan?.score || 0,
            termloan_grade: lead.productScores?.termLoan?.grade || 'NQ',
            sba_score: lead.productScores?.sbaLoan?.score || 0,
            sba_grade: lead.productScores?.sbaLoan?.grade || 'NQ',
            loc_score: lead.productScores?.lineOfCredit?.score || 0,
            loc_grade: lead.productScores?.lineOfCredit?.grade || 'NQ',
            cc_stacking_score: lead.productScores?.creditCardStacking?.score || 0,
            cc_stacking_grade: lead.productScores?.creditCardStacking?.grade || 'NQ',
            
            // Routing information
            recommended_product: lead.routing?.recommendedProduct || '',
            estimated_value: lead.routing?.estimatedValue || 0,
            qualified_products: lead.routing?.qualifiedProducts?.join(', ') || '',
            credit_repair_candidate: lead.routing?.creditRepairCandidate || false,
            
            // Document status
            bank_statements_uploaded: lead.bankStatementsUploaded || false,
            tax_returns_uploaded: lead.taxReturnsUploaded || false,
            
            // Source tracking
            source: lead.source || 'Website',
            ip_address: lead.ipAddress || '',
            created_at: lead.createdAt
        };
        
        const response = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GHL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                locationId: GHL_LOCATION_ID,
                firstName: lead.contactName.split(' ')[0],
                lastName: lead.contactName.split(' ').slice(1).join(' ') || '',
                email: lead.email,
                phone: lead.phone,
                source: 'Fidenta Lead Gen',
                customField: customFields,
                tags: tags,
                
                // Add to pipeline if high value
                ...(lead.routing?.estimatedValue >= 75 && {
                    pipelineId: process.env.GHL_PIPELINE_ID,
                    pipelineStageId: process.env.GHL_STAGE_ID
                })
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Lead sent to GoHighLevel with multi-product scores');
            
            // Update lead with GHL contact ID
            if (result.contact?.id) {
                lead.ghlContactId = result.contact.id;
                lead.ghlSyncStatus = 'synced';
                lead.ghlLastSyncedAt = new Date();
            }
            
            // Create opportunity for high-value leads
            if (lead.routing?.estimatedValue >= 100) {
                await createGHLOpportunity(lead, result.contact?.id);
            }
            
            return result;
        } else {
            console.error('❌ GoHighLevel API error:', result);
            lead.ghlSyncStatus = 'failed';
            return { error: result };
        }
    } catch (error) {
        console.error('❌ GoHighLevel error:', error);
        lead.ghlSyncStatus = 'failed';
        return { error: error.message };
    }
}

// Create opportunity in GoHighLevel for high-value leads
async function createGHLOpportunity(lead, contactId) {
    const GHL_API_KEY = process.env.GHL_API_KEY;
    const GHL_PIPELINE_ID = process.env.GHL_PIPELINE_ID;
    const GHL_STAGE_ID = process.env.GHL_STAGE_ID;
    
    if (!GHL_PIPELINE_ID || !GHL_STAGE_ID) {
        console.log('⚠️ GHL Pipeline/Stage IDs not configured');
        return;
    }
    
    try {
        const response = await fetch('https://rest.gohighlevel.com/v1/pipelines/opportunities/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GHL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pipelineId: GHL_PIPELINE_ID,
                pipelineStageId: GHL_STAGE_ID,
                contactId: contactId,
                name: `${lead.businessName} - ${lead.routing?.recommendedProduct || 'Loan'}`,
                value: lead.loanAmount,
                status: 'open',
                customFields: {
                    estimated_commission: lead.routing?.estimatedValue || 0,
                    product_type: lead.routing?.recommendedProduct || '',
                    urgency: lead.urgency
                }
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Opportunity created in GoHighLevel');
            lead.ghlOpportunityId = result.opportunity?.id;
        }
    } catch (error) {
        console.error('⚠️ Failed to create GHL opportunity:', error);
    }
}

// ============ WEBHOOK FOR BUYERS ============
async function sendToBuyerWebhook(lead, buyerConfig) {
    const { webhookUrl, apiKey, productTypes } = buyerConfig;
    
    // Check if lead qualifies for this buyer's products
    const qualifiesForBuyer = productTypes.some(product => {
        const productData = lead.productScores?.[product];
        return productData?.qualified && productData?.score >= buyerConfig.minScore;
    });
    
    if (!qualifiesForBuyer) {
        console.log(`⚠️ Lead doesn't qualify for buyer ${buyerConfig.name}`);
        return null;
    }
    
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // Lead information
                lead: {
                    id: lead._id,
                    businessName: lead.businessName,
                    contactName: lead.contactName,
                    email: lead.email,
                    phone: lead.phone,
                    city: lead.city,
                    state: lead.state,
                    zipCode: lead.zipCode
                },
                
                // Financial information
                financial: {
                    monthlyRevenue: lead.monthlyRevenue,
                    annualRevenue: lead.annualRevenue,
                    creditScore: lead.creditScore,
                    loanAmount: lead.loanAmount,
                    monthsInBusiness: lead.monthsInBusiness
                },
                
                // Scoring information
                scoring: {
                    overallScore: lead.leadScore,
                    overallGrade: lead.leadGrade,
                    tier: lead.scoringTier,
                    productScores: lead.productScores,
                    recommendedProduct: lead.routing?.recommendedProduct,
                    estimatedValue: lead.routing?.estimatedValue
                },
                
                // Metadata
                meta: {
                    urgency: lead.urgency,
                    industry: lead.industry,
                    documentsUploaded: {
                        bankStatements: lead.bankStatementsUploaded,
                        taxReturns: lead.taxReturnsUploaded
                    },
                    submittedAt: lead.createdAt,
                    source: 'Fidenta Lead Gen'
                }
            })
        });
        
        if (response.ok) {
            console.log(`✅ Lead sent to buyer: ${buyerConfig.name}`);
            return await response.json();
        } else {
            console.error(`❌ Failed to send to buyer ${buyerConfig.name}:`, await response.text());
            return null;
        }
    } catch (error) {
        console.error(`❌ Error sending to buyer ${buyerConfig.name}:`, error);
        return null;
    }
}

// ============ ROUTE TO MULTIPLE BUYERS ============
async function routeToQualifiedBuyers(lead) {
    // This would normally come from database
    const buyers = [
        {
            name: 'MCA Buyer 1',
            webhookUrl: process.env.MCA_BUYER1_WEBHOOK,
            apiKey: process.env.MCA_BUYER1_KEY,
            productTypes: ['mca'],
            minScore: 40
        },
        {
            name: 'Term Loan Buyer',
            webhookUrl: process.env.TERM_BUYER_WEBHOOK,
            apiKey: process.env.TERM_BUYER_KEY,
            productTypes: ['termLoan', 'sbaLoan'],
            minScore: 70
        },
        {
            name: 'Multi-Product Buyer',
            webhookUrl: process.env.MULTI_BUYER_WEBHOOK,
            apiKey: process.env.MULTI_BUYER_KEY,
            productTypes: ['mca', 'termLoan', 'lineOfCredit'],
            minScore: 50
        }
    ];
    
    const results = [];
    
    for (const buyer of buyers) {
        if (buyer.webhookUrl && buyer.apiKey) {
            const result = await sendToBuyerWebhook(lead, buyer);
            if (result) {
                results.push({
                    buyer: buyer.name,
                    success: true,
                    response: result
                });
            }
        }
    }
    
    console.log(`📊 Lead routed to ${results.length} qualified buyers`);
    return results;
}

// ============ MAIN INTEGRATION FUNCTION ============
async function sendToCRM(lead) {
    const results = {
        ghl: null,
        buyers: []
    };
    
    // Always try to send to GoHighLevel if configured
    if (process.env.GHL_API_KEY) {
        results.ghl = await sendToGoHighLevel(lead);
    }
    
    // Route to qualified buyers
    if (process.env.ENABLE_BUYER_ROUTING === 'true') {
        results.buyers = await routeToQualifiedBuyers(lead);
    }
    
    return results;
}

// Export for use in server.js
module.exports = {
    sendToCRM,
    sendToGoHighLevel,
    createGHLOpportunity,
    sendToBuyerWebhook,
    routeToQualifiedBuyers
};