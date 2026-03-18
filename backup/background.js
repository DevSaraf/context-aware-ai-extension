const API_URL = "http://127.0.0.1:8000";


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.type === "SEARCH_CONTEXT") {
        handleContextSearch(request.prompt, sendResponse);
        return true;  // Keep message channel open for async response
    }

    if (request.type === "CHECK_AUTH") {
        checkAuthStatus(sendResponse);
        return true;
    }

});


async function handleContextSearch(prompt, sendResponse) {

    try {
        // Get token from storage
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

        // Handle 401 - token expired or invalid
        if (response.status === 401) {
            // Clear stored token
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
