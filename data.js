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
        // Clear
        // ctx.clearRect(0, 0, width, height); // Do not clear if drawing on top of scene
        
        const scaleX = width / 400; // Reference width 400
        const scaleY = height / 500; // Reference height 500
        
        ctx.save();
        ctx.scale(scaleX, scaleY);
        
        // 1. Back Hair
        // For simplicity, we assume one "hair" ID controls both front/back or we select them separately.
        // The data says 'hair' is one field. I'll split it or just render a default back if hair set.
        // Actually, let's just pick a back hair that matches the front style or randomize for MVP.
        // Let's assume user picks 'hair' which is the front part, and we auto-pick back for now.
        // Improved: Allow avatarData to have hair_back specifically.
        
        const backHair = ItemDatabase.hair.find(h => h.layer === 'back'); // Default
        if (backHair) this.drawItem(ctx, backHair);

        // 2. Base Body
        if (this.assets['base_char.png']) {
            ctx.drawImage(this.assets['base_char.png'], 0, 0, 400, 500);
        }
        
        // 3. Face
        const face = ItemDatabase.getItem(avatarData.face);
        if (face) this.drawItem(ctx, face);
        
        // 4. Clothes
        const clothes = ItemDatabase.getItem(avatarData.clothes);
        if (clothes) this.drawItem(ctx, clothes);
        
        // 5. Front Hair
        const hair = ItemDatabase.getItem(avatarData.hair);
        if (hair) this.drawItem(ctx, hair);
        
        ctx.restore();
    },
    
    drawItem(ctx, item) {
        const img = this.assets[item.sprite.sheet];
        if (img) {
            // Draw full image from sprite sheet to full canvas
            // The assets are pre-positioned in the 512x512 sprite blocks to match the 400x500 body?
            // Assuming the sprite sheets are grids of items that are CENTRED relative to body.
            // We need to map sprite coord to canvas.
            
            // Source
            const sx = item.sprite.x;
            const sy = item.sprite.y;
            const sw = item.sprite.w;
            const sh = item.sprite.h;
            
            // Dest
            // Assuming the sprites are designed to fit the 400x500 body when scaled.
            // If sprite blocks are 256x256, we stretch them to fit? Or place them on head/body?
            // "clothes_starter.png" is "Square". Body is "Portrait".
            // Let's assume the sprite contains the item centered.
            // We draw it at appropriate position.
            
            let dx = 0, dy = 0, dw = 400, dh = 400; // Clothes usually full body width
            
            if (item.type === 'face') {
                dx = 100; dy = 100; dw = 200; dh = 200; // Face is smaller
            } else if (item.type === 'hair') {
                 dx = 50; dy = 50; dw = 300; dh = 300; // Hair covers head
            } else {
                 dx = 50; dy = 150; dw = 300; dh = 300; // Clothes
            }

            ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
        }
    },
    
    renderItemPreview(ctx, item) {
        // Just draw the item centered in small box
        const img = this.assets[item.sprite.sheet];
        if (img) {
             ctx.drawImage(img, item.sprite.x, item.sprite.y, item.sprite.w, item.sprite.h, 0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    }
};