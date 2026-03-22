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
const copyTokenBtn = document.getElementById("copy-token-btn");

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


// Login handler — routes through background.js to bypass page CSP
loginBtn.addEventListener("click", async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
        showError(loginError, "Please fill in all fields");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";
    clearErrors();

    try {
        const response = await chrome.runtime.sendMessage({
            type: "LOGIN",
            email,
            password
        });

        if (!response || !response.success) {
            const errMsg = response?.data?.error || response?.data?.detail || "Login failed";
            showError(loginError, errMsg);
            return;
        }

        const data = response.data;

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
        } else {
            showError(loginError, data.error || data.detail || "Login failed — no token received");
        }
    } catch (error) {
        showError(loginError, "Extension error. Try reloading the extension.");
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
    }
});


// Register handler — routes through background.js to bypass page CSP
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
    clearErrors();

    try {
        const response = await chrome.runtime.sendMessage({
            type: "REGISTER",
            email,
            password,
            company_id: companyId
        });

        if (!response || !response.success) {
            const errMsg = response?.data?.error || response?.data?.detail || "Registration failed";
            showError(registerError, errMsg);
            return;
        }

        const data = response.data;

        if (data.message === "User created") {
            registerSuccess.textContent = "Account created! You can now login.";
            registerSuccess.classList.remove("hidden");

            registerEmail.value = "";
            registerPassword.value = "";
            registerCompany.value = "";

            setTimeout(showLoginForm, 2000);
        } else {
            showError(registerError, data.error || data.detail || "Registration failed");
        }
    } catch (error) {
        showError(registerError, "Extension error. Try reloading the extension.");
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


// Copy token handler
copyTokenBtn.addEventListener("click", async () => {
    const data = await chrome.storage.local.get(["token"]);
    if (data.token) {
        await navigator.clipboard.writeText(data.token);
        copyTokenBtn.textContent = "Copied!";
        setTimeout(() => {
            copyTokenBtn.textContent = "Copy Token (for testing)";
        }, 2000);
    }
});


// Toggle between forms
showRegisterLink.addEventListener("click", showRegisterForm);
showLoginLink.addEventListener("click", showLoginForm);