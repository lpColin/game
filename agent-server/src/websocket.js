/**
 * WebSocket 服务 - 支持多个 Agent 实例
 */
import { WebSocketServer } from 'ws';
import AgentPlayer from './agent.js';

class AgentServer {
  constructor(port, config) {
    this.port = port;
    this.config = config;
    this.wss = null;
    this.clients = new Map(); // ws -> { sessionId, agent, playerId }
    this.sessionCounter = 0;
    this.agentPool = this.createAgentPool();
  }

  createAgentPool() {
    // 创建 3 个不同性格的 Agent
    return [
      new AgentPlayer({
        name: '乔治',
        personality: '你是一个冷静理性的扑克玩家，善于分析和计算概率。你说话简洁专业，喜欢分析局势。',
        apiKey: this.config.apiKey,
        model: this.config.model,
        ttsEnabled: this.config.ttsEnabled
      }),
      new AgentPlayer({
        name: '佩奇',
        personality: '你是一个激进大胆的扑克玩家，喜欢诈Bluff和心理战。你说话幽默自信，有时会挑衅对手。',
        apiKey: this.config.apiKey,
        model: this.config.model,
        ttsEnabled: this.config.ttsEnabled
      }),
      new AgentPlayer({
        name: '多多',
        personality: '你是一个稳健谨慎的扑克玩家，风险控制严格。你说话温和保守，不轻易冒险。',
        apiKey: this.config.apiKey,
        model: this.config.model,
        ttsEnabled: this.config.ttsEnabled
      })
    ];
  }

  getAgent(playerId) {
    // 根据 playerId 分配 Agent（0=乔治,1=佩奇,2=多多）
    const index = playerId % this.agentPool.length;
    return this.agentPool[index];
  }

  start() {
    this.wss = new WebSocketServer({ port: this.port });

    console.log(`🤖 Agent 服务已启动，端口: ${this.port}`);
    console.log(`👥 Agent 池: ${this.agentPool.map(a => a.name).join(', ')}`);

    this.wss.on('connection', (ws) => this.handleConnection(ws));

    this.wss.on('error', (err) => {
      console.error('WebSocket 错误:', err);
    });
  }

  handleConnection(ws) {
    const sessionId = `session_${++this.sessionCounter}`;

    // 从查询参数获取 playerId
    const url = ws.upgradeReq?.url || '';
    const params = new URLSearchParams(url.split('?')[1] || '');
    const playerId = parseInt(params.get('playerId')) || 0;

    const agent = this.getAgent(playerId);

    this.clients.set(ws, { sessionId, agent, playerId });

    console.log(`[${sessionId}] 新连接: playerId=${playerId}, agent=${agent.name}`);

    ws.on('message', (data) => this.handleMessage(ws, data));

    ws.on('close', () => this.handleClose(ws));

    ws.on('error', (err) => {
      console.error(`[${sessionId}] 错误:`, err.message);
    });

    // 发送欢迎消息
    this.send(ws, {
      type: 'welcome',
      sessionId,
      agentName: agent.name,
      playerId
    });
  }

  async handleMessage(ws, data) {
    const client = this.clients.get(ws);
    if (!client) return;

    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      this.send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    const { sessionId, agent, playerId } = client;

    try {
      switch (msg.type) {
        case 'start_game':
          await this.handleStartGame(ws, agent, msg);
          break;

        case 'action':
          await this.handleAction(ws, agent, msg);
          break;

        case 'chat':
          await this.handleChat(ws, agent, msg);
          break;

        case 'voice':
          await this.handleVoice(ws, agent, msg);
          break;

        case 'end_game':
          agent.endGame(msg.result || {});
          this.send(ws, { type: 'game_ended' });
          break;

        case 'ping':
          this.send(ws, { type: 'pong' });
          break;

        default:
          this.send(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
      }
    } catch (e) {
      console.error(`[${sessionId}] 处理消息失败:`, e);
      this.send(ws, { type: 'error', message: e.message });
    }
  }

  async handleStartGame(ws, agent, msg) {
    const client = this.clients.get(ws);
    const { game, options } = msg;

    // 使用 sessionId + playerId 作为唯一会话标识
    const gameSessionId = `${client.sessionId}_player${client.playerId}`;
    await agent.startGame(gameSessionId, game);

    this.send(ws, {
      type: 'game_started',
      game,
      agentName: agent.name,
      playerId: client.playerId
    });
  }

  async handleAction(ws, agent, msg) {
    const client = this.clients.get(ws);
    const { playerIndex, gameState, availableActions } = msg;

    // 根据 playerIndex 分配不同的 Agent
    // 玩家 1 -> 乔治, 玩家 2 -> 佩奇, 玩家 3 -> 多多
    const gameAgent = this.getAgent(playerIndex || 1);

    const gameSessionId = `${client.sessionId}_player${playerIndex}`;

    // 设置当前会话
    if (!gameAgent.currentSession) {
      gameAgent.currentSession = gameSessionId;
    }

    const action = await gameAgent.makeDecision(gameState, availableActions);

    this.send(ws, {
      type: 'action_result',
      action: action.action,
      amount: action.amount,
      reasoning: action.reasoning,
      playerIndex,
      agentName: gameAgent.name
    });
  }

  async handleChat(ws, agent, msg) {
    const client = this.clients.get(ws);
    const { message } = msg;
    const reply = await agent.chat(message);

    this.send(ws, {
      type: 'chat_reply',
      message: reply.message,
      agent: agent.name,
      playerId: client.playerId
    });
  }

  async handleVoice(ws, agent, msg) {
    const { text } = msg;
    const audio = await agent.generateVoice(text);

    this.send(ws, {
      type: 'voice_reply',
      audio: audio ? audio.toString('base64') : null
    });
  }

  handleClose(ws) {
    const client = this.clients.get(ws);
    if (client) {
      client.agent.endGame();
      console.log(`[${client.sessionId}] 连接关闭`);
      this.clients.delete(ws);
    }
  }

  send(ws, data) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(data));
    }
  }

  stop() {
    if (this.wss) {
      this.wss.close();
      console.log('Agent 服务已停止');
    }
  }
}

export default AgentServer;