/**
 * 测试客户端 - 用于测试 Agent 服务
 */
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('✅ 已连接到 Agent 服务');

  // 测试 1: 开始游戏
  startGame();
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('📥 收到:', msg.type);

  switch (msg.type) {
    case 'welcome':
      console.log(`   欢迎! Session: ${msg.sessionId}, Agent: ${msg.agentName}`);
      break;

    case 'game_started':
      console.log(`   游戏开始: ${msg.game}`);
      // 测试 2: 请求决策
      setTimeout(() => requestAction(), 500);
      break;

    case 'action_result':
      console.log(`   动作: ${msg.action}`, msg.amount ? msg.amount : '');
      console.log(`   思考: ${msg.reasoning}`);
      // 测试 3: 聊天
      setTimeout(() => sendChat(), 500);
      break;

    case 'chat_reply':
      console.log(`   回复: ${msg.message}`);
      // 测试 4: 结束游戏
      setTimeout(() => endGame(), 1000);
      break;

    case 'game_ended':
      console.log('   游戏已结束');
      setTimeout(() => ws.close(), 500);
      break;

    case 'error':
      console.error('   错误:', msg.message);
      break;
  }
});

ws.on('close', () => {
  console.log('❌ 连接已关闭');
});

ws.on('error', (err) => {
  console.error('❌ 连接失败:', err.message);
});

function startGame() {
  ws.send(JSON.stringify({
    type: 'start_game',
    game: 'zjh'
  }));
}

function requestAction() {
  ws.send(JSON.stringify({
    type: 'action',
    gameState: {
      pot: 200,
      currentBet: 100,
      roundCount: 1,
      playerCount: 4,
      players: [
        { isAI: false, bet: 100, folded: false, looked: true },
        { isAI: true, bet: 100, folded: false, looked: false },
        { isAI: true, bet: 0, folded: true, looked: false },
        { isAI: true, bet: 100, folded: false, looked: false }
      ],
      recentActions: [
        { player: 1, action: 'look' },
        { player: 2, action: 'call', amount: 100 }
      ]
    },
    availableActions: ['look', 'call', 'raise', 'fold']
  }));
}

function sendChat() {
  ws.send(JSON.stringify({
    type: 'chat',
    message: '今天手气怎么样？'
  }));
}

function endGame() {
  ws.send(JSON.stringify({
    type: 'end_game',
    result: { winner: 'player', reason: 'all_fold' }
  }));
}