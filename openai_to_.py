from werkzeug.utils import secure_filename
from flask import Flask, request, Response
from flask import make_response, jsonify
from mysql.connector import Error
from flask_cors import CORS
import mysql.connector
import jwt
import datetime
import bcrypt
import requests
import json
import os
import dotenv
import secrets


SECRET_KEY = 'saqW8vI1J9h3bKPWAkKq'
dotenv.load_dotenv('.env')
API_KEY = os.environ.get("OPEN_API_KEY")

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config['UPLOAD_FOLDER'] = r'./uploads/'  # 设置文件上传的目标文件夹
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 限制文件大小为16MB

def gpt_chat_interface(messages, model):
    content_all = ''
    data = {
        'model': model,
        'messages': messages,
        'stream': True
    }
    godurl = 'https://api.gptgod.online/v1/chat/completions'
    url = godurl
    headers = {
        'Authorization': f'Bearer {API_KEY}'
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
                    content_all += content
                    yield f'data: {json.dumps(content, ensure_ascii=False)}\n\n'

    yield 'data: {"done": true}\n\n'

def save_chat_data_to_sql(user_id,user_question,gpt_answer):
    pass

@app.route('/chat', methods=['GET', 'POST', 'OPTIONS'])
def chat_sse():
    if request.method == 'POST' or request.method == 'GET':
        cookie = request.args.get('cookie', '')
        messages = request.args.get('messages', '')  # Assuming messages is a JSON-formatted string
        model = request.args.get('model', '')
        cookie_verify_ = json.loads(verify_cookie(cookie).data)

        success_or_ = cookie_verify_.get('success')
        balance = cookie_verify_.get('balance')
        username = cookie_verify_.get('username')
        print(success_or_,balance,username)
        if success_or_:
            if username and float(balance) > 0: #验证balance大于等于0才能扣费
                # username 进行扣费
                # 对username进行传递应该是，在对话结束后进行扣费操作并显示在个人明细中
                pass
            else:
                content = f'data: {json.dumps("余额不足", ensure_ascii=False)}\n\n'
                return Response(content,
                         content_type='text/event-stream; charset=utf-8',
                         headers={'Access-Control-Allow-Origin': '*'})

        else:
            content = f'data: {json.dumps("请登录账号", ensure_ascii=False)}\n\n'
            return Response(content,
                     content_type='text/event-stream; charset=utf-8',
                     headers={'Access-Control-Allow-Origin': '*'})


        conversationHistory = json.loads(messages)
        return Response(gpt_chat_interface(conversationHistory, model), content_type='text/event-stream; charset=utf-8',
                        headers={'Access-Control-Allow-Origin': '*'})
    else:
        # Handle other cases
        return jsonify({"error": "Method Not Allowed", "message": "Use POST or GET method for this endpoint"}), 405

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return '没有文件部分', 400
    file = request.files['file']
    if file.filename == '':
        return '没有选择文件', 400
    file_ext = os.path.splitext(file.filename)[1].lower()
    forbidden_extensions = ['.exe', '.bat', '.sh', '.js', '.php', '.py', '.rb', '.pl']
    if file_ext in forbidden_extensions:
        return f'文件类型 {file_ext} 不被允许上传', 400
    filename = secure_filename(file.filename)
    path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(path)
    file_url = send_file_to_get_ID(path)
    return file_url

def send_file_to_get_ID(file_path):
    url = "http://api.gptgod.online/v1/file"
    headers = {
        'Authorization': f'Bearer {API_KEY}'
    }
    files = {'file': (file_path, open(file_path, 'rb'))}
    response = requests.post(url, headers=headers, files=files)
    data = response.json()
    return data.get("data", {}).get("url")

# 数据库配置
db_config = {
    'user': 'root',
    'password': '12345678',
    'host': 'localhost',
    'database': 'wsql',
    'autocommit' : False
}
# 连接数据库

@app.route('/verify_user', methods=['POST'])
def verify_user():
    connection = mysql.connector.connect(**db_config)
    cursor = connection.cursor()
    data = request.json
    username = data.get('username')
    password = data.get('password')

    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()

        cursor.execute("SELECT user_id, balance FROM users WHERE username = %s AND password = %s", (username, password))
        result = cursor.fetchone()

        if result:
            user_id, balance = result
            token = jwt.encode({
                'user': username,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, SECRET_KEY, algorithm="HS256")

            try:
                cursor.execute("INSERT INTO user_cookie (user_id, CookieData, ExpiryDate) VALUES (%s, %s, %s)",
                               (user_id, token, datetime.datetime.utcnow() + datetime.timedelta(hours=24)))
                connection.commit()
            except Error as e:
                print("插入cookie表时出错：", e)
                return jsonify({'success': False, 'error': str(e)}), 500
            return jsonify({'success': True, 'balance': balance, 'token': token})
        else:
            return jsonify({'success': False, 'message': 'Invalid credentials'})

    except Error as e:
        print("数据库连接或查询时出错：", e)
        return jsonify({'success': False, 'error': str(e)}), 500

    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def verify_cookie(cookie_user):
    connection = mysql.connector.connect(**db_config)
    cursor = connection.cursor()
    try:
        # 在 user_cookie 表中验证 token 并获取 user_id
        cursor.execute("SELECT user_id, ExpiryDate FROM user_cookie WHERE CookieData = %s", (cookie_user,))
        cookie_record = cursor.fetchone()

        if cookie_record:
            user_id, expiry_date = cookie_record

            # 验证 token 是否过期
            if expiry_date > datetime.datetime.now():
                # 使用 user_id 从 users 表中获取 username 和 balance
                cursor.execute("SELECT username, balance FROM users WHERE user_id = %s", (user_id,))
                user_record = cursor.fetchone()
                if user_record:
                    username, balance = user_record
                    return jsonify({'success': True, 'username': username, 'balance': balance})
                else:
                    return jsonify({'success': False, 'message': 'User not found'})
            else:
                return jsonify({'success': False, 'message': 'Token expired'})

        return jsonify({'success': False, 'message': 'Invalid token'})

    except Error as e:
        print("数据库连接或查询时出错：", e)
        return jsonify({'success': False, 'message': str(e)})
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

# 用于验证用户的路由
@app.route('/verify_token', methods=['POST'])
def verify_token():
    data = request.json
    token = data.get('token')
    return_username_and_balance = verify_cookie(token)
    return return_username_and_balance






if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(host='0.0.0.0',debug=True, port=5000)
