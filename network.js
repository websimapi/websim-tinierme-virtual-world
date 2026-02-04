export class NetworkManager {
    constructor(app, room) {
        this.app = app;
        this.room = room;
    }

    setup() {
        // Subscribe to presence for real-time movement
        this.room.subscribePresence((presence) => {
            this.app.state.townPlayers = presence;
        });
        
        // Broadcast my initial position
        this.updatePresence();
        
        this.room.onmessage = (e) => {
            const data = e.data;
            if (data.type === 'chat') {
                this.app.ui.addChatMessage(data.username, data.message);
                if (this.app.game) {
                    this.app.game.showChatBubble(e.clientId, data.message);
                }
            }
        };
    }

    updatePresence() {
        this.room.updatePresence({
            x: this.app.state.playerX || 400,
            y: this.app.state.playerY || 400,
            scene: this.app.state.screen,
            avatar: this.app.state.currentAvatar // Share appearance so others can render me
        });
    }

    sendChat(text) {
        this.room.send({
            type: 'chat',
            username: this.room.peers[this.room.clientId].username,
            message: text
        });
    }
}