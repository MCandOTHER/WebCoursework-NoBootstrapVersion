const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// 存储玩家和游戏信息
const players = new Map();
const games = new Map();

// 设置 Express 服务静态文件的目录为 'public'
app.use(express.static('public'));

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
        console.log(`玩家 ${socket.id} 向 ${targetId} 发起挑战`); // 调试
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
        console.log('收到挑战响应:', data); // 调试

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

    // 处理答题
    socket.on('answer', (data) => {
        // 处理玩家的答案
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

// 题库
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
    }
];

// 游戏控制函数
function startGame(player1, player2) {
    console.log('开始游戏:', player1, player2); // 调试日志

    const gameId = `${player1}-${player2}`;
    const game = {
        players: [
            { id: player1, name: players.get(player1).name, score: 0 },
            { id: player2, name: players.get(player2).name, score: 0 }
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

// 开始新回合
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

// 处理答案
function handleAnswer(playerId, data) {
    const game = findPlayerGame(playerId);
    if (!game || game.answers[playerId]) return; // 已答题，直接返回

    game.answers[playerId] = {
        answer: data.answer,
        time: Date.now() - game.roundStartTime
    };

    if (Object.keys(game.answers).length === 2) {
        calculateRoundResult(game);
    }
}

// 计算回合结果
function calculateRoundResult(game) {
    const currentQuestion = game.questions[game.currentQuestion];
    const answers = game.answers;
    let winner = null;

    // 找出答对且最快的玩家
    game.players.forEach(player => {
        const playerAnswer = answers[player.id];
        if (playerAnswer.answer === currentQuestion.correct) {
            if (!winner || playerAnswer.time < answers[winner].time) {
                winner = player.id;
            }
        }
    });

    // 计算得分并检查是否达到胜利条件
    if (winner) {
        game.scores[winner] = (game.scores[winner] || 0) + 2;
        const loser = game.players.find(player => player.id !== winner);

        if (answers[loser.id].answer !== currentQuestion.correct) {
            game.scores[winner] += 1;
        }

        // 检查是否有玩家得分大于等于5分
        if (game.scores[winner] >= 5) {
            // 直接结束游戏
            game.players.forEach(player => {
                io.to(player.id).emit('roundResult', {
                    correctAnswer: currentQuestion.correct,
                    scores: game.scores,
                    winner: winner,
                    answers: answers,
                    isGameOver: true
                });
            });
            endGame(game);
            return;
        }
    }

    // 发送轮次结果
    game.players.forEach(player => {
        io.to(player.id).emit('roundResult', {
            correctAnswer: currentQuestion.correct,
            scores: game.scores,
            winner: winner,
            answers: answers,
            isGameOver: false
        });
    });

    // 准备下一轮
    game.currentQuestion++;
    if (game.currentQuestion < game.questions.length) {
        setTimeout(() => startNewRound(game), 7000);
    } else {
        endGame(game);
    }
}

// 结束游戏
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
    console.log('Server running on port 3000');  // 调试
});