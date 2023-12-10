let isRequestInProgress = false;
let chatWindow = document.getElementById("conversationContainer");
let conversationHistory = [{'role': 'system', 'content': '你是一个无所不能的帮手' }];
var count = 0;
let center_to_out = ''
const options = {
    gfm: true
  };
function updateChatWindow(content, id) {
    const existingDiv = document.getElementById(id);
    center_to_out += content.replace(/^"|"$/g, '');
    // let push_origin = center_to_out;
    if (existingDiv) {
        existingDiv.innerHTML = `<pre>${marked.parse(center_to_out.replace(/\\n/g, '\n'),options)}</pre>`;//.replace(/\\n/g, "<br/>").replace(/ /g, "&nbsp;")
        chatWindow.scrollTop = chatWindow.scrollHeight;
    } else {
        const userChat = document.createElement('div');
        userChat.classList.add('chat', 'chat-end');
        userChat.innerHTML = `<div class="chat-bubble" id=${count}><strong>AI:</strong>${center_to_out}</div>`;
        const conversationContainer = document.getElementById('conversationContainer');
        conversationContainer.appendChild(userChat);
    }
    
}


async function makeOpenAIRequest(model, messages) {
    if (isRequestInProgress) {
        showAlert('等待上一个请求完成！');
        return;
    }

    isRequestInProgress = true;
    const conversationContainer = document.getElementById('conversationContainer');
    const userChat = document.createElement('div');
    userChat.classList.add('chat', 'chat-start');
    userChat.innerHTML = `<div class="chat-bubble"><strong>用户:</strong> ${messages[messages.length-1].content}</div>`;
    conversationContainer.appendChild(userChat);

    const loadingChat = document.createElement('div');
    loadingChat.classList.add('chat', 'chat-end');
    loadingChat.setAttribute('id', 'loading');
    loadingChat.innerHTML = `<div class="chat-bubble"><strong>AI</strong><br/><button class="btn btn-square"><span class="loading loading-spinner"></span></button></div>`;
    conversationContainer.appendChild(loadingChat);
    try {
        const encodedMessages = encodeURIComponent(JSON.stringify(messages));
        const encodedModel = encodeURIComponent(model);

        const eventSource = new EventSource(`http://8.138.104.244:5000/chat?messages=${encodedMessages}&model=${encodedModel}`);
        eventSource.addEventListener('message', function(event) {
            const content = event.data;
            if (content === '{"done": true}') {
                // end_to_ = document.getElementById(`${count}`);
                // end_to_.innerHTML = `<pre>${marked.parse(center_to_out.replace(/\\n/g, '\n'))}</pre>`
                console.log('end');
            } else {
                const existingLoadingChat = document.getElementById('loading');
                if (existingLoadingChat) {
                    conversationContainer.removeChild(existingLoadingChat);
                };
                updateChatWindow(content, count);
            }
        });
        eventSource.addEventListener('error', function(error) {
            // console.error('连接错误:', error);
            eventSource.close();
        });
    } catch (error) {
        showAlert(error);
    } finally {
        center_to_out = '';
        isRequestInProgress = false;
    }
}


function handleKeyPress(event) {
    if (event.key === 'Enter' || event.type === 'click') {
        chatWindow.scrollTop = chatWindow.scrollHeight;
        const modelSelect = document.getElementById('modelSelect');
        const selectedModel = modelSelect.value;
        const promptInput = document.getElementById('promptInput');
        const userPrompt = promptInput.value.trim();
        conversationHistory.push({ role: 'user', content: userPrompt });
        promptInput.value = '';
        if (selectedModel == 'dall-e-3') {
            // makeOpenAIRequest(selectedModel, conversationHistory);
            // count += 1;
            showAlert('厚米 求你别搞我！！');
        } else {
            let net_ = "";
            var checkbox = document.getElementById('myCheckbox');
            if (checkbox.checked) {
                net_ = "net-";
            } else {
                net_ = net_;
            }
            let result_model = net_.concat("", selectedModel);
            makeOpenAIRequest(result_model, conversationHistory);
            count += 1;
        }
    }
}