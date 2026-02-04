export const RoomData = {
    defaultAvatar: {
        hair: 'hair_f_1',
        face: 'face_1',
        clothes: 'top_1'
    }
};

export const ItemDatabase = {
    hair: [
        { id: 'hair_f_1', name: 'Basic Bangs', type: 'hair', sprite: { sheet: 'hair_basic.png', x: 0, y: 0, w: 256, h: 256 }, layer: 'front' },
        { id: 'hair_f_2', name: 'Side Swept', type: 'hair', sprite: { sheet: 'hair_basic.png', x: 256, y: 0, w: 256, h: 256 }, layer: 'front' },
        { id: 'hair_b_1', name: 'Short Bob', type: 'hair', sprite: { sheet: 'hair_basic.png', x: 0, y: 256, w: 256, h: 256 }, layer: 'back' },
        { id: 'hair_b_2', name: 'Long Flow', type: 'hair', sprite: { sheet: 'hair_basic.png', x: 256, y: 256, w: 256, h: 256 }, layer: 'back' }
    ],
    face: [
        { id: 'face_1', name: 'Happy Eyes', type: 'face', sprite: { sheet: 'features.png', x: 0, y: 0, w: 256, h: 256 } },
        { id: 'face_2', name: 'Cool Eyes', type: 'face', sprite: { sheet: 'features.png', x: 256, y: 0, w: 256, h: 256 } },
        { id: 'face_3', name: 'Cute Eyes', type: 'face', sprite: { sheet: 'features.png', x: 0, y: 256, w: 256, h: 256 } },
        { id: 'face_4', name: 'Sleepy Eyes', type: 'face', sprite: { sheet: 'features.png', x: 256, y: 256, w: 256, h: 256 } }
    ],
    clothes: [
        { id: 'top_1', name: 'Sailor Top', type: 'clothes', sprite: { sheet: 'clothes_starter.png', x: 0, y: 0, w: 256, h: 256 } },
        { id: 'top_2', name: 'Casual Tee', type: 'clothes', sprite: { sheet: 'clothes_starter.png', x: 256, y: 0, w: 256, h: 256 } },
        { id: 'top_3', name: 'Dress', type: 'clothes', sprite: { sheet: 'clothes_starter.png', x: 0, y: 256, w: 256, h: 256 } },
        { id: 'top_4', name: 'Jacket', type: 'clothes', sprite: { sheet: 'clothes_starter.png', x: 256, y: 256, w: 256, h: 256 } }
    ],
    
    getItems(category) {
        return this[category] || [];
    },
    
    getItem(id) {
        for (const cat in this) {
            if(Array.isArray(this[cat])) {
                const found = this[cat].find(i => i.id === id);
                if (found) return found;
            }
        }
        return null;
    }
};

export const AvatarRenderer = {
    assets: {},
    
    setAssets(assets) {
        this.assets = assets;
    },
    
    render(ctx, avatarData, width, height) {
        // Updated for Square assets (512x512 logical size)
        // We draw everything to fill the target width/height, assuming they are compatible layers
        
        // ctx.clearRect(0, 0, width, height); // Managed by caller
        
        ctx.save();
        
        // Base Layer: Body
        if (this.assets['base_char.png']) {
            ctx.drawImage(this.assets['base_char.png'], 0, 0, width, height);
        }
        
        // Helper to draw layer
        const drawLayer = (itemId) => {
            const item = ItemDatabase.getItem(itemId);
            if (!item) return;
            const img = this.assets[item.sprite.sheet];
            if (img) {
                // Draw the specific sprite cell stretched to fit the entire avatar box
                // This assumes the assets were generated as "paper doll" layers where the item is 
                // pre-positioned relative to the frame.
                ctx.drawImage(
                    img, 
                    item.sprite.x, item.sprite.y, item.sprite.w, item.sprite.h, // Source
                    0, 0, width, height // Dest (Full fit)
                );
            }
        };

        // 1. Back Hair (Try to find a matching back hair or default)
        // Simple logic: if wearing front hair 'hair_f_1', wear 'hair_b_1' etc.
        // Or just store it in data. For now, we hack a default back hair for depth.
        // We'll just look for any item with layer 'back' that matches the color of the front hair?
        // For MVP: Just draw a specific back hair if defined in avatarData, else nothing.
        // But to make it look good, let's force a back hair if one isn't set, based on the front hair index.
        
        let backHairId = null;
        if (avatarData.hair) {
             // Heuristic: map hair_f_1 -> hair_b_1
             const baseId = avatarData.hair.replace('f', 'b');
             if (ItemDatabase.getItem(baseId)) backHairId = baseId;
        }
        if (backHairId) drawLayer(backHairId);

        // 2. Face
        drawLayer(avatarData.face);
        
        // 3. Clothes
        drawLayer(avatarData.clothes);
        
        // 4. Front Hair
        drawLayer(avatarData.hair);
        
        ctx.restore();
    },
    
    renderItemPreview(ctx, item) {
        // Just draw the item centered in small box
        const img = this.assets[item.sprite.sheet];
        if (img) {
             ctx.drawImage(img, item.sprite.x, item.sprite.y, item.sprite.w, item.sprite.h, 0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    }
};