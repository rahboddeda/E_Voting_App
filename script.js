const loginForm = document.getElementById('login-form');
const registrationForm = document.getElementById('registration-form');

function handleLoginSubmit(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (username && password) {
        if (username === 'admin' && password === '123') {
            alert("login Successful");
        }
    }
}

function handleRegistrationSubmit(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    // registration logic here
}

loginForm.addEventListener('submit', handleLoginSubmit);
registrationForm.addEventListener('submit', handleRegistrationSubmit);