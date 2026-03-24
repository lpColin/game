/**
 * LLM 调用封装 - 阿里云千问系列 (Anthropic 协议)
 */
import axios from 'axios';

const DASHSCOPE_API = 'https://coding.dashscope.aliyuncs.com/v1';

class LLMClient {
  constructor(apiKey, model = 'qwen-turbo') {
    this.apiKey = apiKey;
    this.model = model;
    this.conversations = new Map(); // sessionId -> messages
  }

  /**
   * 调用千问 API
   */
  async chat(messages, options = {}) {
    const { temperature = 0.7, maxTokens = 500 } = options;

    try {
      const response = await axios.post(
        `${DASHSCOPE_API}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature,
          max_tokens: maxTokens
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('LLM 调用失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 流式调用
   */
  async *chatStream(messages, options = {}) {
    const { temperature = 0.7 } = options;

    try {
      const response = await axios.post(
        `${DASHSCOPE_API}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature,
          stream: true
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream'
        }
      );

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n').filter(line => line.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) yield content;
        }
      }
    } catch (error) {
      console.error('LLM 流式调用失败:', error.message);
      throw error;
    }
  }

  /**
   * 添加对话历史
   */
  addMessage(sessionId, role, content) {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, []);
    }
    this.conversations.get(sessionId).push({ role, content });
  }

  /**
   * 获取对话历史
   */
  getHistory(sessionId) {
    return this.conversations.get(sessionId) || [];
  }

  /**
   * 清除对话历史
   */
  clearHistory(sessionId) {
    this.conversations.delete(sessionId);
  }

  /**
   * 设置系统提示词
   */
  setSystemPrompt(sessionId, systemPrompt) {
    const history = this.conversations.get(sessionId) || [];
    // 移除旧的 system 消息
    const filtered = history.filter(m => m.role !== 'system');
    // 添加新的 system 消息
    filtered.unshift({ role: 'system', content: systemPrompt });
    this.conversations.set(sessionId, filtered);
  }
}

export default LLMClient;