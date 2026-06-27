// Payments Module

function showPayments() {
    const totalPaid = payments.reduce((sum, p) => sum + (p.status === 'paid' ? p.amount : 0), 0);
    const totalPending = payments.reduce((sum, p) => sum + (p.status === 'pending' ? p.amount : 0), 0);
    
    const content = `
        <div class="dashboard-cards">
            <div class="card">
                <h3>💰 Total Paid</h3>
                <div class="number">${formatCurrency(totalPaid)}</div>
                <small>All time revenue</small>
            </div>
            <div class="card">
                <h3>⏳ Pending Payments</h3>
                <div class="number">${formatCurrency(totalPending)}</div>
                <small>Awaiting clearance</small>
            </div>
            <div class="card">
                <h3>📊 Total Transactions</h3>
                <div class="number">${payments.length}</div>
                <small>Payment records</small>
            </div>
        </div>
        
        <div class="data-table">
            <div style="padding: 15px; border-bottom: 1px solid var(--light);">
                <h3 style="display: inline-block;">Payment History</h3>
                <button class="btn btn-primary" style="float: right;" onclick="calculateDuty()">Calculate Duty</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Payment ID</th>
                        <th>Declaration ID</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Receipt</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.map(pay => `
                        <tr>
                            <td>${pay.id}</td>
                            <td>${pay.declarationId}</td>
                            <td>${formatCurrency(pay.amount)}</td>
                            <td>${pay.method || 'N/A'}</td>
                            <td>${formatDate(pay.date)}</td>
                            <td>${getStatusBadge(pay.status)}</td>
                            <td>
                                ${pay.status === 'paid' ? `<button class="btn btn-info btn-sm" onclick="downloadReceipt('${pay.id}')">Download Receipt</button>` : 'N/A'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="card" style="margin-top: 20px;">
            <h3>💳 Make a Payment</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Declaration ID</label>
                    <select id="paymentDeclarationId">
                        <option value="">Select Declaration</option>
                        ${declarations.filter(d => d.status === 'pending').map(d => `
                            <option value="${d.id}">${d.id} - ${d.goods.substring(0, 30)} - ${formatCurrency(d.value)}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Payment Method</label>
                    <select id="newPaymentMethod">
                        <option>Bank Transfer</option>
                        <option>Mobile Money</option>
                        <option>Credit Card</option>
                        <option>Cash</option>
                    </select>
                </div>
            </div>
            <button class="btn btn-primary" onclick="initiatePayment()">Proceed to Payment</button>
        </div>
    `;
    
    document.getElementById('mainContent').innerHTML = content;
}

function calculateDuty() {
    const modalHtml = `
        <div class="modal show" id="dutyCalculatorModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Duty Calculator</h3>
                    <button class="close-btn" onclick="closeModal('dutyCalculatorModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>HS Code</label>
                        <input type="text" id="calcHsCode" placeholder="Enter HS Code">
                        <small>e.g., 8471.30, 8703.23</small>
                    </div>
                    <div class="form-group">
                        <label>CIF Value (USD)</label>
                        <input type="number" id="calcValue" placeholder="Enter value">
                    </div>
                    <div id="calcResult" style="margin-top: 20px; display: none;">
                        <div style="background: var(--light); padding: 15px; border-radius: 8px;">
                            <p><strong>Duty Rate:</strong> <span id="calcRate">-</span></p>
                            <p><strong>Duty Amount:</strong> <span id="calcDuty">-</span></p>
                            <p><strong>Total Payable:</strong> <span id="calcTotal">-</span></p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="performDutyCalculation()">Calculate</button>
                    <button class="btn btn-secondary" onclick="closeModal('dutyCalculatorModal')">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function performDutyCalculation() {
    const hsCode = document.getElementById('calcHsCode').value;
    const value = parseFloat(document.getElementById('calcValue').value);
    
    if (!hsCode || !value) {
        showAlert('Please enter both HS Code and Value', 'warning');
        return;
    }
    
    const hsData = sampleData.hsCodes.find(h => h.code === hsCode);
    const rate = hsData ? hsData.duty : 15;
    const duty = (value * rate) / 100;
    const total = value + duty;
    
    document.getElementById('calcRate').innerHTML = `${rate}%`;
    document.getElementById('calcDuty').innerHTML = formatCurrency(duty);
    document.getElementById('calcTotal').innerHTML = formatCurrency(total);
    document.getElementById('calcResult').style.display = 'block';
}

function initiatePayment() {
    const declarationId = document.getElementById('paymentDeclarationId').value;
    const paymentMethod = document.getElementById('newPaymentMethod').value;
    
    if (!declarationId) {
        showAlert('Please select a declaration', 'warning');
        return;
    }
    
    const declaration = declarations.find(d => d.id === declarationId);
    if (!declaration) {
        showAlert('Declaration not found', 'danger');
        return;
    }
    
    const hsData = sampleData.hsCodes.find(h => h.code === declaration.hsCode);
    const dutyRate = hsData ? hsData.duty : 15;
    const dutyAmount = (declaration.value * dutyRate) / 100;
    const totalAmount = declaration.value + dutyAmount;
    
    const newPayment = {
        id: generateId('PAY'),
        declarationId: declarationId,
        amount: totalAmount,
        status: 'paid',
        date: new Date().toISOString().split('T')[0],
        method: paymentMethod
    };
    
    payments.push(newPayment);
    declaration.status = 'approved';
    
    showAlert(`Payment of ${formatCurrency(totalAmount)} completed successfully!`, 'success');
    showPayments();
}

function downloadReceipt(paymentId) {
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
        const receipt = `
            ACSS - SOUTH SUDAN CUSTOMS SERVICE
            =================================
            RECEIPT OF PAYMENT
            Payment ID: ${payment.id}
            Declaration ID: ${payment.declarationId}
            Amount: ${formatCurrency(payment.amount)}
            Date: ${payment.date}
            Method: ${payment.method}
            =================================
            Thank you for using ACSS
        `;
        showAlert('Receipt would be downloaded as PDF', 'info');
    }
}

window.showPayments = showPayments;
window.calculateDuty = calculateDuty;
window.performDutyCalculation = performDutyCalculation;
window.initiatePayment = initiatePayment;
window.downloadReceipt = downloadReceipt;