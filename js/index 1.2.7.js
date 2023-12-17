let isRequestInProgress = false;
var hight_value = 30;

// 窗口默认底部
let chatWindow = document.getElementById("conversationContainer");
chatWindow.scrollTop = 0;

let conversationHistory = [{'role': 'system', 'content': '你是一个无所不能的帮手' }];
var exist_pdf = '';
var count = 0;
let center_to_out = ''

const chatBubbleClasses = [
    "chat-bubble-secondary",
    "chat-bubble-primary",
    "chat-bubble-accent",
    "chat-bubble-info",
    "chat-bubble-success",
    "chat-bubble-warning",
    "chat-bubble-error"
];

const options = {
    gfm: true,
    // smartypants: true,
    // smartLists: true
  };

function uploadPDF() {
    var pdfInput = document.getElementById('fileInput');
    var file = pdfInput.files[0];
    if (!file) {
        return;
    }
    var formData = new FormData();
    formData.append('file', file);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://8.138.104.244:5000/extract_text');
    xhr.onload = function () {
        if (xhr.status === 200) {
            var response = JSON.parse(xhr.responseText);
            conversationHistory.push({ role: 'user', content: response.result});
        } else {
            showAlert(false,`上传失败${error}`);
        }
    };
    xhr.onerror = function () {
        console.error('请求出错');
    };
    xhr.send(formData);
}

// async function handleUpload() {
//     try {
//         const response = await uploadPDF();
//         console.log('成功！服务器响应：', response);
//     } catch (error) {
//         console.error('上传失败：', error);
//     }
// }


function showAlert(isSuccess, message) {
    var toastContainer = document.getElementById('toastContainer');
    toastContainer.innerHTML = '';

    var toast = document.createElement('div');
    toast.className = 'toast';

    if (isSuccess) {
        toast.classList.add('alert-success');
    } else {
        toast.classList.add('alert-info');
    }

    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(function() {
        toast.style.opacity = 1;
    }, 10);
    setTimeout(function() {
        toast.style.opacity = 0;
    }, 2000);
    setTimeout(function() {
        toastContainer.innerHTML = '';
    }, 2500);
}

function updateChatWindow(content, id) {
    const existingDiv = document.getElementById(id);
    center_to_out += content.replace(/^"|"$/g, '').replace(/\\"/g,'"');
    // let push_origin = center_to_out;
    if (existingDiv) {
        existingDiv.innerHTML = `<pre>${marked.parse(center_to_out.replace(/\\n/g, '\n').replace(/\n\n\n/g, '\n'),options)}</pre>`;//.replace(/\\n/g, "<br/>").replace(/ /g, "&nbsp;")
        var element = document.getElementById('count');
        if (element) {
          element.classList.add('mockup-code');
        }
        hljs.highlightAll();
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
        showAlert(false,'等待上一个请求完成！');
        return;
    }

    const randomClass = chatBubbleClasses[Math.floor(Math.random() * chatBubbleClasses.length)];

    isRequestInProgress = true;
    const conversationContainer = document.getElementById('conversationContainer');
    const userChat = document.createElement('div');
    userChat.classList.add('chat', 'chat-start');
    userChat.innerHTML = `<div class="chat-bubble ${randomClass}">${messages[messages.length-1].content}</div>`;
    conversationContainer.appendChild(userChat);

    const loadingChat = document.createElement('div');
    loadingChat.classList.add('chat', 'chat-end');
    loadingChat.setAttribute('id', 'loading');
    loadingChat.innerHTML = `<div class="chat-bubble"><button class="btn btn-square"><span class="loading loading-spinner"></span></button></div>`;
    conversationContainer.appendChild(loadingChat);
    try {
        let net_ = "";
        var checkbox = document.getElementById('myCheckbox');
        function checked_to(){
            if (checkbox.checked) {
                showAlert(true,'开启联网模式');
                net_ = "net-";
                model = net_.concat("", model);
            } else {
                net_ = net_;
            }
        }
        checked_to();
        const encodedMessages = encodeURIComponent(JSON.stringify(messages));
        const encodedModel = encodeURIComponent(model);

        const eventSource = new EventSource(`http://8.138.104.244:5000/chat?messages=${encodedMessages}&model=${encodedModel}`);
        eventSource.addEventListener('message', function(event) {
            const content = event.data;
            if (content === '{"done": true}') {
                conversationHistory.push({ role: 'assistant', content: center_to_out});
                // 获取id为"count"的div元素
                var countDiv = document.getElementById(count);

                // 获取div中的所有pre标签
                var preTags = countDiv.getElementsByTagName("pre");

                // 遍历所有pre标签并替换为div标签
                for (var i = 0; i < preTags.length; i++) {
                    var preTag = preTags[i];
                    var divTag = document.createElement("div");
                    divTag.innerHTML = preTag.innerHTML;
                    countDiv.replaceChild(divTag, preTag);
                }
                MathJax.typeset()
                chatWindow.scrollTop = chatWindow.scrollHeight;
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
        showAlert(false,error);
    } finally {
        center_to_out = '';
        isRequestInProgress = false;
    }
}


function handleKeyPress(event) {
    if ((event.key === 'Enter' && !event.shiftKey) || event.type === 'click' ) {
        if (displayFileName() != exist_pdf){
            uploadPDF();
            exist_pdf = displayFileName();
        }
        event.preventDefault();
        const modelSelect = document.getElementById('modelSelect');
        const selectedModel = modelSelect.value;
        const promptInput = document.getElementById('promptInput');
        const userPrompt = promptInput.value.trim();
        if (userPrompt === '') {
            showAlert(false, '请输入内容后再发送！');
            return;
        }
        conversationHistory.push({ role: 'user', content: userPrompt });
        promptInput.value = '';
        chatWindow.scrollTop = chatWindow.scrollHeight;
        if (selectedModel == 'dall-e-3') {
            showAlert(false,'厚米 求你别搞我！！');
        } else {
            console.log(conversationHistory);
            makeOpenAIRequest(selectedModel, conversationHistory);
            count += 1;
        }
    }else{
        var input_values_id = document.getElementById("promptInput");
        input_values_id.style.height = 'auto';
        input_values_id.style.height = `${input_values_id.scrollHeight-26}px`;
      }
}


// var input_values_id = document.getElementById("promptInput");
// input_values_id.addEventListener('change',handleKeyPress);
// input_values_id.addEventListener('input',handleKeyPress)


var myCheckboxfy = document.getElementById('myCheckboxfy');
myCheckboxfy.addEventListener('change', transale);
function transale(){
    if (myCheckboxfy.checked){
        showAlert(true,'开启翻译模式');
        conversationHistory.push({role:'system',content:'## 角色 & 任务 ### 任务 我希望你以一个专业翻译团队的身份，协助完成从英文到中文的翻译任务。 ### 角色 对于每个翻译任务，我将扮演三个专家角色，分别负责翻译、校对与润色工作： 1. 翻译专家：具有20年翻译经验，精通中英双语，并拥有丰富的跨学科知识。此阶段的目标是提供一份既忠实于原文，又在中文中读起来流畅自然的初稿。在翻译时，特别注重保持原文的风格和语调。 2. 资深校对编辑：拥有20年专业编辑经验，中文系毕业，对中文语法、用词有精准把握。在此阶段，您需要对翻译稿进行深度校对，包括语法、用词、风格的校正，确保翻译的准确性和易读性，进而输出第二版翻译稿。 3. 润色专家：作为一位拥有20年写作经验的获奖作家，擅长各种风格流派的写作。在此阶段，您需要在校对编辑提供的稿件基础上，进行风格上的润色，提高文本的文学美感，同时保持原文的专业性和准确性。例如，润色诗歌时应使用更优美、富有意境的语言；润色科技类文章时则应维持其专业性和准确性。 ## 工作流程 ### 1. 翻译阶段 参与人：翻译专家 输出物：翻译稿件 任务：提供忠实原文且流畅的中文初稿。 ### 2. 校对阶段 参与人：资深校对编辑 输出物：校对过的翻译稿件 任务：深度校对初稿，保证准确性和易读性。 ### 3. 润色阶段 参与人：润色专家 输出物：润色过后的最终翻译稿 任务：提升文本的风格美感，同时保持专业性和准确性. 最终输出内容：翻译的最终内容，其余信息无需输出'})
    } else{
        conversationHistory = [{'role': 'system', 'content': '你是一个无所不能的帮手' }];
    }
}

function displayFileName() {
    var fileInput = document.getElementById('fileInput');
    var file = fileInput.files[0];
    try{
        return file.name;
    }catch{
        return '';
    }
    
}

function handleFileUpload(event) {
    // 获取上传的文件
    var uploadedFile = event.target.files[0];
  
    // 检查是否有文件上传
    if (uploadedFile) {
        uploadPDF();
    }
  }