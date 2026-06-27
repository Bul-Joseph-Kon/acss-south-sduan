// ============================================
// LIVE BANNER MODULE - Rotating Messages
// ============================================

const bannerMessages = [
    "Nimule Border Post Hours: Mon-Fri 8AM-5PM | Sat-Sun 8AM-12PM",
    "Online payment for customs duties now available via mobile money",
    "Customs Declaration System is now fully operational 24/7",
    "Mandatory advanced cargo declaration for all shipments"
];

let bannerIndex = 0;

// Update live date and time every second
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById('liveDate');
    const timeEl = document.getElementById('liveTime');
    if (dateEl) dateEl.innerText = now.toLocaleDateString('en-US', options);
    if (timeEl) timeEl.innerText = now.toLocaleTimeString('en-US');
}

// Rotate banner messages every 8 seconds
function rotateBannerMessage() {
    const messageEl = document.getElementById('bannerMessage');
    if (messageEl) {
        messageEl.classList.add('fade-out');
        setTimeout(() => {
            bannerIndex = (bannerIndex + 1) % bannerMessages.length;
            messageEl.innerHTML = bannerMessages[bannerIndex];
            messageEl.classList.remove('fade-out');
            messageEl.classList.add('fade-in');
            setTimeout(() => {
                messageEl.classList.remove('fade-in');
            }, 500);
        }, 500);
    }
}

// Initialize banner
function initBanner() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setInterval(rotateBannerMessage, 8000);
}

// Start banner when page loads
document.addEventListener('DOMContentLoaded', initBanner);