// 游戏类型枚举
export enum GameType {
  CHINESE_CHESS = 'chineseChess', // 中国象棋
  GO = 'go', // 围棋
  DOU_DI_ZHU = 'doudizhu', // 斗地主
  MAHJONG = 'mahjong', // 麻将
  ZHA_JIN_HUA = 'zhaJinHua', // 炸金花
}

// 玩家
export interface Player {
  id: string;
  name: string;
  isAI: boolean;
}

// 游戏动作
export interface GameAction {
  type: string;
  playerId: string;
  data: Record<string, any>;
}

// 动作结果
export interface ActionResult {
  success: boolean;
  message?: string;
  state?: any;
}

// 游戏结束结果
export interface GameEndResult {
  winner: string;
  reason: string;
  scores?: Record<string, number>;
}

// 游戏引擎接口
export interface IGameEngine {
  gameType: GameType;
  players: Player[];
  currentPlayerId: string;
  gameState: any;

  // 初始化游戏
  initialize(players: Player[]): void;

  // 执行动作
  executeAction(action: GameAction): ActionResult;

  // 获取合法动作
  getLegalActions(playerId: string): GameAction[];

  // 检查游戏是否结束
  checkGameEnd(): GameEndResult | null;

  // 序列化状态
  serialize(): string;

  // 获取状态描述(用于AI)
  getStateDescription(): string;
}