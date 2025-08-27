# Fidenta Lead Scoring Logic Documentation

## Overview
This document outlines the complete scoring logic for business loan lead qualification and pricing.

## Lead Quality Tiers & Pricing

### Pricing Structure
| Tier | Score Range | Base Price | With Full Docs | Description |
|------|------------|------------|----------------|-------------|
| **PLATINUM** | 90-100 | $150 | $375 (2.5x) | Premium lead, multiple A+ qualifications |
| **GOLD** | 80-89 | $100 | $250 (2.5x) | High quality, strong qualifications |
| **SILVER** | 70-79 | $75 | $187 (2.5x) | Good lead, solid qualifications |
| **BRONZE** | 60-69 | $50 | $125 (2.5x) | Average lead, basic qualifications |
| **STANDARD** | 40-59 | $25 | $62 (2.5x) | Below average, limited options |
| **BASIC** | 0-39 | $10 | $25 (2.5x) | Poor lead, unlikely to qualify |

## Product-Specific Scoring Examples

### Example 1: Restaurant Owner (Low Credit, High Revenue)
- **Profile**: 580 credit, $80K/mo revenue, 18 months in business, needs emergency equipment funding
- **Scores by Product**:
  - MCA: **A+ (92)** - Excellent fit based on revenue
  - Term Loan: **F (NQ)** - Credit below 680 minimum
  - SBA Loan: **NQ** - Doesn't meet requirements
  - Line of Credit: **D (45)** - Marginal qualification
  - Equipment Financing: **C+ (65)** - Possible with equipment as collateral
- **Lead Value**: Base $75 (SILVER) → $150 with bank statements

### Example 2: Tech Startup (High Credit, Low Time in Business)
- **Profile**: 750 credit, $30K/mo revenue, 8 months in business
- **Scores by Product**:
  - Credit Card Stacking: **A+ (95)** - Perfect for startups
  - Revenue-Based Financing: **B+ (78)** - Good option
  - MCA: **B (72)** - Qualified but not ideal
  - Term Loan: **NQ** - Under 24 month minimum
  - SBA Loan: **NQ** - Under 24 month minimum
- **Lead Value**: Base $75 (SILVER based on limited options)

### Example 3: Established Retailer (Good Everything)
- **Profile**: 720 credit, $150K/mo revenue, 5 years in business
- **Scores by Product**:
  - Term Loan: **A (88)** - Excellent qualification
  - SBA Loan: **A- (82)** - Strong candidate
  - Line of Credit: **A+ (91)** - Perfect fit
  - MCA: **A+ (95)** - Over-qualified (expensive option)
  - Equipment Financing: **A (87)** - Great qualification
- **Lead Value**: Base $150 (PLATINUM) → $375 with full documentation

## Document Value Multipliers

### Individual Document Impact
| Document | Multiplier | Value Add | Verification Benefit |
|----------|------------|-----------|---------------------|
| 12 months bank statements | 1.5x | +50% | Proves cash flow stability |
| 6 months bank statements | 1.3x | +30% | Shows recent performance |
| 3 months bank statements | 1.2x | +20% | Minimum verification |
| 2 years tax returns | 1.4x | +40% | Confirms reported revenue |
| 1 year tax returns | 1.2x | +20% | Basic tax compliance |
| P&L statement | 1.15x | +15% | Profitability verification |
| Balance sheet | 1.15x | +15% | Asset verification |
| Complete application | 1.25x | +25% | Full data set |
| Business plan | 1.1x | +10% | SBA qualification |
| Driver's license | 1.05x | +5% | Identity verification |

### Stacking Documents (Multiplicative)
- 3mo bank statements only: 1.2x
- 3mo bank + 1yr tax: 1.2 × 1.2 = 1.44x
- 12mo bank + 2yr tax + P&L: 1.5 × 1.4 × 1.15 = 2.415x (capped at 2.5x)

## Scoring Factors by Product

### Term Loan (Traditional Bank Loan)
**Minimum Requirements**:
- Credit Score: 680+
- Monthly Revenue: $15,000+
- Time in Business: 24+ months

**Scoring Weights**:
- Credit Score: 35%
- Monthly Revenue: 25%
- Time in Business: 15%
- Bank Balance: 10%
- Industry Risk: 10%
- Debt Service Ratio: 5%

### Merchant Cash Advance (MCA)
**Minimum Requirements**:
- Credit Score: 550+
- Monthly Revenue: $10,000+
- Time in Business: 6+ months

**Scoring Weights**:
- Monthly Revenue: 40% (MOST IMPORTANT)
- Bank Deposits: 20%
- Credit Score: 15%
- Existing MCA Positions: 15%
- Time in Business: 10%

### SBA Loan (Government-Backed)
**Minimum Requirements**:
- Credit Score: 680+
- Monthly Revenue: $10,000+
- Time in Business: 24+ months
- Business Plan: Required
- Collateral: Often required

**Scoring Weights**:
- Credit Score: 30%
- Business Plan Quality: 20%
- Collateral: 20%
- Time in Business: 15%
- Monthly Revenue: 15%

### Line of Credit (LOC)
**Minimum Requirements**:
- Credit Score: 630+
- Monthly Revenue: $10,000+
- Time in Business: 12+ months

**Scoring Weights**:
- Credit Score: 35%
- Monthly Revenue: 25%
- Cash Flow: 20%
- Time in Business: 10%
- Bank Balance: 10%

### Credit Card Stacking (Startup Funding)
**Minimum Requirements**:
- Personal Credit: 680+
- Personal Income: $40,000+
- No business history required

**Scoring Weights**:
- Personal Credit: 50% (MOST IMPORTANT)
- Personal Income: 25%
- Debt-to-Income: 15%
- Credit Utilization: 10%

## Industry Risk Multipliers

Lower multiplier = Better risk profile = Higher scores

| Industry | Risk Multiplier | Impact on Score |
|----------|----------------|-----------------|
| Technology | 1.0 | Best scores |
| Healthcare | 1.1 | -10% |
| Professional Services | 1.2 | -20% |
| Manufacturing | 1.3 | -30% |
| Real Estate | 1.3 | -30% |
| E-commerce | 1.4 | -40% |
| Retail | 1.5 | -50% |
| Transportation | 1.5 | -50% |
| Construction | 1.6 | -60% |
| Hospitality | 1.7 | -70% |
| Food Service/Restaurant | 1.8 | -80% |

## Lead Intent Signals

### Funding Timeframe Impact
- **Emergency/Immediate**: 1.3x value (high intent, will accept worse terms)
- **Planned (30 days)**: 1.1x value (serious buyer)
- **Shopping/Flexible**: 0.9x value (price shopping)
- **Future/Exploring**: 0.8x value (low intent)

### Behavioral Signals
- Uploads documents immediately: +20% value
- Completes full application: +15% value
- Provides phone number: +10% value
- Multiple form attempts: -10% value (indecisive)
- Abandons after seeing rates: -20% value

## Client-Specific Routing Rules

### MCA-Only Clients
**Send leads with**:
- MCA score 70+
- Monthly revenue $10K+
- Any credit score
- Immediate funding need = PRIORITY

### Multi-Product Lenders
**Send leads with**:
- 2+ product qualifications
- Overall score 60+
- Complete contact info

### SBA Specialists
**Send leads with**:
- SBA qualification (rare, high value)
- Credit 680+
- 2+ years in business
- Can wait 3-6 weeks

### Term Loan Lenders
**Send leads with**:
- Term loan score 70+
- Credit 680+
- Stable business metrics

## Optimal Question Order (Psychological Flow)

### Phase 1: Low Threat (Business Info)
1. **Industry/Business Type** - Easy, non-threatening
2. **Time in Business** - Factual, no judgment
3. **State/Location** - Simple selection

### Phase 2: Positive Framing (Opportunity)
4. **Funding Amount Needed** - Focus on their goals
5. **Funding Purpose** - Their growth story
6. **Funding Timeframe** - Urgency indicator

### Phase 3: Qualification (Revenue/Financial)
7. **Monthly Revenue** - Key qualifier
8. **Average Bank Balance** - Cash flow indicator
9. **Business Structure** (LLC, Corp, etc.)

### Phase 4: Sensitive (Credit/Debt)
10. **Credit Score Range** - Use ranges, not exact
11. **Existing Business Debt** - Checkboxes
12. **Existing MCA Positions** - If applicable

### Phase 5: Contact (Commitment)
13. **Business Name**
14. **Your Name**
15. **Email**
16. **Phone** - Last (highest friction)

## Value Calculation Formula

```
Base Score = Product Qualification Scores / Number of Products
Industry Adjustment = Base Score / Industry Risk Multiplier
Document Boost = Industry Adjustment × Document Multipliers
Intent Adjustment = Document Boost × Intent Signal
Final Lead Value = Pricing Tier Base × Total Multipliers
```

### Example Calculation
- Restaurant, 580 credit, $80K revenue, emergency need, 6mo bank statements
- MCA Score: 92, Term Loan: 0, SBA: 0, LOC: 45
- Base Score: (92 + 0 + 0 + 45) / 4 = 34.25
- Industry Adjustment: 34.25 / 1.8 = 19
- Document Boost: 19 × 1.3 = 24.7
- Intent Adjustment: 24.7 × 1.3 = 32.1
- Lead Grade: BASIC ($10 base)
- BUT: High MCA score (92) overrides to SILVER ($75)
- Final Value: $75 × 1.3 (docs) × 1.3 (intent) = $127

## Lead Routing Decision Tree

```
1. Check MCA Score
   ├─ If 85+ → Route to MCA clients immediately
   └─ Continue evaluation

2. Check Overall Score
   ├─ If 80+ → Route to premium multi-lenders
   ├─ If 60-79 → Route to standard lenders
   └─ If <60 → Route to subprime specialists

3. Check Documentation
   ├─ If uploaded → Add to "verified" queue (+50% price)
   └─ If not → Add to "unverified" queue (base price)

4. Check Intent
   ├─ If immediate → Priority routing (sell within 30 seconds)
   ├─ If planned → Standard routing (sell within 5 minutes)
   └─ If exploring → Batch routing (sell within 1 hour)
```

## Progressive Capture Strategy

### Stage 1: Instant Route (30 seconds)
- Industry + Revenue + Time in Business + Funding Amount
- **Enough to route to MCA clients**

### Stage 2: Basic Qualification (2 minutes)
- Add: Credit Range + Funding Purpose + Timeframe
- **Can now route to most clients**

### Stage 3: Enhanced Value (5 minutes)
- Add: Contact Info + Business Details
- **Full lead ready for sale**

### Stage 4: Premium Value (10 minutes)
- Add: Document uploads
- **2.5x value multiplier achieved**

## Behavioral Tracking Triggers

### "About to Leave" Signals
- Mouse moves to browser back button
- Rapid scrolling to top
- 30+ seconds on same question
- Multiple validation errors

**Action**: Show "Wait! You're pre-approved" popup → Route basic lead immediately

### "Engaged User" Signals  
- Steady form progress
- Document upload started
- Multiple questions answered
- Returning from email/phone fields

**Action**: Let them continue, show progress encouragement

### "High Intent" Signals
- Selects "immediate" or "emergency"
- High funding amount ($100K+)
- Uploads documents without prompting
- Completes form quickly (<3 minutes)

**Action**: Premium routing to best clients, highest price

## Client Management System

### Client Profiles
```javascript
{
  "client_001": {
    "name": "QuickCash MCA",
    "type": "mca_only",
    "accepts": {
      "min_revenue": 10000,
      "min_mca_score": 70,
      "max_positions": 3,
      "credit_minimum": 500
    },
    "pricing": {
      "platinum": 120,
      "gold": 80,
      "silver": 60,
      "bronze": 40,
      "standard": 20
    },
    "routing": {
      "priority": "immediate_needs",
      "response_time": "1_hour"
    }
  },
  "client_002": {
    "name": "Premium Business Capital",
    "type": "multi_product",
    "accepts": {
      "products": ["term", "sba", "loc"],
      "min_credit": 650,
      "min_revenue": 25000,
      "min_time_business": 12
    },
    "pricing": {
      "platinum": 200,
      "gold": 150,
      "silver": 100,
      "bronze": 75
    }
  }
}
```

## Revenue Optimization Rules

1. **Sell Twice Strategy**: 
   - Immediate: Sell basic lead to MCA client
   - Later: If docs uploaded, sell enhanced version to term loan client

2. **Exclusive vs Non-Exclusive**:
   - MCA leads: Non-exclusive (sell to 3-5 buyers)
   - SBA leads: Exclusive (premium price, one buyer)
   - Term loans: Semi-exclusive (2-3 buyers max)

3. **Time-Based Pricing**:
   - 0-1 hour old: 100% price
   - 1-24 hours: 75% price  
   - 1-3 days: 50% price
   - 3+ days: 25% price

4. **Geographic Multipliers**:
   - CA, NY, TX, FL: 1.2x (high demand states)
   - Major cities: 1.1x
   - Rural areas: 0.8x

---

*Last Updated: 2024*
*Version: 1.0*