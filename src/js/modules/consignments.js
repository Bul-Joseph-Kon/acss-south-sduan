// Consignment Management Module

function showConsignments() {
    const content = `
        <div class="card" style="margin-bottom: 20px;">
            <button class="btn btn-primary" onclick="showNewDeclaration()">+ New Consignment</button>
        </div>
        <div class="tabs">
            <button class="tab active" onclick="showConsignmentTab('all')">All</button>
            <button class="tab" onclick="showConsignmentTab('draft')">Drafts</button>
            <button class="tab" onclick="showConsignmentTab('pending')">Pending</button>
            <button class="tab" onclick="showConsignmentTab('review')">Under Review</button>
            <button class="tab" onclick="showConsignmentTab('approved')">Approved</button>
            <button class="tab" onclick="showConsignmentTab('rejected')">Rejected</button>
        </div>
        <div id="consignmentContent"></div>
    `;
    document.getElementById('mainContent').innerHTML = content;
    showConsignmentTab('all');
}

function showConsignmentTab(status) {
    let filtered = declarations;
    if (status !== 'all') {
        filtered = declarations.filter(d => d.status === status);
    }
    
    if (filtered.length === 0) {
        document.getElementById('consignmentContent').innerHTML = `
            <div class="card text-center" style="padding: 40px;">
                <p>No ${status !== 'all' ? status : ''} consignments found.</p>
                <button class="btn btn-primary" onclick="showNewDeclaration()">Create New Consignment</button>
            </div>
        `;
        return;
    }
    
    const html = `
        <div class="data-table">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Goods Description</th>
                        <th>HS Code</th>
                        <th>Quantity</th>
                        <th>Value</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(dec => `
                        <tr>
                            <td><strong>${dec.id}</strong></td>
                            <td>${formatDate(dec.date)}</td>
                            <td>${dec.goods.substring(0, 30)}${dec.goods.length > 30 ? '...' : ''}</td>
                            <td>${dec.hsCode}</td>
                            <td>${dec.quantity || 'N/A'} ${dec.unit || ''}</td>
                            <td>${formatCurrency(dec.value)}</td>
                            <td>${getStatusBadge(dec.status)}</td>
                            <td>
                                <button class="btn btn-primary btn-sm" onclick="editConsignment('${dec.id}')">Edit</button>
                                <button class="btn btn-info btn-sm" onclick="viewConsignmentDetails('${dec.id}')">View</button>
                                ${dec.status === 'pending' ? `<button class="btn btn-danger btn-sm" onclick="deleteConsignment('${dec.id}')">Delete</button>` : ''}
                             </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    document.getElementById('consignmentContent').innerHTML = html;
}

function editConsignment(id) {
    const declaration = declarations.find(d => d.id === id);
    if (!declaration) {
        showAlert('Consignment not found', 'danger');
        return;
    }
    
    const modalHtml = `
        <div class="modal show" id="editDeclarationModal">
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3>Edit Consignment: ${id}</h3>
                    <button class="close-btn" onclick="closeModal('editDeclarationModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editDeclarationForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label>HS Code *</label>
                                <input type="text" id="editHsCode" value="${declaration.hsCode}" required>
                            </div>
                            <div class="form-group">
                                <label>Goods Description *</label>
                                <textarea id="editGoodsDesc" rows="2" required>${declaration.goods}</textarea>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Quantity *</label>
                                <input type="number" id="editQuantity" value="${declaration.quantity || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>Unit</label>
                                <select id="editUnit">
                                    <option ${declaration.unit === 'KG' ? 'selected' : ''}>KG</option>
                                    <option ${declaration.unit === 'PCS' ? 'selected' : ''}>PCS</option>
                                    <option ${declaration.unit === 'LTR' ? 'selected' : ''}>LTR</option>
                                    <option ${declaration.unit === 'CTN' ? 'selected' : ''}>CTN</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Value (USD) *</label>
                                <input type="number" id="editValue" value="${declaration.value}" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Country of Origin</label>
                                <select id="editOrigin">
                                    ${sampleData.countries.map(c => `<option ${declaration.origin === c ? 'selected' : ''}>${c}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Port of Entry</label>
                                <select id="editPort">
                                    ${sampleData.ports.map(p => `<option ${declaration.port === p ? 'selected' : ''}>${p}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select id="editStatus">
                                <option ${declaration.status === 'draft' ? 'selected' : ''} value="draft">Draft</option>
                                <option ${declaration.status === 'pending' ? 'selected' : ''} value="pending">Pending</option>
                                <option ${declaration.status === 'review' ? 'selected' : ''} value="review">Under Review</option>
                                <option ${declaration.status === 'approved' ? 'selected' : ''} value="approved">Approved</option>
                                <option ${declaration.status === 'rejected' ? 'selected' : ''} value="rejected">Rejected</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="updateConsignment('${id}')">Update Consignment</button>
                    <button class="btn btn-secondary" onclick="closeModal('editDeclarationModal')">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function updateConsignment(id) {
    const updatedDeclaration = {
        hsCode: document.getElementById('editHsCode').value,
        goods: document.getElementById('editGoodsDesc').value,
        quantity: parseInt(document.getElementById('editQuantity').value),
        unit: document.getElementById('editUnit').value,
        value: parseFloat(document.getElementById('editValue').value),
        origin: document.getElementById('editOrigin').value,
        port: document.getElementById('editPort').value,
        status: document.getElementById('editStatus').value
    };
    
    const index = declarations.findIndex(d => d.id === id);
    if (index !== -1) {
        declarations[index] = { ...declarations[index], ...updatedDeclaration };
        showAlert(`Consignment ${id} updated successfully!`, 'success');
        closeModal('editDeclarationModal');
        showConsignments();
    } else {
        showAlert('Consignment not found', 'danger');
    }
}

function viewConsignmentDetails(id) {
    const declaration = declarations.find(d => d.id === id);
    if (!declaration) {
        showAlert('Consignment not found', 'danger');
        return;
    }
    
    const hsData = sampleData.hsCodes.find(h => h.code === declaration.hsCode);
    const dutyRate = hsData ? hsData.duty : 15;
    const dutyAmount = (declaration.value * dutyRate) / 100;
    const totalValue = declaration.value + dutyAmount;
    
    const modalHtml = `
        <div class="modal show" id="viewDeclarationModal">
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3>Consignment Details: ${id}</h3>
                    <button class="close-btn" onclick="closeModal('viewDeclarationModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background: var(--light); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4>Declaration Information</h4>
                        <table style="width: 100%; margin-top: 10px;">
                            <tr><td style="padding: 5px;"><strong>Declaration ID:</strong></td><td>${declaration.id}</td></tr>
                            <tr><td style="padding: 5px;"><strong>Date Submitted:</strong></td><td>${formatDate(declaration.date)}</td></tr>
                            <tr><td style="padding: 5px;"><strong>Status:</strong></td><td>${getStatusBadge(declaration.status)}</td></tr>
                            <tr><td style="padding: 5px;"><strong>TIN Number:</strong></td><td>${declaration.tin || 'N/A'}</td></tr>
                        </table>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4>Goods Information</h4>
                        <table style="width: 100%;">
                            <tr><td style="padding: 5px;"><strong>HS Code:</strong></td><td>${declaration.hsCode}</td></tr>
                            <tr><td style="padding: 5px;"><strong>Description:</strong></td><td>${declaration.goods}</td></tr>
                            <tr><td style="padding: 5px;"><strong>Quantity:</strong></td><td>${declaration.quantity || 'N/A'} ${declaration.unit || ''}</td></tr>
                            <tr><td style="padding: 5px;"><strong>Value:</strong></td><td>${formatCurrency(declaration.value)}</td></tr>
                        </table>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4>Shipment Information</h4>
                        <table style="width: 100%;">
                            <tr><td style="padding: 5px;"><strong>Country of Origin:</strong></td><td>${declaration.origin || 'N/A'}</td></tr>
                            <tr><td style="padding: 5px;"><strong>Port of Entry:</strong></td><td>${declaration.port || 'N/A'}</td></tr>
                        </table>
                    </div>
                    
                    <div style="background: var(--primary); color: white; padding: 15px; border-radius: 8px;">
                        <h4>Duty Calculation</h4>
                        <table style="width: 100%; color: white;">
                            <tr><td style="padding: 5px;"><strong>Duty Rate:</strong></td><td>${dutyRate}%</td></tr>
                            <tr><td style="padding: 5px;"><strong>Duty Amount:</strong></td><td>${formatCurrency(dutyAmount)}</td></tr>
                            <tr><td style="padding: 5px;"><strong>Total Payable:</strong></td><td><strong>${formatCurrency(totalValue)}</strong></td></tr>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    ${declaration.status === 'pending' ? `<button class="btn btn-primary" onclick="makePayment('${id}')">Make Payment</button>` : ''}
                    <button class="btn btn-secondary" onclick="closeModal('viewDeclarationModal')">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function deleteConsignment(id) {
    if (confirm(`Are you sure you want to delete consignment ${id}? This action cannot be undone.`)) {
        const index = declarations.findIndex(d => d.id === id);
        if (index !== -1) {
            declarations.splice(index, 1);
            showAlert(`Consignment ${id} deleted successfully!`, 'success');
            showConsignments();
        } else {
            showAlert('Consignment not found', 'danger');
        }
    }
}

function makePayment(declarationId) {
    const declaration = declarations.find(d => d.id === declarationId);
    if (!declaration) {
        showAlert('Declaration not found', 'danger');
        return;
    }
    
    const hsData = sampleData.hsCodes.find(h => h.code === declaration.hsCode);
    const dutyRate = hsData ? hsData.duty : 15;
    const dutyAmount = (declaration.value * dutyRate) / 100;
    const totalAmount = declaration.value + dutyAmount;
    
    const modalHtml = `
        <div class="modal show" id="paymentModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Make Payment for ${declarationId}</h3>
                    <button class="close-btn" onclick="closeModal('paymentModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Amount to Pay</label>
                        <input type="text" id="paymentAmount" value="${formatCurrency(totalAmount)}" readonly style="background: var(--light); font-size: 1.2rem; font-weight: bold;">
                    </div>
                    <div class="form-group">
                        <label>Payment Method</label>
                        <select id="paymentMethod">
                            <option>Bank Transfer</option>
                            <option>Mobile Money</option>
                            <option>Cash at Customs Office</option>
                            <option>Credit Card</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Reference Number (Optional)</label>
                        <input type="text" id="paymentRef" placeholder="Enter payment reference">
                    </div>
                    <div class="alert alert-info">
                        <strong>Payment Instructions:</strong><br>
                        Bank: Bank of South Sudan<br>
                        Account: ACSS-CUSTOMS-001<br>
                        Reference: ${declarationId}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="processPayment('${declarationId}', ${totalAmount})">Confirm Payment</button>
                    <button class="btn btn-secondary" onclick="closeModal('paymentModal')">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function processPayment(declarationId, amount) {
    const paymentMethod = document.getElementById('paymentMethod').value;
    const paymentRef = document.getElementById('paymentRef').value;
    
    const newPayment = {
        id: generateId('PAY'),
        declarationId: declarationId,
        amount: amount,
        status: 'paid',
        date: new Date().toISOString().split('T')[0],
        method: paymentMethod,
        reference: paymentRef
    };
    payments.push(newPayment);
    
    const declaration = declarations.find(d => d.id === declarationId);
    if (declaration) {
        declaration.status = 'approved';
    }
    
    showAlert(`Payment of ${formatCurrency(amount)} processed successfully! Clearance certificate will be issued.`, 'success');
    closeModal('paymentModal');
    closeModal('viewDeclarationModal');
    showConsignments();
}

window.showConsignments = showConsignments;
window.showConsignmentTab = showConsignmentTab;
window.editConsignment = editConsignment;
window.updateConsignment = updateConsignment;
window.viewConsignmentDetails = viewConsignmentDetails;
window.deleteConsignment = deleteConsignment;
window.makePayment = makePayment;
window.processPayment = processPayment;