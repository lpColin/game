/**
 * Agent 连接器 - 连接到远程 Agent 服务
 */
class AgentConnector {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.playerId = 0;
    this.pendingCallbacks = new Map();
    this.messageId = 0;
    this.reconnectTimer = null;
  }

  /**
   * 连接到 Agent 服务
   */
  connect(playerId, agentUrl = 'ws://localhost:3001') {
    this.playerId = playerId;
    const url = `${agentUrl}?playerId=${playerId}`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log(`🤖 Agent[${playerId}] 已连接`);
          this.connected = true;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error(`🤖 Agent[${playerId}] 连接错误:`, error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log(`🤖 Agent[${playerId}] 连接关闭`);
          this.connected = false;
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * 处理收到的消息
   */
  handleMessage(data) {
    try {
      const msg = JSON.parse(data);
      const { type, action, reasoning, message, error } = msg;

      if (error) {
        console.error(`🤖 Agent[${this.playerId}] 错误:`, error);
      }

      switch (type) {
        case 'welcome':
        case 'game_started':
        case 'game_ended':
        case 'pong':
          // 简单消息处理
          break;

        case 'action_result':
          this.resolvePending('action', { action, reasoning, amount: msg.amount });
          break;

        case 'chat_reply':
          this.resolvePending('chat', { message });
          break;

        case 'voice_reply':
          this.resolvePending('voice', { audio: msg.audio });
          break;

        case 'error':
          this.rejectPending('action', new Error(msg.message));
          break;
      }
    } catch (e) {
      console.error('解析消息失败:', e);
    }
  }

  /**
   * 发送消息并等待响应
   */
  send(type, data, timeout = 15000) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('未连接到 Agent 服务'));
        return;
      }

      const msgId = ++this.messageId;
      const message = { ...data, type, msgId };

      // 设置超时
      const timer = setTimeout(() => {
        this.pendingCallbacks.delete(msgId);
        reject(new Error('请求超时'));
      }, timeout);

      this.pendingCallbacks.set(msgId, { resolve, reject, timer });

      this.ws.send(JSON.stringify(message));
    });
  }

  /**
   * 处理待处理的回调
   */
  resolvePending(key, data) {
    for (const [msgId, callbacks] of this.pendingCallbacks) {
      clearTimeout(callbacks.timer);
      callbacks.resolve(data);
      this.pendingCallbacks.delete(msgId);
    }
  }

  rejectPending(key, error) {
    for (const [msgId, callbacks] of this.pendingCallbacks) {
      clearTimeout(callbacks.timer);
      callbacks.reject(error);
      this.pendingCallbacks.delete(msgId);
    }
  }

  /**
   * 开始游戏
   */
  async startGame(gameName = 'zjh') {
    return this.send('start_game', { game: gameName });
  }

  /**
   * 请求决策
   */
  async makeDecision(gameState, availableActions) {
    return this.send('action', { gameState, availableActions });
  }

  /**
   * 聊天
   */
  async chat(message) {
    return this.send('chat', { message });
  }

  /**
   * 语音合成
   */
  async generateVoice(text) {
    return this.send('voice', { text });
  }

  /**
   * 结束游戏
   */
  async endGame(result = {}) {
    return this.send('end_game', { result });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  /**
   * 检查是否连接
   */
  isConnected() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// 全局 Agent 管理器
window.AgentManager = {
  connectors: {},

  /**
   * 初始化 Agent 连接
   */
  async init(playerIds) {
    for (const playerId of playerIds) {
      if (!this.connectors[playerId]) {
        this.connectors[playerId] = new AgentConnector();
      }
      const connector = this.connectors[playerId];
      if (!connector.isConnected()) {
        try {
          await connector.connect(playerId);
          await connector.startGame('zjh');
        } catch (e) {
          console.error(`🤖 Agent[${playerId}] 连接失败:`, e);
        }
      }
    }
  },

  /**
   * 获取指定玩家的决策
   */
  async getDecision(playerId, gameState, availableActions) {
    const connector = this.connectors[playerId];
    if (connector && connector.isConnected()) {
      return connector.makeDecision(gameState, availableActions);
    }
    throw new Error(`Agent[${playerId}] 未连接`);
  },

  /**
   * 获取聊天回复
   */
  async getChatReply(playerId, message) {
    const connector = this.connectors[playerId];
    if (connector && connector.isConnected()) {
      return connector.chat(message);
    }
    throw new Error(`Agent[${playerId}] 未连接`);
  },

  /**
   * 获取所有已连接的 Agent
   */
  getConnectedAgents() {
    return Object.keys(this.connectors).filter(
      id => this.connectors[id]?.isConnected()
    );
  }
};