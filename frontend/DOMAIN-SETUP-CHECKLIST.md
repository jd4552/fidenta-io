# ✅ Fidenta.io Domain Setup Checklist
**Created**: August 26, 2025

## 📋 Phase 1: Domain Purchase (You do this)

### At Your Domain Registrar:
- [ ] Purchase fidenta.io
- [ ] Note down registrar name (GoDaddy, Namecheap, etc.)
- [ ] Access DNS management panel
- [ ] Keep login credentials handy

## 📋 Phase 2: Vercel Configuration (We do together)

### A. Frontend Setup (fidenta.io)
1. [ ] Login to Vercel: https://vercel.com
2. [ ] Go to `lead-gen-pages` project
3. [ ] Click Settings → Domains
4. [ ] Add `fidenta.io` (root domain)
5. [ ] Add `www.fidenta.io` (www subdomain)
6. [ ] Copy the DNS records Vercel provides

### B. Backend Setup (api.fidenta.io)
1. [ ] Go to `backend` project in Vercel
2. [ ] Click Settings → Domains
3. [ ] Add `api.fidenta.io`
4. [ ] Copy the DNS record Vercel provides

## 📋 Phase 3: DNS Configuration (You do this)

### Add These Records to Your Domain:

**For fidenta.io (root):**
```
Type: A
Host: @ (or leave blank)
Points to: 76.76.21.21
TTL: Automatic or 3600
```

**For www.fidenta.io:**
```
Type: CNAME
Host: www
Points to: cname.vercel-dns.com
TTL: Automatic or 3600
```

**For api.fidenta.io:**
```
Type: CNAME
Host: api
Points to: cname.vercel-dns.com
TTL: Automatic or 3600
```

## 📋 Phase 4: Wait for Propagation (5-60 minutes)

### While waiting, prepare:
- [ ] Clear browser cache
- [ ] Have test data ready
- [ ] Prepare announcement for going live

### Check propagation:
- [ ] Visit: https://dnschecker.org
- [ ] Enter: fidenta.io
- [ ] Look for green checkmarks globally

## 📋 Phase 5: Testing (We do together)

### Frontend Tests:
- [ ] https://fidenta.io loads
- [ ] https://www.fidenta.io redirects to fidenta.io
- [ ] Homepage looks correct
- [ ] Navigation works
- [ ] Forms display properly

### Backend Tests:
- [ ] https://api.fidenta.io responds
- [ ] Submit test lead
- [ ] Check MongoDB for new lead
- [ ] Admin dashboard shows leads
- [ ] CSV export works

## 📋 Phase 6: Final Updates

### Code Updates:
- [ ] Run production update script
- [ ] Deploy updated backend
- [ ] Deploy updated frontend
- [ ] Remove old Vercel URLs

### Business Updates:
- [ ] Update email signatures
- [ ] Update business cards (if needed)
- [ ] Update social profiles
- [ ] Create announcement

## 🚀 Go-Live Sequence

1. **First**: Set up DNS records
2. **Wait**: 15-30 minutes minimum
3. **Test**: Basic domain access
4. **Update**: API endpoints in code
5. **Deploy**: Both frontend and backend
6. **Verify**: Everything works
7. **Announce**: You're live!

## 🆘 If Something Goes Wrong

### Domain not loading:
- Double-check DNS records
- Wait longer (up to 48 hours)
- Try different browser/device
- Check with registrar support

### API not working:
- Verify api.fidenta.io DNS
- Check Vercel deployment
- Review error logs
- Ensure CORS is updated

### Forms not submitting:
- Check browser console
- Verify API endpoint
- Test with Postman
- Check MongoDB connection

## 📱 Quick Test Links (After Setup)

Production:
- Main: https://fidenta.io
- API: https://api.fidenta.io
- Form: https://fidenta.io/templates/business-loan/index-complete.html
- Admin: https://fidenta.io/admin-dashboard.html
- Test: https://fidenta.io/test-lead-submission.html

## 💡 Pro Tips

1. **Screenshot everything** - DNS settings, Vercel config, etc.
2. **Test in incognito** - Avoids cache issues
3. **Keep old URLs working** - For 30 days minimum
4. **Monitor closely** - First 48 hours are critical
5. **Have backup plan** - Know how to revert if needed

---

**Ready to begin?** Start with Phase 1: Purchase fidenta.io!