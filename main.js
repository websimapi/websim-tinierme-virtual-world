import { RoomData, AvatarRenderer, ItemDatabase } from './data.js';
import { MinigameManager } from './minigames.js';
import nipplejs from 'nipplejs';

const room = new WebsimSocket();

const App = {
    state: {
        screen: 'loading',
        user: null, // { id, username, data: { ... } }
        isFirstTime: false,
        coins: 500,
        inventory: [],
        currentAvatar: { ...RoomData.defaultAvatar },
        input: { x: 0, y: 0 },
        townPlayers: {},
    },
    
    // Core references
    canvas: null,
    ctx: null,
    joystick: null,
    
    async init() {
        this.canvas = document.getElementById('world-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Handle resizing
        window.addEventListener('resize', () => this.resize());
        this.resize();
        
        await this.loadAssets();
        
        // Init Networking
        await room.initialize();
        this.setupNetworking();
        
        // Init Minigames
        MinigameManager.init(this);

        // Check if user has a profile
        await this.checkUserProfile();
        
        document.getElementById('loading-screen').classList.remove('active');
        
        if (this.state.isFirstTime) {
            this.showScreen('creator-screen');
            this.initCreator();
        } else {
            this.showScreen('start-screen');
            // Render intro avatar
            const introCanvas = document.getElementById('intro-avatar-canvas');
            AvatarRenderer.render(introCanvas.getContext('2d'), this.state.currentAvatar, 300, 400);
        }
        
        this.bindEvents();
        
        // Play BGM on first interaction
        window.addEventListener('click', () => {
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        }, { once: true });
    },
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },
    
    async loadAssets() {
        const images = ['base_char.png', 'clothes_starter.png', 'features.png', 'hair_basic.png', 'town_bg.png', 'gacha_machine.png'];
        this.assets = {};
        
        const loadPromises = images.map(src => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    this.assets[src] = img;
                    resolve();
                };
                img.onerror = reject;
            });
        });
        
        await Promise.all(loadPromises);
        AvatarRenderer.setAssets(this.assets);
        
        // Sounds
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {};
        const soundFiles = ['pop.mp3', 'coin_get.mp3', 'ui_sparkle.mp3', 'bgm_town.mp3'];
        
        for (const file of soundFiles) {
            try {
                const response = await fetch(file);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
                this.sounds[file] = audioBuffer;
            } catch(e) {
                console.warn("Failed to load sound", file);
            }
        }
    },
    
    playSound(name, loop = false) {
        if (!this.sounds[name]) return;
        const source = this.audioCtx.createBufferSource();
        source.buffer = this.sounds[name];
        source.connect(this.audioCtx.destination);
        source.loop = loop;
        source.start(0);
        return source; // return for stopping loops
    },
    
    async checkUserProfile() {
        // Find my record in 'tinierme_users'
        // If not found, create one.
        // We use client.id to uniquely identify user row if possible, or just create a new one and filter by username/created_by logic.
        // WebsimSocket persistent records are global. We can filter by 'username' == current user.
        
        const myUsername = room.peers[room.clientId].username;
        const records = await room.collection('tinierme_users').filter({ username: myUsername }).getList();
        
        if (records.length === 0) {
            this.state.isFirstTime = true;
            // Create initial record
            this.userRecord = await room.collection('tinierme_users').create({
                col1: JSON.stringify(RoomData.defaultAvatar), // Avatar
                col2: JSON.stringify([500]), // Wallet (coins)
                col3: JSON.stringify([]), // Inventory
                col4: JSON.stringify({}), // Room
            });
            this.state.currentAvatar = RoomData.defaultAvatar;
            this.state.coins = 500;
            this.state.inventory = [];
        } else {
            this.userRecord = records[0];
            try {
                this.state.currentAvatar = JSON.parse(this.userRecord.col1 || JSON.stringify(RoomData.defaultAvatar));
                const wallet = JSON.parse(this.userRecord.col2 || "[0]");
                this.state.coins = wallet[0];
                this.state.inventory = JSON.parse(this.userRecord.col3 || "[]");
            } catch (e) {
                console.error("Data parse error", e);
            }
        }
    },
    
    async saveUserProfile() {
        if (this.userRecord) {
            await room.collection('tinierme_users').update(this.userRecord.id, {
                col1: JSON.stringify(this.state.currentAvatar),
                col2: JSON.stringify([this.state.coins]),
                col3: JSON.stringify(this.state.inventory),
            });
        }
    },
    
    setupNetworking() {
        // Subscribe to presence for real-time movement
        room.subscribePresence((presence) => {
            this.state.townPlayers = presence;
        });
        
        // Broadcast my initial position
        this.updatePresence();
        
        room.onmessage = (e) => {
            const data = e.data;
            if (data.type === 'chat') {
                this.addChatMessage(data.username, data.message);
            }
        };
    },
    
    updatePresence() {
        room.updatePresence({
            x: this.state.playerX || 400,
            y: this.state.playerY || 400,
            scene: this.state.screen,
            avatar: this.state.currentAvatar // Share appearance so others can render me
        });
    },

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                if (target === 'town') this.enterTown();
                else if (target === 'creator') this.enterCreator();
                else if (target === 'gacha') this.enterGacha();
                else if (target === 'arcade') this.enterArcade();
                else if (target === 'room') this.showScreen('room-screen');
                this.playSound('pop.mp3');
            });
        });
        
        // Start Button
        document.getElementById('btn-start').addEventListener('click', () => {
            this.playSound('pop.mp3');
            this.enterTown();
            // Start bgm loop
            if (!this.bgmNode) {
                this.bgmNode = this.playSound('bgm_town.mp3', true);
            }
        });
        
        // Creator Save
        document.getElementById('btn-save-avatar').addEventListener('click', async () => {
            this.playSound('ui_sparkle.mp3');
            await this.saveUserProfile();
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
                this.playSound('pop.mp3');
                this.enterTown();
            });
        });
        
        // Gacha
        document.getElementById('btn-pull-gacha').addEventListener('click', () => this.pullGacha());
        document.getElementById('btn-gacha-ok').addEventListener('click', () => {
            document.getElementById('gacha-result').classList.add('hidden');
        });
        
        // Canvas Interaction (Click to move)
        this.canvas.addEventListener('mousedown', (e) => this.handleInputStart(e));
        this.canvas.addEventListener('touchstart', (e) => this.handleInputStart(e));
    },
    
    handleInputStart(e) {
        if (this.state.screen !== 'town-screen') return;
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        this.state.targetX = x;
        this.state.targetY = y;
    },
    
    enterTown() {
        this.showScreen('town-screen');
        if (!this.state.playerX) {
            this.state.playerX = 400;
            this.state.playerY = 400;
        }
        
        // Start Town Loop
        if (!this.gameLoopRunning) {
            this.gameLoopRunning = true;
            requestAnimationFrame(() => this.townLoop());
        }
        
        // Init Joystick if mobile
        if (!this.joystick && /Mobi|Android/i.test(navigator.userAgent)) {
            const zone = document.getElementById('joystick-zone');
            this.joystick = nipplejs.create({ zone: zone, mode: 'dynamic', color: 'white' });
            this.joystick.on('move', (evt, data) => {
                if(data.vector) {
                   this.state.input.x = data.vector.x;
                   this.state.input.y = -data.vector.y; // nipple returns inverted Y
                }
            });
            this.joystick.on('end', () => {
                this.state.input.x = 0;
                this.state.input.y = 0;
            });
        }
        
        this.updateHUD();
    },
    
    townLoop() {
        if (this.state.screen !== 'town-screen') {
            this.gameLoopRunning = false;
            return;
        }
        
        // Update Logic
        const speed = 3;
        
        // Joystick/Keyboard movement
        if (this.state.input.x !== 0 || this.state.input.y !== 0) {
            this.state.playerX += this.state.input.x * speed;
            this.state.playerY += this.state.input.y * speed;
            this.state.targetX = null; // Cancel click move
        } 
        // Click to move
        else if (this.state.targetX !== undefined && this.state.targetX !== null) {
            const dx = this.state.targetX - this.state.playerX;
            const dy = this.state.targetY - this.state.playerY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > speed) {
                this.state.playerX += (dx/dist) * speed;
                this.state.playerY += (dy/dist) * speed;
            } else {
                this.state.playerX = this.state.targetX;
                this.state.playerY = this.state.targetY;
                this.state.targetX = null;
            }
        }
        
        // Bounds
        this.state.playerX = Math.max(0, Math.min(this.canvas.width, this.state.playerX));
        this.state.playerY = Math.max(200, Math.min(this.canvas.height, this.state.playerY)); // Keep below horizon
        
        // Render
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Background
        if (this.assets['town_bg.png']) {
            // Parallax-ish
            const bgRatio = this.canvas.width / this.assets['town_bg.png'].width;
            const h = this.assets['town_bg.png'].height * bgRatio;
            this.ctx.drawImage(this.assets['town_bg.png'], 0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Sort players by Y for depth
        const players = [];
        // Add me
        players.push({
            id: 'me',
            username: room.peers[room.clientId]?.username || 'Me',
            x: this.state.playerX,
            y: this.state.playerY,
            avatar: this.state.currentAvatar
        });
        
        // Add others
        for (const [id, p] of Object.entries(this.state.townPlayers)) {
            if (id === room.clientId) continue;
            if (p.scene === 'town-screen' && p.x && p.y) {
                 players.push({
                    id: id,
                    username: room.peers[id]?.username || 'Guest',
                    x: p.x,
                    y: p.y,
                    avatar: p.avatar
                });
            }
        }
        
        players.sort((a, b) => a.y - b.y);
        
        players.forEach(p => {
            this.renderPlayerInTown(p);
        });
        
        // Sync Presence periodically (every 10 frames or so, to save bandwidth, but simple check is enough)
        if (Math.random() < 0.1) this.updatePresence();

        requestAnimationFrame(() => this.townLoop());
    },
    
    renderPlayerInTown(player) {
        const x = player.x;
        const y = player.y;
        const scale = 0.4;
        const w = 300 * scale;
        const h = 400 * scale;
        
        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + 10, w/3, 10, 0, 0, Math.PI*2);
        this.ctx.fill();
        
        // Avatar
        // Use an offscreen canvas for performance if needed, but direct render is okay for few players
        // We'll translate context to center
        this.ctx.save();
        this.ctx.translate(x - w/2, y - h);
        if (player.avatar) {
             AvatarRenderer.render(this.ctx, player.avatar, w, h);
        }
        this.ctx.restore();
        
        // Name tag
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(x - 40, y + 15, 80, 20);
        this.ctx.fillStyle = '#4B0082';
        this.ctx.font = '12px Quicksand';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(player.username, x, y + 29);
        
        // Chat bubble?
    },
    
    initCreator() {
        this.showScreen('creator-screen');
        const canvas = document.getElementById('creator-canvas');
        const ctx = canvas.getContext('2d');
        
        const render = () => {
            ctx.clearRect(0, 0, 400, 500);
            AvatarRenderer.render(ctx, this.state.currentAvatar, 400, 500);
            requestAnimationFrame(render);
        };
        render();
        
        // Setup UI
        const optionsContainer = document.getElementById('creator-options');
        const tabs = document.querySelectorAll('.tab-btn');
        
        const loadTab = (category) => {
            optionsContainer.innerHTML = '';
            const items = ItemDatabase.getItems(category);
            items.forEach(item => {
                const el = document.createElement('div');
                el.className = 'item-option';
                if (this.state.currentAvatar[category] === item.id) el.classList.add('selected');
                
                // Render preview
                const cvs = document.createElement('canvas');
                cvs.width = 60;
                cvs.height = 60;
                const c = cvs.getContext('2d');
                AvatarRenderer.renderItemPreview(c, item);
                
                el.appendChild(cvs);
                el.onclick = () => {
                    this.playSound('pop.mp3');
                    this.state.currentAvatar[category] = item.id;
                    document.querySelectorAll('.item-option').forEach(x => x.classList.remove('selected'));
                    el.classList.add('selected');
                };
                optionsContainer.appendChild(el);
            });
        };
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                loadTab(tab.dataset.tab);
            });
        });
        
        loadTab('hair');
    },

    enterGacha() {
        this.showScreen('gacha-screen');
    },
    
    async pullGacha() {
        if (this.state.coins < 100) {
            alert("Not enough Chibi Coins!");
            return;
        }
        
        this.state.coins -= 100;
        this.updateHUD();
        this.saveUserProfile();
        this.playSound('coin_get.mp3');
        
        // Simple animation logic
        const machine = document.querySelector('.machine-container');
        machine.style.animation = 'none';
        machine.offsetHeight; /* trigger reflow */
        machine.style.animation = 'pulse 0.5s infinite';
        
        setTimeout(() => {
            machine.style.animation = '';
            // Get random item
            const allItems = [...ItemDatabase.hair, ...ItemDatabase.clothes];
            const item = allItems[Math.floor(Math.random() * allItems.length)];
            
            this.state.inventory.push(item.id);
            this.saveUserProfile();
            
            const resultDiv = document.getElementById('gacha-result');
            resultDiv.classList.remove('hidden');
            document.getElementById('gacha-item-name').textContent = item.name;
            
            const cvs = document.getElementById('gacha-reveal-canvas');
            const ctx = cvs.getContext('2d');
            ctx.clearRect(0,0,100,100);
            AvatarRenderer.renderItemPreview(ctx, item);
            this.playSound('ui_sparkle.mp3');
            
        }, 1500);
    },
    
    enterArcade() {
        this.showScreen('arcade-screen');
        // Setup menu
        document.getElementById('arcade-menu').classList.remove('hidden');
        document.getElementById('minigame-container').classList.add('hidden');
        
        document.getElementById('btn-play-nugget').onclick = () => {
            document.getElementById('arcade-menu').classList.add('hidden');
            document.getElementById('minigame-container').classList.remove('hidden');
            MinigameManager.startGame('nugget');
        };
    },

    updateHUD() {
        document.getElementById('display-coins').textContent = this.state.coins;
    },

    sendChat() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (text) {
            room.send({
                type: 'chat',
                username: room.peers[room.clientId].username,
                message: text
            });
            input.value = '';
        }
    },
    
    addChatMessage(name, msg) {
        const div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = `<span class="chat-name">${name}:</span> ${msg}`;
        const history = document.getElementById('chat-history');
        history.appendChild(div);
        history.scrollTop = history.scrollHeight;
    },

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        this.state.screen = id;
    }
};

window.App = App;
App.init();