export const RoomData = {
    // New structure: Array of placed items
    // This allows free positioning and layering order
    defaultAvatar: {
        items: [] // Empty start, let user add base items? Or pre-populate.
    }
};

export const ItemDatabase = {
    // Assets are 2x2 grids. logical coordinates: col (0-1), row (0-1)
    hair: [
        { id: 'hair_f_1', name: 'Basic Bangs', type: 'hair', sprite: { sheet: 'hair_basic.png', col: 0, row: 0 }, layer: 'front' },
        { id: 'hair_f_2', name: 'Side Swept', type: 'hair', sprite: { sheet: 'hair_basic.png', col: 1, row: 0 }, layer: 'front' },
        { id: 'hair_b_1', name: 'Short Bob', type: 'hair', sprite: { sheet: 'hair_basic.png', col: 0, row: 1 }, layer: 'back' },
        { id: 'hair_b_2', name: 'Long Flow', type: 'hair', sprite: { sheet: 'hair_basic.png', col: 1, row: 1 }, layer: 'back' }
    ],
    face: [
        { id: 'face_1', name: 'Happy Eyes', type: 'face', sprite: { sheet: 'features.png', col: 0, row: 0 } },
        { id: 'face_2', name: 'Cool Eyes', type: 'face', sprite: { sheet: 'features.png', col: 1, row: 0 } },
        { id: 'face_3', name: 'Cute Eyes', type: 'face', sprite: { sheet: 'features.png', col: 0, row: 1 } },
        { id: 'face_4', name: 'Sleepy Eyes', type: 'face', sprite: { sheet: 'features.png', col: 1, row: 1 } }
    ],
    clothes: [
        { id: 'top_1', name: 'Sailor Top', type: 'clothes', sprite: { sheet: 'clothes_starter.png', col: 0, row: 0 } },
        { id: 'top_2', name: 'Casual Tee', type: 'clothes', sprite: { sheet: 'clothes_starter.png', col: 1, row: 0 } },
        { id: 'top_3', name: 'Dress', type: 'clothes', sprite: { sheet: 'clothes_starter.png', col: 0, row: 1 } },
        { id: 'top_4', name: 'Jacket', type: 'clothes', sprite: { sheet: 'clothes_starter.png', col: 1, row: 1 } }
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
        // avatarData is now expected to be { items: [{id, x, y, scale}] }
        
        ctx.save();
        
        // 1. Draw Base Body (Always centered, fill fit)
        if (this.assets['base_char.png']) {
            ctx.drawImage(this.assets['base_char.png'], 0, 0, width, height);
        }
        
        // 2. Draw Items
        if (avatarData && Array.isArray(avatarData.items)) {
            avatarData.items.forEach(placedItem => {
                const itemDef = ItemDatabase.getItem(placedItem.id);
                if (!itemDef) return;
                
                const img = this.assets[itemDef.sprite.sheet];
                if (img) {
                    const srcW = img.naturalWidth / 2;
                    const srcH = img.naturalHeight / 2;
                    const srcX = itemDef.sprite.col * srcW;
                    const srcY = itemDef.sprite.row * srcH;
                    
                    // Logic: Items are stickers.
                    // Default placedItem.x/y is relative to center of canvas
                    // width/height is the canvas size
                    
                    const offsetX = placedItem.x || 0;
                    const offsetY = placedItem.y || 0;
                    
                    // Draw full size overlaid on body
                    // We simply shift the draw rect by the offset
                    ctx.drawImage(
                        img, 
                        srcX, srcY, srcW, srcH,
                        offsetX, offsetY, width, height
                    );
                }
            });
        }
        
        ctx.restore();
    },
    
    renderItemPreview(ctx, item) {
        const img = this.assets[item.sprite.sheet];
        if (img) {
             const srcW = img.naturalWidth / 2;
             const srcH = img.naturalHeight / 2;
             const srcX = item.sprite.col * srcW;
             const srcY = item.sprite.row * srcH;
             
             // Keep aspect ratio in preview, fit to box
             ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    }
};