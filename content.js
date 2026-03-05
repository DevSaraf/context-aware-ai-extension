console.log("Extension loaded");

let listenerAttached = false;


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

    sidebar.innerHTML = `
        <h2>Context Assistant</h2>
        <div id="context-output">Waiting for prompt...</div>
    `;

    document.body.appendChild(sidebar);

    // Push ChatGPT content left
    const main = document.querySelector("main");

    if (main) {
        main.style.marginRight = "320px";
        main.style.transition = "margin 0.2s ease";
    }
}

createSidebar();


function attachListener() {

    if (listenerAttached) return;

    const promptBox = document.querySelector("#prompt-textarea");

    if (!promptBox) return;

    console.log("Prompt field detected");

    function processPrompt() {

        const promptText = promptBox.innerText.trim();

        console.log("User prompt:", promptText);

        const output = document.getElementById("context-output");
        if (!output) return;

        const text = promptText.toLowerCase();

        let topic = "general";

        if (text.includes("api")) topic = "api";
        else if (text.includes("database") || text.includes("db")) topic = "database";
        else if (text.includes("auth") || text.includes("login")) topic = "auth";

        const suggestions = MEMORY[topic] || [];

        output.innerHTML = `
            <p><b>Topic:</b> ${topic}</p>
            <br>
            <p><b>Context suggestions:</b></p>
            <ul>
                ${suggestions.map(s => `<li>${s}</li>`).join("")}
            </ul>
        `;
    }

    /* Detect typing */
    promptBox.addEventListener("input", processPrompt);

    /* Detect paste */
    promptBox.addEventListener("paste", () => {
        setTimeout(processPrompt, 50);
    });

    /* Detect DOM mutations (ProseMirror updates) */
    const promptObserver = new MutationObserver(() => {
        processPrompt();
    });

    promptObserver.observe(promptBox, {
        childList: true,
        subtree: true,
        characterData: true
    });

    listenerAttached = true;
}



/* ---------------- OBSERVER ---------------- */

const observer = new MutationObserver(() => {

    const promptBox = document.querySelector("#prompt-textarea");

    if (promptBox) {
        attachListener();
    }

});

observer.observe(document.body, {
    childList: true,
    subtree: true
});