import {
  IGameEngine,
  GameType,
  Player,
  GameAction,
  ActionResult,
  GameEndResult,
} from './types';

// 牌面等级
enum CardLevel {
  HIGH_CARD = 1, // 单张
  PAIR = 2, // 对子
  STRAIGHT = 3, // 顺子
  FLUSH = 4, // 同花
  FULL_HOUSE = 5, // 葫芦(三个+对子)
  FOUR_OF_A_KIND = 6, // 炸弹
  STRAIGHT_FLUSH = 7, // 同花顺
}

// 炸金花引擎
export class ZhaJinHuaEngine implements IGameEngine {
  gameType = GameType.ZHA_JIN_HUA;
  players: Player[] = [];
  currentPlayerId: string = '';
  gameState: {
    deck: string[];
    playerHands: Record<string, string[]>;
    playerBets: Record<string, number>;
    playerSeen: Record<string, boolean>;
    playerStatus: Record<string, 'playing' | 'folded' | 'allIn'>;
    currentBet: number;
    pot: number;
    gamePhase: 'deal' | 'bet' | 'showdown' | 'end';
    history: string[];
    winner: string | null;
  };

  private readonly cardRanks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  private readonly suits = ['♠', '♥', '♣', '♦'];

  initialize(players: Player[]): void {
    this.players = players;
    this.gameState = {
      deck: this.createDeck(),
      playerHands: {},
      playerBets: {},
      playerSeen: {},
      playerStatus: {},
      currentBet: 0,
      pot: 0,
      gamePhase: 'deal',
      history: [],
      winner: null,
    };

    // 发牌
    this.dealCards();

    // 初始化玩家状态
    for (const player of players) {
      this.gameState.playerBets[player.id] = 0;
      this.gameState.playerStatus[player.id] = 'playing';
    }

    // 小盲注玩家
    this.currentPlayerId = players[0].id;
  }

  private createDeck(): string[] {
    const deck: string[] = [];
    for (const suit of this.suits) {
      for (const rank of this.cardRanks) {
        deck.push(`${suit}${rank}`);
      }
    }

    // 洗牌
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  private dealCards(): void {
    for (const player of this.players) {
      // 每人发3张牌
      this.gameState.playerHands[player.id] = [
        this.gameState.deck.pop()!,
        this.gameState.deck.pop()!,
        this.gameState.deck.pop()!,
      ];
    }
  }

  executeAction(action: GameAction): ActionResult {
    if (action.type === 'SEE') {
      return this.handleSee(action);
    } else if (action.type === 'BET') {
      return this.handleBet(action);
    } else if (action.type === 'FOLD') {
      return this.handleFold(action);
    } else if (action.type === 'ALL_IN') {
      return this.handleAllIn(action);
    } else if (action.type === 'SHOW') {
      return this.handleShow(action);
    }

    return { success: false, message: '未知动作' };
  }

  private handleSee(action: GameAction): ActionResult {
    const playerId = action.playerId;

    if (this.gameState.playerSeen[playerId]) {
      return { success: false, message: '已经看过牌了' };
    }

    this.gameState.playerSeen[playerId] = true;
    this.gameState.history.push(`玩家 ${playerId} 看牌`);

    return { success: true, state: this.serialize() };
  }

  private handleBet(action: GameAction): ActionResult {
    const { amount } = action.data;
    const playerId = action.playerId;

    // 验证下注金额
    const minBet = this.gameState.currentBet === 0 ? 1 : this.gameState.currentBet;
    if (amount < minBet) {
      return { success: false, message: `最小下注金额为 ${minBet}` };
    }

    // 检查玩家金币是否足够
    const player = this.players.find((p) => p.id === playerId);
    if (!player) {
      return { success: false, message: '玩家不存在' };
    }

    // 更新下注
    this.gameState.playerBets[playerId] += amount;
    this.gameState.currentBet = Math.max(this.gameState.currentBet, amount);
    this.gameState.pot += amount;

    this.gameState.history.push(
      `玩家 ${playerId} 下注: ${amount} (当前: ${this.gameState.playerBets[playerId]})`,
    );

    // 切换玩家
    this.currentPlayerId = this.getNextActivePlayerId(playerId);

    // 检查是否所有玩家都跟注
    if (this.checkAllCalled()) {
      return this.goToNextPhase();
    }

    return { success: true, state: this.serialize() };
  }

  private handleFold(action: GameAction): ActionResult {
    const playerId = action.playerId;

    this.gameState.playerStatus[playerId] = 'folded';
    this.gameState.history.push(`玩家 ${playerId} 弃牌`);

    // 检查是否只剩一个玩家
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 1) {
      return {
        success: true,
        message: '游戏结束',
        state: { winner: activePlayers[0].id, reason: '对手弃牌' },
      };
    }

    // 切换玩家
    this.currentPlayerId = this.getNextActivePlayerId(playerId);

    return { success: true, state: this.serialize() };
  }

  private handleAllIn(action: GameAction): ActionResult {
    const playerId = action.playerId;

    this.gameState.playerStatus[playerId] = 'allIn';
    this.gameState.history.push(`玩家 ${playerId} 全下`);

    // 切换玩家
    this.currentPlayerId = this.getNextActivePlayerId(playerId);

    // 检查是否只剩一个玩家
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 1) {
      return {
        success: true,
        message: '游戏结束',
        state: { winner: activePlayers[0].id, reason: '对手全下' },
      };
    }

    return { success: true, state: this.serialize() };
  }

  private handleShow(action: GameAction): ActionResult {
    // 比牌阶段
    const activePlayers = this.getActivePlayers();

    if (activePlayers.length === 1) {
      // 只有一个人没弃牌，直接获胜
      this.gameState.winner = activePlayers[0].id;
      this.gameState.gamePhase = 'end';
      return {
        success: true,
        message: '游戏结束',
        state: { winner: activePlayers[0].id, reason: '对手弃牌' },
      };
    }

    // 比较所有玩家的牌
    let bestPlayer = activePlayers[0];
    let bestLevel = this.getHandLevel(this.gameState.playerHands[bestPlayer.id]);

    for (let i = 1; i < activePlayers.length; i++) {
      const player = activePlayers[i];
      const level = this.getHandLevel(this.gameState.playerHands[player.id]);

      if (level > bestLevel) {
        bestLevel = level;
        bestPlayer = player;
      } else if (level === bestLevel) {
        // 同等级，比较最大单张
        const currentMax = this.getMaxCard(this.gameState.playerHands[bestPlayer.id]);
        const newMax = this.getMaxCard(this.gameState.playerHands[player.id]);
        if (newMax > currentMax) {
          bestPlayer = player;
        }
      }
    }

    this.gameState.winner = bestPlayer.id;
    this.gameState.gamePhase = 'end';
    this.gameState.history.push(`玩家 ${bestPlayer.id} 获胜`);

    return {
      success: true,
      message: '游戏结束',
      state: { winner: bestPlayer.id, reason: '比牌获胜' },
    };
  }

  private getHandLevel(hand: string[]): { level: number; maxCard: number } {
    const ranks = hand.map((c) => c.slice(1));
    const suits = hand.map((c) => c[0]);

    // 检查同花
    const isFlush = suits.every((s) => s === suits[0]);

    // 检查顺子
    const rankIndices = ranks.map((r) => this.cardRanks.indexOf(r)).sort((a, b) => a - b);
    let isStraight = true;
    for (let i = 1; i < rankIndices.length; i++) {
      if (rankIndices[i] - rankIndices[i - 1] !== 1) {
        isStraight = false;
        break;
      }
    }
    // 特殊顺子 A23
    if (!isStraight && ranks.includes('A') && ranks.includes('2') && ranks.includes('3')) {
      isStraight = true;
    }

    // 统计每个点数的出现次数
    const rankCount: Record<string, number> = {};
    for (const r of ranks) {
      rankCount[r] = (rankCount[r] || 0) + 1;
    }
    const counts = Object.values(rankCount).sort((a, b) => b - a);

    // 判断牌型
    if (isFlush && isStraight) {
      return { level: CardLevel.STRAIGHT_FLUSH, maxCard: Math.max(...rankIndices) };
    }
    if (counts[0] === 4) {
      return { level: CardLevel.FOUR_OF_A_KIND, maxCard: Math.max(...rankIndices) };
    }
    if (counts[0] === 3 && counts[1] === 2) {
      return { level: CardLevel.FULL_HOUSE, maxCard: Math.max(...rankIndices) };
    }
    if (isFlush) {
      return { level: CardLevel.FLUSH, maxCard: Math.max(...rankIndices) };
    }
    if (isStraight) {
      return { level: CardLevel.STRAIGHT, maxCard: Math.max(...rankIndices) };
    }
    if (counts[0] === 3) {
      return { level: CardLevel.PAIR, maxCard: Math.max(...rankIndices) };
    }
    if (counts[0] === 2) {
      return { level: CardLevel.PAIR, maxCard: Math.max(...rankIndices) };
    }

    return { level: CardLevel.HIGH_CARD, maxCard: Math.max(...rankIndices) };
  }

  private getMaxCard(hand: string[]): number {
    const ranks = hand.map((c) => c.slice(1));
    return Math.max(...ranks.map((r) => this.cardRanks.indexOf(r)));
  }

  private checkAllCalled(): boolean {
    const activePlayers = this.getActivePlayers();
    return activePlayers.every(
      (p) => this.gameState.playerBets[p.id] >= this.gameState.currentBet,
    );
  }

  private getActivePlayers(): Player[] {
    return this.players.filter(
      (p) => this.gameState.playerStatus[p.id] === 'playing' ||
             this.gameState.playerStatus[p.id] === 'allIn',
    );
  }

  private getNextActivePlayerId(playerId: string): string {
    const activePlayers = this.getActivePlayers();
    const currentIndex = activePlayers.findIndex((p) => p.id === playerId);
    const nextIndex = (currentIndex + 1) % activePlayers.length;
    return activePlayers[nextIndex].id;
  }

  private goToNextPhase(): ActionResult {
    if (this.gameState.gamePhase === 'deal') {
      this.gameState.gamePhase = 'bet';
      this.gameState.history.push('进入下注阶段');
    } else if (this.gameState.gamePhase === 'bet') {
      this.gameState.gamePhase = 'showdown';
      this.gameState.history.push('进入比牌阶段');
    }

    // 重置下注
    this.gameState.currentBet = 0;
    for (const player of this.players) {
      this.gameState.playerBets[player.id] = 0;
    }

    return { success: true, state: this.serialize() };
  }

  getLegalActions(playerId: string): GameAction[] {
    const actions: GameAction[] = [];
    const status = this.gameState.playerStatus[playerId];

    if (status === 'folded') {
      return [];
    }

    // 可以看牌
    if (!this.gameState.playerSeen[playerId]) {
      actions.push({
        type: 'SEE',
        playerId,
        data: {},
      });
    }

    // 可以下注
    const minBet = this.gameState.currentBet === 0 ? 1 : this.gameState.currentBet;
    for (let amount = minBet; amount <= 10; amount++) {
      actions.push({
        type: 'BET',
        playerId,
        data: { amount },
      });
    }

    // 可以弃牌
    actions.push({
      type: 'FOLD',
      playerId,
      data: {},
    });

    // 可以全下
    actions.push({
      type: 'ALL_IN',
      playerId,
      data: {},
    });

    // 可以比牌（第二轮后）
    if (this.gameState.gamePhase === 'showdown') {
      actions.push({
        type: 'SHOW',
        playerId,
        data: {},
      });
    }

    return actions;
  }

  checkGameEnd(): GameEndResult | null {
    if (this.gameState.winner) {
      return { winner: this.gameState.winner, reason: '比牌获胜' };
    }

    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 1) {
      return { winner: activePlayers[0].id, reason: '对手弃牌' };
    }

    return null;
  }

  serialize(): string {
    return JSON.stringify({
      gameType: this.gameType,
      phase: this.gameState.gamePhase,
      currentBet: this.gameState.currentBet,
      pot: this.gameState.pot,
      handSizes: Object.fromEntries(
        Object.entries(this.gameState.playerHands).map(([k, v]) => [k, v.length]),
      ),
      seen: this.gameState.playerSeen,
    });
  }

  getStateDescription(): string {
    const phaseNames: Record<string, string> = {
      deal: '发牌',
      bet: '下注',
      showdown: '比牌',
      end: '结束',
    };
    const handSize = this.gameState.playerHands[this.currentPlayerId]?.length || 0;
    const seen = this.gameState.playerSeen[this.currentPlayerId] ? '已看' : '未看';
    return `炸金花 - 阶段:${phaseNames[this.gameState.gamePhase]} | 当前玩家:${this.currentPlayerId} | 手牌:${handSize}张 | ${seen} | 底池:${this.gameState.pot}`;
  }
}