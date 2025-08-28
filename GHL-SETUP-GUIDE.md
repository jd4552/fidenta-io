# GoHighLevel Integration Setup Guide

## Overview
This guide will help you connect your Fidenta lead generation system with GoHighLevel CRM to automatically sync leads with multi-product scoring data.

## What Gets Synced to GoHighLevel

### Contact Information
- First Name & Last Name
- Email
- Phone
- Business Name

### Custom Fields (You need to create these in GHL)
- `business_name` - Company name
- `loan_amount` - Requested loan amount
- `monthly_revenue` - Monthly revenue
- `annual_revenue` - Annual revenue
- `credit_score` - Credit score
- `months_in_business` - Time in business
- `industry` - Business industry
- `urgency` - Funding urgency

### Multi-Product Scores (Create these custom fields)
- `mca_score` - MCA qualification score (0-100)
- `mca_grade` - MCA grade (A+, A, B, etc.)
- `termloan_score` - Term loan score
- `termloan_grade` - Term loan grade
- `sba_score` - SBA loan score
- `sba_grade` - SBA loan grade
- `loc_score` - Line of credit score
- `loc_grade` - Line of credit grade
- `cc_stacking_score` - Credit card stacking score
- `cc_stacking_grade` - Credit card stacking grade

### Routing Information
- `recommended_product` - Best product for this lead
- `estimated_value` - Lead value estimate
- `qualified_products` - List of qualified products
- `credit_repair_candidate` - Yes/No

### Document Status
- `bank_statements_uploaded` - True/False
- `tax_returns_uploaded` - True/False

### Tags Added Automatically
- Tier tag: `PLATINUM`, `GOLD`, `SILVER`, etc.
- Score tag: `Score-A`, `Score-B`, etc.
- Product tags: `MCA-Qualified`, `TermLoan-Qualified`, etc.
- Urgency tag: `HOT-LEAD` (for immediate needs)

## Step 1: Get Your GoHighLevel API Credentials

1. Log into your GoHighLevel account
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it: "Fidenta Lead Integration"
5. Copy the API Key (you won't see it again!)

## Step 2: Get Your Location ID

1. In GoHighLevel, go to **Settings** → **Business Info**
2. Find your **Location ID** (also called Sub-Account ID)
3. Copy this ID

## Step 3: Create Custom Fields in GoHighLevel

1. Go to **Settings** → **Custom Fields**
2. Click **Add Field** for each of these:

### Essential Fields (Required)
```
Field Name          | Field Type | Field Key
--------------------|------------|------------
Business Name       | Text       | business_name
Loan Amount         | Number     | loan_amount
Monthly Revenue     | Number     | monthly_revenue
Credit Score        | Number     | credit_score
Lead Score          | Number     | lead_score
Lead Grade          | Text       | lead_grade
Lead Tier           | Text       | lead_tier
Industry            | Text       | industry
Urgency             | Text       | urgency
```

### Product Score Fields (Recommended)
```
Field Name          | Field Type | Field Key
--------------------|------------|------------
MCA Score           | Number     | mca_score
MCA Grade           | Text       | mca_grade
Term Loan Score     | Number     | termloan_score
Term Loan Grade     | Text       | termloan_grade
SBA Score           | Number     | sba_score
SBA Grade           | Text       | sba_grade
LOC Score           | Number     | loc_score
LOC Grade           | Text       | loc_grade
CC Stacking Score   | Number     | cc_stacking_score
CC Stacking Grade   | Text       | cc_stacking_grade
```

### Routing Fields (Optional but Useful)
```
Field Name          | Field Type | Field Key
--------------------|------------|------------
Recommended Product | Text       | recommended_product
Estimated Value     | Number     | estimated_value
Qualified Products  | Text       | qualified_products
Credit Repair       | Checkbox   | credit_repair_candidate
```

## Step 4: Set Up Pipeline (Optional)

For automatic opportunity creation for high-value leads:

1. Go to **Pipelines** → **Create Pipeline**
2. Name it: "Business Loan Leads"
3. Add stages:
   - New Lead
   - Qualification
   - Documents Required
   - Under Review
   - Approved
   - Funded
   - Lost

4. Copy the Pipeline ID from the URL
5. Copy the first Stage ID (New Lead)

## Step 5: Configure Environment Variables

### For Local Testing
Add to your `backend/.env` file:
```env
# GoHighLevel Configuration
GHL_API_KEY=your_api_key_here
GHL_LOCATION_ID=your_location_id_here
GHL_PIPELINE_ID=your_pipeline_id_here (optional)
GHL_STAGE_ID=your_stage_id_here (optional)
CRM_TYPE=gohighlevel
```

### For Production (Netlify)
1. Go to Netlify Dashboard
2. Site Settings → Environment Variables
3. Add the same variables:
   - `GHL_API_KEY`
   - `GHL_LOCATION_ID`
   - `GHL_PIPELINE_ID` (optional)
   - `GHL_STAGE_ID` (optional)
   - `CRM_TYPE` = gohighlevel

## Step 6: Test the Integration

1. Submit a test lead through your form
2. Check GoHighLevel Contacts - you should see:
   - New contact created
   - All custom fields populated
   - Tags applied based on scoring
   - Opportunity created (if high-value)

## Step 7: Set Up Webhooks (Optional)

To sync updates back from GoHighLevel:

1. In GHL, go to **Settings** → **Webhooks**
2. Create webhook:
   - URL: `https://api.fidenta.io/api/webhooks/gohighlevel`
   - Events: Contact Created, Contact Updated, Opportunity Status Update

## Automation Ideas in GoHighLevel

### 1. Auto-assign by Product Type
Create workflow that assigns leads to specific users based on `recommended_product`:
- MCA leads → MCA specialist
- Term loans → Bank loan officer
- SBA loans → SBA specialist

### 2. Urgency-based Follow-up
Create workflow for `HOT-LEAD` tags:
- Send immediate SMS
- Create high-priority task
- Send email within 5 minutes

### 3. Score-based Campaigns
Create different email campaigns based on `lead_tier`:
- PLATINUM → Premium offers
- GOLD → Standard offers
- SILVER → Educational content
- BRONZE → Nurture campaign

### 4. Document Collection
Create workflow when documents are missing:
- Send automated email requesting documents
- SMS reminder after 24 hours
- Task for manual follow-up after 48 hours

## Troubleshooting

### Lead Not Appearing in GHL
1. Check API credentials in environment variables
2. Check console logs for error messages
3. Verify custom fields are created with exact field keys
4. Test API key in GHL API playground

### Custom Fields Not Populating
1. Ensure field keys match exactly (case-sensitive)
2. Check field types (Number vs Text)
3. Verify data is being sent from form

### Tags Not Applied
1. Check if tags exist in GHL
2. Verify scoring is calculating correctly
3. Check for special characters in tag names

## Support

For issues with:
- Lead form: Check browser console for errors
- API integration: Check server logs
- GoHighLevel: Contact GHL support
- Scoring logic: Review SCORING-LOGIC-DOCUMENTATION.md

## Testing Checklist

- [ ] API Key configured
- [ ] Location ID configured
- [ ] Custom fields created
- [ ] Test lead submitted
- [ ] Contact appears in GHL
- [ ] Custom fields populated
- [ ] Tags applied correctly
- [ ] Opportunity created (if applicable)
- [ ] Webhook tested (if configured)

---
*Last Updated: January 2025*
*Integration Version: 2.0 with Multi-Product Scoring*