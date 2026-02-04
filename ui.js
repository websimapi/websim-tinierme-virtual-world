import { ItemDatabase, CharacterPresets, AvatarRenderer } from './data.js';
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
        document.getElementById('btn-send').addEventListener('click', () => {
            this.sendChat();
            this.closeKeyboard();
        });
        
        const chatInput = document.getElementById('chat-input');
        chatInput.addEventListener('click', () => {
             this.openKeyboard();
        });
        chatInput.addEventListener('focus', (e) => {
             e.target.blur(); // Prevent native keyboard
             this.openKeyboard();
        });

        // Chat Toggle
        const chatContainer = document.getElementById('chat-container');
        document.getElementById('btn-chat-toggle').addEventListener('click', (e) => {
            chatContainer.classList.toggle('minimized');
            // When opening, focus input? Maybe not on mobile to prevent keyboard pop
            e.stopPropagation(); // Prevent canvas click through
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

        // Scroll Buttons
        const scroller = document.getElementById('creator-options');
        document.getElementById('scroll-left').addEventListener('click', () => {
            scroller.scrollBy({ left: -100, behavior: 'smooth' });
        });
        document.getElementById('scroll-right').addEventListener('click', () => {
            scroller.scrollBy({ left: 100, behavior: 'smooth' });
        });

        this.setupVirtualKeyboard();
    }

    setupVirtualKeyboard() {
        const kb = document.getElementById('virtual-keyboard');
        const rows = [
            ['q','w','e','r','t','y','u','i','o','p'],
            ['a','s','d','f','g','h','j','k','l'],
            ['z','x','c','v','b','n','m'],
            ['123', 'SPACE', 'DEL', 'ENTER']
        ];

        rows.forEach(rowKeys => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'kb-row';
            
            rowKeys.forEach(key => {
                const btn = document.createElement('button');
                btn.className = 'kb-key';
                
                if (key === 'SPACE') {
                    btn.classList.add('space');
                    btn.textContent = '';
                } else if (key === 'ENTER' || key === 'DEL' || key === '123') {
                    btn.classList.add('wide');
                    if(key === 'ENTER') btn.classList.add('action');
                    btn.textContent = key;
                } else {
                    btn.textContent = key;
                }

                btn.onclick = (e) => {
                    e.stopPropagation(); // Prevent game inputs
                    this.handleKeyPress(key);
                };
                
                rowDiv.appendChild(btn);
            });
            kb.appendChild(rowDiv);
        });

        // Close keyboard if clicking outside
        document.getElementById('town-screen').addEventListener('mousedown', (e) => {
            if (!kb.contains(e.target) && e.target.id !== 'chat-input') {
                this.closeKeyboard();
            }
        });
    }

    openKeyboard() {
        document.getElementById('virtual-keyboard').classList.remove('hidden');
        document.getElementById('chat-container').classList.add('keyboard-active');
        // Ensure chat is open
        document.getElementById('chat-container').classList.remove('minimized');
    }

    closeKeyboard() {
        document.getElementById('virtual-keyboard').classList.add('hidden');
        document.getElementById('chat-container').classList.remove('keyboard-active');
    }

    handleKeyPress(key) {
        const input = document.getElementById('chat-input');
        if (this.app.audio) this.app.audio.play('pop.mp3');

        if (key === 'DEL') {
            input.value = input.value.slice(0, -1);
        } else if (key === 'SPACE') {
            input.value += ' ';
        } else if (key === 'ENTER') {
            this.sendChat();
            this.closeKeyboard();
        } else if (key === '123') {
            // Placeholder for number switch
        } else {
            input.value += key;
        }
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
            // Use clientWidth/Height to respect CSS transforms/containers
            const width = canvas.clientWidth || canvas.parentElement.clientWidth;
            const height = canvas.clientHeight || canvas.parentElement.clientHeight;
            
            if (width === 0) return;
            
            // High DPI
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            
            // Calculate drawing area (centered square)
            const padding = 40;
            // Use logical size (canvas.width is scaled by dpr)
            const size = Math.min(canvas.width, canvas.height) - (padding * dpr);
            renderScale = size;
            canvasX = (canvas.width - size) / 2;
            canvasY = (canvas.height - size) / 2;
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // --- Interaction Logic ---
        // Simplified: Clicking character spins them slightly or plays animation
        // No drag and drop of individual parts as we are now using presets
        
        const handleInteraction = () => {
             this.app.audio.play('pop.mp3');
        };

        canvas.addEventListener('mousedown', handleInteraction);
        canvas.addEventListener('touchstart', handleInteraction);

        // --- Render Loop ---
        const render = () => {
            if (this.app.state.screen !== 'creator-screen') {
                window.removeEventListener('resize', resizeCanvas);
                // Clean up listeners? (Lazy approach: they stay on DOM element, but logic guards state)
                return;
            }
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
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
        
        CharacterPresets.forEach(preset => {
            const el = document.createElement('div');
            el.className = 'item-option';
            
            const cvs = document.createElement('canvas');
            cvs.width = 80; 
            cvs.height = 80;
            const c = cvs.getContext('2d');
            
            // We need to wait for assets to be ready if they aren't, 
            // but since this is called after init, they should be there.
            // Small timeout to ensure context is ready if needed, 
            // but synchronous draw is preferred for UI.
            AvatarRenderer.renderAvatarPreview(c, preset);
            
            el.appendChild(cvs);
            
            // Add label?
            // const label = document.createElement('span');
            // label.textContent = preset.name;
            // label.style.fontSize = '10px';
            // label.style.position = 'absolute';
            // label.style.bottom = '2px';
            // el.appendChild(label);
            
            el.onclick = () => {
                if (this.app.audio) this.app.audio.play('pop.mp3');
                
                // Deep copy the preset items to current avatar
                // This replaces the whole look
                this.app.state.currentAvatar = JSON.parse(JSON.stringify({
                    items: preset.items
                }));
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