// 基础设置
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

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
    }
];

// 修改游戏状态管理
let currentGame = null; // 使用单个游戏变量替代 games Map

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
                startGame(challenger, accepter); // 如果接受挑战 则开始游戏
            }

        } else {
            io.to(data.challengerId).emit('challengeRejected', {
                name: players.get(socket.id).name
            });// 如果拒绝挑战 则通知挑战者拒绝
        }
    });

    // 添加处理答题事件的监听器
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

// 修改处理答案函数
function handleAnswer(playerId, data) {
    if (!currentGame) {
        console.log('答案处理失败: 当前没有进行中的游戏');
        return;
    }

    const currentQuestion = currentGame.questions[currentGame.currentQuestion];
    const otherPlayer = currentGame.players.find(p => p.id !== playerId);

    // 检查答案是否正确
    if (data.answer === currentQuestion.correct) {
        // 答对加2分
        currentGame.scores[playerId] = (currentGame.scores[playerId] || 0) + 2;
        console.log('答题正确:', {
            玩家名称: players.get(playerId).name,
            当前分数: currentGame.scores[playerId]
        });
    } else {
        // 答错给对方加1分
        currentGame.scores[otherPlayer.id] = (currentGame.scores[otherPlayer.id] || 0) + 1;
        console.log('答题错误:', {
            答错玩家: players.get(playerId).name,
            对方得分: currentGame.scores[otherPlayer.id]
        });
    }

    // 发送回合结果
    currentGame.players.forEach(player => {
        io.to(player.id).emit('roundResult', {
            correctAnswer: currentQuestion.correct,
            scores: currentGame.scores,
            winner: playerId,
            isGameOver: currentGame.scores[playerId] >= 5 || currentGame.scores[otherPlayer.id] >= 5
        });
    });

    // 检查是否游戏结束
    const winningPlayer = currentGame.players.find(p =>
        (currentGame.scores[p.id] || 0) >= 5
    );

    if (winningPlayer) {
        console.log('游戏结束:', {
            获胜者: players.get(winningPlayer.id).name,
            最终得分: currentGame.scores
        });
        endGame(currentGame);
        return;
    }

    // 准备下一题
    currentGame.currentQuestion++;
    if (currentGame.currentQuestion < currentGame.questions.length) {
        console.log(`开始第 ${currentGame.currentQuestion} 题`);
        setTimeout(() => startNewRound(currentGame), 3000);
    } else {
        console.log('所有题目已答完，游戏结束');
        endGame(currentGame);
    }
}

// 修改开始游戏函数
function startGame(player1, player2) {
    console.log('开始游戏:', player1, player2);

    currentGame = {
        players: [
            { id: player1, name: players.get(player1).name, score: 0 },
            { id: player2, name: players.get(player2).name, score: 0 }
        ],
        currentQuestion: 0,
        questions: [...questions].sort(() => Math.random() - 0.5).slice(0, 5),
        answers: {},
        scores: {},
        roundStartTime: null
    };

    players.get(player1).inGame = true;
    players.get(player2).inGame = true;

    // 向两个玩家发送游戏开始事件
    currentGame.players.forEach(player => {
        io.to(player.id).emit('gameStart', {
            players: currentGame.players,
            question: currentGame.questions[0]  // 删除 roundNumber
        });
    });

    // 开始第一轮
    startNewRound(currentGame);
}

// 修改开始新回合函数
function startNewRound(game) {
    if (game.currentQuestion < game.questions.length) {
        game.players.forEach(player => {
            io.to(player.id).emit('newQuestion', {
                question: game.questions[game.currentQuestion]
            });
        });
    }
}

// 查找玩家所在的游戏
function findPlayerGame(playerId) {
    // 遍历所有游戏，找到包含该玩家ID的游戏
    for (const [gameId, game] of games) {
        if (game.players.includes(playerId)) {
            return game;
        }
    }
    return null;
}

// 计算回合结果
function calculateRoundResult(game) {
    const currentQuestion = game.questions[game.currentQuestion];
    const answers = game.answers;
    let winner = null;

    console.log('开始计算回合结果:', {
        当前题目: currentQuestion.question,
        正确答案: currentQuestion.options[currentQuestion.correct],
        玩家答案: Object.fromEntries(
            Object.entries(answers).map(([id, data]) => [
                players.get(id).name,
                {
                    选择答案: currentQuestion.options[data.answer],
                    用时: data.time
                }
            ])
        )
    });

    // 找出答对且最快的玩家
    game.players.forEach(player => {
        const playerAnswer = answers[player.id];
        if (playerAnswer && playerAnswer.answer === currentQuestion.correct) {
            if (!winner || playerAnswer.time < answers[winner].time) {
                winner = player.id;
            }
        }
    });

    // 计算得分
    if (winner) {
        const winnerName = players.get(winner).name;
        game.scores[winner] = (game.scores[winner] || 0) + 2;
        const loser = game.players.find(player => player.id !== winner);

        console.log('本轮获胜者:', {
            玩家名称: winnerName,
            答题用时: answers[winner].time,
            当前得分: game.scores[winner]
        });

        if (answers[loser.id].answer !== currentQuestion.correct) {
            game.scores[winner] += 1;
            console.log(`${winnerName} 获得额外1分(对手答错)`);
        }
    } else {
        console.log('本轮无人答对');
    }

    // 发送结果
    console.log('发送回合结果:', {
        当前分数: game.scores,
        是否游戏结束: game.scores[winner] >= 5
    });

    game.players.forEach(player => {
        io.to(player.id).emit('roundResult', {
            correctAnswer: currentQuestion.correct,
            scores: game.scores,
            winner: winner,
            answers: answers,
            currentQuestion: game.currentQuestion,
            totalQuestions: game.questions.length,
            isGameOver: game.scores[winner] >= 5
        });
    });

    // 检查游戏是否结束
    if (game.scores[winner] >= 5) {
        console.log('游戏结束:', {
            获胜者: players.get(winner).name,
            最终得分: game.scores
        });
        endGame(game);
        return;
    }

    // 准备下一轮
    game.currentQuestion++;
    if (game.currentQuestion < game.questions.length) {
        console.log(`准备开始第 ${game.currentQuestion + 1} 题`);
        setTimeout(() => startNewRound(game), 5000);
    } else {
        console.log('所有题目已答完，游戏结束');
        endGame(game);
    }
}

// 修改游戏结束函数
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