import {
  IGameEngine,
  GameType,
  Player,
  GameAction,
  ActionResult,
  GameEndResult,
} from './types';

// 牌的花色和点数
type CardSuit = 'spades' | 'hearts' | 'clubs' | 'diamonds' | 'joker';
type CardRank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2' | 'Joker';

interface Card {
  suit: CardSuit;
  rank: CardRank;
  isJoker?: boolean;
  jokerType?: 'small' | 'big';
}

// 斗地主引擎
export class DouDiZhuEngine implements IGameEngine {
  gameType = GameType.DOU_DI_ZHU;
  players: Player[] = [];
  currentPlayerId: string = '';
  gameState: {
    deck: Card[];
    playerHands: Record<string, Card[]>;
    landlordId: string | null;
    threeLandlordCards: Card[];
    lastPlay: {
      playerId: string;
      cards: Card[];
      type: string;
    } | null;
    gamePhase: 'deal' | 'bid' | 'play' | 'end';
    history: string[];
  };

  private readonly rankOrder: CardRank[] = [
    '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2',
  ];

  initialize(players: Player[]): void {
    this.players = players;
    this.gameState = {
      deck: this.createDeck(),
      playerHands: {},
      landlordId: null,
      threeLandlordCards: [],
      lastPlay: null,
      gamePhase: 'deal',
      history: [],
    };

    // 发牌
    this.dealCards();

    // 随机选择第一个玩家
    this.currentPlayerId = players[Math.floor(Math.random() * players.length)].id;
  }

  private createDeck(): Card[] {
    const deck: Card[] = [];
    const suits: CardSuit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
    const ranks: CardRank[] = [
      '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2',
    ];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank });
      }
    }

    // 添加大小王
    deck.push({ suit: 'joker', rank: ' Joker' as CardRank, isJoker: true, jokerType: 'small' });
    deck.push({ suit: 'joker', rank: ' Joker' as CardRank, isJoker: true, jokerType: 'big' });

    // 洗牌
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  private dealCards(): void {
    // 每人17张，留3张
    const playerIds = this.players.map((p) => p.id);

    for (let i = 0; i < 17; i++) {
      for (const playerId of playerIds) {
        if (!this.gameState.playerHands[playerId]) {
          this.gameState.playerHands[playerId] = [];
        }
        const card = this.gameState.deck.pop();
        if (card) {
          this.gameState.playerHands[playerId].push(card);
        }
      }
    }

    // 留三张底牌
    this.gameState.threeLandlordCards = this.gameState.deck.slice(-3);

    // 排序手牌
    for (const playerId of playerIds) {
      this.gameState.playerHands[playerId].sort((a, b) =>
        this.compareCards(a, b),
      );
    }
  }

  private compareCards(a: Card, b: Card): number {
    const rankA = this.getCardValue(a);
    const rankB = this.getCardValue(b);
    if (rankA !== rankB) return rankB - rankA;

    // 同点数按花色排序
    const suitOrder: CardSuit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
    if (a.isJoker) return 0;
    if (b.isJoker) return 0;
    return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
  }

  private getCardValue(card: Card): number {
    if (card.isJoker) {
      return card.jokerType === 'big' ? 20 : 19;
    }
    return this.rankOrder.indexOf(card.rank);
  }

  executeAction(action: GameAction): ActionResult {
    if (action.type === 'CALL_LANDLORD') {
      return this.handleCallLandlord(action);
    } else if (action.type === 'PLAY_CARDS') {
      return this.handlePlayCards(action);
    } else if (action.type === 'PASS') {
      return this.handlePass(action);
    }
    return { success: false, message: '未知动作' };
  }

  private handleCallLandlord(action: GameAction): ActionResult {
    const { callLandlord } = action.data;
    const playerId = action.playerId;

    if (this.gameState.gamePhase !== 'deal') {
      return { success: false, message: '不在叫地主阶段' };
    }

    if (callLandlord) {
      this.gameState.landlordId = playerId;
      this.gameState.gamePhase = 'play';

      // 给地主发底牌
      this.gameState.playerHands[playerId].push(
        ...this.gameState.threeLandlordCards,
      );
      this.gameState.playerHands[playerId].sort((a, b) =>
        this.compareCards(a, b),
      );

      this.gameState.history.push(`玩家 ${playerId} 叫地主`);
    } else {
      this.gameState.history.push(`玩家 ${playerId} 不叫`);
    }

    // 切换到下一个玩家
    this.currentPlayerId = this.getNextPlayerId(playerId);

    return { success: true, state: this.serialize() };
  }

  private handlePlayCards(action: GameAction): ActionResult {
    const { cardIndices } = action.data;
    const playerId = action.playerId;

    const hand = this.gameState.playerHands[playerId];
    const cards = cardIndices.map((i: number) => hand[i]);

    // 验证出牌是否合法
    const validation = this.validatePlay(cards, playerId);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    // 移除出的牌
    const newHand = hand.filter((_, i) => !cardIndices.includes(i));
    this.gameState.playerHands[playerId] = newHand;

    // 记录这手牌
    this.gameState.lastPlay = {
      playerId,
      cards,
      type: validation.type || 'single',
    };

    this.gameState.history.push(
      `玩家 ${playerId} 出: ${cards.map((c) => this.cardToString(c)).join(' ')}`,
    );

    // 检查是否赢了
    if (newHand.length === 0) {
      return {
        success: true,
        message: '游戏结束',
        state: {
          winner: playerId,
          isLandlord: playerId === this.gameState.landlordId,
        },
      };
    }

    // 切换玩家
    this.currentPlayerId = this.getNextPlayerId(playerId);

    return { success: true, state: this.serialize() };
  }

  private handlePass(action: GameAction): ActionResult {
    const playerId = action.playerId;

    // 检查是否可以过
    if (!this.gameState.lastPlay) {
      return { success: false, message: '你是第一个出牌的，不能过' };
    }

    if (this.gameState.lastPlay.playerId === playerId) {
      return { success: false, message: '上一手是你出的，不能过' };
    }

    this.gameState.history.push(`玩家 ${playerId} 过`);

    // 检查是否所有其他玩家都过了
    const otherPlayers = this.players.filter((p) => p.id !== playerId);
    const allPassed = otherPlayers.every(
      (p) =>
        p.id === this.gameState.lastPlay?.playerId ||
        this.gameState.history
          .slice(-10)
          .some((h) => h.includes(p.id) && h.includes('过')),
    );

    if (allPassed) {
      this.gameState.lastPlay = null;
      this.gameState.history.push('新一轮开始');
    }

    this.currentPlayerId = this.getNextPlayerId(playerId);

    return { success: true, state: this.serialize() };
  }

  private validatePlay(
    cards: Card[],
    playerId: string,
  ): { valid: boolean; message?: string; type?: string } {
    if (cards.length === 0) {
      return { valid: false, message: '请选择要出的牌' };
    }

    // 没有上一手牌，可以出任意牌
    if (!this.gameState.lastPlay) {
      return { valid: true, type: this.getPlayType(cards) };
    }

    const lastType = this.gameState.lastPlay.type;
    const lastCount = this.gameState.lastPlay.cards.length;
    const lastValue = Math.max(...this.gameState.lastPlay.cards.map((c) => this.getCardValue(c)));

    const currentType = this.getPlayType(cards);
    const currentCount = cards.length;
    const currentValue = Math.max(...cards.map((c) => this.getCardValue(c)));

    // 炸弹可以压任何牌
    if (currentType === 'bomb' && lastType !== 'bomb') {
      return { valid: true, type: 'bomb' };
    }

    // 王炸最大
    if (currentType === 'jokerBomb' && lastType !== 'jokerBomb') {
      return { valid: true, type: 'jokerBomb' };
    }

    // 类型和数量必须相同
    if (currentType !== lastType || currentCount !== lastCount) {
      return { valid: false, message: '出牌类型或数量不匹配' };
    }

    // 点数必须更大
    if (currentValue <= lastValue) {
      return { valid: false, message: '点数必须大于上家' };
    }

    return { valid: true, type: currentType };
  }

  private getPlayType(cards: Card[]): string {
    if (cards.length === 1) return 'single';
    if (cards.length === 2) {
      if (cards[0].isJoker && cards[1].isJoker) return 'jokerBomb';
      if (this.getCardValue(cards[0]) === this.getCardValue(cards[1])) return 'pair';
    }
    if (cards.length === 3) {
      if (
        this.getCardValue(cards[0]) ===
        this.getCardValue(cards[1])
      )
        return 'triple';
    }
    if (cards.length === 4) {
      const values = cards.map((c) => this.getCardValue(c));
      if (new Set(values).size === 1) return 'bomb';
    }

    // 顺子
    if (cards.length >= 5) {
      const values = [...cards].sort((a, b) => this.getCardValue(a) - this.getCardValue(b));
      let isStraight = true;
      for (let i = 1; i < values.length; i++) {
        if (this.getCardValue(values[i]) - this.getCardValue(values[i - 1]) !== 1) {
          isStraight = false;
          break;
        }
      }
      if (isStraight) return 'straight';
    }

    return 'unknown';
  }

  private getNextPlayerId(playerId: string): string {
    const currentIndex = this.players.findIndex((p) => p.id === playerId);
    const nextIndex = (currentIndex + 1) % this.players.length;
    return this.players[nextIndex].id;
  }

  private cardToString(card: Card): string {
    if (card.isJoker) {
      return card.jokerType === 'big' ? '大王' : '小王';
    }
    const suitSymbols: Record<CardSuit, string> = {
      spades: '♠',
      hearts: '♥',
      clubs: '♣',
      diamonds: '♦',
      joker: '🃏',
    };
    return `${suitSymbols[card.suit]}${card.rank}`;
  }

  getLegalActions(playerId: string): GameAction[] {
    const actions: GameAction[] = [];
    const hand = this.gameState.playerHands[playerId];

    if (this.gameState.gamePhase === 'deal') {
      actions.push({
        type: 'CALL_LANDLORD',
        playerId,
        data: { callLandlord: true },
      });
      actions.push({
        type: 'CALL_LANDLORD',
        playerId,
        data: { callLandlord: false },
      });
    } else {
      // 出任意组合的牌
      for (let i = 1; i <= hand.length; i++) {
        const combinations = this.getCombinations(hand.length, i);
        for (const combo of combinations) {
          actions.push({
            type: 'PLAY_CARDS',
            playerId,
            data: { cardIndices: combo },
          });
        }
      }

      // 可以选择过
      if (this.gameState.lastPlay && this.gameState.lastPlay.playerId !== playerId) {
        actions.push({
          type: 'PASS',
          playerId,
          data: {},
        });
      }
    }

    return actions;
  }

  private getCombinations(n: number, k: number): number[][] {
    const result: number[][] = [];
    const combine = (start: number, current: number[]) => {
      if (current.length === k) {
        result.push(current);
        return;
      }
      for (let i = start; i < n; i++) {
        combine(i + 1, [...current, i]);
      }
    };
    combine(0, []);
    return result;
  }

  checkGameEnd(): GameEndResult | null {
    for (const player of this.players) {
      if (this.gameState.playerHands[player.id].length === 0) {
        const isLandlord = player.id === this.gameState.landlordId;
        return {
          winner: player.id,
          reason: isLandlord ? '地主获胜' : '农民获胜',
        };
      }
    }
    return null;
  }

  serialize(): string {
    return JSON.stringify({
      gameType: this.gameType,
      landlordId: this.gameState.landlordId,
      handSizes: Object.fromEntries(
        Object.entries(this.gameState.playerHands).map(([k, v]) => [
          k,
          v.length,
        ]),
      ),
      lastPlay: this.gameState.lastPlay
        ? {
            playerId: this.gameState.lastPlay.playerId,
            count: this.gameState.lastPlay.cards.length,
            type: this.gameState.lastPlay.type,
          }
        : null,
    });
  }

  getStateDescription(): string {
    const handSize = this.gameState.playerHands[this.currentPlayerId]?.length || 0;
    const landlord = this.gameState.landlordId ? '已确定' : '待叫';
    return `斗地主 - 当前玩家:${this.currentPlayerId} | 手牌:${handSize}张 | 地主:${landlord}`;
  }
}