# 游戏人物Agent系统实现计划

## 背景与目标

用户希望建立一个游戏人物Agent系统，能够进行棋牌游戏陪玩和交流互动。

**需求概述：**
- 支持多种棋牌游戏（棋类：象棋、围棋；牌类：斗地主、麻将、炸金花）
- 使用Claude API驱动游戏人物的对话和决策
- 支持文字和语音两种交互方式
- 运行在Web网页上
- 支持自定义游戏人物的性格和背景故事

## 技术栈

### 前端
- React 18 + TypeScript
- Vite (构建工具)
- Socket.io-client (实时通信)
- Tailwind CSS (样式)
- Zustand (状态管理)
- Three.js/Pixi.js (游戏渲染)
- Web Speech API (语音识别/合成)

### 后端
- Node.js 20.x + NestJS
- Socket.io (实时通信)
- @anthropic-ai/sdk (Claude API)
- Redis (缓存/状态)
- PostgreSQL (用户数据)
- MongoDB (角色配置)

## 核心模块

### 1. 游戏引擎模块 (`/backend/src/game-engine/`)
- 定义游戏引擎接口 `IGameEngine`
- 实现象棋、围棋、斗地主、麻将、炸金花引擎
- 状态管理、回合管理、胜负判定

### 2. Agent核心模块 (`/backend/src/agent/`)
- Claude API客户端封装
- Prompt模板管理
- 对话上下文维护
- 游戏动作解析

### 3. 角色管理模块 (`/backend/src/character/`)
- 角色配置数据结构
- 预设角色管理
- 自定义角色CRUD

### 4. 前端交互模块 (`/frontend/src/`)
- 聊天框组件
- 游戏棋盘渲染
- 语音输入/输出
- WebSocket通信

## 实施步骤

### 第一阶段：基础架构
1. 初始化前后端项目结构
2. 配置开发环境和依赖
3. 搭建后端基础框架（NestJS）

### 第二阶段：核心模块
4. 实现Claude API客户端
5. 实现游戏引擎基类和接口
6. 实现角色配置系统

### 第三阶段：前端开发
7. 开发聊天界面组件
8. 开发游戏棋盘组件
9. 集成语音识别/合成
10. 实现WebSocket通信

### 第四阶段：整合测试
11. 前后端联调
12. 端到端测试
13. 性能优化

## 关键文件

- `/backend/src/agent/claude-client.ts` - Claude API集成
- `/backend/src/game-engine/base.game-engine.ts` - 游戏引擎基类
- `/backend/src/character/character.service.ts` - 角色管理
- `/frontend/src/stores/game.store.ts` - 游戏状态管理
- `/frontend/src/components/ChatBox/ChatBox.tsx` - 聊天组件

## 验证方案

1. **功能测试**：创建游戏、与AI角色对弈、发送消息、语音对话
2. **游戏逻辑**：验证各棋牌游戏的规则正确性
3. **对话测试**：验证AI角色性格一致性、反应适当性