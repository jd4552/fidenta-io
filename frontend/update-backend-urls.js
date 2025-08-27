// Script to update all backend URLs to Netlify
const fs = require('fs');
const path = require('path');

// Configuration
const OLD_URLS = [
    'https://api.fidenta.io',
    'https://backend-three-omega-83.vercel.app',
    'https://backend-onttc7h2s-yacovs-projects-7233b556.vercel.app',
    'http://localhost:3000'
];
const NEW_URL = 'https://fidenta.netlify.app';

// Files to update
const filesToUpdate = [
    'test-lead-submission.html',
    'admin-dashboard.html',
    'admin-tools.html',
    'templates/business-loan/form-handler.js',
    'marketplace/marketplace.js'
];

console.log('🚀 Updating backend URLs to Netlify...\n');
console.log(`New URL: ${NEW_URL}\n`);

let totalReplacements = 0;

filesToUpdate.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    try {
        if (!fs.existsSync(fullPath)) {
            console.log(`⚠️  ${filePath} - File not found\n`);
            return;
        }
        
        // Read file
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Count and replace each old URL
        let fileReplacements = 0;
        OLD_URLS.forEach(oldUrl => {
            const regex = new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const matches = content.match(regex);
            if (matches) {
                fileReplacements += matches.length;
                content = content.replace(regex, NEW_URL);
            }
        });
        
        if (fileReplacements > 0) {
            // Write updated content
            fs.writeFileSync(fullPath, content, 'utf8');
            
            console.log(`✅ Updated ${filePath}`);
            console.log(`   Replaced ${fileReplacements} occurrences\n`);
            
            totalReplacements += fileReplacements;
        } else {
            console.log(`ℹ️  ${filePath} - No changes needed\n`);
        }
        
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
    }
});

console.log(`\n✨ Update complete!`);
console.log(`📊 Total replacements: ${totalReplacements}`);
console.log(`\n✅ Your frontend is now pointing to:`);
console.log(`   ${NEW_URL}`);