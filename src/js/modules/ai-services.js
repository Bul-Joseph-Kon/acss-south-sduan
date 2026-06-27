// AI Services Module

function openChatbot() {
    const modalHtml = `
        <div class="modal show" id="chatbotModal">
            <div class="modal-content modal-sm">
                <div class="modal-header">
                    <h3>🤖 ACSS AI Assistant</h3>
                    <button class="close-btn" onclick="closeModal('chatbotModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="chat-container" id="chatContainer">
                        <div class="chat-message bot">
                            Hello! I'm your ACSS AI Assistant. How can I help you today?
                        </div>
                    </div>
                    <div class="chat-input">
                        <input type="text" id="chatInput" placeholder="Type your question..." onkeypress="if(event.key==='Enter') sendChatMessage()">
                        <button onclick="sendChatMessage()">Send</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    const chatContainer = document.getElementById('chatContainer');
    
    // Add user message
    chatContainer.innerHTML += `<div class="chat-message user">${escapeHtml(message)}</div>`;
    input.value = '';
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // AI Response
    setTimeout(() => {
        const response = getAIResponse(message);
        chatContainer.innerHTML += `<div class="chat-message bot">${response}</div>`;
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 500);
}

function getAIResponse(message) {
    const msg = message.toLowerCase();
    
    if (msg.includes('hs code') || msg.includes('classification')) {
        return "📋 To find the correct HS Code, please use our HS Code Finder tool. You can also describe your product and I'll help you find the likely classification.";
    } else if (msg.includes('duty') || msg.includes('tax') || msg.includes('fee')) {
        return "💰 Customs duties in South Sudan range from 5% to 25% depending on the HS code. Use our Duty Calculator to estimate your payable amount.";
    } else if (msg.includes('document') || msg.includes('paper')) {
        return "📄 Required documents include: Commercial Invoice, Packing List, Bill of Lading, Certificate of Origin, and Destination Certificate.";
    } else if (msg.includes('clearance') || msg.includes('process')) {
        return "⏱️ Customs clearance typically takes 3-5 business days after submission, provided all documents are in order and duties are paid.";
    } else if (msg.includes('port') || msg.includes('entry')) {
        return "🚢 South Sudan's main ports of entry include: Nimule (land), Juba International Airport (air), and Renk (river port).";
    } else if (msg.includes('risk') || msg.includes('inspection')) {
        return "⚠️ Risk assessment is based on product type, value, origin country, and importer history. High-risk consignments require physical inspection.";
    } else {
        return "Thank you for your question. For specific customs inquiries, please contact our help desk or refer to the Trade Guidelines section. How else can I assist you today?";
    }
}

function openHSFinder() {
    const modalHtml = `
        <div class="modal show" id="hsFinderModal">
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3>🔍 AI HS Code Finder</h3>
                    <button class="close-btn" onclick="closeModal('hsFinderModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Describe your product</label>
                        <input type="text" id="hsSearchInput" placeholder="e.g., Laptop computer, Cotton fabric, Cement..." onkeyup="searchHS()">
                    </div>
                    <div id="hsResults">
                        <p class="text-center" style="padding: 20px;">Enter a product description to find HS codes</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function searchHS() {
    const query = document.getElementById('hsSearchInput').value.toLowerCase();
    const results = sampleData.hsCodes.filter(h => 
        h.description.toLowerCase().includes(query) || 
        h.code.includes(query)
    );
    
    const resultsDiv = document.getElementById('hsResults');
    if (results.length === 0 && query.length > 0) {
        resultsDiv.innerHTML = '<p class="text-center">No matching HS codes found. Try different keywords.</p>';
    } else if (query.length > 0) {
        resultsDiv.innerHTML = `
            <div class="data-table">
                <table>
                    <thead><tr><th>HS Code</th><th>Description</th><th>Duty Rate</th></tr></thead>
                    <tbody>
                        ${results.map(h => `
                            <tr>
                                <td><strong>${h.code}</strong></td>
                                <td>${h.description}</td>
                                <td><span class="badge badge-info">${h.duty}%</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.openChatbot = openChatbot;
window.sendChatMessage = sendChatMessage;
window.openHSFinder = openHSFinder;
window.searchHS = searchHS;