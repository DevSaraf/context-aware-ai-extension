/**
 * KRAB Background Service Worker
 * Handles API calls, context menus, side panel, and cross-tab messaging
 */

const API_URL = "https://krabai.tech";

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    // Create context menu items
    chrome.contextMenus.create({
        id: "krab-search",
        title: "Search KRAB for \"%s\"",
        contexts: ["selection"]
    });

    chrome.contextMenus.create({
        id: "krab-explain",
        title: "Explain with KRAB",
        contexts: ["selection"]
    });

    chrome.contextMenus.create({
        id: "krab-summarize",
        title: "Summarize this page",
        contexts: ["page"]
    });

    chrome.contextMenus.create({
        id: "krab-create-ticket",
        title: "Create support ticket",
        contexts: ["page", "selection"]
    });

    console.log("KRAB extension installed");
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const action = info.menuItemId;
    const selectedText = info.selectionText || "";
    const pageUrl = tab.url;
    const pageTitle = tab.title;

    switch (action) {
        case "krab-search":
            await openSidePanelWithQuery(tab, selectedText);
            break;
        case "krab-explain":
            await openSidePanelWithQuery(tab, `Explain: ${selectedText}`);
            break;
        case "krab-summarize":
            await openSidePanelWithQuery(tab, `Summarize this page: ${pageTitle}`);
            break;
        case "krab-create-ticket":
            chrome.tabs.create({ url: `${API_URL.replace('/api', '')}/dashboard.html#tickets?new=true&context=${encodeURIComponent(selectedText || pageTitle)}` });
            break;
    }
});

// Open side panel with a query
async function openSidePanelWithQuery(tab, query) {
    try {
        await chrome.sidePanel.open({ tabId: tab.id });
        // Send query to side panel
        setTimeout(() => {
            chrome.runtime.sendMessage({ type: "SIDEPANEL_QUERY", query });
        }, 500);
    } catch (error) {
        console.error("Failed to open side panel:", error);
    }
}

// Command handler (keyboard shortcuts)
chrome.commands.onCommand.addListener(async (command) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (command === "search_krab") {
        chrome.tabs.sendMessage(tab.id, { type: "OPEN_QUICK_SEARCH" });
    }
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.type === "SEARCH_CONTEXT") {
        handleContextSearch(request.prompt, request.context, sendResponse);
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

    if (request.type === "OPEN_SIDEPANEL") {
        chrome.sidePanel.open({ tabId: sender.tab.id });
        sendResponse({ success: true });
        return true;
    }

    if (request.type === "GET_PAGE_CONTEXT") {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            sendResponse({
                url: tab?.url || "",
                title: tab?.title || "",
                app: detectApp(tab?.url || "")
            });
        });
        return true;
    }

});


// Detect app from URL
function detectApp(url) {
    const appPatterns = {
        'Gmail': /mail\.google\.com/,
        'GitHub': /github\.com/,
        'Slack': /slack\.com/,
        'Jira': /atlassian\.net.*jira|jira\.com/,
        'Confluence': /atlassian\.net.*wiki|confluence/,
        'Notion': /notion\.so/,
        'Salesforce': /salesforce\.com|lightning\.force\.com/,
        'Zendesk': /zendesk\.com/,
        'HubSpot': /hubspot\.com/,
        'Linear': /linear\.app/,
        'ChatGPT': /chat\.openai\.com|chatgpt\.com/,
        'Claude': /claude\.ai/,
        'Gemini': /gemini\.google\.com/,
        'Google Drive': /drive\.google\.com/,
        'Google Docs': /docs\.google\.com/,
        'Figma': /figma\.com/,
        'Trello': /trello\.com/,
        'Asana': /asana\.com/,
        'Monday': /monday\.com/,
        'ClickUp': /clickup\.com/,
        'Intercom': /intercom\.com/,
        'Freshdesk': /freshdesk\.com/
    };

    for (const [app, pattern] of Object.entries(appPatterns)) {
        if (pattern.test(url)) {
            return app;
        }
    }
    return 'Web';
}


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


async function handleContextSearch(prompt, context, sendResponse) {

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
            body: JSON.stringify({ 
                prompt,
                context: context || {}
            })
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