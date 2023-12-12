from flask import Flask, request, Response
from flask import make_response, jsonify
import requests
import json
import os
from flask_cors import CORS
import fitz
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app, supports_credentials=True)

def gpt_chat_interface(messages, model):
    headers = {
        'Authorization': f'Bearer {os.environ["OPENAI_API_KEY"]}'
    }

    # Prepare the data for the POST request
    data = {
        'model': model,
        'messages': messages,
        'stream': True
    }

    # Make the POST request and handle the stream
    with requests.post('https://api.gptgod.online/v1/chat/completions', headers=headers, json=data, stream=True) as response:
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line == 'data: [DONE]':
                    break

                if decoded_line.startswith('data: '):
                    data_str = decoded_line.replace('data: ', '')
                    data_json = json.loads(data_str)
                    content = data_json['choices'][0]['delta'].get('content', '')
                    hh = data_json['choices'][0]['finish_reason']
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

def extract_text_from_pdf(pdf_path):
    pdf_document = None
    try:
        # 打开PDF文件
        pdf_document = fitz.open(pdf_path)

        # 遍历每一页
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
        # 关闭PDF文件
        if pdf_document:
            pdf_document.close()


@app.route('/extract_text', methods=['POST'])
def extract_text():
    try:
        file = request.files['file']
        filename = secure_filename(file.filename)
        file_path = os.path.join(r"./pdf", filename)
        file.save(file_path)
        extracted_text = extract_text_from_pdf(file_path)
        return jsonify({'result': extracted_text})

    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0',debug=True, port=5000)
