// Customs Officer Review Module

function showDeclarationReview() {
    const pendingReviews = declarations.filter(d => d.status === 'pending' || d.status === 'review');
    
    const content = `
        <div class="dashboard-cards">
            <div class="card">
                <h3>📋 Pending Review</h3>
                <div class="number">${pendingReviews.length}</div>
                <small>Awaiting action</small>
            </div>
            <div class="card">
                <h3>⚠️ High Risk</h3>
                <div class="number">${pendingReviews.filter(d => d.risk === 'High').length}</div>
                <small>Requires inspection</small>
            </div>
            <div class="card">
                <h3>✅ Reviewed Today</h3>
                <div class="number">${pendingReviews.filter(d => d.date === new Date().toISOString().split('T')[0]).length}</div>
                <small>Today's progress</small>
            </div>
        </div>
        
        <div class="data-table">
            <div style="padding: 15px; border-bottom: 1px solid var(--light);">
                <h3>Declarations Pending Review</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Importer TIN</th>
                        <th>Goods</th>
                        <th>Value</th>
                        <th>Risk Level</th>
                        <th>Documents</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${pendingReviews.map(dec => `
                        <tr>
                            <td><strong>${dec.id}</strong></td>
                            <td>${formatDate(dec.date)}</td>
                            <td>${dec.tin || 'N/A'}</td>
                            <td>${dec.goods.substring(0, 30)}${dec.goods.length > 30 ? '...' : ''}</td>
                            <td>${formatCurrency(dec.value)}</td>
                            <td>${dec.risk === 'High' ? '<span class="badge badge-danger">HIGH</span>' : '<span class="badge badge-success">LOW</span>'}</td>
                            <td>
                                <button class="btn btn-info btn-sm" onclick="viewDocuments('${dec.id}')">📄 View</button>
                            </td>
                            <td>
                                <button class="btn btn-success btn-sm" onclick="approveDeclaration('${dec.id}')">✓ Approve</button>
                                <button class="btn btn-danger btn-sm" onclick="rejectDeclaration('${dec.id}')">✗ Reject</button>
                                ${dec.risk === 'High' ? `<button class="btn btn-warning btn-sm" onclick="requestInspection('${dec.id}')">🔍 Inspect</button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    document.getElementById('mainContent').innerHTML = content;
}

function approveDeclaration(id) {
    const declaration = declarations.find(d => d.id === id);
    if (declaration) {
        declaration.status = 'approved';
        showAlert(`Declaration ${id} has been APPROVED! Clearance certificate generated.`, 'success');
        showDeclarationReview();
        
        // Send notification
        showAlert(`Notification sent to importer: ${declaration.tin}`, 'info');
    }
}

function rejectDeclaration(id) {
    const reason = prompt('Please provide reason for rejection:');
    if (reason) {
        const declaration = declarations.find(d => d.id === id);
        if (declaration) {
            declaration.status = 'rejected';
            declaration.rejectionReason = reason;
            showAlert(`Declaration ${id} has been REJECTED. Reason: ${reason}`, 'danger');
            showDeclarationReview();
        }
    }
}

function requestInspection(id) {
    const declaration = declarations.find(d => d.id === id);
    if (declaration) {
        declaration.status = 'review';
        declaration.inspectionRequested = true;
        showAlert(`Inspection requested for declaration ${id}. Inspection unit notified.`, 'warning');
    }
}

function viewDocuments(declarationId) {
    const uploadedDocs = JSON.parse(localStorage.getItem('uploadedDocs') || '[]');
    if (uploadedDocs.length === 0) {
        showAlert('No documents uploaded for this declaration', 'info');
    } else {
        showAlert(`Found ${uploadedDocs.length} document(s) for verification`, 'info');
    }
}

window.showDeclarationReview = showDeclarationReview;
window.approveDeclaration = approveDeclaration;
window.rejectDeclaration = rejectDeclaration;
window.requestInspection = requestInspection;
window.viewDocuments = viewDocuments;