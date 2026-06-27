function handleSignIn() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    if(email && password) {
        const userName = email.split('@')[0];
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', userName);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userId', 'SSRA-' + userName.toUpperCase() + '-' + Math.floor(Math.random() * 10000));
        window.location.href = 'dashboard.html';  // <-- CHANGE THIS LINE
    }
}