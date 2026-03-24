import {
  IGameEngine,
  GameType,
  Player,
  GameAction,
  ActionResult,
  GameEndResult,
} from './types';

// 围棋引擎
export class GoEngine implements IGameEngine {
  gameType = GameType.GO;
  players: Player[] = [];
  currentPlayerId: string = '';
  gameState: {
    board: (string | null)[][]; // null, 'black', 'white'
    history: string[];
    captures: { black: number; white: number };
  };

  private readonly BOARD_SIZE = 19;

  initialize(players: Player[]): void {
    this.players = players;
    this.currentPlayerId = players[0].id;
    this.gameState = {
      board: Array(this.BOARD_SIZE)
        .fill(null)
        .map(() => Array(this.BOARD_SIZE).fill(null)),
      history: [],
      captures: { black: 0, white: 0 },
    };
  }

  executeAction(action: GameAction): ActionResult {
    const { x, y } = action.data;

    // 验证坐标
    if (x < 0 || x >= this.BOARD_SIZE || y < 0 || y >= this.BOARD_SIZE) {
      return { success: false, message: '无效的坐标' };
    }

    // 检查是否已有棋子
    if (this.gameState.board[y][x] !== null) {
      return { success: false, message: '该位置已有棋子' };
    }

    const player = this.players.find((p) => p.id === action.playerId);
    const color = player?.name.includes('黑') ? 'black' : 'white';

    // 检查是否是当前玩家
    const expectedColor = this.currentPlayerId === this.players[0].id ? 'black' : 'white';
    if (color !== expectedColor) {
      return { success: false, message: '还没轮到你' };
    }

    // 下子
    this.gameState.board[y][x] = color;

    // 检查提子
    const capturedStones = this.checkCaptures(x, y, color);
    const opponentColor = color === 'black' ? 'white' : 'black';

    if (capturedStones.length > 0) {
      // 提掉对方的子
      for (const stone of capturedStones) {
        this.gameState.board[stone.y][stone.x] = null;
      }
      this.gameState.captures[color] += capturedStones.length;
    }

    // 检查自提（自杀规则）
    const selfCaptures = this.checkCaptures(x, y, opponentColor);
    if (selfCaptures.length > 0 && capturedStones.length === 0) {
      // 自杀无效，回退
      this.gameState.board[y][x] = null;
      return { success: false, message: '不能自杀' };
    }

    this.gameState.history.push(`${color === 'black' ? '黑' : '白'}:(${x},${y})`);

    // 切换玩家
    this.currentPlayerId = this.players.find((p) => p.id !== this.currentPlayerId)?.id || '';

    return {
      success: true,
      state: this.serialize(),
    };
  }

  private checkCaptures(x: number, y: number, color: string): { x: number; y: number }[] {
    const opponentColor = color === 'black' ? 'white' : 'black';
    const groups = this.getGroups(opponentColor);

    const captured: { x: number; y: number }[] = [];

    for (const group of groups) {
      if (group.stones.some((s) => s.x === x && s.y === y)) {
        if (group.liberties === 0) {
          captured.push(...group.stones);
        }
      }
    }

    return captured;
  }

  private getGroups(
    color: string,
  ): { stones: { x: number; y: number }[]; liberties: number }[] {
    const visited = new Set<string>();
    const groups: { stones: { x: number; y: number }[]; liberties: number }[] = [];

    for (let y = 0; y < this.BOARD_SIZE; y++) {
      for (let x = 0; x < this.BOARD_SIZE; x++) {
        const key = `${x},${y}`;
        if (
          this.gameState.board[y][x] === color &&
          !visited.has(key)
        ) {
          const group = this.getGroup(x, y, color, visited);
          groups.push(group);
        }
      }
    }

    return groups;
  }

  private getGroup(
    startX: number,
    startY: number,
    color: string,
    visited: Set<string>,
  ): { stones: { x: number; y: number }[]; liberties: number } {
    const stones: { x: number; y: number }[] = [];
    const liberties = new Set<string>();
    const stack = [{ x: startX, y: startY }];

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      visited.add(key);
      stones.push({ x, y });

      // 检查四个方向
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
      ];

      for (const { dx, dy } of directions) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) {
          continue;
        }

        const neighbor = this.gameState.board[ny][nx];
        if (neighbor === null) {
          liberties.add(`${nx},${ny}`);
        } else if (neighbor === color && !visited.has(`${nx},${ny}`)) {
          stack.push({ x: nx, y: ny });
        }
      }
    }

    return { stones, liberties: liberties.size };
  }

  getLegalActions(playerId: string): GameAction[] {
    const actions: GameAction[] = [];

    for (let y = 0; y < this.BOARD_SIZE; y++) {
      for (let x = 0; x < this.BOARD_SIZE; x++) {
        if (this.gameState.board[y][x] === null) {
          actions.push({
            type: 'PLACE',
            playerId,
            data: { x, y },
          });
        }
      }
    }

    return actions;
  }

  checkGameEnd(): GameEndResult | null {
    // 简单实现：检查是否下满或双方停一手
    // 实际围棋还有更多终局判断
    const totalStones = this.gameState.history.length;
    if (totalStones >= this.BOARD_SIZE * this.BOARD_SIZE) {
      return this.calculateResult();
    }
    return null;
  }

  private calculateResult(): GameEndResult {
    // 计算领地
    let blackTerritory = 0;
    let whiteTerritory = 0;

    for (let y = 0; y < this.BOARD_SIZE; y++) {
      for (let x = 0; x < this.BOARD_SIZE; x++) {
        if (this.gameState.board[y][x] === null) {
          const territory = this.calculateTerritory(x, y);
          if (territory === 'black') blackTerritory++;
          else if (territory === 'white') whiteTerritory++;
        }
      }
    }

    const blackScore =
      blackTerritory + this.gameState.captures.white;
    const whiteScore =
      whiteTerritory + this.gameState.captures.black + 6.5; // 黑贴目

    let winner: string;
    let reason: string;

    if (blackScore > whiteScore) {
      winner = '黑方';
      reason = `黑${blackScore} vs 白${whiteScore}`;
    } else {
      winner = '白方';
      reason = `白${whiteScore} vs 黑${blackScore}`;
    }

    return { winner, reason };
  }

  private calculateTerritory(
    x: number,
    y: number,
  ): 'black' | 'white' | null {
    if (this.gameState.board[y][x] !== null) return null;

    const visited = new Set<string>();
    const stack = [{ x, y }];
    const adjacentColors = new Set<string>();

    while (stack.length > 0) {
      const { x: cx, y: cy } = stack.pop()!;
      const key = `${cx},${cy}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
      ];

      for (const { dx, dy } of directions) {
        const nx = cx + dx;
        const ny = cy + dy;

        if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) {
          continue;
        }

        const neighbor = this.gameState.board[ny][nx];
        if (neighbor === null) {
          if (!visited.has(`${nx},${ny}`)) {
            stack.push({ x: nx, y: ny });
          }
        } else {
          adjacentColors.add(neighbor);
        }
      }
    }

    if (adjacentColors.size === 1) {
      return adjacentColors.has('black') ? 'black' : 'white';
    }
    return null;
  }

  serialize(): string {
    return JSON.stringify({
      gameType: this.gameType,
      board: this.gameState.board,
      captures: this.gameState.captures,
      historyLength: this.gameState.history.length,
    });
  }

  getStateDescription(): string {
    const counts = { black: 0, white: 0 };
    for (let y = 0; y < this.BOARD_SIZE; y++) {
      for (let x = 0; x < this.BOARD_SIZE; x++) {
        if (this.gameState.board[y][x]) {
          counts[this.gameState.board[y][x] as 'black' | 'white']++;
        }
      }
    }
    return `围棋 - 黑子:${counts.black} 白子:${counts.white} | 提子:黑${this.gameState.captures.white}白${this.gameState.captures.black}`;
  }
}