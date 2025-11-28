document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.login-form');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        console.log('Login attempt:', { email });
        alert('Sign in clicked! (Demo only)');
    });
});
