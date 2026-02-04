export const MinigameManager = {
    app: null,
    game: null,
    
    init(app) {
        this.app = app;
        
        document.getElementById('btn-exit-game').addEventListener('click', () => {
            this.stopGame();
        });
        
        document.getElementById('btn-retry-game').addEventListener('click', () => {
             document.getElementById('game-over-modal').classList.add('hidden');
             this.startGame(this.currentGameType);
        });
        
        document.getElementById('btn-quit-game').addEventListener('click', () => {
             document.getElementById('game-over-modal').classList.add('hidden');
             this.stopGame();
        });
    },
    
    startGame(type) {
        this.currentGameType = type;
        if (type === 'nugget') {
            this.game = new NuggetGame(this.app);
            this.game.start();
        }
    },
    
    stopGame() {
        if (this.game) {
            this.game.stop();
            this.game = null;
        }
        document.getElementById('minigame-container').classList.add('hidden');
        document.getElementById('arcade-menu').classList.remove('hidden');
    }
};

class NuggetGame {
    constructor(app) {
        this.app = app;
        this.canvas = document.getElementById('minigame-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.lives = 3;
        this.running = false;
        this.playerX = this.canvas.width / 2;
        this.items = [];
        this.lastTime = 0;
        this.spawnTimer = 0;
        
        // Initial resize
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const parent = this.canvas.parentElement;
        if (parent) {
             this.canvas.width = parent.clientWidth;
             this.canvas.height = parent.clientHeight;
        } else {
             this.canvas.width = window.innerWidth;
             this.canvas.height = window.innerHeight;
        }
    }
    
    start() {
        this.running = true;
        this.score = 0;
        this.lives = 3;
        this.items = [];
        this.updateUI();
        
        // Input
        this.boundMove = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            this.playerX = clientX;
        };
        this.canvas.addEventListener('mousemove', this.boundMove);
        this.canvas.addEventListener('touchmove', this.boundMove);
        
        requestAnimationFrame((t) => this.loop(t));
    }
    
    stop() {
        this.running = false;
        this.canvas.removeEventListener('mousemove', this.boundMove);
        this.canvas.removeEventListener('touchmove', this.boundMove);
    }
    
    loop(timestamp) {
        if (!this.running) return;
        const dt = (timestamp - this.lastTime) / 1000 || 0.016;
        this.lastTime = timestamp;
        
        this.update(dt);
        this.render();
        
        requestAnimationFrame((t) => this.loop(t));
    }
    
    update(dt) {
        // Spawn
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = Math.max(0.5, 2 - (this.score / 500)); // Get faster
            this.items.push({
                x: Math.random() * this.canvas.width,
                y: -50,
                type: Math.random() > 0.2 ? 'nugget' : 'bomb',
                speed: 100 + (this.score / 2)
            });
        }
        
        // Update items
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.y += item.speed * dt;
            
            // Collision with player (bottom of screen)
            if (item.y > this.canvas.height - 100 && item.y < this.canvas.height) {
                if (Math.abs(item.x - this.playerX) < 50) {
                    if (item.type === 'nugget') {
                        this.score += 10;
                        this.app.playSound('coin_get.mp3');
                    } else {
                        this.lives--;
                        this.app.playSound('pop.mp3'); // Boom?
                    }
                    this.items.splice(i, 1);
                    this.updateUI();
                    continue;
                }
            }
            
            // Out of bounds
            if (item.y > this.canvas.height) {
                this.items.splice(i, 1);
            }
        }
        
        if (this.lives <= 0) {
            this.gameOver();
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw Player
        this.ctx.fillStyle = 'pink';
        this.ctx.fillRect(this.playerX - 25, this.canvas.height - 80, 50, 50);
        // Draw Basket
        this.ctx.strokeStyle = 'brown';
        this.ctx.lineWidth = 5;
        this.ctx.strokeRect(this.playerX - 30, this.canvas.height - 80, 60, 20);
        
        // Draw Items
        this.items.forEach(item => {
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            if (item.type === 'nugget') {
                this.ctx.fillText('🍗', item.x, item.y);
            } else {
                this.ctx.fillText('💣', item.x, item.y);
            }
        });
    }
    
    updateUI() {
        document.getElementById('game-score').textContent = `Score: ${this.score}`;
        document.getElementById('game-lives').textContent = `Lives: ${this.lives}`;
    }
    
    gameOver() {
        this.running = false;
        const coinsEarned = Math.floor(this.score / 2);
        this.app.state.coins += coinsEarned;
        this.app.saveUserProfile();
        this.app.updateHUD();
        
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('earned-coins').textContent = coinsEarned;
        document.getElementById('game-over-modal').classList.remove('hidden');
    }
}