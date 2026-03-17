console.log("Context AI Extension Loaded");

let listenerAttached = false;
let debounceTimer = null;


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
        <h2>Context Assistant</h2>
        <div id="context-output">Waiting for prompt...</div>
    `;

    document.body.appendChild(sidebar);

    const main = document.querySelector("main");
    if (main) {
        main.style.marginRight = "320px";
    }
}

createSidebar();


/* ---------------- DISPLAY CONTEXT ---------------- */

function showContext(results) {

    const output = document.getElementById("context-output");
    if (!output) return;

    if (!results || results.length === 0) {
        output.innerText = "No company knowledge found.";
        return;
    }

    let html = "<h3>Relevant Knowledge</h3><ul>";

    results.forEach(item => {

        const similarity = item.similarity
            ? (item.similarity * 100).toFixed(1) + "% match"
            : "";

        html += `
            <li style="margin-bottom:15px">
                <b>${item.source_type || "Knowledge"} #${item.source_id || ""}</b>
                <span style="font-size:11px;color:#888;margin-left:8px">${similarity}</span><br>
                <span style="font-size:13px;color:#ccc">
                    ${item.text || ""}
                </span>
            </li>
        `;

    });

    html += "</ul>";

    output.innerHTML = html;
}


function showError(message) {
    const output = document.getElementById("context-output");
    if (!output) return;
    output.innerHTML = `<p style="color:#ff6b6b">${message}</p>`;
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
                showError("Backend error: " + response.error);
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

            sendPrompt(prompt);

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

        attachListener();

    }

}, 1000);