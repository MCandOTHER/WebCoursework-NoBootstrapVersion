const socket = io();
let currentGame = null;
let playerName = '';

// 显示指定界面
function showScreen(screenId) {
    console.log('切换界面到:', screenId);

    // 隐藏所有游戏界面
    document.querySelectorAll('.game-screen').forEach(screen => {
        screen.style.display = 'none';
    });

    // 显示指定界面
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.style.display = 'block';
    } else {
        console.error('未找到目标界面:', screenId);
    }
}

// 当点击"加入游戏"按钮时
document.getElementById('joinGame').addEventListener('click', () => {
    playerName = document.getElementById('playerName').value.trim();
    if (playerName) {
        socket.emit('join', playerName);
        showScreen('lobbyScreen');
    }
});

// 当点击玩家列表中的挑战按钮时
function setupChallengeButtons() {
    document.querySelectorAll('.challenge-btn').forEach(button => {
        button.onclick = function () {
            const targetId = this.dataset.playerId;
            console.log('发起挑战给玩家:', targetId); // 调试
            socket.emit('challenge', targetId);
        };
    });
}

// 处理收到的挑战请求
socket.on('challengeRequest', (data) => {
    console.log('收到挑战请求:', data); // 调试
    const { fromId, fromName } = data;

    // 显示挑战请求区域
    const challengeRequestArea = document.getElementById('challengeRequestArea');
    const challengeText = document.getElementById('challengeText');

    challengeText.textContent = `${fromName} want to challenge you! `;
    challengeRequestArea.style.display = 'block';

    document.getElementById('acceptChallenge').setAttribute('data-challenger-id', fromId);
});

// 处理接受挑战按钮的点击
document.getElementById('acceptChallenge').addEventListener('click', function () {
    const challengerId = this.getAttribute('data-challenger-id');
    console.log('正在接受挑战, 挑战者ID:', challengerId);

    // 发送接受挑战响应
    socket.emit('challengeResponse', {
        accept: true,
        challengerId: challengerId,
        accepterName: playerName
    });

    // 隐藏挑战请求区域
    document.getElementById('challengeRequestArea').style.display = 'none';
    // 隐藏大厅界面，显示游戏界面
    showScreen('gameScreen');
});

// 处理拒绝挑战按钮的点击
document.getElementById('rejectChallenge').addEventListener('click', function () {
    const challengerId = document.getElementById('acceptChallenge').getAttribute('data-challenger-id');

    socket.emit('challengeResponse', {
        accept: false,
        challengerId: challengerId
    });

    // 隐藏挑战请求区域
    document.getElementById('challengeRequestArea').style.display = 'none';
});

// 更新玩家列表函数
function updatePlayerList(players) {
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = ''; // 清空现有列表

    if (players.length === 0) {
        playerList.innerHTML = '<div class="no-players">暂无其他在线玩家</div>';
        return;
    }

    players.forEach(player => {
        // 不显示自己和已在游戏中的玩家
        if (player.id !== socket.id && !player.inGame) {
            const playerElement = document.createElement('div');
            playerElement.className = 'player-item';
            playerElement.innerHTML = `
                <span class="player-name">${player.name}</span>
                <button class="btn btn-primary challenge-btn" data-player-id="${player.id}">
                    Challenge
                </button>
            `;
            playerList.appendChild(playerElement);
        }
    });

    // 重新绑定挑战按钮事件
    setupChallengeButtons();
}

// 加入游戏时的处理
socket.on('playerList', (players) => {
    console.log('收到玩家列表更新:', players); // 调试日志
    updatePlayerList(players);
});

// 更新计分板函数
function updateScoreBoard(players, scores) {
    const player1 = players[0];
    const player2 = players[1];

    const player1Score = scores ? scores[player1.id] || 0 : 0;
    const player2Score = scores ? scores[player2.id] || 0 : 0;

    document.getElementById('player1Score').textContent = `${player1.name}: ${player1Score} point`;
    document.getElementById('player2Score').textContent = `${player2.name}: ${player2Score} point`;
}

// 显示游戏结果函数
function showGameResult(data) {
    // 显示结果界面
    showScreen('resultScreen');

    const winnerName = currentGame.players.find(p => p.id === data.winner)?.name || '未知玩家';
    const winnerScore = data.scores[data.winner];

    // 显示获胜者
    document.getElementById('winnerDisplay').innerHTML = `
        <h3>🎉🎉🎉WINNER: ${winnerName}</h3>
    `;

    // 显示最终得分
    document.getElementById('finalScores').innerHTML = `
        <div class="final-scores">
            <p>${currentGame.players[0].name}: ${data.scores[currentGame.players[0].id] || 0} point</p>
            <p>${currentGame.players[1].name}: ${data.scores[currentGame.players[1].id] || 0} point</p>
        </div>
    `;
}

// 修改游戏开始事件处理
socket.on('gameStart', (data) => {
    console.log('收到游戏开始事件:', data);
    currentGame = data;

    showScreen('gameScreen');
    updateScoreBoard(data.players, {});

    if (data.question) {
        displayQuestion(data.question);
    }
});

// 修改新问题事件处理
socket.on('newQuestion', (data) => {
    console.log('收到新问题:', data);
    displayQuestion(data.question);
});

// 修改回合结果处理
socket.on('roundResult', (data) => {
    console.log('收到回合结果:', {
        正确答案索引: data.correctAnswer,
        玩家得分: data.scores,
        是否游戏结束: data.isGameOver
    });

    // 更新分数
    updateScoreBoard(currentGame.players, data.scores);

    // 显示正确答案
    const options = document.querySelectorAll('.option-btn');
    options.forEach((btn, index) => {
        if (index === data.correctAnswer) {
            btn.classList.add('correct');
            console.log(`正确答案是选项 ${index + 1}: ${btn.textContent}`);
        }
    });

    // 检查游戏是否结束
    if (data.isGameOver) {
        // 延迟显示结果，让玩家看到最后一题的正确答案
        setTimeout(() => {
            showGameResult(data);
        }, 2000);
    } else {
        setTimeout(() => {
            document.querySelectorAll('.option-btn').forEach(btn => {
                btn.classList.remove('correct', 'wrong');
                btn.disabled = false;
            });
        }, 3000);
    }
});

// 显示问题的函数
function displayQuestion(question) {
    // 获取问题和选项的容器元素
    const questionText = document.getElementById('questionText');
    const optionsGrid = document.getElementById('options');

    // 清空之前的选项
    optionsGrid.innerHTML = '';

    // 设置问题文本
    questionText.textContent = question.question;

    // 创建选项按钮
    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'btn btn-outline-primary option-btn';
        button.textContent = option;

        // 添加点击事件监听器
        button.onclick = function () {
            console.log('玩家选择答案:', {
                选项内容: option,
                选项索引: index
            });

            // 发送答案给服务器
            socket.emit('answer', {
                answer: index,
                time: Date.now()
            });

            // 禁用所有选项按钮
            document.querySelectorAll('.option-btn').forEach(btn => {
                btn.disabled = true;
            });
        };

        optionsGrid.appendChild(button);
    });
}

// 添加返回大厅按钮事件
document.getElementById('returnToLobby').addEventListener('click', () => {
    showScreen('lobbyScreen');
    // 清理游戏状态
    currentGame = null;
});