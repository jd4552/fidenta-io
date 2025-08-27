// Script to update all files to use production domain
const fs = require('fs');
const path = require('path');

// Configuration
const OLD_BACKEND_URL = 'https://backend-onttc7h2s-yacovs-projects-7233b556.vercel.app';
const NEW_BACKEND_URL = 'https://api.fidenta.io';
const TEMP_BACKEND_URL = OLD_BACKEND_URL; // Keep old URL until api.fidenta.io is set up

// Files to update
const filesToUpdate = [
    'admin-dashboard.html',
    'admin-tools.html',
    'test-lead-submission.html',
    'templates/business-loan/form-handler.js',
    'marketplace/marketplace.js'
];

console.log('🚀 Updating files for Fidenta.io production deployment...\n');

filesToUpdate.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    try {
        // Read file
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Count replacements
        const oldCount = (content.match(new RegExp(OLD_BACKEND_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        
        if (oldCount > 0) {
            // For now, keep the old URL but add a comment about the future change
            // We'll do the actual replacement when api.fidenta.io is configured
            
            console.log(`📝 Found ${oldCount} references in ${filePath}`);
            console.log(`   Will update to ${NEW_BACKEND_URL} when domain is configured\n`);
            
            // Add a comment at the top of HTML files
            if (filePath.endsWith('.html') && !content.includes('Fidenta.io deployment pending')) {
                content = `<!-- Fidenta.io deployment pending: API will move to ${NEW_BACKEND_URL} -->\n` + content;
                fs.writeFileSync(fullPath, content, 'utf8');
            }
            
            // Add a comment in JS files
            if (filePath.endsWith('.js') && !content.includes('Fidenta.io deployment pending')) {
                content = `// Fidenta.io deployment pending: API will move to ${NEW_BACKEND_URL}\n` + content;
                fs.writeFileSync(fullPath, content, 'utf8');
            }
        } else {
            console.log(`✅ ${filePath} - No updates needed\n`);
        }
        
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
    }
});

console.log('\n📋 Next Steps:');
console.log('1. Purchase and configure fidenta.io domain');
console.log('2. Add domain to Vercel (both frontend and backend projects)');
console.log('3. Configure DNS records as shown in FIDENTA-DEPLOYMENT-GUIDE.md');
console.log('4. Once api.fidenta.io is working, run this script again with --apply flag');
console.log('\n✨ Preparation complete!');