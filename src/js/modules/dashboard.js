// Dashboard Module

function showDashboard() {
    const stats = {
        activeDeclarations: declarations.filter(d => d.status === 'pending').length,
        underReview: declarations.filter(d => d.status === 'review').length,
        approved: declarations.filter(d => d.status === 'approved').length,
        rejected: declarations.filter(d => d.status === 'rejected').length,
        totalValue: declarations.reduce((sum, d) => sum + d.value, 0),
        totalDuty: declarations.reduce((sum, d) => {
            const hsData = sampleData.hsCodes.find(h => h.code === d.hsCode);
            const dutyRate = hsData ? hsData.duty : 15;
            return sum + (d.value * dutyRate / 100);
        }, 0)
    };
    
    const recentDeclarations = declarations.slice(0, 5);
    
    const content = `
        <div class="dashboard-cards">
            <div class="card">
                <h3>📋 Active Declarations</h3>
                <div class="number">${stats.activeDeclarations}</div>
                <small>Pending clearance</small>
            </div>
            <div class="card">
                <h3>🔄 Under Review</h3>
                <div class="number">${stats.underReview}</div>
                <small>Being processed</small>
            </div>
            <div class="card">
                <h3>✅ Approved</h3>
                <div class="number">${stats.approved}</div>
                <small>Completed clearances</small>
            </div>
            <div class="card">
                <h3>💰 Total Value</h3>
                <div class="number">${formatCurrency(stats.totalValue)}</div>
                <small>All declarations</small>
            </div>
            <div class="card">
                <h3>🏦 Total Duty</h3>
                <div class="number">${formatCurrency(stats.totalDuty)}</div>
                <small>Collected revenue</small>
            </div>
            <div class="card">
                <h3>❌ Rejected</h3>
                <div class="number">${stats.rejected}</div>
                <small>Needs correction</small>
            </div>
        </div>
        
        <div class="data-table">
            <div style="padding: 15px; border-bottom: 1px solid var(--light);">
                <h3 style="display: inline-block;">Recent Declarations</h3>
                <button class="btn btn-primary" style="float: right;" onclick="showNewDeclaration()">+ New Declaration</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Declaration ID</th>
                        <th>Date</th>
                        <th>Goods</th>
                        <th>HS Code</th>
                        <th>Value</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentDeclarations.map(dec => `
                        <tr>
                            <td><strong>${dec.id}</strong></td>
                            <td>${formatDate(dec.date)}</td>
                            <td>${dec.goods.substring(0, 30)}${dec.goods.length > 30 ? '...' : ''}</td>
                            <td>${dec.hsCode}</td>
                            <td>${formatCurrency(dec.value)}</td>
                            <td>${getStatusBadge(dec.status)}</td>
                            <td>
                                <button class="btn btn-primary btn-sm" onclick="viewConsignmentDetails('${dec.id}')">View</button>
                             </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="dashboard-cards" style="margin-top: 20px;">
            <div class="card">
                <h3>🤖 AI Customs Assistant</h3>
                <p>Get help with customs procedures, documentation, and regulations</p>
                <button class="btn btn-primary" onclick="openChatbot()">Ask AI Assistant</button>
            </div>
            <div class="card">
                <h3>🔍 HS Code Finder</h3>
                <p>Find the correct HS code classification for your products</p>
                <button class="btn btn-primary" onclick="openHSFinder()">Search HS Code</button>
            </div>
            <div class="card">
                <h3>⚠️ Risk Assessment</h3>
                <p>Check risk level for your consignment</p>
                <button class="btn btn-primary" onclick="checkRisk()">Assess Risk</button>
            </div>
        </div>
    `;
    
    document.getElementById('mainContent').innerHTML = content;
}

function checkRisk() {
    showAlert('Risk assessment feature: Enter declaration ID to check risk level', 'info');
}

// Export functions
window.showDashboard = showDashboard;
window.checkRisk = checkRisk;