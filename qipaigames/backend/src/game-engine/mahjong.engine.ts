import {
  IGameEngine,
  GameType,
  Player,
  GameAction,
  ActionResult,
  GameEndResult,
} from './types';

// 麻将引擎
export class MahjongEngine implements IGameEngine {
  gameType = GameType.MAHJONG;
  players: Player[] = [];
  currentPlayerId: string = '';
  gameState: {
    deck: string[];
    playerHands: Record<string, string[]>;
    playerMelds: Record<string, string[][]>;
    discardTiles: Record<string, string[]>;
    currentTile: string | null;
    gamePhase: 'deal' | 'draw' | 'discard' | 'end';
    history: string[];
  };

  private readonly tiles: string[] = [];

  initialize(players: Player[]): void {
    this.players = players;
    this.createTiles();
    this.gameState = {
      deck: this.shuffleTiles(),
      playerHands: {},
      playerMelds: {},
      discardTiles: {},
      currentTile: null,
      gamePhase: 'deal',
      history: [],
    };

    // 发牌
    this.dealTiles();
    this.currentPlayerId = players[0].id;
  }

  private createTiles(): void {
    // 万子
    for (let i = 1; i <= 9; i++) {
      this.tiles.push(`万${i}`, `万${i}`, `万${i}`, `万${i}`);
    }
    // 筒子
    for (let i = 1; i <= 9; i++) {
      this.tiles.push(`筒${i}`, `筒${i}`, `筒${i}`, `筒${i}`);
    }
    // 条子
    for (let i = 1; i <= 9; i++) {
      this.tiles.push(`条${i}`, `条${i}`, `条${i}`, `条${i}`);
    }
    // 风牌
    const winds = ['东', '南', '西', '北'];
    for (const wind of winds) {
      this.tiles.push(wind, wind, wind, wind);
    }
    // 箭牌
    const dragons = ['中', '发', '白'];
    for (const dragon of dragons) {
      this.tiles.push(dragon, dragon, dragon, dragon);
    }
  }

  private shuffleTiles(): string[] {
    const deck = [...this.tiles];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  private dealTiles(): void {
    for (const player of this.players) {
      // 每人13张
      this.gameState.playerHands[player.id] = this.gameState.deck.splice(0, 13);
      this.gameState.playerMelds[player.id] = [];
      this.gameState.discardTiles[player.id] = [];
    }
  }

  executeAction(action: GameAction): ActionResult {
    if (action.type === 'DRAW') {
      return this.handleDraw(action);
    } else if (action.type === 'DISCARD') {
      return this.handleDiscard(action);
    } else if (action.type === 'CHOW' || action.type === 'PONG' || action.type === 'KONG') {
      return this.handleMeld(action);
    } else if (action.type === 'HU') {
      return this.handleHu(action);
    }

    return { success: false, message: '未知动作' };
  }

  private handleDraw(action: GameAction): ActionResult {
    if (this.gameState.deck.length === 0) {
      return { success: false, message: '牌已摸完，流局' };
    }

    const tile = this.gameState.deck.pop()!;
    this.gameState.playerHands[action.playerId].push(tile);
    this.gameState.currentTile = tile;
    this.gameState.history.push(`玩家 ${action.playerId} 摸牌`);

    return { success: true, state: this.serialize() };
  }

  private handleDiscard(action: GameAction): ActionResult {
    const { tileIndex } = action.data;
    const hand = this.gameState.playerHands[action.playerId];
    const tile = hand[tileIndex];

    // 移除打出的牌
    hand.splice(tileIndex, 1);
    this.gameState.discardTiles[action.playerId].push(tile);
    this.gameState.currentTile = null;
    this.gameState.history.push(
      `玩家 ${action.playerId} 打牌: ${tile}`,
    );

    // 切换玩家
    this.currentPlayerId = this.getNextPlayerId(action.playerId);

    return { success: true, state: this.serialize() };
  }

  private handleMeld(action: GameAction): ActionResult {
    const { tiles, type } = action.data;
    const playerId = action.playerId;
    const hand = this.gameState.playerHands[playerId];

    // 移除手牌并添加到副露
    for (const tile of tiles) {
      const index = hand.indexOf(tile);
      if (index > -1) {
        hand.splice(index, 1);
      }
    }

    if (!this.gameState.playerMelds[playerId]) {
      this.gameState.playerMelds[playerId] = [];
    }
    this.gameState.playerMelds[playerId].push(tiles);

    this.gameState.history.push(`玩家 ${playerId} ${type}: ${tiles.join(' ')}`);

    return { success: true, state: this.serialize() };
  }

  private handleHu(action: GameAction): ActionResult {
    const hand = this.gameState.playerHands[action.playerId];
    const tiles = [...hand];
    if (this.gameState.currentTile) {
      tiles.push(this.gameState.currentTile);
    }

    // 简单胡牌判断（实际需要更复杂的算法）
    const isHu = this.checkHu(tiles);

    if (isHu) {
      return {
        success: true,
        message: '胡牌',
        state: { winner: action.playerId },
      };
    }

    return { success: false, message: '不能胡牌' };
  }

  private checkHu(tiles: string[]): boolean {
    // 简化判断：假设14张牌
    if (tiles.length !== 14) return false;

    // 这里应该实现完整的胡牌算法
    // 暂时简单返回
    return true;
  }

  private getNextPlayerId(playerId: string): string {
    const currentIndex = this.players.findIndex((p) => p.id === playerId);
    const nextIndex = (currentIndex + 1) % this.players.length;
    return this.players[nextIndex].id;
  }

  getLegalActions(playerId: string): GameAction[] {
    const actions: GameAction[] = [];
    const hand = this.gameState.playerHands[playerId];

    if (this.gameState.currentTile) {
      // 可以打牌
      hand.forEach((_, i) => {
        actions.push({
          type: 'DISCARD',
          playerId,
          data: { tileIndex: i },
        });
      });

      // 可以胡
      actions.push({
        type: 'HU',
        playerId,
        data: {},
      });
    } else {
      // 可以摸牌
      actions.push({
        type: 'DRAW',
        playerId,
        data: {},
      });
    }

    return actions;
  }

  checkGameEnd(): GameEndResult | null {
    // 检查是否有玩家胡牌
    for (const player of this.players) {
      const hand = this.gameState.playerHands[player.id];
      if (hand.length === 0) {
        return { winner: player.id, reason: '胡牌' };
      }
    }

    // 牌摸完了
    if (this.gameState.deck.length === 0) {
      return { winner: '流局', reason: '牌山已空' };
    }

    return null;
  }

  serialize(): string {
    return JSON.stringify({
      gameType: this.gameType,
      deckSize: this.gameState.deck.length,
      handSizes: Object.fromEntries(
        Object.entries(this.gameState.playerHands).map(([k, v]) => [k, v.length]),
      ),
    });
  }

  getStateDescription(): string {
    const handSize = this.gameState.playerHands[this.currentPlayerId]?.length || 0;
    const currentTile = this.gameState.currentTile || '无';
    return `麻将 - 当前玩家:${this.currentPlayerId} | 手牌:${handSize}张 | 摸牌:${currentTile}`;
  }
}