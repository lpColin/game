import {
  IGameEngine,
  GameType,
  Player,
  GameAction,
  ActionResult,
  GameEndResult,
} from './types';

// 象棋棋子位置
interface ChessPosition {
  x: number; // 0-8
  y: number; // 0-9
}

// 象棋棋子
interface ChessPiece {
  type: string; // 帅, 仕, 相, 车, 马, 炮, 兵
  color: 'red' | 'black';
  position: ChessPosition;
}

// 中国象棋引擎
export class ChineseChessEngine implements IGameEngine {
  gameType = GameType.CHINESE_CHESS;
  players: Player[] = [];
  currentPlayerId: string = '';
  gameState: {
    pieces: ChessPiece[];
    history: string[];
    currentTurn: 'red' | 'black';
  };

  // 初始棋盘布局
  private initialLayout: Omit<ChessPiece, 'position'>[] = [
    // 红方
    { type: '车', color: 'red' },
    { type: '马', color: 'red' },
    { type: '相', color: 'red' },
    { type: '仕', color: 'red' },
    { type: '帅', color: 'red' },
    { type: '仕', color: 'red' },
    { type: '相', color: 'red' },
    { type: '马', color: 'red' },
    { type: '车', color: 'red' },
    // 红方炮
    { type: '炮', color: 'red' },
    { type: '炮', color: 'red' },
    // 红方兵
    { type: '兵', color: 'red' },
    { type: '兵', color: 'red' },
    { type: '兵', color: 'red' },
    { type: '兵', color: 'red' },
    { type: '兵', color: 'red' },
    // 黑方
    { type: '车', color: 'black' },
    { type: '马', color: 'black' },
    { type: '象', color: 'black' },
    { type: '士', color: 'black' },
    { type: '将', color: 'black' },
    { type: '士', color: 'black' },
    { type: '象', color: 'black' },
    { type: '马', color: 'black' },
    { type: '车', color: 'black' },
    // 黑方炮
    { type: '炮', color: 'black' },
    { type: '炮', color: 'black' },
    // 黑方卒
    { type: '卒', color: 'black' },
    { type: '卒', color: 'black' },
    { type: '卒', color: 'black' },
    { type: '卒', color: 'black' },
    { type: '卒', color: 'black' },
  ];

  initialize(players: Player[]): void {
    this.players = players;
    this.currentPlayerId = players[0].id;
    this.gameState = {
      pieces: this.createInitialPieces(),
      history: [],
      currentTurn: 'red',
    };
  }

  private createInitialPieces(): ChessPiece[] {
    const pieces: ChessPiece[] = [];

    // 红方 (底部, y=0-2)
    const redPositions = [
      { x: 0, y: 0 }, // 车
      { x: 1, y: 0 }, // 马
      { x: 2, y: 0 }, // 相
      { x: 3, y: 0 }, // 仕
      { x: 4, y: 0 }, // 帅
      { x: 5, y: 0 }, // 仕
      { x: 6, y: 0 }, // 相
      { x: 7, y: 0 }, // 马
      { x: 8, y: 0 }, // 车
      { x: 1, y: 2 }, // 炮
      { x: 7, y: 2 }, // 炮
      { x: 0, y: 3 }, // 兵
      { x: 2, y: 3 }, // 兵
      { x: 4, y: 3 }, // 兵
      { x: 6, y: 3 }, // 兵
      { x: 8, y: 3 }, // 兵
    ];

    // 黑方 (顶部, y=7-9)
    const blackPositions = [
      { x: 0, y: 9 }, // 车
      { x: 1, y: 9 }, // 马
      { x: 2, y: 9 }, // 象
      { x: 3, y: 9 }, // 士
      { x: 4, y: 9 }, // 将
      { x: 5, y: 9 }, // 士
      { x: 6, y: 9 }, // 象
      { x: 7, y: 9 }, // 马
      { x: 8, y: 9 }, // 车
      { x: 1, y: 7 }, // 炮
      { x: 7, y: 7 }, // 炮
      { x: 0, y: 6 }, // 卒
      { x: 2, y: 6 }, // 卒
      { x: 4, y: 6 }, // 卒
      { x: 6, y: 6 }, // 卒
      { x: 8, y: 6 }, // 卒
    ];

    this.initialLayout.forEach((layout, index) => {
      const isRed = index < 16;
      const positions = isRed ? redPositions : blackPositions;
      const posIndex = isRed ? index : index - 16;
      if (positions[posIndex]) {
        pieces.push({
          ...layout,
          position: positions[posIndex],
        });
      }
    });

    return pieces;
  }

  executeAction(action: GameAction): ActionResult {
    const { from, to, pieceType } = action.data;

    // 验证是否是当前玩家的回合
    const player = this.players.find((p) => p.id === action.playerId);
    if (!player) {
      return { success: false, message: '无效的玩家' };
    }

    const playerColor = player.name.includes('红') ? 'red' : 'black';
    if (this.gameState.currentTurn !== playerColor) {
      return { success: false, message: '还没轮到你' };
    }

    // 查找并移动棋子
    const piece = this.gameState.pieces.find(
      (p) =>
        p.color === playerColor &&
        (p.type === pieceType || p.type === (playerColor === 'red' ? '帅' : '将')) &&
        p.position.x === from.x &&
        p.position.y === from.y,
    );

    if (!piece) {
      return { success: false, message: '找不到该棋子' };
    }

    // 验证移动是否合法
    if (!this.isValidMove(piece, to)) {
      return { success: false, message: '无效的移动' };
    }

    // 检查目标位置是否有己方棋子
    const targetPiece = this.gameState.pieces.find(
      (p) => p.position.x === to.x && p.position.y === to.y,
    );

    if (targetPiece && targetPiece.color === piece.color) {
      return { success: false, message: '不能吃己方的棋子' };
    }

    // 执行移动
    if (targetPiece) {
      // 吃子
      this.gameState.pieces = this.gameState.pieces.filter(
        (p) => p !== targetPiece,
      );
    }

    piece.position = to;
    this.gameState.history.push(
      `${piece.type}: (${from.x},${from.y}) -> (${to.x},${to.y})`,
    );

    // 切换回合
    this.gameState.currentTurn =
      this.gameState.currentTurn === 'red' ? 'black' : 'red';

    // 检查是否获胜
    const endResult = this.checkGameEnd();
    if (endResult) {
      return { success: true, message: '游戏结束', state: endResult };
    }

    return {
      success: true,
      state: this.serialize(),
    };
  }

  private isValidMove(piece: ChessPiece, to: ChessPosition): boolean {
    const { x: fx, y: fy } = piece.position;
    const { x: tx, y: ty } = to;

    // 边界检查
    if (tx < 0 || tx > 8 || ty < 0 || ty > 9) return false;

    // 九宫限制
    if (piece.type === '帅' || piece.type === '将') {
      if (tx < 3 || tx > 5) return false;
      if (piece.color === 'red' && (ty < 0 || ty > 2)) return false;
      if (piece.color === 'black' && (ty < 7 || ty > 9)) return false;
    }

    // 士的走法
    if (piece.type === '仕' || piece.type === '士') {
      return Math.abs(tx - fx) === 1 && Math.abs(ty - fy) === 1;
    }

    // 相/象的走法
    if (piece.type === '相' || piece.type === '象') {
      if (piece.color === 'red' && ty > 4) return false;
      if (piece.color === 'black' && ty < 5) return false;
      if (Math.abs(tx - fx) !== 2 || Math.abs(ty - fy) !== 2) return false;
      // 蹩象腿
      const midX = (fx + tx) / 2;
      const midY = (fy + ty) / 2;
      if (this.gameState.pieces.some((p) => p.position.x === midX && p.position.y === midY)) {
        return false;
      }
      return true;
    }

    // 车的走法
    if (piece.type === '车') {
      if (fx !== tx && fy !== ty) return false;
      // 检查路径是否有阻碍
      if (fx === tx) {
        const minY = Math.min(fy, ty);
        const maxY = Math.max(fy, ty);
        for (let y = minY + 1; y < maxY; y++) {
          if (this.gameState.pieces.some((p) => p.position.x === fx && p.position.y === y)) {
            return false;
          }
        }
      } else {
        const minX = Math.min(fx, tx);
        const maxX = Math.max(fx, tx);
        for (let x = minX + 1; x < maxX; x++) {
          if (this.gameState.pieces.some((p) => p.position.x === x && p.position.y === fy)) {
            return false;
          }
        }
      }
      return true;
    }

    // 马的走法
    if (piece.type === '马') {
      const dx = Math.abs(tx - fx);
      const dy = Math.abs(ty - fy);
      if (!((dx === 1 && dy === 2) || (dx === 2 && dy === 1))) return false;
      // 蹩马腿
      if (dx === 2) {
        const midX = (fx + tx) / 2;
        if (this.gameState.pieces.some((p) => p.position.x === midX && p.position.y === fy)) {
          return false;
        }
      } else {
        const midY = (fy + ty) / 2;
        if (this.gameState.pieces.some((p) => p.position.x === fx && p.position.y === midY)) {
          return false;
        }
      }
      return true;
    }

    // 炮的走法
    if (piece.type === '炮') {
      if (fx !== tx && fy !== ty) return false;
      // 移动时不许吃子
      if (this.hasPieceOnPath(fx, fy, tx, ty)) return false;
      return true;
    }

    // 兵/卒的走法
    if (piece.type === '兵' || piece.type === '卒') {
      const forward = piece.color === 'red' ? 1 : -1;
      if (piece.color === 'red' && fy < 5 && fy + 1 !== ty) return false;
      if (piece.color === 'black' && fy > 4 && fy - 1 !== ty) return false;
      if (ty !== fy + forward) return false;
      if (fx !== tx) return false;
      return true;
    }

    return false;
  }

  private hasPieceOnPath(
    fx: number,
    fy: number,
    tx: number,
    ty: number,
  ): boolean {
    if (fx === tx) {
      const minY = Math.min(fy, ty);
      const maxY = Math.max(fy, ty);
      for (let y = minY + 1; y < maxY; y++) {
        if (this.gameState.pieces.some((p) => p.position.x === fx && p.position.y === y)) {
          return true;
        }
      }
    } else {
      const minX = Math.min(fx, tx);
      const maxX = Math.max(fx, tx);
      for (let x = minX + 1; x < maxX; x++) {
        if (this.gameState.pieces.some((p) => p.position.x === x && p.position.y === fy)) {
          return true;
        }
      }
    }
    return false;
  }

  getLegalActions(playerId: string): GameAction[] {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return [];

    const playerColor = player.name.includes('红') ? 'red' : 'black';
    const playerPieces = this.gameState.pieces.filter(
      (p) => p.color === playerColor,
    );

    const actions: GameAction[] = [];

    for (const piece of playerPieces) {
      // 遍历所有可能的位置
      for (let x = 0; x <= 8; x++) {
        for (let y = 0; y <= 9; y++) {
          if (this.isValidMove(piece, { x, y })) {
            const targetPiece = this.gameState.pieces.find(
              (p) => p.position.x === x && p.position.y === y,
            );
            if (!targetPiece || targetPiece.color !== piece.color) {
              actions.push({
                type: 'MOVE',
                playerId,
                data: {
                  from: piece.position,
                  to: { x, y },
                  pieceType: piece.type,
                },
              });
            }
          }
        }
      }
    }

    return actions;
  }

  checkGameEnd(): GameEndResult | null {
    const redGeneral = this.gameState.pieces.find((p) => p.type === '帅');
    const blackGeneral = this.gameState.pieces.find((p) => p.type === '将');

    if (!redGeneral) {
      return { winner: '黑方', reason: '红方被将死' };
    }
    if (!blackGeneral) {
      return { winner: '红方', reason: '黑方被将死' };
    }

    // 检查是否将帅对面
    const redX = redGeneral.position.x;
    const blackX = blackGeneral.position.x;
    if (redX === blackX) {
      const minY = Math.min(redGeneral.position.y, blackGeneral.position.y);
      const maxY = Math.max(redGeneral.position.y, blackGeneral.position.y);
      let hasObstacle = false;
      for (let y = minY + 1; y < maxY; y++) {
        if (
          this.gameState.pieces.some(
            (p) => p.position.x === redX && p.position.y === y,
          )
        ) {
          hasObstacle = true;
          break;
        }
      }
      if (!hasObstacle) {
        return { winner: '红方', reason: '将帅对面，红方获胜' };
      }
    }

    return null;
  }

  serialize(): string {
    return JSON.stringify({
      gameType: this.gameType,
      currentTurn: this.gameState.currentTurn,
      pieces: this.gameState.pieces,
    });
  }

  getStateDescription(): string {
    const pieces = this.gameState.pieces
      .map((p) => `${p.color === 'red' ? '红' : '黑'}${p.type}:(${p.position.x},${p.position.y})`)
      .join(', ');
    return `象棋 - ${this.gameState.currentTurn === 'red' ? '红方' : '黑方'}回合 | 棋子: ${pieces}`;
  }
}