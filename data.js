export const RoomData = {
    // Default to the first character
    defaultAvatar: {
        items: [
            { id: 'char_1' }
        ]
    },
    // Fountain positioning for Z-clipping
    fountain: {
        x: 0.5, // Center X (0-1 normalized)
        y: 0.5, // Center Y (0-1 normalized)
        width: 200,
        height: 150,
        // Z-clip area: Pixels relative to center Y. Positive = down.
        // Moved lower to ensure characters stay "behind" the fountain longer.
        clipOffset: 35,
        // Collision polygon: offsets relative to center X,Y
        // Defines the base shape to prevent walking "into" the front/sides
        collisionPoly: [
            {x: -50, y: 15}, // Top Left (flat back to walk behind)
            {x: 50, y: 15},  // Top Right
            {x: 85, y: 45},  // Right Side
            {x: 0, y: 70},   // Bottom Point
            {x: -85, y: 45}  // Left Side
        ]
    }
};

export const CharacterPresets = [
    {
        name: "Casual Boy",
        items: [{ id: 'char_1' }]
    },
    {
        name: "School Girl",
        items: [{ id: 'char_2' }]
    },
    {
        name: "Pink Princess",
        items: [{ id: 'char_3' }]
    },
    {
        name: "Street Style",
        items: [{ id: 'char_4' }]
    },
    {
        name: "Fantasy Mage",
        items: [{ id: 'char_5' }]
    },
    {
        name: "Sleepy Time",
        items: [{ id: 'char_6' }]
    }
];

export const ItemDatabase = {
    // Simplified database - just full characters now
    characters: [
        { id: 'char_1', name: 'Casual Boy', sprite: 'char_preset_1.png' },
        { id: 'char_2', name: 'School Girl', sprite: 'char_preset_2.png' },
        { id: 'char_3', name: 'Pink Princess', sprite: 'char_preset_3.png' },
        { id: 'char_4', name: 'Street Style', sprite: 'char_preset_4.png' },
        { id: 'char_5', name: 'Fantasy Mage', sprite: 'char_preset_5.png' },
        { id: 'char_6', name: 'Sleepy Time', sprite: 'char_preset_6.png' }
    ],
    
    getItem(id) {
        return this.characters.find(c => c.id === id);
    }
};

export const AvatarRenderer = {
    assets: {},
    
    setAssets(assets) {
        this.assets = assets;
    },
    
    render(ctx, avatarData, width, height) {
        // New render logic: Just draw the single full-body image
        // avatarData is { items: [{id: 'char_1'}] }
        
        ctx.save();
        
        if (avatarData && Array.isArray(avatarData.items) && avatarData.items.length > 0) {
            const charId = avatarData.items[0].id;
            const itemDef = ItemDatabase.getItem(charId);
            
            if (itemDef) {
                const img = this.assets[itemDef.sprite];
                if (img) {
                    ctx.drawImage(img, 0, 0, width, height);
                }
            } else {
                // Fallback if ID invalid (migration/debug)
                const fallback = this.assets['char_preset_1.png'];
                if (fallback) ctx.drawImage(fallback, 0, 0, width, height);
            }
        }
        
        ctx.restore();
    },
    
    renderItemPreview(ctx, item) {
        // For gacha or inventory - although we removed inventory logic mostly
        // This is kept for compatibility if needed
        const img = this.assets[item.sprite];
        if (img) {
             ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    },

    renderAvatarPreview(ctx, avatarData) {
        this.render(ctx, avatarData, ctx.canvas.width, ctx.canvas.height);
    }
};