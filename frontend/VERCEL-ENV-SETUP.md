# 🔧 Vercel Environment Variables Setup

## Backend Project Environment Variables

Go to your **backend** project in Vercel → Settings → Environment Variables

Add/Update these:

```
FRONTEND_URL = https://fidenta.io
MONGODB_URI = mongodb+srv://ydmails:VWojIoccJYW54nGe@cluster0.mxgpgki.mongodb.net/fidenta?retryWrites=true&w=majority&appName=Cluster0
NODE_ENV = production
JWT_SECRET = fidenta-lead-gen-jwt-secret-2025-production

# Optional (for future features)
ADMIN_EMAIL = your-email@example.com
EMAIL_USER = (Gmail address for notifications)
EMAIL_PASSWORD = (Gmail app password)
GOHIGHLEVEL_API_KEY = (When you have it)
STRIPE_SECRET_KEY = (When you set up Stripe)
```

## Frontend Project (No env vars needed)

The frontend uses the hardcoded API URL we just updated.

## After Setting Environment Variables:

1. **Redeploy Backend**: Vercel → Backend Project → Deployments → Redeploy
2. **Check API**: Visit https://api.fidenta.io (should show "Fidenta Lead Generation API")
3. **Test Form**: Visit https://fidenta.io/test-lead-submission.html

## Testing Checklist:

- [ ] https://fidenta.io loads
- [ ] https://www.fidenta.io redirects to fidenta.io
- [ ] https://api.fidenta.io responds
- [ ] Submit test lead form
- [ ] Check admin dashboard
- [ ] Verify MongoDB receives data