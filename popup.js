const API_URL = "http://127.0.0.1:8000";

// DOM Elements
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loggedInView = document.getElementById("logged-in");

const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

const registerEmail = document.getElementById("register-email");
const registerPassword = document.getElementById("register-password");
const registerCompany = document.getElementById("register-company");
const registerBtn = document.getElementById("register-btn");
const registerError = document.getElementById("register-error");
const registerSuccess = document.getElementById("register-success");

const userEmail = document.getElementById("user-email");
const userCompany = document.getElementById("user-company");
const logoutBtn = document.getElementById("logout-btn");

const showRegisterLink = document.getElementById("show-register");
const showLoginLink = document.getElementById("show-login");


// Check auth status on load
document.addEventListener("DOMContentLoaded", checkAuthStatus);


async function checkAuthStatus() {
    const data = await chrome.storage.local.get(["token", "email", "company_id"]);

    if (data.token) {
        showLoggedInView(data.email, data.company_id);
    } else {
        showLoginForm();
    }
}


function showLoginForm() {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    loggedInView.classList.add("hidden");
    clearErrors();
}


function showRegisterForm() {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    loggedInView.classList.add("hidden");
    clearErrors();
}


function showLoggedInView(email, companyId) {
    loginForm.classList.add("hidden");
    registerForm.classList.add("hidden");
    loggedInView.classList.remove("hidden");

    userEmail.textContent = email || "Unknown";
    userCompany.textContent = companyId ? `Company: ${companyId}` : "";
}


function clearErrors() {
    loginError.classList.add("hidden");
    registerError.classList.add("hidden");
    registerSuccess.classList.add("hidden");
}


function showError(element, message) {
    element.textContent = message;
    element.classList.remove("hidden");
}


// Login handler
loginBtn.addEventListener("click", async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
        showError(loginError, "Please fill in all fields");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.error) {
            showError(loginError, data.error);
            return;
        }

        if (data.access_token) {
            await chrome.storage.local.set({
                token: data.access_token,
                email: data.email,
                company_id: data.company_id
            });

            showLoggedInView(data.email, data.company_id);

            // Notify content scripts that auth changed
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { type: "AUTH_CHANGED" }).catch(() => {});
                });
            });
        }
    } catch (error) {
        showError(loginError, "Connection error. Is the backend running?");
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
    }
});


// Register handler
registerBtn.addEventListener("click", async () => {
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const companyId = registerCompany.value.trim();

    if (!email || !password || !companyId) {
        showError(registerError, "Please fill in all fields");
        return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = "Creating account...";

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                password,
                company_id: companyId
            })
        });

        const data = await response.json();

        if (data.error) {
            showError(registerError, data.error);
            return;
        }

        if (data.message === "User created") {
            registerSuccess.textContent = "Account created! You can now login.";
            registerSuccess.classList.remove("hidden");

            // Clear form
            registerEmail.value = "";
            registerPassword.value = "";
            registerCompany.value = "";

            // Switch to login after 2 seconds
            setTimeout(showLoginForm, 2000);
        }
    } catch (error) {
        showError(registerError, "Connection error. Is the backend running?");
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = "Create Account";
    }
});


// Logout handler
logoutBtn.addEventListener("click", async () => {
    await chrome.storage.local.remove(["token", "email", "company_id"]);

    showLoginForm();

    // Notify content scripts that auth changed
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { type: "AUTH_CHANGED" }).catch(() => {});
        });
    });
});


// Toggle between forms
showRegisterLink.addEventListener("click", showRegisterForm);
showLoginLink.addEventListener("click", showLoginForm);
