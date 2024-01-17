import tiktoken
import openai


def num_tokens_from_messages(messages, model="gpt-3.5-turbo-0613"):
    """Return the number of tokens used by a list of messages."""
    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        print("Warning: model not found. Using cl100k_base encoding.")
        encoding = tiktoken.get_encoding("cl100k_base")
    if model in {
            "gpt-3.5-turbo-0613",
            "gpt-3.5-turbo-16k-0613",
            "gpt-4-0314",
            "gpt-4-32k-0314",
            "gpt-4-0613",
            "gpt-4-32k-0613",
        }:
        tokens_per_message = 3
        tokens_per_name = 1
    elif model == "gpt-3.5-turbo-0301":
        tokens_per_message = 4  # every message follows <|start|>{role/name}\n{content}<|end|>\n
        tokens_per_name = -1  # if there's a name, the role is omitted
    elif "gpt-3.5-turbo" in model:
        print("Warning: gpt-3.5-turbo may update over time. Returning num tokens assuming gpt-3.5-turbo-0613.")
        return num_tokens_from_messages(messages, model="gpt-3.5-turbo-0613")
    elif "gpt-4" in model:
        print("Warning: gpt-4 may update over time. Returning num tokens assuming gpt-4-0613.")
        return num_tokens_from_messages(messages, model="gpt-4-0613")
    else:
        raise NotImplementedError(
            f"""num_tokens_from_messages() is not implemented for model {model}. See https://github.com/openai/openai-python/blob/main/chatml.md for information on how messages are converted to tokens."""
        )
    num_tokens = 0
    for message in messages:
        num_tokens += tokens_per_message
        for key, value in message.items():
            num_tokens += len(encoding.encode(value))
            if key == "name":
                num_tokens += tokens_per_name
    num_tokens += 3  # every reply is primed with <|start|>assistant<|message|>

    cost_ = [
        {'gpt-4-1106-preview': 0.01 / 1000,
         'gpt-4-1106-vision-preview': 0.01 / 1000,
         'gpt-4-0613':0.06/1000,
         'gpt-4-32k':0.06/1000,
         'gpt-4': 0.03 / 1000,
         'gpt-3.5-turbo-1106': 0.0010 / 1000,
         'gpt-3.5-turbo-0613': 0.0010 / 1000,
         'gpt-3.5-turbo-0301': 0.0015 / 1000,
         'gpt-3.5-turbo-instruct': 0.0015 / 1000}
    ]
    print(model)
    how_much_money = cost_[0].get(model)
    print(how_much_money)
    return int(num_tokens)*how_much_money*7.20

"""message example"""
example_messages = [{'role': 'system', 'content': '你是一个无所不能的帮手'}, {'role': 'user', 'content': '你好'}, {'role': 'assistant', 'content': '你好！有什么我可以帮助你的吗？'}, {'role': 'user', 'content': '水仙花代码python和java'}, {'role': 'assistant', 'content': '水仙花数是指一个三位数，其各位数字的立方和等于该数本身。以下是Python和Java的水仙花数代码示例：\n\nPython代码：\n```python\nfor num in range(100, 1000):\n    digit_sum = 0\n    temp = num\n    while temp > 0:\n        digit = temp % 10\n        digit_sum += digit ** 3\n        temp //= 10\n    if num == digit_sum:\n        print(num)\n```\n\nJava代码：\n```java\npublic class DaffodilNumber {\n    public static void main(String[] args) {\n        for (int num = 100; num < 1000; num++) {\n            int digitSum = 0;\n            int temp = num;\n            while (temp > 0) {\n                int digit = temp % 10;\n                digitSum += Math.pow(digit, 3);\n                temp /= 10;\n            }\n            if (num == digitSum) {\n                System.out.println(num);\n            }\n        }\n    }\n}\n```\n\n这两个代码段都会输出所有的水仙花数，即153、370和371。'}]
print(example_messages[-2:])
