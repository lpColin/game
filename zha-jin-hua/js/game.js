// 炸金花 v2.0 - 支持 2-6 人

// 牌型定义
const CARD_SUITS = ['♠', '♥', '♣', '♦'];
const CARD_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// 牌型等级
const HAND_TYPES = {
    BAO_ZI: 6,      // 豹子
    TONG_HUA_SHUN: 5, // 同花顺
    TONG_HUA: 4,    // 同花
    SHUN_ZI: 3,     // 顺子
    DUI_ZI: 2,      // 对子
    SAN_PAI: 1      // 散牌
};

// AI 类型
const AI_TYPES = [
    { id: 'george', name: '乔治', style: '算牌型', avatar: '🐎', type: 'ai-george' },
    { id: 'lala', name: 'Lala', style: '激进型', avatar: '🔥', type: 'ai-lala' },
    { id: 'tom', name: '汤姆', style: '保守型', avatar: '🐱', type: 'ai-tom' },
    { id: 'jerry', name: '杰瑞', style: '随机型', avatar: '🐭', type: 'ai-jerry' },
    { id: 'lucky', name: '幸运星', style: '运气型', avatar: '🍀', type: 'ai-lucky' }
];

// Agent 配置
const AGENT_GEORGE = {
    id: 'agent-george',
    name: '乔治(Agent)',
    style: '智能Agent',
    avatar: '🐎',
    type: 'ai-george'
};

const AGENT_PEIQI = {
    id: 'agent-peiqi',
    name: '佩奇(Agent)',
    style: '激进Agent',
    avatar: '🐷',
    type: 'ai-peiqi'
};

const AGENT_DUODUO = {
    id: 'agent-duoduo',
    name: '多多(Agent)',
    style: '保守Agent',
    avatar: '🐶',
    type: 'ai-duoduo'
};

// 游戏状态
let gameState = {
    deck: [],
    players: [],
    pot: 0,
    currentBet: 0,
    round: 1,
    currentPlayerIndex: 0,
    gameStarted: false,
    gameEnded: false,
    playerCount: 4, // 默认4人
    humanIndex: 0,  // 玩家位置
    countdownTimer: null, // 倒计时定时器
    countdownSeconds: 20,  // 倒计时秒数
    roundCount: 0,  // 当前轮数（每个玩家轮过一次 = 1轮）
    actionCount: 0, // 总行动次数
    maxRounds: 10   // 最大轮数限制
};

// 玩家类
class Player {
    constructor(id, name, type, style, avatar, chips = 1000) {
        this.id = id;
        this.name = name;
        this.type = type; // 'human', 'ai-george', 'ai-lala', etc.
        this.style = style;
        this.avatar = avatar;
        this.chips = chips;
        this.cards = [];
        this.hasLooked = false;
        this.hasFolded = false;
        this.currentBet = 0;
        this.lastBet = 0; // 本次下注金额
    }

    reset() {
        this.cards = [];
        this.hasLooked = false;
        this.hasFolded = false;
        this.currentBet = 0;
        this.lastBet = 0;
    }
}

// 创建牌组
function createDeck() {
    const deck = [];
    for (const suit of CARD_SUITS) {
        for (const rank of CARD_RANKS) {
            deck.push({ suit, rank, value: CARD_RANKS.indexOf(rank) + 2 });
        }
    }
    return shuffle(deck);
}

// 洗牌
function shuffle(deck) {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
}

// 发牌
function dealCards() {
    gameState.deck = createDeck();
    for (const player of gameState.players) {
        player.cards = [gameState.deck.pop(), gameState.deck.pop(), gameState.deck.pop()];
    }
}

// 判断牌型
function evaluateHand(cards) {
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    const values = sorted.map(c => c.value);
    const suits = sorted.map(c => c.suit);
    
    // 豹子
    if (values[0] === values[1] && values[1] === values[2]) {
        return { type: HAND_TYPES.BAO_ZI, name: '豹子', value: values[0] * 100 };
    }
    
    // 同花顺
    const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
    const isStraight = (values[0] - values[1] === 1 && values[1] - values[2] === 1) ||
                       (values[0] === 14 && values[1] === 3 && values[2] === 2);
    
    if (isFlush && isStraight) {
        const straightValue = values[0] === 14 && values[1] === 3 ? 3 : values[0];
        return { type: HAND_TYPES.TONG_HUA_SHUN, name: '同花顺', value: straightValue * 100 + 50 };
    }
    
    // 同花
    if (isFlush) {
        return { type: HAND_TYPES.TONG_HUA, name: '同花', value: values[0] * 100 + values[1] * 10 + values[2] };
    }
    
    // 顺子
    if (isStraight) {
        const straightValue = values[0] === 14 && values[1] === 3 ? 3 : values[0];
        return { type: HAND_TYPES.SHUN_ZI, name: '顺子', value: straightValue * 100 };
    }
    
    // 对子
    if (values[0] === values[1] || values[1] === values[2] || values[0] === values[2]) {
        const pairValue = values[0] === values[1] ? values[0] : values[1];
        const kicker = values[0] === values[1] ? values[2] : values[0];
        return { type: HAND_TYPES.DUI_ZI, name: '对子', value: pairValue * 100 + kicker };
    }
    
    // 散牌
    return { type: HAND_TYPES.SAN_PAI, name: '散牌', value: values[0] * 100 + values[1] * 10 + values[2] };
}

// 比较两手牌
function compareHands(hand1, hand2) {
    if (hand1.type !== hand2.type) {
        return hand1.type - hand2.type;
    }
    return hand1.value - hand2.value;
}

// 初始化游戏
function initGame(playerCount = 4) {
    gameState.playerCount = playerCount;
    gameState.players = [];
    
    // 随机选择 AI 类型
    const shuffledAITypes = shuffle([...AI_TYPES]);
    
    // 创建玩家（玩家固定在位置 0）
    gameState.players.push(new Player('human', '玩家', 'human', '真人', '👤', 1000));
    gameState.humanIndex = 0;
    
    // Agent 列表（顺时针顺序：佩奇 -> 乔治 -> 多多）
    const agents = [AGENT_PEIQI, AGENT_GEORGE, AGENT_DUODUO];
    
    // 创建 AI 玩家（根据人数）
    for (let i = 1; i < playerCount; i++) {
        if (i <= 3) {
            // 前三个使用 Agent
            const agent = agents[i - 1];
            gameState.players.push(new Player(
                agent.id,
                agent.name,
                agent.type,
                agent.style,
                agent.avatar,
                1000
            ));
        } else {
            // 额外的使用随机 AI
            const aiType = shuffledAITypes[(i - 4) % shuffledAITypes.length];
            gameState.players.push(new Player(
                aiType.id + '-' + i,
                aiType.name,
                aiType.type,
                aiType.style,
                aiType.avatar,
                1000
            ));
        }
    }
    
    gameState.pot = 0;
    gameState.currentBet = 0;
    gameState.round = 1;
    gameState.currentPlayerIndex = 0;
    gameState.gameStarted = false;
    gameState.gameEnded = false;
}

// 开始新一局
function startNewRound() {
    for (const player of gameState.players) {
        player.reset();
    }
    gameState.pot = 0;
    gameState.currentBet = 0;
    gameState.gameEnded = false;
    gameState.roundCount = 0;  // 重置轮数
    gameState.actionCount = 0; // 重置行动计数
    
    // 每人下底注
    const ante = 10;
    for (const player of gameState.players) {
        player.chips -= ante;
        gameState.pot += ante;
    }
    
    dealCards();
    gameState.gameStarted = true;
    gameState.currentPlayerIndex = 0;
    
    log('🎮 新一局开始！每人下底注 10 筹码');
    
    // 重置看牌按钮
    const btnLook = document.getElementById('btn-look');
    if (btnLook) {
        btnLook.disabled = false;
        btnLook.style.opacity = '1';
        btnLook.style.cursor = 'pointer';
    }
    
    // 重置所有玩家的牌显示为背面（隐藏）
    for (const player of gameState.players) {
        const cardsEl = document.getElementById(`cards-${player.id}`);
        if (cardsEl) {
            const cardEls = cardsEl.querySelectorAll('.card');
            cardEls.forEach(cardEl => {
                cardEl.className = 'card back';
                cardEl.textContent = '';
            });
        }
        // 隐藏看牌指示器
        const playerEl = document.getElementById(`player-${player.id}`);
        if (playerEl) {
            const indicator = playerEl.querySelector('.player-looked-indicator');
            if (indicator) {
                indicator.style.display = 'none';
            }
            // 移除获胜样式
            playerEl.classList.remove('winner');
        }
    }
    
    // 播放音效
    if (window.audioManager) {
        window.audioManager.playShuffle();
    }
    
    updateUI();
}

// 玩家行动
function playerAction(action, amount = 0) {
    const player = gameState.players[gameState.currentPlayerIndex];
    let toastMessage = '';
    
    // 玩家操作时清除倒计时
    if (gameState.countdownTimer) {
        clearInterval(gameState.countdownTimer);
        gameState.countdownTimer = null;
    }
    
    switch (action) {
        case 'look':
            player.hasLooked = true;
            toastMessage = '👁️ 看牌';
            log(`${player.name} 看牌`);
            if (window.audioManager) {
                window.audioManager.playClick();
            }
            // 看牌后如果是 AI 玩家，继续让 AI 决策
            updateUI();
            if (player.type !== 'human') {
                setTimeout(aiAction, 1000);
            }
            return;
            
        case 'call':
            // 第一次跟注使用默认下注金额（10）
            const isFirstCall = player.currentBet === 0;
            const callAmount = isFirstCall ? 10 : (player.hasLooked ? gameState.currentBet * 2 : gameState.currentBet);
            player.chips -= callAmount;
            gameState.pot += callAmount;
            player.currentBet += callAmount;
            player.lastBet = callAmount; // 记录本次下注金额
            // 如果是第一次跟注，更新当前下注额
            if (isFirstCall) {
                gameState.currentBet = 10;
            }
            toastMessage = `💰 跟注${callAmount}`;
            log(`${player.name} 跟注 ${callAmount}`);
            if (window.audioManager) {
                window.audioManager.playChip();
            }
            break;

        case 'raise':
            const raiseAmount = player.hasLooked ? amount * 2 : amount;
            player.chips -= raiseAmount;
            gameState.pot += raiseAmount;
            player.currentBet += raiseAmount;
            player.lastBet = raiseAmount; // 记录本次下注金额
            gameState.currentBet = amount;
            toastMessage = `⬆️ 加注${amount}`;
            log(`${player.name} 加注到 ${amount}`);
            if (window.audioManager) {
                window.audioManager.playChip();
            }
            break;
            
        case 'fold':
            player.hasFolded = true;
            toastMessage = '🚫 弃牌';
            log(`${player.name} 弃牌`);
            if (window.audioManager) {
                window.audioManager.playClick();
            }
            break;
    }
    
    // 显示浮动提示
    if (toastMessage && window.showPlayerActionToast) {
        window.showPlayerActionToast(player.id, toastMessage);
    }
    
    // 添加到操作日志
    if (toastMessage) {
        addActionLog(player.name, toastMessage);
    }
    
    nextPlayer();
}

// 下一个玩家
function nextPlayer() {
    // 清除之前的倒计时
    if (gameState.countdownTimer) {
        clearInterval(gameState.countdownTimer);
        gameState.countdownTimer = null;
    }
    
    // 检查是否只剩一个玩家
    const activePlayers = gameState.players.filter(p => !p.hasFolded);
    if (activePlayers.length === 1) {
        endGame(activePlayers[0]);
        return;
    }
    
    // 记录当前玩家索引，用于判断是否完成一轮
    const prevPlayerIndex = gameState.currentPlayerIndex;
    const prevPlayerName = gameState.players[prevPlayerIndex].name;
    
    // 移动到下一个玩家
    do {
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    } while (gameState.players[gameState.currentPlayerIndex].hasFolded);
    
    const nextPlayerName = gameState.players[gameState.currentPlayerIndex].name;
    
    // 如果轮到的玩家索引小于等于前一个玩家索引，说明绕了一圈，轮数+1
    if (gameState.currentPlayerIndex <= prevPlayerIndex) {
        gameState.roundCount++;
        log(`📊 第 ${gameState.roundCount} 轮`);
        
        // 检查是否达到10轮限制
        if (gameState.roundCount >= gameState.maxRounds) {
            log(`⚠️ 已达到第 ${gameState.maxRounds} 轮限制！之后只能弃牌或开牌`);
        }
    }
    
    log(`➡️ ${prevPlayerName}(位置${prevPlayerIndex}) → ${nextPlayerName}(位置${gameState.currentPlayerIndex})`);
    
    updateUI();
    
    // AI 自动行动
    const nextPlayer = gameState.players[gameState.currentPlayerIndex];
    if (nextPlayer.type !== 'human') {
        setTimeout(aiAction, 1500);
    } else {
        // 轮到人类玩家，启动20秒倒计时
        startCountdown();
    }
}

// 启动倒计时
function startCountdown() {
    let secondsLeft = gameState.countdownSeconds;
    
    // 显示倒计时
    showCountdownDisplay(secondsLeft);
    
    // 启动定时器
    gameState.countdownTimer = setInterval(() => {
        secondsLeft--;
        showCountdownDisplay(secondsLeft);
        
        if (secondsLeft <= 0) {
            // 时间到，自动跟注
            clearInterval(gameState.countdownTimer);
            gameState.countdownTimer = null;
            log(`⏰ 时间到！自动跟注`);
            playerAction('call');
        }
    }, 1000);
}

// 显示倒计时
function showCountdownDisplay(seconds) {
    // 更新UI显示倒计时
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer && currentPlayer.type === 'human') {
        // 可以通过toast或其他方式显示倒计时
        if (window.showPlayerActionToast) {
            window.showPlayerActionToast(currentPlayer.id, `⏰ ${seconds}秒`);
        }
    }
}

// 结束游戏
function endGame(winner) {
    gameState.gameEnded = true;
    winner.chips += gameState.pot;
    
    log(`🎉 ${winner.name} 赢得 ${gameState.pot} 筹码！`);
    
    // 播放胜利音效和特效
    if (window.audioManager) {
        if (winner.type === 'human') {
            window.audioManager.playWin();
        } else {
            window.audioManager.playLose();
        }
    }
    
    if (window.effectsManager) {
        window.effectsManager.createVictoryEffect(winner.name);
    }
    
    // 显示所有玩家的牌
    for (const player of gameState.players) {
        if (!player.hasFolded) {
            const hand = evaluateHand(player.cards);
            log(`${player.name} 的牌: ${hand.name}`);
        }
    }
    
    updateUI();
}

// 游戏日志
function log(message) {
    const logContent = document.querySelector('.log-content');
    if (logContent) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    }
}

// ==================== 开牌功能 ====================
let showdownTargetIndex = null;

// 开始开牌流程
function startShowdown() {
    const player = gameState.players[gameState.currentPlayerIndex];
    const showdownCost = gameState.currentBet * 2; // 双倍注额
    
    // 检查筹码
    if (player.chips < showdownCost) {
        log('❌ 筹码不足，无法开牌');
        return false;
    }
    
    // 获取可开牌的目标（已看牌的未弃牌玩家）
    const targets = gameState.players.filter((p, index) => 
        index !== gameState.currentPlayerIndex && 
        !p.hasFolded && 
        p.hasLooked
    );
    
    if (targets.length === 0) {
        log('❌ 没有可开牌的目标（需要对方已看牌）');
        return false;
    }
    
    // 显示选择界面
    showShowdownSelection(targets);
    return true;
}

// 执行开牌
function executeShowdown(targetIndex) {
    const player = gameState.players[gameState.currentPlayerIndex];
    const target = gameState.players[targetIndex];
    const showdownCost = gameState.currentBet * 2;
    
    // 扣除开牌费用
    player.chips -= showdownCost;
    gameState.pot += showdownCost;
    
    // 标记被开牌的对手为"已看牌"，以便显示他们的牌
    target.hasLooked = true;
    
    // 比较牌型
    const playerHand = evaluateHand(player.cards);
    const targetHand = evaluateHand(target.cards);
    
    log(`🔥 ${player.name} 向 ${target.name} 发起开牌！`);
    
    // 显示双方牌
    log(`${player.name} 的牌: ${playerHand.name}`);
    log(`${target.name} 的牌: ${targetHand.name}`);
    
    // 判定胜负
    const result = compareHands(playerHand, targetHand);
    
    if (result > 0) {
        // 玩家赢
        log(`🎉 ${player.name} 开牌获胜！${target.name} 弃牌`);
        target.hasFolded = true;
        addChatMessage(player.name, '开牌成功！我的' + playerHand.name + '赢了！', 'system');
        addChatMessage(target.name, '哎呀，被开牌了...', 'system');
    } else if (result < 0) {
        // 目标赢
        log(`💔 ${player.name} 开牌失败！${player.name} 弃牌`);
        player.hasFolded = true;
        addChatMessage(target.name, '想开我？我的' + targetHand.name + '可不是吃素的！', 'system');
        addChatMessage(player.name, '糟糕，被反杀了...', 'system');
    } else {
        // 平局，发起者输
        log(`🤝 平局！${player.name} 开牌失败，弃牌`);
        player.hasFolded = true;
        addChatMessage(player.name, '居然平局...算我倒霉', 'system');
    }
    
    // 播放音效
    if (window.audioManager) {
        window.audioManager.playChip();
    }
    
    showdownTargetIndex = null;
    updateUI();
    
    // 检查是否只剩一个玩家
    const activePlayers = gameState.players.filter(p => !p.hasFolded);
    if (activePlayers.length === 1) {
        endGame(activePlayers[0]);
    } else {
        nextPlayer();
    }
}

// ==================== 聊天系统 ====================
const CHAT_MESSAGES = {
    george: [
        '让我算算概率...',
        '这局有意思',
        '别诈唬我，我能看出来',
        '冷静分析，理性决策',
        '底池赔率不错',
        '你们太激进了',
        '我在读你们的牌',
        '这不是个好位置'
    ],
    peiqi: [
        '哈哈，这把我稳了！',
        '跟不跟？不敢了吧！',
        '我就是喜欢刺激！',
        'ALL IN！谁怕谁！',
        '你们太保守了',
        '我就是在诈唬，你猜是不是？',
        '来啊，互相伤害啊！',
        '这把必须拿下！'
    ],
    duoduo: [
        '让我想想...',
        '风险太高了',
        '还是稳一点好',
        '不确定，再看看',
        '这个注额有点大',
        '我需要好牌才跟',
        '别逼我，我会弃牌的',
        '稳健才是王道'
    ],
    lala: [
        '加注！不加注怎么赢！',
        '我觉得我能赢！',
        '跟注跟注！',
        '你们都是纸老虎！',
        '我就喜欢大底池！',
        '运气来了挡不住！',
        '怕什么，干就完了！',
        '这把感觉很好！'
    ],
    tom: [
        '太冒险了...',
        '我要看牌再说',
        '这个我不跟',
        '稳妥起见，弃牌',
        '等好牌再说',
        '你们玩，我看着',
        '这个风险我承受不了',
        '还是保守点好'
    ],
    jerry: [
        '随机选择！',
        '我也不知道该怎么办',
        '看心情吧',
        '随便啦~',
        '人生就是随机！',
        '我乱打的！',
        '别问我为什么',
        '就是这么任性！'
    ],
    lucky: [
        '我感觉这把能赢！',
        '直觉告诉我跟！',
        '今天运气不错',
        '冥冥之中有指引',
        '我的第六感很强',
        '运气也是实力的一部分',
        '我感觉要豹子了！',
        '跟着感觉走！'
    ]
};

function addActionLog(playerName, actionMessage) {
    // 跳过看牌操作
    if (actionMessage.includes('看牌')) return;

    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const entry = document.createElement('div');
    entry.className = 'chat-message action-log-entry';

    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    entry.innerHTML = `<span class="action-log-time">[${time}]</span> <span class="action-log-player">${playerName}</span>: <span class="action-log-action">${actionMessage}</span>`;

    chatMessages.appendChild(entry);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 限制显示条数
    while (chatMessages.children.length > 50) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
}

// 添加聊天消息 - 显示在头像上方气泡
function addChatMessage(sender, message, type = 'normal') {
    // 同时添加到聊天区域（保留原有功能）
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        const entry = document.createElement('div');
        entry.className = `chat-message ${type}`;
        
        const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        entry.innerHTML = `<span class="chat-time">[${time}]</span> <span class="chat-sender">${sender}:</span> <span class="chat-text">${message}</span>`;
        
        chatMessages.appendChild(entry);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // 限制消息数量
        while (chatMessages.children.length > 50) {
            chatMessages.removeChild(chatMessages.firstChild);
        }
    }
    
    // 找到发送者对应的玩家，在头像上方显示气泡
    const player = gameState.players.find(p => p.name === sender);
    if (player) {
        showChatBubble(player.id, message, type);
    }
}

// 在玩家头像上方显示对话气泡
function showChatBubble(playerId, message, type = 'normal') {
    const bubbleContainer = document.getElementById(`chat-bubble-${playerId}`);
    if (!bubbleContainer) return;
    
    // 清除旧的气泡
    bubbleContainer.innerHTML = '';
    
    // 创建气泡
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type === 'player' ? 'player-chat' : ''}`;
    bubble.textContent = message;
    bubbleContainer.appendChild(bubble);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (bubble.parentNode === bubbleContainer) {
            bubbleContainer.removeChild(bubble);
        }
    }, 4000);
}

// AI发送随机消息
function sendRandomChat(player) {
    if (Math.random() > 0.3) return; // 30%概率发言
    
    let messagePool = [];
    
    if (player.id.includes('george')) {
        messagePool = CHAT_MESSAGES.george;
    } else if (player.id.includes('peiqi')) {
        messagePool = CHAT_MESSAGES.peiqi;
    } else if (player.id.includes('duoduo')) {
        messagePool = CHAT_MESSAGES.duoduo;
    } else if (player.type === 'ai-lala') {
        messagePool = CHAT_MESSAGES.lala;
    } else if (player.type === 'ai-tom') {
        messagePool = CHAT_MESSAGES.tom;
    } else if (player.type === 'ai-jerry') {
        messagePool = CHAT_MESSAGES.jerry;
    } else if (player.type === 'ai-lucky') {
        messagePool = CHAT_MESSAGES.lucky;
    }
    
    if (messagePool.length > 0) {
        const message = messagePool[Math.floor(Math.random() * messagePool.length)];
        addChatMessage(player.name, message, 'ai');
    }
}

// 发送玩家消息
function sendPlayerChat(message) {
    if (!message || message.trim() === '') return;
    
    const player = gameState.players[gameState.humanIndex];
    addChatMessage(player.name, message.trim(), 'player');
    
    // AI回复
    setTimeout(() => {
        gameState.players.forEach((p, index) => {
            if (p.type !== 'human' && !p.hasFolded && Math.random() < 0.4) {
                setTimeout(() => sendRandomChat(p), Math.random() * 2000);
            }
        });
    }, 500);
}

// 更新UI（在 ui-v2.js 中实现为 updateGameDisplay）
function updateUI() {
    if (typeof window.updateGameDisplay === 'function') {
        window.updateGameDisplay();
    }
}

// AI 行动（在 ai-v2.js 中实现）
function aiAction() {
    if (typeof window.aiAction === 'function') {
        window.aiAction();
    }
}

// 导出
window.gameState = gameState;
window.Player = Player;
window.HAND_TYPES = HAND_TYPES;
window.AI_TYPES = AI_TYPES;
window.createDeck = createDeck;
window.shuffle = shuffle;
window.dealCards = dealCards;
window.evaluateHand = evaluateHand;
window.compareHands = compareHands;
window.initGame = initGame;
window.startNewRound = startNewRound;
window.playerAction = playerAction;
window.nextPlayer = nextPlayer;
window.endGame = endGame;
window.log = log;
window.startShowdown = startShowdown;
window.executeShowdown = executeShowdown;
window.addChatMessage = addChatMessage;
window.addActionLog = addActionLog;
window.sendRandomChat = sendRandomChat;
window.sendPlayerChat = sendPlayerChat;
window.showChatBubble = showChatBubble;
