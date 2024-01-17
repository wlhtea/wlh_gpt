from zhipuai import ZhipuAI

client = ZhipuAI(api_key="")  # 请填写您自己的APIKey

tools = [
    {
        "type": "function",
        "function": {
            "name": "file_search",
            "description": "根据用户信息提供对应的文档查询，并总结文档内容",
            "parameters": {
                "type": "object",
                "properties": {
                    "href": {
                        "type": "string",
                        "description": "文章的链接地址",
                    },
                },
                "required": ["href"],
            },
        }
    }
]
messages = [
    {
        "role": "user",
        "content": "https://wfree.w-l-h.xyz/uploads/2022_ICM_Problem_D1.pdf 查询这个文档内容"
    }
]
response = client.chat.completions.create(
    model="glm-4", # 填写需要调用的模型名称
    messages=messages,
    tools=tools,
    tool_choice="auto",
)
print(response)