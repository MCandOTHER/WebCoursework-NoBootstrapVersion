const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const players = new Map();
const questions = [
    // 题目1:下面哪一个不是git文件的类型 git pdf
    {
        question: "Which of the following is not a git file type?",
        options: [
            "git log",
            "git stash",
            "git pdf",
            "git index"
        ],
        correct: 2
    },
    // 题目2:下面哪一个不是恶意软件 防火墙
    {
        question: "Which of the following options does NOT belong to malware?",
        options: [
            "Virus",
            "Trojan",
            "Worm",
            "Firewall"
        ],
        correct: 3
    },
    // 题目3:下面哪一个不是操作系统 PS
    {
        question: "Which of the following is NOT an operating system?",
        options: [
            "Windows",
            "Photoshop",
            "Android",
            "Linux"
        ],
        correct: 1
    },
    // 题目4:下面哪一个属于攻击行为 数据库注入
    {
        question: "Which of the following is an attack behavior?",
        options: [
            "SQL Injection",
            "Encryption",
            "Decryption",
            "Compression"
        ],
        correct: 0
    },
    // 题目5:下面哪一个不是数据库 html
    {
        question: "Which of the following is NOT a database?",
        options: [
            "MySQL",
            "MongoDB",
            "SQLite",
            "HTML"
        ],
        correct: 3
    },
    // 题目6:下面哪一个是自带黑客工具的系统 Kali Linux
    {
        question: "Which of the following is a system with built-in hacking tools?",
        options: [
            "Kali Linux",
            "Ubuntu",
            "Windows",
            "MacOS"
        ],
        correct: 0
    },
    // 题目7:下面哪一个不是编程语言 Word
    {
        question: "Which of the following is NOT a programming language?",
        options: [
            "Python",
            "Java",
            "C++",
            "Word"
        ],
        correct: 3
    },
    // 题目8:下面哪一个不是网络协议 HTTP
    {
        question: "Which of the following is NOT a network protocol?",
        options: [
            "HTML",
            "FTP",
            "SMTP",
            "HTTP"
        ],
        correct: 0
    },
    // 题目9:下面哪一个不是网络攻击方式 DDoS
    {
        question: "Which of the following is NOT a network attack method?",
        options: [
            "DDoS",
            "Phishing",
            "Spoofing",
            "Encryption"
        ],
        correct: 3
    },
    // 题目10:下面哪一个html标签不是成对标签 <br>
    {
        question: "Which of the following HTML tags is NOT a pair tag?",
        options: [
            "<div>",
            "<span>",
            "<br>",
            "<p>"
        ],
        correct: 2
    },
];
let currentGame = null;

// 定义静态文件目录
app.use(express.static('public'));

// 定义根路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 当有新的客户端连接时触发
io.on('connection', (socket) => {
    // 处理玩家加入
    socket.on('join', (name) => {
        console.log(`玩家 ${name} 加入了游戏`);
        players.set(socket.id, {
            id: socket.id,
            name: name,
            inGame: false
        });
        // 立即向所有客户端广播更新后的玩家列表
        io.emit('playerList', Array.from(players.values()));
    });

    // 处理挑战请求
    socket.on('challenge', (targetId) => {
        console.log(`玩家 ${socket.id} 向 ${targetId} 发起挑战`);  // 调试
        const challenger = players.get(socket.id);

        if (challenger && !challenger.inGame) {
            // 向目标玩家发送挑战请求
            io.to(targetId).emit('challengeRequest', {
                fromId: socket.id,
                fromName: challenger.name
            });
        }
    });

    // 处理挑战响应
    socket.on('challengeResponse', (data) => {
        console.log('收到挑战响应:', data);  // 调试

        if (data.accept) {
            const challenger = data.challengerId;
            const accepter = socket.id;
            if (players.has(challenger) && players.has(accepter) &&
                !players.get(challenger).inGame && !players.get(accepter).inGame) {
                startGame(challenger, accepter);   // 如果接受挑战 则开始游戏
            }

        } else {
            io.to(data.challengerId).emit('challengeRejected', {
                name: players.get(socket.id).name
            });  // 如果拒绝挑战 则通知挑战者拒绝
        }
    });

    // 处理答题事件
    socket.on('answer', (data) => {
        console.log('收到答题:', {
            玩家ID: socket.id,
            玩家名称: players.get(socket.id)?.name,
            答案数据: data
        });

        handleAnswer(socket.id, data);
    });

    // 处理断开连接
    socket.on('disconnect', () => {
        if (players.has(socket.id)) {
            console.log(`玩家 ${players.get(socket.id).name} 离开了游戏`); // 调试
            players.delete(socket.id);
            // 广播更新后的玩家列表
            io.emit('playerList', Array.from(players.values()));
        }
    });
});

// 处理答案
function handleAnswer(playerId, data) {
    if (!currentGame) {
        console.log('答案处理失败: 当前没有进行中的游戏');
        return;  // ai建议添加处理失败
    }

    const currentQuestion = currentGame.questions[currentGame.currentQuestion];
    const otherPlayer = currentGame.players.find(p => p.id !== playerId);

    // 检查答案是否正确
    if (data.answer === currentQuestion.correct) {
        // 答对加2分
        currentGame.scores[playerId] = (currentGame.scores[playerId] || 0) + 2;
        console.log('答题正确:', {
            玩家名称: players.get(playerId).name,
            当前分数: currentGame.scores[playerId]  // 调试
        });
    } else {
        // 答错给对方加1分
        currentGame.scores[otherPlayer.id] = (currentGame.scores[otherPlayer.id] || 0) + 1;
        console.log('答题错误:', {
            答错玩家: players.get(playerId).name,
            对方得分: currentGame.scores[otherPlayer.id]  // 调试
        });
    }

    // 发送回合结果
    currentGame.players.forEach(player => {
        io.to(player.id).emit('roundResult', {
            correctAnswer: currentQuestion.correct,
            scores: currentGame.scores,
            winner: playerId,
            isGameOver: currentGame.scores[playerId] >= 10 || currentGame.scores[otherPlayer.id] >= 10
        });
    });

    // 检查是否游戏结束
    const winningPlayer = currentGame.players.find(p =>
        (currentGame.scores[p.id] || 0) >= 10
    );

    if (winningPlayer) {
        console.log('游戏结束:', {
            获胜者: players.get(winningPlayer.id).name,  // 调试
            最终得分: currentGame.scores
        });
        endGame(currentGame);
        return;
    }

    // 准备下一题
    currentGame.currentQuestion++;
    if (currentGame.currentQuestion < currentGame.questions.length) {
        console.log(`开始第 ${currentGame.currentQuestion} 题`);  // 调试
        setTimeout(() => startNewRound(currentGame), 3000);
    } else {
        console.log('所有题目已答完，游戏结束');  // 调试
        endGame(currentGame);
    }
}

// 开始游戏
function startGame(player1, player2) {
    console.log('开始游戏:', player1, player2);  // 调试

    currentGame = {
        players: [
            { id: player1, name: players.get(player1).name, score: 0 },
            { id: player2, name: players.get(player2).name, score: 0 }
        ],
        currentQuestion: 0,
        questions: [...questions].sort(() => Math.random() - 0.5).slice(0, 10),
        scores: {}
    };

    players.get(player1).inGame = true;
    players.get(player2).inGame = true;

    // 向两个玩家发送游戏开始事件
    currentGame.players.forEach(player => {
        io.to(player.id).emit('gameStart', {
            players: currentGame.players,
            question: currentGame.questions[0]
        });
    });

    // 开始第一轮
    startNewRound(currentGame);
}

// 开始新回合函数
function startNewRound(game) {
    if (game.currentQuestion < game.questions.length) {
        game.players.forEach(player => {
            io.to(player.id).emit('newQuestion', {
                question: game.questions[game.currentQuestion]
            });
        });
    }
}

// 游戏结束
function endGame(game) {
    game.players.forEach(player => {
        if (players.has(player.id)) {
            players.get(player.id).inGame = false;
        }
    });
    // 重置当前游戏
    currentGame = null;
}

// 启动服务器，监听3000端口
http.listen(3000, () => {
    console.log('Server running on port 3000');  // 调试
});