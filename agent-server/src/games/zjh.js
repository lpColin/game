/**
 * 炸金花游戏规则适配器
 */
import GameAdapter from './base.js';

class ZJHAdapter extends GameAdapter {
  constructor() {
    super('炸金花');
  }

  getSystemPrompt() {
    return `
你是炸金花游戏的玩家。炸金花是一种三人以上的扑克牌游戏，使用一副52张牌（去掉大小王）。

游戏规则:
1. 牌型大小（从大到小）: 豹子 > 同花顺 > 同花 > 顺子 > 对子 > 散牌
2. 特殊规则: 235 不同花色可以赢豹子（最大）
3. 每局开始每位玩家发3张牌
4. 游戏可以进行看牌(look)、跟注(call)、加注(raise)、弃牌(fold)等操作
5. 看牌后可以看到自己的牌型，加注后其他玩家需要决定是否跟注
6. 可以选择开牌(compare)与指定玩家比牌，输者弃牌

你的风格:
- 活泼可爱，喜欢聊天
- 会根据牌型和对手行为做出决策
- 有时会诈唬(bluff)来迷惑对手
- 会适当表达情绪（好牌时开心，输牌时惋惜）

请用中文回复。
`;
  }

  formatGameState(state) {
    const { pot, currentBet, roundCount, playerCount, players, recentActions } = state;

    let info = `底池: ${pot}，当前下注: ${currentBet}，第 ${roundCount} 轮\n`;
    info += `玩家数: ${playerCount}\n`;

    if (players) {
      info += '\n玩家状态:\n';
      players.forEach((p, i) => {
        if (p.isAI) {
          info += `- 玩家${i + 1}: ${p.folded ? '已弃牌' : '在玩'}，下注: ${p.bet}`;
          if (p.looked) info += '，已看牌';
          info += '\n';
        }
      });
    }

    if (recentActions && recentActions.length > 0) {
      info += '\n最近动作:\n';
      recentActions.slice(-3).forEach(a => {
        info += `- 玩家${a.player}: ${a.action}`;
        if (a.amount) info += ` ${a.amount}`;
        info += '\n';
      });
    }

    return info;
  }

  parseAction(response, availableActions) {
    try {
      // 尝试解析 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch);
        const action = parsed.action?.toLowerCase();

        // 验证动作是否在可用动作中
        if (availableActions.includes(action)) {
          return {
            action,
            amount: parsed.amount || 0,
            reasoning: parsed.reasoning || ''
          };
        }

        // 尝试匹配动作关键字
        for (const avail of availableActions) {
          if (action?.includes(avail) || action?.includes(this.getActionKeyword(avail))) {
            return {
              action: avail,
              amount: parsed.amount || this.getDefaultAmount(avail, parsed.amount),
              reasoning: parsed.reasoning || ''
            };
          }
        }
      }

      // 简单匹配
      response = response.toLowerCase();
      for (const avail of availableActions) {
        if (response.includes(avail) || response.includes(this.getActionKeyword(avail))) {
          return {
            action: avail,
            amount: this.getDefaultAmount(avail),
            reasoning: ''
          };
        }
      }

      // 默认跟注
      if (availableActions.includes('call')) {
        return { action: 'call', amount: 0, reasoning: '默认跟注' };
      }

      return { action: availableActions[0], amount: 0, reasoning: '默认选择' };
    } catch (e) {
      console.error('解析动作失败:', e);
      return { action: 'call', amount: 0, reasoning: '解析失败，默认跟注' };
    }
  }

  getActionKeyword(action) {
    const keywords = {
      'look': ['看', '看牌'],
      'call': ['跟', '跟注', '看牌'],
      'raise': ['加', '加注', 'raise'],
      'fold': ['弃', '弃牌', 'fold'],
      'compare': ['开', '比', 'compare']
    };
    return keywords[action]?.[0] || action;
  }

  getDefaultAmount(action, suggested = 0) {
    if (action === 'raise') {
      return suggested || 100; // 默认加注 100
    }
    if (action === 'compare') {
      return suggested || 1; // 默认开第一个玩家
    }
    return 0;
  }
}

export default ZJHAdapter;