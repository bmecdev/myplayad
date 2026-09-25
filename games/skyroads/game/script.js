// Skyroads Retro Arcade - MyPlayAd
// Pseudo-3D Space Runway & Jump Engine (Canvas 200x160)
// High-Contrast Road Palettes, 11-Lane Architecture with 2-Block Separation & 2-Block Jump Chasms
// Single-Click Jump (No Auto-Jump/Bunnyhopping), Jump Strictly on Solid Track (No Jumping in Holes), Progressive Difficulty Curve

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const playerNickElement = document.getElementById('player-nick');
const livesCountElement = document.getElementById('lives-count');
const speedMeterElement = document.getElementById('speed-meter');
const gameOverOverlay = document.getElementById('game-over-overlay');
const waitingOverlay = document.getElementById('waiting-overlay');
const mainScreen = document.getElementById('main-screen');
const rankingList = document.getElementById('ranking-list');
const videoRankingList = document.getElementById('video-ranking-list');
const qrCodeImg = document.getElementById('qr-code-img');

const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 160;
const HORIZON_Y = 68;
const FOV = 110;

// ==========================================
// 🌌 High-Contrast Level Environments Configuration
// ==========================================
const ENVIRONMENTS = {
    1: {
        name: "ÓRBITA LUNAR",
        skyTop: "#02050f",
        skyMid: "#061329",
        skyBottom: "#0c2445",
        horizonGlow: "rgba(0, 210, 255, 0.4)",
        horizonLine: "#00d2ff",
        starsColor: ['#00d2ff', '#ffffff', '#ffb703'],
        trackTile1: '#5a6e82',
        trackTile2: '#415467',
        trackBorder: '#00ffff',
        flankBorder: '#ffe600',       // Solar hazard gold on side flank platforms
        slabColor: '#1d2a36',         // 3D vertical drop-off cliff wall
        abyssEdge: 'rgba(0, 255, 255, 0.45)',
        theme: 'lunar'
    },
    2: {
        name: "VALLE DE MARTE",
        skyTop: "#150207",
        skyMid: "#330713",
        skyBottom: "#560e1c",
        horizonGlow: "rgba(255, 60, 0, 0.5)",
        horizonLine: "#ff3700",
        starsColor: ['#ff8500', '#ff3700', '#ffd6a5'],
        trackTile1: '#6e7a82',
        trackTile2: '#535e66',
        trackBorder: '#00f5d4',       // Vibrant mint-cyan (complementary pop against red)
        flankBorder: '#ffea00',       // Hazard amber on side flank platforms
        slabColor: '#2b1b1a',         // Volcanic drop-off cliff wall
        abyssEdge: 'rgba(255, 60, 0, 0.5)',
        theme: 'mars'
    },
    3: {
        name: "NEBULOSA JADE",
        skyTop: "#010e08",
        skyMid: "#042314",
        skyBottom: "#0a3821",
        horizonGlow: "rgba(61, 255, 138, 0.45)",
        horizonLine: "#39ff14",
        starsColor: ['#39ff14', '#ffffff', '#80ffdb'],
        trackTile1: '#6d5e7a',
        trackTile2: '#554760',
        trackBorder: '#39ff14',       // Acid lime
        flankBorder: '#ff00aa',       // Neon magenta on side flank platforms
        slabColor: '#20162b',         // Dark violet drop-off cliff wall
        abyssEdge: 'rgba(57, 255, 20, 0.5)',
        theme: 'jade'
    },
    4: {
        name: "SYNTHWAVE SUNSET",
        skyTop: "#120021",
        skyMid: "#35004a",
        skyBottom: "#610066",
        horizonGlow: "rgba(255, 0, 127, 0.5)",
        horizonLine: "#ff007f",
        starsColor: ['#ff007f', '#00f5d4', '#ffffff'],
        trackTile1: '#4a728a',
        trackTile2: '#335469',
        trackBorder: '#ff007f',       // Hot pink
        flankBorder: '#00ffff',       // Electric cyan on side flank platforms
        slabColor: '#152533',         // Dark drop-off cliff wall
        abyssEdge: 'rgba(255, 0, 127, 0.5)',
        theme: 'synthwave'
    }
};

function getStageEnv(stage) {
    const key = ((stage - 1) % 4) + 1;
    return ENVIRONMENTS[key] || ENVIRONMENTS[1];
}

// ==========================================
// 📈 Progressive Difficulty Configuration per Level
// ==========================================
function getStageConfig(stage) {
    if (stage === 1) {
        return {
            diffName: "FÁCIL",
            diffColor: "#3dff8a",
            baseSpeed: 120,
            turboSpeed: 180,
            brakeSpeed: 75,
            patternCount: 14,
            gapBlocks: 2, // Gaps of exactly 2 blocks of distance
            allowObstacles: false,
            desc: "Huecos de 2 bloques de distancia"
        };
    } else if (stage === 2) {
        return {
            diffName: "INTERMEDIA",
            diffColor: "#ffea00",
            baseSpeed: 145,
            turboSpeed: 210,
            brakeSpeed: 80,
            patternCount: 20,
            gapBlocks: 2,
            allowObstacles: true,
            desc: "Huecos de 2 bloques y terrazas laterales"
        };
    } else if (stage === 3) {
        return {
            diffName: "DIFÍCIL",
            diffColor: "#ff8500",
            baseSpeed: 165,
            turboSpeed: 235,
            brakeSpeed: 85,
            patternCount: 26,
            gapBlocks: 3,
            allowObstacles: true,
            desc: "Gran vacío central y saltos de 2-3 bloques"
        };
    } else {
        return {
            diffName: "EXPERTO",
            diffColor: "#ff4d6d",
            baseSpeed: 185,
            turboSpeed: 250,
            brakeSpeed: 90,
            patternCount: 32,
            gapBlocks: 3,
            allowObstacles: true,
            desc: "Velocidad extrema y mega abismos"
        };
    }
}

// ==========================================
// 🔊 Retro Arcade Web Audio API Synthesizer
// ==========================================
class SkyroadsAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.engineOsc = null;
        this.engineGain = null;
    }

    init() {
        if (!this.ctx) {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                this.ctx = new AudioCtx();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
                this.startEngineDrone();
            } catch (e) {}
        }
        this.resume();
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => this.updateUI()).catch(() => {});
        } else if (this.ctx && this.ctx.state === 'running') {
            this.updateUI();
        }
    }

    updateUI() {
        const btn = document.getElementById('audio-toggle-btn');
        if (!btn) return;
        if (this.ctx && this.ctx.state === 'running') {
            btn.textContent = '🔊 AUDIO: ON';
            btn.classList.remove('muted');
        } else {
            btn.textContent = '🔇 AUDIO: OFF';
            btn.classList.add('muted');
        }
    }

    startEngineDrone() {
        if (!this.ctx || this.engineOsc) return;
        try {
            this.engineOsc = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();
            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(65, this.ctx.currentTime);
            this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(220, this.ctx.currentTime);

            this.engineOsc.connect(filter);
            filter.connect(this.engineGain);
            this.engineGain.connect(this.masterGain);
            this.engineOsc.start();
        } catch (e) {}
    }

    updateEngineSpeed(speedRatio) {
        if (!this.engineOsc || !this.ctx) return;
        try {
            const freq = 60 + speedRatio * 95;
            this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
        } catch (e) {}
    }

    playJump() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, t);
            osc.frequency.exponentialRampToValueAtTime(840, t + 0.18);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.2);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.2);
        } catch (e) {}
        broadcastSFX('jump');
    }

    playLand() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(140, t);
            osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.09);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.09);
        } catch (e) {}
        broadcastSFX('land');
    }

    playBoost() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(350, t);
            osc.frequency.exponentialRampToValueAtTime(950, t + 0.28);
            gain.gain.setValueAtTime(0.32, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.3);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.3);
        } catch (e) {}
        broadcastSFX('boost');
    }

    playCrash() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const bufferSize = this.ctx.sampleRate * 0.4;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, t);
            filter.frequency.linearRampToValueAtTime(100, t + 0.4);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.4);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            noise.start(t);
        } catch (e) {}
        broadcastSFX('crash');
    }

    playStageClear() {
        if (!this.ctx) return;
        this.resume();
        const notes = [330, 392, 523, 659];
        const t = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + idx * 0.12);
            gain.gain.setValueAtTime(0.28, t + idx * 0.12);
            gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.12 + 0.18);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.12);
            osc.stop(t + idx * 0.12 + 0.2);
        });
        broadcastSFX('clear');
    }
}
const audio = new SkyroadsAudio();

function broadcastSFX(sound, param = null) {
    if (typeof dataChannels === 'undefined') return;
    const payload = JSON.stringify({ type: 'sfx', sound, param });
    dataChannels.forEach(ch => {
        if (ch && ch.readyState === 'open') {
            try { ch.send(payload); } catch (e) {}
        }
    });
}

['pointerdown', 'click', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => {
        if (!audio.ctx) audio.init();
        else audio.resume();
    }, { passive: true });
});

window.addEventListener('DOMContentLoaded', () => {
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    if (audioToggleBtn) {
        audioToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!audio.ctx) audio.init();
            else audio.resume();
        });
    }
});

// ==========================================
// 🌌 Cosmic Starfield & Atmospheric Particles
// ==========================================
const STARS_COUNT = 65;
const stars = [];
for (let i = 0; i < STARS_COUNT; i++) {
    stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (HORIZON_Y + 10),
        size: Math.random() > 0.8 ? 1.5 : 1,
        colorIndex: Math.floor(Math.random() * 3),
        speed: 0.1 + Math.random() * 0.4
    });
}

const atmosphericParticles = [];
function initAtmosphericParticles(theme) {
    atmosphericParticles.length = 0;
    const count = theme === 'mars' ? 24 : (theme === 'jade' ? 20 : 0);
    for (let i = 0; i < count; i++) {
        atmosphericParticles.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * HORIZON_Y,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 5 - 2,
            size: Math.random() * 1.5 + 0.8,
            alpha: Math.random() * 0.7 + 0.3
        });
    }
}

// ==========================================
// 🏎️ Skyroads 11-Lane Architecture: 2 Blocks of Separation & 2-Block Chasms
// ==========================================
// 11 Lanes Architecture:
// Lanes 0 & 1: Plataforma Lateral Izquierda (2 bloques sólidos)
// Lanes 2 & 3: Canal de Abismo Izquierdo (2 BLOQUES DE DISTANCIA / SEPARACIÓN)
// Lanes 4, 5, 6: Calzada Central (3 bloques sólidos)
// Lanes 7 & 8: Canal de Abismo Derecho (2 BLOQUES DE DISTANCIA / SEPARACIÓN)
// Lanes 9 & 10: Plataforma Lateral Derecha (2 bloques sólidos)
const LANES_COUNT = 11;
const LANE_WIDTH = 12;
const TRACK_WIDTH = LANES_COUNT * LANE_WIDTH; // 132 units wide (-66 to +66)
const SEGMENT_LENGTH = 32;

// Tile types:
// 0: HUECO (Abismo/Vacío - Caída libre)
// 1: PISTA SÓLIDA (Carretera estándar)
// 2: TURBO PAD (Acelerador)
// 3: JUMP PAD (Super Salto)
// 4: LOW GRAVITY (Flotación)
// 5: OBSTACLE CUBE (Bloque obstáculo)
// 9: WORMHOLE / FINISH GATE

const GameState = {
    running: false,
    gameOver: false,
    paused: false,
    score: 0,
    highScore: 0,
    lives: 3,
    stage: 1,
    stageIntroTimer: 0,
    currentNickname: 'Pilot',
    roomId: Math.random().toString(36).substring(2, 6).toUpperCase(),
    lastTime: 0,
    
    // Spaceship Physics with Aerodynamic & Micro-Movement Features
    ship: {
        x: 0,               // -66 to +66
        y: 0,               // Height above road (0 = ground level)
        z: 0,               // Forward distance
        vx: 0,              // Current steering velocity (smoothed)
        targetVx: 0,        // Target steering velocity
        vy: 0,              // Vertical velocity
        speed: 120,         // Forward speed (adjusted per stage difficulty)
        targetSpeed: 120,
        roll: 0,            // Dynamic tilt angle when banking (smoothed spring)
        pitch: 0,           // Nose pitch (up on ascent/turbo, down on descent/brake)
        yaw: 0,             // Lateral nose deflection
        hoverTimer: 0,      // Antigrav breathing suspension timer
        hoverOffset: 0,     // Vertical floating offset
        squash: 1.0,        // Squash on landing, stretch on jump
        onGround: true,
        isFalling: false,
        isCrashing: false,
        crashTimer: 0,
        boostTimer: 0,
        checkpointZ: 0
    },

    // Camera
    camera: {
        x: 0,
        y: 28,
        z: -45
    },

    // Track Segments Array
    track: [],
    totalTrackLength: 0,
    particles: [],
    popups: []
};

// Keyboard state tracker
const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    turbo: false
};

// Jump Single-Click State: A jump requires an individual click/press, NOT holding the button
let jumpKeyHeld = false;
let jumpConsumedForCurrentPress = false;

function updateKeyInputs() {
    let steer = 0;
    if (keys.left) steer -= 1;
    if (keys.right) steer += 1;
    GameState.ship.targetVx = steer * 115;

    const cfg = getStageConfig(GameState.stage);
    if (keys.turbo) {
        GameState.ship.targetSpeed = cfg.turboSpeed;
    } else if (keys.down) {
        GameState.ship.targetSpeed = cfg.brakeSpeed;
    } else {
        GameState.ship.targetSpeed = cfg.baseSpeed;
    }
}

// ==========================================
// 🗺️ Level Track Generators (2 Blocks of Distance Everywhere)
// ==========================================
function generateTrack(stageNumber) {
    const cfg = getStageConfig(stageNumber);
    const segments = [];
    let currentZ = 0;

    // 1. Initial Solid Runway (7 segments with 2 blocks of lateral distance between platforms)
    for (let i = 0; i < 7; i++) {
        segments.push({
            z: currentZ,
            length: SEGMENT_LENGTH,
            tiles: [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1], // Flanks (0,1), 2 blocks void (2,3), center (4,5,6), 2 blocks void (7,8), Flanks (9,10)
            obstacle: null
        });
        currentZ += SEGMENT_LENGTH;
    }

    const patternCount = cfg.patternCount;

    for (let p = 0; p < patternCount; p++) {
        const rand = Math.random();

        if (stageNumber === 1) {
            // ==========================================
            // NIVEL 1: FÁCIL (Huecos de exactamente 2 BLOQUES DE DISTANCIA, 0 obstáculos)
            // ==========================================
            if (rand < 0.45) {
                // Hueco de salto de EXACTAMENTE 2 BLOQUES DE DISTANCIA (2 segmentos completos)
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 2, 2, 2, 0, 0, 1, 1], obstacle: null }); // Turbo prep
                currentZ += SEGMENT_LENGTH;
                // BLOQUE DE VACÍO 1
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], obstacle: null });
                currentZ += SEGMENT_LENGTH;
                // BLOQUE DE VACÍO 2
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], obstacle: null });
                currentZ += SEGMENT_LENGTH;
                // Aterrizaje seguro
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1], obstacle: null });
                currentZ += SEGMENT_LENGTH;
            } else if (rand < 0.75) {
                // Terrazas laterales con turbo separadas por 2 bloques de distancia
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [2, 2, 0, 0, 1, 1, 1, 0, 0, 2, 2], obstacle: null });
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1], obstacle: null });
                currentZ += SEGMENT_LENGTH;
            } else {
                // Pista continua estándar
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1], obstacle: null });
                currentZ += SEGMENT_LENGTH;
            }
        } else if (stageNumber === 2) {
            // ==========================================
            // NIVEL 2: INTERMEDIO (Huecos de 2 bloques, terrazas laterales, algunos bloques)
            // ==========================================
            if (rand < 0.38) {
                // Salto de 2 bloques de distancia
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 2, 2, 2, 0, 0, 1, 1], obstacle: null });
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], obstacle: null }); // Bloque 1
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], obstacle: null }); // Bloque 2
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1], obstacle: null });
                currentZ += SEGMENT_LENGTH;
            } else if (rand < 0.68) {
                // Vacío central de 2 bloques: obliga a circular por los costados
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1], obstacle: null });
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1], obstacle: null });
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1], obstacle: null });
                currentZ += SEGMENT_LENGTH;
            } else {
                // Bloque obstáculo en el carril central
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1], obstacle: { lane: 5 } });
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1], obstacle: null });
                currentZ += SEGMENT_LENGTH;
            }
        } else if (stageNumber === 3) {
            // ==========================================
            // NIVEL 3: DIFÍCIL (Gran Vacío Central, zig-zag flotante, huecos de 2-3 bloques)
            // ==========================================
            if (rand < 0.35) {
                // Gran vacío central de 3 bloques continuos
                for (let s = 0; s < 3; s++) {
                    const side = (s === 1) ? [2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2] : [1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1];
                    segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: side, obstacle: null });
                    currentZ += SEGMENT_LENGTH;
                }
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], obstacle: null });
                currentZ += SEGMENT_LENGTH;
            } else if (rand < 0.65) {
                // Zig-zag flotante: Flanco izq -> Salto de 2 bloques -> Flanco der
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], obstacle: null });
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], obstacle: null }); // Bloque 1
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], obstacle: null }); // Bloque 2
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1], obstacle: null });
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0], obstacle: null });
                currentZ += SEGMENT_LENGTH;
            } else {
                // Super salto sobre vacío de 2 bloques con obstáculo al aterrizar
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 3, 3, 3, 0, 0, 1, 1], obstacle: null });
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], obstacle: null });
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], obstacle: null });
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1], obstacle: { lane: 5 } });
                currentZ += SEGMENT_LENGTH;
            }
        } else {
            // ==========================================
            // NIVEL 4+: EXPERTO (Mega abismos de 3 bloques a alta velocidad)
            // ==========================================
            if (rand < 0.40) {
                // Mega Salto Chasm de 3 bloques de distancia (96 unidades de vacío)
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 2, 2, 2, 0, 0, 1, 1], obstacle: null });
                currentZ += SEGMENT_LENGTH;
                for (let g = 0; g < 3; g++) {
                    segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], obstacle: null });
                    currentZ += SEGMENT_LENGTH;
                }
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1], obstacle: null });
                currentZ += SEGMENT_LENGTH;
            } else if (rand < 0.70) {
                // Vacío central prolongado de 4 bloques con terrazas estrechas
                for (let s = 0; s < 4; s++) {
                    segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], obstacle: null });
                    currentZ += SEGMENT_LENGTH;
                }
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1], obstacle: { lane: 5 } });
                currentZ += SEGMENT_LENGTH;
            } else {
                // Terrazas alternadas con huecos laterales escalonados
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [2, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0], obstacle: null });
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], obstacle: null });
                currentZ += SEGMENT_LENGTH;
                segments.push({ z: currentZ, length: SEGMENT_LENGTH, tiles: [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2], obstacle: null });
                currentZ += SEGMENT_LENGTH;
            }
        }
    }

    // Final Runway & Wormhole Gate
    for (let i = 0; i < 6; i++) {
        segments.push({
            z: currentZ,
            length: SEGMENT_LENGTH,
            tiles: [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1],
            obstacle: null
        });
        currentZ += SEGMENT_LENGTH;
    }

    // Finish Gate segment
    segments.push({
        z: currentZ,
        length: SEGMENT_LENGTH,
        tiles: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
        isFinish: true
    });
    currentZ += SEGMENT_LENGTH;

    GameState.track = segments;
    GameState.totalTrackLength = currentZ;
}

// ==========================================
// 🕹️ Game Initialization & Lifecycle
// ==========================================
function startNewGame() {
    GameState.score = 0;
    GameState.lives = 3;
    GameState.stage = 1;
    GameState.gameOver = false;
    GameState.running = true;
    GameState.particles = [];
    GameState.popups = [];

    const env = getStageEnv(GameState.stage);
    initAtmosphericParticles(env.theme);
    generateTrack(GameState.stage);
    resetShip();
    GameState.stageIntroTimer = 2.4;
    audio.init();

    gameOverOverlay.classList.add('hidden');
    waitingOverlay.classList.add('hidden');
    updateUI();
}

function resetShip(keepCheckpoint = false) {
    const cfg = getStageConfig(GameState.stage);
    const ship = GameState.ship;
    ship.x = 0;
    ship.y = 0;
    ship.z = keepCheckpoint ? ship.checkpointZ : 0;
    ship.vx = 0;
    ship.targetVx = 0;
    ship.vy = 0;
    ship.speed = cfg.baseSpeed;
    ship.targetSpeed = cfg.baseSpeed;
    ship.roll = 0;
    ship.pitch = 0;
    ship.yaw = 0;
    ship.hoverTimer = 0;
    ship.hoverOffset = 0;
    ship.squash = 1.0;
    ship.onGround = true;
    ship.isFalling = false;
    ship.isCrashing = false;
    ship.crashTimer = 0;
    ship.boostTimer = 0;
    jumpKeyHeld = false;
    jumpConsumedForCurrentPress = false;
}

function handleShipCrash(reason = '¡CAÍDA AL VACÍO!') {
    const ship = GameState.ship;
    if (ship.isCrashing) return;

    ship.isCrashing = true;
    ship.crashTimer = 1.3;
    audio.playCrash();

    const env = getStageEnv(GameState.stage);

    // Create explosion debris particles
    for (let i = 0; i < 35; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 20 + Math.random() * 80;
        GameState.particles.push({
            x: ship.x,
            y: ship.y + 4,
            z: ship.z,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd + 30,
            vz: (Math.random() - 0.5) * 50,
            life: 0.6 + Math.random() * 0.5,
            color: Math.random() > 0.5 ? '#ff4d6d' : (Math.random() > 0.5 ? '#ffb703' : env.trackBorder),
            size: 2.5
        });
    }

    addPopup(reason, '#ff4d6d');
    GameState.lives--;
    updateUI();

    if (GameState.lives <= 0) {
        setTimeout(endGame, 1200);
    } else {
        setTimeout(() => {
            resetShip(true);
            GameState.stageIntroTimer = 1.2;
        }, 1300);
    }
}

function nextStage() {
    audio.playStageClear();
    GameState.score += 1000 * GameState.stage;
    GameState.stage++;
    const env = getStageEnv(GameState.stage);
    const cfg = getStageConfig(GameState.stage);
    initAtmosphericParticles(env.theme);
    addPopup(`¡${env.name} - NIVEL ${GameState.stage}!`, env.trackBorder);
    generateTrack(GameState.stage);
    resetShip(false);
    GameState.stageIntroTimer = 2.6;
    updateUI();
}

function endGame() {
    GameState.running = false;
    GameState.gameOver = true;
    gameOverOverlay.classList.remove('hidden');

    saveScore(GameState.currentNickname, GameState.score);

    // Notify mobile controller
    dataChannels.forEach(ch => {
        if (ch && ch.readyState === 'open') {
            try {
                ch.send(JSON.stringify({ type: 'game_over', score: GameState.score }));
            } catch (e) {}
        }
    });

    const videoOverlay = document.getElementById('video-ranking-overlay');
    if (videoOverlay) {
        videoOverlay.classList.remove('hidden');
        if (typeof fetchAndShowUpcomingGames === 'function') {
            fetchAndShowUpcomingGames();
        }
        setTimeout(() => {
            if (!GameState.running) videoOverlay.classList.add('hidden');
        }, 5000);
    }
}

// ==========================================
// 🚀 Strict Solid Road Jump Detection
// Rule 1: The ship CANNOT jump over holes or while in the air (strictly on solid track)
// Rule 2: Single-click jumping (no continuous bunnyhopping by holding button down)
// ==========================================
function isShipOnSolidRoad() {
    const ship = GameState.ship;
    // Cannot jump if crashing or already falling into the abyss
    if (ship.isCrashing || ship.isFalling) return false;
    // Must be on the road surface
    if (!ship.onGround && ship.y > 1.2) return false;

    // Find current track segment beneath the ship
    const seg = GameState.track.find(s => ship.z >= s.z && ship.z < s.z + s.length);
    if (!seg) return false;

    // Find current lane index (0 to 10)
    const laneIndex = Math.floor((ship.x + TRACK_WIDTH / 2) / LANE_WIDTH);
    if (laneIndex < 0 || laneIndex >= LANES_COUNT) return false; // Over side void

    const tile = seg.tiles[laneIndex];
    // Tile 0 is HUECO (Abismo/Vacío). Cannot jump in a hole!
    if (tile === 0) return false;

    return true;
}

function requestJump() {
    // Cannot auto-jump while holding button down: must be a fresh press!
    if (jumpConsumedForCurrentPress) return;

    if (isShipOnSolidRoad()) {
        performJump();
        jumpConsumedForCurrentPress = true; // Mark as consumed for this press
    }
}

function releaseJump() {
    jumpKeyHeld = false;
    jumpConsumedForCurrentPress = false; // Reset so next press can jump
}

function performJump() {
    audio.init();
    const ship = GameState.ship;
    ship.vy = 160;
    ship.y = Math.max(ship.y, 0.5);
    ship.onGround = false;
    ship.squash = 1.25; // Vertical stretch on liftoff
    audio.playJump();
    createJumpSparks();
}

function createJumpSparks() {
    const ship = GameState.ship;
    const env = getStageEnv(GameState.stage);
    for (let i = 0; i < 14; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 15 + Math.random() * 35;
        GameState.particles.push({
            x: ship.x + (Math.random() - 0.5) * 6,
            y: 0.5,
            z: ship.z - 2,
            vx: Math.cos(ang) * spd,
            vy: Math.random() * 25 + 5,
            vz: Math.sin(ang) * spd - 15,
            life: 0.25,
            color: env.trackBorder,
            size: 1.8
        });
    }
}

// ==========================================
// 🚀 Physics & Collision Loop
// ==========================================
function update(dt) {
    if (!GameState.running || GameState.gameOver) return;

    if (GameState.stageIntroTimer > 0) {
        GameState.stageIntroTimer -= dt;
        return;
    }

    const ship = GameState.ship;
    const cfg = getStageConfig(GameState.stage);

    // Handle Crashing Delay
    if (ship.isCrashing) {
        ship.crashTimer -= dt;
        updateParticles(dt);
        return;
    }

    // Boost timer
    if (ship.boostTimer > 0) {
        ship.boostTimer -= dt;
        ship.speed = cfg.turboSpeed;
    } else {
        ship.speed += (ship.targetSpeed - ship.speed) * 4 * dt;
    }

    // Engine sound modulation
    audio.updateEngineSpeed(ship.speed / 220);

    // 1. Horizontal Movement & Non-Linear Aerodynamics
    ship.vx += (ship.targetVx - ship.vx) * 15 * dt;
    ship.x += ship.vx * dt;

    // Boundary clamp with safety margins across 11 lanes (-66 to +66)
    if (ship.x < -68) {
        ship.x = -68;
        ship.vx = 0;
    } else if (ship.x > 68) {
        ship.x = 68;
        ship.vx = 0;
    }

    // Smooth banking roll spring
    const targetRoll = (ship.vx / 115) * 0.40;
    ship.roll += (targetRoll - ship.roll) * 12 * dt;

    // Lateral nose yaw tilt
    ship.yaw = (ship.vx / 115) * 0.16;

    // Vertical pitch lean (climb vs descent & turbo pitch)
    const targetPitch = (ship.vy / 220) * 0.28 + (ship.speed > 160 ? -0.06 : 0);
    ship.pitch += (targetPitch - ship.pitch) * 10 * dt;

    // Antigravity hover breathing bobbing
    ship.hoverTimer += dt;
    ship.hoverOffset = ship.onGround ? Math.sin(ship.hoverTimer * 8.0) * 0.75 : 0;

    // Squash & Stretch elastic recovery
    ship.squash += (1.0 - ship.squash) * 14 * dt;

    // 2. Forward Distance Advance
    ship.z += ship.speed * dt;
    GameState.score += Math.floor(ship.speed * dt * 0.5);

    // Update Checkpoint along track
    if (ship.onGround && Math.floor(ship.z) % 250 < 10) {
        ship.checkpointZ = Math.floor(ship.z);
    }

    // 3. Vertical Physics (Gravity & Jumps)
    const GRAVITY = -340;
    ship.vy += GRAVITY * dt;
    ship.y += ship.vy * dt;

    // 4. Ground Collision Detection with 11-Lane Track
    const currentSegment = GameState.track.find(seg => ship.z >= seg.z && ship.z < seg.z + seg.length);

    if (currentSegment) {
        // Determine lane index (0 to 10)
        const laneIndex = Math.floor((ship.x + TRACK_WIDTH / 2) / LANE_WIDTH);
        const tileType = (laneIndex >= 0 && laneIndex < LANES_COUNT) ? currentSegment.tiles[laneIndex] : 0;

        // Check if reached Finish Wormhole Gate
        if (currentSegment.isFinish || tileType === 9) {
            nextStage();
            return;
        }

        // Check if above road level or falling through gap
        if (ship.y <= 0) {
            if (tileType === 0) {
                // HUECO / GAP / VOID! No solid road beneath!
                ship.onGround = false;
                ship.isFalling = true;
                if (ship.y < -35) {
                    handleShipCrash('¡CAÍSTE AL VACÍO!');
                    return;
                }
            } else {
                // SOLID TILE! Safe Landing
                const wasAirborne = !ship.onGround && ship.vy < -50;
                ship.y = 0;
                ship.vy = 0;
                ship.onGround = true;
                ship.isFalling = false;

                if (wasAirborne) {
                    ship.squash = 0.80; // Landing squash impact
                    audio.playLand();
                    createLandingSparks();
                }

                // Interactive Pads
                if (tileType === 2) {
                    // Turbo Booster
                    if (ship.boostTimer <= 0) {
                        ship.boostTimer = 2.0;
                        audio.playBoost();
                        addPopup('¡TURBO!', '#ffb703');
                    }
                } else if (tileType === 3) {
                    // Super Jump Pad
                    ship.vy = 225;
                    ship.onGround = false;
                    ship.squash = 1.35;
                    audio.playJump();
                    addPopup('¡SUPER SALTO!', '#ff00ff');
                }
            }
        }

        // Check Obstacle Cube Collision
        if (currentSegment.obstacle && currentSegment.obstacle.lane === laneIndex) {
            if (ship.y < 12) {
                handleShipCrash('¡IMPACTO CON BLOQUE!');
                return;
            }
        }
    } else if (ship.z > GameState.totalTrackLength) {
        nextStage();
        return;
    } else if (ship.y <= 0) {
        // Past track or off-grid
        ship.isFalling = true;
        if (ship.y < -35) {
            handleShipCrash('¡FUERA DE PISTA!');
            return;
        }
    }

    // Engine Exhaust & Wingtip Contrails
    createExhaustParticles();
    createWingtipTrails();
    updateAtmosphericParticles(dt);
    updateParticles(dt);
    updatePopups(dt);
    updateUI();
}

function createExhaustParticles() {
    const ship = GameState.ship;
    if (ship.isCrashing || ship.isFalling) return;
    const env = getStageEnv(GameState.stage);

    for (let i = 0; i < 2; i++) {
        GameState.particles.push({
            x: ship.x + (Math.random() - 0.5) * 4,
            y: ship.y + 2 + ship.hoverOffset,
            z: ship.z - 4,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 4,
            vz: -ship.speed * 0.3,
            life: 0.22,
            color: ship.boostTimer > 0 ? '#ffb703' : (env.theme === 'mars' ? '#ff3700' : '#00d2ff'),
            size: ship.boostTimer > 0 ? 2.5 : 1.8
        });
    }
}

function createWingtipTrails() {
    const ship = GameState.ship;
    if (ship.isCrashing || ship.isFalling) return;
    if (Math.abs(ship.vx) > 35) {
        const env = getStageEnv(GameState.stage);
        const tipX = ship.vx > 0 ? -12 : 12; // Outer wingtip streamer
        GameState.particles.push({
            x: ship.x + tipX,
            y: ship.y + 1 + ship.hoverOffset,
            z: ship.z - 3,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 2,
            vz: -ship.speed * 0.25,
            life: 0.16,
            color: env.flankBorder,
            size: 1.2
        });
    }
}

function createLandingSparks() {
    const ship = GameState.ship;
    const env = getStageEnv(GameState.stage);
    for (let i = 0; i < 12; i++) {
        const ang = Math.random() * Math.PI * 2;
        GameState.particles.push({
            x: ship.x,
            y: 0.5,
            z: ship.z,
            vx: Math.cos(ang) * 35,
            vy: Math.random() * 20 + 10,
            vz: Math.sin(ang) * 35,
            life: 0.28,
            color: env.flankBorder,
            size: 1.5
        });
    }
}

function updateAtmosphericParticles(dt) {
    atmosphericParticles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < 0) {
            p.y = HORIZON_Y;
            p.x = Math.random() * CANVAS_WIDTH;
        }
        if (p.x < 0) p.x = CANVAS_WIDTH;
        if (p.x > CANVAS_WIDTH) p.x = 0;
    });
}

function updateParticles(dt) {
    for (let i = GameState.particles.length - 1; i >= 0; i--) {
        const p = GameState.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.life -= dt;
        if (p.life <= 0) {
            GameState.particles.splice(i, 1);
        }
    }
}

function addPopup(text, color = '#ffea00') {
    GameState.popups.push({
        text,
        color,
        y: 80,
        alpha: 1.0,
        timer: 1.0
    });
}

function updatePopups(dt) {
    for (let i = GameState.popups.length - 1; i >= 0; i--) {
        const pop = GameState.popups[i];
        pop.timer -= dt;
        pop.y -= 8 * dt;
        pop.alpha = Math.max(0, pop.timer);
        if (pop.timer <= 0) {
            GameState.popups.splice(i, 1);
        }
    }
}

// ==========================================
// 🎨 Pseudo-3D Perspective Projection
// ==========================================
function project(x, y, z, cam) {
    const relZ = z - cam.z;
    if (relZ <= 2) return null; // Behind camera

    const scale = FOV / relZ;
    const sx = CANVAS_WIDTH / 2 + (x - cam.x) * scale;
    const sy = HORIZON_Y - (y - cam.y) * scale;

    return { x: sx, y: sy, scale, relZ };
}

// ==========================================
// 🖌️ Render Loop
// ==========================================
function render() {
    const env = getStageEnv(GameState.stage);

    // 1. Sky & Celestial Environment Rendering
    renderSkyAndCelestial(env);

    // 2. Stars & Atmospheric Embers
    renderStarsAndAtmosphere(env);

    // 3. Horizon Cyber Grid Glow
    ctx.strokeStyle = env.horizonGlow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, HORIZON_Y);
    ctx.lineTo(CANVAS_WIDTH, HORIZON_Y);
    ctx.stroke();

    ctx.strokeStyle = env.horizonLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HORIZON_Y);
    ctx.lineTo(CANVAS_WIDTH, HORIZON_Y);
    ctx.stroke();

    // Camera follow calculation with smooth vertical elevation
    const ship = GameState.ship;
    const cam = GameState.camera;
    cam.x = ship.x * 0.45;
    cam.y = Math.max(22, (ship.y + ship.hoverOffset) * 0.35 + 28);
    cam.z = ship.z - 45;

    // 4. Render Track Segments (11 Lanes with 2-Block Separation & 3D Cliff Slabs)
    const visibleMaxZ = cam.z + 520;
    const visibleMinZ = cam.z + 4;

    const visibleSegments = GameState.track.filter(seg => seg.z + seg.length >= visibleMinZ && seg.z <= visibleMaxZ);
    visibleSegments.sort((a, b) => b.z - a.z); // Back to front

    const SLAB_DEPTH = -6; // Thickness of the floating 3D platform slab

    visibleSegments.forEach(seg => {
        const zNear = seg.z;
        const zFar = seg.z + seg.length;

        for (let l = 0; l < LANES_COUNT; l++) {
            const tile = seg.tiles[l];
            const laneLeftX = -TRACK_WIDTH / 2 + l * LANE_WIDTH;
            const laneRightX = laneLeftX + LANE_WIDTH;

            const pNearL = project(laneLeftX, 0, zNear, cam);
            const pNearR = project(laneRightX, 0, zNear, cam);
            const pFarL = project(laneLeftX, 0, zFar, cam);
            const pFarR = project(laneRightX, 0, zFar, cam);

            if (!pNearL || !pNearR || !pFarL || !pFarR) continue;

            if (tile === 0) {
                // HUECO / GAP: Render glowing chasm abyss edges
                ctx.strokeStyle = env.abyssEdge;
                ctx.lineWidth = 0.9;
                ctx.beginPath();
                ctx.moveTo(pNearL.x, pNearL.y);
                ctx.lineTo(pFarL.x, pFarL.y);
                ctx.stroke();
                continue;
            }

            // Render 3D Slab Drop-Off Walls (Platform Thickness)
            const pNearL_sub = project(laneLeftX, SLAB_DEPTH, zNear, cam);
            const pNearR_sub = project(laneRightX, SLAB_DEPTH, zNear, cam);
            const pFarL_sub = project(laneLeftX, SLAB_DEPTH, zFar, cam);
            const pFarR_sub = project(laneRightX, SLAB_DEPTH, zFar, cam);

            // Left drop-off wall if facing a gap or outer flank
            if ((l === 0 || seg.tiles[l - 1] === 0) && pNearL && pFarL && pNearL_sub && pFarL_sub) {
                ctx.fillStyle = env.slabColor;
                ctx.beginPath();
                ctx.moveTo(pNearL.x, pNearL.y);
                ctx.lineTo(pFarL.x, pFarL.y);
                ctx.lineTo(pFarL_sub.x, pFarL_sub.y);
                ctx.lineTo(pNearL_sub.x, pNearL_sub.y);
                ctx.closePath();
                ctx.fill();
            }

            // Right drop-off wall if facing a gap or outer flank
            if ((l === LANES_COUNT - 1 || seg.tiles[l + 1] === 0) && pNearR && pFarR && pNearR_sub && pFarR_sub) {
                ctx.fillStyle = env.slabColor;
                ctx.beginPath();
                ctx.moveTo(pNearR.x, pNearR.y);
                ctx.lineTo(pFarR.x, pFarR.y);
                ctx.lineTo(pFarR_sub.x, pFarR_sub.y);
                ctx.lineTo(pNearR_sub.x, pNearR_sub.y);
                ctx.closePath();
                ctx.fill();
            }

            // Solid Tile Top Surface Colors (High-contrast against environment)
            let fillColor = (Math.floor(seg.z / SEGMENT_LENGTH) + l) % 2 === 0 ? env.trackTile1 : env.trackTile2;
            let edgeColor = env.trackBorder;

            // Highlight outer flank platforms (lanes 0, 1 and 9, 10)
            if (l === 0 || l === 1 || l === LANES_COUNT - 2 || l === LANES_COUNT - 1) {
                edgeColor = env.flankBorder;
            }

            if (tile === 2) {
                // Turbo Pad
                fillColor = '#ffd000';
                edgeColor = '#ffffff';
            } else if (tile === 3) {
                // Super Jump Pad
                fillColor = '#ff00aa';
                edgeColor = '#ffffff';
            } else if (tile === 9) {
                // Finish Wormhole
                fillColor = '#3dff8a';
                edgeColor = '#ffffff';
            }

            // Draw Tile Top Polygon
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            ctx.moveTo(pNearL.x, pNearL.y);
            ctx.lineTo(pNearR.x, pNearR.y);
            ctx.lineTo(pFarR.x, pFarR.y);
            ctx.lineTo(pFarL.x, pFarL.y);
            ctx.closePath();
            ctx.fill();

            // Glowing Tile Border
            ctx.strokeStyle = edgeColor;
            ctx.lineWidth = Math.max(0.7, pNearL.scale * 0.45);
            ctx.stroke();

            // Chevron Patterns on Turbo / Jump Pads
            if (tile === 2 || tile === 3) {
                const pMidFar = project((laneLeftX + laneRightX) / 2, 0, zFar - 6, cam);
                if (pMidFar) {
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1.4;
                    ctx.beginPath();
                    ctx.moveTo(pNearL.x + (pNearR.x - pNearL.x) * 0.25, pNearL.y - 1);
                    ctx.lineTo(pMidFar.x, pMidFar.y);
                    ctx.lineTo(pNearR.x - (pNearR.x - pNearL.x) * 0.25, pNearR.y - 1);
                    ctx.stroke();
                }
            }
        }

        // Draw Obstacle Cubes on this segment
        if (seg.obstacle) {
            drawObstacleCube(seg, cam);
        }

        // Draw Finish Wormhole Portal Ring
        if (seg.isFinish) {
            drawWormholePortal(seg, cam);
        }
    });

    // 5. Draw Projected Drop-Shadow
    drawShipShadow(ship, cam);

    // 6. Draw Spaceship (Delta Interceptor with dynamic roll, fins & thrusters)
    if (!ship.isCrashing) {
        drawSpaceship(ship, cam);
    }

    // 7. Draw Particles (Exhaust, Sparks, Contrails)
    drawParticles(cam);

    // 8. HUD & UI Overlays
    renderHUD(env);
}

// Draw Distinct Celestial Objects & Sky by Environment
function renderSkyAndCelestial(env) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y + 15);
    skyGrad.addColorStop(0, env.skyTop);
    skyGrad.addColorStop(0.65, env.skyMid);
    skyGrad.addColorStop(1, env.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (env.theme === 'lunar') {
        // Level 1: Crescent Moon & Orbital Space Station
        ctx.fillStyle = '#eafff2';
        ctx.beginPath();
        ctx.arc(155, 22, 12, 0, Math.PI * 2);
        ctx.fill();
        // Moon Crater shadow
        ctx.fillStyle = env.skyMid;
        ctx.beginPath();
        ctx.arc(151, 20, 11, 0, Math.PI * 2);
        ctx.fill();

        // Orbital space station
        ctx.fillStyle = '#00d2ff';
        ctx.fillRect(45, 28, 8, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(48, 26, 2, 6);
        // Blinking beacon
        if (Math.sin(performance.now() * 0.006) > 0) {
            ctx.fillStyle = '#ff4d6d';
            ctx.fillRect(48, 25, 2, 1);
        }
    } else if (env.theme === 'mars') {
        // Level 2: Jagged Volcanic Mountain Ridges & Giant Phobos Moon
        ctx.fillStyle = '#24060d';
        ctx.beginPath();
        ctx.moveTo(0, HORIZON_Y);
        ctx.lineTo(25, 52);
        ctx.lineTo(55, HORIZON_Y);
        ctx.lineTo(95, 48);
        ctx.lineTo(135, HORIZON_Y);
        ctx.lineTo(170, 50);
        ctx.lineTo(CANVAS_WIDTH, HORIZON_Y);
        ctx.closePath();
        ctx.fill();

        // Giant Red Moon Phobos
        ctx.fillStyle = '#872418';
        ctx.beginPath();
        ctx.arc(52, 26, 16, 0, Math.PI * 2);
        ctx.fill();
        // Phobos craters
        ctx.fillStyle = '#5c130b';
        ctx.beginPath();
        ctx.arc(48, 22, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(58, 30, 3, 0, Math.PI * 2);
        ctx.fill();

        // Small moon Deimos
        ctx.fillStyle = '#ff8500';
        ctx.beginPath();
        ctx.arc(162, 18, 3.5, 0, Math.PI * 2);
        ctx.fill();
    } else if (env.theme === 'jade') {
        // Level 3: Toxic Aurora Clouds & Ringed Planet
        ctx.fillStyle = 'rgba(57, 255, 20, 0.07)';
        ctx.beginPath();
        ctx.ellipse(CANVAS_WIDTH / 2, 25, 80, 18, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // Ringed Gas Giant
        ctx.fillStyle = '#175432';
        ctx.beginPath();
        ctx.arc(145, 26, 14, 0, Math.PI * 2);
        ctx.fill();

        // Planet Neon Rings
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(145, 26, 26, 6, -0.3, 0, Math.PI * 2);
        ctx.stroke();
    } else if (env.theme === 'synthwave') {
        // Level 4: Giant 80s Striped Retro Sun
        const sunX = CANVAS_WIDTH / 2;
        const sunY = 48;
        const sunR = 22;

        const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
        sunGrad.addColorStop(0, '#ffe600');
        sunGrad.addColorStop(1, '#ff007f');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
        ctx.fill();

        // Retro scanline blinds across the sun
        ctx.fillStyle = env.skyBottom;
        for (let b = 0; b < 6; b++) {
            const barY = sunY + b * 3.5;
            const barH = 1 + b * 0.4;
            ctx.fillRect(sunX - sunR - 2, barY, (sunR + 2) * 2, barH);
        }
    }
}

function renderStarsAndAtmosphere(env) {
    // Stars
    stars.forEach(s => {
        ctx.fillStyle = env.starsColor[s.colorIndex % env.starsColor.length];
        ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    // Floating Atmospheric Particles (Embers on Mars, Spores on Jade)
    atmosphericParticles.forEach(p => {
        ctx.fillStyle = env.theme === 'mars' ? `rgba(255, 110, 0, ${p.alpha})` : `rgba(57, 255, 20, ${p.alpha})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
}

// Draw 3D Extruded Obstacle Block
function drawObstacleCube(seg, cam) {
    const laneX = -TRACK_WIDTH / 2 + seg.obstacle.lane * LANE_WIDTH + LANE_WIDTH / 2;
    const zMid = seg.z + SEGMENT_LENGTH / 2;
    const h = 14;
    const hw = 4.8;

    const bNearL = project(laneX - hw, 0, zMid - 4, cam);
    const bNearR = project(laneX + hw, 0, zMid - 4, cam);
    const tNearL = project(laneX - hw, h, zMid - 4, cam);
    const tNearR = project(laneX + hw, h, zMid - 4, cam);

    const tFarL = project(laneX - hw, h, zMid + 4, cam);
    const tFarR = project(laneX + hw, h, zMid + 4, cam);

    if (!bNearL || !bNearR || !tNearL || !tNearR) return;

    // Front Face
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.moveTo(bNearL.x, bNearL.y);
    ctx.lineTo(bNearR.x, bNearR.y);
    ctx.lineTo(tNearR.x, tNearR.y);
    ctx.lineTo(tNearL.x, tNearL.y);
    ctx.closePath();
    ctx.fill();

    // Top Face
    if (tFarL && tFarR) {
        ctx.fillStyle = '#ff758f';
        ctx.beginPath();
        ctx.moveTo(tNearL.x, tNearL.y);
        ctx.lineTo(tNearR.x, tNearR.y);
        ctx.lineTo(tFarR.x, tFarR.y);
        ctx.lineTo(tFarL.x, tFarL.y);
        ctx.closePath();
        ctx.fill();
    }

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// Draw Finish Wormhole Gate
function drawWormholePortal(seg, cam) {
    const zGate = seg.z + SEGMENT_LENGTH / 2;
    const pCenter = project(0, 24, zGate, cam);
    if (!pCenter) return;

    const radius = 38 * pCenter.scale;
    const pulse = Math.sin(performance.now() * 0.008) * 4;

    ctx.strokeStyle = '#3dff8a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(pCenter.x, pCenter.y, Math.max(6, radius + pulse), 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(61, 255, 138, 0.2)';
    ctx.fill();
}

// Projected Drop-Shadow Under Spaceship
function drawShipShadow(ship, cam) {
    if (ship.isFalling || ship.isCrashing) return;

    const pShadow = project(ship.x, 0, ship.z, cam);
    if (!pShadow) return;

    const shadowW = 14 * pShadow.scale;
    const shadowH = 4.5 * pShadow.scale;
    const alpha = Math.max(0.1, 0.65 - (ship.y / 60));

    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(pShadow.x, pShadow.y, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fill();
}

// Draw Player's Spaceship with Non-Linear Movement, Stabilizers & Asymmetric Thrusters
function drawSpaceship(ship, cam) {
    const p = project(ship.x, ship.y + ship.hoverOffset, ship.z, cam);
    if (!p) return;

    const scale = p.scale;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ship.roll);

    // Apply squash & stretch
    const squashX = 1 / Math.sqrt(ship.squash || 1.0);
    const squashY = ship.squash || 1.0;
    ctx.scale(squashX, squashY);

    const w = 19 * scale;
    const h = 12 * scale;
    const env = getStageEnv(GameState.stage);

    // 1. Aerodynamic Delta Wings
    ctx.fillStyle = '#162b3d';
    ctx.beginPath();
    ctx.moveTo(ship.yaw * w, -h * 0.65);       // Nose with yaw deflection
    ctx.lineTo(w, h * 0.42);                  // Right wingtip
    ctx.lineTo(w * 0.45, h * 0.22);           // Right inner fold
    ctx.lineTo(0, h * 0.12);                  // Center engine notch
    ctx.lineTo(-w * 0.45, h * 0.22);          // Left inner fold
    ctx.lineTo(-w, h * 0.42);                 // Left wingtip
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = env.trackBorder;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 2. Fuselage Center Hull
    ctx.fillStyle = '#264a66';
    ctx.beginPath();
    ctx.moveTo(ship.yaw * w, -h * 0.88);
    ctx.lineTo(w * 0.32, h * 0.12);
    ctx.lineTo(-w * 0.32, h * 0.12);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#eafff2';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // 3. Twin Vertical Stabilizer Fins (tilt dynamically with roll)
    const finTilt = ship.roll * 0.8;
    // Left fin
    ctx.fillStyle = '#10202e';
    ctx.beginPath();
    ctx.moveTo(-w * 0.38, h * 0.15);
    ctx.lineTo(-w * 0.32 - finTilt * 4, -h * 0.15);
    ctx.lineTo(-w * 0.26, h * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = env.trackBorder;
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // Right fin
    ctx.fillStyle = '#10202e';
    ctx.beginPath();
    ctx.moveTo(w * 0.26, h * 0.15);
    ctx.lineTo(w * 0.32 - finTilt * 4, -h * 0.15);
    ctx.lineTo(w * 0.38, h * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = env.trackBorder;
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // 4. Neon Cockpit Canopy with Specular Glint
    ctx.fillStyle = env.trackBorder;
    ctx.beginPath();
    ctx.ellipse(ship.yaw * w * 0.5, -h * 0.25, w * 0.14, h * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ship.yaw * w * 0.5 - w * 0.05, -h * 0.38, 1.6, 2.5);

    // 5. Twin Asymmetric Plasma Thruster Flames
    const turnFactor = ship.vx / 115; // -1 to +1
    const baseFlame = (ship.boostTimer > 0 ? 14 : 7) + Math.sin(performance.now() * 0.05) * 2;
    const leftFlame = Math.max(3, baseFlame * (1 + turnFactor * 0.55));
    const rightFlame = Math.max(3, baseFlame * (1 - turnFactor * 0.55));
    const flameColor = ship.boostTimer > 0 ? '#ffb703' : (env.theme === 'mars' ? '#ff3700' : '#00d2ff');
    const coreFlameColor = '#ffffff';

    // Left Thruster Flame
    ctx.fillStyle = flameColor;
    ctx.beginPath();
    ctx.moveTo(-w * 0.25, h * 0.15);
    ctx.lineTo(-w * 0.15, h * 0.15);
    ctx.lineTo(-w * 0.2, h * 0.15 + leftFlame);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = coreFlameColor;
    ctx.beginPath();
    ctx.moveTo(-w * 0.23, h * 0.15);
    ctx.lineTo(-w * 0.17, h * 0.15);
    ctx.lineTo(-w * 0.2, h * 0.15 + leftFlame * 0.5);
    ctx.closePath();
    ctx.fill();

    // Right Thruster Flame
    ctx.fillStyle = flameColor;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.15);
    ctx.lineTo(w * 0.25, h * 0.15);
    ctx.lineTo(w * 0.2, h * 0.15 + rightFlame);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = coreFlameColor;
    ctx.beginPath();
    ctx.moveTo(w * 0.17, h * 0.15);
    ctx.lineTo(w * 0.23, h * 0.15);
    ctx.lineTo(w * 0.2, h * 0.15 + rightFlame * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function drawParticles(cam) {
    GameState.particles.forEach(p => {
        const proj = project(p.x, p.y, p.z, cam);
        if (proj) {
            ctx.fillStyle = p.color;
            const size = Math.max(1, p.size * proj.scale);
            ctx.fillRect(proj.x - size / 2, proj.y - size / 2, size, size);
        }
    });
}

function renderHUD(env) {
    const cfg = getStageConfig(GameState.stage);

    // Stage Intro Banner with Level & Difficulty
    if (GameState.stageIntroTimer > 0) {
        ctx.font = '9px "Press Start 2P", monospace';
        ctx.fillStyle = env.trackBorder;
        ctx.textAlign = 'center';
        ctx.fillText(`NIVEL ${GameState.stage}`, CANVAS_WIDTH / 2, 58);

        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(env.name, CANVAS_WIDTH / 2, 70);

        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = cfg.diffColor;
        ctx.fillText(`DIFICULTAD: ${cfg.diffName}`, CANVAS_WIDTH / 2, 82);

        ctx.fillStyle = '#ffea00';
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.fillText(cfg.desc.toUpperCase(), CANVAS_WIDTH / 2, 94);
        ctx.textAlign = 'start';
    }

    // Floating Text Popups
    GameState.popups.forEach(pop => {
        ctx.save();
        ctx.globalAlpha = pop.alpha;
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = pop.color;
        ctx.textAlign = 'center';
        ctx.fillText(pop.text, CANVAS_WIDTH / 2, pop.y);
        ctx.restore();
    });

    // Runway Distance Progress Bar at Bottom
    const progress = Math.min(1, GameState.ship.z / GameState.totalTrackLength);
    const barW = 100;
    const barX = (CANVAS_WIDTH - barW) / 2;
    const barY = CANVAS_HEIGHT - 6;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX, barY, barW, 3);
    ctx.fillStyle = env.trackBorder;
    ctx.fillRect(barX, barY, barW * progress, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(barX + barW * progress - 1, barY - 1, 2, 5);
}

function updateUI() {
    scoreElement.textContent = `SCORE: ${GameState.score.toString().padStart(4, '0')}`;
    highScoreElement.textContent = `HI: ${GameState.highScore.toString().padStart(4, '0')}`;
    livesCountElement.textContent = GameState.lives;
    speedMeterElement.textContent = `KM/H: ${Math.floor(GameState.ship.speed * 1.5)}`;
}

// ==========================================
// 🔁 Game Loop & Lifecycle
// ==========================================
function gameLoop(timestamp) {
    if (!GameState.lastTime) GameState.lastTime = timestamp;
    const dt = Math.min((timestamp - GameState.lastTime) / 1000, 0.05);
    GameState.lastTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
}

// ==========================================
// 🏆 Hall of Fame
// ==========================================
function loadRanking() {
    try {
        const ranking = JSON.parse(localStorage.getItem('skyroads-ranking')) || [];
        if (ranking.length > 0) {
            GameState.highScore = ranking[0].score;
            updateUI();
        }
        displayRanking(ranking);
    } catch (e) {}
}

function saveScore(nickname, score) {
    if (score === 0) return;
    try {
        let ranking = JSON.parse(localStorage.getItem('skyroads-ranking')) || [];
        ranking = ranking.filter(entry => !(entry.name === nickname && entry.score < score));
        if (!ranking.some(entry => entry.name === nickname && entry.score === score)) {
            ranking.push({ name: nickname, score: score, date: new Date().toLocaleDateString() });
        }
        ranking.sort((a, b) => b.score - a.score);
        ranking = ranking.slice(0, 5);
        localStorage.setItem('skyroads-ranking', JSON.stringify(ranking));
        displayRanking(ranking);
    } catch (e) {}
}

function displayRanking(ranking) {
    if (rankingList) {
        rankingList.innerHTML = ranking.slice(0, 5).map((entry, idx) => `
            <li>
                <span class="rank">${idx + 1}.</span>
                <span class="nick">${entry.name.toUpperCase().substring(0, 10)}</span>
                <span class="score">${entry.score.toString().padStart(4, '0')}</span>
            </li>
        `).join('');
    }
    if (videoRankingList) {
        videoRankingList.innerHTML = ranking.slice(0, 5).map((entry, idx) => `
            <li>
                <span>${idx + 1}. ${entry.name.toUpperCase()}</span>
                <span>${entry.score.toString().padStart(4, '0')}</span>
            </li>
        `).join('');
    }
}

// ==========================================
// 📡 WebRTC Signaling & Handshake
// ==========================================
const peerConnections = new Map();
const dataChannels = new Map();
let socket = null;

function getControlUrl() {
    const baseUrl = CONFIG.CONTROL_URL || 'https://controllers.myplayad.com/skyroads';
    return baseUrl.includes('://')
        ? `${baseUrl}?room=${GameState.roomId}`
        : `${window.location.protocol}//${baseUrl}?room=${GameState.roomId}`;
}

function updateQrCode() {
    const controlUrl = getControlUrl();
    if (qrCodeImg) {
        qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(controlUrl)}&margin=10`;
    }
    const roomSpan = document.getElementById('room-id');
    if (roomSpan) roomSpan.textContent = `ID: ${GameState.roomId}`;
}

function connectSignaling() {
    const wsUrl = `wss://${CONFIG.SIGNALING_SERVER_URL || 'signaling.myplayad.com'}`;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        socket.send(JSON.stringify({
            type: 'register',
            role: 'host',
            roomId: GameState.roomId,
            maxPlayers: CONFIG.MAX_PLAYERS || 1
        }));
        updateQrCode();
    };

    socket.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data);
            const senderId = data.senderId || data.controllerId;

            if (data.type === 'offer') {
                const pc = new RTCPeerConnection(getIceConfig());
                peerConnections.set(senderId, pc);

                pc.ondatachannel = (e) => {
                    const dc = e.channel;
                    dataChannels.set(senderId, dc);
                    setupDataChannel(dc, senderId);
                };

                pc.onicecandidate = (e) => {
                    if (e.candidate) {
                        socket.send(JSON.stringify({
                            type: 'candidate',
                            candidate: e.candidate,
                            targetId: senderId,
                            roomId: GameState.roomId
                        }));
                    }
                };

                await pc.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.send(JSON.stringify({
                    type: 'answer',
                    sdp: answer.sdp,
                    targetId: senderId,
                    roomId: GameState.roomId
                }));
            } else if (data.type === 'candidate') {
                const pc = peerConnections.get(senderId);
                if (pc) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        } catch (err) {}
    };

    socket.onclose = () => setTimeout(connectSignaling, 3000);
}

function setupDataChannel(dc, senderId) {
    dc.onopen = () => {
        waitingOverlay.classList.add('hidden');
    };

    dc.onclose = () => {
        dataChannels.delete(senderId);
        if (dataChannels.size === 0) {
            waitingOverlay.classList.remove('hidden');
        }
    };

    dc.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'join') {
                GameState.currentNickname = data.nickname || 'Pilot';
                playerNickElement.textContent = `PILOT: ${GameState.currentNickname.toUpperCase()}`;
                startNewGame();
            } else if (data.type === 'input') {
                if (typeof data.x === 'number') {
                    GameState.ship.targetVx = data.x * 115;
                }
            } else if (data.action === 'JUMP') {
                requestJump();
            } else if (data.action === 'JUMP_RELEASE') {
                releaseJump();
            } else if (data.action === 'BOOST') {
                const cfg = getStageConfig(GameState.stage);
                GameState.ship.targetSpeed = cfg.turboSpeed;
            } else if (data.action === 'NORMAL_SPEED') {
                const cfg = getStageConfig(GameState.stage);
                GameState.ship.targetSpeed = cfg.baseSpeed;
            } else if (data.action === 'BRAKE') {
                const cfg = getStageConfig(GameState.stage);
                GameState.ship.targetSpeed = cfg.brakeSpeed;
            }
        } catch (err) {}
    };
}

// ==========================================
// ⌨️ Keyboard Controls (Single-Click Discrete Jump)
// ==========================================
window.addEventListener('keydown', (e) => {
    audio.init();
    const key = e.key.toLowerCase();
    
    if (['arrowup', 'w', ' ', 'arrowleft', 'a', 'arrowright', 'd', 'enter'].includes(key)) {
        if (!GameState.running || GameState.gameOver) {
            startNewGame();
            return;
        }
    }

    if (key === 'arrowleft' || key === 'a') {
        keys.left = true;
    } else if (key === 'arrowright' || key === 'd') {
        keys.right = true;
    } else if (key === ' ' || key === 'arrowup' || key === 'w') {
        // Ignore native key auto-repeat when held down!
        if (e.repeat) return;
        if (!jumpKeyHeld) {
            jumpKeyHeld = true;
            requestJump();
        }
    } else if (key === 'shift' || key === 'e') {
        keys.turbo = true;
    } else if (key === 'arrowdown' || key === 's') {
        keys.down = true;
    }
    updateKeyInputs();
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') {
        keys.left = false;
    } else if (key === 'arrowright' || key === 'd') {
        keys.right = false;
    } else if (key === ' ' || key === 'arrowup' || key === 'w') {
        keys.jump = false;
        releaseJump(); // Reset single-click trigger so next keydown can jump again!
    } else if (key === 'shift' || key === 'e') {
        keys.turbo = false;
    } else if (key === 'arrowdown' || key === 's') {
        keys.down = false;
    }
    updateKeyInputs();
});

mainScreen.addEventListener('click', () => {
    audio.init();
    if (!GameState.running || GameState.gameOver) startNewGame();
});

if (waitingOverlay) {
    waitingOverlay.addEventListener('click', () => {
        audio.init();
        if (!GameState.running || GameState.gameOver) startNewGame();
    });
}

// ==========================================
// 📐 AutoScale Multi-Stage Engine
// ==========================================
function autoScale() {
    const container = document.querySelector('.container');
    if (!container) return;

    container.style.transform = 'none';
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const availableW = window.innerWidth || document.documentElement.clientWidth;
    const availableH = window.innerHeight || document.documentElement.clientHeight;
    if (!availableW || !availableH) return;

    const padding = 20;
    const scaleX = (availableW - padding) / rect.width;
    const scaleY = (availableH - padding) / rect.height;
    const scale = Math.max(0.1, Math.min(scaleX, scaleY));

    container.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', autoScale);
window.addEventListener('load', autoScale);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(autoScale);
if (window.ResizeObserver) new ResizeObserver(() => autoScale()).observe(document.body);
window.addEventListener('message', (e) => { if (e.data?.type === 'RESCALE') autoScale(); });
[0, 50, 150, 300, 600, 1200].forEach(d => setTimeout(autoScale, d));

// ==========================================
// 🚀 Initial Launch
// ==========================================
const initialEnv = getStageEnv(1);
initAtmosphericParticles(initialEnv.theme);
generateTrack(1);
resetShip();
loadRanking();
updateUI();
requestAnimationFrame(gameLoop);
connectSignaling();
