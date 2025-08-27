// Script to update all API endpoints to production
const fs = require('fs');
const path = require('path');

// Configuration
const OLD_BACKEND_URL = 'https://backend-onttc7h2s-yacovs-projects-7233b556.vercel.app';
const NEW_BACKEND_URL = 'https://api.fidenta.io';

// Files to update
const filesToUpdate = [
    'admin-dashboard.html',
    'admin-tools.html',
    'test-lead-submission.html',
    'templates/business-loan/form-handler.js',
    'marketplace/marketplace.js'
];

console.log('🚀 Updating API endpoints to production (api.fidenta.io)...\n');

let totalReplacements = 0;

filesToUpdate.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    try {
        // Read file
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Count replacements
        const oldCount = (content.match(new RegExp(OLD_BACKEND_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        
        if (oldCount > 0) {
            // Replace old URL with new URL
            content = content.replace(new RegExp(OLD_BACKEND_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), NEW_BACKEND_URL);
            
            // Write updated content
            fs.writeFileSync(fullPath, content, 'utf8');
            
            console.log(`✅ Updated ${filePath}`);
            console.log(`   Replaced ${oldCount} occurrences`);
            console.log(`   Old: ${OLD_BACKEND_URL}`);
            console.log(`   New: ${NEW_BACKEND_URL}\n`);
            
            totalReplacements += oldCount;
        } else {
            console.log(`ℹ️  ${filePath} - No changes needed (already updated or no URLs found)\n`);
        }
        
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
    }
});

console.log(`\n✨ Update complete!`);
console.log(`📊 Total replacements: ${totalReplacements}`);
console.log(`\n📋 Next steps:`);
console.log(`1. Commit these changes: git add . && git commit -m "Update API endpoints to api.fidenta.io"`);
console.log(`2. Push to GitHub: git push`);
console.log(`3. Vercel will auto-deploy the changes`);
console.log(`4. Test the live site at https://fidenta.io`);
console.log(`\n⏰ Note: DNS propagation may take 5-30 minutes. Check status at https://dnschecker.org`);