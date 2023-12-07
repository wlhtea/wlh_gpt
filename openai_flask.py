from flask import Flask, request, Response
from flask import make_response, jsonify
import requests
import json
import os
from flask_cors import CORS
from time import sleep

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


from flask import jsonify

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
        print(messages)
        print(model)
        return Response(gpt_chat_interface(conversationHistory, model), content_type='text/event-stream; charset=utf-8',
                        headers={'Access-Control-Allow-Origin': '*'})
    else:
        # Handle other cases
        return jsonify({"error": "Method Not Allowed", "message": "Use POST or GET method for this endpoint"}), 405


if __name__ == '__main__':
    app.run(debug=True)
