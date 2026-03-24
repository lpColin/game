# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

炸金花 (Zha Jin Hua) - 一款中文扑克牌游戏 Web 版，支持 2-6 人对战，包含真人玩家和 AI 对手。

## 启动方式

```bash
# 启动 Node.js 服务器
node server.js

# 访问地址
http://localhost:3000
```

## 文件结构

### 核心文件
- `index.html` - 主页面 (单页面布局)
- `server.js` - Node.js 静态文件服务器 (端口 3000)
- `zhajinhua.md` - 游戏规则文档

### JavaScript 模块 (js/)
- `game.js` - 游戏核心逻辑 (发牌、牌型判断、玩家行动、轮次控制)
- `ui.js` - UI 交互 (玩家布局、按钮状态、开牌弹窗)
- `ai.js` - AI 决策逻辑 (乔治 - 算牌型, 佩奇 - 激进型, 多多 - 保守型)
- `audio.js` - 音效系统 (Web Audio API 生成音效)
- `effects.js` - 视觉特效 (金币雨、胜利动画、震动效果)

### 样式 (css/)
- `style.css` - 主样式 (扇形玩家布局、响应式设计、赌场主题)

## 架构要点

### 游戏状态管理
```javascript
gameState = {
    deck: [],           // 牌组
    players: [],        // 玩家数组 (真人在索引 0)
    pot: 0,             // 底池
    currentBet: 0,      // 当前下注额
    roundCount: 0,      // 轮数
    maxRounds: 10,      // 最大轮数限制
    currentPlayerIndex: 0  // 当前玩家索引
}
```

### 牌型等级 (从大到小)
1. 豹子 (三张相同)
2. 同花顺
3. 同花
4. 顺子
5. 对子
6. 散牌

特殊规则：235 不同花色可以赢豹子

### AI 类型
- **乔治 (george)** - 算牌型，冷静分析，概率导向
- **佩奇 (peiqi)** - 激进型，爱诈唬，施压加注
- **多多 (duoduo)** - 保守型，谨慎跟注，风险规避

### 玩家布局
采用扇形椭圆定位，真人固定在底部 (270°)，AI 玩家沿弧线分布：
- 2 人：上下
- 3 人：左下右
- 4 人：左下上右
- 5-6 人：顶部扇形均匀分布

## 关键函数

```javascript
// 游戏流程
initGame(playerCount)      // 初始化
startNewRound()            // 开始新局
playerAction(action, amt)  // 玩家行动 (look/call/raise/fold)
nextPlayer()               // 切换到下一玩家
endGame(winner)            // 结束游戏

// 牌型判断
evaluateHand(cards)        // 判断牌型返回 {type, name, value}
compareHands(h1, h2)       // 比较两手牌

// UI 更新
updateGameDisplay()        // 更新所有显示
updatePlayerDisplay(p)     // 更新单个玩家
updateButtonState()        // 更新按钮状态
```

## 特殊功能

### 开牌系统
玩家支付双倍注额可与指定 AI 比牌，被开牌 AI 展示手牌，输者弃牌。

### 聊天系统
- AI 随机发送对话气泡 (头像上方)
- 玩家可输入消息，AI 会回复
- 聊天区域独立显示完整记录

### 倒计时
人类玩家回合有 20 秒倒计时，超时自动跟注。
