import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AgentService } from '../agent/agent.service';
import { GameEngineService } from '../game-engine/game-engine.service';
import { CharacterService } from '../character/character.service';
import { GameType, GameAction } from '../game-engine/types';

interface GameSession {
  sessionId: string;
  gameId: string;
  gameType: GameType;
  playerId: string;
  characterId: string;
  messages: { role: 'user' | 'assistant'; content: string; timestamp: number }[];
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private sessions: Map<string, GameSession> = new Map();
  private socketToSession: Map<string, string> = new Map();

  constructor(
    private agentService: AgentService,
    private gameEngineService: GameEngineService,
    private characterService: CharacterService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const sessionId = this.socketToSession.get(client.id);
    if (sessionId) {
      this.sessions.delete(sessionId);
      this.socketToSession.delete(client.id);
    }
  }

  /**
   * 创建游戏
   */
  @SubscribeMessage('createGame')
  handleCreateGame(
    @MessageBody() data: { gameType: GameType; playerName: string; characterId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const sessionId = `session_${Date.now()}`;

    // 创建游戏
    const playerId = `player_${Date.now()}`;
    const gameId = this.gameEngineService.createGame(data.gameType, [
      { id: playerId, name: data.playerName, isAI: false },
      // 添加AI对手
      { id: 'ai_player', name: 'AI 对手', isAI: true },
    ]);

    // 创建会话
    const session: GameSession = {
      sessionId,
      gameId,
      gameType: data.gameType,
      playerId,
      characterId: data.characterId,
      messages: [],
    };

    this.sessions.set(sessionId, session);
    this.socketToSession.set(client.id, sessionId);

    // 返回游戏状态
    const gameState = this.gameEngineService.serializeGame(gameId);
    const stateDescription = this.gameEngineService.getStateDescription(gameId);

    client.join(sessionId);

    return {
      sessionId,
      gameId,
      gameType: data.gameType,
      gameState: JSON.parse(gameState),
      stateDescription,
    };
  }

  /**
   * 发送消息
   */
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { sessionId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(data.sessionId);
    if (!session) {
      return { error: '会话不存在' };
    }

    // 添加用户消息
    session.messages.push({
      role: 'user',
      content: data.content,
      timestamp: Date.now(),
    });

    // 获取角色配置
    const agentConfig = this.characterService.getAgentConfig(session.characterId);
    if (!agentConfig) {
      return { error: '角色不存在' };
    }

    // 调用AI生成回复
    const gameState = this.gameEngineService.getStateDescription(session.gameId);
    const response = await this.agentService.generateResponse(
      {
        ...agentConfig,
        personality: agentConfig.personality,
        claudeModel: 'claude-3-5-sonnet-20241022',
      },
      session.messages,
      {
        gameType: session.gameType,
        state: gameState,
        currentPlayer: session.playerId,
      },
    );

    // 添加AI回复
    session.messages.push({
      role: 'assistant',
      content: response.message,
      timestamp: Date.now(),
    });

    // 广播消息
    this.server.to(data.sessionId).emit('newMessage', {
      role: 'assistant',
      content: response.message,
      timestamp: Date.now(),
    });

    // 如果AI建议了动作，执行它
    if (response.suggestedAction) {
      const aiAction: GameAction = {
        type: 'PLAY_CARDS',
        playerId: 'ai_player',
        data: { action: response.suggestedAction.action },
      };
      const result = this.gameEngineService.executeAction(session.gameId, aiAction);

      if (result.success) {
        this.server.to(data.sessionId).emit('gameStateChanged', {
          state: JSON.parse(result.state as string || '{}'),
        });
      }
    }

    return { success: true, message: response.message };
  }

  /**
   * 执行游戏动作
   */
  @SubscribeMessage('makeMove')
  handleMakeMove(
    @MessageBody() data: { sessionId: string; action: GameAction },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(data.sessionId);
    if (!session) {
      return { error: '会话不存在' };
    }

    const result = this.gameEngineService.executeAction(session.gameId, data.action);

    if (result.success) {
      // 广播游戏状态
      this.server.to(data.sessionId).emit('gameStateChanged', {
        state: JSON.parse(result.state as string || '{}'),
      });

      // 检查游戏是否结束
      const endResult = this.gameEngineService.checkGameEnd(session.gameId);
      if (endResult) {
        this.server.to(data.sessionId).emit('gameEnded', endResult);
      }

      // AI响应
      this.handleAIMove(session, client);
    }

    return result;
  }

  /**
   * AI自动响应
   */
  private async handleAIMove(session: GameSession, client: Socket) {
    // 获取AI的合法动作
    const legalActions = this.gameEngineService.getLegalActions(session.gameId, 'ai_player');

    if (legalActions.length > 0) {
      // 简单策略：随机选择一个动作
      const randomAction = legalActions[Math.floor(Math.random() * legalActions.length)];
      const result = this.gameEngineService.executeAction(session.gameId, randomAction);

      if (result.success) {
        this.server.to(session.sessionId).emit('gameStateChanged', {
          state: JSON.parse(result.state as string || '{}'),
        });

        const endResult = this.gameEngineService.checkGameEnd(session.gameId);
        if (endResult) {
          this.server.to(session.sessionId).emit('gameEnded', endResult);
        }
      }
    }
  }

  /**
   * 获取角色列表
   */
  @SubscribeMessage('getCharacters')
  handleGetCharacters() {
    return this.characterService.getAllCharacters();
  }

  /**
   * 获取游戏列表
   */
  @SubscribeMessage('getGames')
  handleGetGames() {
    return this.gameEngineService.getSupportedGames();
  }

  /**
   * 获取游戏状态
   */
  @SubscribeMessage('getGameState')
  handleGetGameState(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(data.sessionId);
    if (!session) {
      return { error: '会话不存在' };
    }

    const gameState = this.gameEngineService.serializeGame(session.gameId);
    const stateDescription = this.gameEngineService.getStateDescription(session.gameId);

    return {
      state: JSON.parse(gameState),
      description: stateDescription,
    };
  }
}