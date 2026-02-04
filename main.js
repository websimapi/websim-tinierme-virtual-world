import { RoomData, AvatarRenderer } from './data.js';
import { MinigameManager } from './minigames.js';
// NEW MODULE IMPORTS
import { AudioManager } from './audio.js';
import { NetworkManager } from './network.js';
import { ProfileManager } from './profile.js';
import { GameWorld } from './game.js';
import { UIManager } from './ui.js';

const room = new WebsimSocket();

const App = {
    state: {
        screen: 'loading',
        user: null, 
        isFirstTime: false,
        coins: 500,
        inventory: [],
        currentAvatar: JSON.parse(JSON.stringify(RoomData.defaultAvatar)), // Deep copy
        input: { x: 0, y: 0 },
        townPlayers: {},
        playerX: 400,
        playerY: 400,
        targetX: null,
        targetY: null
    },
    
    assets: {},
    dpr: 1,
    
    // Core references to new sub-modules
    audio: null,
    network: null,
    profile: null,
    game: null,
    ui: null,
    
    async init() {
        // Init Subsystems
        this.audio = new AudioManager();
        this.network = new NetworkManager(this, room);
        this.profile = new ProfileManager(this, room);
        this.game = new GameWorld(this, room);
        this.ui = new UIManager(this);

        // removed function loadAssets() implementation (moved to helper/simplified below)
        await this.loadAssets();
        AvatarRenderer.setAssets(this.assets);
        
        // Init Networking
        await room.initialize();
        this.network.setup();
        
        // Init Minigames
        MinigameManager.init(this);

        // Check if user has a profile
        // removed function checkUserProfile() implementation (moved to profile.js)
        await this.profile.checkUserProfile();
        
        document.getElementById('loading-screen').classList.remove('active');
        
        if (this.state.isFirstTime) {
            this.ui.enterCreator();
        } else {
            this.ui.showScreen('start-screen');
            // Render intro avatar
            const introCanvas = document.getElementById('intro-avatar-canvas');
            AvatarRenderer.render(introCanvas.getContext('2d'), this.state.currentAvatar, 300, 400);
        }
        
        // Play BGM on first interaction
        window.addEventListener('click', () => {
            if (this.audio.ctx && this.audio.ctx.state === 'suspended') {
                this.audio.ctx.resume();
            }
        }, { once: true });
    },
    
    async loadAssets() {
        const images = ['base_char.png', 'clothes_starter.png', 'features.png', 'hair_basic.png', 'town_bg.png', 'gacha_machine.png'];
        const sounds = ['pop.mp3', 'coin_get.mp3', 'ui_sparkle.mp3', 'bgm_town.mp3'];
        
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
        await this.audio.load(sounds);
    },
    
    // Tombstones for removed/delegated methods:
    // removed function playSound() -> delegating to audio.js
    playSound(name, loop) {
        return this.audio.play(name, loop);
    },

    // removed function saveUserProfile() -> delegating to profile.js
    saveUserProfile() {
        return this.profile.saveUserProfile();
    },

    // removed function updateHUD() -> delegating to ui.js
    updateHUD() {
        this.ui.updateHUD();
    }
    
    // removed function setupNetworking() -> moved to network.js
    // removed function updatePresence() -> moved to network.js
    // removed function bindEvents() -> moved to ui.js
    // removed function handleInputStart() -> moved to game.js
    // removed function enterTown() -> moved to ui.js
    // removed function townLoop() -> moved to game.js
    // removed function renderPlayerInTown() -> moved to game.js
    // removed function initCreator() -> moved to ui.js
    // removed function enterGacha() -> moved to ui.js
    // removed function pullGacha() -> moved to ui.js
    // removed function enterArcade() -> moved to ui.js
    // removed function sendChat() -> moved to ui.js
    // removed function addChatMessage() -> moved to ui.js
    // removed function showScreen() -> moved to ui.js
};

window.App = App;
App.init();