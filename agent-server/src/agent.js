/**
 * Agent 玩家核心类
 */
import LLMClient from './llm.js';
import TTSClient from './tts.js';
import GameRegistry from './games/index.js';

class AgentPlayer {
  constructor(config = {}) {
    this.name = config.name || 'Agent';
    this.personality = config.personality || '';
    this.apiKey = config.apiKey;
    this.model = config.model || 'qwen-turbo';

    // 初始化 LLM 客户端
    this.llm = new LLMClient(this.apiKey, this.model);

    // 初始化 TTS（可选）
    this.tts = config.ttsEnabled ? new TTSClient(this.apiKey) : null;

    // 当前游戏会话
    this.currentSession = null;
    this.currentGame = null;
  }

  /**
   * 开始游戏会话
   */
  async startGame(sessionId, gameName) {
    const game = GameRegistry.get(gameName);
    if (!game) {
      throw new Error(`不支持的游戏: ${gameName}`);
    }

    this.currentSession = sessionId;
    this.currentGame = game;

    // 设置系统提示词
    const systemPrompt = game.getSystemPrompt() + '\n\n' + this.personality;
    this.llm.setSystemPrompt(sessionId, systemPrompt);

    console.log(`[${this.name}] 开始游戏: ${gameName}, 会话: ${sessionId}`);

    return {
      success: true,
      message: `${this.name} 准备好了！`
    };
  }

  /**
   * 做出决策
   */
  async makeDecision(gameState, availableActions) {
    if (!this.currentSession || !this.currentGame) {
      throw new Error('未在游戏会话中');
    }

    // 生成决策提示
    const prompt = this.currentGame.getDecisionPrompt(gameState, availableActions);

    // 调用 LLM
    const response = await this.llm.chat(
      this.llm.getHistory(this.currentSession).concat([
        { role: 'user', content: prompt }
      ])
    );

    // 解析动作
    const action = this.currentGame.parseAction(response, availableActions);

    // 记录到历史
    this.llm.addMessage(this.currentSession, 'user', prompt);
    this.llm.addMessage(this.currentSession, 'assistant', response);

    console.log(`[${this.name}] 决策: ${action.action}`, action.reasoning ? `- ${action.reasoning}` : '');

    return action;
  }

  /**
   * 发送聊天消息
   */
  async chat(message) {
    if (!this.currentSession) {
      throw new Error('未在游戏会话中');
    }

    // 简单的闲聊响应
    const chatPrompt = `
玩家对你说: "${message}"

请给出一个简短的、符合你性格的回复（1-2句话）。
`;

    const response = await this.llm.chat(
      this.llm.getHistory(this.currentSession).concat([
        { role: 'user', content: chatPrompt }
      ])
    );

    // 记录到历史
    this.llm.addMessage(this.currentSession, 'user', message);
    this.llm.addMessage(this.currentSession, 'assistant', response);

    return {
      message: response,
      voice: null
    };
  }

  /**
   * 生成语音
   */
  async generateVoice(text) {
    if (!this.tts) {
      return null;
    }

    try {
      const audio = await this.tts.synthesize(text);
      return audio;
    } catch (e) {
      console.error('TTS 生成失败:', e);
      return null;
    }
  }

  /**
   * 结束游戏会话
   */
  endGame(result = {}) {
    if (this.currentSession) {
      const summary = result.winner === this.name
        ? '太棒了，我赢了！'
        : result.folded
          ? '哎，又弃牌了...'
          : '这局运气不太好';

      console.log(`[${this.name}] 游戏结束: ${summary}`);

      // 清理会话
      this.llm.clearHistory(this.currentSession);
      this.currentSession = null;
      this.currentGame = null;
    }
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      name: this.name,
      inGame: !!this.currentSession,
      game: this.currentGame?.getName(),
      model: this.model
    };
  }
}

export default AgentPlayer;