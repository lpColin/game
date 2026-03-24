// UI 交互 v2.4 - 单页面布局

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    bindEvents();
    initPlayerUI();
});

// 绑定事件
function bindEvents() {
    // 人数选择下拉 - 切换后自动重新开始
    document.getElementById('player-count-select').addEventListener('change', function() {
        const count = parseInt(this.value);
        gameState.playerCount = count;
        
        // 停止当前游戏
        gameState.gameStarted = false;
        gameState.gameEnded = false;
        
        // 重新初始化并开始
        initGame(count);
        createPlayerUI();
        startNewRound();
        
        // 显示游戏按钮，隐藏开始按钮
        document.getElementById('btn-start').style.display = 'none';
        document.getElementById('btn-look').style.display = 'inline-block';
        document.getElementById('btn-call').style.display = 'inline-block';
        document.getElementById('btn-raise').style.display = 'inline-block';
        document.getElementById('btn-showdown').style.display = 'inline-block';
        document.getElementById('btn-fold').style.display = 'inline-block';
        document.getElementById('btn-restart').style.display = 'inline-block';
        
        // 添加日志
        log(`游戏人数已切换为 ${count} 人，重新开始！`);
    });
    
    // 开始游戏按钮
    document.getElementById('btn-start').addEventListener('click', function() {
        audioManager.playClick();
        startGame();
    });
    
    // 操作按钮
    document.getElementById('btn-look').addEventListener('click', () => humanAction('look'));
    document.getElementById('btn-call').addEventListener('click', () => humanAction('call'));
    document.getElementById('btn-raise').addEventListener('click', () => {
        const amount = prompt('请输入加注金额 (最小' + (gameState.currentBet + 10) + '):', '30');
        if (amount && parseInt(amount) > 0) {
            humanAction('raise', parseInt(amount));
        }
    });
    document.getElementById('btn-fold').addEventListener('click', () => humanAction('fold'));
    
    // 开牌按钮
    document.getElementById('btn-showdown').addEventListener('click', () => {
        startShowdown();
    });
    
    // 再来一局
    document.getElementById('btn-restart').addEventListener('click', function() {
        audioManager.playClick();
        startNewRound();
    });
    
    // 音效开关
    document.getElementById('btn-audio').addEventListener('click', function() {
        const enabled = audioManager.toggle();
        document.getElementById('audio-status').textContent = enabled ? '开' : '关';
        this.textContent = enabled ? '🔊 音效' : '🔇 音效';
    });
    
    // 聊天功能
    bindChatEvents();
}

// 聊天事件绑定
function bindChatEvents() {
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send-chat');
    const btnToggle = document.getElementById('btn-toggle-chat');
    const chatContainer = document.getElementById('chat-container');
    
    if (!chatInput || !btnSend) return;
    
    // 发送消息
    btnSend.addEventListener('click', () => {
        const message = chatInput.value.trim();
        if (message) {
            sendPlayerChat(message);
            chatInput.value = '';
            chatInput.focus(); // 重新获得焦点
        }
    });
    
    // 回车发送
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const message = chatInput.value.trim();
            if (message) {
                sendPlayerChat(message);
                chatInput.value = '';
                chatInput.focus(); // 重新获得焦点
            }
        }
    });
    
    // 收起/展开聊天
    if (btnToggle && chatContainer) {
        btnToggle.addEventListener('click', () => {
            chatContainer.classList.toggle('collapsed');
            btnToggle.textContent = chatContainer.classList.contains('collapsed') ? '展开' : '收起';
        });
    }
}

// 开始游戏
function startGame() {
    const playerCount = parseInt(document.getElementById('player-count-select').value);
    
    // 初始化游戏
    initGame(playerCount);
    
    // 创建玩家界面
    createPlayerUI();
    
    // 开始第一局
    startNewRound();
    
    // 更新按钮显示
    document.getElementById('btn-start').style.display = 'none';
    document.getElementById('btn-look').style.display = 'inline-block';
    document.getElementById('btn-call').style.display = 'inline-block';
    document.getElementById('btn-raise').style.display = 'inline-block';
    document.getElementById('btn-showdown').style.display = 'inline-block';
    document.getElementById('btn-fold').style.display = 'inline-block';
    document.getElementById('btn-restart').style.display = 'inline-block';
}

// 初始化玩家UI（初始显示）
function initPlayerUI() {
    const container = document.getElementById('players-container');
    container.innerHTML = ''; // 空牌桌，不显示提示文字
}

// 创建玩家界面 - 动态布局
function createPlayerUI() {
    const container = document.getElementById('players-container');
    const table = document.getElementById('poker-table');
    container.innerHTML = '';
    
    const playerCount = gameState.players.length;
    
    // 设置牌桌形状类名
    table.className = `poker-table players-${playerCount}`;
    
    // 使用扇形角度定位，确保真人固定在底部，其他玩家沿弧均匀分布
    // 计算参与定位的玩家顺序，真人优先放入数组（以便固定角度 270°）
    let orderedPlayers = [];
    const humanPlayer = gameState.players.find(p => p.type === 'human');
    const otherPlayers = gameState.players.filter(p => p.type !== 'human');
    if (humanPlayer) orderedPlayers.push(humanPlayer);
    orderedPlayers = orderedPlayers.concat(otherPlayers);

    const N = orderedPlayers.length;
    // 非真人玩家数量
    const M = Math.max(0, N - 1);

    // 布局策略：2人上下、3人左右下、4人上下左右、5+人顶部扇形均匀分布
    const anglesMap = [];

    if (N === 2) {
        // 2人：人在下，另一个在上
        anglesMap.push(270, 90);
    } else if (N === 3) {
        // 3人：人在下中，顺时针左上、右上
        anglesMap.push(270, 180, 0);  // [人,左,右] 顺时针
    } else if (N === 4) {
        // 4人：人在下中，顺时针 左、上、右
        anglesMap.push(270, 180, 90, 0);  // [人,左,上,右] 顺时针(270°→180°→90°→0°)
    } else {
        // 5人+：所有 N 个玩家以真人为起点，均匀分布在 360° 上
        // 真人固定在 270°，其他玩家每隔 360/N° 均匀排列
        anglesMap.push(270);  // 真人固定在 270°
        
        const angleStep = 360 / N;
        for (let i = 1; i < N; i++) {
            const angle = (270 + i * angleStep) % 360;
            anglesMap.push(angle);
        }
    }

    // 椭圆半径（百分比，相对于容器的 50% 中心）——可调，减小半径让玩家更靠内侧
    const rx = 42; // 水平半径百分比（更靠内）
    const ry = 36; // 垂直半径百分比

    // 创建玩家卡片并放置于计算位置
    orderedPlayers.forEach((player, playerIndex) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = `player player-position ${player.type === 'human' ? 'human-player' : 'ai-player'}`;
        playerDiv.id = `player-${player.id}`;

        playerDiv.innerHTML = `
            <div class="chat-bubble-container" id="chat-bubble-${player.id}"></div>
            <div class="action-toast-container" id="toast-${player.id}"></div>
            <div class="avatar">${player.avatar}</div>
            <div class="name">${player.name}</div>
            <div class="player-type">${player.style}</div>
            <div class="chips">💰<span id="chips-${player.id}">${player.chips}</span></div>
            <div class="action" id="action-${player.id}" style="display:none;"></div>
        `;

        // 计算位置：使用 anglesMap 直接通过 playerIndex 索引
        const angleDeg = anglesMap[playerIndex];

        const rad = angleDeg * Math.PI / 180;
        // 以容器中心 50%/50% 为基准，向外偏移 rx/ry
        const cx = 50;
        const cy = 50;
        const leftPerc = cx + Math.cos(rad) * rx;
        const topPerc = cy - Math.sin(rad) * ry; // CSS top 向下为正

        playerDiv.style.position = 'absolute';
        playerDiv.style.left = `${leftPerc}%`;
        playerDiv.style.top = `${topPerc}%`;
        playerDiv.style.transform = 'translate(-50%, -50%)';

        container.appendChild(playerDiv);

        // 为每个玩家创建牌容器，放在牌桌中心附近（比玩家头像更靠内）
        const cardsDiv = document.createElement('div');
        cardsDiv.className = `cards player-cards`;
        cardsDiv.id = `cards-${player.id}`;
        
        // 根据角度判断：只有正左侧(接近180°)和正右侧(接近0°/360°)的牌才竖向排列
        // 其他角度（上下及其他）保持横向
        const normalizedAngle = (angleDeg + 360) % 360;
        const distTo0 = Math.min(normalizedAngle, 360 - normalizedAngle);    // 到0°的距离
        const distTo180 = Math.abs(normalizedAngle - 180);                   // 到180°的距离
        const minDistToLR = Math.min(distTo0, distTo180);                    // 到左右的最小距离
        
        // 显式设置 flex-direction：左右竖向，上下及其他横向
        if (minDistToLR <= 45) {
            cardsDiv.style.flexDirection = 'column';
            cardsDiv.style.gap = '6px';
        } else {
            cardsDiv.style.flexDirection = 'row';
            cardsDiv.style.gap = '4px';
        }
        
        cardsDiv.innerHTML = `
            <div class="card back"></div>
            <div class="card back"></div>
            <div class="card back"></div>
        `;

        // 牌的位置：沿同一角度但更靠内侧（距离中心更近）
        const cardsRadiusRx = 26;
        const cardsRadiusRy = 22;
        const cardsLeft = cx + Math.cos(rad) * cardsRadiusRx;
        const cardsTop = cy - Math.sin(rad) * cardsRadiusRy;

        cardsDiv.style.position = 'absolute';
        cardsDiv.style.left = `${cardsLeft}%`;
        cardsDiv.style.top = `${cardsTop}%`;
        cardsDiv.style.transform = 'translate(-50%, -50%)';
        cardsDiv.style.zIndex = '10';

        container.appendChild(cardsDiv);
    });
}

// 玩家行动
function humanAction(action, amount = 0) {
    const player = gameState.players[gameState.currentPlayerIndex];
    if (player.type !== 'human') {
        return;
    }
    
    // 检查是否有效
    if (action === 'look' && player.hasLooked) {
        if (window.effectsManager) {
            window.effectsManager.shake(document.getElementById('btn-look'));
        }
        return;
    }
    
    if (action === 'call') {
        const callAmount = player.hasLooked ? gameState.currentBet * 2 : gameState.currentBet;
        if (player.chips < callAmount) {
            if (window.effectsManager) {
                window.effectsManager.shake(document.getElementById('btn-call'));
            }
            return;
        }
    }
    
    // 执行行动
    playerAction(action, amount);
    
    // 看牌后禁用按钮
    if (action === 'look') {
        const btnLook = document.getElementById('btn-look');
        if (btnLook) {
            btnLook.disabled = true;
            btnLook.style.opacity = '0.5';
            btnLook.style.cursor = 'not-allowed';
        }
    }
}

// 更新玩家显示
function updatePlayerDisplay(player) {
    // 更新筹码
    const chipsEl = document.getElementById(`chips-${player.id}`);
    if (chipsEl) {
        chipsEl.textContent = player.chips;
    }
    
    // 更新牌
    const cardsEl = document.getElementById(`cards-${player.id}`);
    if (cardsEl && player.cards) {
        const cardEls = cardsEl.querySelectorAll('.card');
        player.cards.forEach((card, i) => {
            if (cardEls[i]) {
                // 显示牌的条件：1) 是人类玩家且自己看过牌 OR 2) 游戏已结束
                // AI玩家的牌始终隐藏，只有人类玩家自己看牌后才能看到自己的牌
                const isHumanPlayer = player.type === 'human';
                const shouldShowCards = (isHumanPlayer && player.hasLooked) || gameState.gameEnded;
                if (shouldShowCards) {
                    cardEls[i].className = `card front ${card.suit === '♥' || card.suit === '♦' ? 'red' : 'black'}`;
                    cardEls[i].textContent = card.rank + card.suit;
                } else {
                    // 确保牌是背面
                    cardEls[i].className = 'card back';
                    cardEls[i].textContent = '';
                }
            }
        });
    }
    
    // 更新动作显示
    updateActionToast(player);
    
    // 获取玩家元素（用于弃牌样式和眼睛图标）
    let playerEl = document.getElementById(`player-${player.id}`);
    if (!playerEl) {
        playerEl = document.querySelector(`.player-position.${player.positionClass} .player`);
    }
    
    // 已看牌眼睛图标
    if (playerEl) {
        let indicator = playerEl.querySelector('.player-looked-indicator');
        if (player.hasLooked) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'player-looked-indicator';
                indicator.textContent = '👁️';
                playerEl.appendChild(indicator);
            }
            indicator.style.display = 'block';
        } else if (indicator) {
            indicator.style.display = 'none';
        }
        
        // 弃牌样式
        if (player.hasFolded) {
            playerEl.classList.add('folded');
        } else {
            playerEl.classList.remove('folded');
        }
        
        // 获胜效果
        if (gameState.gameEnded && !player.hasFolded) {
            const activePlayers = gameState.players.filter(p => !p.hasFolded);
            if (activePlayers.length === 1 && activePlayers[0].id === player.id) {
                playerEl.classList.add('winner');
                if (window.effectsManager) {
                    window.effectsManager.showWinner(playerEl);
                }
            }
        }
    }
}

// 显示玩家操作浮动提示
function showPlayerActionToast(playerId, message) {
    const toastContainer = document.getElementById(`toast-${playerId}`);
    if (!toastContainer) return;
    
    toastContainer.innerHTML = '';
    
    const toast = document.createElement('div');
    toast.className = 'action-toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode === toastContainer) {
            toastContainer.removeChild(toast);
        }
    }, 3000);
}

// 更新动作提示
function updateActionToast(player) {
    let actionText = '';
    if (player.hasFolded) {
        actionText = '🚫 弃牌';
    } else if (player.lastBet > 0) {
        actionText = `💰 下注${player.lastBet}`;
    } else if (player.currentBet > 0) {
        actionText = `💰 下注${player.currentBet}`;
    }
    // 移除 hasLooked 的检查：看牌提示只在 playerAction 中显示，不在这里重复显示

    if (actionText) {
        showPlayerActionToast(player.id, actionText);
    }
}

// 更新按钮状态
function updateButtonState() {
    const player = gameState.players.find(p => p.type === 'human');
    const isPlayerTurn = gameState.players[gameState.currentPlayerIndex]?.type === 'human';
    
    const btns = {
        look: document.getElementById('btn-look'),
        call: document.getElementById('btn-call'),
        raise: document.getElementById('btn-raise'),
        fold: document.getElementById('btn-fold'),
        showdown: document.getElementById('btn-showdown')
    };
    
    // 如果不是玩家回合或游戏未开始或已结束，禁用所有按钮
    if (!isPlayerTurn || !gameState.gameStarted || gameState.gameEnded) {
        for (const btn of Object.values(btns)) {
            if (btn) btn.disabled = true;
        }
        return;
    }
    
    // 启用所有按钮
    for (const btn of Object.values(btns)) {
        if (btn) btn.disabled = false;
    }
    
    // 已看牌则禁用看牌按钮
    if (player && player.hasLooked && btns.look) {
        btns.look.disabled = true;
    }
    
    // 达到10轮限制后，禁用跟注和加注，只允许弃牌或开牌
    if (gameState.roundCount >= gameState.maxRounds) {
        if (btns.call) btns.call.disabled = true;
        if (btns.raise) btns.raise.disabled = true;
    }
    
    // 筹码不足时禁用跟注和加注
    if (player) {
        const callAmount = player.hasLooked ? gameState.currentBet * 2 : gameState.currentBet;
        if (player.chips < callAmount && btns.call) {
            btns.call.disabled = true;
        }
    }
}

// 更新游戏状态显示
function updateGameDisplay() {
    // 更新底池
    const potEl = document.getElementById('pot-amount');
    if (potEl) {
        potEl.textContent = gameState.pot;
    }

    // 更新轮次
    const roundEl = document.getElementById('round-num');
    if (roundEl) {
        roundEl.textContent = gameState.roundCount || 0;
    }
    
    // 更新所有玩家显示
    gameState.players.forEach(player => {
        updatePlayerDisplay(player);
    });
    
    // 更新当前玩家高亮
    gameState.players.forEach((player, index) => {
        const playerEl = document.getElementById(`player-${player.id}`);
        if (playerEl) {
            if (index === gameState.currentPlayerIndex && gameState.gameStarted && !gameState.gameEnded) {
                playerEl.classList.add('active');
            } else {
                playerEl.classList.remove('active');
            }
        }
    });
    
    // 更新按钮状态
    updateButtonState();
}

// 游戏结束处理
function onGameEnd(winner) {
    updateGameDisplay();
    
    // 显示重新开始按钮
    document.getElementById('btn-restart').style.display = 'inline-block';
}

// 开牌选择弹窗
function startShowdown() {
    const activePlayers = gameState.players.filter(p => !p.hasFolded && p.type !== 'human');
    if (activePlayers.length === 0) {
        alert('没有可以开牌的对象！');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'showdown-modal';
    modal.id = 'showdown-modal';
    
    modal.innerHTML = `
        <div class="showdown-content">
            <h3>🔥 选择开牌对象</h3>
            <p>选择要与谁比较牌型：</p>
            <div class="showdown-targets">
                ${activePlayers.map((p, i) => `
                    <div class="showdown-target" data-index="${gameState.players.indexOf(p)}">
                        <div class="target-avatar">${p.avatar}</div>
                        <div>
                            <div class="target-name">${p.name}</div>
                            <div class="target-type">${p.style}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-danger" id="btn-cancel-showdown">取消</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定选择事件
    modal.querySelectorAll('.showdown-target').forEach(target => {
        target.addEventListener('click', function() {
            const targetIndex = parseInt(this.dataset.index);
            document.body.removeChild(modal);
            executeShowdown(targetIndex);
        });
    });
    
    // 取消按钮
    document.getElementById('btn-cancel-showdown').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// 导出函数
window.initPlayerUI = initPlayerUI;
window.createPlayerUI = createPlayerUI;
window.updateGameDisplay = updateGameDisplay;
window.updatePlayerDisplay = updatePlayerDisplay;
window.onGameEnd = onGameEnd;
window.startShowdown = startShowdown;