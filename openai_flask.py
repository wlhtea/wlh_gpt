from werkzeug.utils import secure_filename
from flask import Flask, request, Response
from flask import make_response, jsonify
from flask_cors import CORS
from docx import Document
import requests
import base64
import fitz
import json
import os

app = Flask(__name__)
CORS(app, supports_credentials=True)

free_model_ohmy = ['gemini-pro','gpt-3.5-turbo','gpt-3.5-turbo-16k','gpt-3.5-turbo-instruct','tts-1','dall-e-3','text-embedding-ada-002']
def gpt_chat_interface(messages, model):
    headers = {}

    # Prepare the data for the POST request
    data = {
        'model': model,
        'messages': messages,
        'stream': True
    }
    godurl = 'https://api.gptgod.online/v1/chat/completions'
    ohmyurl = 'https://cfcus02.opapi.win/v1/chat/completions'
    url = ''
    # Make the POST request and handle the stream

    if model in free_model_ohmy:
        url = ohmyurl
        headers = {
            'Authorization':'Bearer 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'
        }
    else:
        url = godurl
        headers = {
            'Authorization': f'Bearer '
        }
    with requests.post(url, headers=headers, json=data, stream=True) as response:
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line == 'data: [DONE]':
                    break

                if decoded_line.startswith('data: '):
                    data_str = decoded_line.replace('data: ', '')
                    data_json = json.loads(data_str)
                    content = data_json['choices'][0]['delta'].get('content', '')
                    if content == '':
                        continue
                    yield f'data: {json.dumps(content, ensure_ascii=False)}\n\n'
    yield 'data: {"done": true}\n\n'

@app.route('/chat', methods=['GET', 'POST', 'OPTIONS'])
def chat_sse():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        return response
    elif request.method == 'POST' or request.method == 'GET':
        # Handle the actual SSE request
        messages = request.args.get('messages', '')  # Assuming messages is a JSON-formatted string
        model = request.args.get('model', '')
        conversationHistory = json.loads(messages)
        return Response(gpt_chat_interface(conversationHistory, model), content_type='text/event-stream; charset=utf-8',
                        headers={'Access-Control-Allow-Origin': '*'})
    else:
        # Handle other cases
        return jsonify({"error": "Method Not Allowed", "message": "Use POST or GET method for this endpoint"}), 405

def read_image_to_base64(image_path):
    try:
        with open(image_path, "rb") as image_file:
            image_content = image_file.read()
            base64_encoded = base64.b64encode(image_content).decode('utf-8')
            return base64_encoded

    except Exception as e:
        print(f"读取图像文件时发生错误: {e}")
        return None

def read_word_file(file_path):
    try:
        doc = Document(file_path)
        content = []
        for paragraph in doc.paragraphs:
            content.append(paragraph.text)
        return content

    except Exception as e:
        print(f"读取Word文件时发生错误: {e}")
        return None

def extract_text_from_pdf(pdf_path):
    pdf_document = None
    try:
        pdf_document = fitz.open(pdf_path)
        extracted_text = ""
        for page_number in range(pdf_document.page_count):
            page = pdf_document[page_number]
            # 提取文本
            text = page.get_text()
            # 拼接提取到的文本
            extracted_text += f"Page {page_number + 1}:\n{text}\n{'=' * 30}\n"
        return extracted_text

    except Exception as e:
        return f"Error: {e}"

    finally:
        if pdf_document:
            pdf_document.close()

def handle_file(file_path):
    print(file_path.lower())
    if file_path.lower().endswith('.pdf'):
        return extract_text_from_pdf(file_path)
    elif file_path.lower().endswith(('.doc', '.docx')):
        return read_word_file(file_path)
    elif file_path.lower().endswith(('png', 'jpg', 'jpeg', 'gif')):
        return read_image_to_base64(file_path)
    else:
        return '不支持的文件类型'

@app.route('/extract_text', methods=['POST'])
def extract_text():
    try:
        file = request.files['file']
        filename = secure_filename(file.filename)
        file_path = os.path.join(r"./pdf", filename)
        file.save(file_path)
        extracted_text = handle_file(file_path)
        print(f'这是{filename}文件内容:',str(extracted_text))
        return jsonify({'result': f'这是{filename}文件内容:'+str(extracted_text)})

    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0',debug=True, port=5000)
