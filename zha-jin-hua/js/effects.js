// 特效系统 - 动画和视觉效果

class EffectsManager {
    constructor() {
        this.container = document.getElementById('effects-container');
    }

    // 创建金币雨效果
    createCoinRain() {
        const coinRain = document.createElement('div');
        coinRain.className = 'coin-rain';
        
        for (let i = 0; i < 50; i++) {
            const coin = document.createElement('div');
            coin.className = 'coin';
            coin.textContent = '💰';
            coin.style.left = Math.random() * 100 + '%';
            coin.style.animationDelay = Math.random() * 2 + 's';
            coin.style.animationDuration = (1.5 + Math.random()) + 's';
            coinRain.appendChild(coin);
        }
        
        this.container.appendChild(coinRain);
        
        // 2秒后移除
        setTimeout(() => {
            coinRain.remove();
        }, 3000);
    }

    // 创建胜利特效
    createVictoryEffect(playerName) {
        // 金币雨
        this.createCoinRain();
        
        // 胜利文字
        const victory = document.createElement('div');
        victory.className = 'victory-effect';
        victory.innerHTML = `🎉<br>${playerName}<br>获胜!`;
        this.container.appendChild(victory);
        
        setTimeout(() => {
            victory.remove();
        }, 2000);
    }

    // 发牌动画
    animateDealCard(cardElement, delay) {
        cardElement.classList.add('dealing');
        cardElement.style.animationDelay = delay + 's';
        
        setTimeout(() => {
            cardElement.classList.remove('dealing');
            cardElement.style.animationDelay = '';
        }, (delay + 0.5) * 1000);
    }

    // 翻牌动画
    animateFlipCard(cardElement) {
        cardElement.classList.add('flipping');
        
        setTimeout(() => {
            cardElement.classList.remove('flipping');
        }, 600);
    }

    // 筹码飞动效果
    animateChipFly(fromElement, toElement, amount) {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = amount;
        
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        
        chip.style.left = fromRect.left + 'px';
        chip.style.top = fromRect.top + 'px';
        
        document.body.appendChild(chip);
        
        // 飞行动画
        chip.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${toRect.left - fromRect.left}px, ${toRect.top - fromRect.top}px) scale(0.5)`, opacity: 0 }
        ], {
            duration: 500,
            easing: 'ease-out'
        }).onfinish = () => chip.remove();
    }

    // 玩家高亮效果
    highlightPlayer(playerElement) {
        // 移除其他玩家的高亮
        document.querySelectorAll('.player').forEach(p => p.classList.remove('active'));
        
        // 添加当前玩家高亮
        playerElement.classList.add('active');
        
        // 滚动到可见区域
        playerElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // 获胜玩家效果
    showWinner(playerElement) {
        playerElement.classList.add('winner');
        
        // 闪烁效果
        const blink = setInterval(() => {
            playerElement.style.filter = playerElement.style.filter === 'brightness(1.5)' ? '' : 'brightness(1.5)';
        }, 200);
        
        setTimeout(() => {
            clearInterval(blink);
            playerElement.style.filter = '';
        }, 2000);
    }

    // 弃牌效果
    showFold(playerElement) {
        playerElement.classList.add('folded');
        
        // 灰色遮罩动画
        playerElement.animate([
            { filter: 'grayscale(0)' },
            { filter: 'grayscale(100%)' }
        ], {
            duration: 300,
            fill: 'forwards'
        });
    }

    // 按钮点击波纹效果
    createRipple(button, event) {
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        
        const rect = button.getBoundingClientRect();
        
        circle.style.width = circle.style.height = diameter + 'px';
        circle.style.left = (event.clientX - rect.left - radius) + 'px';
        circle.style.top = (event.clientY - rect.top - radius) + 'px';
        circle.classList.add('ripple');
        
        const ripple = button.getElementsByClassName('ripple')[0];
        if (ripple) {
            ripple.remove();
        }
        
        button.appendChild(circle);
    }

    // 震动效果（用于错误提示）
    shake(element) {
        element.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], {
            duration: 400,
            easing: 'ease-in-out'
        });
    }

    // 缩放进入效果
    zoomIn(element, delay = 0) {
        element.style.opacity = '0';
        element.style.transform = 'scale(0.5)';
        
        setTimeout(() => {
            element.animate([
                { opacity: 0, transform: 'scale(0.5)' },
                { opacity: 1, transform: 'scale(1)' }
            ], {
                duration: 300,
                fill: 'forwards',
                easing: 'ease-out'
            });
        }, delay);
    }

    // 淡入效果
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.animate([
            { opacity: 0 },
            { opacity: 1 }
        ], {
            duration: duration,
            fill: 'forwards'
        });
    }
}

// 创建全局特效管理器
const effectsManager = new EffectsManager();

// 导出
window.effectsManager = effectsManager;
