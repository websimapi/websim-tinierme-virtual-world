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
        const ctx = canvas.getContext('2d');
        
        // --- Setup Canvas Size & Resize ---
        let renderScale = 1;
        let canvasX = 0;
        let canvasY = 0;
        
        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width === 0) return;
            
            // High DPI
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            
            // Calculate drawing area (centered square)
            const padding = 40;
            const size = Math.min(canvas.width, canvas.height) - padding;
            renderScale = size;
            canvasX = (canvas.width - size) / 2;
            canvasY = (canvas.height - size) / 2;
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // --- Interaction Logic ---
        let activeItemIndex = -1;
        let dragStartX = 0;
        let dragStartY = 0;
        let initialItemX = 0;
        let initialItemY = 0;
        
        const handleStart = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const tx = (clientX - rect.left) * dpr;
            const ty = (clientY - rect.top) * dpr;
            
            // Check collision with items (Reverse order to grab top-most)
            const items = this.app.state.currentAvatar.items;
            activeItemIndex = -1;
            
            for (let i = items.length - 1; i >= 0; i--) {
                const item = items[i];
                // Simple hit box: The whole character square shifted by item.x/y
                // But the item itself might be small. 
                // Since sprites are full-size overlays (512x512 logic), the hit area is technically the whole box?
                // To make it usable, we check if the click is somewhat near the center + offset.
                // Or better: Just check distance to "center of item" which is canvasX + renderScale/2 + item.x
                
                const itemCenterX = canvasX + item.x + renderScale/2;
                const itemCenterY = canvasY + item.y + renderScale/2;
                
                // Generous hit radius (e.g. 1/4 of total scale)
                const hitRadius = renderScale * 0.3; 
                
                if (Math.abs(tx - itemCenterX) < hitRadius && Math.abs(ty - itemCenterY) < hitRadius) {
                    activeItemIndex = i;
                    dragStartX = tx;
                    dragStartY = ty;
                    initialItemX = item.x;
                    initialItemY = item.y;
                    this.app.audio.play('pop.mp3');
                    break;
                }
            }
        };
        
        const handleMove = (clientX, clientY) => {
            if (activeItemIndex === -1) return;
            
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const tx = (clientX - rect.left) * dpr;
            const ty = (clientY - rect.top) * dpr;
            
            const dx = tx - dragStartX;
            const dy = ty - dragStartY;
            
            const item = this.app.state.currentAvatar.items[activeItemIndex];
            item.x = initialItemX + dx;
            item.y = initialItemY + dy;
        };
        
        const handleEnd = (clientX, clientY) => {
            if (activeItemIndex === -1) return;
            
            // Check if dropped near bottom (Delete Zone)
            const rect = canvas.getBoundingClientRect();
            // If touch is in the bottom 15% of the canvas
            if (clientY - rect.top > rect.height * 0.85) {
                // Delete
                this.app.state.currentAvatar.items.splice(activeItemIndex, 1);
                this.app.audio.play('coin_get.mp3'); // Recycle sound
            }
            
            activeItemIndex = -1;
        };

        // Mouse listeners
        canvas.addEventListener('mousedown', e => handleStart(e.clientX, e.clientY));
        window.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', e => handleEnd(e.clientX, e.clientY));
        
        // Touch listeners
        canvas.addEventListener('touchstart', e => {
            handleStart(e.touches[0].clientX, e.touches[0].clientY);
            e.preventDefault();
        }, {passive: false});
        
        canvas.addEventListener('touchmove', e => {
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
            e.preventDefault();
        }, {passive: false});
        
        canvas.addEventListener('touchend', e => {
            handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        });

        // --- Render Loop ---
        const render = () => {
            if (this.app.state.screen !== 'creator-screen') {
                window.removeEventListener('resize', resizeCanvas);
                // Clean up listeners? (Lazy approach: they stay on DOM element, but logic guards state)
                return;
            }
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw Drag Hints (Delete Zone)
            if (activeItemIndex !== -1) {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                ctx.fillRect(0, canvas.height * 0.85, canvas.width, canvas.height * 0.15);
                ctx.fillStyle = 'red';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Drop here to remove', canvas.width/2, canvas.height * 0.93);
            }
            
            ctx.save();
            ctx.translate(canvasX, canvasY);
            AvatarRenderer.render(ctx, this.app.state.currentAvatar, renderScale, renderScale);
            ctx.restore();
            
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
        
        this.populateCreatorToolbar();
    }

    populateCreatorToolbar() {
        const container = document.getElementById('creator-options');
        container.innerHTML = '';
        
        // Combine all items for simple scrolling
        const allItems = [
            ...ItemDatabase.face,
            ...ItemDatabase.hair,
            ...ItemDatabase.clothes
        ];
        
        allItems.forEach(item => {
            const el = document.createElement('div');
            el.className = 'item-option';
            
            const cvs = document.createElement('canvas');
            cvs.width = 64; 
            cvs.height = 64;
            const c = cvs.getContext('2d');
            AvatarRenderer.renderItemPreview(c, item);
            el.appendChild(cvs);
            
            el.onclick = () => {
                // Add item to scene (centered)
                if (this.app.audio) this.app.audio.play('pop.mp3');
                
                if (!this.app.state.currentAvatar.items) {
                    this.app.state.currentAvatar.items = [];
                }

                // Add with slight random offset so they don't stack perfectly invisibly
                const offset = (Math.random() - 0.5) * 20;
                this.app.state.currentAvatar.items.push({
                    id: item.id,
                    x: offset,
                    y: offset
                });
            };
            
            container.appendChild(el);
        });
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