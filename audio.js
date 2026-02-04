export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {};
    }
    
    async load(files) {
        const promises = files.map(file => {
            return new Promise(async (resolve, reject) => {
                try {
                    const response = await fetch(file);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                    this.sounds[file] = audioBuffer;
                    resolve();
                } catch(e) {
                    console.warn("Failed to load sound", file);
                    resolve(); // Resolve anyway to continue
                }
            });
        });
        await Promise.all(promises);
    }
    
    play(name, loop = false) {
        if (!this.sounds[name]) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        const source = this.ctx.createBufferSource();
        source.buffer = this.sounds[name];
        source.connect(this.ctx.destination);
        source.loop = loop;
        source.start(0);
        return source;
    }
}