// Dashboard UI Helper Functions
// Exposes toggleCategory function globally for inline onclick handlers

window.toggleCategory = function(category) {
    const submenu = document.getElementById(category + 'Submenu');
    const arrow = document.getElementById(category + 'Arrow');
    if (submenu && arrow) {
        submenu.classList.toggle('open');
        arrow.classList.toggle('open');
    }
};
