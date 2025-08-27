// Script to update all API endpoints to the new backend
const fs = require('fs');
const path = require('path');

// Configuration - Use the Vercel backend URL
const OLD_URL = 'https://backend-onttc7h2s-yacovs-projects-7233b556.vercel.app';
const NEW_URL = 'https://backend-three-omega-83.vercel.app';
// Alternative: Use api.fidenta.io once DNS is working
// const NEW_URL = 'https://api.fidenta.io';

// Files to update
const filesToUpdate = [
    'admin-dashboard.html',
    'admin-tools.html',
    'test-lead-submission.html',
    'templates/business-loan/form-handler.js',
    'marketplace/marketplace.js'
];

console.log('🚀 Updating to new backend URL...\n');
console.log(`Old URL: ${OLD_URL}`);
console.log(`New URL: ${NEW_URL}\n`);

let totalReplacements = 0;

filesToUpdate.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    try {
        // Read file
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Count replacements
        const oldCount = (content.match(new RegExp(OLD_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        
        if (oldCount > 0) {
            // Replace old URL with new URL
            content = content.replace(new RegExp(OLD_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), NEW_URL);
            
            // Write updated content
            fs.writeFileSync(fullPath, content, 'utf8');
            
            console.log(`✅ Updated ${filePath}`);
            console.log(`   Replaced ${oldCount} occurrences\n`);
            
            totalReplacements += oldCount;
        } else {
            console.log(`ℹ️  ${filePath} - No changes needed\n`);
        }
        
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
    }
});

console.log(`\n✨ Update complete!`);
console.log(`📊 Total replacements: ${totalReplacements}`);
console.log(`\n✅ Your backend is now pointing to:`);
console.log(`   ${NEW_URL}`);
console.log(`\n📋 Next steps:`);
console.log(`1. Commit and push these changes`);
console.log(`2. Wait for Vercel to redeploy the frontend`);
console.log(`3. Test at https://fidenta.io/test-lead-submission.html`);
console.log(`\n💡 Note: The backend at ${NEW_URL} is already configured with CORS to accept requests from fidenta.io`);