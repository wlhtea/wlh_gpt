import fitz  # PyMuPDF
from flask import Flask, request, jsonify
from flask_cors import CORS  # 导入CORS模块

app = Flask(__name__)
CORS(app)  # 启用CORS扩展


def extract_text_from_pdf(pdf_path):
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
            print(extracted_text)
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
        # 获取上传的文件
        file = request.files['file']

        # 保存文件到本地
        file_path = '../../../AppData/Roaming/JetBrains/PyCharm2023.2/scratches/uploaded_file.pdf'
        file.save(file_path)

        # 提取PDF文本
        extracted_text = extract_text_from_pdf(file_path)

        # 返回提取的文本
        return jsonify({'result': extracted_text})

    except Exception as e:
        return jsonify({'error': str(e)})


if __name__ == '__main__':
    app.run(host='0.0.0.0',port=5001)
