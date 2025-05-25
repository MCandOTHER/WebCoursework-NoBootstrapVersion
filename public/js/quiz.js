// 创建 Socket.IO 连接
const socket = io();
let currentGame = null;
let playerName = '';

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
            console.log('发起挑战给玩家:', targetId); // 添加调试日志
            socket.emit('challenge', targetId);
        };
    });
}

// 处理收到的挑战请求
socket.on('challengeRequest', (data) => {
    console.log('收到挑战请求:', data); // 调试日志
    const { fromId, fromName } = data;

    // 显示挑战请求区域
    const challengeRequestArea = document.getElementById('challengeRequestArea');
    const challengeText = document.getElementById('challengeText');

    challengeText.textContent = `${fromName} 向你发起挑战！`;
    challengeRequestArea.style.display = 'block';

    // 存储挑战者ID以供后续使用
    document.getElementById('acceptChallenge').setAttribute('data-challenger-id', fromId);
});

// 处理接受挑战按钮的点击
document.getElementById('acceptChallenge').addEventListener('click', function () {
    const challengerId = this.getAttribute('data-challenger-id');
    console.log('正在接受挑战，挑战者ID:', challengerId); // 调试日志

    if (!challengerId) {
        console.error('未找到挑战者ID!');
        return;
    }

    // 发送接受挑战响应
    socket.emit('challengeResponse', {
        accept: true,
        challengerId: challengerId,
        accepterName: playerName
    });

    // 隐藏挑战请求区域
    document.getElementById('challengeRequestArea').style.display = 'none';
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
                    挑战
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

    document.getElementById('player1Score').textContent = `${player1.name}: ${player1Score}分`;
    document.getElementById('player2Score').textContent = `${player2.name}: ${player2Score}分`;
}

// 修改游戏开始事件监听器
socket.on('gameStart', (data) => {
    console.log('收到游戏开始事件:', data);
    currentGame = data;

    showGameScreen();
    // 初始化计分板，传入玩家信息和初始分数
    updateScoreBoard(data.players, {});

    if (data.question) {
        displayQuestion(data.question);
    }
});

// 添加错误处理
socket.on('error', (error) => {
    console.error('Socket错误:', error);
    alert('发生错误：' + error.message);
});

// 添加连接状态监听
socket.on('connect', () => {
    console.log('Socket连接成功，ID:', socket.id);
});

socket.on('disconnect', () => {
    console.log('Socket连接断开');
});

// 显示游戏界面
function showGameScreen() {
    // 隐藏所有游戏界面
    document.querySelectorAll('.game-screen').forEach(screen => {
        screen.style.display = 'none';
    });
    // 显示游戏界面
    document.getElementById('gameScreen').style.display = 'block';
}

// 用于切换显示不同游戏界面的函数
function showScreen(screenId) {
    // 首先隐藏所有游戏界面
    document.querySelectorAll('.game-screen').forEach(screen => {
        screen.style.display = 'none';
    });
    // 显示指定的游戏界面
    document.getElementById(screenId).style.display = 'block';
}

// 显示问题的函数
function displayQuestion(question) {
    // 获取问题区域元素
    const questionText = document.getElementById('questionText');
    const optionsGrid = document.getElementById('options');

    // 清空之前的选项
    optionsGrid.innerHTML = '';

    // 设置问题文本
    questionText.textContent = question.question;

    // 添加选项按钮
    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'btn btn-outline-primary option-btn';
        button.textContent = option;
        button.setAttribute('data-index', index);

        // 添加点击事件监听器
        button.addEventListener('click', function () {
            // 发送答案给服务器
            socket.emit('answer', {
                questionIndex: currentGame.currentQuestion,
                answer: index
            });

            // 禁用所有选项按钮
            document.querySelectorAll('.option-btn').forEach(btn => {
                btn.disabled = true;
            });
        });

        optionsGrid.appendChild(button);
    });

    // 开始计时器
    startTimer();
}

// 添加计时器函数
function startTimer() {
    let timeLeft = 10; // 10秒倒计时
    const timerElement = document.getElementById('timer');

    const timer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = `剩余时间: ${timeLeft}秒`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            // 时间到，禁用所有按钮
            document.querySelectorAll('.option-btn').forEach(btn => {
                btn.disabled = true;
            });
            // 发送超时信息
            socket.emit('answer', {
                questionIndex: currentGame.currentQuestion,
                answer: -1 // 表示超时
            });
        }
    }, 1000);

    // 存储计时器ID以便在需要时清除
    currentGame.timer = timer;
}

// 在游戏开始时清除之前的计时器
socket.on('gameStart', (data) => {
    // ...existing code...
    if (currentGame && currentGame.timer) {
        clearInterval(currentGame.timer);
    }
    // ...existing code...
});

// 添加回合结果事件监听器
socket.on('roundResult', (data) => {
    console.log('收到回合结果:', data);

    // 使用最新的分数更新计分板
    updateScoreBoard(currentGame.players, data.scores);

    // 显示正确答案和其他回合结果信息
    showRoundResult(data);
});