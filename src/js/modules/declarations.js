// Declarations Module

function showNewDeclaration() {
    const modalHtml = `
        <div class="modal show" id="declarationModal">
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3>New Customs Declaration</h3>
                    <button class="close-btn" onclick="closeModal('declarationModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="declarationForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label>HS Code *</label>
                                <input type="text" id="hsCode" placeholder="Enter HS Code" required>
                                <small>Search: 8471.30, 8703.23, etc.</small>
                            </div>
                            <div class="form-group">
                                <label>Goods Description *</label>
                                <textarea id="goodsDesc" rows="2" required placeholder="Describe your goods in detail"></textarea>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Quantity *</label>
                                <input type="number" id="quantity" required>
                            </div>
                            <div class="form-group">
                                <label>Unit</label>
                                <select id="unit">
                                    <option>KG</option>
                                    <option>PCS</option>
                                    <option>LTR</option>
                                    <option>CTN</option>
                                    <option>MTR</option>
                                    <option>TON</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Value (USD) *</label>
                                <input type="number" id="value" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Country of Origin</label>
                                <select id="origin">
                                    ${sampleData.countries.map(c => `<option>${c}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Port of Entry</label>
                                <select id="port">
                                    ${sampleData.ports.map(p => `<option>${p}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Additional Notes</label>
                            <textarea id="notes" rows="2" placeholder="Any additional information about this shipment"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="submitDeclaration()">Submit Declaration</button>
                    <button class="btn btn-secondary" onclick="saveDraft()">Save Draft</button>
                    <button class="btn btn-secondary" onclick="closeModal('declarationModal')">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function submitDeclaration() {
    const hsCode = document.getElementById('hsCode').value;
    const goodsDesc = document.getElementById('goodsDesc').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const unit = document.getElementById('unit').value;
    const value = parseFloat(document.getElementById('value').value);
    const origin = document.getElementById('origin').value;
    const port = document.getElementById('port').value;
    const notes = document.getElementById('notes').value;
    
    if (!hsCode || !goodsDesc || !quantity || !value) {
        showAlert('Please fill all required fields', 'danger');
        return;
    }
    
    // Auto-calculate risk based on value and country
    const risk = (value > 50000 || origin === 'China' || origin === 'UAE') ? 'High' : 'Low';
    
    const newDeclaration = {
        id: generateId('DEC'),
        date: new Date().toISOString().split('T')[0],
        goods: goodsDesc,
        hsCode: hsCode,
        quantity: quantity,
        unit: unit,
        value: value,
        origin: origin,
        port: port,
        notes: notes,
        status: 'pending',
        tin: currentUser?.tin || 'GUEST' + Math.floor(Math.random() * 10000),
        risk: risk
    };
    
    declarations.unshift(newDeclaration);
    closeModal('declarationModal');
    showAlert(`Declaration ${newDeclaration.id} submitted successfully! Risk Level: ${risk}`, 'success');
    
    // If high risk, notify about inspection
    if (risk === 'High') {
        showAlert('⚠️ High risk consignment detected. Additional inspection may be required.', 'warning');
    }
    
    loadModule('consignment_management');
}

function saveDraft() {
    const draftDeclaration = {
        id: generateId('DRAFT'),
        date: new Date().toISOString().split('T')[0],
        goods: document.getElementById('goodsDesc').value || 'Untitled Draft',
        hsCode: document.getElementById('hsCode').value || 'N/A',
        quantity: parseInt(document.getElementById('quantity').value) || 0,
        unit: document.getElementById('unit').value,
        value: parseFloat(document.getElementById('value').value) || 0,
        origin: document.getElementById('origin').value,
        port: document.getElementById('port').value,
        status: 'draft',
        tin: currentUser?.tin || 'TEMP'
    };
    
    declarations.unshift(draftDeclaration);
    closeModal('declarationModal');
    showAlert(`Draft saved successfully! You can edit it later.`, 'info');
    loadModule('consignment_management');
}

window.showNewDeclaration = showNewDeclaration;
window.submitDeclaration = submitDeclaration;
window.saveDraft = saveDraft;