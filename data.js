export const RoomData = {
    // New structure: Array of placed items
    // This allows free positioning and layering order
    defaultAvatar: {
        items: [
             // Minimal start: Just face. User builds the rest.
             { id: 'face_1', x: 0, y: 0 }
        ]
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

        // Prepare layers
        const layers = {
            back: [],
            body: ['base_char.png'],
            face: [],
            clothes: [],
            front: [],
            other: []
        };
        
        // Sort items into layers
        if (avatarData && Array.isArray(avatarData.items)) {
            avatarData.items.forEach(placedItem => {
                const itemDef = ItemDatabase.getItem(placedItem.id);
                if (!itemDef) return;
                
                // Attach definition to placed item for rendering
                const renderable = { ...placedItem, def: itemDef };
                
                if (itemDef.layer === 'back') layers.back.push(renderable);
                else if (itemDef.type === 'face') layers.face.push(renderable);
                else if (itemDef.type === 'clothes') layers.clothes.push(renderable);
                else if (itemDef.layer === 'front') layers.front.push(renderable);
                else layers.other.push(renderable);
            });
        }

        // Helper render function
        const drawItem = (item) => {
            const img = this.assets[item.def.sprite.sheet];
            if (img) {
                const srcW = img.naturalWidth / 2;
                const srcH = img.naturalHeight / 2;
                const srcX = item.def.sprite.col * srcW;
                const srcY = item.def.sprite.row * srcH;
                
                const offsetX = item.x || 0;
                const offsetY = item.y || 0;
                
                const scale = item.scale || 1;
                const drawW = width * scale;
                const drawH = height * scale;

                ctx.drawImage(
                    img, 
                    srcX, srcY, srcW, srcH,
                    offsetX, offsetY, drawW, drawH
                );
            }
        };

        // Render Order
        
        // 1. Back Hair / Items
        layers.back.forEach(drawItem);
        
        // 2. Base Body
        if (this.assets['base_char.png']) {
            ctx.drawImage(this.assets['base_char.png'], 0, 0, width, height);
        }
        
        // 3. Face
        layers.face.forEach(drawItem);
        
        // 4. Clothes
        layers.clothes.forEach(drawItem);
        
        // 5. Front Hair / Items
        layers.front.forEach(drawItem);
        
        // 6. Others
        layers.other.forEach(drawItem);
        
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