/**
 * 斗地主游戏适配器
 */
import GameAdapter from './base.js';

class DoudizhuAdapter extends GameAdapter {
  constructor() {
    super('doudizhu');
  }

  getSystemPrompt() {
    return `你是一个斗地主游戏的AI玩家。你的目标是赢得游戏。

游戏规则:
- 3名玩家: 1个地主 vs 2个农民
- 地主要独自对抗两个农民
- 每人17张牌，地主额外获得3张底牌
- 先出完牌的一方获胜

牌型规则:
- 单张: 任意一张牌
- 对子: 两张相同点数的牌
- 三张: 三张相同点数的牌
- 三带一: 三张相同点数 + 一张单牌
- 顺子: 5张或以上连续点数的牌(如3-4-5-6-7)，不能包含2和王
- 炸弹: 四张相同点数的牌，可以炸任何牌型
- 王炸: 大王+小王，最大的牌型

牌的大小: 3<4<5<6<7<8<9<10<J<Q<K<A<2<小王<大王

出牌规则:
- 首家可以出任意合法牌型
- 后续玩家必须出相同牌型且更大的牌，或者选择"不出"
- 炸弹和王炸可以炸任何牌型

叫地主规则:
- 可以选择"叫地主"或"不叫"
- 叫地主后获得3张底牌，成为地主

策略建议:
- 作为农民，要配合队友对抗地主
- 作为地主，要合理利用炸弹控制局面
- 保留大牌在关键时刻使用
- 注意记牌，推测对手的牌

请用中文回复，保持活泼有趣的语气。`;
  }

  formatGameState(state) {
    const phaseNames = {
      'dealing': '发牌中',
      'calling': '叫地主阶段',
      'playing': '出牌阶段',
      'game_over': '游戏结束'
    };

    let desc = `【游戏阶段】${phaseNames[state.phase] || state.phase}\n`;

    if (state.landlord !== null) {
      const landlordName = state.players.find(p => p.id === state.landlord)?.name || '未知';
      desc += `【地主】${landlordName} (玩家${state.landlord})\n`;
      desc += `【当前倍数】${state.multiplier}x\n`;
    }

    // 玩家信息
    desc += `\n【玩家状态】\n`;
    state.players.forEach(p => {
      const role = p.id === state.landlord ? '地主' : '农民';
      const isCurrentPlayer = p.id === state.currentPlayer ? '👈 当前玩家' : '';
      desc += `  玩家${p.id}(${p.name}): ${role}, 剩余${p.cardCount}张牌 ${isCurrentPlayer}\n`;
    });

    // 上家出牌
    if (state.lastCards && state.lastCards.length > 0) {
      const lastName = state.players.find(p => p.id === state.lastPlayer)?.name || '未知';
      desc += `\n【上家出牌】${lastName}: ${state.lastCards.join(' ')} (${state.lastType})\n`;
    }

    return desc;
  }

  parseAction(response, availableActions) {
    // 尝试解析 JSON 响应
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (availableActions.includes(parsed.action)) {
          return {
            action: parsed.action,
            cards: parsed.cards || [],
            reasoning: parsed.reasoning || ''
          };
        }
      }
    } catch (e) {
      // JSON 解析失败，尝试文本解析
    }

    // 文本解析
    const lowerResponse = response.toLowerCase();

    // 叫地主阶段
    if (availableActions.includes('call') && (lowerResponse.includes('叫地主') || lowerResponse.includes('叫'))) {
      return { action: 'call', reasoning: '我要当地主！' };
    }
    if (availableActions.includes('no_call') && (lowerResponse.includes('不叫') || lowerResponse.includes('pass'))) {
      return { action: 'no_call', reasoning: '这把牌不怎么样，不叫了。' };
    }

    // 出牌阶段
    if (availableActions.includes('play') && (lowerResponse.includes('出牌') || lowerResponse.includes('出'))) {
      return { action: 'play', reasoning: '出牌！' };
    }
    if (availableActions.includes('pass') && (lowerResponse.includes('不出') || lowerResponse.includes('pass') || lowerResponse.includes('不要'))) {
      return { action: 'pass', reasoning: '这轮不要。' };
    }

    // 默认选择第一个可用动作
    return {
      action: availableActions[0],
      reasoning: '随机选择'
    };
  }

  getDecisionPrompt(state, availableActions) {
    const phaseDesc = state.phase === 'calling'
      ? '你需要决定是否叫地主。'
      : '你需要决定出什么牌或者选择不出。';

    return `
${this.formatGameState(state)}

${phaseDesc}

可选动作: ${availableActions.join(', ')}

请分析局势并做出决策。以 JSON 格式返回:
{
  "action": "动作名 (call/no_call/play/pass)",
  "cards": ["牌1", "牌2"] (如果选择出牌，填写要出的牌的ID),
  "reasoning": "你的思考过程"
}
`;
  }
}

export default DoudizhuAdapter;