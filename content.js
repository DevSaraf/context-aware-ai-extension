console.log("Context AI Extension Loaded");

let listenerAttached = false;
let debounceTimer = null;
let currentResults = [];

/* ---------------- STYLES ---------------- */

const STYLES = `
#context-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 340px;
    height: 100vh;
    background: linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%);
    color: #fff;
    z-index: 9999;
    border-left: 1px solid #2a2a2a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow-y: auto;
    box-shadow: -4px 0 20px rgba(0,0,0,0.3);
}

#context-sidebar::-webkit-scrollbar {
    width: 6px;
}

#context-sidebar::-webkit-scrollbar-track {
    background: transparent;
}

#context-sidebar::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 3px;
}

.ctx-header {
    padding: 16px 20px;
    border-bottom: 1px solid #2a2a2a;
    background: rgba(0,0,0,0.3);
    position: sticky;
    top: 0;
    backdrop-filter: blur(10px);
}

.ctx-header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.ctx-logo {
    display: flex;
    align-items: center;
    gap: 10px;
}

.ctx-logo svg {
    width: 24px;
    height: 24px;
}

.ctx-title {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    margin: 0;
}

.ctx-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 12px;
    background: rgba(255,255,255,0.05);
}

.ctx-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
}

.ctx-status.logged-in .ctx-status-dot { background: #22c55e; }
.ctx-status.logged-out .ctx-status-dot { background: #ef4444; }

.ctx-content {
    padding: 16px 20px;
}

/* Loading State */
.ctx-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
    text-align: center;
}

.ctx-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #333;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: ctx-spin 0.8s linear infinite;
}

@keyframes ctx-spin {
    to { transform: rotate(360deg); }
}

.ctx-loading-text {
    margin-top: 12px;
    color: #888;
    font-size: 13px;
}

/* Empty/Waiting State */
.ctx-empty {
    text-align: center;
    padding: 40px 20px;
}

.ctx-empty-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 16px;
    opacity: 0.3;
}

.ctx-empty-title {
    font-size: 14px;
    color: #888;
    margin-bottom: 8px;
}

.ctx-empty-desc {
    font-size: 12px;
    color: #555;
    line-height: 1.5;
}

/* Error State */
.ctx-error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    gap: 12px;
}

.ctx-error-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    color: #ef4444;
}

.ctx-error-content {
    flex: 1;
}

.ctx-error-title {
    font-size: 13px;
    font-weight: 500;
    color: #ef4444;
    margin-bottom: 4px;
}

.ctx-error-msg {
    font-size: 12px;
    color: #888;
    line-height: 1.4;
}

/* Results */
.ctx-results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.ctx-results-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
}

.ctx-results-count {
    font-size: 11px;
    color: #555;
    background: #222;
    padding: 2px 8px;
    border-radius: 10px;
}

.ctx-inject-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 16px;
}

.ctx-inject-btn:hover {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    transform: translateY(-1px);
}

.ctx-inject-btn:active {
    transform: translateY(0);
}

.ctx-inject-btn.success {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}

.ctx-inject-btn svg {
    width: 16px;
    height: 16px;
}

/* Result Card */
.ctx-card {
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 10px;
    margin-bottom: 12px;
    overflow: hidden;
    transition: border-color 0.2s;
}

.ctx-card:hover {
    border-color: #3a3a3a;
}

.ctx-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid #2a2a2a;
}

.ctx-card-source {
    display: flex;
    align-items: center;
    gap: 8px;
}

.ctx-card-icon {
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ctx-card-icon svg {
    width: 14px;
    height: 14px;
    color: #fff;
}

.ctx-card-label {
    font-size: 12px;
    font-weight: 500;
    color: #fff;
}

.ctx-card-id {
    font-size: 11px;
    color: #666;
}

/* Confidence Score */
.ctx-confidence {
    display: flex;
    align-items: center;
    gap: 8px;
}

.ctx-confidence-bar {
    width: 40px;
    height: 4px;
    background: #333;
    border-radius: 2px;
    overflow: hidden;
}

.ctx-confidence-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;
}

.ctx-confidence-fill.high { background: #22c55e; }
.ctx-confidence-fill.medium { background: #eab308; }
.ctx-confidence-fill.low { background: #ef4444; }

.ctx-confidence-text {
    font-size: 11px;
    font-weight: 500;
    min-width: 35px;
}

.ctx-confidence-text.high { color: #22c55e; }
.ctx-confidence-text.medium { color: #eab308; }
.ctx-confidence-text.low { color: #ef4444; }

.ctx-card-body {
    padding: 14px;
}

.ctx-card-text {
    font-size: 13px;
    color: #ccc;
    line-height: 1.6;
    margin: 0;
}

/* Login Prompt */
.ctx-login-prompt {
    text-align: center;
    padding: 40px 20px;
}

.ctx-login-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 20px;
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ctx-login-icon svg {
    width: 28px;
    height: 28px;
    color: #fff;
}

.ctx-login-title {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 8px;
}

.ctx-login-desc {
    font-size: 13px;
    color: #666;
    line-height: 1.5;
    margin-bottom: 20px;
}

.ctx-login-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 12px;
    color: #555;
    background: rgba(255,255,255,0.03);
    padding: 12px;
    border-radius: 8px;
}

.ctx-login-hint svg {
    width: 16px;
    height: 16px;
    opacity: 0.5;
}
`;

/* ---------------- ICONS ---------------- */

const ICONS = {
    logo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
    document: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    inject: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    click: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/></svg>`
};

/* ---------------- SIDEBAR ---------------- */

function createSidebar() {
    if (document.getElementById("context-sidebar")) return;

    // Inject styles
    const styleEl = document.createElement("style");
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);

    const sidebar = document.createElement("div");
    sidebar.id = "context-sidebar";

    sidebar.innerHTML = `
        <div class="ctx-header">
            <div class="ctx-header-top">
                <div class="ctx-logo">
                    ${ICONS.logo}
                    <h1 class="ctx-title">Context Assistant</h1>
                </div>
                <div id="auth-status" class="ctx-status logged-out">
                    <span class="ctx-status-dot"></span>
                    <span class="ctx-status-text">Checking...</span>
                </div>
            </div>
        </div>
        <div id="context-output" class="ctx-content">
            <div class="ctx-loading">
                <div class="ctx-spinner"></div>
                <div class="ctx-loading-text">Checking authentication...</div>
            </div>
        </div>
    `;

    document.body.appendChild(sidebar);

    const main = document.querySelector("main");
    if (main) {
        main.style.marginRight = "340px";
    }

    checkAuth();
}

createSidebar();


/* ---------------- AUTH CHECK ---------------- */

function checkAuth() {
    chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, function(response) {
        const authStatus = document.getElementById("auth-status");
        const output = document.getElementById("context-output");

        if (!response || !response.authenticated) {
            authStatus.className = "ctx-status logged-out";
            authStatus.innerHTML = `
                <span class="ctx-status-dot"></span>
                <span class="ctx-status-text">Not logged in</span>
            `;
            output.innerHTML = `
                <div class="ctx-login-prompt">
                    <div class="ctx-login-icon">${ICONS.user}</div>
                    <div class="ctx-login-title">Welcome to Context Assistant</div>
                    <div class="ctx-login-desc">Login to access your company's knowledge base and get contextual suggestions.</div>
                    <div class="ctx-login-hint">
                        ${ICONS.click}
                        <span>Click the extension icon to login</span>
                    </div>
                </div>
            `;
        } else {
            authStatus.className = "ctx-status logged-in";
            authStatus.innerHTML = `
                <span class="ctx-status-dot"></span>
                <span class="ctx-status-text">${response.email}</span>
            `;
            output.innerHTML = `
                <div class="ctx-empty">
                    <div class="ctx-empty-icon">${ICONS.search}</div>
                    <div class="ctx-empty-title">Ready to assist</div>
                    <div class="ctx-empty-desc">Start typing in the chat to see relevant context from your knowledge base.</div>
                </div>
            `;
        }
    });
}


/* ---------------- LISTEN FOR AUTH CHANGES ---------------- */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.type === "AUTH_CHANGED") {
        console.log("Auth status changed, rechecking...");
        checkAuth();
        currentResults = [];
    }

});


/* ---------------- DISPLAY CONTEXT ---------------- */

function getConfidenceLevel(similarity) {
    if (similarity >= 0.7) return 'high';
    if (similarity >= 0.4) return 'medium';
    return 'low';
}

function showLoading() {
    const output = document.getElementById("context-output");
    if (!output) return;
    output.innerHTML = `
        <div class="ctx-loading">
            <div class="ctx-spinner"></div>
            <div class="ctx-loading-text">Searching knowledge base...</div>
        </div>
    `;
}

function showContext(results) {
    const output = document.getElementById("context-output");
    if (!output) return;

    currentResults = results || [];

    if (!results || results.length === 0) {
        output.innerHTML = `
            <div class="ctx-empty">
                <div class="ctx-empty-icon">${ICONS.search}</div>
                <div class="ctx-empty-title">No matches found</div>
                <div class="ctx-empty-desc">No relevant knowledge found for this query. Try rephrasing or upload more content.</div>
            </div>
        `;
        return;
    }

    let cardsHtml = '';
    results.forEach((item, index) => {
        const similarity = item.similarity || 0;
        const percent = (similarity * 100).toFixed(0);
        const level = getConfidenceLevel(similarity);
        const sourceType = item.source_type || "Document";
        const sourceId = item.source_id || (index + 1);

        cardsHtml += `
            <div class="ctx-card">
                <div class="ctx-card-header">
                    <div class="ctx-card-source">
                        <div class="ctx-card-icon">${ICONS.document}</div>
                        <div>
                            <div class="ctx-card-label">${sourceType}</div>
                            <div class="ctx-card-id">#${sourceId}</div>
                        </div>
                    </div>
                    <div class="ctx-confidence">
                        <div class="ctx-confidence-bar">
                            <div class="ctx-confidence-fill ${level}" style="width: ${percent}%"></div>
                        </div>
                        <span class="ctx-confidence-text ${level}">${percent}%</span>
                    </div>
                </div>
                <div class="ctx-card-body">
                    <p class="ctx-card-text">${item.text || ""}</p>
                </div>
            </div>
        `;
    });

    output.innerHTML = `
        <div class="ctx-results-header">
            <span class="ctx-results-title">Knowledge Found</span>
            <span class="ctx-results-count">${results.length} result${results.length > 1 ? 's' : ''}</span>
        </div>
        <button id="inject-context-btn" class="ctx-inject-btn">
            ${ICONS.inject}
            <span>Add Context to Prompt</span>
        </button>
        ${cardsHtml}
    `;

    const injectBtn = document.getElementById("inject-context-btn");
    if (injectBtn) {
        injectBtn.addEventListener("click", injectContext);
    }
}

function showError(message) {
    const output = document.getElementById("context-output");
    if (!output) return;
    output.innerHTML = `
        <div class="ctx-error">
            <div class="ctx-error-icon">${ICONS.error}</div>
            <div class="ctx-error-content">
                <div class="ctx-error-title">Something went wrong</div>
                <div class="ctx-error-msg">${message}</div>
            </div>
        </div>
    `;
}


/* ---------------- CONTEXT INJECTION ---------------- */

function injectContext() {
    if (!currentResults || currentResults.length === 0) return;

    const textarea = document.querySelector("#prompt-textarea");
    if (!textarea) {
        console.error("Could not find ChatGPT textarea");
        return;
    }

    const currentText = textarea.innerText || textarea.value || "";

    let contextText = "[Company Context]\n";
    currentResults.forEach((item, index) => {
        const source = item.source_type || "Source";
        contextText += `- ${source} #${item.source_id || index + 1}: ${item.text}\n`;
    });
    contextText += "\n[Your Question]\n";

    const newText = contextText + currentText;

    if (textarea.tagName === "TEXTAREA") {
        textarea.value = newText;
    } else {
        textarea.innerText = newText;
    }

    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    const btn = document.getElementById("inject-context-btn");
    if (btn) {
        btn.innerHTML = `${ICONS.check}<span>Context Added!</span>`;
        btn.classList.add("success");
        setTimeout(() => {
            btn.innerHTML = `${ICONS.inject}<span>Add Context to Prompt</span>`;
            btn.classList.remove("success");
        }, 2000);
    }

    console.log("Context injected into prompt");
}


/* ---------------- SEND PROMPT ---------------- */

function sendPrompt(prompt) {
    console.log("Sending prompt to backend:", prompt);
    
    showLoading();

    chrome.runtime.sendMessage(
        { type: "SEARCH_CONTEXT", prompt: prompt },
        function(response) {
            if (!response) {
                console.error("No response from background script");
                showError("Could not connect to the extension. Try refreshing the page.");
                return;
            }

            if (!response.success) {
                console.error("Backend error:", response.error);
                showError(response.error || "Failed to fetch context from server.");
                return;
            }

            console.log("Received results:", response.data);
            showContext(response.data.sources);
        }
    );
}


/* ---------------- PROMPT LISTENER ---------------- */

function attachListener() {

    if (listenerAttached) return;

    const textarea = document.querySelector("#prompt-textarea");

    if (!textarea) return;

    console.log("Prompt box detected");

    textarea.addEventListener("input", () => {

        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {

            const prompt = textarea.innerText || textarea.value || "";

            if (!prompt || prompt.length < 3) return;

            // Check if we're authenticated before sending
            chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, function(response) {
                if (response && response.authenticated) {
                    sendPrompt(prompt);
                }
            });

        }, 800);

    });

    listenerAttached = true;
}


/* ---------------- CHATGPT DOM OBSERVER ---------------- */

const observer = new MutationObserver(() => {

    const textarea = document.querySelector("#prompt-textarea");

    if (textarea) {
        attachListener();
    }

});

observer.observe(document.body, {
    childList: true,
    subtree: true
});


/* ---------------- CHAT SWITCH DETECTION ---------------- */

let lastUrl = location.href;

setInterval(() => {

    if (location.href !== lastUrl) {

        lastUrl = location.href;

        console.log("Chat changed, reinitializing extension");

        listenerAttached = false;
        currentResults = [];

        attachListener();

    }

}, 1000);
