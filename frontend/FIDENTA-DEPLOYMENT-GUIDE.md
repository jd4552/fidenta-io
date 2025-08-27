# 🚀 Fidenta.io Deployment Guide
**Last Updated**: August 26, 2025

## 📋 Prerequisites
- [x] Domain purchased: fidenta.io
- [ ] Vercel account with projects deployed
- [ ] Access to domain registrar DNS settings

## 🎯 Quick Setup Steps

### Step 1: Add Domain to Vercel (5 minutes)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your frontend project: `lead-gen-pages`

2. **Add Custom Domain**
   - Click "Settings" → "Domains"
   - Add: `fidenta.io`
   - Add: `www.fidenta.io`
   - Click "Add"

3. **Get DNS Records**
   - Vercel will show you DNS records to add
   - Usually an A record and/or CNAME

### Step 2: Configure DNS at Domain Registrar (10 minutes)

**For Root Domain (fidenta.io):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**For API subdomain (backend):**
```
Type: CNAME
Name: api
Value: cname.vercel-dns.com
```

### Step 3: Update Backend Configuration (5 minutes)

1. **Go to Backend Project in Vercel**
   - Select: `backend` project
   - Settings → Domains
   - Add: `api.fidenta.io`

2. **Update Environment Variables**
   ```
   FRONTEND_URL = https://fidenta.io
   MONGODB_URI = [keep existing]
   NODE_ENV = production
   JWT_SECRET = [keep existing]
   ```

### Step 4: Update CORS in Backend

The backend already includes fidenta.loan in CORS. We need to update it to fidenta.io:

```javascript
// In backend/server.js, update allowedOrigins:
const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:3000',
    'https://fidenta.io',
    'https://www.fidenta.io',
    'https://api.fidenta.io',
    process.env.FRONTEND_URL
];
```

### Step 5: Update Frontend API Calls

All frontend files need to point to the new API:
- Current: `https://backend-onttc7h2s-yacovs-projects-7233b556.vercel.app`
- New: `https://api.fidenta.io`

Files to update:
- `/admin-dashboard.html`
- `/test-lead-submission.html`
- `/templates/business-loan/form-handler.js`
- `/marketplace/marketplace.js`

### Step 6: SSL Certificate (Automatic)

Vercel automatically provisions SSL certificates via Let's Encrypt. No action needed!

## 🔄 DNS Propagation

- **Time**: 5 minutes to 48 hours (usually under 1 hour)
- **Check Status**: https://dnschecker.org
- **Test**: Try accessing https://fidenta.io

## ✅ Post-Deployment Checklist

### Immediate Tests:
- [ ] https://fidenta.io loads
- [ ] https://www.fidenta.io redirects properly
- [ ] https://api.fidenta.io responds
- [ ] Submit test lead form
- [ ] Check admin dashboard
- [ ] Verify MongoDB connection

### Configuration Updates:
- [ ] Update config.js with production URLs
- [ ] Remove temporary Vercel URLs
- [ ] Update email templates with new domain
- [ ] Update any documentation

### Marketing Updates:
- [ ] Update business cards
- [ ] Update email signatures
- [ ] Update social media profiles
- [ ] Update Google Business listing

## 🚨 Troubleshooting

### Domain Not Loading:
1. Check DNS propagation: https://dnschecker.org
2. Verify DNS records are correct
3. Clear browser cache
4. Try incognito mode

### API Not Working:
1. Check api.fidenta.io is configured in Vercel
2. Verify CORS settings include new domain
3. Check environment variables
4. Review Vercel function logs

### SSL Issues:
- Vercel auto-provisions SSL, wait 10 minutes
- If still not working, remove and re-add domain

## 📞 Support Contacts

- **Vercel Support**: https://vercel.com/support
- **Domain Registrar**: Check your provider's support
- **MongoDB Atlas**: https://www.mongodb.com/support

## 🎯 Next Steps After Deployment

1. **Add GoHighLevel Integration**
   - Get API key from GHL account
   - Add to environment variables
   - Enable in config.js

2. **Configure Stripe**
   - Create Stripe account
   - Add API keys
   - Enable marketplace payments

3. **Set Up Email**
   - Configure SMTP (SendGrid/Mailgun)
   - Test email notifications
   - Set up transactional emails

4. **Analytics**
   - Add Google Analytics
   - Set up conversion tracking
   - Configure GTM

## 📊 Current Status

| Component | Status | URL |
|-----------|--------|-----|
| Frontend | ✅ Live on Vercel | Pending fidenta.io |
| Backend API | ✅ Live on Vercel | Pending api.fidenta.io |
| Database | ✅ MongoDB Atlas | Connected |
| SSL | ⏳ Auto-provisions | Via Vercel |
| Email | ❌ Not configured | Needs SMTP |
| Payments | ❌ Not configured | Needs Stripe |
| CRM | ⏳ Ready | Needs API keys |

---

**Remember**: DNS changes can take time. Be patient and test thoroughly!