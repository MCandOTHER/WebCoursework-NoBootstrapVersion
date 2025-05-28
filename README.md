# Web Coursework Report

## 0. There's something I'd like to tell you in advance
This is not the version I intended to upload. I'll explain the reason in the subsequent report. If you're curious about the version I really wanted to upload, you can visit the following link:

    https://github.com/MCandOTHER/WebCoursework

## 1. Introduction of the whole website

### i. Front-end page structure
The website conposed of **index.html** as the roott page, and **about.html** to intorduce more about my personal information, and **quiz.html** to offer a small game. 

- **Introduction（index.html）**: The introduction page is a simple page to display web content related to personal information. 

      `<body>` 部分包含了导航栏、主要内容区域和页脚。导航栏使用自定义样式，提供了多个导航链接，如“Lobby”“About Me”“MyGithub”和“Game”，并且有一个切换黑暗模式的按钮。主要内容区域分为背景容器和介绍容器，介绍容器内有一张卡片，卡片左右两侧分别展示个人基本信息和兴趣爱好。页脚部分提供了联系信息，包括微信和 GitHub 账号。最后，文档引入了外部 JavaScript 文件，用于实现可能的交互功能。 


- **About Page（about.html）**: 同样是左图右文的布局，左侧展示个人头像和简要介绍，右侧介绍个人兴趣爱好等信息。
- **Quiz（quiz.html）**: 包含登录界面、玩家大厅、游戏界面和结果界面。登录界面让玩家输入姓名加入游戏，玩家大厅显示在线玩家列表并可发起挑战，游戏界面展示题目和选项，结果界面显示游戏结果。
- **Universal Style Sheets (style.css)**: 
- **About Page Style Sheets (about.css)**: 
- **Quiz Page Style Sheets (quiz.css)**: 
- **Universal Scripts (script.js)**: 
- **Quiz Page Scripts (quiz.js)**: 

### 后端实现细节
#### 客户端与服务器通信
使用 Node.js 和 Socket.IO 实现客户端与服务器的实时通信。服务器端使用 Express 框架搭建，通过 `http` 模块创建服务器，并使用 Socket.IO 监听客户端连接。客户端通过引入 `socket.io.js` 与服务器建立连接。

#### 事件处理机制
- **玩家连接**: 当有新的客户端连接时，服务器监听 `connection` 事件。玩家输入姓名点击“Join The Game!”按钮后，客户端发送 `join` 事件给服务器，服务器将玩家信息存储在 `players` Map 中，并广播更新后的玩家列表给所有客户端。
- **挑战请求**: 玩家在玩家大厅点击挑战按钮，客户端发送 `challenge` 事件给服务器，服务器向目标玩家发送 `challengeRequest` 事件。目标玩家收到挑战请求后，可选择接受或拒绝。
- **答案提交**: 玩家在游戏界面选择答案后，客户端发送 `answer` 事件给服务器，服务器根据答案判断对错并更新分数，然后发送 `roundResult` 事件给所有玩家。

## 二、反思部分

### 开发过程中遇到的挑战
- **实时通信实现**: 确保客户端与服务器之间的实时通信稳定是一个挑战，特别是在多人同时操作时，可能会出现消息丢失或延迟的问题。
- **CSS Validation Issues**: At first, the website used **Bootstrap v3.4.1**, which I can use it proficiently, but when I uploaded all the progress of my front-end work and tried to pass the CSS validation, I found that there were 200 warnings and errors in the Bootstrap I referenced. Faced with the dilemma of either resolving the errors in the official version of Bootstrap or rewriting the entire website with a similar style without using Bootstrap, I ultimately decided to rewrite it. I submitted the new version to a new repository and saved the original website that used Bootstrap on GitHub.
- **多人游戏逻辑同步**: 在多人游戏中，保证所有玩家的游戏状态和分数同步是一个复杂的问题，需要处理各种异常情况，如玩家断开连接、答案提交超时等。

### 解决方案及经验教训
- **实时通信实现**: 使用 Socket.IO 的事件机制和错误处理机制，确保消息的可靠传输。同时，对关键事件进行日志记录，方便排查问题。
- **多人游戏逻辑同步**: 在服务器端维护游戏状态，每次状态更新后广播给所有玩家。同时，增加心跳机制，检测玩家的连接状态，及时处理断开连接的玩家。

## 三、参考文献
- Express 官方文档: https://expressjs.com/
- Socket.IO 官方文档: https://socket.io/
- Node.js 官方文档: https://nodejs.org/

## 四、GenAI 使用声明
本报告使用了生成式 AI 工具 ChatGPT 进行内容校对和部分语句优化，但核心结构和主要内容均由本人自主完成。