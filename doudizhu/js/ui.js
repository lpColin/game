// 斗地主 UI 交互

// 当前选中的牌
let selectedCards = [];

// 初始化UI
function initUI() {
    console.log('斗地主 UI 初始化');
    setupEventListeners();
    updateUI();
}

// 设置事件监听
function setupEventListeners() {
    // 叫地主按钮
    const btnCall = document.getElementById('btn-call');
    const btnNoCall = document.getElementById('btn-no-call');
    const btnPlay = document.getElementById('btn-play');
    const btnPass = document.getElementById('btn-pass');
    const btnRestart = document.getElementById('btn-restart');

    if (btnCall) btnCall.addEventListener('click', () => handleCall('call'));
    if (btnNoCall) btnNoCall.addEventListener('click', () => handleCall('no_call'));
    if (btnPlay) btnPlay.addEventListener('click', handlePlay);
    if (btnPass) btnPass.addEventListener('click', handlePass);
    if (btnRestart) btnRestart.addEventListener('click', () => window.DoudizhuGame.startGame());
}

// 处理叫地主
function handleCall(action) {
    const state = window.DoudizhuGame.getState();
    window.DoudizhuGame.callLandlord(state.currentPlayer, action);

    // 如果叫地主成功，隐藏叫牌按钮
    if (action === 'call') {
        hideCallButtons();
    }

    updateUI();

    // AI 行动
    setTimeout(handleAIAction, 1000);
}

// 处理出牌
function handlePlay() {
    const state = window.DoudizhuGame.getState();
    const player = state.players[state.currentPlayer];

    if (selectedCards.length === 0) {
        showToast('请选择要出的牌');
        return;
    }

    // 分析牌型
    const cardType = window.DoudizhuGame.analyzeCards(selectedCards);
    if (!cardType) {
        showToast('无效的牌型');
        return;
    }

    // 检查是否能打过
    if (!window.DoudizhuGame.canBeat(selectedCards, cardType)) {
        showToast('牌不够大');
        return;
    }

    // 出牌
    window.DoudizhuGame.playCards(player.id, selectedCards);
    selectedCards = [];

    // 显示出的牌
    showPlayedCards(player.id, state.lastCards);

    updateUI();
}

// 处理不出
function handlePass() {
    const state = window.DoudizhuGame.getState();
    window.DoudizhuGame.pass(state.currentPlayer);
    updateUI();
    setTimeout(handleAIAction, 1000);
}

// 处理 AI 行动
function handleAIAction() {
    const state = window.DoudizhuGame.getState();
    if (state.phase !== 'calling' && state.phase !== 'playing') return;

    const player = state.players[state.currentPlayer];
    if (player.type === 'human') return;

    const actions = window.DoudizhuGame.getAvailableActions(player.id);

    // 尝试使用 Agent
    if (window.AgentManager && window.AgentManager.connectors[player.id]) {
        handleAIAgent(player.id, actions);
    } else {
        // 本地 AI
        handleAILocal(player.id, actions);
    }
}

// 使用 Agent 处理 AI
async function handleAIAgent(playerId, actions) {
    const state = window.DoudizhuGame.getState();

    // 构建游戏状态
    const gameState = {
        phase: state.phase,
        landlord: state.landlord,
        currentPlayer: state.currentPlayer,
        lastPlayer: state.lastPlayer,
        lastType: state.lastType,
        lastValue: state.lastValue,
        lastCards: state.lastCards.map(c => c.id),
        multiplier: state.multiplier,
        players: state.players.map(p => ({
            id: p.id,
            name: p.name,
            cardCount: p.cards.length,
            isLandlord: p.id === state.landlord,
            type: p.type
        }))
    };

    try {
        const result = await window.AgentManager.getDecision(playerId, gameState, actions);
        console.log(`🤖 AI[${playerId}] 决策:`, result.action);

        if (state.phase === 'calling') {
            window.DoudizhuGame.callLandlord(playerId, result.action);
        } else if (result.action === 'play') {
            // 解析要出的牌
            const player = state.players[playerId];
            const cards = player.cards.filter(c => result.cards && result.cards.includes(c.id));
            if (cards.length > 0) {
                window.DoudizhuGame.playCards(playerId, cards);
                showPlayedCards(playerId, cards);
            }
        } else if (result.action === 'pass') {
            window.DoudizhuGame.pass(playerId);
        }
    } catch (e) {
        console.log('Agent 调用失败，使用本地AI:', e.message);
        handleAILocal(playerId, actions);
    }

    updateUI();
}

// 本地 AI
function handleAILocal(playerId, actions) {
    const state = window.DoudizhuGame.getState();

    // 叫地主阶段 - 简单策略
    if (state.phase === 'calling') {
        // 有大王或炸弹就叫
        const player = state.players[playerId];
        const hasBigJoker = player.cards.some(c => c.rank === 'JOKER');
        const hasJoker = player.cards.some(c => c.rank === 'joker');
        const bombCount = player.cards.filter(c => {
            const values = player.cards.map(p => p.value);
            return values.filter(v => v === c.value).length >= 4;
        }).length;

        if (hasBigJoker || bombCount >= 2) {
            window.DoudizhuGame.callLandlord(playerId, 'call');
        } else {
            window.DoudizhuGame.callLandlord(playerId, 'no_call');
        }
    } else {
        // 出牌阶段 - 简单策略
        const player = state.players[playerId];

        // 优先出单张
        if (player.cards.length > 0) {
            const singleCard = [player.cards[0]];
            window.DoudizhuGame.playCards(playerId, singleCard);
            showPlayedCards(playerId, singleCard);
        }
    }

    updateUI();
    setTimeout(handleAIAction, 1000);
}

// 显示玩家出的牌
function showPlayedCards(playerId, cards) {
    const container = document.getElementById(`player-cards-${playerId}`);
    if (!container) return;

    // 清除之前的牌
    const playedArea = container.querySelector('.played-cards');
    if (playedArea) playedArea.remove();

    const area = document.createElement('div');
    area.className = 'played-cards';
    area.innerHTML = cards.map(c => `
        <div class="card small ${getSuitColor(c.suit)}">
            <span class="card-rank">${c.rank}</span>
            <span class="card-suit">${c.suit}</span>
        </div>
    `).join('');

    container.appendChild(area);
}

// 获取花色颜色
function getSuitColor(suit) {
    if (suit === '♥' || suit === '♦') return 'red';
    return 'black';
}

// 更新UI
function updateUI() {
    const state = window.DoudizhuGame.getState();

    // 更新玩家手牌
    state.players.forEach(player => {
        renderPlayerCards(player, state);
    });

    // 更新游戏阶段显示
    updateGamePhase(state);

    // 更新按钮状态
    updateButtons(state);
}

// 渲染玩家手牌
function renderPlayerCards(player, state) {
    const container = document.getElementById(`player-cards-${player.id}`);
    if (!container) return;

    // 更新玩家信息
    const infoEl = container.querySelector('.player-info');
    if (infoEl) {
        let extraInfo = '';
        if (state.landlord === player.id) {
            extraInfo = '<span class="landlord-badge">地主</span>';
        }
        infoEl.innerHTML = `
            <span class="player-avatar">${player.avatar}</span>
            <span class="player-name">${player.name}</span>
            <span class="card-count">${player.cards.length}张</span>
            ${extraInfo}
        `;
    }

    // 渲染手牌（玩家0显示正面，其他显示背面）
    const cardsContainer = container.querySelector('.cards-container');
    if (cardsContainer) {
        cardsContainer.innerHTML = '';

        if (player.type === 'human') {
            // 玩家手牌 - 正面
            player.cards.forEach((card, idx) => {
                const isSelected = selectedCards.some(c => c.id === card.id);
                const cardEl = createCardElement(card, true);
                cardEl.classList.toggle('selected', isSelected);
                cardEl.addEventListener('click', () => toggleCardSelection(card));
                cardsContainer.appendChild(cardEl);
            });
        } else {
            // AI 手牌 - 背面
            player.cards.forEach(() => {
                const cardEl = document.createElement('div');
                cardEl.className = 'card card-back';
                cardsContainer.appendChild(cardEl);
            });
        }
    }
}

// 创建牌元素
function createCardElement(card, faceUp = true) {
    const el = document.createElement('div');
    el.className = `card ${faceUp ? getSuitColor(card.suit) : 'card-back'}`;
    el.dataset.cardId = card.id;

    if (faceUp) {
        el.innerHTML = `
            <span class="card-rank">${card.rank}</span>
            <span class="card-suit">${card.suit}</span>
        `;
    }

    return el;
}

// 切换选牌
function toggleCardSelection(card) {
    const idx = selectedCards.findIndex(c => c.id === card.id);
    if (idx > -1) {
        selectedCards.splice(idx, 1);
    } else {
        selectedCards.push(card);
    }
    updateUI();
}

// 更新游戏阶段显示
function updateGamePhase(state) {
    const phaseEl = document.getElementById('game-phase');
    const statusEl = document.getElementById('game-status');

    if (phaseEl) {
        const phaseNames = {
            'dealing': '发牌中',
            'calling': '叫地主',
            'playing': '出牌中',
            'game_over': '游戏结束'
        };
        phaseEl.textContent = phaseNames[state.phase] || state.phase;
    }

    if (statusEl) {
        if (state.landlord !== null) {
            statusEl.textContent = `地主: ${state.players[state.landlord].name} | 倍数: ${state.multiplier}x`;
        } else {
            statusEl.textContent = state.phase === 'calling' ? '等待叫地主...' : '';
        }
    }
}

// 更新按钮状态
function updateButtons(state) {
    const isMyTurn = state.currentPlayer === 0;

    // 叫地主按钮
    const callContainer = document.getElementById('call-buttons');
    if (callContainer) {
        callContainer.style.display = state.phase === 'calling' && isMyTurn ? 'flex' : 'none';
    }

    // 出牌按钮
    const playContainer = document.getElementById('play-buttons');
    if (playContainer) {
        playContainer.style.display = state.phase === 'playing' && isMyTurn ? 'flex' : 'none';
    }
}

// 隐藏叫牌按钮
function hideCallButtons() {
    const callContainer = document.getElementById('call-buttons');
    if (callContainer) callContainer.style.display = 'none';
}

// 显示提示
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 2000);
}

// 导出
window.DoudizhuUI = {
    init: initUI,
    update: updateUI
};

// 页面加载后初始化
window.addEventListener('DOMContentLoaded', initUI);