// AI 策略 v2.0 - 支持多种 AI 类型

// 乔治 - Agent智能型（冷静分析，概率导向，会读对手）
class GeorgeAI {
    static makeDecision(player, gameState) {
        const hand = evaluateHand(player.cards);
        const potOdds = gameState.pot / (gameState.currentBet || 10);
        
        // Agent特性：分析其他玩家行为
        const activePlayers = gameState.players.filter(p => !p.hasFolded && p.id !== player.id);
        const lookedCount = activePlayers.filter(p => p.hasLooked).length;
        const avgChips = activePlayers.reduce((sum, p) => sum + p.chips, 0) / activePlayers.length;
        const isChipLeader = player.chips > avgChips * 1.2;
        
        // Agent日志
        console.log(`🐎 乔治(Agent) 思考中... 手牌: ${hand.name}, 底池: ${gameState.pot}, 赔率: ${potOdds.toFixed(2)}`);
        
        // 如果没看牌，根据概率和对手行为决定是否看牌
        if (!player.hasLooked) {
            // Agent策略：如果底池大且没人看牌，30%概率蒙牌偷鸡
            if (gameState.pot > 50 && lookedCount === 0 && Math.random() < 0.3) {
                console.log('🐎 乔治: 底池诱人，蒙牌偷鸡！');
                return { action: 'call' };
            }
            // 正常看牌
            return { action: 'look' };
        }
        
        // Agent读牌：根据已看牌玩家数量调整策略
        const bluffChance = lookedCount === 0 ? 0.4 : 0.2; // 没人看牌时诈唬概率更高
        
        // 已看牌后的决策
        switch (hand.type) {
            case HAND_TYPES.BAO_ZI:
                // 豹子：Agent会慢打或猛打，取决于对手
                if (lookedCount > 0 && Math.random() < 0.3) {
                    console.log('🐎 乔治: 豹子慢打，诱敌深入');
                    return { action: 'call' }; // 30%概率慢打
                }
                console.log('🐎 乔治: 豹子！ALL IN！');
                return { action: 'raise', amount: Math.min(player.chips, 100) };
                
            case HAND_TYPES.TONG_HUA_SHUN:
            case HAND_TYPES.TONG_HUA:
                // 同花顺、同花：积极加注
                console.log(`🐎 乔治: ${hand.name}，大力加注`);
                return { action: 'raise', amount: Math.min(player.chips, 50) };
                
            case HAND_TYPES.SHUN_ZI:
                // 顺子：中等加注，考虑对手数量
                if (gameState.currentBet < 30 && activePlayers.length <= 2) {
                    console.log('🐎 乔治: 顺子，对手少，加注');
                    return { action: 'raise', amount: 30 };
                }
                console.log('🐎 乔治: 顺子，跟注观察');
                return { action: 'call' };
                
            case HAND_TYPES.DUI_ZI:
                // 对子：Agent会计算精确赔率
                if (potOdds > 2.5) {
                    console.log('🐎 乔治: 对子+好赔率，跟注');
                    return { action: 'call' };
                } else if (potOdds > 1.5 && isChipLeader && Math.random() < bluffChance) {
                    console.log('🐎 乔治: 对子诈唬加注');
                    return { action: 'raise', amount: 25 };
                }
                console.log('🐎 乔治: 对子赔率不好，弃牌');
                return { action: 'fold' };
                
            case HAND_TYPES.SAN_PAI:
                // 散牌：Agent更激进，会读对手
                if (hand.value >= 1300) { // A-high
                    if (gameState.currentBet <= 20 && lookedCount <= 1) {
                        console.log('🐎 乔治: A-high，对手少，跟注');
                        return { action: 'call' };
                    } else if (isChipLeader && Math.random() < bluffChance && gameState.currentBet < 30) {
                        console.log('🐎 乔治: A-high诈唬！');
                        return { action: 'raise', amount: 30 };
                    }
                }
                console.log('🐎 乔治: 散牌太弱，弃牌');
                return { action: 'fold' };
        }
        
        return { action: 'fold' };
    }
}

// Lala - 激进型（爱诈唬，要么大赢要么大输）
class LalaAI {
    static makeDecision(player, gameState) {
        const hand = evaluateHand(player.cards);
        
        // Lala 有40%概率诈唬
        const isBluffing = Math.random() < 0.4;
        
        // 如果没看牌，Lala 喜欢直接加注施压
        if (!player.hasLooked) {
            if (isBluffing && gameState.currentBet < 30) {
                return { action: 'raise', amount: 30 };
            }
            return { action: 'look' };
        }
        
        // 已看牌后的决策
        if (isBluffing && hand.type <= HAND_TYPES.DUI_ZI) {
            // 诈唬：拿着烂牌也加注
            if (gameState.currentBet < 50) {
                return { action: 'raise', amount: Math.min(50, player.chips) };
            }
        }
        
        switch (hand.type) {
            case HAND_TYPES.BAO_ZI:
                // 豹子：ALL IN！
                return { action: 'raise', amount: player.chips };
                
            case HAND_TYPES.TONG_HUA_SHUN:
            case HAND_TYPES.TONG_HUA:
            case HAND_TYPES.SHUN_ZI:
                // 好牌：大力加注
                return { action: 'raise', amount: Math.min(player.chips, 80) };
                
            case HAND_TYPES.DUI_ZI:
                // 对子：积极跟注或小加注
                if (Math.random() < 0.5) {
                    return { action: 'raise', amount: 20 };
                }
                return { action: 'call' };
                
            case HAND_TYPES.SAN_PAI:
                // 散牌：Lala 有30%概率不信邪继续跟
                if (Math.random() < 0.3 && gameState.currentBet <= 30) {
                    return { action: 'call' };
                }
                return { action: 'fold' };
        }
        
        return { action: 'fold' };
    }
}

// 汤姆 - 保守型（稳如老狗，不轻易冒险）
class TomAI {
    static makeDecision(player, gameState) {
        const hand = evaluateHand(player.cards);
        
        // 保守型总是先看牌
        if (!player.hasLooked) {
            return { action: 'look' };
        }
        
        // 只看大牌
        switch (hand.type) {
            case HAND_TYPES.BAO_ZI:
            case HAND_TYPES.TONG_HUA_SHUN:
                // 绝对好牌才加注
                return { action: 'raise', amount: 30 };
                
            case HAND_TYPES.TONG_HUA:
            case HAND_TYPES.SHUN_ZI:
                // 中等牌跟注
                if (gameState.currentBet <= 30) {
                    return { action: 'call' };
                }
                return { action: 'fold' };
                
            case HAND_TYPES.DUI_ZI:
                // 对子：小注才跟
                if (gameState.currentBet <= 20) {
                    return { action: 'call' };
                }
                return { action: 'fold' };
                
            case HAND_TYPES.SAN_PAI:
                // 散牌：基本不跟
                if (hand.value >= 1400 && gameState.currentBet <= 10) { // 只有 A-high 极小注
                    return { action: 'call' };
                }
                return { action: 'fold' };
        }
        
        return { action: 'fold' };
    }
}

// 杰瑞 - 随机型（完全随机，不可预测）
class JerryAI {
    static makeDecision(player, gameState) {
        const actions = ['look', 'call', 'raise', 'fold'];
        const weights = [0.2, 0.3, 0.2, 0.3]; // 权重
        
        if (!player.hasLooked) {
            // 随机决定是否看牌
            if (Math.random() < 0.7) {
                return { action: 'look' };
            }
        }
        
        // 随机选择行动
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < actions.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                const action = actions[i];
                if (action === 'raise') {
                    return { action: 'raise', amount: Math.floor(Math.random() * 50) + 20 };
                }
                return { action: action };
            }
        }
        
        return { action: 'call' };
    }
}

// 幸运星 - 运气型（看心情，有时候很准）
class LuckyAI {
    static makeDecision(player, gameState) {
        const hand = evaluateHand(player.cards);
        
        // 幸运星有"直觉"
        const intuition = Math.random();
        
        if (!player.hasLooked) {
            // 直觉强的时候直接蒙牌
            if (intuition > 0.7 && gameState.currentBet <= 20) {
                return { action: 'call' };
            }
            return { action: 'look' };
        }
        
        // 直觉好的时候，中等牌也加注
        if (intuition > 0.6) {
            if (hand.type >= HAND_TYPES.DUI_ZI) {
                return { action: 'raise', amount: 40 };
            }
        }
        
        // 直觉差的时候，好牌也弃
        if (intuition < 0.3) {
            return { action: 'fold' };
        }
        
        // 正常决策
        switch (hand.type) {
            case HAND_TYPES.BAO_ZI:
            case HAND_TYPES.TONG_HUA_SHUN:
                return { action: 'raise', amount: 50 };
                
            case HAND_TYPES.TONG_HUA:
            case HAND_TYPES.SHUN_ZI:
                return { action: 'raise', amount: 30 };
                
            case HAND_TYPES.DUI_ZI:
                return { action: 'call' };
                
            default:
                return { action: 'fold' };
        }
    }
}

// 佩奇 - 激进Agent型（高智商诈唬，心理战大师）
class PeiqiAI {
    static makeDecision(player, gameState) {
        const hand = evaluateHand(player.cards);
        const activePlayers = gameState.players.filter(p => !p.hasFolded && p.id !== player.id);
        const lookedCount = activePlayers.filter(p => p.hasLooked).length;
        
        console.log(`🐷 佩奇(Agent) 思考中... 手牌: ${hand.name}, 底池: ${gameState.pot}`);
        
        // 佩奇特性：喜欢心理战，经常反向操作
        if (!player.hasLooked) {
            // 50%概率直接蒙牌，制造压力
            if (Math.random() < 0.5 && gameState.currentBet <= 30) {
                console.log('🐷 佩奇: 直接蒙牌，气势压制！');
                return { action: 'call' };
            }
            return { action: 'look' };
        }
        
        // 佩奇读牌：分析对手类型
        const hasAggressiveOpponent = activePlayers.some(p => p.name.includes('Lala') || p.name.includes('乔治'));
        
        switch (hand.type) {
            case HAND_TYPES.BAO_ZI:
                // 豹子：佩奇喜欢慢打骗跟注
                if (hasAggressiveOpponent && Math.random() < 0.5) {
                    console.log('🐷 佩奇: 豹子慢打，等对手加注');
                    return { action: 'call' };
                }
                console.log('🐷 佩奇: 豹子！直接ALL IN！');
                return { action: 'raise', amount: player.chips };
                
            case HAND_TYPES.TONG_HUA_SHUN:
            case HAND_TYPES.TONG_HUA:
                // 好牌：佩奇会过度加注施压
                console.log('🐷 佩奇: 同花！大幅加注施压');
                return { action: 'raise', amount: Math.min(player.chips, 80) };
                
            case HAND_TYPES.SHUN_ZI:
                // 顺子：佩奇积极加注
                if (gameState.currentBet < 40) {
                    console.log('🐷 佩奇: 顺子，加注！');
                    return { action: 'raise', amount: 40 };
                }
                return { action: 'call' };
                
            case HAND_TYPES.DUI_ZI:
                // 对子：佩奇很激进
                if (Math.random() < 0.6) {
                    console.log('🐷 佩奇: 对子也诈唬加注！');
                    return { action: 'raise', amount: 35 };
                }
                return { action: 'call' };
                
            case HAND_TYPES.SAN_PAI:
                // 散牌：佩奇经常诈唬
                if (Math.random() < 0.5 && gameState.currentBet <= 40) {
                    console.log('🐷 佩奇: 散牌诈唬！');
                    return { action: 'raise', amount: 40 };
                } else if (gameState.currentBet <= 20) {
                    console.log('🐷 佩奇: 小注跟一把');
                    return { action: 'call' };
                }
                console.log('🐷 佩奇: 弃牌');
                return { action: 'fold' };
        }
        
        return { action: 'fold' };
    }
}

// 多多 - 保守Agent型（稳健计算，风险控制）
class DuoduoAI {
    static makeDecision(player, gameState) {
        const hand = evaluateHand(player.cards);
        const activePlayers = gameState.players.filter(p => !p.hasFolded && p.id !== player.id);
        const potOdds = gameState.pot / (gameState.currentBet || 10);
        
        console.log(`🐶 多多(Agent) 思考中... 手牌: ${hand.name}, 赔率: ${potOdds.toFixed(2)}`);
        
        // 多多特性：非常谨慎，精确计算
        if (!player.hasLooked) {
            // 总是先看牌
            return { action: 'look' };
        }
        
        // 多多策略：严格按牌力和赔率决策
        switch (hand.type) {
            case HAND_TYPES.BAO_ZI:
                // 豹子才大力加注
                console.log('🐶 多多: 豹子！加注');
                return { action: 'raise', amount: 50 };
                
            case HAND_TYPES.TONG_HUA_SHUN:
                // 同花顺：稳健加注
                console.log('🐶 多多: 同花顺，加注');
                return { action: 'raise', amount: 40 };
                
            case HAND_TYPES.TONG_HUA:
                // 同花：看赔率
                if (potOdds > 1.5) {
                    console.log('🐶 多多: 同花，赔率合适，加注');
                    return { action: 'raise', amount: 30 };
                }
                console.log('🐶 多多: 同花，赔率不好，跟注');
                return { action: 'call' };
                
            case HAND_TYPES.SHUN_ZI:
                // 顺子：保守
                if (gameState.currentBet <= 25) {
                    console.log('🐶 多多: 顺子，小注跟注');
                    return { action: 'call' };
                }
                console.log('🐶 多多: 顺子，注太大，弃牌');
                return { action: 'fold' };
                
            case HAND_TYPES.DUI_ZI:
                // 对子：很保守
                if (gameState.currentBet <= 15 && potOdds > 2) {
                    console.log('🐶 多多: 对子，小注跟一把');
                    return { action: 'call' };
                }
                console.log('🐶 多多: 对子，风险大，弃牌');
                return { action: 'fold' };
                
            case HAND_TYPES.SAN_PAI:
                // 散牌：几乎不跟
                if (hand.value >= 1400 && gameState.currentBet <= 10) { // 只有A-high极小注
                    console.log('🐶 多多: A-high极小注，跟注');
                    return { action: 'call' };
                }
                console.log('🐶 多多: 散牌，弃牌');
                return { action: 'fold' };
        }
        
        return { action: 'fold' };
    }
}

// AI 决策路由
function makeAIDecision(player, gameState) {
    switch (player.type) {
        case 'ai-george':
            return GeorgeAI.makeDecision(player, gameState);
        case 'ai-peiqi':
            return PeiqiAI.makeDecision(player, gameState);
        case 'ai-duoduo':
            return DuoduoAI.makeDecision(player, gameState);
        case 'ai-lala':
            return LalaAI.makeDecision(player, gameState);
        case 'ai-tom':
            return TomAI.makeDecision(player, gameState);
        case 'ai-jerry':
            return JerryAI.makeDecision(player, gameState);
        case 'ai-lucky':
            return LuckyAI.makeDecision(player, gameState);
        default:
            return GeorgeAI.makeDecision(player, gameState);
    }
}

// 获取当前玩家可用的动作
function getAvailableActions(player) {
    const actions = ['fold']; // 始终可以弃牌

    if (!player.hasLooked) {
        actions.push('look'); // 看牌
    }

    if (player.chips >= gameState.currentBet) {
        actions.push('call'); // 跟注
    }

    // 可以加注（至少能跟注且有余钱）
    if (player.chips > gameState.currentBet) {
        actions.push('raise');
    }

    return actions;
}

// AI 行动主函数
async function aiAction() {
    const player = gameState.players[gameState.currentPlayerIndex];
    if (player.type === 'human' || player.hasFolded) {
        return;
    }

    // 获取玩家索引
    const playerIndex = gameState.currentPlayerIndex;

    // 尝试使用 Agent 服务
    if (window.AgentManager && window.AgentManager.connectors[playerIndex]) {
        try {
            const state = {
                pot: gameState.pot,
                currentBet: gameState.currentBet,
                roundCount: gameState.roundCount,
                playerCount: gameState.playerCount,
                players: gameState.players.map((p, i) => ({
                    id: i,
                    name: p.name,
                    isAI: p.type !== 'human',
                    bet: p.bet,
                    folded: p.hasFolded,
                    looked: p.hasLooked,
                    chips: p.chips
                })),
                recentActions: gameState.actionLog?.slice(-5) || []
            };

            const availableActions = getAvailableActions(player);
            const result = await window.AgentManager.getDecision(playerIndex, state, availableActions);

            console.log(`🤖 Agent[${player.name}] 决策: ${result.action}`, result.reasoning || '');

            if (result.action === 'raise') {
                const minRaise = gameState.currentBet + 10;
                const raiseAmount = Math.max(result.amount || minRaise, minRaise);
                if (player.chips >= raiseAmount) {
                    playerAction('raise', raiseAmount);
                } else if (player.chips >= gameState.currentBet) {
                    playerAction('call');
                } else {
                    playerAction('fold');
                }
            } else {
                playerAction(result.action);
            }
            return;
        } catch (e) {
            console.log(`🤖 Agent[${player.name}] 调用失败，使用本地AI:`, e.message);
        }
    }

    // 回退到本地 AI
    // AI 随机发言
    sendRandomChat(player);
    
    // 达到10轮限制后，AI 倾向于弃牌（无法开牌）
    if (gameState.roundCount >= gameState.maxRounds) {
        // 随机决定是否弃牌（70%弃牌，30%跟注等待）
        if (Math.random() > 0.3) {
            playerAction('fold');
        } else {
            // 如果有筹码就跟注
            if (player.chips >= gameState.currentBet) {
                playerAction('call');
            } else {
                playerAction('fold');
            }
        }
        return;
    }
    
    const decision = makeAIDecision(player, gameState);
    
    // 执行决策
    if (decision.action === 'raise') {
        // 确保加注金额有效
        const minRaise = gameState.currentBet + 10;
        const raiseAmount = Math.max(decision.amount, minRaise);
        if (player.chips >= raiseAmount) {
            playerAction('raise', raiseAmount);
        } else if (player.chips >= gameState.currentBet) {
            playerAction('call');
        } else {
            playerAction('fold');
        }
    } else {
        playerAction(decision.action);
    }
}

// 导出
window.GeorgeAI = GeorgeAI;
window.PeiqiAI = PeiqiAI;
window.DuoduoAI = DuoduoAI;
window.LalaAI = LalaAI;
window.TomAI = TomAI;
window.JerryAI = JerryAI;
window.LuckyAI = LuckyAI;
window.makeAIDecision = makeAIDecision;
window.aiAction = aiAction;
