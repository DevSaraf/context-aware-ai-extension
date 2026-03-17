chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.type === "SEARCH_CONTEXT") {

        fetch("http://127.0.0.1:8000/context", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: request.prompt
            })
        })
        .then(response => response.json())
        .then(data => {

            sendResponse({
                success: true,
                data: data
            });

        })
        .catch(error => {

            console.error("Backend error:", error);

            sendResponse({
                success: false,
                error: error.toString()
            });

        });

        return true;
    }

});