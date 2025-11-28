document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.signup-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Sign up successful! User ID: ' + data.id);
                window.location.href = 'index.html';
            } else {
                console.error('Error:', data);
                alert('Sign up failed: ' + (data.error || JSON.stringify(data.errors || data)));
            }
        } catch (error) {
            console.error('Fetch error:', error);
            alert('An error occurred. Please try again.');
        }
    });
});
