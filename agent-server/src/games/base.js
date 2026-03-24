/**
 * 游戏适配器基类
 * 所有游戏规则需继承此类
 */
class GameAdapter {
  constructor(name) {
    this.name = name;
  }

  /**
   * 获取游戏名称
   */
  getName() {
    return this.name;
  }

  /**
   * 获取系统提示词 - 告诉 AI 如何玩这个游戏
   */
  getSystemPrompt() {
    throw new Error('子类必须实现 getSystemPrompt()');
  }

  /**
   * 格式化游戏状态供 AI 理解
   */
  formatGameState(state) {
    throw new Error('子类必须实现 formatGameState()');
  }

  /**
   * 解析 AI 的响应为具体动作
   */
  parseAction(response, availableActions) {
    throw new Error('子类必须实现 parseAction()');
  }

  /**
   * 生成决策提示词
   */
  getDecisionPrompt(state, availableActions) {
    return `
当前游戏状态:
${this.formatGameState(state)}

可选动作: ${availableActions.join(', ')}

请分析局势并选择最优动作，同时给出你的思考过程。
请以 JSON 格式返回:
{
  "action": "动作名",
  "amount": 金额(若有),
  "reasoning": "思考过程"
}
`;
  }
}

export default GameAdapter;