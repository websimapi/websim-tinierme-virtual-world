import { RoomData } from './data.js';

export class ProfileManager {
    constructor(app, room) {
        this.app = app;
        this.room = room;
        this.userRecord = null;
    }

    async checkUserProfile() {
        // WebsimSocket persistent records
        const myUsername = this.room.peers[this.room.clientId].username;
        const records = await this.room.collection('tinierme_users').filter({ username: myUsername }).getList();
        
        if (records.length === 0) {
            this.app.state.isFirstTime = true;
            // Create initial record
            this.userRecord = await this.room.collection('tinierme_users').create({
                col1: JSON.stringify(RoomData.defaultAvatar), // Avatar
                col2: JSON.stringify([500]), // Wallet (coins)
                col3: JSON.stringify([]), // Inventory
                col4: JSON.stringify({}), // Room
            });
            this.app.state.currentAvatar = JSON.parse(JSON.stringify(RoomData.defaultAvatar));
            this.app.state.coins = 500;
            this.app.state.inventory = [];
        } else {
            this.userRecord = records[0];
            try {
                this.app.state.currentAvatar = JSON.parse(this.userRecord.col1 || JSON.stringify(RoomData.defaultAvatar));
                const wallet = JSON.parse(this.userRecord.col2 || "[0]");
                this.app.state.coins = wallet[0];
                this.app.state.inventory = JSON.parse(this.userRecord.col3 || "[]");
            } catch (e) {
                console.error("Data parse error", e);
            }
        }
    }

    async saveUserProfile() {
        if (this.userRecord) {
            await this.room.collection('tinierme_users').update(this.userRecord.id, {
                col1: JSON.stringify(this.app.state.currentAvatar),
                col2: JSON.stringify([this.app.state.coins]),
                col3: JSON.stringify(this.app.state.inventory),
            });
        }
    }
}