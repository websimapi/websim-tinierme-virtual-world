import { AvatarRenderer, RoomData } from './data.js';
import nipplejs from 'nipplejs';

export class GameWorld {
    constructor(app, room) {
        this.app = app;
        this.room = room;
        this.canvas = document.getElementById('world-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.joystick = null;
        this.running = false;
        this.lastSyncTime = 0;
        this.chatBubbles = {};
        
        // Input handling
        this.canvas.addEventListener('mousedown', (e) => this.handleInputStart(e));
        this.canvas.addEventListener('touchstart', (e) => this.handleInputStart(e));
        
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    showChatBubble(id, msg) {
        this.chatBubbles[id] = {
            msg: msg,
            time: Date.now()
        };
    }

    resize() {
        const parent = this.canvas.parentElement;
        if (!parent) return;

        const dpr = window.devicePixelRatio || 1;
        // Use parent dimensions to support CSS-forced landscape
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.ctx.scale(dpr, dpr);
        this.app.dpr = dpr;
    }

    start() {
        this.resize(); // Ensure size is correct on start
        if (!this.running) {
            this.running = true;
            
            // Force Joystick if touch device detected OR small screen
            const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 800;
            
            if (!this.joystick && isMobile) {
                const zone = document.getElementById('joystick-zone');
                if (zone) {
                    zone.innerHTML = '';
                    this.joystick = nipplejs.create({ 
                        zone: zone, 
                        mode: 'dynamic', 
                        color: 'white',
                        size: 100
                    });
                    this.joystick.on('move', (evt, data) => {
                        if(data.vector) {
                           // Check for forced landscape mode (screen is physically portrait)
                           if (window.innerHeight > window.innerWidth) {
                               // Remap inputs for 90deg rotation
                               // Physical Right (+X) -> Game Up (-Y)
                               // Physical Down (+Y) -> Game Right (+X)
                               this.app.state.input.x = data.vector.y; 
                               this.app.state.input.y = -data.vector.x;
                           } else {
                               this.app.state.input.x = data.vector.x;
                               this.app.state.input.y = -data.vector.y;
                           }
                        }
                    });
                    this.joystick.on('end', () => {
                        this.app.state.input.x = 0;
                        this.app.state.input.y = 0;
                    });
                }
            }

            requestAnimationFrame(() => this.loop());
        }
    }

    stop() {
        this.running = false;
    }

    handleInputStart(e) {
        if (this.app.state.screen !== 'town-screen') return;
        // Don't move if touching a UI element (heuristic: if target is canvas)
        // Also explicitly check if clicking keyboard or chat
        if (e.target !== this.canvas) return;
        if (e.target.closest('#virtual-keyboard') || e.target.closest('#chat-container')) return;

        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // Calculate base coordinates relative to the bounding box
        let x = clientX - rect.left;
        let y = clientY - rect.top;

        // Correct for Forced Landscape (Portrait Mode)
        // If the screen is physically portrait, we rotate the app 90deg.
        // We need to map the physical touch coordinates to the rotated game space.
        if (window.innerHeight > window.innerWidth) {
            const pX = x; // Physical X
            const pY = y; // Physical Y
            const logicalH = this.canvas.height / (this.app.dpr || 1);

            // Mapping derivation for rotate(90deg) [Clockwise]:
            // Visual Top is Physical Right.
            // Vis X (Left->Right) = Phy Y (Top->Bottom)
            // Vis Y (Top->Bottom) = Phy Width - Phy X (Right->Left)
            
            x = pY;
            y = logicalH - pX;
        }
        
        this.app.state.targetX = x;
        this.app.state.targetY = y;
    }

    loop() {
        if (!this.running) return;
        if (this.app.state.screen !== 'town-screen') {
            this.running = false;
            return;
        }

        this.update();
        this.render();

        // Network Sync Throttling
        const now = Date.now();
        if (!this.lastSyncTime || now - this.lastSyncTime > 100) { // 100ms throttle (10fps sync)
            this.app.network.updatePresence();
            this.lastSyncTime = now;
        }

        requestAnimationFrame(() => this.loop());
    }

    update() {
        // Update Logic
        const speed = 3;
        const state = this.app.state;

        // Joystick/Keyboard movement
        if (state.input.x !== 0 || state.input.y !== 0) {
            state.playerX += state.input.x * speed;
            state.playerY += state.input.y * speed;
            state.targetX = null; // Cancel click move
        } 
        // Click to move
        else if (state.targetX !== undefined && state.targetX !== null) {
            const dx = state.targetX - state.playerX;
            const dy = state.targetY - state.playerY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > speed) {
                state.playerX += (dx/dist) * speed;
                state.playerY += (dy/dist) * speed;
            } else {
                state.playerX = state.targetX;
                state.playerY = state.targetY;
                state.targetX = null;
            }
        }

        // Bounds (Logical width is window.innerWidth)
        const logicalWidth = this.canvas.width / this.app.dpr;
        const logicalHeight = this.canvas.height / this.app.dpr;

        state.playerX = Math.max(50, Math.min(logicalWidth - 50, state.playerX));
        // Horizon is roughly 40% down the screen in the background image
        const horizon = logicalHeight * 0.4;
        state.playerY = Math.max(horizon, Math.min(logicalHeight - 50, state.playerY));
    }

    render() {
        const logicalWidth = this.canvas.width / this.app.dpr;
        const logicalHeight = this.canvas.height / this.app.dpr;

        this.ctx.clearRect(0, 0, logicalWidth, logicalHeight);
        
        // Background - Cover Mode
        if (this.app.assets && this.app.assets['town_bg.png']) {
            const img = this.app.assets['town_bg.png'];
            const imgRatio = img.width / img.height;
            const canvasRatio = logicalWidth / logicalHeight;
            
            let renderW, renderH, renderX, renderY;
            
            if (canvasRatio > imgRatio) {
                // Canvas is wider than image (crop top/bottom)
                renderW = logicalWidth;
                renderH = logicalWidth / imgRatio;
                renderX = 0;
                renderY = (logicalHeight - renderH) / 2;
            } else {
                // Canvas is taller than image (crop sides)
                renderH = logicalHeight;
                renderW = logicalHeight * imgRatio;
                renderX = (logicalWidth - renderW) / 2;
                renderY = 0;
            }
            
            this.ctx.drawImage(img, renderX, renderY, renderW, renderH);
        }
        
        // Calculate fountain position
        const fountainData = RoomData.fountain;
        const fountainX = logicalWidth * fountainData.x;
        const fountainY = logicalHeight * fountainData.y;
        // Use defined clipY or default to center if undefined
        const fountainClipY = logicalHeight * (fountainData.clipY !== undefined ? fountainData.clipY : fountainData.y);
        
        // Sort players by Y for depth
        const players = [];
        // Add me
        players.push({
            id: 'me',
            username: this.room.peers[this.room.clientId]?.username || 'Me',
            x: this.app.state.playerX,
            y: this.app.state.playerY,
            avatar: this.app.state.currentAvatar
        });
        
        // Add others
        for (const [id, p] of Object.entries(this.app.state.townPlayers)) {
            if (id === this.room.clientId) continue;
            if (p.scene === 'town-screen' && p.x && p.y) {
                 players.push({
                    id: id,
                    username: this.room.peers[id]?.username || 'Guest',
                    x: p.x,
                    y: p.y,
                    avatar: p.avatar
                });
            }
        }
        
        players.sort((a, b) => a.y - b.y);
        
        // Render players behind fountain
        players.forEach(p => {
            if (p.y < fountainClipY) {
                this.renderPlayer(p);
            }
        });
        
        // Render fountain
        if (this.app.assets && this.app.assets['fountain.png']) {
            const fountainImg = this.app.assets['fountain.png'];
            const fw = fountainData.width;
            const fh = fountainData.height;
            this.ctx.drawImage(fountainImg, fountainX - fw/2, fountainY - fh/2, fw, fh);
        }
        
        // Render players in front of fountain
        players.forEach(p => {
            if (p.y >= fountainClipY) {
                this.renderPlayer(p);
            }
        });
    }

    renderPlayer(player) {
        const x = player.x;
        const y = player.y;
        const scale = 0.25; // Compact size
        const w = 400 * scale; // Using standard base size
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

        // Chat Bubble
        if (this.chatBubbles[player.id]) {
            const bubble = this.chatBubbles[player.id];
            if (Date.now() - bubble.time > 5000) {
                delete this.chatBubbles[player.id];
            } else {
                this.renderChatBubble(x, y - h, bubble.msg);
            }
        }
    }

    renderChatBubble(x, y, text) {
        const ctx = this.ctx;
        const padding = 8;
        const maxWidth = 180;
        const lineHeight = 16;
        
        ctx.font = '12px "Quicksand", sans-serif';
        
        // Word wrap
        const words = text.split(' ');
        let line = '';
        const lines = [];
        
        for(let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);
        
        // Measure widest line
        let maxLineW = 0;
        lines.forEach(l => maxLineW = Math.max(maxLineW, ctx.measureText(l).width));
        
        const finalW = Math.max(40, maxLineW + padding * 2);
        const finalH = lines.length * lineHeight + padding * 2;
        
        const bx = x - finalW / 2;
        const by = y - finalH - 15; // Above head
        
        // Draw Bubble
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 5;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = '#e6e6fa';
        ctx.lineWidth = 1;
        
        const r = 8;
        ctx.beginPath();
        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + finalW - r, by);
        ctx.quadraticCurveTo(bx + finalW, by, bx + finalW, by + r);
        ctx.lineTo(bx + finalW, by + finalH - r);
        ctx.quadraticCurveTo(bx + finalW, by + finalH, bx + finalW - r, by + finalH);
        // Arrow
        ctx.lineTo(bx + finalW/2 + 5, by + finalH);
        ctx.lineTo(bx + finalW/2, by + finalH + 6);
        ctx.lineTo(bx + finalW/2 - 5, by + finalH);
        ctx.lineTo(bx + r, by + finalH);
        ctx.quadraticCurveTo(bx, by + finalH, bx, by + finalH - r);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.shadowBlur = 0; // Reset shadow
        
        // Text
        ctx.fillStyle = '#4B0082';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], bx + finalW/2, by + padding + (i * lineHeight));
        }
    }
}