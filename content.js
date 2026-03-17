console.log("Context AI Extension Loaded");

let listenerAttached = false;
let debounceTimer = null;
let currentResults = [];  // Store current results for injection


/* ---------------- SIDEBAR ---------------- */

function createSidebar() {

    if (document.getElementById("context-sidebar")) return;

    const sidebar = document.createElement("div");
    sidebar.id = "context-sidebar";

    sidebar.style.position = "fixed";
    sidebar.style.top = "0";
    sidebar.style.right = "0";
    sidebar.style.width = "320px";
    sidebar.style.height = "100vh";
    sidebar.style.background = "#111";
    sidebar.style.color = "white";
    sidebar.style.zIndex = "9999";
    sidebar.style.padding = "20px";
    sidebar.style.borderLeft = "1px solid #333";
    sidebar.style.fontFamily = "Arial";
    sidebar.style.overflowY = "auto";

    sidebar.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">
            <h2 style="margin:0">Context Assistant</h2>
            <span id="auth-status" style="font-size:11px;color:#888"></span>
        </div>
        <div id="context-output">Checking authentication...</div>
    `;

    document.body.appendChild(sidebar);

    const main = document.querySelector("main");
    if (main) {
        main.style.marginRight = "320px";
    }

    // Check auth status
    checkAuth();
}

createSidebar();


/* ---------------- AUTH CHECK ---------------- */

function checkAuth() {

    chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, function(response) {

        const authStatus = document.getElementById("auth-status");
        const output = document.getElementById("context-output");

        if (!response || !response.authenticated) {
            authStatus.textContent = "Not logged in";
            authStatus.style.color = "#ff6b6b";
            output.innerHTML = `
                <div style="text-align:center;padding:40px 20px">
                    <p style="color:#888;margin-bottom:15px">Please login to use Context Assistant</p>
                    <p style="font-size:12px;color:#666">Click the extension icon in your browser toolbar to login</p>
                </div>
            `;
        } else {
            authStatus.textContent = response.email;
            authStatus.style.color = "#51cf66";
            output.innerHTML = "Waiting for prompt...";
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

function showContext(results) {

    const output = document.getElementById("context-output");
    if (!output) return;

    // Store results for injection
    currentResults = results || [];

    if (!results || results.length === 0) {
        output.innerHTML = `
            <p style="color:#888">No relevant knowledge found.</p>
            <p style="font-size:12px;color:#666;margin-top:10px">Try uploading company knowledge via the API.</p>
        `;
        return;
    }

    let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <h3 style="margin:0">Relevant Knowledge</h3>
            <button id="inject-context-btn" style="
                padding:6px 12px;
                background:#4a9eff;
                color:white;
                border:none;
                border-radius:4px;
                font-size:12px;
                cursor:pointer;
            ">Include Context</button>
        </div>
        <ul style="list-style:none;padding:0;margin:0">
    `;

    results.forEach((item, index) => {

        const similarity = item.similarity
            ? (item.similarity * 100).toFixed(1) + "% match"
            : "";

        html += `
            <li style="margin-bottom:15px;padding:10px;background:#1a1a1a;border-radius:6px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
                    <b style="color:#4a9eff">${item.source_type || "Knowledge"} #${item.source_id || ""}</b>
                    <span style="font-size:11px;color:#888">${similarity}</span>
                </div>
                <span style="font-size:13px;color:#ccc;line-height:1.4">
                    ${item.text || ""}
                </span>
            </li>
        `;

    });

    html += "</ul>";

    output.innerHTML = html;

    // Attach inject button handler
    const injectBtn = document.getElementById("inject-context-btn");
    if (injectBtn) {
        injectBtn.addEventListener("click", injectContext);
    }
}


function showError(message) {
    const output = document.getElementById("context-output");
    if (!output) return;
    output.innerHTML = `<p style="color:#ff6b6b">${message}</p>`;
}


/* ---------------- CONTEXT INJECTION ---------------- */

function injectContext() {

    if (!currentResults || currentResults.length === 0) {
        return;
    }

    const textarea = document.querySelector("#prompt-textarea");
    if (!textarea) {
        console.error("Could not find ChatGPT textarea");
        return;
    }

    // Get current prompt text
    const currentText = textarea.innerText || textarea.value || "";

    // Format context
    let contextText = "[Company Context]\n";
    currentResults.forEach((item, index) => {
        const source = item.source_type || "Source";
        contextText += `- ${source} #${item.source_id || index + 1}: ${item.text}\n`;
    });
    contextText += "\n[Your Question]\n";

    // Combine context with current prompt
    const newText = contextText + currentText;

    // Set the new text
    if (textarea.tagName === "TEXTAREA") {
        textarea.value = newText;
    } else {
        // For contenteditable divs
        textarea.innerText = newText;
    }

    // Trigger input event so ChatGPT recognizes the change
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    // Visual feedback
    const btn = document.getElementById("inject-context-btn");
    if (btn) {
        btn.textContent = "Included!";
        btn.style.background = "#51cf66";
        setTimeout(() => {
            btn.textContent = "Include Context";
            btn.style.background = "#4a9eff";
        }, 2000);
    }

    console.log("Context injected into prompt");
}


/* ---------------- SEND PROMPT ---------------- */

function sendPrompt(prompt) {

    console.log("Sending prompt to backend:", prompt);

    chrome.runtime.sendMessage(
        {
            type: "SEARCH_CONTEXT",
            prompt: prompt
        },
        function(response) {

            if (!response) {
                console.error("No response from background script");
                showError("No response from backend.");
                return;
            }

            if (!response.success) {
                console.error("Backend error:", response.error);
                showError(response.error);
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
