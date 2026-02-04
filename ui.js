import { ItemDatabase, AvatarRenderer } from './data.js';
import { MinigameManager } from './minigames.js';

export class UIManager {
    constructor(app) {
        this.app = app;
        this.setupBindings();
    }

    setupBindings() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                if (target === 'town') this.enterTown();
                else if (target === 'creator') this.enterCreator();
                else if (target === 'gacha') this.enterGacha();
                else if (target === 'arcade') this.enterArcade();
                else if (target === 'room') this.showScreen('room-screen');
                this.app.audio.play('pop.mp3');
            });
        });
        
        // Start Button
        document.getElementById('btn-start').addEventListener('click', () => {
            this.app.audio.play('pop.mp3');
            this.enterTown();
            // Start bgm loop
            if (!this.app.bgmNode) {
                this.app.bgmNode = this.app.audio.play('bgm_town.mp3', true);
            }
        });
        
        // Creator Save
        document.getElementById('btn-save-avatar').addEventListener('click', async () => {
            this.app.audio.play('ui_sparkle.mp3');
            await this.app.profile.saveUserProfile();
            this.enterTown();
        });
        
        // Chat
        document.getElementById('btn-send').addEventListener('click', () => this.sendChat());
        document.getElementById('chat-input').addEventListener('keyup', (e) => {
            if(e.key === 'Enter') this.sendChat();
        });
        
        // Close Buttons
        document.querySelectorAll('.btn-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.app.audio.play('pop.mp3');
                this.enterTown();
            });
        });
        
        // Gacha
        document.getElementById('btn-pull-gacha').addEventListener('click', () => this.pullGacha());
        document.getElementById('btn-gacha-ok').addEventListener('click', () => {
            document.getElementById('gacha-result').classList.add('hidden');
        });

        // Initialize Arcade Button
        document.getElementById('btn-play-nugget').onclick = () => {
            document.getElementById('arcade-menu').classList.add('hidden');
            document.getElementById('minigame-container').classList.remove('hidden');
            MinigameManager.startGame('nugget');
        };
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        this.app.state.screen = id;
    }

    updateHUD() {
        document.getElementById('display-coins').textContent = this.app.state.coins;
    }

    addChatMessage(name, msg) {
        const div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = `<span class="chat-name">${name}:</span> ${msg}`;
        const history = document.getElementById('chat-history');
        if (history) {
            history.appendChild(div);
            history.scrollTop = history.scrollHeight;
        }
    }

    sendChat() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (text) {
            this.app.network.sendChat(text);
            input.value = '';
        }
    }

    enterTown() {
        this.showScreen('town-screen');
        
        // Reset position if needed, center on screen
        // Use logical coordinates roughly matching the 400px default
        if (!this.app.state.playerX || this.app.state.playerX < 0) {
            this.app.state.playerX = window.innerWidth / 2;
            this.app.state.playerY = window.innerHeight * 0.7;
        }
        
        // Ensure engine is running
        this.app.game.resize(); // Force resize check
        this.app.game.start();
        this.updateHUD();
    }

    enterCreator() {
        this.showScreen('creator-screen');
        const canvas = document.getElementById('creator-canvas');
        
        // Resize observer to handle dynamic layout changes
        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            // Avoid zero size
            if (rect.width === 0 || rect.height === 0) return;
            
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
        };
        
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas(); // Initial
        
        const ctx = canvas.getContext('2d');
        
        const render = () => {
            if (this.app.state.screen !== 'creator-screen') {
                window.removeEventListener('resize', resizeCanvas);
                return;
            }
            
            // Check if we need to resize (e.g. if layout shifted)
            const rect = canvas.getBoundingClientRect();
            if (canvas.width !== rect.width * window.devicePixelRatio) {
                resizeCanvas();
            }

            const w = canvas.width;
            const h = canvas.height;
            
            ctx.clearRect(0, 0, w, h);
            
            // Draw character centered
            // Leave some padding
            const padding = 20;
            const availableW = w - padding * 2;
            const availableH = h - padding * 2;
            
            const scale = Math.min(availableW, availableH);
            const x = (w - scale) / 2;
            const y = (h - scale) / 2;
            
            ctx.save();
            ctx.translate(x, y);
            AvatarRenderer.render(ctx, this.app.state.currentAvatar, scale, scale);
            ctx.restore();
            
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
        
        this.bindCreatorTabs();
        this.loadCreatorTab('hair');
    }

    bindCreatorTabs() {
        // Use cloning to reset listeners cleanly
        document.querySelectorAll('.tab-btn').forEach(tab => {
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            
            newTab.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
                newTab.classList.add('active');
                this.loadCreatorTab(newTab.dataset.tab);
            });
        });
    }

    loadCreatorTab(category) {
        const optionsContainer = document.getElementById('creator-options');
        optionsContainer.innerHTML = '';
        const items = ItemDatabase.getItems(category);
        
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'item-option';
            if (this.app.state.currentAvatar[category] === item.id) el.classList.add('selected');
            
            // Render preview
            const cvs = document.createElement('canvas');
            cvs.width = 80; // Slightly larger for drag visibility
            cvs.height = 80;
            const c = cvs.getContext('2d');
            AvatarRenderer.renderItemPreview(c, item);
            
            el.appendChild(cvs);
            
            // Click to equip
            el.onclick = () => {
                this.equipItem(category, item.id);
                // Visual update
                document.querySelectorAll('.item-option').forEach(x => x.classList.remove('selected'));
                el.classList.add('selected');
            };

            // Drag to equip
            this.setupDrag(el, category, item);

            optionsContainer.appendChild(el);
        });
    }

    equipItem(category, itemId) {
        this.app.audio.play('pop.mp3');
        this.app.state.currentAvatar[category] = itemId;
    }

    setupDrag(element, category, item) {
        let ghost = null;
        let isDragging = false;
        
        const onTouchStart = (e) => {
            isDragging = true;
            // Create ghost
            ghost = element.cloneNode(true);
            ghost.style.position = 'fixed';
            ghost.style.zIndex = '9999';
            ghost.style.pointerEvents = 'none';
            ghost.style.opacity = '0.8';
            ghost.style.transform = 'scale(1.2)';
            ghost.style.width = element.offsetWidth + 'px';
            ghost.style.height = element.offsetHeight + 'px';
            ghost.classList.add('dragging');
            
            const touch = e.touches[0];
            updateGhostPos(touch.clientX, touch.clientY);
            
            document.body.appendChild(ghost);
            
            // Prevent scrolling while dragging item
            // e.preventDefault(); 
        };
        
        const updateGhostPos = (x, y) => {
            if (ghost) {
                ghost.style.left = (x - ghost.offsetWidth / 2) + 'px';
                ghost.style.top = (y - ghost.offsetHeight / 2) + 'px';
            }
        };
        
        const onTouchMove = (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            updateGhostPos(touch.clientX, touch.clientY);
            e.preventDefault(); // Now prevent scroll
        };
        
        const onTouchEnd = (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            const touch = e.changedTouches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            
            // Check if dropped on canvas
            const canvas = document.getElementById('creator-canvas');
            const rect = canvas.getBoundingClientRect();
            
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                // Success drop
                this.equipItem(category, item.id);
                this.app.audio.play('ui_sparkle.mp3'); // Special sound for drag equip
                
                // Update selection UI
                document.querySelectorAll('.item-option').forEach(el => el.classList.remove('selected'));
                element.classList.add('selected');
            }
            
            if (ghost) {
                ghost.remove();
                ghost = null;
            }
        };
        
        element.addEventListener('touchstart', onTouchStart, {passive: false});
        element.addEventListener('touchmove', onTouchMove, {passive: false});
        element.addEventListener('touchend', onTouchEnd);
    }

    enterGacha() {
        this.showScreen('gacha-screen');
    }

    async pullGacha() {
        if (this.app.state.coins < 100) {
            alert("Not enough Chibi Coins!");
            return;
        }
        
        this.app.state.coins -= 100;
        this.updateHUD();
        await this.app.profile.saveUserProfile();
        this.app.audio.play('coin_get.mp3');
        
        // Animation
        const machine = document.querySelector('.machine-container');
        machine.style.animation = 'none';
        machine.offsetHeight; /* trigger reflow */
        machine.style.animation = 'pulse 0.5s infinite';
        
        setTimeout(async () => {
            machine.style.animation = '';
            // Get random item
            const allItems = [...ItemDatabase.hair, ...ItemDatabase.clothes];
            const item = allItems[Math.floor(Math.random() * allItems.length)];
            
            this.app.state.inventory.push(item.id);
            await this.app.profile.saveUserProfile();
            
            const resultDiv = document.getElementById('gacha-result');
            resultDiv.classList.remove('hidden');
            document.getElementById('gacha-item-name').textContent = item.name;
            
            const cvs = document.getElementById('gacha-reveal-canvas');
            const ctx = cvs.getContext('2d');
            ctx.clearRect(0,0,100,100);
            AvatarRenderer.renderItemPreview(ctx, item);
            this.app.audio.play('ui_sparkle.mp3');
            
        }, 1500);
    }
    
    enterArcade() {
        this.showScreen('arcade-screen');
        document.getElementById('arcade-menu').classList.remove('hidden');
        document.getElementById('minigame-container').classList.add('hidden');
    }
}