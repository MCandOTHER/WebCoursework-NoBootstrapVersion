// 引入 Express 框架，它是一个 Node.js Web 应用框架，用于创建 Web 服务器
const express = require('express');
// 创建一个 Express 应用实例
const app = express();
// 创建一个 HTTP 服务器，将 Express 应用包装在其中
const http = require('http').createServer(app);
// 引入并初始化 Socket.IO，它用于实现实时双向通信
const io = require('socket.io')(http);

// 创建两个 Map 对象来存储玩家和游戏信息
// Map 是一种键值对的数据结构，类似于对象，但更适合频繁的增删改查
const players = new Map();  // 存储所有在线玩家的信息
const games = new Map();    // 存储所有正在进行的游戏

// 设置 Express 服务静态文件的目录为 'public'
// 这样 public 文件夹中的文件（如 HTML、CSS、JS）可以直接通过 URL 访问
app.use(express.static('public'));

// 当有新的客户端连接时触发此事件
io.on('connection', (socket) => {
    // socket 对象代表与单个客户端的连接
    // 每个连接的客户端都有一个唯一的 socket.id

    // 监听 'join' 事件（当玩家输入名字加入游戏时触发）
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

    // 监听 'challenge' 事件（当玩家向其他玩家发起挑战时触发）
    socket.on('challenge', (targetId) => {
        console.log(`玩家 ${socket.id} 向 ${targetId} 发起挑战`); // 添加调试日志
        const challenger = players.get(socket.id);

        if (challenger && !challenger.inGame) {
            // 向目标玩家发送挑战请求
            io.to(targetId).emit('challengeRequest', {
                fromId: socket.id,
                fromName: challenger.name
            });
        }
    });

    // 监听 'challengeResponse' 事件
    socket.on('challengeResponse', (data) => {
        console.log('收到挑战响应:', data); // 调试日志

        if (data.accept) {
            const challenger = data.challengerId;
            const accepter = socket.id;

            if (players.has(challenger) && players.has(accepter) &&
                !players.get(challenger).inGame && !players.get(accepter).inGame) {
                startGame(challenger, accepter);
            }
        } else {
            io.to(data.challengerId).emit('challengeRejected', {
                name: players.get(socket.id).name
            });
        }
    });

    // 监听 'answer' 事件（当玩家回答问题时触发）
    socket.on('answer', (data) => {
        // 处理玩家的答案
        handleAnswer(socket.id, data);
    });

    // 监听 'disconnect' 事件（当玩家断开连接时触发）
    socket.on('disconnect', () => {
        if (players.has(socket.id)) {
            console.log(`玩家 ${players.get(socket.id).name} 离开了游戏`);
            players.delete(socket.id);
            // 广播更新后的玩家列表
            io.emit('playerList', Array.from(players.values()));
        }
    });
});

// 修改题目数据结构
const questions = [
    {
        question: "什么是 JavaScript 中的闭包？",
        options: [
            "一种数据类型",
            "一个函数及其词法环境的组合",
            "一个对象方法",
            "一种循环结构"
        ],
        correct: 1
    },
    // ...更多题目
];

// 修改开始游戏的函数
function startGame(player1, player2) {
    console.log('开始游戏:', player1, player2); // 调试日志

    const gameId = `${player1}-${player2}`;
    const game = {
        players: [
            {
                id: player1,
                name: players.get(player1).name,
                score: 0
            },
            {
                id: player2,
                name: players.get(player2).name,
                score: 0
            }
        ],
        currentQuestion: 0,
        questions: [...questions].sort(() => Math.random() - 0.5).slice(0, 5),
        answers: {},
        roundStartTime: null
    };

    games.set(gameId, game);
    players.get(player1).inGame = true;
    players.get(player2).inGame = true;

    // 向两个玩家发送游戏开始事件
    game.players.forEach(player => {
        io.to(player.id).emit('gameStart', {
            players: game.players,
            question: game.questions[0],
            roundNumber: 1
        });
    });

    // 开始第一轮
    startNewRound(game);
}

// 添加新的轮次开始函数
function startNewRound(game) {
    game.roundStartTime = Date.now();
    game.answers = {};

    game.players.forEach(pid => {
        io.to(pid).emit('newQuestion', {
            question: game.questions[game.currentQuestion],
            roundNumber: game.currentQuestion + 1
        });
    });
}

// 修改处理答案的函数
function handleAnswer(playerId, data) {
    const game = findPlayerGame(playerId);
    if (!game || game.answers[playerId]) return; // 如果已经答过题，直接返回

    game.answers[playerId] = {
        answer: data.answer,
        time: Date.now() - game.roundStartTime
    };

    // 如果两个玩家都已答题，计算分数
    if (Object.keys(game.answers).length === 2) {
        calculateRoundResult(game);
    }
}

// 添加计算轮次结果的函数
function calculateRoundResult(game) {
    const currentQuestion = game.questions[game.currentQuestion];
    const answers = game.answers;
    let winner = null;

    // 找出答对且最快的玩家
    game.players.forEach(playerId => {
        const playerAnswer = answers[playerId];
        if (playerAnswer.answer === currentQuestion.correct) {
            if (!winner || playerAnswer.time < answers[winner].time) {
                winner = playerId;
            }
        }
    });

    // 计算得分
    if (winner) {
        game.scores[winner] += 2;
        const loser = game.players.find(id => id !== winner);
        if (answers[loser].answer !== currentQuestion.correct) {
            game.scores[winner] += 1;
        }
    }

    // 发送轮次结果
    game.players.forEach(pid => {
        io.to(pid).emit('roundResult', {
            correctAnswer: currentQuestion.correct,
            scores: game.scores,
            winner: winner,
            answers: answers
        });
    });

    // 准备下一轮或结束游戏
    game.currentQuestion++;
    if (game.currentQuestion < game.questions.length) {
        setTimeout(() => startNewRound(game), 7000);
    } else {
        endGame(game);
    }
}

// 添加结束游戏的函数
function endGame(game) {
    const winner = Object.entries(game.scores)
        .sort(([, a], [, b]) => b - a)[0][0];

    game.players.forEach(pid => {
        io.to(pid).emit('gameOver', {
            scores: game.scores,
            winner: winner
        });
        if (players.has(pid)) {
            players.get(pid).inGame = false;
        }
    });

    games.delete(`${game.players[0]}-${game.players[1]}`);
}

// 查找玩家所在的游戏
function findPlayerGame(playerId) {
    // 遍历所有游戏，找到包含该玩家ID的游戏
    for (const [gameId, game] of games) {
        if (game.players.includes(playerId)) {
            return game;
        }
    }
    return null;  // 如果没找到返回null
}

// 启动服务器，监听3000端口
http.listen(3000, () => {
    console.log('Server running on port 3000');  // 在控制台打印启动成功消息
});