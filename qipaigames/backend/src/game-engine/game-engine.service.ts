import { Injectable } from '@nestjs/common';
import {
  IGameEngine,
  GameType,
  Player,
  GameAction,
  ActionResult,
  GameEndResult,
} from './types';
import { ChineseChessEngine } from './chinese-chess.engine';
import { GoEngine } from './go.engine';
import { DouDiZhuEngine } from './doudizhu.engine';
import { MahjongEngine } from './mahjong.engine';
import { ZhaJinHuaEngine } from './zha-jin-hua.engine';

@Injectable()
export class GameEngineService {
  private games: Map<string, IGameEngine> = new Map();

  /**
   * 创建游戏
   */
  createGame(gameType: GameType, players: Player[]): string {
    let engine: IGameEngine;

    switch (gameType) {
      case GameType.CHINESE_CHESS:
        engine = new ChineseChessEngine();
        break;
      case GameType.GO:
        engine = new GoEngine();
        break;
      case GameType.DOU_DI_ZHU:
        engine = new DouDiZhuEngine();
        break;
      case GameType.MAHJONG:
        engine = new MahjongEngine();
        break;
      case GameType.ZHA_JIN_HUA:
        engine = new ZhaJinHuaEngine();
        break;
      default:
        throw new Error(`不支持的游戏类型: ${gameType}`);
    }

    engine.initialize(players);
    const gameId = this.generateGameId();
    this.games.set(gameId, engine);

    return gameId;
  }

  /**
   * 获取游戏
   */
  getGame(gameId: string): IGameEngine | undefined {
    return this.games.get(gameId);
  }

  /**
   * 执行游戏动作
   */
  executeAction(gameId: string, action: GameAction): ActionResult {
    const engine = this.games.get(gameId);
    if (!engine) {
      return { success: false, message: '游戏不存在' };
    }

    return engine.executeAction(action);
  }

  /**
   * 获取合法动作
   */
  getLegalActions(gameId: string, playerId: string): GameAction[] {
    const engine = this.games.get(gameId);
    if (!engine) {
      return [];
    }

    return engine.getLegalActions(playerId);
  }

  /**
   * 检查游戏是否结束
   */
  checkGameEnd(gameId: string): GameEndResult | null {
    const engine = this.games.get(gameId);
    if (!engine) {
      return null;
    }

    return engine.checkGameEnd();
  }

  /**
   * 获取游戏状态描述
   */
  getStateDescription(gameId: string): string {
    const engine = this.games.get(gameId);
    if (!engine) {
      return '游戏不存在';
    }

    return engine.getStateDescription();
  }

  /**
   * 序列化游戏状态
   */
  serializeGame(gameId: string): string {
    const engine = this.games.get(gameId);
    if (!engine) {
      return '';
    }

    return engine.serialize();
  }

  /**
   * 删除游戏
   */
  deleteGame(gameId: string): void {
    this.games.delete(gameId);
  }

  /**
   * 生成游戏ID
   */
  private generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取所有支持的游戏类型
   */
  getSupportedGames(): { type: GameType; name: string }[] {
    return [
      { type: GameType.CHINESE_CHESS, name: '中国象棋' },
      { type: GameType.GO, name: '围棋' },
      { type: GameType.DOU_DI_ZHU, name: '斗地主' },
      { type: GameType.MAHJONG, name: '麻将' },
      { type: GameType.ZHA_JIN_HUA, name: '炸金花' },
    ];
  }
}