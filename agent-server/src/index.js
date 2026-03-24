/**
 * Agent 陪玩服务入口
 */
import dotenv from 'dotenv';
import AgentServer from './websocket.js';

dotenv.config();

const config = {
  name: process.env.AGENT_NAME || 'Agent',
  personality: process.env.AGENT_PERSONALITY || '',
  apiKey: process.env.DASHSCOPE_API_KEY,
  model: process.env.LLM_MODEL || 'qwen-turbo',
  ttsEnabled: process.env.TTS_ENABLED === 'true',
  port: parseInt(process.env.PORT || '3001')
};

// 验证配置
if (!config.apiKey) {
  console.error('❌ 请在 .env 文件中配置 DASHSCOPE_API_KEY');
  console.log('   获取 API Key: https://dashscope.console.aliyun.com/');
  process.exit(1);
}

// 启动服务
const server = new AgentServer(config.port, config);
server.start();

console.log(`
╔══════════════════════════════════════╗
║     🤖 Agent 陪玩服务                 ║
╠══════════════════════════════════════╣
║  玩家名: ${config.name.padEnd(24)}║
║  模型:   ${config.model.padEnd(24)}║
║  端口:   ${config.port.toString().padEnd(24)}║
╚══════════════════════════════════════╝

连接地址: ws://localhost:${config.port}

消息协议:
- start_game: 开始游戏
- action: 请求决策
- chat: 聊天
- voice: 语音合成
`);

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在关闭...');
  server.stop();
  process.exit(0);
});