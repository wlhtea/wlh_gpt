import mysql.connector
from mysql.connector import errorcode

# 数据库配置
db_config = {
    'user': 'root',
    'password': '12345678',
    'host': 'localhost'
}

# 连接数据库
try:
    cnx = mysql.connector.connect(**db_config)
    cursor = cnx.cursor()
except mysql.connector.Error as err:
    if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        print("用户名或密码错误")
    elif err.errno == errorcode.ER_BAD_DB_ERROR:
        print("数据库不存在")
    else:
        print(err)
else:
    # 检查数据库是否存在
    cursor.execute("SHOW DATABASES")
    if 'wsql' not in [x[0] for x in cursor]:
        raise Exception("请创建一个名字为wsql的数据库")

    # 连接到wsql数据库
    cnx.database = 'wsql'

    # 定义表的SQL
    TABLES = {}
    TABLES['users'] = (
        "CREATE TABLE `users` ("
        "  `user_id` int NOT NULL AUTO_INCREMENT,"
        "  `username` varchar(255) NOT NULL,"
        "  `password` varchar(255) NOT NULL,"
        "  `email` varchar(255),"
        "  `phone` varchar(255) NOT NULL UNIQUE,"
        "  `balance` decimal(14,7),"
        "  PRIMARY KEY (`user_id`)"
        ") ENGINE=InnoDB")


    TABLES['user_conversations'] =(
    "CREATE TABLE `user_conversations` ("
    "  `conversation_time` DATETIME,"
    "  `user_id` int NOT NULL,"
    "  `conversation_id` int NOT NULL,"
    "  `user_input` text,"
    "  `AI_output` text,"
    "  `input_values` FLOAT,"
    "  `output_values` FLOAT,"
    "   PRIMARY KEY (`conversation_id`, `user_id`)"
    ") ENGINE=InnoDB")

    TABLES['user_cookie'] = (
        "CREATE TABLE `user_cookie` ("
        "  `CookieID` int AUTO_INCREMENT PRIMARY KEY,"
        "  `user_id` int NOT NULL,"
        "  `CookieData` text,"
        "  `CreationDate` datetime DEFAULT CURRENT_TIMESTAMP,"
        "  `ExpiryDate` datetime NOT NULL,"
        "  `IsActive` boolean DEFAULT TRUE,"
        "  FOREIGN KEY (`user_id`) REFERENCES users(`user_id`)"
        ") ENGINE=InnoDB")

# 检查每个表是否存在，如果不存在则创建
for table_name in TABLES:
    table_description = TABLES[table_name]
    try:
        print(f"正在检查表：{table_name}")
        cursor.execute(table_description)
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_TABLE_EXISTS_ERROR:
            print(f"表 {table_name} 已存在。")
        else:
            print(err.msg)
    else:
        print(f"表 {table_name} 创建成功。")

# 关闭cursor和connection
cursor.close()
cnx.close()
print("数据库初始化完成。")