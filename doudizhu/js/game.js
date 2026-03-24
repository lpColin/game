// 斗地主游戏核心逻辑

// 牌值定义 (小王 16, 大王 17)
const CARD_VALUE_MAP = {
    '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
    'joker': 16, 'JOKER': 17
};

const CARD_SUITS = ['♠', '♥', '♣', '♦'];
const CARD_RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

// 玩家类型
const PLAYER_TYPES = {
    HUMAN: 'human',
    AI: 'ai'
};

// 游戏阶段
const GAME_PHASE = {
    DEALING: 'dealing',     // 发牌中
    CALLING_LANDLORD: 'calling',  // 叫地主
    PLAYING: 'playing',     // 出牌中
    GAME_OVER: 'game_over'  // 游戏结束
};

// 牌型
const CARD_TYPES = {
    SINGLE: 'single',       // 单张
    PAIR: 'pair',           // 对子
    TRIPLE: 'triple',       // 三张
    TRIPLE_ONE: 'triple_one',     // 三带一
    STRAIGHT: 'straight',   // 顺子
    BOMB: 'bomb',           // 炸弹
    KING_BOMB: 'king_bomb'  // 王炸
};

// 玩家配置
const PLAYER_CONFIG = [
    { id: 0, name: '玩家', avatar: '🎮', type: PLAYER_TYPES.HUMAN },
    { id: 1, name: '农民A', avatar: '👨‍🌾', type: PLAYER_TYPES.AI },
    { id: 2, name: '农民B', avatar: '👩‍🌾', type: PLAYER_TYPES.AI }
];

// 游戏状态
let gameState = {
    deck: [],              // 牌组
    players: [],           // 玩家
    landlord: null,        // 地主玩家ID
    landlordCards: [],     // 地主额外3张牌
    currentPlayer: 0,      // 当前玩家ID
    phase: GAME_PHASE.DEALING,  // 游戏阶段
    lastPlayer: null,      // 最后出牌的玩家
    lastCards: [],         // 最后出的牌
    lastType: null,        // 最后出的牌型
    lastValue: 0,          // 最后出的牌值（用于比较）
    callOrder: [],         // 叫地主顺序
    callIndex: 0,          // 当前叫地主索引
    multiplier: 1,         // 倍数
    baseScore: 1,          // 基础分
    roundCount: 0,         // 回合数
    gameStarted: false,
    gameEnded: false
};

// 创建牌组
function createDeck() {
    const deck = [];

    // 普通牌
    for (const suit of CARD_SUITS) {
        for (const rank of CARD_RANKS) {
            deck.push({
                suit,
                rank,
                value: CARD_VALUE_MAP[rank],
                id: `${rank}${suit}`
            });
        }
    }

    // 小王
    deck.push({ suit: 'joker', rank: 'joker', value: CARD_VALUE_MAP.joker, id: 'joker' });
    // 大王
    deck.push({ suit: 'JOKER', rank: 'JOKER', value: CARD_VALUE_MAP.JOKER, id: 'JOKER' });

    return deck;
}

// 洗牌
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// 发牌
function dealCards() {
    gameState.deck = shuffleDeck(createDeck());

    // 每人17张，剩3张
    for (let i = 0; i < 3; i++) {
        for (let p = 0; p < 3; p++) {
            gameState.players[p].cards.push(gameState.deck.pop());
        }
    }

    // 底牌
    gameState.landlordCards = [...gameState.deck];

    // 排序手牌
    gameState.players.forEach(p => sortCards(p.cards));

    // 叫地主顺序：从玩家0开始
    gameState.callOrder = [0, 1, 2];
    gameState.callIndex = 0;
    gameState.currentPlayer = 0;
    gameState.phase = GAME_PHASE.CALLING_LANDLORD;

    console.log('发牌完成，开始叫地主');
}

// 排序手牌
function sortCards(cards) {
    cards.sort((a, b) => b.value - a.value);
}

// 叫地主
function callLandlord(playerId, callAction) {
    const player = gameState.players[playerId];

    if (callAction === 'call') {
        // 叫地主成功
        gameState.landlord = playerId;
        // 玩家获得底牌
        player.cards.push(...gameState.landlordCards);
        sortCards(player.cards);
        gameState.landlordCards = [];

        console.log(`🎯 ${player.name} 叫地主！`);
        startPlaying();
        return true;
    } else if (callAction === 'no_call') {
        // 不叫，继续下一个
        gameState.callIndex++;
        if (gameState.callIndex >= gameState.callOrder.length) {
            // 没人叫地主，重新发牌
            console.log('没人叫地主，重新发牌');
            resetGame();
            return false;
        }
        gameState.currentPlayer = gameState.callOrder[gameState.callIndex];
        return false;
    }
    return false;
}

// 开始出牌阶段
function startPlaying() {
    gameState.phase = GAME_PHASE.PLAYING;
    gameState.currentPlayer = gameState.landlord;  // 地主先出
    gameState.lastPlayer = null;
    gameState.lastCards = [];
    gameState.lastType = null;
    gameState.roundCount = 0;

    console.log(`🎮 开始出牌，地主: ${gameState.players[gameState.landlord].name}`);
}

// 获取当前玩家
function getCurrentPlayer() {
    return gameState.players[gameState.currentPlayer];
}

// 出牌
function playCards(playerId, cards) {
    const player = gameState.players[playerId];
    const cardType = analyzeCards(cards);

    if (!cardType) {
        console.log('无效的牌型');
        return false;
    }

    // 验证牌型
    if (!validateCards(cards, cardType)) {
        console.log('牌型不符合规则');
        return false;
    }

    // 验证是否比上家大
    if (!canBeat(cards, cardType)) {
        console.log('牌不够大');
        return false;
    }

    // 移除出的牌
    cards.forEach(card => {
        const idx = player.cards.findIndex(c => c.id === card.id);
        if (idx > -1) player.cards.splice(idx, 1);
    });

    // 更新游戏状态
    gameState.lastPlayer = playerId;
    gameState.lastCards = cards;
    gameState.lastType = cardType.type;
    gameState.lastValue = cardType.value;

    // 炸弹或王炸翻倍
    if (cardType.type === CARD_TYPES.BOMB || cardType.type === CARD_TYPES.KING_BOMB) {
        gameState.multiplier *= 2;
    }

    // 检查是否出完
    if (player.cards.length === 0) {
        endGame(playerId);
        return true;
    }

    // 轮到下一个玩家
    nextPlayer();
    return true;
}

// 不出
function pass(playerId) {
    console.log(`${gameState.players[playerId].name} 不出`);
    nextPlayer();
}

// 下一个玩家
function nextPlayer() {
    do {
        gameState.currentPlayer = (gameState.currentPlayer + 1) % 3;
    } while (gameState.players[gameState.currentPlayer].cards.length === 0);

    gameState.roundCount++;
}

// 分析牌型
function analyzeCards(cards) {
    if (!cards || cards.length === 0) return null;

    const count = cards.length;

    // 王炸
    if (count === 2) {
        const hasJoker = cards.some(c => c.rank === 'joker');
        const hasJOKER = cards.some(c => c.rank === 'JOKER');
        if (hasJoker && hasJOKER) {
            return { type: CARD_TYPES.KING_BOMB, value: 100 };
        }
    }

    // 炸弹
    if (count === 4) {
        const values = cards.map(c => c.value);
        if (values[0] === values[3]) {
            return { type: CARD_TYPES.BOMB, value: values[0] * 4 };
        }
    }

    // 顺子
    if (count >= 5) {
        const values = [...cards].sort((a, b) => a.value - b.value).map(c => c.value);
        let isStraight = true;
        for (let i = 0; i < values.length - 1; i++) {
            if (values[i + 1] - values[i] !== 1) {
                isStraight = false;
                break;
            }
        }
        // 不能超过A
        if (isStraight && values[values.length - 1] <= 14) {
            return { type: CARD_TYPES.STRAIGHT, value: values[values.length - 1] };
        }
    }

    // 三张
    if (count === 3) {
        const values = cards.map(c => c.value);
        if (values[0] === values[2]) {
            return { type: CARD_TYPES.TRIPLE, value: values[0] };
        }
    }

    // 三带一
    if (count === 4) {
        const values = cards.map(c => c.value);
        const counts = {};
        values.forEach(v => counts[v] = (counts[v] || 0) + 1);
        const threeCount = Object.values(counts).includes(3);
        if (threeCount) {
            const tripleValue = Object.keys(counts).find(k => counts[k] === 3);
            return { type: CARD_TYPES.TRIPLE_ONE, value: parseInt(tripleValue) };
        }
    }

    // 对子
    if (count === 2) {
        if (cards[0].value === cards[1].value) {
            return { type: CARD_TYPES.PAIR, value: cards[0].value };
        }
    }

    // 单张
    if (count === 1) {
        return { type: CARD_TYPES.SINGLE, value: cards[0].value };
    }

    return null;
}

// 验证牌型
function validateCards(cards, cardType) {
    // 基本验证在 analyzeCards 中已完成
    return cardType !== null;
}

// 判断是否能打过上家
function canBeat(cards, cardType) {
    // 首家出牌
    if (!gameState.lastPlayer) return true;

    // 王炸最大
    if (cardType.type === CARD_TYPES.KING_BOMB) return true;
    // 炸王炸
    if (gameState.lastType === CARD_TYPES.KING_BOMB) return false;

    // 炸弹打非炸弹
    if (cardType.type === CARD_TYPES.BOMB && gameState.lastType !== CARD_TYPES.BOMB) return true;
    // 非炸弹打炸弹
    if (gameState.lastType === CARD_TYPES.BOMB && cardType.type !== CARD_TYPES.BOMB) return false;

    // 同类型比较
    if (cardType.type === gameState.lastType) {
        if (cards.length !== gameState.lastCards.length) return false;
        return cardType.value > gameState.lastValue;
    }

    return false;
}

// 获取可用动作
function getAvailableActions(playerId) {
    const actions = [];

    // 叫地主阶段
    if (gameState.phase === GAME_PHASE.CALLING_LANDLORD) {
        if (gameState.currentPlayer === playerId) {
            actions.push('call', 'no_call');
        }
        return actions;
    }

    // 出牌阶段
    if (gameState.phase === GAME_PHASE.PLAYING) {
        if (gameState.currentPlayer === playerId) {
            // 可以出牌
            actions.push('play', 'pass');
        }
    }

    return actions;
}

// 检查游戏是否结束
function checkGameEnd() {
    // 有人出完牌就结束
    for (let i = 0; i < 3; i++) {
        if (gameState.players[i].cards.length === 0) {
            return true;
        }
    }
    return false;
}

// 结束游戏
function endGame(winnerId) {
    gameState.phase = GAME_PHASE.GAME_OVER;
    gameState.gameEnded = true;

    const winner = gameState.players[winnerId];
    const isLandlord = winnerId === gameState.landlord;

    // 地主获胜 = 赢，农民获胜 = 地主输
    const landlordWin = isLandlord;

    console.log(`🏆 游戏结束！${winner.name} 获胜！`);

    return {
        winner: winnerId,
        isLandlordWin: landlordWin,
        multiplier: gameState.multiplier,
        score: gameState.baseScore * gameState.multiplier * (isLandlord ? 1 : -1)
    };
}

// 重置游戏
function resetGame() {
    gameState.players.forEach(p => {
        p.cards = [];
        p.hasFolded = false;
    });
    gameState.deck = [];
    gameState.landlord = null;
    gameState.landlordCards = [];
    gameState.lastPlayer = null;
    gameState.lastCards = [];
    gameState.lastType = null;
    gameState.multiplier = 1;
    gameState.roundCount = 0;
    gameState.phase = GAME_PHASE.DEALING;
    gameState.gameEnded = false;

    // 重新发牌
    setTimeout(() => {
        dealCards();
    }, 1000);
}

// 初始化玩家
function initPlayers() {
    gameState.players = PLAYER_CONFIG.map(cfg => ({
        id: cfg.id,
        name: cfg.name,
        avatar: cfg.avatar,
        type: cfg.type,
        cards: [],
        hasFolded: false,
        isLandlord: false
    }));
}

// 开始游戏
function startGame() {
    initPlayers();
    gameState.gameStarted = true;
    dealCards();
}

// 导出
window.DoudizhuGame = {
    startGame,
    getState: () => gameState,
    callLandlord,
    playCards,
    pass,
    getAvailableActions,
    getCurrentPlayer,
    analyzeCards,
    sortCards,
    canBeat,
    GAME_PHASE,
    CARD_TYPES
};