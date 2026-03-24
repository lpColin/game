/**
 * 游戏注册表
 */
import ZJHAdapter from './zjh.js';
import DoudizhuAdapter from './doudizhu.js';

const games = {
  'zjh': new ZJHAdapter(),
  'zha-jin-hua': new ZJHAdapter(),
  '炸金花': new ZJHAdapter(),
  'doudizhu': new DoudizhuAdapter(),
  '斗地主': new DoudizhuAdapter()
};

class GameRegistry {
  /**
   * 获取游戏适配器
   */
  static get(gameName) {
    return games[gameName.toLowerCase()];
  }

  /**
   * 注册新游戏
   */
  static register(name, adapter) {
    games[name.toLowerCase()] = adapter;
  }

  /**
   * 获取所有支持的游戏
   */
  static list() {
    return Object.keys(games);
  }
}

export default GameRegistry;