const API_URL = "https://krabai.tech";


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.type === "SEARCH_CONTEXT") {
        handleContextSearch(request.prompt, sendResponse);
        return true;
    }

    if (request.type === "CHECK_AUTH") {
        checkAuthStatus(sendResponse);
        return true;
    }

    if (request.type === "SUBMIT_FEEDBACK") {
        handleFeedback(request, sendResponse);
        return true;
    }

    if (request.type === "LOGIN") {
        handleLogin(request, sendResponse);
        return true;
    }

    if (request.type === "REGISTER") {
        handleRegister(request, sendResponse);
        return true;
    }

});


async function handleLogin(request, sendResponse) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: request.email, password: request.password })
        });
        const data = await response.json();
        sendResponse({ success: !data.error && !data.detail, data });
    } catch (error) {
        sendResponse({ success: false, data: { error: "Connection error. Is the backend running?" } });
    }
}


async function handleRegister(request, sendResponse) {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: request.email, password: request.password, company_id: request.company_id })
        });
        const data = await response.json();
        sendResponse({ success: !data.error && !data.detail, data });
    } catch (error) {
        sendResponse({ success: false, data: { error: "Connection error. Is the backend running?" } });
    }
}


async function handleContextSearch(prompt, sendResponse) {

    try {
        const data = await chrome.storage.local.get(["token"]);

        if (!data.token) {
            sendResponse({
                success: false,
                error: "Not authenticated. Please login via the extension popup."
            });
            return;
        }

        const response = await fetch(`${API_URL}/context`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${data.token}`
            },
            body: JSON.stringify({ prompt })
        });

        if (response.status === 401) {
            await chrome.storage.local.remove(["token", "email", "company_id"]);
            sendResponse({
                success: false,
                error: "Session expired. Please login again."
            });
            return;
        }

        const result = await response.json();

        sendResponse({
            success: true,
            data: result
        });

    } catch (error) {
        console.error("Backend error:", error);

        sendResponse({
            success: false,
            error: error.toString()
        });
    }
}


async function handleFeedback(request, sendResponse) {
    try {
        const data = await chrome.storage.local.get(["token"]);

        if (!data.token) {
            sendResponse({ success: false, error: "Not authenticated" });
            return;
        }

        const response = await fetch(`${API_URL}/feedback`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${data.token}`
            },
            body: JSON.stringify({
                chunk_id: request.chunk_id,
                feedback_type: request.feedback_type,
                query: request.query,
                similarity_score: request.similarity_score
            })
        });

        if (response.status === 401) {
            sendResponse({ success: false, error: "Session expired" });
            return;
        }

        const result = await response.json();
        sendResponse({ success: !result.error, ...result });

    } catch (error) {
        console.error("Feedback error:", error);
        sendResponse({ success: false, error: error.toString() });
    }
}


async function checkAuthStatus(sendResponse) {

    try {
        const data = await chrome.storage.local.get(["token", "email", "company_id"]);

        sendResponse({
            authenticated: !!data.token,
            email: data.email || null,
            company_id: data.company_id || null
        });

    } catch (error) {
        sendResponse({
            authenticated: false,
            email: null,
            company_id: null
        });
    }
}