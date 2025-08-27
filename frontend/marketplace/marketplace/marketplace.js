// Fidenta.io deployment pending: API will move to https://backend-three-omega-83.vercel.app
// Marketplace JavaScript - Frontend Logic
const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api/marketplace'
    : 'https://backend-three-omega-83.vercel.app/api/marketplace';
let stripe = null;
let cardElement = null;
let currentUser = null;
let selectedLeadId = null;
let selectedPrice = 0;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadMarketplaceData();
    initializeStripe();
    loadLeads();
});

// Authentication
async function checkAuth() {
    const token = localStorage.getItem('brokerToken');
    if (!token) {
        window.location.href = '/marketplace/auth.html';
        return;
    }
    
    try {
        const response = await fetch('/api/brokers/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Auth failed');
        }
        
        currentUser = await response.json();
        updateBalanceDisplay();
    } catch (error) {
        localStorage.removeItem('brokerToken');
        window.location.href = '/marketplace/auth.html';
    }
}

// Update balance display
function updateBalanceDisplay() {
    if (currentUser && currentUser.creditBalance !== undefined) {
        document.getElementById('creditBalance').textContent = currentUser.creditBalance.toFixed(2);
    }
}

// Load marketplace statistics
async function loadMarketplaceData() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const stats = await response.json();
        
        document.getElementById('availableLeads').textContent = stats.totalAvailable || 0;
        
        // Update industry counts if available
        if (stats.byIndustry) {
            // Update the stats bar with real data
            const statsBar = document.querySelector('.bg-gradient-to-r');
            if (statsBar) {
                const industryText = Object.entries(stats.byIndustry)
                    .slice(0, 3)
                    .map(([industry, count]) => `${industry}: <span class="font-bold">${count}</span>`)
                    .join(' | ');
                // Update industry counts display
            }
        }
    } catch (error) {
        console.error('Failed to load marketplace stats:', error);
    }
}

// Initialize Stripe
function initializeStripe() {
    // Initialize with your publishable key
    stripe = Stripe('pk_test_51234567890'); // Replace with actual key
    const elements = stripe.elements();
    
    cardElement = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                    color: '#aab7c4',
                },
            },
        },
    });
}

// Load and display leads
async function loadLeads(filters = {}) {
    try {
        const queryParams = new URLSearchParams(filters);
        const response = await fetch(`${API_BASE}/leads?${queryParams}`);
        const leads = await response.json();
        
        displayLeads(leads);
    } catch (error) {
        console.error('Failed to load leads:', error);
        showNotification('Failed to load leads', 'error');
    }
}

// Display leads in the grid
function displayLeads(leads) {
    const grid = document.getElementById('leadGrid');
    
    if (leads.length === 0) {
        grid.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-inbox text-6xl mb-4"></i>
                <p class="text-xl">No leads match your criteria</p>
                <p class="text-sm mt-2">Try adjusting your filters</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = leads.map(lead => createLeadCard(lead)).join('');
}

// Create a lead card HTML
function createLeadCard(lead) {
    const tierBadge = getTierBadge(lead.scoringTier);
    const price = calculateLeadPrice(lead);
    const urgencyClass = getUrgencyClass(lead.urgency);
    
    return `
        <div class="lead-card bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-start mb-4">
                <div class="tier-badge ${tierBadge.class} text-white px-3 py-1 rounded-full text-sm font-bold">
                    ${tierBadge.icon} ${tierBadge.text}
                </div>
                <div class="text-2xl font-bold text-gray-900">$${price}</div>
            </div>
            
            <div class="mb-4">
                <h4 class="text-lg font-semibold text-gray-900">
                    ${lead.industry} • ${lead.city}, ${lead.state}
                </h4>
                <div class="text-gray-600 mt-2 space-y-1">
                    <div>Revenue: $${formatNumber(lead.annualRevenue)}/year</div>
                    <div>Seeking: $${formatNumber(lead.loanAmount)} ${lead.loanPurpose}</div>
                    <div>Time in Business: <span class="blur-text">${lead.timeInBusiness} years</span></div>
                </div>
            </div>

            <div class="border-t pt-4 mb-4">
                <div class="grid grid-cols-2 gap-2 text-sm">
                    ${getVerificationBadges(lead)}
                    <div class="flex items-center ${urgencyClass.color} font-semibold">
                        <i class="fas ${urgencyClass.icon} mr-2"></i>
                        ${urgencyClass.text}
                    </div>
                </div>
            </div>

            <div class="flex gap-2">
                <button onclick="previewLead('${lead._id}')" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold">
                    Preview Details
                </button>
                <button onclick="purchaseLead('${lead._id}', ${price})" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold">
                    Buy Now $${price}
                </button>
            </div>
        </div>
    `;
}

// Get tier badge details
function getTierBadge(tier) {
    const tiers = {
        'PLATINUM': { icon: '🏆', text: 'A+ PREMIUM', class: '' },
        'GOLD': { icon: '⭐', text: 'A QUALITY', class: 'gold' },
        'SILVER': { icon: '💎', text: 'B+ GOOD', class: 'silver' },
        'BRONZE': { icon: '🥉', text: 'B STANDARD', class: 'bronze' },
        'STANDARD': { icon: '📋', text: 'C+ FAIR', class: 'bronze' },
        'BASIC': { icon: '📄', text: 'C BASIC', class: 'bronze' }
    };
    return tiers[tier] || tiers['BASIC'];
}

// Calculate lead price
function calculateLeadPrice(lead) {
    const basePrices = {
        'PLATINUM': 150,
        'GOLD': 100,
        'SILVER': 75,
        'BRONZE': 50,
        'STANDARD': 25,
        'BASIC': 10
    };
    
    let price = basePrices[lead.scoringTier] || 10;
    
    // Document multiplier
    if (lead.hasDocuments) {
        price *= 2.5;
    }
    
    // Urgency multiplier
    if (lead.urgency === 'today') {
        price *= 1.5;
    } else if (lead.urgency === 'week') {
        price *= 1.2;
    }
    
    // Exclusive pricing
    if (lead.isExclusive) {
        price *= 3;
    }
    
    return Math.round(price);
}

// Get urgency class for styling
function getUrgencyClass(urgency) {
    const classes = {
        'today': { color: 'text-red-600', icon: 'fa-bolt', text: 'URGENT - Today' },
        'week': { color: 'text-orange-600', icon: 'fa-clock', text: 'This Week' },
        'month': { color: 'text-gray-600', icon: 'fa-calendar', text: 'This Month' }
    };
    return classes[urgency] || classes['month'];
}

// Get verification badges HTML
function getVerificationBadges(lead) {
    const badges = [];
    
    if (lead.bankStatementsVerified) {
        badges.push(`
            <div class="flex items-center text-green-600">
                <i class="fas fa-check-circle mr-2"></i>
                Bank Statements Verified
            </div>
        `);
    }
    
    if (lead.taxReturnsAvailable) {
        badges.push(`
            <div class="flex items-center text-green-600">
                <i class="fas fa-check-circle mr-2"></i>
                Tax Returns Available
            </div>
        `);
    }
    
    if (lead.creditScore >= 700) {
        badges.push(`
            <div class="flex items-center text-green-600">
                <i class="fas fa-check-circle mr-2"></i>
                ${lead.creditScore}+ Credit Score
            </div>
        `);
    } else if (lead.creditScore >= 650) {
        badges.push(`
            <div class="flex items-center text-yellow-600">
                <i class="fas fa-exclamation-circle mr-2"></i>
                ${lead.creditScore}+ Credit Score
            </div>
        `);
    }
    
    if (lead.timeInBusiness >= 3) {
        badges.push(`
            <div class="flex items-center text-green-600">
                <i class="fas fa-check-circle mr-2"></i>
                ${lead.timeInBusiness} Years in Business
            </div>
        `);
    }
    
    return badges.join('');
}

// Preview lead details
async function previewLead(leadId) {
    try {
        const response = await fetch(`${API_BASE}/leads/${leadId}/preview`);
        const lead = await response.json();
        
        const modal = document.getElementById('previewModal');
        const content = document.getElementById('previewContent');
        
        content.innerHTML = `
            <div class="space-y-4">
                <div class="bg-gray-50 rounded-lg p-4">
                    <h4 class="font-semibold text-gray-900 mb-2">Business Information</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-500">Industry:</span>
                            <span class="ml-2 font-medium">${lead.industry}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Location:</span>
                            <span class="ml-2 font-medium">${lead.city}, ${lead.state}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Annual Revenue:</span>
                            <span class="ml-2 font-medium">$${formatNumber(lead.annualRevenue)}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Time in Business:</span>
                            <span class="ml-2 font-medium blur-text">${lead.timeInBusiness} years</span>
                        </div>
                    </div>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-4">
                    <h4 class="font-semibold text-gray-900 mb-2">Funding Requirements</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-500">Loan Amount:</span>
                            <span class="ml-2 font-medium">$${formatNumber(lead.loanAmount)}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Purpose:</span>
                            <span class="ml-2 font-medium">${lead.loanPurpose}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Urgency:</span>
                            <span class="ml-2 font-medium">${lead.urgency}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Credit Range:</span>
                            <span class="ml-2 font-medium">${lead.creditScore}+</span>
                        </div>
                    </div>
                </div>
                
                <div class="bg-blue-50 rounded-lg p-4">
                    <div class="flex justify-between items-center">
                        <div>
                            <h4 class="font-semibold text-gray-900">Lead Quality Score</h4>
                            <p class="text-sm text-gray-600 mt-1">Based on 15+ data points</p>
                        </div>
                        <div class="text-right">
                            <div class="text-3xl font-bold text-blue-600">${lead.qualityScore}/100</div>
                            <div class="text-sm text-gray-600">${lead.scoringTier}</div>
                        </div>
                    </div>
                </div>
                
                <p class="text-sm text-gray-500 italic">
                    * Some information is hidden until purchase. Full contact details and business name will be revealed after payment.
                </p>
            </div>
        `;
        
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Failed to preview lead:', error);
        showNotification('Failed to load preview', 'error');
    }
}

// Purchase lead
async function purchaseLead(leadId, price) {
    selectedLeadId = leadId;
    selectedPrice = price;
    
    const modal = document.getElementById('purchaseModal');
    const details = document.getElementById('purchaseDetails');
    
    // Check if user has sufficient balance
    if (currentUser.creditBalance >= price) {
        details.innerHTML = `
            <div class="bg-gray-50 rounded-lg p-4">
                <p class="text-gray-700 mb-4">You are about to purchase this lead for:</p>
                <div class="text-3xl font-bold text-gray-900 mb-4">$${price}</div>
                <div class="bg-green-50 border border-green-200 rounded p-3">
                    <p class="text-green-800 text-sm">
                        <i class="fas fa-check-circle mr-2"></i>
                        Your current balance: $${currentUser.creditBalance.toFixed(2)}
                    </p>
                    <p class="text-green-800 text-sm mt-1">
                        <i class="fas fa-wallet mr-2"></i>
                        Balance after purchase: $${(currentUser.creditBalance - price).toFixed(2)}
                    </p>
                </div>
            </div>
        `;
    } else {
        details.innerHTML = `
            <div class="bg-gray-50 rounded-lg p-4">
                <p class="text-gray-700 mb-4">You are about to purchase this lead for:</p>
                <div class="text-3xl font-bold text-gray-900 mb-4">$${price}</div>
                <div class="bg-red-50 border border-red-200 rounded p-3">
                    <p class="text-red-800 text-sm">
                        <i class="fas fa-exclamation-circle mr-2"></i>
                        Insufficient balance: $${currentUser.creditBalance.toFixed(2)}
                    </p>
                    <p class="text-red-800 text-sm mt-1">
                        <i class="fas fa-plus-circle mr-2"></i>
                        You need to add $${(price - currentUser.creditBalance).toFixed(2)} more credits
                    </p>
                </div>
                <button onclick="showAddCreditsModal()" class="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold">
                    Add Credits Now
                </button>
            </div>
        `;
    }
    
    modal.classList.remove('hidden');
}

// Confirm purchase
async function confirmPurchase() {
    if (currentUser.creditBalance < selectedPrice) {
        showNotification('Insufficient credits. Please add more credits.', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('brokerToken');
        const response = await fetch(`${API_BASE}/purchase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                leadId: selectedLeadId,
                useCredits: true
            })
        });
        
        if (!response.ok) {
            throw new Error('Purchase failed');
        }
        
        const result = await response.json();
        
        // Update user balance
        currentUser.creditBalance = result.newBalance;
        updateBalanceDisplay();
        
        // Show success message
        showNotification('Lead purchased successfully!', 'success');
        
        // Close modal
        closePurchaseModal();
        
        // Show lead details
        showPurchasedLeadDetails(result.lead);
        
        // Refresh leads
        loadLeads();
        
    } catch (error) {
        console.error('Purchase failed:', error);
        showNotification('Failed to complete purchase', 'error');
    }
}

// Show purchased lead details
function showPurchasedLeadDetails(lead) {
    const modal = document.getElementById('previewModal');
    const content = document.getElementById('previewContent');
    
    content.innerHTML = `
        <div class="space-y-4">
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 class="font-semibold text-green-800 mb-2">
                    <i class="fas fa-check-circle mr-2"></i>
                    Purchase Successful!
                </h4>
                <p class="text-green-700 text-sm">Lead details have been sent to your email.</p>
            </div>
            
            <div class="bg-white border rounded-lg p-4">
                <h4 class="font-semibold text-gray-900 mb-3">Contact Information</h4>
                <div class="space-y-2">
                    <div class="flex items-center">
                        <i class="fas fa-building text-gray-400 w-6"></i>
                        <span class="ml-2 font-medium">${lead.businessName}</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-user text-gray-400 w-6"></i>
                        <span class="ml-2">${lead.contactName}</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-phone text-gray-400 w-6"></i>
                        <span class="ml-2">${lead.phone}</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-envelope text-gray-400 w-6"></i>
                        <span class="ml-2">${lead.email}</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-map-marker-alt text-gray-400 w-6"></i>
                        <span class="ml-2">${lead.address}</span>
                    </div>
                </div>
            </div>
            
            <div class="flex gap-2">
                <button onclick="downloadLeadPDF('${lead._id}')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold">
                    <i class="fas fa-download mr-2"></i>
                    Download PDF
                </button>
                <button onclick="closePreviewModal()" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold">
                    Close
                </button>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

// Apply filters
function applyFilters() {
    const filters = {};
    
    // Lead type
    const leadType = document.querySelector('input[name="leadType"]:checked').value;
    if (leadType !== 'all') {
        filters.leadType = leadType;
    }
    
    // Price range
    const priceRanges = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
        .filter(cb => cb.value.includes('-') || cb.value.includes('+'))
        .map(cb => cb.value);
    if (priceRanges.length > 0) {
        filters.priceRange = priceRanges.join(',');
    }
    
    // Industries
    const industries = Array.from(document.querySelectorAll('input[value="restaurant"]:checked, input[value="medical"]:checked, input[value="construction"]:checked, input[value="retail"]:checked, input[value="transportation"]:checked'))
        .map(cb => cb.value);
    if (industries.length > 0) {
        filters.industries = industries.join(',');
    }
    
    // Urgency
    const urgencies = Array.from(document.querySelectorAll('input[value="today"]:checked, input[value="week"]:checked, input[value="month"]:checked'))
        .map(cb => cb.value);
    if (urgencies.length > 0) {
        filters.urgency = urgencies.join(',');
    }
    
    loadLeads(filters);
}

// Show add credits modal
function showAddCreditsModal() {
    const modal = document.getElementById('creditsModal');
    
    // Mount Stripe card element
    if (cardElement && !cardElement._mounted) {
        cardElement.mount('#stripeCardElement');
    }
    
    modal.classList.remove('hidden');
}

// Select credit package
let selectedCreditAmount = 0;
let selectedCreditBonus = 0;

function selectCreditPackage(amount, bonus) {
    selectedCreditAmount = amount;
    selectedCreditBonus = bonus;
    
    // Update UI to show selection
    document.querySelectorAll('#creditsModal button[onclick^="selectCreditPackage"]').forEach(btn => {
        btn.classList.remove('border-blue-500', 'bg-blue-50');
        btn.classList.add('border-gray-200');
    });
    
    event.target.classList.remove('border-gray-200');
    event.target.classList.add('border-blue-500', 'bg-blue-50');
}

// Process payment
async function processPayment() {
    if (!selectedCreditAmount) {
        showNotification('Please select a credit package', 'error');
        return;
    }
    
    try {
        // Create payment intent
        const token = localStorage.getItem('brokerToken');
        const response = await fetch('/api/stripe/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                amount: selectedCreditAmount,
                bonus: selectedCreditBonus
            })
        });
        
        const { clientSecret } = await response.json();
        
        // Confirm payment with Stripe
        const { error } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement
            }
        });
        
        if (error) {
            throw error;
        }
        
        // Update balance
        currentUser.creditBalance += selectedCreditAmount + selectedCreditBonus;
        updateBalanceDisplay();
        
        showNotification(`Successfully added $${selectedCreditAmount + selectedCreditBonus} in credits!`, 'success');
        closeCreditsModal();
        
    } catch (error) {
        console.error('Payment failed:', error);
        showNotification(error.message || 'Payment failed', 'error');
    }
}

// Utility functions
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                'fa-info-circle'
            } mr-2"></i>
            ${message}
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Modal close functions
function closePreviewModal() {
    document.getElementById('previewModal').classList.add('hidden');
}

function closePurchaseModal() {
    document.getElementById('purchaseModal').classList.add('hidden');
}

function closeCreditsModal() {
    document.getElementById('creditsModal').classList.add('hidden');
    // Reset selection
    selectedCreditAmount = 0;
    selectedCreditBonus = 0;
}

function closeDashboardModal() {
    document.getElementById('dashboardModal').classList.add('hidden');
}

// Show broker dashboard
async function showBrokerDashboard() {
    document.getElementById('dashboardModal').classList.remove('hidden');
    // Load dashboard data
    await loadDashboardData();
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('brokerToken');
        const response = await fetch('/api/brokers/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        // Update dashboard with real data
        // This would populate the stats and purchase history
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

// Load more leads
async function loadMoreLeads() {
    // Implement pagination
    const currentLeads = document.querySelectorAll('.lead-card').length;
    const filters = { skip: currentLeads };
    
    const response = await fetch(`${API_BASE}/leads?skip=${currentLeads}`);
    const moreLeads = await response.json();
    
    const grid = document.getElementById('leadGrid');
    moreLeads.forEach(lead => {
        grid.insertAdjacentHTML('beforeend', createLeadCard(lead));
    });
}

// Download lead as PDF
async function downloadLeadPDF(leadId) {
    try {
        const token = localStorage.getItem('brokerToken');
        const response = await fetch(`${API_BASE}/leads/${leadId}/download`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lead-${leadId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Failed to download PDF:', error);
        showNotification('Failed to download PDF', 'error');
    }
}

// Logout
function logout() {
    localStorage.removeItem('brokerToken');
    window.location.href = '/marketplace/auth.html';
}