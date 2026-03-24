import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { config as appConfig } from '../config/config';

// 消息类型
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Agent配置
export interface AgentConfig {
  characterId: string;
  characterName: string;
  personality: {
    traits: string[];
    speakingStyle: string;
    emotionalRange: number;
    verbosity: 'brief' | 'normal' | 'verbose';
  };
  background: string;
  languageStyle: string;
  claudeModel?: string;
}

// Agent响应
export interface AgentResponse {
  message: string;
  suggestedAction?: {
    gameType: string;
    action: string;
  };
  emotions?: string;
}

// 系统Prompt模板
const SYSTEM_PROMPT_TEMPLATE = `你是{{characterName}}，{{background}}。

## 性格特点
{{personalityTraits}}

## 说话风格
{{speakingStyle}}

## 当前游戏状态
{{gameStateDescription}}

## 游戏规则
{{gameRules}}

## 对话要求
1. 根据你的性格特点做出反应
2. 保持角色一致性
3. 在合适的时机讨论游戏策略
4. 可以适当表达情绪，但要符合性格设定
5. 回复要{{verbosity}}不要过于冗长
6. 如果你建议执行游戏动作，请在回复中用括号标注，例如：(建议出牌: 梅花5)

请用{{languageStyle}}回复用户。`;

// 游戏规则描述
const GAME_RULES: Record<string, string> = {
  chineseChess: `
中国象棋规则：
- 棋盘9x10格，黑红双方各16子
- 帅(将)在九宫内活动，士在九宫内斜走
- 象(相)田字斜走，不能过河
- 车直走任意步，炮隔子吃子
- 马走日字，蹩马腿
- 兵(卒)过河前直进，过河后可横走，退则同过河前
- 吃掉对方帅(将)获胜
`,
  go: `
围棋规则：
- 19x19棋盘，黑白轮流落子
- 棋子上下左右相连形成棋串
- 没有气(无相邻空位)的棋子被提掉
- 禁着点：禁止无气着法
- 终局：双方停一手或棋盘下满
- 占地多者获胜
`,
  doudizhu: `
斗地主规则：
- 54张牌，双鬼带所有
- 叫地主确定身份
- 农民联手对抗地主
- 出牌规则：单张、对子、三张、顺子、连对、炸弹、王炸
- 首家出牌后，其他玩家必须出比上家大的牌或不要
- 牌出完获胜
`,
  mahjong: `
麻将规则：
- 136张牌：万条筒字(各9*4) + 风牌(4*4) + 箭牌(3*4)
- 144张牌：再加花牌8张
- 轮庄打法，庄家胡牌继续
- 吃碰杠后胡牌
- 番数计算
`,
  zhaJinHua: `
炸金花规则：
- 使用52张牌(去掉大小王)
- 三张牌比大小
- 豹子 > 顺子 > 对子 > 单张
- 相同牌型比最大单张
- 可以看牌、加注、跟注、开牌
- 最后开牌者获胜
`,
};

@Injectable()
export class AgentService {
  private anthropic: Anthropic;

  constructor() {
    const options: ConstructorParameters<typeof Anthropic>[0] = {
      apiKey: appConfig.claudeApiKey,
    };

    // 如果配置了自定义API地址（如阿里云），则使用
    if (appConfig.claudeApiUrl) {
      options.baseURL = appConfig.claudeApiUrl;
    }

    this.anthropic = new Anthropic(options);
  }

  /**
   * 生成回复
   */
  async generateResponse(
    config: AgentConfig,
    messages: ChatMessage[],
    gameState: {
      gameType: string;
      state: string;
      currentPlayer: string;
    },
  ): Promise<AgentResponse> {
    const systemPrompt = this.buildPrompt(config, gameState);

    const conversationMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      const model = config.claudeModel || appConfig.claudeModel;
      const response = await this.anthropic.messages.create({
        model: model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: conversationMessages,
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return this.parseResponse(content.text);
      }

      return { message: '抱歉，我暂时无法回应。' };
    } catch (error) {
      console.error('Claude API Error:', error);
      return { message: '抱歉，AI服务暂时不可用。' };
    }
  }

  /**
   * 构建Prompt
   */
  private buildPrompt(
    agentConfig: AgentConfig,
    gameState: { gameType: string; state: string; currentPlayer: string },
  ): string {
    let verbosity = '简洁';
    if (agentConfig.personality.verbosity === 'verbose') {
      verbosity = '详细';
    } else if (agentConfig.personality.verbosity === 'brief') {
      verbosity = '非常简洁';
    }

    return SYSTEM_PROMPT_TEMPLATE
      .replace(/{{characterName}}/g, agentConfig.characterName)
      .replace(/{{background}}/g, agentConfig.background)
      .replace(
        /{{personalityTraits}}/g,
        agentConfig.personality.traits.join('、'),
      )
      .replace(/{{speakingStyle}}/g, agentConfig.personality.speakingStyle)
      .replace(
        /{{gameStateDescription}}/g,
        this.describeGameState(gameState),
      )
      .replace(
        /{{gameRules}}/g,
        GAME_RULES[gameState.gameType] || '无特定规则',
      )
      .replace(/{{verbosity}}/g, verbosity)
      .replace(/{{languageStyle}}/g, agentConfig.languageStyle);
  }

  /**
   * 描述游戏状态
   */
  private describeGameState(gameState: {
    gameType: string;
    state: string;
    currentPlayer: string;
  }): string {
    return `
游戏类型: ${gameState.gameType}
当前玩家: ${gameState.currentPlayer}
游戏状态: ${gameState.state || '进行中'}
`;
  }

  /**
   * 解析响应，提取游戏动作
   */
  private parseResponse(text: string): AgentResponse {
    // 尝试提取建议动作
    const actionMatch = text.match(/\(建议([^)]+):([^)]+)\)/);

    if (actionMatch) {
      return {
        message: text.replace(/\(建议[^)]+:[^)]+\)/, '').trim(),
        suggestedAction: {
          gameType: actionMatch[1].trim(),
          action: actionMatch[2].trim(),
        },
      };
    }

    return { message: text };
  }

  /**
   * 检查API是否可用
   */
  async checkHealth(): Promise<boolean> {
    if (!appConfig.claudeApiKey) {
      console.warn('CLAUDE_API_KEY not set');
      return false;
    }
    return true;
  }
}