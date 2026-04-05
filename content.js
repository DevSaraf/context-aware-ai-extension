console.log("KRAB Extension Loaded");

let listenerAttached = false;
let debounceTimer = null;
let currentResults = [];
let currentQuery = "";
let quickSearchModal = null;
let selectionPopup = null;

// Helper to safely send messages (handles extension context invalidation)
function safeSendMessage(message, callback) {
    try {
        if (!chrome.runtime?.id) {
            console.log("Extension context invalidated - please refresh the page");
            return;
        }
        chrome.runtime.sendMessage(message, function(response) {
            if (chrome.runtime.lastError) {
                console.log("Extension error:", chrome.runtime.lastError.message);
                return;
            }
            if (callback) callback(response);
        });
    } catch (e) {
        console.log("Extension not available:", e.message);
    }
}

/* ---------------- PLATFORM DETECTION (ENHANCED) ---------------- */

const PLATFORMS = {
    chatgpt: {
        name: 'ChatGPT',
        hostname: ['chat.openai.com', 'chatgpt.com'],
        textareaSelector: '#prompt-textarea',
        mainSelector: 'main',
        isContentEditable: true
    },
    claude: {
        name: 'Claude',
        hostname: ['claude.ai'],
        textareaSelector: '[contenteditable="true"].ProseMirror, div[contenteditable="true"]',
        mainSelector: 'main',
        isContentEditable: true
    },
    gemini: {
        name: 'Gemini',
        hostname: ['gemini.google.com'],
        textareaSelector: 'rich-textarea div[contenteditable="true"], .ql-editor',
        mainSelector: 'main',
        isContentEditable: true
    },
    gmail: {
        name: 'Gmail',
        hostname: ['mail.google.com'],
        textareaSelector: 'div[aria-label="Message Body"], div[contenteditable="true"]',
        mainSelector: 'div[role="main"]',
        isContentEditable: true
    },
    github: {
        name: 'GitHub',
        hostname: ['github.com'],
        textareaSelector: 'textarea[name="comment[body]"], textarea.js-comment-field, #issue_body, #pull_request_body',
        mainSelector: 'main',
        isContentEditable: false
    },
    slack: {
        name: 'Slack',
        hostname: ['app.slack.com', 'slack.com'],
        textareaSelector: 'div[data-message-input="true"], div.ql-editor',
        mainSelector: 'div.p-workspace',
        isContentEditable: true
    },
    jira: {
        name: 'Jira',
        hostname: ['atlassian.net'],
        textareaSelector: 'div[contenteditable="true"], textarea',
        mainSelector: 'main, div[role="main"]',
        isContentEditable: true
    },
    notion: {
        name: 'Notion',
        hostname: ['notion.so'],
        textareaSelector: 'div[contenteditable="true"]',
        mainSelector: 'div.notion-frame',
        isContentEditable: true
    },
    salesforce: {
        name: 'Salesforce',
        hostname: ['salesforce.com', 'lightning.force.com'],
        textareaSelector: 'textarea, div[contenteditable="true"]',
        mainSelector: 'div.slds-template__container',
        isContentEditable: false
    },
    zendesk: {
        name: 'Zendesk',
        hostname: ['zendesk.com'],
        textareaSelector: 'div[contenteditable="true"], textarea',
        mainSelector: 'main',
        isContentEditable: true
    },
    hubspot: {
        name: 'HubSpot',
        hostname: ['hubspot.com'],
        textareaSelector: 'div[contenteditable="true"], textarea',
        mainSelector: 'main',
        isContentEditable: true
    },
    linear: {
        name: 'Linear',
        hostname: ['linear.app'],
        textareaSelector: 'div[contenteditable="true"]',
        mainSelector: 'main',
        isContentEditable: true
    },
    figma: {
        name: 'Figma',
        hostname: ['figma.com'],
        textareaSelector: 'textarea',
        mainSelector: 'div[class*="editor"]',
        isContentEditable: false
    },
    gdocs: {
        name: 'Google Docs',
        hostname: ['docs.google.com'],
        textareaSelector: 'div.kix-page',
        mainSelector: 'div.kix-appview',
        isContentEditable: true
    },
    outlook: {
        name: 'Outlook',
        hostname: ['outlook.office.com', 'outlook.live.com'],
        textareaSelector: 'div[contenteditable="true"]',
        mainSelector: 'div[role="main"]',
        isContentEditable: true
    }
};

function detectPlatform() {
    const hostname = window.location.hostname;
    for (const [key, platform] of Object.entries(PLATFORMS)) {
        if (platform.hostname.some(h => hostname.includes(h))) {
            return { key, ...platform };
        }
    }
    return null;
}

const currentPlatform = detectPlatform();
console.log("Detected platform:", currentPlatform?.name || "Unknown");

/* ---------------- STYLES ---------------- */

const STYLES = `
#context-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 340px;
    height: 100vh;
    background: #262624;
    color: #e8e6e1;
    z-index: 9999;
    border-left: 1px solid #333331;
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
    background: #3a3a38;
    border-radius: 3px;
}

.ctx-header {
    padding: 16px 20px;
    border-bottom: 1px solid #333331;
    background: rgba(30,30,28,0.9);
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
    color: #c6613f;
}

.ctx-title {
    font-size: 15px;
    font-weight: 700;
    color: #c6613f;
    margin: 0;
    letter-spacing: 2px;
}

.ctx-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 12px;
    background: #1e1e1c;
    border: 1px solid #333331;
}

.ctx-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
}

.ctx-status.logged-in .ctx-status-dot { background: #5cb85c; }
.ctx-status.logged-out .ctx-status-dot { background: #d9534f; }

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
    border: 3px solid #333331;
    border-top-color: #c6613f;
    border-radius: 50%;
    animation: ctx-spin 0.8s linear infinite;
}

@keyframes ctx-spin {
    to { transform: rotate(360deg); }
}

.ctx-loading-text {
    margin-top: 12px;
    color: #9a9890;
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
    color: #9a9890;
    margin-bottom: 8px;
}

.ctx-empty-desc {
    font-size: 12px;
    color: #6a6960;
    line-height: 1.5;
}

/* Error State */
.ctx-error {
    background: rgba(217, 83, 79, 0.1);
    border: 1px solid rgba(217, 83, 79, 0.2);
    border-radius: 10px;
    padding: 16px;
    display: flex;
    gap: 12px;
}

.ctx-error-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    color: #d9534f;
}

.ctx-error-content {
    flex: 1;
}

.ctx-error-title {
    font-size: 13px;
    font-weight: 500;
    color: #d9534f;
    margin-bottom: 4px;
}

.ctx-error-msg {
    font-size: 12px;
    color: #9a9890;
    line-height: 1.4;
}

/* AI Answer Card */
.ctx-ai-answer {
    background: rgba(198, 97, 63, 0.1);
    border: 1px solid rgba(198, 97, 63, 0.3);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 20px;
}

.ctx-ai-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    color: #c6613f;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.ctx-ai-header svg {
    width: 16px;
    height: 16px;
}

.ctx-ai-body {
    color: #e8e6e1;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
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
    color: #9a9890;
}

.ctx-results-count {
    font-size: 11px;
    color: #6a6960;
    background: #1e1e1c;
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
    background: #c6613f;
    color: #fff;
    border: none;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 16px;
}

.ctx-inject-btn:hover {
    background: #d4734f;
    transform: translateY(-1px);
}

.ctx-inject-btn:active {
    transform: translateY(0);
}

.ctx-inject-btn.success {
    background: #5cb85c;
}

.ctx-inject-btn svg {
    width: 16px;
    height: 16px;
}

/* Result Card */
.ctx-card {
    background: #1e1e1c;
    border: 1px solid #333331;
    border-radius: 10px;
    margin-bottom: 12px;
    overflow: hidden;
    transition: border-color 0.2s;
}

.ctx-card:hover {
    border-color: #4a4940;
}

.ctx-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid #333331;
}

.ctx-card-source {
    display: flex;
    align-items: center;
    gap: 8px;
}

.ctx-card-icon {
    width: 28px;
    height: 28px;
    background: rgba(198, 97, 63, 0.12);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ctx-card-icon svg {
    width: 14px;
    height: 14px;
    color: #c6613f;
}

.ctx-card-label {
    font-size: 12px;
    font-weight: 500;
    color: #e8e6e1;
}

.ctx-card-body {
    padding: 14px;
    cursor: pointer;
}

.ctx-card-text {
    font-size: 13px;
    color: #e8e6e1;
    line-height: 1.7;
    margin: 0;
}

.ctx-card-text.collapsed {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.ctx-card-expand {
    font-size: 11px;
    color: #c6613f;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 0 0;
    font-family: inherit;
    transition: color 0.2s;
}

.ctx-card-expand:hover {
    color: #d4734f;
}

.ctx-card-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px 12px;
}

.ctx-card-inject {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background: rgba(198, 97, 63, 0.12);
    color: #c6613f;
    border: 1px solid rgba(198, 97, 63, 0.25);
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
}

.ctx-card-inject:hover {
    background: rgba(198, 97, 63, 0.2);
    border-color: rgba(198, 97, 63, 0.4);
}

.ctx-card-inject.success {
    background: rgba(92, 184, 92, 0.12);
    color: #5cb85c;
    border-color: rgba(92, 184, 92, 0.25);
}

.ctx-card-inject svg {
    width: 12px;
    height: 12px;
}

.ctx-card-meta {
    font-size: 10px;
    color: #6a6960;
    margin-left: auto;
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
    background: rgba(198, 97, 63, 0.12);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ctx-login-icon svg {
    width: 28px;
    height: 28px;
    color: #c6613f;
}

.ctx-login-title {
    font-size: 16px;
    font-weight: 600;
    color: #e8e6e1;
    margin-bottom: 8px;
}

.ctx-login-desc {
    font-size: 13px;
    color: #6a6960;
    line-height: 1.5;
    margin-bottom: 20px;
}

.ctx-login-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 12px;
    color: #6a6960;
    background: rgba(255,255,255,0.03);
    padding: 12px;
    border-radius: 8px;
}

.ctx-login-hint svg {
    width: 16px;
    height: 16px;
    opacity: 0.5;
}

/* AI Answer Section */
.ctx-answer {
    background: rgba(198, 97, 63, 0.08);
    border: 1px solid rgba(198, 97, 63, 0.15);
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 16px;
}

.ctx-answer-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
}

.ctx-answer-badge {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #c6613f;
    background: rgba(198, 97, 63, 0.15);
    padding: 3px 8px;
    border-radius: 4px;
}

.ctx-answer-text {
    font-size: 13px;
    color: #e8e6e1;
    line-height: 1.7;
    margin: 0;
    white-space: pre-wrap;
}

.ctx-answer-divider {
    border: none;
    border-top: 1px solid #333331;
    margin: 16px 0;
}

.ctx-no-answer {
    font-size: 12px;
    color: #6a6960;
    font-style: italic;
    margin-bottom: 12px;
}

/* Toggle Button */
.ctx-toggle-btn {
    width: 28px;
    height: 28px;
    background: rgba(255,255,255,0.08);
    border: 1px solid #333331;
    border-radius: 6px;
    color: #9a9890;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0;
    margin-left: 8px;
}

.ctx-toggle-btn:hover {
    background: rgba(255,255,255,0.12);
    color: #e8e6e1;
    border-color: #4a4940;
}

.ctx-toggle-btn svg {
    width: 14px;
    height: 14px;
    transition: transform 0.2s;
}

/* Floating Pill (shown when sidebar is hidden) */
#context-sidebar-pill {
    position: fixed;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    background: #c6613f;
    border-radius: 10px 0 0 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 9998;
    box-shadow: -2px 0 12px rgba(0,0,0,0.3);
    transition: all 0.2s;
    border: none;
    color: #fff;
}

#context-sidebar-pill:hover {
    width: 48px;
    background: #d4734f;
    box-shadow: -4px 0 20px rgba(0,0,0,0.4);
}

#context-sidebar-pill svg {
    width: 20px;
    height: 20px;
}

#context-sidebar-pill.hidden {
    display: none;
}

/* Transition for sidebar */
#context-sidebar {
    transition: width 0.2s ease, opacity 0.2s ease;
}

#context-sidebar.sidebar-hidden {
    width: 0;
    opacity: 0;
    overflow: hidden;
    border-left: none;
    pointer-events: none;
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
    click: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/></svg>`,
    thumbsUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`,
    thumbsDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>`
};

/* ---------------- SIDEBAR ---------------- */

function createSidebar() {
    if (document.getElementById("context-sidebar")) return;

    // Inject styles
    const styleEl = document.createElement("style");
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);

    // Create the floating pill (shown when sidebar is hidden)
    const pill = document.createElement("button");
    pill.id = "context-sidebar-pill";
    pill.className = "hidden";
    pill.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
        </svg>
    `;
    pill.addEventListener("click", () => toggleSidebar(true));
    document.body.appendChild(pill);

    const sidebar = document.createElement("div");
    sidebar.id = "context-sidebar";

    sidebar.innerHTML = `
        <div class="ctx-header">
            <div class="ctx-header-top">
                <div class="ctx-logo">
                    <h1 class="ctx-title">KRAB</h1>
                </div>
                <div style="display:flex;align-items:center;">
                    <div id="auth-status" class="ctx-status logged-out">
                        <span class="ctx-status-dot"></span>
                        <span class="ctx-status-text">Checking...</span>
                    </div>
                    <button class="ctx-toggle-btn" id="ctx-toggle-btn" title="Minimize sidebar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                    </button>
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

    // Toggle button listener
    document.getElementById("ctx-toggle-btn").addEventListener("click", () => {
        toggleSidebar(false);
    });

    // Restore saved state
    restoreSidebarState();

    checkAuth();
}

function toggleSidebar(show) {
    const sidebar = document.getElementById("context-sidebar");
    const pill = document.getElementById("context-sidebar-pill");
    const main = document.querySelector("main");

    if (show) {
        sidebar.classList.remove("sidebar-hidden");
        pill.classList.add("hidden");
        if (main) main.style.marginRight = "340px";
        saveSidebarState(true);
    } else {
        sidebar.classList.add("sidebar-hidden");
        pill.classList.remove("hidden");
        if (main) main.style.marginRight = "0";
        saveSidebarState(false);
    }
}

function saveSidebarState(isOpen) {
    try {
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ sidebar_open: isOpen });
        }
    } catch (e) {}
}

function restoreSidebarState() {
    try {
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(["sidebar_open"], function(data) {
                if (data.sidebar_open === false) {
                    toggleSidebar(false);
                } else {
                    toggleSidebar(true);
                }
            });
        } else {
            toggleSidebar(true);
        }
    } catch (e) {
        toggleSidebar(true);
    }
}

createSidebar();


/* ---------------- AUTH CHECK ---------------- */

function checkAuth() {
    safeSendMessage({ type: "CHECK_AUTH" }, function(response) {
        const authStatus = document.getElementById("auth-status");
        const output = document.getElementById("context-output");

        if (!authStatus || !output) return;

        if (!response || !response.authenticated) {
            authStatus.className = "ctx-status logged-out";
            authStatus.innerHTML = `
                <span class="ctx-status-dot"></span>
                <span class="ctx-status-text">Not logged in</span>
            `;
            output.innerHTML = `
                <div class="ctx-login-prompt">
                    <div class="ctx-login-icon">${ICONS.user}</div>
                    <div class="ctx-login-title">Welcome to KRAB</div>
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
    if (request.type === "OPEN_QUICK_SEARCH") {
        openQuickSearchModal();
        sendResponse({ success: true });
    }
    if (request.type === "INSERT_TEXT") {
        insertTextAtCursor(request.text);
        sendResponse({ success: true });
    }
    if (request.type === "GET_SELECTION") {
        const selection = window.getSelection().toString();
        sendResponse({ selection });
    }
    return true;
});

/* ---------------- QUICK SEARCH MODAL ---------------- */

function openQuickSearchModal() {
    if (quickSearchModal) {
        quickSearchModal.remove();
    }

    quickSearchModal = document.createElement('div');
    quickSearchModal.className = 'krab-modal-overlay';
    quickSearchModal.innerHTML = `
        <div class="krab-modal">
            <div class="krab-modal-header">
                <img class="krab-modal-logo" src="${chrome.runtime.getURL('icons/icon48.png')}" alt="KRAB">
                <input type="text" class="krab-modal-input" placeholder="Search your knowledge base..." autofocus>
                <span class="krab-modal-shortcut">ESC to close</span>
            </div>
            <div class="krab-modal-content">
                <div class="krab-modal-empty" style="text-align: center; padding: 40px; color: #94a3b8;">
                    Type to search across all your connected apps and documents
                </div>
            </div>
            <div class="krab-modal-footer">
                <span>⌘J to toggle • Enter to search</span>
                <span>Powered by KRAB</span>
            </div>
        </div>
    `;

    document.body.appendChild(quickSearchModal);

    requestAnimationFrame(() => {
        quickSearchModal.classList.add('visible');
    });

    const input = quickSearchModal.querySelector('.krab-modal-input');
    const content = quickSearchModal.querySelector('.krab-modal-content');

    quickSearchModal.addEventListener('click', (e) => {
        if (e.target === quickSearchModal) {
            closeQuickSearchModal();
        }
    });

    document.addEventListener('keydown', handleModalKeydown);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = input.value.trim();
            if (query) {
                performQuickSearch(query, content);
            }
        }
    });

    let searchTimer;
    input.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            const query = input.value.trim();
            if (query.length >= 3) {
                performQuickSearch(query, content);
            }
        }, 300);
    });
}

function handleModalKeydown(e) {
    if (e.key === 'Escape') {
        closeQuickSearchModal();
    }
}

function closeQuickSearchModal() {
    if (quickSearchModal) {
        quickSearchModal.classList.remove('visible');
        setTimeout(() => {
            quickSearchModal.remove();
            quickSearchModal = null;
        }, 200);
        document.removeEventListener('keydown', handleModalKeydown);
    }
}

async function performQuickSearch(query, contentEl) {
    contentEl.innerHTML = `
        <div class="krab-modal-loading">
            <div class="krab-modal-spinner"></div>
            Searching...
        </div>
    `;

    safeSendMessage({ type: 'SEARCH_CONTEXT', prompt: query }, (response) => {
        if (!response || !response.success) {
            contentEl.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    ${response?.error || 'Search failed. Please try again.'}
                </div>
            `;
            return;
        }

        const data = response.data;
        const answer = data.answer || data.response;
        const sources = data.sources || data.chunks || [];

        let html = '';

        if (answer) {
            html += `
                <div class="krab-modal-ai-answer">
                    <div class="krab-modal-ai-header">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
                        </svg>
                        AI Answer
                    </div>
                    <div class="krab-modal-ai-text">${escapeHtml(answer)}</div>
                </div>
            `;
        }

        if (sources.length > 0) {
            sources.slice(0, 5).forEach(source => {
                const title = source.title || source.source_title || 'Untitled';
                const text = (source.text || source.content || '').substring(0, 150);
                html += `
                    <div class="krab-modal-result" onclick="window.krabInsertText('${escapeHtml(source.text || '')}')">
                        <div class="krab-modal-result-title">${escapeHtml(title)}</div>
                        <div class="krab-modal-result-snippet">${escapeHtml(text)}...</div>
                    </div>
                `;
            });
        } else if (!answer) {
            html = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    No results found for "${escapeHtml(query)}"
                </div>
            `;
        }

        contentEl.innerHTML = html;
    });
}

window.krabInsertText = function(text) {
    insertTextAtCursor(text);
    closeQuickSearchModal();
    showKrabToast('Text inserted');
};

function insertTextAtCursor(text) {
    const platform = currentPlatform;
    if (!platform) {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.isContentEditable || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
            if (activeEl.isContentEditable) {
                document.execCommand('insertText', false, text);
            } else {
                const start = activeEl.selectionStart;
                const end = activeEl.selectionEnd;
                activeEl.value = activeEl.value.substring(0, start) + text + activeEl.value.substring(end);
                activeEl.selectionStart = activeEl.selectionEnd = start + text.length;
            }
        }
        return;
    }

    const textarea = document.querySelector(platform.textareaSelector);
    if (!textarea) return;

    textarea.focus();

    if (platform.isContentEditable) {
        document.execCommand('insertText', false, text);
    } else {
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function showKrabToast(message, type = 'success') {
    const existing = document.querySelector('.krab-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `krab-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('visible');
    });

    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ---------------- SELECTION POPUP ---------------- */

document.addEventListener('mouseup', (e) => {
    const selection = window.getSelection().toString().trim();
    
    if (selection && selection.length > 10 && selection.length < 500) {
        showSelectionPopup(e.clientX, e.clientY, selection);
    } else {
        hideSelectionPopup();
    }
});

function showSelectionPopup(x, y, text) {
    hideSelectionPopup();

    selectionPopup = document.createElement('div');
    selectionPopup.className = 'krab-selection-popup';
    selectionPopup.style.left = `${x}px`;
    selectionPopup.style.top = `${y + 10}px`;
    selectionPopup.innerHTML = `
        <button class="krab-selection-btn" data-action="search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
            </svg>
            Search KRAB
        </button>
        <button class="krab-selection-btn" data-action="explain">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Explain
        </button>
    `;

    document.body.appendChild(selectionPopup);

    requestAnimationFrame(() => {
        selectionPopup.classList.add('visible');
    });

    selectionPopup.querySelectorAll('.krab-selection-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            if (action === 'search') {
                openQuickSearchModal();
                setTimeout(() => {
                    const input = document.querySelector('.krab-modal-input');
                    if (input) input.value = text;
                }, 100);
            } else if (action === 'explain') {
                openQuickSearchModal();
                setTimeout(() => {
                    const input = document.querySelector('.krab-modal-input');
                    if (input) {
                        input.value = `Explain: ${text}`;
                        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
                    }
                }, 100);
            }
            hideSelectionPopup();
        });
    });
}

function hideSelectionPopup() {
    if (selectionPopup) {
        selectionPopup.remove();
        selectionPopup = null;
    }
}


/* ---------------- DISPLAY CONTEXT ---------------- */

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
        const sourceType = item.source_type || "Document";
        const wordCount = item.text ? item.text.split(' ').length : 0;
        const isLong = (item.text || '').length > 200;

        cardsHtml += `
            <div class="ctx-card" data-chunk-index="${index}">
                <div class="ctx-card-header">
                    <div class="ctx-card-source">
                        <div class="ctx-card-icon">${ICONS.document}</div>
                        <div>
                            <div class="ctx-card-label">${escapeHtml(sourceType)}</div>
                        </div>
                    </div>
                </div>
                <div class="ctx-card-body" data-expand-index="${index}">
                    <p class="ctx-card-text ${isLong ? 'collapsed' : ''}" id="ctx-text-${index}">${escapeHtml(item.text || "")}</p>
                    ${isLong ? `<button class="ctx-card-expand" id="ctx-expand-${index}">Show more</button>` : ''}
                </div>
                <div class="ctx-card-footer">
                    <button class="ctx-card-inject" data-inject-index="${index}">
                        ${ICONS.inject}
                        <span>Inject</span>
                    </button>
                    <span class="ctx-card-meta">${wordCount} words</span>
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
            <span>Add All Context to Prompt</span>
        </button>
        ${cardsHtml}
    `;

    attachCardListeners();
}

function showContextWithAnswer(data) {
    const output = document.getElementById("context-output");
    if (!output) return;

    const results = data.sources || [];
    const answer = data.answer || "";
    const hasAnswer = data.has_answer !== false;

    currentResults = results;

    if (!results || results.length === 0) {
        output.innerHTML = `
            <div class="ctx-empty">
                <div class="ctx-empty-icon">${ICONS.search}</div>
                <div class="ctx-empty-title">No matches found</div>
                <div class="ctx-empty-desc">No relevant knowledge found for this query.</div>
            </div>
        `;
        return;
    }

    // Build the AI answer section (confidence removed)
    let answerHtml = '';
    if (answer && hasAnswer) {
        answerHtml = `
            <div class="ctx-answer">
                <div class="ctx-answer-header">
                    <span class="ctx-answer-badge">AI Answer</span>
                </div>
                <p class="ctx-answer-text">${escapeHtml(answer)}</p>
            </div>
        `;
    }

    // Build result cards — NO inline onclick (CSP blocked)
    let cardsHtml = '';
    results.forEach((item, index) => {
        const sourceType = item.source_type || "Document";
        const wordCount = item.text ? item.text.split(' ').length : 0;
        const isLong = (item.text || '').length > 200;

        cardsHtml += `
            <div class="ctx-card" data-chunk-index="${index}">
                <div class="ctx-card-header">
                    <div class="ctx-card-source">
                        <div class="ctx-card-icon">${ICONS.document}</div>
                        <div>
                            <div class="ctx-card-label">${escapeHtml(sourceType)}</div>
                        </div>
                    </div>
                </div>
                <div class="ctx-card-body" data-expand-index="${index}">
                    <p class="ctx-card-text ${isLong ? 'collapsed' : ''}" id="ctx-text-${index}">${escapeHtml(item.text || "")}</p>
                    ${isLong ? `<button class="ctx-card-expand" id="ctx-expand-${index}">Show more</button>` : ''}
                </div>
                <div class="ctx-card-footer">
                    <button class="ctx-card-inject" data-inject-index="${index}">
                        ${ICONS.inject}
                        <span>Inject</span>
                    </button>
                    <span class="ctx-card-meta">${wordCount} words</span>
                </div>
            </div>
        `;
    });

    output.innerHTML = `
        <div class="ctx-results-header">
            <span class="ctx-results-title">Knowledge Found</span>
            <span class="ctx-results-count">${results.length} source${results.length > 1 ? 's' : ''}</span>
        </div>
        ${answerHtml}
        <button id="inject-context-btn" class="ctx-inject-btn">
            ${ICONS.inject}
            <span>Add All Context to Prompt</span>
        </button>
        <hr class="ctx-answer-divider">
        ${cardsHtml}
    `;

    // Attach ALL event listeners via JS (CSP-safe)
    attachCardListeners();
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


/* ---------------- FEEDBACK ---------------- */

function submitFeedback(chunkId, feedbackType, similarityScore) {
    console.log(`Submitting feedback: ${feedbackType} for chunk ${chunkId}`);
    
    const feedbackDiv = document.getElementById(`feedback-${chunkId}`);
    if (!feedbackDiv) return;

    const buttons = feedbackDiv.querySelectorAll('.ctx-feedback-btn');
    buttons.forEach(btn => btn.classList.add('disabled'));

    safeSendMessage({
        type: "SUBMIT_FEEDBACK",
        chunk_id: chunkId,
        feedback_type: feedbackType,
        query: currentQuery,
        similarity_score: similarityScore
    }, function(response) {
        if (response && response.success) {
            feedbackDiv.innerHTML = `
                <div class="ctx-feedback-thanks">
                    ${ICONS.check}
                    <span>Thanks for your feedback!</span>
                </div>
            `;
        } else {
            buttons.forEach(btn => btn.classList.remove('disabled'));
            console.error("Feedback error:", response?.error);
        }
    });
}


/* ---------------- CONTEXT INJECTION ---------------- */

function getTextarea() {
    if (!currentPlatform) return null;
    return document.querySelector(currentPlatform.textareaSelector);
}

function injectContext() {
    if (!currentResults || currentResults.length === 0) return;

    currentResults.forEach(item => {
        if (item.id) {
            safeSendMessage({
                type: "SUBMIT_FEEDBACK",
                chunk_id: item.id,
                feedback_type: "used",
                query: currentQuery,
                similarity_score: item.confidence || item.similarity
            });
        }
    });

    const textarea = getTextarea();
    if (!textarea) {
        console.error(`Could not find textarea for ${currentPlatform?.name || 'unknown platform'}`);
        showError(`Could not find input field. Try clicking in the chat box first.`);
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
    } else if (textarea.contentEditable === "true" || currentPlatform?.isContentEditable) {
        textarea.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, newText);
        if (textarea.innerText !== newText) {
            textarea.innerText = newText;
        }
    } else {
        textarea.innerText = newText;
    }

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));

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


/* ---------------- CSP-SAFE EVENT ATTACHMENT ---------------- */

function attachCardListeners() {
    const injectAllBtn = document.getElementById("inject-context-btn");
    if (injectAllBtn) {
        injectAllBtn.addEventListener("click", injectContext);
    }

    document.querySelectorAll('.ctx-card-inject[data-inject-index]').forEach(btn => {
        btn.addEventListener("click", function() {
            const idx = parseInt(this.getAttribute('data-inject-index'));
            injectSingleChunk(idx);
        });
    });

    document.querySelectorAll('.ctx-card-body[data-expand-index]').forEach(body => {
        body.addEventListener("click", function() {
            const idx = parseInt(this.getAttribute('data-expand-index'));
            toggleChunkExpand(idx);
        });
    });

    document.querySelectorAll('.ctx-card-expand').forEach(btn => {
        btn.addEventListener("click", function(e) {
            e.stopPropagation();
            const id = this.id.replace('ctx-expand-', '');
            toggleChunkExpand(parseInt(id));
        });
    });
}

function toggleChunkExpand(index) {
    const textEl = document.getElementById(`ctx-text-${index}`);
    const expandBtn = document.getElementById(`ctx-expand-${index}`);
    if (!textEl) return;
    const isCollapsed = textEl.classList.contains('collapsed');
    textEl.classList.toggle('collapsed');
    if (expandBtn) {
        expandBtn.textContent = isCollapsed ? 'Show less' : 'Show more';
    }
}

function injectSingleChunk(index) {
    if (!currentResults || !currentResults[index]) return;

    const item = currentResults[index];

    if (item.id) {
        safeSendMessage({
            type: "SUBMIT_FEEDBACK",
            chunk_id: item.id,
            feedback_type: "used",
            query: currentQuery,
            similarity_score: item.confidence || item.similarity
        });
    }

    const textarea = getTextarea();
    if (!textarea) {
        showError("Could not find input field. Try clicking in the chat box first.");
        return;
    }

    const currentText = textarea.innerText || textarea.value || "";
    const source = item.source_type || "Source";
    const contextText = `[Company Context]\n- ${source}: ${item.text}\n\n[Your Question]\n`;
    const newText = contextText + currentText;

    if (textarea.tagName === "TEXTAREA") {
        textarea.value = newText;
    } else if (textarea.contentEditable === "true" || currentPlatform?.isContentEditable) {
        textarea.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, newText);
        if (textarea.innerText !== newText) {
            textarea.innerText = newText;
        }
    } else {
        textarea.innerText = newText;
    }

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));

    const btn = document.querySelector(`.ctx-card-inject[data-inject-index="${index}"]`);
    if (btn) {
        btn.innerHTML = `${ICONS.check}<span>Injected!</span>`;
        btn.classList.add("success");
        setTimeout(() => {
            btn.innerHTML = `${ICONS.inject}<span>Inject</span>`;
            btn.classList.remove("success");
        }, 2000);
    }
}


/* ---------------- SEND PROMPT ---------------- */

function sendPrompt(prompt) {
    console.log("Sending prompt to backend:", prompt);
    currentQuery = prompt;
    showLoading();

    safeSendMessage(
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
            showContextWithAnswer(response.data);
        }
    );
}


/* ---------------- PROMPT LISTENER ---------------- */

function attachListener() {
    if (listenerAttached) return;
    if (!currentPlatform) return;

    const textarea = getTextarea();
    if (!textarea) return;

    console.log(`Prompt box detected on ${currentPlatform.name}`);

    const handleInput = () => {
        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
            const prompt = textarea.innerText || textarea.textContent || textarea.value || "";
            const cleanPrompt = prompt.trim();

            if (!cleanPrompt || cleanPrompt.length < 3) return;
            if (cleanPrompt.startsWith("[Company Context]")) return;

            console.log("Detected prompt:", cleanPrompt.substring(0, 50) + "...");

            safeSendMessage({ type: "CHECK_AUTH" }, function(response) {
                if (response && response.authenticated) {
                    sendPrompt(cleanPrompt);
                }
            });
        }, 800);
    };

    textarea.addEventListener("input", handleInput);
    textarea.addEventListener("keyup", handleInput);

    listenerAttached = true;
}


/* ---------------- DOM OBSERVER ---------------- */

const observer = new MutationObserver(() => {
    if (!currentPlatform) return;
    const textarea = getTextarea();
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