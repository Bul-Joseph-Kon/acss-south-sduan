// Documents Module

function showDocuments() {
    const requiredDocuments = [
        { name: 'Commercial Invoice', status: 'pending', icon: '📄', required: true },
        { name: 'Packing List', status: 'pending', icon: '📦', required: true },
        { name: 'Bill of Lading / Air Waybill', status: 'pending', icon: '🚢', required: true },
        { name: 'Certificate of Origin', status: 'pending', icon: '📋', required: true },
        { name: 'Destination Certificate', status: 'pending', icon: '✅', required: true },
        { name: 'Import License', status: 'optional', icon: '📜', required: false },
        { name: 'Insurance Certificate', status: 'optional', icon: '🛡️', required: false }
    ];
    
    const uploadedDocs = JSON.parse(localStorage.getItem('uploadedDocs') || '[]');
    
    const content = `
        <div class="dashboard-cards">
            <div class="card">
                <h3>📄 Required Documents</h3>
                <div class="number">${requiredDocuments.filter(d => d.required).length}</div>
                <small>Must be submitted</small>
            </div>
            <div class="card">
                <h3>✅ Uploaded</h3>
                <div class="number">${uploadedDocs.length}</div>
                <small>Documents uploaded</small>
            </div>
            <div class="card">
                <h3>⏳ Pending</h3>
                <div class="number">${requiredDocuments.filter(d => d.required).length - uploadedDocs.length}</div>
                <small>Awaiting upload</small>
            </div>
        </div>
        
        <div class="data-table">
            <div style="padding: 15px; border-bottom: 1px solid var(--light);">
                <h3 style="display: inline-block;">Required Documents</h3>
            </div>
            <table>
                <thead>
                    <tr><th>Icon</th><th>Document Name</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                    ${requiredDocuments.map(doc => {
                        const isUploaded = uploadedDocs.some(u => u.name === doc.name);
                        return `
                            <tr>
                                <td>${doc.icon}</td>
                                <td>${doc.name} ${doc.required ? '<span class="badge badge-danger">Required</span>' : '<span class="badge badge-info">Optional</span>'}</td>
                                <td>${isUploaded ? '<span class="badge badge-success">Uploaded</span>' : '<span class="badge badge-warning">Pending</span>'}</td>
                                <td>
                                    <button class="btn btn-primary btn-sm" onclick="uploadDocument('${doc.name}')">
                                        ${isUploaded ? 'Re-upload' : 'Upload'}
                                    </button>
                                    ${isUploaded ? `<button class="btn btn-info btn-sm" onclick="viewDocument('${doc.name}')">View</button>` : ''}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="card" style="margin-top: 20px;">
            <h3>📎 Uploaded Documents</h3>
            <div id="uploadedDocsList">
                ${uploadedDocs.length === 0 ? '<p class="text-center" style="padding: 20px;">No documents uploaded yet</p>' : `
                    <div class="data-table">
                        <table>
                            <thead><tr><th>Document Name</th><th>Upload Date</th><th>File Name</th><th>Action</th></tr></thead>
                            <tbody>
                                ${uploadedDocs.map(doc => `
                                    <tr>
                                        <td>${doc.name}</td>
                                        <td>${doc.date}</td>
                                        <td>${doc.fileName}</td>
                                        <td><button class="btn btn-danger btn-sm" onclick="deleteDocument('${doc.name}')">Delete</button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        </div>
    `;
    
    document.getElementById('mainContent').innerHTML = content;
}

function uploadDocument(docName) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const uploadedDocs = JSON.parse(localStorage.getItem('uploadedDocs') || '[]');
            uploadedDocs.push({
                name: docName,
                fileName: file.name,
                date: new Date().toLocaleDateString(),
                size: (file.size / 1024).toFixed(2) + ' KB'
            });
            localStorage.setItem('uploadedDocs', JSON.stringify(uploadedDocs));
            showAlert(`${docName} uploaded successfully!`, 'success');
            showDocuments();
        }
    };
    input.click();
}

function viewDocument(docName) {
    showAlert(`Viewing ${docName} - Document viewer would open here`, 'info');
}

function deleteDocument(docName) {
    if (confirm(`Delete ${docName}?`)) {
        let uploadedDocs = JSON.parse(localStorage.getItem('uploadedDocs') || '[]');
        uploadedDocs = uploadedDocs.filter(d => d.name !== docName);
        localStorage.setItem('uploadedDocs', JSON.stringify(uploadedDocs));
        showAlert(`${docName} deleted successfully`, 'success');
        showDocuments();
    }
}

window.showDocuments = showDocuments;
window.uploadDocument = uploadDocument;
window.viewDocument = viewDocument;
window.deleteDocument = deleteDocument;