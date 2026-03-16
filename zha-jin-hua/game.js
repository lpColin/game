/**
 * 炸金花游戏 - 支持2-6人动态配置
 * 包含乔治（算牌型AI）和Lala（激进型AI）两种AI策略
 */

class Card {
    constructor(suit, rank) {
        this.suit = suit; // 花色: ♠ ♥ ♣ ♦
        this.rank = rank; // 点数: 2-10, J, Q, K, A
    }

    toString() {
        return `${this.suit}${this.rank}`;
    }

    getValue() {
        const values = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
        return values[this.rank];
    }
}

class Deck {
    constructor() {
        this.cards = [];
        const suits = ['♠', '♥', '♣', '♦'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        for (const suit of suits) {
            for (const rank of ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        return this.cards.pop();
    }
}

class HandEvaluator {
    // 评估牌型并返回等级和比较用的值
    static evaluate(hand) {
        const sorted = [...hand].sort((a, b) => b.getValue() - a.getValue());
        const values = sorted.map(c => c.getValue());
        const suits = sorted.map(c => c.suit);
        
        const isFlush = suits.every(s => s === suits[0]);
        const isStraight = this.isStraight(values);
        const valueCounts = this.getValueCounts(values);
        
        // 豹子 (三张相同)
        if (Object.values(valueCounts).includes(3)) {
            return { type: 6, typeName: '豹子', value: values[0], kickers: [] };
        }
        
        // 同花顺
        if (isFlush && isStraight) {
            return { type: 5, typeName: '同花顺', value: values[0], kickers: [] };
        }
        
        // 同花
        if (isFlush) {
            return { type: 4, typeName: '同花', value: values[0], kickers: values.slice(1) };
        }
        
        // 顺子
        if (isStraight) {
            return { type: 3, typeName: '顺子', value: values[0], kickers: [] };
        }
        
        // 对子
        if (Object.values(valueCounts).includes(2)) {
            const pairValue = parseInt(Object.keys(valueCounts).find(k => valueCounts[k] === 2));
            const kicker = values.find(v => v !== pairValue);
            return { type: 2, typeName: '对子', value: pairValue, kickers: [kicker] };
        }
        
        // 单张
        return { type: 1, typeName: '单张', value: values[0], kickers: values.slice(1) };
    }

    static isStraight(values) {
        // 特殊处理 A-2-3 顺子
        if (values[0] === 14 && values[1] === 3 && values[2] === 2) {
            return true;
        }
        return values[0] - values[1] === 1 && values[1] - values[2] === 1;
    }

    static getValueCounts(values) {
        const counts = {};
        for (const v of values) {
            counts[v] = (counts[v] || 0) + 1;
        }
        return counts;
    }

    // 比较两手牌，返回 1: hand1赢, -1: hand2赢, 0: 平局
    static compare(hand1, hand2) {
        const eval1 = this.evaluate(hand1);
        const eval2 = this.evaluate(hand2);
        
        if (eval1.type !== eval2.type) {
            return eval1.type > eval2.type ? 1 : -1;
        }
        
        if (eval1.value !== eval2.value) {
            return eval1.value > eval2.value ? 1 : -1;
        }
        
        // 比较踢脚
        for (let i = 0; i < eval1.kickers.length; i++) {
            if (eval1.kickers[i] !== eval2.kickers[i]) {
                return eval1.kickers[i] > eval2.kickers[i] ? 1 : -1;
            }
        }
        
        return 0;
    }
}

class Player {
    constructor(id, name, isAI = false, aiType = null) {
        this.id = id;
        this.name = name;
        this.isAI = isAI;
        this.aiType = aiType; // 'george' 或 'lala'
        this.hand = [];
        this.chips = 1000;
        this.currentBet = 0;
        this.isActive = true; // 是否还在游戏中（未弃牌）
        this.isFolded = false;
        this.totalBet = 0;
        this.handType = '';
    }

    receiveCard(card) {
        this.hand.push(card);
    }

    reset() {
        this.hand = [];
        this.currentBet = 0;
        this.isActive = true;
        this.isFolded = false;
        this.handType = '';
    }

    // AI决策
    makeDecision(gameState) {
        if (!this.isAI) return null;
        
        const handStrength = this.evaluateHandStrength();
        const potOdds = gameState.currentBet / (gameState.pot + gameState.currentBet);
        
        if (this.aiType === 'george') {
            return this.georgeDecision(handStrength, potOdds, gameState);
        } else if (this.aiType === 'lala') {
            return this.lalaDecision(handStrength, potOdds, gameState);
        }
        
        return this.basicAIDecision(handStrength, potOdds, gameState);
    }

    // 乔治AI - 算牌型型（更理性，基于概率）
    georgeDecision(handStrength, potOdds, gameState) {
        const evalResult = HandEvaluator.evaluate(this.hand);
        
        // 乔治很理性，只玩好牌
        if (evalResult.type >= 4) { // 同花及以上
            return { action: 'raise', amount: Math.min(this.chips, gameState.currentBet * 2 + 50) };
        }
        
        if (evalResult.type >= 3) { // 顺子
            if (handStrength > 0.6) {
                return { action: 'raise', amount: Math.min(this.chips, gameState.currentBet + 30) };
            }
            return { action: 'call' };
        }
        
        if (evalResult.type === 2) { // 对子
            if (handStrength > potOdds + 0.2) {
                return { action: 'call' };
            }
            return { action: 'fold' };
        }
        
        // 单张 - 只有牌很大才跟
        if (evalResult.value >= 12 && Math.random() > 0.7) { // Q以上
            return { action: 'call' };
        }
        
        return { action: 'fold' };
    }

    // Lala AI - 激进型（喜欢诈唬，大胆下注）
    lalaDecision(handStrength, potOdds, gameState) {
        // Lala很激进，经常诈唬
        const bluffFactor = Math.random();
        
        if (handStrength > 0.7 || bluffFactor > 0.6) { // 好牌或诈唬
            const raiseAmount = Math.min(this.chips, gameState.currentBet * 3 + Math.floor(Math.random() * 100));
            return { action: 'raise', amount: raiseAmount };
        }
        
        if (handStrength > 0.4 || bluffFactor > 0.3) {
            return { action: 'call' };
        }
        
        // 即使牌不好，Lala有时也会诈唬
        if (bluffFactor > 0.8) {
            return { action: 'raise', amount: Math.min(this.chips, gameState.currentBet * 2) };
        }
        
        return { action: 'fold' };
    }

    // 基础AI决策
    basicAIDecision(handStrength, potOdds, gameState) {
        if (handStrength > 0.7) {
            return { action: 'raise', amount: Math.min(this.chips, gameState.currentBet * 2) };
        }
        if (handStrength > potOdds) {
            return { action: 'call' };
        }
        return { action: 'fold' };
    }

    // 评估手牌强度 (0-1)
    evaluateHandStrength() {
        const evalResult = HandEvaluator.evaluate(this.hand);
        const typeWeight = evalResult.type / 6;
        const valueWeight = evalResult.value / 14;
        return (typeWeight * 0.7 + valueWeight * 0.3);
    }
}

class Game {
    constructor(playerCount = 4) {
        this.playerCount = Math.max(2, Math.min(6, playerCount)); // 限制2-6人
        this.players = [];
        this.deck = new Deck();
        this.pot = 0;
        this.currentBet = 10; // 底注
        this.currentPlayerIndex = 0;
        this.round = 1;
        this.gameState = 'waiting'; // waiting, playing, ended
        this.dealerIndex = 0;
        this.minBet = 10;
        this.lastRaisePlayer = null;
        
        this.initPlayers();
    }

    initPlayers()
    {
        this.players = [];
        
        // 玩家0是人类玩家
        this.players.push(new Player(0, '你', false, null));
        
        // AI配置：乔治（算牌型型）和 Lala（激进型）交替
        const aiConfigs = [
            { name: '乔治', type: 'george' },
            { name: 'Lala', type: 'lala' },
            { name: 'AI-3', type: 'george' },
            { name: 'AI-4', type: 'lala' },
            { name: 'AI-5', type: 'george' }
        ];
        
        // 添加AI玩家填充剩余位置
        for (let i = 1; i < this.playerCount; i++) {
            const config = aiConfigs[(i - 1) % aiConfigs.length];
            this.players.push(new Player(i, config.name, true, config.type));
        }
    }

    start() {
        this.deck = new Deck();
        this.deck.shuffle();
        this.pot = 0;
        this.currentBet = this.minBet;
        this.currentPlayerIndex = 0;
        this.round = 1;
        this.gameState = 'playing';
        this.lastRaisePlayer = null;
        
        // 重置玩家状态并发牌
        for (const player of this.players) {
            player.reset();
            player.totalBet = 0;
            // 每人发3张牌
            for (let i = 0; i < 3; i++) {
                player.receiveCard(this.deck.deal());
            }
        }
        
        // 收底注
        for (const player of this.players) {
            const ante = Math.min(this.minBet, player.chips);
            player.chips -= ante;
            player.totalBet = ante;
            this.pot += ante;
        }
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    getActivePlayers() {
        return this.players.filter(p => !p.isFolded && p.chips > 0);
    }

    // 玩家操作
    playerAction(action, amount = 0) {
        const player = this.getCurrentPlayer();
        
        if (player.isAI) {
            return { success: false, message: '当前是AI回合' };
        }
        
        return this.processAction(player, action, amount);
    }

    // 处理AI回合
    processAITurn() {
        const player = this.getCurrentPlayer();
        
        if (!player.isAI || player.isFolded) {
            this.nextPlayer();
            return null;
        }
        
        const gameState = {
            pot: this.pot,
            currentBet: this.currentBet,
            players: this.players,
            activePlayers: this.getActivePlayers().length
        };
        
        const decision = player.makeDecision(gameState);
        
        if (!decision) {
            this.nextPlayer();
            return null;
        }
        
        const result = this.processAction(player, decision.action, decision.amount || 0);
        return result;
    }

    // 处理操作
    processAction(player, action, amount) {
        if (player.isFolded) {
            this.nextPlayer();
            return { success: true, message: player.name + ' 已弃牌，跳过' };
        }
        
        let message = '';
        
        switch (action) {
            case 'fold':
                player.isFolded = true;
                message = player.name + ' 弃牌';
                break;
                
            case 'check':
                if (this.currentBet > player.totalBet) {
                    return { success: false, message: '不能过牌，需要跟注或弃牌' };
                }
                message = player.name + ' 过牌';
                break;
                
            case 'call':
                const callAmount = this.currentBet - player.totalBet;
                if (callAmount > player.chips) {
                    return { success: false, message: '筹码不足' };
                }
                player.chips -= callAmount;
                player.totalBet += callAmount;
                this.pot += callAmount;
                message = player.name + ' 跟注 ' + callAmount;
                break;
                
            case 'raise':
                const raiseTo = Math.max(amount, this.currentBet * 2);
                const raiseAmount = raiseTo - player.totalBet;
                
                if (raiseAmount > player.chips) {
                    return { success: false, message: '筹码不足' };
                }
                
                player.chips -= raiseAmount;
                player.totalBet += raiseAmount;
                this.pot += raiseAmount;
                this.currentBet = raiseTo;
                this.lastRaisePlayer = player.id;
                message = player.name + ' 加注到 ' + raiseTo;
                break;
                
            default:
                return { success: false, message: '未知操作' };
        }
        
        // 检查是否只剩一个玩家
        const activePlayers = this.getActivePlayers();
        if (activePlayers.length === 1) {
            this.gameState = 'ended';
            return { success: true, message: message + ' - 游戏结束！' };
        }
        
        // 检查是否一轮结束
        this.nextPlayer();
        
        // 检查是否完成一轮下注
        if (this.isRoundComplete()) {
            this.gameState = 'ended';
            return { success: true, message: message + ' - 进入比牌阶段！' };
        }
        
        return { success: true, message };
    }

    nextPlayer() {
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (this.players[this.currentPlayerIndex].isFolded);
    }

    isRoundComplete() {
        // 如果只剩一个未弃牌玩家，结束
        const activePlayers = this.getActivePlayers();
        if (activePlayers.length <= 1) return true;
        
        // 检查是否所有活跃玩家都已下注相同金额
        const allBetsEqual = activePlayers.every(p => p.totalBet === this.currentBet);
        
        // 如果所有下注相等且回到起始位置，一轮结束
        if (allBetsEqual && this.currentPlayerIndex === 0) {
            return true;
        }
        
        return false;
    }

    // 比牌功能
    compare(playerIndex) {
        const player = this.players[this.currentPlayerIndex];
        const opponent = this.players[playerIndex];
        
        // 检查是否有效
        if (opponent.isFolded) {
            return { success: false, message: '该玩家已弃牌' };
        }
        if (opponent.id === player.id) {
            return { success: false, message: '不能和自己比牌' };
        }
        
        // 比牌费用 = 当前下注额的2倍
        const compareCost = this.currentBet * 2;
        if (player.chips < compareCost) {
            return { success: false, message: '筹码不足，无法比牌' };
        }
        
        // 扣除比牌费用
        player.chips -= compareCost;
        player.totalBet += compareCost;
        this.pot += compareCost;
        
        // 比牌
        const comparison = HandEvaluator.compare(player.hand, opponent.hand);
        
        let result;
        if (comparison > 0) {
            // 玩家赢
            opponent.isFolded = true;
            result = { 
                success: true, 
                win: true, 
                message: `${player.name} 比牌获胜！${opponent.name} 弃牌`,
                playerHand: HandEvaluator.evaluate(player.hand),
                opponentHand: HandEvaluator.evaluate(opponent.hand)
            };
        } else if (comparison < 0) {
            // 对手赢
            player.isFolded = true;
            result = { 
                success: true, 
                win: false, 
                message: `${player.name} 比牌失败，弃牌`,
                playerHand: HandEvaluator.evaluate(player.hand),
                opponentHand: HandEvaluator.evaluate(opponent.hand)
            };
        } else {
            // 平局，双方都不弃牌（罕见情况）
            result = { 
                success: true, 
                win: null, 
                message: '比牌平局！',
                playerHand: HandEvaluator.evaluate(player.hand),
                opponentHand: HandEvaluator.evaluate(opponent.hand)
            };
        }
        
        // 检查是否只剩一个玩家
        const activePlayers = this.getActivePlayers();
        if (activePlayers.length === 1) {
            this.gameState = 'ended';
            result.message += ' - 游戏结束！';
        } else {
            this.nextPlayer();
        }
        
        return result;
    }

    // 结束游戏并决出胜负
    endGame() {
        this.gameState = 'ended';
        
        const activePlayers = this.getActivePlayers();
        
        if (activePlayers.length === 0) {
            return { winner: null, winAmount: 0 };
        }
        
        if (activePlayers.length === 1) {
            // 只剩一个玩家，直接获胜
            const winner = activePlayers[0];
            winner.chips += this.pot;
            return { winner, winAmount: this.pot };
        }
        
        // 比牌
        let winner = activePlayers[0];
        for (let i = 1; i < activePlayers.length; i++) {
            const comparison = HandEvaluator.compare(winner.hand, activePlayers[i].hand);
            if (comparison < 0) {
                winner = activePlayers[i];
            }
        }
        
        winner.chips += this.pot;
        
        // 为每个玩家计算手牌类型
        for (const player of this.players) {
            if (player.hand.length === 3) {
                const evalResult = HandEvaluator.evaluate(player.hand);
                player.handType = evalResult.typeName;
            }
        }
        
        return { winner, winAmount: this.pot };
    }

    getGameState() {
        return {
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                isAI: p.isAI,
                aiType: p.aiType,
                chips: p.chips,
                hand: p.hand,
                isFolded: p.isFolded,
                totalBet: p.totalBet,
                handType: p.handType
            })),
            pot: this.pot,
            currentBet: this.currentBet,
            currentPlayerIndex: this.currentPlayerIndex,
            round: this.round,
            gameState: this.gameState
        };
    }
}

// 导出模块（如果在Node.js环境中）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Card, Deck, HandEvaluator, Player, Game };
}

