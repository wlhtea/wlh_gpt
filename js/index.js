let isRequestInProgress = false;
// var apiKey = 'sk-hFZFXBSQ67a4Ecf98c03T3BLbKFJc524a09adf1b4cA58995';   /*20*/
// var apiKey = 'ak-CaqFfUldLGN31yOARHAAxAQdGxb7o4iPXJkP5qDr0NN4Vdsz'; 5
var apiKey = 'sk-Uj9OiPP8J76LTMak04bOFQpaWrnahTb29qtVw4GdplMwrRmu'
let conversationHistory = [];

function createAlertElement() {
    const alertDiv = document.createElement('div');
    alertDiv.setAttribute('role', 'alert');
    alertDiv.classList.add('alert', 'alert-error', 'alert-top');

    alertDiv.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>不要写这种东西！！！ 封了kill your mother！</span>
    `;

    return alertDiv;
}

function showAlert() {
    const alertElement = createAlertElement();
    document.body.appendChild(alertElement);
    setTimeout(() => {
        alertElement.classList.add('fade-out');
    }, 500);
    alertElement.addEventListener('animationend', () => {
        alertElement.remove();
    });
}



async function callGPT35Turbo() {
    if (isRequestInProgress) {
        return;
    }

    isRequestInProgress = true;

    const modelSelect = document.getElementById('modelSelect');
    const selectedModel = modelSelect.value;
    const promptInput = document.getElementById('promptInput');
    const userPrompt = promptInput.value.trim();
    if (userPrompt === '') {
        showAlert()
        isRequestInProgress = false;
        return;
    }
    var net_or_not = '';

    const myCheckbox = document.getElementById('myCheckbox');
    if (myCheckbox.checked){
        net_or_not = 'net-';
    }else{
        net_or_not = '';
    }
    promptInput.value = '';

    // 将用户输入添加到对话历史
    conversationHistory.push({ role: 'user', content: userPrompt });

    // const url = 'https://aigptx.top/v1/chat/completions';
    // const url = 'https://api.nextweb.fun/openai/v1/chat/completions'
    const url = 'https://api.gptgod.online/v1/chat/completions';
    const payload = {
        messages: conversationHistory,
        model: `${net_or_not}`+selectedModel,
    };

    const conversationContainer = document.getElementById('conversationContainer');
    const loadingChat = document.createElement('div');
    loadingChat.classList.add('chat', 'chat-start');
    loadingChat.innerHTML = `<div class="chat-bubble"><button class="btn btn-square"><span class="loading loading-spinner"></span></button></div>`;
    conversationContainer.appendChild(loadingChat);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        const generatedText = result.choices[0].message.content.trim();

        conversationContainer.removeChild(loadingChat);

        const userChat = document.createElement('div');
        userChat.classList.add('chat', 'chat-start');
        userChat.innerHTML = `<div class="chat-bubble"><strong>用户:</strong> ${userPrompt}</div>`;
        conversationContainer.appendChild(userChat);

        const aiChat = document.createElement('div');
        aiChat.classList.add('chat', 'chat-end');
        aiChat.innerHTML = `<div class="chat-bubble"><strong>AI:</strong></div>`;
        conversationContainer.appendChild(aiChat);

        const aiBubble = document.createElement('div');
        aiBubble.classList.add('chat-bubble');
        aiBubble.innerHTML = marked.parse(generatedText);
        aiChat.appendChild(aiBubble);

        conversationContainer.scrollTop = conversationContainer.scrollHeight;
    } catch (error) {
        console.error('Error fetching response:', error);
    } finally {
        isRequestInProgress = false;
    }
}


async function generateDallE3Image() {
    if (isRequestInProgress) {
        return;
    }

    isRequestInProgress = true;

    const promptInput = document.getElementById('promptInput');
    const userPrompt = promptInput.value.trim();
    promptInput.value = '';

    // 将用户输入添加到对话历史
    conversationHistory.push({ role: 'user', content: userPrompt });

    const conversationContainer = document.getElementById('conversationContainer');
    const loadingChat = document.createElement('div');
    loadingChat.classList.add('chat', 'chat-start');
    loadingChat.innerHTML = `<div class="chat-bubble"><button class="btn btn-square"><span class="loading loading-spinner"></span></button></div>`;

    conversationContainer.appendChild(loadingChat);

    const myHeaders = new Headers();
    myHeaders.append("User-Agent", "Apifox/1.0.0 (https://apifox.com)");
    myHeaders.append("Authorization", `Bearer ${apiKey}`);

    const urlencoded = new URLSearchParams();
    urlencoded.append("prompt", userPrompt);
    urlencoded.append("model", "dall-e-3");
    urlencoded.append("n", "1");
    urlencoded.append("quality", "hd");
    urlencoded.append("response_format", "b64_json");
    urlencoded.append("size", "1024x1024");
    urlencoded.append("style", "vivid");

    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: urlencoded,
        redirect: 'follow'
    };

    try {
        const response = await fetch("https://cn2us02.opapi.win/v1/images/generations", requestOptions);
        const result = await response.json();
        const imageData = result.data[0];
        const base64Image = imageData.b64_json;
        const revisedPrompt = imageData.revised_prompt;
        conversationContainer.removeChild(loadingChat);

        const userChat = document.createElement('div');
        userChat.classList.add('chat', 'chat-start');
        userChat.innerHTML = `<div class="chat-bubble"><strong>用户:</strong> ${userPrompt}</div>`;
        conversationContainer.appendChild(userChat);

        const aiChat = document.createElement('div');
        aiChat.classList.add('chat', 'chat-end');
        aiChat.innerHTML = `<div class="chat-bubble"><strong>AI:</strong> <img src="data:image/png;base64,${base64Image}" alt="Generated Image"></div>`;

        conversationContainer.appendChild(aiChat);
    } catch (error) {
        showAlert();
        conversationContainer.removeChild(loadingChat);
        throw error;
    } finally {
        isRequestInProgress = false;
    }
}


function handleKeyPress(event) {
    console.log(event.type);
    if (event.key === 'Enter' || event.type === 'click') {
    const modelSelect = document.getElementById('modelSelect');
    const selectedModel = modelSelect.value;

    if (selectedModel === 'gpt-3.5-turbo' || selectedModel === 'gpt-4') {
        callGPT35Turbo();
    } else {
        generateDallE3Image();
    }
    }
}