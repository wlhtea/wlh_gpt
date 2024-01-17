let isRequestInProgress = false;
var hight_value = 30;
var open_start = 0;
// 窗口默认底部
let chatWindow = document.getElementById("conversationContainer");
chatWindow.scrollTop = 0;

let conversationHistory = [{'role': 'system', 'content': '你是一个无所不能的帮手' }];
var exist_pdf = '';
var count = 0;
let center_to_out = ''
// var url_base = 'http://8.138.104.244:5000';
var url_base = 'http://127.0.0.1:5000'
// var url_base = 'https://api.w-l-h.xyz'
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

  function uploadFile() {
    isRequestInProgress = true;
    var fileInput = document.getElementById('fileInput');
    var files = fileInput.files;
    var contributeDiv = document.getElementById('add_contribute');
    var originalContent = contributeDiv.innerHTML; // 保存原始内容
    contributeDiv.innerHTML = '<span class="loading loading-infinity loading-lg"></span>';
    
    // 不允许的文件扩展名列表
    const forbiddenExtensions = ['exe', 'bat', 'sh', 'js', 'php', 'py', 'rb', 'pl'];

    let uploadPromises = [];

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        const fileExt = file.name.split('.').pop().toLowerCase();

        // 检查文件扩展名是否在禁止列表中
        if (forbiddenExtensions.includes(fileExt)) {
            alert(`文件类型 .${fileExt} 不被允许上传`);
            fileInput.value = '';
            isRequestInProgress = false;
            contributeDiv.innerHTML = originalContent;
            return;
        }

        let formData = new FormData();
        formData.append('file', file);

        let uploadPromise = fetch(`${url_base}/upload`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .catch(error => {
            console.error('上传出错:', error);
        });

        uploadPromises.push(uploadPromise);
    }

    Promise.all(uploadPromises).then(data => {
        showAlert(true, `所有文件上传成功！`);
        data.forEach(fileLink => {
            if (fileLink) {
                conversationHistory.push({ role: 'user', content: `这是上传的文档链接${fileLink}`});
            }
        });
        contributeDiv.innerHTML = originalContent;
        isRequestInProgress = false;
    });
}

// 获取时间
function getCurrentDateTime() {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1; // 月份从0开始，所以要加1
    var day = now.getDate();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var seconds = now.getSeconds();

    // 格式化为字符串
    var formattedDateTime = year + '/' + month + '/' + day + ' ' + hours + ':' + minutes + ':' + seconds;

    return formattedDateTime;
}


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

function updateChatWindow(content, id,model) {
    const existingDiv = document.getElementById(id);
    center_to_out += content.replace(/^"|"$/g, '').replace(/\\"/g,'"');
    // let push_origin = center_to_out;
    if (existingDiv) {
        existingDiv.innerHTML = `<pre>${marked.parse(center_to_out.replace(/\\n/g, '\n').replace(/\n\n\n/g, '\n'),options)}</pre>`;//.replace(/\\n/g, "<br/>").replace(/ /g, "&nbsp;")
        var element = document.getElementById('count');
        if (element) {
          element.classList.add('mockup-code');
        }
        MathJax.typeset();
        chatWindow.scrollTop = chatWindow.scrollHeight;
        hljs.highlightAll();
        var countDiv = document.getElementById(count);
        var preTags = countDiv.getElementsByTagName("pre");
        for (var i = 0; i < preTags.length; i++) {
            var preTag = preTags[i];
            var divTag = document.createElement("div");
            divTag.innerHTML = preTag.innerHTML;
            countDiv.replaceChild(divTag, preTag);
        }
    } else {
        const userChat = document.createElement('div');
        userChat.classList.add('chat', 'chat-end');
        userChat.innerHTML = `<div class="chat-header">
        Time
        <time class="text-xs opacity-50">${getCurrentDateTime()}</time>
        </div>
        <div class="chat-bubble" id=${count}><strong>AI:</strong><pre>${center_to_out}<pre></div>
        <div class="chat-footer opacity-50">
        ${model}
        </div>`;
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
    
    userChat.innerHTML = `<div class="chat-header">
    Time
    <time class="text-xs opacity-50">${getCurrentDateTime()}</time>
    </div>
    <div class="chat-bubble ${randomClass}">${messages[messages.length-1].content}</div>
    <div class="chat-footer opacity-50">
    User question
    </div>`;
    conversationContainer.appendChild(userChat);

    const loadingChat = document.createElement('div');
    loadingChat.classList.add('chat', 'chat-end');
    loadingChat.setAttribute('id', 'loading');
    loadingChat.innerHTML = `<div class="chat-bubble"><button class="btn btn-square"><span class="loading loading-spinner"></span></button></div>`;
    conversationContainer.appendChild(loadingChat);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    var token = localStorage.getItem('auth_token');
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
        const encodedcookie = encodeURIComponent(token);

        const eventSource = new EventSource(`${url_base}/chat?messages=${encodedMessages}&model=${encodedModel}&cookie=${encodedcookie}`);
        eventSource.addEventListener('message', function(event) {
            const content = event.data;
            console.log(content);
            if (content === '{"done": true}') {
                conversationHistory.push({ role: 'assistant', content: center_to_out});
                MathJax.typeset()
                chatWindow.scrollTop = chatWindow.scrollHeight;
                console.log('end');
                setTimeout(verifyToken(token), 10000);
            } else if (content === '"余额不足"') {
                const existingLoadingChat = document.getElementById('loading');
                if (existingLoadingChat) {
                    conversationContainer.removeChild(existingLoadingChat);
                };
                showAlert(false,'余额不足');
            } else {
                const existingLoadingChat = document.getElementById('loading');
                if (existingLoadingChat) {
                    conversationContainer.removeChild(existingLoadingChat);
                };
                updateChatWindow(content, count,model);
            }
        });
        eventSource.addEventListener('error', function(error) {
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
        event.preventDefault();
        hljs.highlightAll();
        const modelSelect = document.getElementById('modelSelect');
        var selectedModel = modelSelect.getAttribute('value');
        const promptInput = document.getElementById('promptInput');
        const userPrompt = promptInput.value.trim();
        if (userPrompt === '') {
            showAlert(false, '请输入内容后再发送！');
            return;
        }
        conversationHistory.push({ role: 'user', content: userPrompt });
        promptInput.value = '';
        if (selectedModel == 'dall-e-3') {
            showAlert(false,'厚米 求你别搞我！！');
        } else {
            console.log(conversationHistory);
            makeOpenAIRequest(selectedModel, conversationHistory);
            count += 1;
        }
    }
    var input_values_id = document.getElementById("promptInput");
    input_values_id.style.height = 'auto';
    input_values_id.style.height = `${input_values_id.scrollHeight-20}px`;
}


var input_values_id = document.getElementById("promptInput");
input_values_id.addEventListener('change',handleKeyPress);
input_values_id.addEventListener('input',handleKeyPress)


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
        if (displayFileName() != exist_pdf){
            isRequestInProgress = true;
            uploadFile();
            isRequestInProgress = false;
            exist_pdf = displayFileName();
        }
    }
  }

function upfile_(selectedModel){
    fileInput = document.getElementById('uploadIcon');
    if (selectedModel === 'gpt-4-all（可传文档）' || selectedModel === '数据分析（可传文档）' || selectedModel === '信工学院周报生成器') {
        fileInput.style.display = 'block';
        showAlert(true,'点击🧙‍♂️可以上传文档')
    } else {
        fileInput.style.display = 'none';
    }
};

document.getElementById('uploadIcon').addEventListener('click', function() {
    document.getElementById('fileInput').click();
});


let model_ = document.getElementById('modelSelect');
let dropdownItems = document.querySelectorAll('.dropdown-content a');

dropdownItems.forEach(function(item) {
  item.addEventListener('click', function() {
    upfile_(this.textContent);
    var value = this.getAttribute('value');

    // 获取并更新div元素
    var div = document.getElementById('modelSelect');
    div.setAttribute('value', value);
    model_.textContent = this.textContent;
    ul_xlsx = document.getElementById('xlsx_');
    ul_xlsx.style.display = 'none';
  });
});

document.getElementById('modelSelect').addEventListener('click',function(){
    ul_xlsx = document.getElementById('xlsx_');
    ul_xlsx.style.display = 'block';
})

function toggleBackground() {
    var checkbox = document.getElementById('checkbox_buttom');
    var body = document.querySelector('body');
    if (checkbox.checked) {
        // 显示😈，改变为恶魔颜色
        body.style.backgroundColor = '#3e4245';  // 这里使用红色作为恶魔颜色
    } else {
        // 显示😇，改变为天使颜色
        body.style.backgroundColor = '#e5e5e5cb';
    }
}

document.getElementById('icon').addEventListener('click', function() {
    document.getElementById('myLabel').click();
    this.style.animation = 'rotate 1s linear';
    document.getElementById('icon').addEventListener('animationend', function() {
        this.style.animation = '';
    });
});

document.getElementById('checkbox_buttom').addEventListener('click', (event) => {
    document.getElementById('checkbox_buttom').addEventListener('animationend', function() {
        this.style.animation = '';
    });
    toggleBackground();
});


document.getElementById('submit').addEventListener('click', function() {
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    // 使用fetch来发送请求
    fetch(`${url_base}/verify_user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({username: username, password: password})
    })
    .then(response => response.json())
    .then(data => {
        var drawerSide = document.querySelector('.drawer');
        if(data.success){
            localStorage.setItem('auth_token', data.token);
            showAlert(true,`${data.username}登录成功 钱包剩余：${data.balance}`)
            drawerSide.innerHTML = 
                `
                <div class="drawer">
                    <input id="my-drawer" type="checkbox" class="drawer-toggle" style="z-index: 1002"/>
                    <div class="drawer-side">
                    <label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
                    <ul class="menu bg-base-200 w-56 rounded-box">
                    <li><a style='color=none;text-decoration: none;'><button class="btn btn-wide btn-neutral">退出登录</button></a></li>
                    <li>
                        <h2 class="menu-title">${username}&nbsp&nbsp&nbsp余额:&nbsp${data.balance}<img style="height: 20px; width: 20px;" src="images/刷新.svg" alt="图标描述"></h2>
                        <details close>
                        <summary>使用说明</summary>
                        <ul>
                            <li><a>使用必看</a></li>
                            <li><a>消耗明细</a></li>
                        </ul>
                    </li>
                    <li>
                    <details open>
                    <summary>历史对话</summary>
                        <ul>
                            <li><a>2020.10.2</a></li>
                            <li><a>2020.10.1</a></li>
                        </ul>
                    </li>
                </ul>
                </div>
            `;
        }else{
            password = '';
            showAlert(false,'用户名或密码错误');
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});

function to_get_balance(){
    var token = localStorage.getItem('auth_token');
    if (token) {
        verifyToken(token);
    }
}

// 每次页面加载时执行
document.addEventListener("DOMContentLoaded", function() {
    to_get_balance();
});

// 验证token的函数
function verifyToken(token) {
    fetch(`${url_base}/verify_token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({token: token})
    })
    .then(response => response.json())
    .then(data => {
        var drawerSide_exist = document.querySelector('.menu-title')
        if (data.success && !drawerSide_exist) {
            console.log(data.balance);
            var drawerSide = document.querySelector('.drawer');
            // showAlert(true,`${data.username}登录成功 钱包剩余：${data.balance}`)
            drawerSide.innerHTML = 
                `
                <div class="drawer">
                    <input id="my-drawer" type="checkbox" class="drawer-toggle"/>
                    <div class="drawer-side">
                    <label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
                    <ul class="menu bg-base-200 w-56 rounded-box">
                    <li><a style='color=none;text-decoration: none;'><button class="btn btn-wide btn-neutral">退出登录</button></a></li>
                    <li>
                        <h2 class="menu-title">${data.username}&nbsp&nbsp&nbsp余额:&nbsp${data.balance}<button onclick = "to_get_balance()"><img style="height: 15px; width: 15px;" src="images/刷新.svg" alt="图标描述"></button></h2>
                        <details close>
                        <summary>使用说明</summary>
                        <ul>
                            <li><a>使用必看</a></li>
                            <li><a>消耗明细</a></li>
                        </ul>
                    </li>
                    <li>
                    <details open>
                    <summary>历史对话</summary>
                        <ul>
                            <li><a>2020.10.2</a></li>
                            <li><a>2020.10.1</a></li>
                        </ul>
                    </li>
                </ul>
                </div>
            `;
        } else if(drawerSide_exist){
            drawerSide_exist.innerHTML = `${data.username}&nbsp&nbsp&nbsp余额:&nbsp${data.balance}<button onclick = "to_get_balance()"><img style="height: 15px; width: 15px;" src="images/刷新.svg" alt="图标描述"></button>`
        }
        else {
            showAlert(false,'请登录');
        }
    })
    .catch(error => console.error('Error:', error));
}

