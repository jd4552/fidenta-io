// Script to revert all API endpoints to working backend
const fs = require('fs');
const path = require('path');

// Configuration
const WRONG_URL = 'https://api.fidenta.io';
const WORKING_URL = 'https://backend-onttc7h2s-yacovs-projects-7233b556.vercel.app';

// Files to update
const filesToUpdate = [
    'admin-dashboard.html',
    'admin-tools.html',
    'test-lead-submission.html',
    'templates/business-loan/form-handler.js',
    'marketplace/marketplace.js'
];

console.log('🔄 Reverting to working backend URL...\n');

let totalReplacements = 0;

filesToUpdate.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    try {
        // Read file
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Count replacements
        const oldCount = (content.match(new RegExp(WRONG_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        
        if (oldCount > 0) {
            // Replace wrong URL with working URL
            content = content.replace(new RegExp(WRONG_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), WORKING_URL);
            
            // Write updated content
            fs.writeFileSync(fullPath, content, 'utf8');
            
            console.log(`✅ Updated ${filePath}`);
            console.log(`   Replaced ${oldCount} occurrences\n`);
            
            totalReplacements += oldCount;
        } else {
            console.log(`ℹ️  ${filePath} - Already using working URL\n`);
        }
        
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
    }
});

console.log(`\n✨ Revert complete!`);
console.log(`📊 Total replacements: ${totalReplacements}`);
console.log(`\n✅ Your backend is now pointing to the WORKING URL:`);
console.log(`   ${WORKING_URL}`);
console.log(`\n📋 To properly set up api.fidenta.io later:`);
console.log(`1. Create a separate Vercel project for the backend`);
console.log(`2. Set root directory to: 05-websites/lead-gen-pages/backend`);
console.log(`3. Add domain api.fidenta.io to that project`);
console.log(`4. Set environment variables (MongoDB, etc.)`);
console.log(`5. Then update URLs back to api.fidenta.io`);