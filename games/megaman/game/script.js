// ==========================================
// 🤖 Mega Man Arcade - Core Game & WebRTC Engine
// ==========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 160;

const playerNickElement = document.getElementById('player-nick');
const scoreElement = document.getElementById('score');
const livesCountElement = document.getElementById('lives-count');
const stageLevelElement = document.getElementById('stage-level');
const highScoreElement = document.getElementById('high-score');
const roomIdElement = document.getElementById('room-id');
const iceRouteElement = document.getElementById('ice-route');
const audioToggleBtn = document.getElementById('audio-toggle-btn');
const waitingOverlay = document.getElementById('waiting-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const rankingList = document.getElementById('ranking-list');
const mainScreen = document.getElementById('main-screen');

const adVideoOverlay = document.getElementById('ad-video-overlay');
const adVideoPlayer = document.getElementById('ad-video-player');
const adCountdown = document.getElementById('ad-countdown');
const adPilotName = document.getElementById('ad-pilot-name');
let cachedAdVideoUrl = null;
let adVideoPromise = null;

// ==========================================
// 🔊 Motor de Audio Sintetizado NES (Web Audio API)
// ==========================================
class SoundFX {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.muted = false;
        this.chargeOsc = null;
        this.chargeGain = null;
    }

    init() {
        if (!this.ctx) {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                this.ctx = new AudioCtx();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
            } catch (_) {}
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    toggleMute() {
        this.init();
        this.muted = !this.muted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime);
        }
        if (audioToggleBtn) {
            audioToggleBtn.classList.toggle('muted', this.muted);
            audioToggleBtn.textContent = this.muted ? '🔇 MUTED' : '🔊 AUDIO';
        }
    }

    playBuster() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(750, t);
            osc.frequency.exponentialRampToValueAtTime(220, t + 0.08);
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.085);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.085);
        } catch (_) {}
    }

    playChargedShot() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            // Capa 1: Pulso de onda potente
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(320, t);
            osc1.frequency.exponentialRampToValueAtTime(980, t + 0.12);
            gain1.gain.setValueAtTime(0.4, t);
            gain1.gain.linearRampToValueAtTime(0.001, t + 0.18);
            osc1.connect(gain1);
            gain1.connect(this.masterGain);
            osc1.start(t);
            osc1.stop(t + 0.18);

            // Capa 2: Ruido blanco sintetizado de impacto
            const bufferSize = this.ctx.sampleRate * 0.15;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.3, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            noise.connect(noiseGain);
            noiseGain.connect(this.masterGain);
            noise.start(t);
        } catch (_) {}
    }

    startChargeHum() {
        if (!this.ctx || this.muted || this.chargeOsc) return;
        try {
            const t = this.ctx.currentTime;
            this.chargeOsc = this.ctx.createOscillator();
            this.chargeGain = this.ctx.createGain();
            this.chargeOsc.type = 'triangle';
            this.chargeOsc.frequency.setValueAtTime(220, t);
            this.chargeOsc.frequency.linearRampToValueAtTime(880, t + 1.2);
            this.chargeGain.gain.setValueAtTime(0.12, t);
            this.chargeOsc.connect(this.chargeGain);
            this.chargeGain.connect(this.masterGain);
            this.chargeOsc.start(t);
        } catch (_) {}
    }

    stopChargeHum() {
        if (this.chargeOsc) {
            try {
                this.chargeGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
                this.chargeOsc.stop(this.ctx.currentTime + 0.05);
            } catch (_) {}
            this.chargeOsc = null;
            this.chargeGain = null;
        }
    }

    playJump() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(240, t);
            osc.frequency.exponentialRampToValueAtTime(680, t + 0.11);
            gain.gain.setValueAtTime(0.28, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.12);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.12);
        } catch (_) {}
    }

    playLand() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(140, t);
            osc.frequency.exponentialRampToValueAtTime(60, t + 0.05);
            gain.gain.setValueAtTime(0.22, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.06);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.06);
        } catch (_) {}
    }

    playSlide() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.linearRampToValueAtTime(80, t + 0.14);
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.15);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.15);
        } catch (_) {}
    }

    playDamage() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(110, t);
            osc.frequency.linearRampToValueAtTime(45, t + 0.2);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.22);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.22);
        } catch (_) {}
    }

    playDeflect() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(980, t);
            osc.frequency.linearRampToValueAtTime(1400, t + 0.04);
            gain.gain.setValueAtTime(0.28, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.05);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.05);
        } catch (_) {}
    }

    playEnemyExplode() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(180, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.19);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.19);
        } catch (_) {}
    }

    playPickup() {
        if (!this.ctx || this.muted) return;
        try {
            const notes = [440, 554, 659, 880];
            notes.forEach((freq, idx) => {
                const t = this.ctx.currentTime + idx * 0.04;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.22, t);
                gain.gain.linearRampToValueAtTime(0.001, t + 0.06);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.06);
            });
        } catch (_) {}
    }

    playGate() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            for (let i = 0; i < 6; i++) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(160 + i * 45, t + i * 0.04);
                gain.gain.setValueAtTime(0.2, t + i * 0.04);
                gain.gain.linearRampToValueAtTime(0.001, t + (i + 1) * 0.04);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t + i * 0.04);
                osc.stop(t + (i + 1) * 0.04);
            }
        } catch (_) {}
    }

    playBossAlarm() {
        if (!this.ctx || this.muted) return;
        try {
            for (let i = 0; i < 4; i++) {
                const t = this.ctx.currentTime + i * 0.18;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(740, t);
                osc.frequency.setValueAtTime(520, t + 0.08);
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.linearRampToValueAtTime(0.001, t + 0.16);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.16);
            }
        } catch (_) {}
    }

    playVictory() {
        if (!this.ctx || this.muted) return;
        try {
            const fanfare = [
                { f: 523, d: 0.1 }, { f: 659, d: 0.1 }, { f: 783, d: 0.1 },
                { f: 1046, d: 0.25 }, { f: 880, d: 0.15 }, { f: 1046, d: 0.4 }
            ];
            let elapsed = 0;
            fanfare.forEach(note => {
                const t = this.ctx.currentTime + elapsed;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(note.f, t);
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.linearRampToValueAtTime(0.001, t + note.d);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + note.d);
                elapsed += note.d * 1.1;
            });
        } catch (_) {}
    }

    playGameOver() {
        if (!this.ctx || this.muted) return;
        try {
            const notes = [392, 349, 329, 293, 261];
            notes.forEach((freq, idx) => {
                const t = this.ctx.currentTime + idx * 0.16;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.25, t);
                gain.gain.linearRampToValueAtTime(0.001, t + 0.2);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.2);
            });
        } catch (_) {}
    }
}
const audio = new SoundFX();
if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => audio.toggleMute());
}

// ==========================================
// 🎮 Estado Global del Juego (GameState)
// ==========================================
const GRAVITY = 720;
const STAGE_LENGTH = 1400; // Ancho total del nivel
const MAX_HP = 28;

const GameState = {
    running: false,
    gameOver: false,
    adPlaying: false,
    victory: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('megaman_highscore') || '0', 10),
    lives: 3,
    level: 1,
    levelClearBanner: null,
    currentNickname: 'MEGAMAN',
    roomId: '----',
    cameraX: 0,
    bossActive: false,
    bossIntroTimer: 0,

    player: {
        x: 30,
        y: 110,
        vx: 0,
        vy: 0,
        w: 16,
        h: 22,
        facing: 1, // 1 = right, -1 = left
        onGround: false,
        isClimbing: false,
        isSliding: false,
        slideTimer: 0,
        isShooting: false,
        shootAnimTimer: 0,
        chargeTime: 0,
        isCharging: false,
        hp: MAX_HP,
        invulnTimer: 0,
        runFrame: 0,
        runAnimTimer: 0,
        blinkTimer: 0
    },

    boss: {
        x: 1250,
        y: 110,
        vx: 0,
        vy: 0,
        w: 20,
        h: 26,
        hp: 10,
        maxHp: 10,
        bossType: 'cutman',
        active: false,
        onGround: true,
        facing: -1,
        stateTimer: 1.5,
        actionState: 'WAITING',
        invulnTimer: 0
    },

    bossGate: {
        x: 1116,
        y: 0,
        w: 14,
        h: 136,
        currentY: 0,
        state: 'CLOSED',
        sealed: false
    },

    bullets: [],
    enemyBullets: [],
    enemies: [],
    pickups: [],
    particles: [],
    platforms: [],
    spikes: [],
    stageConfig: null
};

// ==========================================
// 🌌 Catálogo de Escenarios y Robot Masters (6 Niveles Únicos)
// ==========================================
const STAGES = {
    1: {
        name: 'CUT MAN',
        bossType: 'cutman',
        bossLetter: 'C',
        bossColor: '#f59e0b',
        subtext: 'CYBER TOWER',
        bgColor: '#060f18',
        bgCityColor: '#0b1b29',
        bgBeamColor: '#10283d',
        platformGround: '#1e3a5f',
        platformBorder: '#38bdf8',
        hazardType: 'spikes',
        hazardColor: '#ef4444',
        bossBaseHp: 10
    },
    2: {
        name: 'FIRE MAN',
        bossType: 'fireman',
        bossLetter: 'F',
        bossColor: '#ef4444',
        subtext: 'VOLCANO FOUNDRY',
        bgColor: '#180404',
        bgCityColor: '#2d0707',
        bgBeamColor: '#450a0a',
        platformGround: '#3b1111',
        platformBorder: '#f97316',
        hazardType: 'lava',
        hazardColor: '#ff3b00',
        bossBaseHp: 12
    },
    3: {
        name: 'GUTS MAN',
        bossType: 'gutsman',
        bossLetter: 'G',
        bossColor: '#84cc16',
        subtext: 'BEDROCK QUARRY',
        bgColor: '#0c170d',
        bgCityColor: '#152617',
        bgBeamColor: '#1f3822',
        platformGround: '#283c29',
        platformBorder: '#4ade80',
        hazardType: 'quarry_spikes',
        hazardColor: '#facc15',
        bossBaseHp: 14
    },
    4: {
        name: 'ELEC MAN',
        bossType: 'elecman',
        bossLetter: 'E',
        bossColor: '#eab308',
        subtext: 'THUNDER PLANT',
        bgColor: '#0b071a',
        bgCityColor: '#1e1b4b',
        bgBeamColor: '#312e81',
        platformGround: '#1a1b38',
        platformBorder: '#facc15',
        hazardType: 'electric',
        hazardColor: '#38bdf8',
        bossBaseHp: 15
    },
    5: {
        name: 'ICE MAN',
        bossType: 'iceman',
        bossLetter: 'I',
        bossColor: '#38bdf8',
        subtext: 'ARCTIC GLACIER',
        bgColor: '#02131d',
        bgCityColor: '#073b4c',
        bgBeamColor: '#118ab2',
        platformGround: '#0f3a53',
        platformBorder: '#7dd3fc',
        hazardType: 'ice_spikes',
        hazardColor: '#e0f2fe',
        bossBaseHp: 16
    },
    6: {
        name: 'DR. WILY',
        bossType: 'wily',
        bossLetter: 'W',
        bossColor: '#c084fc',
        subtext: 'SKULL FORTRESS',
        bgColor: '#090214',
        bgCityColor: '#240b36',
        bgBeamColor: '#3b0764',
        platformGround: '#2c0d45',
        platformBorder: '#a855f7',
        hazardType: 'acid',
        hazardColor: '#22c55e',
        bossBaseHp: 20
    }
};

function getStageConfig(lvl) {
    const stageNum = ((lvl - 1) % 6) + 1;
    const loop = Math.floor((lvl - 1) / 6);
    const base = STAGES[stageNum];
    return {
        ...base,
        stageNum,
        loop,
        title: loop > 0 ? `${base.name} EX` : base.name,
        bossHp: base.bossBaseHp + loop * 4
    };
}

// ==========================================
// 🏗️ Generación del Escenario Dinámico por Nivel
// ==========================================
function initStage() {
    const lvl = GameState.level || 1;
    const cfg = getStageConfig(lvl);
    GameState.stageConfig = cfg;

    if (cfg.stageNum === 2) {
        // --- NIVEL 2: FUNDICIÓN VOLCÁNICA (FIRE MAN) ---
        GameState.platforms = [
            { x: 0, y: 136, w: 220, h: 24, type: 'ground' },
            { x: 240, y: 108, w: 45, h: 8, type: 'metal' },
            { x: 310, y: 88,  w: 50, h: 8, type: 'metal' },
            { x: 380, y: 108, w: 45, h: 8, type: 'metal' },
            { x: 445, y: 136, w: 250, h: 24, type: 'ground' },
            { x: 490, y: 96,  w: 55, h: 10, type: 'pipe' },
            { x: 590, y: 80,  w: 60, h: 10, type: 'pipe' },
            { x: 715, y: 106, w: 55, h: 8, type: 'metal' },
            { x: 790, y: 88,  w: 50, h: 8, type: 'metal' },
            { x: 860, y: 136, w: 256, h: 24, type: 'ground' },
            { x: 910, y: 108, w: 36, h: 28, type: 'block' },
            { x: 980, y: 86,  w: 38, h: 50, type: 'block' },
            { x: 1040, y: 72, w: 45, h: 8,  type: 'metal' },
            { x: 1116, y: 136, w: 204, h: 24, type: 'ground' },
            { x: 1165, y: 102, w: 35, h: 8,  type: 'metal' },
            { x: 1240, y: 86,  w: 35, h: 8,  type: 'metal' },
            { x: 1306, y: 0,   w: 14, h: 160, type: 'wall' }
        ];

        // Lagos de lava ardiente
        GameState.spikes = [
            { x: 220, y: 148, w: 225, h: 12 },
            { x: 695, y: 148, w: 165, h: 12 }
        ];

        // Enemigos de Fuego
        GameState.enemies = [
            { id: 1, type: 'metool', subtype: 'fire', x: 150, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 2.0, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 2, type: 'metool', subtype: 'fire', x: 520, y: 84,  vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.5, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 3, type: 'metool', subtype: 'fire', x: 890, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 2.0, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 4, type: 'metool', subtype: 'fire', x: 1030, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.8, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 5, type: 'blader', subtype: 'fire', x: 330, y: 45,  vx: -40 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 45, t: 0, hp: 1, hurtTimer: 0 },
            { id: 6, type: 'blader', subtype: 'fire', x: 650, y: 40,  vx: -45 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 40, t: 1.2, hp: 1, hurtTimer: 0 },
            { id: 7, type: 'blader', subtype: 'fire', x: 950, y: 42,  vx: -40 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 42, t: 0.5, hp: 1, hurtTimer: 0 },
            { id: 8, type: 'spikey', subtype: 'fire', x: 620, y: 124, vx: -55 - (lvl - 1) * 10, vy: 0, w: 14, h: 12, minX: 470, maxX: 680, hp: 2, hurtTimer: 0 }
        ];
    } else if (cfg.stageNum === 3) {
        // --- NIVEL 3: CANTERA Y MINA PESADA (GUTS MAN) ---
        GameState.platforms = [
            { x: 0, y: 136, w: 260, h: 24, type: 'ground' },
            { x: 230, y: 102, w: 40, h: 8, type: 'metal' },
            { x: 295, y: 80,  w: 45, h: 8, type: 'metal' },
            { x: 365, y: 102, w: 45, h: 8, type: 'metal' },
            { x: 430, y: 136, w: 300, h: 24, type: 'ground' },
            { x: 470, y: 94,  w: 50, h: 20, type: 'block' },
            { x: 560, y: 76,  w: 60, h: 10, type: 'pipe' },
            { x: 660, y: 98,  w: 50, h: 8, type: 'metal' },
            { x: 750, y: 136, w: 366, h: 24, type: 'ground' },
            { x: 810, y: 110, w: 40, h: 26, type: 'block' },
            { x: 890, y: 88,  w: 40, h: 48, type: 'block' },
            { x: 970, y: 70,  w: 50, h: 8,  type: 'metal' },
            { x: 1116, y: 136, w: 204, h: 24, type: 'ground' },
            { x: 1160, y: 104, w: 35, h: 8,  type: 'metal' },
            { x: 1235, y: 88,  w: 35, h: 8,  type: 'metal' },
            { x: 1306, y: 0,   w: 14, h: 160, type: 'wall' }
        ];

        // Precipicios y pinchos de cuarzo
        GameState.spikes = [
            { x: 260, y: 152, w: 170, h: 8 },
            { x: 730, y: 152, w: 20,  h: 8 }
        ];

        // Enemigos de Mina
        GameState.enemies = [
            { id: 1, type: 'metool', subtype: 'miner', x: 170, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 2.2, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 2, type: 'metool', subtype: 'miner', x: 540, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.6, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 3, type: 'metool', subtype: 'miner', x: 860, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 2.0, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 4, type: 'metool', subtype: 'miner', x: 1020, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.7, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 5, type: 'blader', subtype: 'quarry', x: 350, y: 48, vx: -35 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 48, t: 0, hp: 1, hurtTimer: 0 },
            { id: 6, type: 'blader', subtype: 'quarry', x: 680, y: 42, vx: -40 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 42, t: 1.4, hp: 1, hurtTimer: 0 },
            { id: 7, type: 'blader', subtype: 'quarry', x: 920, y: 45, vx: -35 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 45, t: 0.9, hp: 1, hurtTimer: 0 },
            { id: 8, type: 'spikey', subtype: 'boulder', x: 640, y: 124, vx: -45 - (lvl - 1) * 10, vy: 0, w: 14, h: 12, minX: 480, maxX: 710, hp: 2, hurtTimer: 0 }
        ];
    } else if (cfg.stageNum === 4) {
        // --- NIVEL 4: PLANTA ELÉCTRICA DE ALTA TENSIÓN (ELEC MAN) ---
        GameState.platforms = [
            { x: 0, y: 136, w: 230, h: 24, type: 'ground' },
            { x: 260, y: 106, w: 45, h: 8, type: 'pcb' },
            { x: 335, y: 84,  w: 48, h: 8, type: 'pcb' },
            { x: 410, y: 104, w: 45, h: 8, type: 'pcb' },
            { x: 485, y: 136, w: 240, h: 24, type: 'ground' },
            { x: 530, y: 94,  w: 50, h: 10, type: 'pipe' },
            { x: 615, y: 78,  w: 55, h: 10, type: 'pipe' },
            { x: 700, y: 100, w: 50, h: 8, type: 'pcb' },
            { x: 775, y: 136, w: 341, h: 24, type: 'ground' },
            { x: 830, y: 108, w: 38, h: 28, type: 'block' },
            { x: 910, y: 86,  w: 40, h: 50, type: 'block' },
            { x: 980, y: 68,  w: 50, h: 8,  type: 'pcb' },
            { x: 1055, y: 92, w: 40, h: 8,  type: 'pcb' },
            { x: 1116, y: 136, w: 204, h: 24, type: 'ground' },
            { x: 1165, y: 102, w: 35, h: 8,  type: 'pcb' },
            { x: 1240, y: 86,  w: 35, h: 8,  type: 'pcb' },
            { x: 1306, y: 0,   w: 14, h: 160, type: 'wall' }
        ];

        // Fosas con descarga de alta tensión
        GameState.spikes = [
            { x: 230, y: 148, w: 255, h: 12 },
            { x: 725, y: 148, w: 50,  h: 12 }
        ];

        // Enemigos Eléctricos
        GameState.enemies = [
            { id: 1, type: 'metool', subtype: 'spark', x: 160, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.8, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 2, type: 'metool', subtype: 'spark', x: 550, y: 84,  vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.4, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 3, type: 'metool', subtype: 'spark', x: 880, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 2.1, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 4, type: 'metool', subtype: 'spark', x: 1040, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.6, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 5, type: 'blader', subtype: 'thunder', x: 340, y: 44, vx: -42 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 44, t: 0.3, hp: 1, hurtTimer: 0 },
            { id: 6, type: 'blader', subtype: 'thunder', x: 670, y: 38, vx: -46 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 38, t: 1.7, hp: 1, hurtTimer: 0 },
            { id: 7, type: 'blader', subtype: 'thunder', x: 960, y: 42, vx: -40 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 42, t: 0.7, hp: 1, hurtTimer: 0 },
            { id: 8, type: 'spikey', subtype: 'voltaic', x: 640, y: 124, vx: -58 - (lvl - 1) * 10, vy: 0, w: 14, h: 12, minX: 500, maxX: 710, hp: 2, hurtTimer: 0 }
        ];
    } else if (cfg.stageNum === 5) {
        // --- NIVEL 5: GLACIAR ÁRTICO POLAR (ICE MAN) ---
        GameState.platforms = [
            { x: 0, y: 136, w: 250, h: 24, type: 'ground' },
            { x: 230, y: 112, w: 42, h: 8, type: 'ice' },
            { x: 295, y: 90,  w: 48, h: 8, type: 'ice' },
            { x: 365, y: 112, w: 42, h: 8, type: 'ice' },
            { x: 435, y: 136, w: 280, h: 24, type: 'ground' },
            { x: 480, y: 98,  w: 52, h: 10, type: 'pipe' },
            { x: 570, y: 80,  w: 56, h: 10, type: 'pipe' },
            { x: 660, y: 102, w: 48, h: 8, type: 'ice' },
            { x: 740, y: 136, w: 376, h: 24, type: 'ground' },
            { x: 800, y: 108, w: 40, h: 28, type: 'block' },
            { x: 880, y: 86,  w: 42, h: 50, type: 'block' },
            { x: 955, y: 68,  w: 48, h: 8,  type: 'ice' },
            { x: 1030, y: 90, w: 42, h: 8,  type: 'ice' },
            { x: 1116, y: 136, w: 204, h: 24, type: 'ground' },
            { x: 1160, y: 102, w: 35, h: 8,  type: 'ice' },
            { x: 1235, y: 86,  w: 35, h: 8,  type: 'ice' },
            { x: 1306, y: 0,   w: 14, h: 160, type: 'wall' }
        ];

        // Abismos glaciares con estalagmitas de hielo cortante
        GameState.spikes = [
            { x: 250, y: 150, w: 185, h: 10 },
            { x: 715, y: 150, w: 25,  h: 10 }
        ];

        // Enemigos de Hielo y Nieve
        GameState.enemies = [
            { id: 1, type: 'metool', subtype: 'frost', x: 170, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 2.1, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 2, type: 'metool', subtype: 'frost', x: 510, y: 88,  vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.7, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 3, type: 'metool', subtype: 'frost', x: 870, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.9, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 4, type: 'metool', subtype: 'frost', x: 1010, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.8, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 5, type: 'blader', subtype: 'snow', x: 360, y: 46, vx: -38 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 46, t: 0.1, hp: 1, hurtTimer: 0 },
            { id: 6, type: 'blader', subtype: 'snow', x: 690, y: 40, vx: -42 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 40, t: 1.2, hp: 1, hurtTimer: 0 },
            { id: 7, type: 'blader', subtype: 'snow', x: 940, y: 44, vx: -36 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 44, t: 0.8, hp: 1, hurtTimer: 0 },
            { id: 8, type: 'spikey', subtype: 'frostbite', x: 650, y: 124, vx: -52 - (lvl - 1) * 10, vy: 0, w: 14, h: 12, minX: 490, maxX: 720, hp: 2, hurtTimer: 0 }
        ];
    } else if (cfg.stageNum === 6) {
        // --- NIVEL 6: FORTALEZA CALAVERA (DR. WILY) ---
        GameState.platforms = [
            { x: 0, y: 136, w: 210, h: 24, type: 'ground' },
            { x: 230, y: 104, w: 44, h: 8, type: 'metal' },
            { x: 300, y: 82,  w: 46, h: 8, type: 'metal' },
            { x: 370, y: 104, w: 44, h: 8, type: 'metal' },
            { x: 440, y: 136, w: 260, h: 24, type: 'ground' },
            { x: 490, y: 94,  w: 55, h: 10, type: 'pipe' },
            { x: 585, y: 76,  w: 60, h: 10, type: 'pipe' },
            { x: 675, y: 98,  w: 50, h: 8, type: 'metal' },
            { x: 745, y: 136, w: 371, h: 24, type: 'ground' },
            { x: 805, y: 106, w: 42, h: 30, type: 'block' },
            { x: 885, y: 82,  w: 44, h: 54, type: 'block' },
            { x: 960, y: 64,  w: 52, h: 8,  type: 'metal' },
            { x: 1040, y: 88, w: 44, h: 8,  type: 'metal' },
            { x: 1116, y: 136, w: 204, h: 24, type: 'ground' },
            { x: 1165, y: 102, w: 35, h: 8,  type: 'metal' },
            { x: 1240, y: 86,  w: 35, h: 8,  type: 'metal' },
            { x: 1306, y: 0,   w: 14, h: 160, type: 'wall' }
        ];

        // Fosas de ácido corrosivo burbujeante
        GameState.spikes = [
            { x: 210, y: 148, w: 230, h: 12 },
            { x: 700, y: 148, w: 45,  h: 12 }
        ];

        // Enemigos de Élite de Dr. Wily
        GameState.enemies = [
            { id: 1, type: 'metool', subtype: 'wily', x: 150, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.7, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 2, type: 'metool', subtype: 'wily', x: 520, y: 84,  vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.3, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 3, type: 'metool', subtype: 'wily', x: 860, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.8, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 4, type: 'metool', subtype: 'wily', x: 1020, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.5, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 5, type: 'blader', subtype: 'dark', x: 330, y: 42, vx: -45 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 42, t: 0.2, hp: 1, hurtTimer: 0 },
            { id: 6, type: 'blader', subtype: 'dark', x: 660, y: 36, vx: -50 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 36, t: 1.5, hp: 1, hurtTimer: 0 },
            { id: 7, type: 'blader', subtype: 'dark', x: 950, y: 40, vx: -44 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 40, t: 0.6, hp: 1, hurtTimer: 0 },
            { id: 8, type: 'spikey', subtype: 'cyber', x: 630, y: 124, vx: -60 - (lvl - 1) * 10, vy: 0, w: 14, h: 12, minX: 480, maxX: 690, hp: 2, hurtTimer: 0 }
        ];
    } else {
        // --- NIVEL 1: TORRE INDUSTRIAL (CUT MAN) ---
        GameState.platforms = [
            { x: 0, y: 136, w: 280, h: 24, type: 'ground' },
            { x: 210, y: 106, w: 45, h: 8, type: 'metal' },
            { x: 290, y: 84,  w: 50, h: 8, type: 'metal' },
            { x: 375, y: 106, w: 45, h: 8, type: 'metal' },
            { x: 450, y: 136, w: 320, h: 24, type: 'ground' },
            { x: 500, y: 92,  w: 60, h: 10, type: 'pipe' },
            { x: 620, y: 80,  w: 70, h: 10, type: 'pipe' },
            { x: 730, y: 104, w: 55, h: 8, type: 'metal' },
            { x: 810, y: 136, w: 306, h: 24, type: 'ground' },
            { x: 860, y: 110, w: 36, h: 26, type: 'block' },
            { x: 940, y: 92,  w: 36, h: 44, type: 'block' },
            { x: 1000, y: 76, w: 45, h: 8,  type: 'metal' },
            { x: 1116, y: 136, w: 204, h: 24, type: 'ground' },
            { x: 1160, y: 104, w: 35,  h: 8,  type: 'metal' },
            { x: 1235, y: 88,  w: 35,  h: 8,  type: 'metal' },
            { x: 1306, y: 0,   w: 14,  h: 160, type: 'wall' }
        ];

        GameState.spikes = [
            { x: 280, y: 152, w: 170, h: 8 },
            { x: 770, y: 152, w: 40,  h: 8 }
        ];

        GameState.enemies = [
            { id: 1, type: 'metool', subtype: 'normal', x: 160, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 2.0, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 2, type: 'metool', subtype: 'normal', x: 530, y: 80,  vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.5, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 3, type: 'metool', subtype: 'normal', x: 840, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 2.2, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 4, type: 'metool', subtype: 'normal', x: 990, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.8, hp: 1, facing: -1, hurtTimer: 0 },
            { id: 5, type: 'blader', subtype: 'normal', x: 340, y: 50,  vx: -35 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 50, t: 0, hp: 1, hurtTimer: 0 },
            { id: 6, type: 'blader', subtype: 'normal', x: 670, y: 40,  vx: -40 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 40, t: 1.5, hp: 1, hurtTimer: 0 },
            { id: 7, type: 'blader', subtype: 'normal', x: 910, y: 45,  vx: -35 - (lvl - 1) * 8, vy: 0, w: 14, h: 12, startY: 45, t: 0.8, hp: 1, hurtTimer: 0 },
            { id: 8, type: 'spikey', subtype: 'normal', x: 660, y: 124, vx: -50 - (lvl - 1) * 10, vy: 0, w: 14, h: 12, minX: 580, maxX: 740, hp: 2, hurtTimer: 0 }
        ];
    }

    // Cápsulas de energía
    GameState.pickups = [
        { x: 310, y: 72, type: 'health_s', w: 8, h: 8, collected: false },
        { x: 645, y: 68, type: 'health_l', w: 12, h: 12, collected: false },
        { x: 1030, y: 60, type: 'health_l', w: 12, h: 12, collected: false }
    ];

    // Reiniciar compuerta del Boss
    GameState.bossGate = {
        x: 1116,
        y: 0,
        w: 14,
        h: 136,
        currentY: 0,
        state: 'CLOSED',
        sealed: false
    };

    // Reiniciar Boss específico del nivel (permanece en el suelo sin saltar)
    const bossW = (cfg.bossType === 'gutsman' || cfg.bossType === 'wily') ? 24 : 20;
    const bossH = (cfg.bossType === 'gutsman' || cfg.bossType === 'wily') ? 28 : 26;
    GameState.boss = {
        x: 1250,
        y: 136 - bossH,
        vx: 0,
        vy: 0,
        w: bossW,
        h: bossH,
        hp: cfg.bossHp,
        maxHp: cfg.bossHp,
        bossType: cfg.bossType,
        active: false,
        onGround: true,
        facing: -1,
        stateTimer: 1.5,
        actionState: 'WAITING',
        invulnTimer: 0
    };

    GameState.bossActive = false;
    GameState.bossIntroTimer = 0;
    GameState.bullets = [];
    GameState.enemyBullets = [];
    GameState.particles = [];
}

let gameOverTimer = null;
let gameOverInterval = null;

function clearGameOverTimers() {
    if (gameOverTimer) {
        clearTimeout(gameOverTimer);
        gameOverTimer = null;
    }
    if (gameOverInterval) {
        clearInterval(gameOverInterval);
        gameOverInterval = null;
    }
}

function returnToQrCode() {
    clearGameOverTimers();

    GameState.running = false;
    GameState.gameOver = false;
    GameState.victory = false;
    GameState.score = 0;
    GameState.lives = 3;
    GameState.level = 1;
    GameState.levelClearBanner = null;
    GameState.currentNickname = 'PILOT';
    GameState.cameraX = 0;

    audio.stopChargeHum();

    // Ocultar Game Over y mostrar pantalla de espera con código QR
    if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
    if (waitingOverlay) waitingOverlay.classList.remove('hidden');

    // Cerrar canales de datos y conexiones P2P previas
    try {
        dataChannels.forEach(dc => {
            try { dc.close(); } catch (_) {}
        });
        dataChannels.clear();
        peerConnections.forEach(pc => {
            try { pc.close(); } catch (_) {}
        });
        peerConnections.clear();
    } catch (_) {}

    // Generar un nuevo Room ID para la siguiente partida limpia
    GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    if (roomIdElement) roomIdElement.textContent = `ID: ${GameState.roomId}`;
    updateQrCode();

    // Notificar al servidor WebSocket de señalización sobre la nueva sala
    if (socket && socket.readyState === WebSocket.OPEN) {
        try {
            socket.send(JSON.stringify({
                type: 'register',
                role: 'host',
                roomId: GameState.roomId,
                maxPlayers: CONFIG.MAX_PLAYERS || 1
            }));
        } catch (_) {}
    }

    initStage();
    updateUI();
    renderHallOfFame();
}

// Iniciar nueva partida
function startNewGame() {
    clearGameOverTimers();

    GameState.running = true;
    GameState.gameOver = false;
    GameState.victory = false;
    GameState.score = 0;
    GameState.lives = 3;
    GameState.level = 1;
    GameState.levelClearBanner = null;
    GameState.cameraX = 0;

    initStage();

    // Spawn Mega Man
    GameState.player.x = 40;
    GameState.player.y = 110;
    GameState.player.vx = 0;
    GameState.player.vy = 0;
    GameState.player.hp = MAX_HP;
    GameState.player.facing = 1;
    GameState.player.isSliding = false;
    GameState.player.chargeTime = 0;
    GameState.player.isCharging = false;
    GameState.player.invulnTimer = 0;

    audio.stopChargeHum();
    audio.init();

    waitingOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    updateUI();
}

function endGame(isVictory = false) {
    clearGameOverTimers();

    GameState.running = false;
    GameState.gameOver = true;
    GameState.victory = isVictory;
    audio.stopChargeHum();

    if (isVictory) {
        audio.playVictory();
        broadcastSFX('charged');
    } else {
        audio.playGameOver();
    }

    saveScore(GameState.currentNickname, GameState.score);
    renderHallOfFame();

    const titleEl = document.getElementById('game-over-title');
    if (titleEl) {
        titleEl.textContent = isVictory ? 'STAGE CLEAR!' : 'GAME OVER';
        titleEl.style.color = isVictory ? '#3dff8a' : '#ff4d6d';
    }

    gameOverOverlay.classList.remove('hidden');

    // Iniciar cuenta regresiva visible de 3s para retorno automático al QR
    let secondsLeft = 3;
    const cdEl = document.getElementById('return-countdown');
    if (cdEl) cdEl.textContent = secondsLeft;

    gameOverInterval = setInterval(() => {
        secondsLeft--;
        if (cdEl) cdEl.textContent = Math.max(0, secondsLeft);
        if (secondsLeft <= 0) {
            if (gameOverInterval) {
                clearInterval(gameOverInterval);
                gameOverInterval = null;
            }
        }
    }, 1000);

    // Retorno automático rápido al QR tras 3.5 segundos
    gameOverTimer = setTimeout(() => {
        returnToQrCode();
    }, 3500);

    // Notificar a los mandos móviles
    dataChannels.forEach(ch => {
        if (ch && ch.readyState === 'open') {
            try {
                ch.send(JSON.stringify({ type: 'game_over', score: GameState.score, victory: isVictory }));
            } catch (_) {}
        }
    });
}

function broadcastSFX(soundName) {
    dataChannels.forEach(ch => {
        if (ch && ch.readyState === 'open') {
            try {
                ch.send(JSON.stringify({ type: 'sfx', sound: soundName }));
            } catch (_) {}
        }
    });
}

function updateUI() {
    scoreElement.textContent = `SCORE: ${GameState.score.toString().padStart(6, '0')}`;
    highScoreElement.textContent = `HI: ${GameState.highScore.toString().padStart(6, '0')}`;
    livesCountElement.textContent = GameState.lives;
    if (stageLevelElement) {
        const cfg = GameState.stageConfig || getStageConfig(GameState.level || 1);
        stageLevelElement.textContent = `${GameState.level || 1} (${cfg.name})`;
    }
}

// ==========================================
// 🕹️ Lógica de Control y Disparos
// ==========================================
const inputKeys = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    buster: false
};

function fireBuster(isCharge = false, isFull = false) {
    if (!GameState.running || GameState.gameOver) return;
    const p = GameState.player;
    if (p.isSliding) return;

    p.isShooting = true;
    p.shootAnimTimer = 0.22;

    const busterX = p.facing === 1 ? p.x + p.w + 2 : p.x - 6;
    const busterY = p.y + 7;

    if (isFull) {
        // Disparo cargado masivo (Super Mega Buster)
        GameState.bullets.push({
            x: busterX,
            y: busterY - 4,
            vx: p.facing * 280,
            vy: 0,
            w: 16,
            h: 12,
            damage: 4,
            charged: true,
            piercing: true
        });
        audio.playChargedShot();
        broadcastSFX('charged');
        createSparks(busterX, busterY, '#00d2ff', 10);
    } else {
        // Disparo normal de limón de plasma (máximo 3 en pantalla)
        if (GameState.bullets.filter(b => !b.charged).length >= 3) return;

        GameState.bullets.push({
            x: busterX,
            y: busterY,
            vx: p.facing * 320,
            vy: 0,
            w: 6,
            h: 4,
            damage: 1,
            charged: false,
            piercing: false
        });
        audio.playBuster();
        createSparks(busterX, busterY, '#ffea00', 3);
    }
}

function triggerSlide() {
    const p = GameState.player;
    if (!p.onGround || p.isSliding) return;
    p.isSliding = true;
    p.slideTimer = 0.38;
    p.vx = p.facing * 180;
    audio.playSlide();
    createSparks(p.x + (p.facing === 1 ? 0 : p.w), p.y + p.h, '#e0f2fe', 6);
}

// ==========================================
// ⚙️ Física y Simulación de Entidades
// ==========================================
function updatePhysics(dt) {
    if (!GameState.running || GameState.gameOver) return;

    const p = GameState.player;

    // Actualizar temporizadores del jugador
    if (p.invulnTimer > 0) p.invulnTimer -= dt;
    if (p.shootAnimTimer > 0) p.shootAnimTimer -= dt;

    // Parpadeo natural de ojos cuando está inmóvil en el suelo
    if (p.onGround && p.vx === 0 && !p.isShooting && !p.isSliding) {
        p.blinkTimer += dt;
        if (p.blinkTimer >= 4.0) p.blinkTimer = 0;
    } else {
        p.blinkTimer = 0;
    }

    // 1. Control Horizontal del Jugador
    const WALK_SPEED = 95;
    if (p.isSliding) {
        p.slideTimer -= dt;
        p.vx = p.facing * 180;
        if (Math.random() < 0.45) {
            createSparks(p.x + (p.facing === 1 ? 2 : p.w - 2), p.y + p.h - 1, '#fef08a', 2);
        }
        if (p.slideTimer <= 0) {
            p.isSliding = false;
        }
    } else {
        if (inputKeys.left) {
            p.vx = -WALK_SPEED;
            p.facing = -1;
            p.runAnimTimer += dt * 8;
        } else if (inputKeys.right) {
            p.vx = WALK_SPEED;
            p.facing = 1;
            p.runAnimTimer += dt * 8;
        } else {
            p.vx = 0;
            p.runAnimTimer = 0;
        }
    }

    // 2. Control de Salto
    if (inputKeys.jump && p.onGround && !p.isSliding) {
        p.vy = -280;
        p.onGround = false;
        audio.playJump();
        createDustPuff(p.x + p.w / 2, p.y + p.h);
    }

    // 3. Carga del Mega Buster
    if (inputKeys.buster) {
        p.chargeTime += dt;
        if (p.chargeTime >= 0.35 && !p.isCharging) {
            p.isCharging = true;
            audio.startChargeHum();
        }
        // Partículas en espiral hacia el cañón Buster mientras carga (Efecto icónico Capcom)
        if (p.isCharging && Math.random() < 0.65) {
            const muzzleX = p.facing === 1 ? p.x + p.w + 2 : p.x - 2;
            const muzzleY = p.y + 13;
            const ang = Math.random() * Math.PI * 2;
            const rad = 14 + Math.random() * 12;
            const px = muzzleX + Math.cos(ang) * rad;
            const py = muzzleY + Math.sin(ang) * rad;
            const spd = 65 + Math.random() * 40;
            GameState.particles.push({
                x: px,
                y: py,
                vx: -Math.cos(ang) * spd,
                vy: -Math.sin(ang) * spd,
                color: p.chargeTime >= 0.8 ? (Math.random() > 0.5 ? '#00ffff' : '#ffffff') : '#ffea00',
                life: rad / spd,
                size: 1.5,
                target: { x: muzzleX, y: muzzleY }
            });
        }
    }

    // 4. Gravedad
    p.vy += GRAVITY * dt;

    // 5. Aplicar Movimiento con Colisiones en Plataformas
    p.x += p.vx * dt;
    // Límites de pantalla respecto a la cámara
    if (p.x < GameState.cameraX + 4) p.x = GameState.cameraX + 4;

    // Gestión de la Compuerta Amarilla del Boss (NES Shutter Gate)
    const gate = GameState.bossGate;
    if (gate) {
        if (!gate.sealed) {
            // Cuando Mega Man se acerca a la puerta, ésta se abre automáticamente
            if (p.x >= 1040 && p.x < gate.x + 4) {
                if (gate.state === 'CLOSED' || gate.state === 'CLOSING') {
                    gate.state = 'OPENING';
                    audio.playGate();
                }
            }

            if (gate.state === 'OPENING') {
                gate.currentY -= 240 * dt;
                if (gate.currentY <= -136) {
                    gate.currentY = -136;
                    gate.state = 'OPEN';
                }
            }

            // Si la puerta aún no ha abierto suficiente espacio, impide el paso temporalmente
            if (gate.currentY > -80 && p.x + p.w > gate.x && p.x < gate.x + 8) {
                p.x = gate.x - p.w;
            }

            // Al cruzar la puerta e ingresar a la arena del jefe
            if (p.x >= 1118) {
                gate.sealed = true;
                gate.state = 'CLOSING';
                audio.playGate();

                // Activar Cut Man de inmediato al entrar en la arena (sin salto)
                if (!GameState.bossActive && !GameState.victory) {
                    GameState.bossActive = true;
                    if (GameState.boss) {
                        GameState.boss.active = true;
                        GameState.boss.y = 110;
                        GameState.boss.vy = 0;
                    }
                    GameState.bossIntroTimer = 1.5;
                    audio.playBossAlarm();
                }
            }
        } else {
            // Cerrando y sellando compuerta tras entrar
            if (gate.state === 'CLOSING') {
                gate.currentY += 280 * dt;
                if (gate.currentY >= 0) {
                    gate.currentY = 0;
                    gate.state = 'SEALED';
                    audio.playLand();
                    // Asegurar que el Boss Cut Man esté activo
                    if (!GameState.bossActive && !GameState.victory) {
                        GameState.bossActive = true;
                        if (GameState.boss) GameState.boss.active = true;
                        GameState.bossIntroTimer = 1.5;
                        audio.playBossAlarm();
                    }
                }
            }

            // Bloquear salida: Mega Man no puede retroceder fuera de la arena
            if (p.x < gate.x + gate.w + 2) {
                p.x = gate.x + gate.w + 2;
            }
        }
    }

    // Pared final derecha de la arena
    if (p.x + p.w > 1306) {
        p.x = 1306 - p.w;
    }

    // Colisión de suelo / plataformas
    p.y += p.vy * dt;
    p.onGround = false;

    GameState.platforms.forEach(plat => {
        // Colisión superior de plataformas
        if (p.x + p.w - 4 > plat.x && p.x + 4 < plat.x + plat.w) {
            // Aterrizaje sobre la plataforma
            if (p.vy > 0 && p.y + p.h >= plat.y && p.y + p.h <= plat.y + 12) {
                p.y = plat.y - p.h;
                if (!p.onGround && p.vy > 100) {
                    audio.playLand();
                    createDustPuff(p.x + p.w / 2, plat.y);
                }
                p.vy = 0;
                p.onGround = true;
            }
        }
    });

    // 6. Colisión con Pinchos
    GameState.spikes.forEach(sp => {
        if (p.x + p.w > sp.x && p.x < sp.x + sp.w && p.y + p.h > sp.y && p.y < sp.y + sp.h) {
            handlePitFall();
        }
    });

    // Caída al vacío (cuando el personaje se cae)
    if (p.y > CANVAS_HEIGHT + 12) {
        handlePitFall();
    }

    // 7. Actualizar Disparos de Mega Man
    for (let i = GameState.bullets.length - 1; i >= 0; i--) {
        const b = GameState.bullets[i];
        b.x += b.vx * dt;

        // Fuera de vista
        if (b.x < GameState.cameraX - 20 || b.x > GameState.cameraX + CANVAS_WIDTH + 20) {
            GameState.bullets.splice(i, 1);
            continue;
        }

        // Colisión con enemigos (Todos reciben daño de cualquier disparo)
        let bulletDestroyed = false;
        for (let j = GameState.enemies.length - 1; j >= 0; j--) {
            const e = GameState.enemies[j];
            if (b.x + b.w > e.x && b.x < e.x + e.w && b.y + b.h > e.y && b.y < e.y + e.h) {
                e.hp -= b.damage;
                e.hurtTimer = 0.15; // Destello blanco visual instantáneo
                audio.playDamage();
                createSparks(e.x + e.w / 2, e.y + e.h / 2, '#ffea00', 6);

                // Si es Metool escondido, se despierta al ser impactado
                if (e.type === 'metool' && e.state === 'HIDING') {
                    e.state = 'ATTACKING';
                    e.timer = 1.0;
                }

                if (e.hp <= 0) {
                    audio.playEnemyExplode();
                    createSparks(e.x + e.w / 2, e.y + e.h / 2, '#38bdf8', 12);
                    GameState.score += (e.type === 'spikey' ? 300 : e.type === 'blader' ? 200 : 150);
                    updateUI();
                    GameState.enemies.splice(j, 1);
                }

                if (!b.piercing) {
                    bulletDestroyed = true;
                    break;
                }
            }
        }

        // Colisión con Boss (Cut Man)
        if (!bulletDestroyed && GameState.boss && GameState.boss.hp > 0) {
            const boss = GameState.boss;
            if (b.x + b.w > boss.x && b.x < boss.x + boss.w && b.y + b.h > boss.y && b.y < boss.y + boss.h) {
                if (!GameState.bossActive && !GameState.victory) {
                    GameState.bossActive = true;
                    boss.active = true;
                    audio.playBossAlarm();
                }

                if (boss.invulnTimer <= 0) {
                    boss.hp = Math.max(0, boss.hp - b.damage);
                    boss.invulnTimer = 0.28;
                    audio.playDamage();
                    createSparks(b.x, b.y, '#ff4d6d', 8);

                    if (boss.hp <= 0) {
                        defeatBoss();
                    }
                }
                if (!b.piercing) bulletDestroyed = true;
            }
        }

        if (bulletDestroyed) {
            GameState.bullets.splice(i, 1);
        }
    }

    // 8. Actualizar Disparos Enemigos
    for (let i = GameState.enemyBullets.length - 1; i >= 0; i--) {
        const eb = GameState.enemyBullets[i];
        eb.x += eb.vx * dt;
        eb.y += eb.vy * dt;

        if (eb.x < GameState.cameraX - 10 || eb.x > GameState.cameraX + CANVAS_WIDTH + 10 || eb.y > CANVAS_HEIGHT + 10) {
            GameState.enemyBullets.splice(i, 1);
            continue;
        }

        if (p.invulnTimer <= 0 && p.x + p.w > eb.x && p.x < eb.x + eb.w && p.y + p.h > eb.y && p.y < eb.y + eb.h) {
            damagePlayer(3);
            GameState.enemyBullets.splice(i, 1);
        }
    }

    // 9. Comportamiento de Enemigos
    GameState.enemies.forEach(e => {
        if (e.hurtTimer > 0) e.hurtTimer -= dt;

        if (e.type === 'metool') {
            e.timer -= dt;
            if (e.state === 'HIDING') {
                if (e.timer <= 0 && Math.abs(p.x - e.x) < 140) {
                    e.state = 'ATTACKING';
                    e.timer = 1.2;
                    // Dispara 3 balas en arco
                    const baseDir = p.x < e.x ? -1 : 1;
                    [-30, 0, 30].forEach(angle => {
                        const rad = (angle * Math.PI) / 180;
                        GameState.enemyBullets.push({
                            x: e.x + 6,
                            y: e.y + 4,
                            vx: baseDir * Math.cos(rad) * 90,
                            vy: Math.sin(rad) * 90,
                            w: 4,
                            h: 4
                        });
                    });
                }
            } else if (e.state === 'ATTACKING') {
                e.x += (p.x < e.x ? -25 : 25) * dt;
                if (e.timer <= 0) {
                    e.state = 'HIDING';
                    e.timer = 2.0;
                }
            }
        } else if (e.type === 'blader') {
            e.t += dt * 3.5;
            e.x += e.vx * dt;
            e.y = e.startY + Math.sin(e.t) * 16;
            if (e.x < GameState.cameraX - 40) e.x = GameState.cameraX + CANVAS_WIDTH + 30;
        } else if (e.type === 'spikey') {
            e.x += e.vx * dt;
            if (e.x <= e.minX || e.x >= e.maxX) e.vx *= -1;
        }

        // Daño por contacto con Mega Man
        if (p.invulnTimer <= 0 && p.x + p.w > e.x && p.x < e.x + e.w && p.y + p.h > e.y && p.y < e.y + e.h) {
            damagePlayer(4);
        }
    });

    // 10. Recolección de Cápsulas de Energía
    GameState.pickups.forEach(pick => {
        if (!pick.collected && p.x + p.w > pick.x && p.x < pick.x + pick.w && p.y + p.h > pick.y && p.y < pick.y + pick.h) {
            pick.collected = true;
            audio.playPickup();
            const heal = pick.type === 'health_l' ? 10 : 4;
            p.hp = Math.min(MAX_HP, p.hp + heal);
            GameState.score += 500;
            updateUI();
            createSparks(pick.x + 4, pick.y + 4, '#38bdf8', 8);
        }
    });

    // 11. Lógica del Boss (Robot Master Cut Man)
    if (GameState.boss && GameState.boss.hp > 0 && GameState.bossActive) {
        updateBoss(dt);
    }

    if (GameState.levelClearBanner) {
        GameState.levelClearBanner.timer -= dt;
    }

    // 12. Cámara dinámica (Scroll suave hacia adelante)
    const targetCamX = Math.max(0, Math.min(STAGE_LENGTH - CANVAS_WIDTH, p.x - 70));
    // La cámara solo avanza (o se fija suavemente en la arena del boss)
    if (GameState.bossActive || (GameState.bossGate && GameState.bossGate.sealed)) {
        GameState.cameraX += (1114 - GameState.cameraX) * Math.min(1.0, dt * 6);
    } else if (targetCamX > GameState.cameraX) {
        GameState.cameraX += (targetCamX - GameState.cameraX) * Math.min(1.0, dt * 6);
    }

    // 13. Partículas
    for (let i = GameState.particles.length - 1; i >= 0; i--) {
        const pt = GameState.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.grow) pt.size += pt.grow * dt;
        if (pt.target) {
            const dx = pt.target.x - pt.x;
            const dy = pt.target.y - pt.y;
            pt.vx += dx * 20 * dt;
            pt.vy += dy * 20 * dt;
            if (Math.hypot(dx, dy) < 4) pt.life = 0;
        }
        if (pt.life <= 0) GameState.particles.splice(i, 1);
    }
}

function updateBoss(dt) {
    const b = GameState.boss;
    const p = GameState.player;
    const lvl = GameState.level || 1;

    if (b.invulnTimer > 0) b.invulnTimer -= dt;

    b.stateTimer -= dt;
    b.facing = p.x < b.x ? -1 : 1;

    // TODOS los jefes permanecen siempre en el suelo sin saltar
    b.vy = 0;
    b.y = 136 - b.h;
    b.onGround = true;
    b.x += b.vx * dt;

    const speedBonus = (lvl - 1) * 14;
    const cooldownMult = Math.max(0.45, 1.0 - (lvl - 1) * 0.10);

    // Patrón de ataque terrestre específico por Robot Master (sin saltos)
    if (b.stateTimer <= 0) {
        const rand = Math.random();

        if (b.bossType === 'fireman') {
            // --- FIRE MAN: Ráfagas de Fuego Terrestres y Cargas de Magma ---
            if (rand < 0.55) {
                b.actionState = 'THROW';
                b.vx = 0;
                // Bola de fuego ardiente por el suelo
                GameState.enemyBullets.push({
                    x: b.x + (b.facing === -1 ? -8 : b.w + 2),
                    y: 136 - 12,
                    vx: b.facing * (165 + speedBonus),
                    vy: 0,
                    w: 10,
                    h: 10,
                    isFire: true
                });
                audio.playChargedShot();
                createSparks(b.x + b.w / 2, 136 - 6, '#f97316', 8);

                // En niveles avanzados, dispara fuego en ráfaga
                if (lvl >= 2) {
                    setTimeout(() => {
                        if (GameState.running && GameState.boss && GameState.boss.hp > 0) {
                            GameState.enemyBullets.push({
                                x: b.x + (b.facing === -1 ? -8 : b.w + 2),
                                y: 136 - 12,
                                vx: b.facing * (150 + speedBonus),
                                vy: 0,
                                w: 10,
                                h: 10,
                                isFire: true
                            });
                            audio.playChargedShot();
                        }
                    }, 220);
                }
                b.stateTimer = 0.9 * cooldownMult;
            } else {
                b.actionState = 'DASH';
                b.vx = (p.x < b.x ? -1 : 1) * (115 + speedBonus);
                createSparks(b.x + b.w / 2, 136, '#f97316', 5);
                b.stateTimer = 0.8 * cooldownMult;
            }
        } else if (b.bossType === 'gutsman') {
            // --- GUTS MAN: Rocas Rodantes de Cantera y Embestida Sísmica ---
            if (rand < 0.50) {
                b.actionState = 'THROW';
                b.vx = 0;
                // Roca pesada que rueda por el suelo
                GameState.enemyBullets.push({
                    x: b.x + (b.facing === -1 ? -12 : b.w + 2),
                    y: 136 - 14,
                    vx: b.facing * (135 + speedBonus),
                    vy: 0,
                    w: 12,
                    h: 12,
                    isBoulder: true
                });
                audio.playLand();
                createSparks(b.x + b.w / 2, 136 - 8, '#a1a1aa', 10);
                b.stateTimer = 1.0 * cooldownMult;
            } else {
                b.actionState = 'DASH';
                b.vx = (p.x < b.x ? -1 : 1) * (105 + speedBonus);
                audio.playLand();
                createSparks(b.x + b.w / 2, 136, '#71717a', 6);
                b.stateTimer = 0.85 * cooldownMult;
            }
        } else if (b.bossType === 'elecman') {
            // --- ELEC MAN: Thunder Beam Triple y Carrera de Alta Tensión ---
            if (rand < 0.55) {
                b.actionState = 'THROW';
                b.vx = 0;
                // Descarga de Thunder Beam en abanico
                const beamSpd = 180 + speedBonus;
                GameState.enemyBullets.push({
                    x: b.x + (b.facing === -1 ? -8 : b.w + 2),
                    y: b.y + 8,
                    vx: b.facing * beamSpd,
                    vy: 0,
                    w: 12,
                    h: 8,
                    isLightning: true
                });
                GameState.enemyBullets.push({
                    x: b.x + (b.facing === -1 ? -8 : b.w + 2),
                    y: b.y + 4,
                    vx: b.facing * (beamSpd * 0.9),
                    vy: -40,
                    w: 12,
                    h: 8,
                    isLightning: true
                });
                GameState.enemyBullets.push({
                    x: b.x + (b.facing === -1 ? -8 : b.w + 2),
                    y: b.y + 12,
                    vx: b.facing * (beamSpd * 0.9),
                    vy: 40,
                    w: 12,
                    h: 8,
                    isLightning: true
                });
                audio.playChargedShot();
                createSparks(b.x + b.w / 2, b.y + 8, '#38bdf8', 12);
                b.stateTimer = 0.9 * cooldownMult;
            } else {
                b.actionState = 'DASH';
                b.vx = (p.x < b.x ? -1 : 1) * (135 + speedBonus);
                createSparks(b.x + b.w / 2, 136, '#facc15', 7);
                b.stateTimer = 0.75 * cooldownMult;
            }
        } else if (b.bossType === 'iceman') {
            // --- ICE MAN: Ice Slasher Doble y Deslizamiento Glaciar ---
            if (rand < 0.55) {
                b.actionState = 'THROW';
                b.vx = 0;
                const iceSpd = 175 + speedBonus;
                GameState.enemyBullets.push({
                    x: b.x + (b.facing === -1 ? -8 : b.w + 2),
                    y: b.y + 4,
                    vx: b.facing * iceSpd,
                    vy: 0,
                    w: 12,
                    h: 8,
                    isIce: true
                });
                if (lvl >= 2) {
                    setTimeout(() => {
                        if (GameState.running && GameState.boss && GameState.boss.hp > 0) {
                            GameState.enemyBullets.push({
                                x: b.x + (b.facing === -1 ? -8 : b.w + 2),
                                y: b.y + 14,
                                vx: b.facing * (iceSpd * 0.95),
                                vy: 0,
                                w: 12,
                                h: 8,
                                isIce: true
                            });
                            audio.playBuster();
                        }
                    }, 180);
                }
                audio.playBuster();
                createSparks(b.x + b.w / 2, b.y + 8, '#7dd3fc', 8);
                b.stateTimer = 0.9 * cooldownMult;
            } else {
                b.actionState = 'DASH';
                b.vx = (p.x < b.x ? -1 : 1) * (115 + speedBonus);
                createSparks(b.x + b.w / 2, 136, '#e0f2fe', 6);
                b.stateTimer = 0.8 * cooldownMult;
            }
        } else if (b.bossType === 'wily') {
            // --- DR. WILY: Misiles Calavera Homing y Embestida Propulsada ---
            if (rand < 0.60) {
                b.actionState = 'THROW';
                b.vx = 0;
                const missileSpd = 145 + speedBonus;
                const homingVy = Math.max(-25, Math.min(25, (p.y - b.y) * 0.45));
                GameState.enemyBullets.push({
                    x: b.x + (b.facing === -1 ? -10 : b.w + 2),
                    y: b.y + 8,
                    vx: b.facing * missileSpd,
                    vy: homingVy,
                    w: 14,
                    h: 10,
                    isMissile: true
                });
                if (lvl >= 2) {
                    setTimeout(() => {
                        if (GameState.running && GameState.boss && GameState.boss.hp > 0) {
                            GameState.enemyBullets.push({
                                x: b.x + (b.facing === -1 ? -10 : b.w + 2),
                                y: b.y + 14,
                                vx: b.facing * (missileSpd * 1.1),
                                vy: -homingVy * 0.5,
                                w: 14,
                                h: 10,
                                isMissile: true
                            });
                            audio.playDeflect();
                        }
                    }, 220);
                }
                audio.playChargedShot();
                createSparks(b.x + b.w / 2, b.y + 10, '#c084fc', 10);
                b.stateTimer = 0.95 * cooldownMult;
            } else {
                b.actionState = 'DASH';
                b.vx = (p.x < b.x ? -1 : 1) * (125 + speedBonus);
                createSparks(b.x + b.w / 2, 136, '#a855f7', 8);
                b.stateTimer = 0.8 * cooldownMult;
            }
        } else {
            // --- CUT MAN: Cuchillas Rodantes y Carrera Terrestre ---
            if (rand < 0.50) {
                b.actionState = 'THROW';
                b.vx = 0;
                const cutterSpeed = (160 + (lvl - 1) * 25) * b.facing;
                GameState.enemyBullets.push({
                    x: b.x + (b.facing === -1 ? -6 : b.w + 2),
                    y: b.y + 6,
                    vx: cutterSpeed,
                    vy: -15,
                    w: 10,
                    h: 10,
                    isBlade: true
                });

                if (lvl >= 2) {
                    setTimeout(() => {
                        if (GameState.running && GameState.boss && GameState.boss.hp > 0) {
                            GameState.enemyBullets.push({
                                x: b.x + (b.facing === -1 ? -6 : b.w + 2),
                                y: b.y + 2,
                                vx: cutterSpeed * 0.9,
                                vy: 20,
                                w: 10,
                                h: 10,
                                isBlade: true
                            });
                            audio.playDeflect();
                        }
                    }, 200);
                }

                audio.playDeflect();
                b.stateTimer = 0.9 * cooldownMult;
            } else {
                b.actionState = 'DASH';
                b.vx = (p.x < b.x ? -1 : 1) * (115 + speedBonus);
                b.stateTimer = 0.8 * cooldownMult;
            }
        }
    }

    // Rebote en paredes de la arena
    if (b.x < 1140) { b.x = 1140; b.vx *= -1; }
    if (b.x > 1280) { b.x = 1280; b.vx *= -1; }

    // Daño al tocar a Mega Man
    if (p.invulnTimer <= 0 && p.x + p.w > b.x && p.x < b.x + b.w && p.y + p.h > b.y && p.y < b.y + b.h) {
        damagePlayer(5);
    }
}

function defeatBoss() {
    GameState.boss.hp = 0;
    const currentLvl = GameState.level || 1;
    const cfg = GameState.stageConfig || getStageConfig(currentLvl);
    const nextCfg = getStageConfig(currentLvl + 1);
    const bonusScore = 10000 * currentLvl;
    GameState.score += bonusScore;
    GameState.lives++; // ¡Vida extra de recompensa por vencer al jefe!
    updateUI();

    audio.playVictory();
    broadcastSFX('charged');

    // Círculo expansivo de explosiones de Robot Master
    for (let i = 0; i < 28; i++) {
        const ang = (i / 28) * Math.PI * 2;
        const spd = 40 + Math.random() * 80;
        GameState.particles.push({
            x: GameState.boss.x + GameState.boss.w / 2,
            y: GameState.boss.y + GameState.boss.h / 2,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            color: Math.random() > 0.5 ? '#ffffff' : (cfg.bossColor || '#38bdf8'),
            life: 1.0 + Math.random() * 0.5,
            size: 3
        });
    }

    // Banner de nivel superado con nombres de jefes
    GameState.levelClearBanner = {
        level: currentLvl,
        bossName: cfg.name,
        nextName: nextCfg.name,
        timer: 2.8
    };

    setTimeout(() => {
        startNextLevel();
    }, 2800);
}

function startNextLevel() {
    GameState.level = (GameState.level || 1) + 1;
    GameState.levelClearBanner = null;

    initStage();

    const p = GameState.player;
    p.x = 40;
    p.y = 110;
    p.vx = 0;
    p.vy = 0;
    p.hp = MAX_HP;
    p.facing = 1;
    p.isSliding = false;
    p.chargeTime = 0;
    p.isCharging = false;
    p.invulnTimer = 2.0;

    GameState.cameraX = 0;
    audio.stopChargeHum();
    updateUI();
}

function respawnPlayerAtStart() {
    const p = GameState.player;
    // Reiniciar escenario completo (enemigos, obstáculos, compuerta)
    initStage();

    p.x = 40;
    p.y = 110;
    p.vx = 0;
    p.vy = 0;
    p.hp = MAX_HP;
    p.facing = 1;
    p.isSliding = false;
    p.chargeTime = 0;
    p.isCharging = false;
    p.invulnTimer = 2.0;

    GameState.cameraX = 0;
    audio.stopChargeHum();
    updateUI();
}

function handlePitFall() {
    const p = GameState.player;
    audio.playDamage();
    broadcastSFX('hit');
    createSparks(p.x + p.w / 2, CANVAS_HEIGHT - 10, '#ff4d6d', 12);

    GameState.lives--;
    updateUI();

    if (GameState.lives > 0) {
        respawnPlayerAtStart();
    } else {
        endGame(false);
    }
}

function damagePlayer(amount) {
    const p = GameState.player;
    if (p.invulnTimer > 0) return;

    p.hp -= amount;
    p.invulnTimer = 1.2;
    p.vx = -p.facing * 90; // Retroceso clásico NES
    p.vy = -120;
    audio.playDamage();
    broadcastSFX('hit');
    createSparks(p.x + p.w / 2, p.y + p.h / 2, '#ff4d6d', 8);

    if (p.hp <= 0) {
        GameState.lives--;
        updateUI();

        if (GameState.lives > 0) {
            respawnPlayerAtStart();
        } else {
            endGame(false);
        }
    }
}

function createSparks(x, y, color = '#ffea00', count = 5) {
    for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 25 + Math.random() * 65;
        GameState.particles.push({
            x: x,
            y: y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            color: color,
            life: 0.15 + Math.random() * 0.2,
            size: 1.5
        });
    }
}

function createDustPuff(x, y) {
    for (let i = 0; i < 4; i++) {
        const dir = (i % 2 === 0 ? -1 : 1);
        GameState.particles.push({
            x: x + dir * (2 + Math.random() * 4),
            y: y - 1,
            vx: dir * (15 + Math.random() * 25),
            vy: -(8 + Math.random() * 14),
            color: 'rgba(226, 232, 240, 0.75)',
            life: 0.22 + Math.random() * 0.12,
            size: 2,
            grow: 4,
            isCircle: true
        });
    }
}

// ==========================================
// 🎨 Renderizado Pixel-Art Retro en Canvas
// ==========================================
function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    // Desplazamiento por cámara horizontal
    ctx.translate(-Math.round(GameState.cameraX), 0);

    // 1. Fondo industrial con parallax
    renderBackground();

    // 2. Plataformas y bloques del nivel
    renderPlatforms();

    // 2.1 Compuerta Amarilla del Boss (NES Shutter Gate)
    renderBossGate();

    // 3. Pinchos
    renderSpikes();

    // 4. Cápsulas de energía
    renderPickups();

    // 5. Enemigos
    renderEnemies();

    // 6. Boss (Robot Master) - Visible en la arena siempre que tenga vida
    if (GameState.boss && GameState.boss.hp > 0) {
        renderBoss();
    }

    // 7. Mega Man
    renderMegaMan();

    // 8. Disparos
    renderBullets();

    // 9. Partículas
    renderParticles();

    ctx.restore();

    // 10. HUD Superior (Barras de Vida Estilo NES en pantalla fija)
    renderHUD();

    // 11. Banner de Nivel Superado con nombres de jefes
    if (GameState.levelClearBanner) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.font = '8px "Press Start 2P"';
        ctx.fillStyle = '#3dff8a';
        ctx.textAlign = 'center';
        ctx.fillText(`${GameState.levelClearBanner.bossName} DEFEATED!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 14);
        ctx.font = '6px "Press Start 2P"';
        ctx.fillStyle = '#ffea00';
        ctx.fillText(`STAGE ${GameState.levelClearBanner.level} CLEAR! +1UP BONUS`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`NEXT: ${GameState.levelClearBanner.nextName}!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 18);
    }
}

function renderBackground() {
    const cfg = GameState.stageConfig || getStageConfig(GameState.level || 1);
    const t = Date.now() / 1000;

    // 1. Cielo con degradado atmosférico dinámico según el escenario (6 Temas)
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    if (cfg.stageNum === 2) {
        // Stage 2 (Fire Man): Fundición Volcánica
        grad.addColorStop(0, '#140303');
        grad.addColorStop(0.5, '#300808');
        grad.addColorStop(1, '#5c0f0f');
    } else if (cfg.stageNum === 3) {
        // Stage 3 (Guts Man): Cantera y Mina Pesada
        grad.addColorStop(0, '#020b05');
        grad.addColorStop(0.5, '#0b1f11');
        grad.addColorStop(1, '#15381f');
    } else if (cfg.stageNum === 4) {
        // Stage 4 (Elec Man): Planta Eléctrica de Alta Tensión
        const isFlash = Math.sin(t * 1.8) > 0.94;
        grad.addColorStop(0, isFlash ? '#312e81' : '#0b071a');
        grad.addColorStop(0.5, isFlash ? '#4338ca' : '#1e1b4b');
        grad.addColorStop(1, isFlash ? '#6366f1' : '#2e1065');
    } else if (cfg.stageNum === 5) {
        // Stage 5 (Ice Man): Glaciar Ártico Polar
        grad.addColorStop(0, '#02131d');
        grad.addColorStop(0.5, '#04283b');
        grad.addColorStop(1, '#0b4668');
    } else if (cfg.stageNum === 6) {
        // Stage 6 (Dr. Wily): Fortaleza Calavera
        grad.addColorStop(0, '#090214');
        grad.addColorStop(0.5, '#18042b');
        grad.addColorStop(1, '#2c074d');
    } else {
        // Stage 1 (Cut Man): Ciudad Cyberpunk Neón
        grad.addColorStop(0, '#020617');
        grad.addColorStop(0.5, '#0a192f');
        grad.addColorStop(1, '#112e4d');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(GameState.cameraX, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Capas atmosféricas especiales según el escenario
    if (cfg.stageNum === 5) {
        // --- AURORA BOREALIS DINÁMICA (STAGE 5 ICE MAN) ---
        ctx.save();
        ctx.globalAlpha = 0.35;
        // Cinta esmeralda
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.moveTo(GameState.cameraX, 10);
        ctx.bezierCurveTo(
            GameState.cameraX + 50, 5 + Math.sin(t * 1.2) * 8,
            GameState.cameraX + 130, 25 + Math.cos(t * 1.5) * 8,
            GameState.cameraX + CANVAS_WIDTH, 12
        );
        ctx.lineTo(GameState.cameraX + CANVAS_WIDTH, 26);
        ctx.bezierCurveTo(
            GameState.cameraX + 130, 38 + Math.cos(t * 1.5) * 8,
            GameState.cameraX + 50, 18 + Math.sin(t * 1.2) * 8,
            GameState.cameraX, 22
        );
        ctx.closePath();
        ctx.fill();

        // Cinta púrpura celestial
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.moveTo(GameState.cameraX, 20);
        ctx.bezierCurveTo(
            GameState.cameraX + 70, 12 + Math.cos(t * 1.1) * 6,
            GameState.cameraX + 150, 32 + Math.sin(t * 1.3) * 6,
            GameState.cameraX + CANVAS_WIDTH, 18
        );
        ctx.lineTo(GameState.cameraX + CANVAS_WIDTH, 30);
        ctx.bezierCurveTo(
            GameState.cameraX + 150, 42 + Math.sin(t * 1.3) * 6,
            GameState.cameraX + 70, 22 + Math.cos(t * 1.1) * 6,
            GameState.cameraX, 28
        );
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Copos de nieve flotantes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        for (let sf = 0; sf < 22; sf++) {
            const snX = ((sf * 31 + t * 18) % (CANVAS_WIDTH + 60)) + GameState.cameraX - 30;
            const snY = (sf * 19 + t * 24) % 136;
            ctx.fillRect(snX, snY, 1.5, 1.5);
        }
    } else if (cfg.stageNum === 6) {
        // --- LUNA DE SANGRE Y BÚSQUEDA DE REFLECTORES (STAGE 6 DR. WILY) ---
        // Luna gigante carmesí
        const moonX = GameState.cameraX + 155;
        const moonY = 32;
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 16, 0, Math.PI * 2);
        ctx.fill();
        // Cráteres lunares oscuros
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.arc(moonX - 5, moonY - 3, 3, 0, Math.PI * 2);
        ctx.arc(moonX + 4, moonY + 2, 4, 0, Math.PI * 2);
        ctx.arc(moonX + 1, moonY - 7, 2, 0, Math.PI * 2);
        ctx.fill();

        // Reflectores móviles de búsqueda cruzada (Searchlights)
        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = '#ffffff';
        const beamAngle1 = Math.sin(t * 0.8) * 0.6;
        const beamAngle2 = Math.cos(t * 0.7) * 0.6;

        // Reflector 1
        ctx.beginPath();
        ctx.moveTo(GameState.cameraX + 40, 136);
        ctx.lineTo(GameState.cameraX + 40 + Math.tan(beamAngle1 - 0.15) * 120, 0);
        ctx.lineTo(GameState.cameraX + 40 + Math.tan(beamAngle1 + 0.15) * 120, 0);
        ctx.closePath();
        ctx.fill();

        // Reflector 2
        ctx.beginPath();
        ctx.moveTo(GameState.cameraX + 160, 136);
        ctx.lineTo(GameState.cameraX + 160 + Math.tan(beamAngle2 - 0.15) * 120, 0);
        ctx.lineTo(GameState.cameraX + 160 + Math.tan(beamAngle2 + 0.15) * 120, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    } else if (cfg.stageNum === 2) {
        // --- BRASAS VOLCÁNICAS FLOTANTES (STAGE 2 FIRE MAN) ---
        ctx.fillStyle = '#ffb703';
        for (let em = 0; em < 20; em++) {
            const emX = ((em * 37 + Math.sin(t + em) * 12) % (CANVAS_WIDTH + 40)) + GameState.cameraX - 20;
            const emY = 136 - ((em * 17 + t * 30) % 110);
            ctx.fillRect(emX, emY, 1.5, 1.5);
        }
    } else if (cfg.stageNum === 4) {
        // --- DESCARGAS DE BOBINAS TESLA (STAGE 4 ELEC MAN) ---
        for (let tc = 0; tc < STAGE_LENGTH; tc += 120) {
            const drawTcX = tc - GameState.cameraX * 0.25;
            if (drawTcX < GameState.cameraX - 30 || drawTcX > GameState.cameraX + CANVAS_WIDTH + 30) continue;
            // Pilona de bobina Tesla
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(drawTcX + 4, 30, 6, 106);
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(drawTcX + 7, 28, 5, 0, Math.PI * 2); // Esfera torodial superior
            ctx.fill();
            // Arcos de descarga eléctrica intermitente
            if (Math.sin(t * 5 + tc) > 0.4) {
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(drawTcX + 7, 26);
                ctx.lineTo(drawTcX + 7 + (Math.random() - 0.5) * 18, 14);
                ctx.lineTo(drawTcX + 7 + (Math.random() - 0.5) * 24, 6);
                ctx.stroke();
            }
        }
    } else {
        // --- ESTRELLAS TITILANTES (STAGE 1 Y 3) ---
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (let s = 0; s < 25; s++) {
            const sx = ((s * 47) % (CANVAS_WIDTH + 80)) + GameState.cameraX * 0.95;
            const sy = (s * 23) % 70;
            const twinkle = Math.sin(t * 3 + s) > 0.3 ? 1 : 0.4;
            ctx.globalAlpha = twinkle;
            ctx.fillRect(sx - GameState.cameraX * 0.05, sy, 1.2, 1.2);
        }
        ctx.globalAlpha = 1.0;
    }

    // 3. Siluetas de fondo lejanas según el escenario (Parallax lejana)
    for (let bx = 0; bx < STAGE_LENGTH; bx += 36) {
        const h = 48 + ((bx * 17) % 55);
        const drawX = bx - GameState.cameraX * 0.15;
        if (drawX < GameState.cameraX - 40 || drawX > GameState.cameraX + CANVAS_WIDTH + 40) continue;

        if (cfg.stageNum === 3) {
            // Estalactitas y rocas de cantera
            ctx.fillStyle = cfg.bgCityColor;
            ctx.beginPath();
            ctx.moveTo(drawX, 0);
            ctx.lineTo(drawX + 15, h * 0.8);
            ctx.lineTo(drawX + 30, 0);
            ctx.closePath();
            ctx.fill();
        } else if (cfg.stageNum === 5) {
            // Picos de hielo y montañas glaciares
            ctx.fillStyle = cfg.bgCityColor;
            ctx.beginPath();
            ctx.moveTo(drawX, 136);
            ctx.lineTo(drawX + 15, 136 - h);
            ctx.lineTo(drawX + 30, 136);
            ctx.closePath();
            ctx.fill();
            // Nieve en la cumbre
            ctx.fillStyle = '#e0f2fe';
            ctx.beginPath();
            ctx.moveTo(drawX + 10, 136 - h * 0.7);
            ctx.lineTo(drawX + 15, 136 - h);
            ctx.lineTo(drawX + 20, 136 - h * 0.7);
            ctx.closePath();
            ctx.fill();
        } else if (cfg.stageNum === 6) {
            // Almenas y torres de fortaleza gótica
            ctx.fillStyle = cfg.bgCityColor;
            ctx.fillRect(drawX, 136 - h, 30, h);
            // Almenas superiores
            ctx.fillRect(drawX, 136 - h - 5, 8, 5);
            ctx.fillRect(drawX + 12, 136 - h - 5, 6, 5);
            ctx.fillRect(drawX + 22, 136 - h - 5, 8, 5);
            // Ventana aspillera roja
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(drawX + 13, 136 - h + 12, 4, 8);
        } else {
            // Edificios y rascacielos industriales
            ctx.fillStyle = cfg.bgCityColor;
            ctx.beginPath();
            ctx.rect(drawX, 136 - h, 30, h);
            ctx.fill();

            // Techo angular o aguja
            ctx.fillStyle = cfg.bgBeamColor;
            ctx.beginPath();
            ctx.moveTo(drawX + 6, 136 - h);
            ctx.lineTo(drawX + 15, 136 - h - 12);
            ctx.lineTo(drawX + 24, 136 - h);
            ctx.closePath();
            ctx.fill();

            // Baliza roja parpadeante en la antena
            if (Math.sin(t * 4 + bx) > 0.2) {
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(drawX + 14, 136 - h - 13, 2, 2);
            }

            // Ventanas iluminadas en cuadrícula minuciosa
            for (let wy = 136 - h + 8; wy < 136 - 6; wy += 8) {
                for (let wx = drawX + 4; wx < drawX + 26; wx += 6) {
                    const isLit = ((wx * 7 + wy * 13) % 5) < 3;
                    if (isLit) {
                        ctx.fillStyle = cfg.hazardType === 'lava' ? 'rgba(251, 191, 36, 0.45)' : 'rgba(56, 189, 248, 0.45)';
                        ctx.fillRect(wx, wy, 3, 4);
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(wx + 1, wy + 1, 1, 1);
                    }
                }
            }
        }
    }

    // 4. Vigas estructurales, columnas y ventiladores industriales (Parallax media)
    for (let px = 0; px < STAGE_LENGTH; px += 88) {
        const drawPx = px - GameState.cameraX * 0.35;
        if (drawPx < GameState.cameraX - 50 || drawPx > GameState.cameraX + CANVAS_WIDTH + 50) continue;

        // Columna vertical metálica
        ctx.fillStyle = cfg.bgBeamColor;
        ctx.fillRect(drawPx, 15, 12, 121);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(drawPx + 2, 15, 3, 121);

        // Vigas horizontales cruzadas
        ctx.fillStyle = cfg.bgBeamColor;
        ctx.fillRect(drawPx - 16, 42, 44, 8);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(drawPx - 16, 48, 44, 2);

        // Remaches en cruces de vigas
        ctx.fillStyle = '#020617';
        ctx.fillRect(drawPx + 1, 44, 2, 2);
        ctx.fillRect(drawPx + 9, 44, 2, 2);

        // Ventilador industrial gigante en el fondo
        const fanAngle = t * 3 + px;
        ctx.save();
        ctx.translate(drawPx + 6, 26);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.stroke();
        for (let b = 0; b < 4; b++) {
            const a = fanAngle + (b * Math.PI / 2);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
            ctx.beginPath();
            ctx.arc(Math.cos(a) * 5, Math.sin(a) * 5, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // 5. Brillo inferior específico
    if (cfg.stageNum === 2) {
        const heatGrad = ctx.createLinearGradient(0, 95, 0, 140);
        heatGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
        heatGrad.addColorStop(1, 'rgba(249, 115, 22, 0.35)');
        ctx.fillStyle = heatGrad;
        ctx.fillRect(GameState.cameraX, 90, CANVAS_WIDTH, 50);
    } else if (cfg.stageNum === 6) {
        const acidGlow = ctx.createLinearGradient(0, 110, 0, 140);
        acidGlow.addColorStop(0, 'rgba(34, 197, 94, 0)');
        acidGlow.addColorStop(1, 'rgba(34, 197, 94, 0.25)');
        ctx.fillStyle = acidGlow;
        ctx.fillRect(GameState.cameraX, 105, CANVAS_WIDTH, 35);
    }
}

function renderPlatforms() {
    const cfg = GameState.stageConfig || getStageConfig(GameState.level || 1);

    GameState.platforms.forEach(plat => {
        if (plat.x + plat.w < GameState.cameraX - 10 || plat.x > GameState.cameraX + CANVAS_WIDTH + 10) return;

        if (plat.type === 'pcb') {
            // Plataforma de placa de circuito impreso (PCB) para Stage 4
            ctx.fillStyle = '#064e3b';
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

            // Pista conductora dorada superior
            ctx.fillStyle = '#facc15';
            ctx.fillRect(plat.x, plat.y, plat.w, 1.5);

            // Trazas doradas de circuito
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(plat.x + 4, plat.y + 4);
            ctx.lineTo(plat.x + plat.w - 8, plat.y + 4);
            ctx.lineTo(plat.x + plat.w - 4, plat.y + plat.h - 2);
            ctx.stroke();

            // Puntos de soldadura circulares
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(plat.x + 3, plat.y + 3, 2, 2);
            ctx.fillRect(plat.x + plat.w - 5, plat.y + 3, 2, 2);
        } else if (plat.type === 'ice') {
            // Plataforma de hielo cristalino para Stage 5
            const iceGrad = ctx.createLinearGradient(0, plat.y, 0, plat.y + plat.h);
            iceGrad.addColorStop(0, '#7dd3fc');
            iceGrad.addColorStop(0.5, '#0284c7');
            iceGrad.addColorStop(1, '#0369a1');
            ctx.fillStyle = iceGrad;
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

            // Manto de nieve esponjosa en la parte superior
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(plat.x, plat.y, plat.w, 2);

            // Pequeños carámbanos / estalactitas de hielo que cuelgan debajo
            ctx.fillStyle = '#bae6fd';
            for (let ix = plat.x + 4; ix < plat.x + plat.w - 3; ix += 8) {
                ctx.beginPath();
                ctx.moveTo(ix - 1.5, plat.y + plat.h);
                ctx.lineTo(ix, plat.y + plat.h + 3);
                ctx.lineTo(ix + 1.5, plat.y + plat.h);
                ctx.closePath();
                ctx.fill();
            }
        } else if (plat.type === 'ground' || plat.type === 'block') {
            // Cuerpo base con gradiente vertical según escenario
            const baseGrad = ctx.createLinearGradient(0, plat.y, 0, plat.y + plat.h);
            baseGrad.addColorStop(0, cfg.platformGround);
            baseGrad.addColorStop(1, '#071018');
            ctx.fillStyle = baseGrad;
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

            // Borde superior temático brillante
            ctx.fillStyle = cfg.platformBorder;
            ctx.fillRect(plat.x, plat.y, plat.w, 1.5);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.fillRect(plat.x, plat.y, plat.w, 0.8);

            if (cfg.stageNum === 2) {
                // Grietas de magma incandescente en la roca volcánica
                ctx.strokeStyle = '#f97316';
                ctx.lineWidth = 1;
                for (let mx = plat.x + 12; mx < plat.x + plat.w - 8; mx += 28) {
                    ctx.beginPath();
                    ctx.moveTo(mx, plat.y + 3);
                    ctx.lineTo(mx + 4, plat.y + 8);
                    ctx.lineTo(mx + 2, plat.y + 14);
                    ctx.stroke();
                }
            } else if (cfg.stageNum === 5) {
                // Capa de nieve en el suelo
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(plat.x, plat.y, plat.w, 2);
            } else {
                // Micro-estrías de agarre en el borde
                ctx.fillStyle = '#061320';
                for (let gx = plat.x; gx < plat.x + plat.w; gx += 4) {
                    ctx.fillRect(gx, plat.y + 1.5, 1.5, 1.5);
                }
            }

            // Paneles modulares de blindaje con remaches y juntas
            const panelW = 24;
            for (let px = plat.x; px < plat.x + plat.w; px += panelW) {
                const curW = Math.min(panelW, plat.x + plat.w - px);
                ctx.fillStyle = '#060d15';
                ctx.fillRect(px, plat.y + 3, 1, plat.h - 3);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.fillRect(px + 1, plat.y + 4, curW - 2, 1);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.fillRect(px + 1, plat.y + plat.h - 2, curW - 2, 1);

                if (curW >= 8 && plat.h >= 14) {
                    ctx.fillStyle = '#060d15';
                    ctx.fillRect(px + 3, plat.y + 6, 2.5, 2.5);
                    ctx.fillRect(px + curW - 5, plat.y + 6, 2.5, 2.5);
                    ctx.fillStyle = '#e2e8f0';
                    ctx.fillRect(px + 3.5, plat.y + 6.5, 1, 1);
                    ctx.fillRect(px + curW - 4.5, plat.y + 6.5, 1, 1);
                }
            }

            // Franja de advertencia con chevrons amarillos/negros en el borde inferior
            if (plat.h >= 20) {
                const stripeY = plat.y + plat.h - 4;
                ctx.fillStyle = '#eab308';
                ctx.fillRect(plat.x, stripeY, plat.w, 3);
                ctx.fillStyle = '#020617';
                for (let cx = plat.x; cx < plat.x + plat.w; cx += 8) {
                    ctx.beginPath();
                    ctx.moveTo(cx, stripeY);
                    ctx.lineTo(cx + 4, stripeY + 3);
                    ctx.lineTo(cx + 2, stripeY + 3);
                    ctx.lineTo(cx - 2, stripeY);
                    ctx.fill();
                }
            }
        } else if (plat.type === 'pipe') {
            // Tubería cilíndrica con gradiente metálico
            const pipeGrad = ctx.createLinearGradient(0, plat.y, 0, plat.y + plat.h);
            const isLava = cfg.stageNum === 2;
            const isIce = cfg.stageNum === 5;
            const isElec = cfg.stageNum === 4;
            const colDark = isLava ? '#7f1d1d' : isIce ? '#0369a1' : isElec ? '#1e1b4b' : '#14532d';
            const colMid = isLava ? '#dc2626' : isIce ? '#38bdf8' : isElec ? '#4f46e5' : '#16a34a';
            const colLight = isLava ? '#fca5a5' : isIce ? '#e0f2fe' : isElec ? '#facc15' : '#86efac';

            pipeGrad.addColorStop(0, colDark);
            pipeGrad.addColorStop(0.3, colLight);
            pipeGrad.addColorStop(0.6, colMid);
            pipeGrad.addColorStop(1, colDark);

            ctx.fillStyle = pipeGrad;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 2);
            else ctx.rect(plat.x, plat.y, plat.w, plat.h);
            ctx.fill();

            // Bridas / Anillos de unión de la tubería
            for (let fx = plat.x + 8; fx < plat.x + plat.w - 4; fx += 24) {
                ctx.fillStyle = colDark;
                ctx.fillRect(fx - 1, plat.y - 1, 4, plat.h + 2);
                ctx.fillStyle = colLight;
                ctx.fillRect(fx, plat.y, 1.5, plat.h);
            }
        } else if (plat.type === 'metal') {
            // Plataforma flotante estilo viga I de acero
            ctx.fillStyle = cfg.stageNum === 2 ? '#451a03' : '#1e293b';
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

            // Borde superior brillante
            ctx.fillStyle = cfg.platformBorder || '#38bdf8';
            ctx.fillRect(plat.x, plat.y, plat.w, 1.5);

            // Alma de la viga con celosía diagonal
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            for (let lx = plat.x + 4; lx < plat.x + plat.w - 4; lx += 8) {
                ctx.beginPath();
                ctx.moveTo(lx, plat.y + 2);
                ctx.lineTo(lx + 4, plat.y + plat.h - 1);
                ctx.stroke();
            }

            // Sombra inferior
            ctx.fillStyle = '#020617';
            ctx.fillRect(plat.x, plat.y + plat.h - 1.5, plat.w, 1.5);
        } else if (plat.type === 'wall') {
            ctx.fillStyle = cfg.platformGround;
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = cfg.platformBorder;
            ctx.fillRect(plat.x, plat.y, 2, plat.h);
            ctx.fillStyle = '#060d15';
            for (let ry = 8; ry < plat.h; ry += 12) {
                ctx.fillRect(plat.x + 4, ry, 3, 2);
            }
        }
    });
}

function renderBossGate() {
    const gate = GameState.bossGate;
    if (!gate) return;

    // Postes laterales de acero de la compuerta
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(gate.x - 3, 0, 3, 136);
    ctx.fillRect(gate.x + gate.w, 0, 3, 136);

    // Luces indicadoras de advertencia
    ctx.fillStyle = gate.sealed ? '#ef4444' : (gate.state === 'OPENING' || gate.state === 'OPEN' ? '#22c55e' : '#f59e0b');
    ctx.fillRect(gate.x - 2, 8, 2, 6);
    ctx.fillRect(gate.x + gate.w, 8, 2, 6);

    // Persiana corrediza con biseles
    ctx.save();
    ctx.beginPath();
    ctx.rect(gate.x, 0, gate.w, 136);
    ctx.clip();

    const drawY = gate.currentY;
    const barHeight = 8;
    const totalBars = Math.ceil(gate.h / barHeight) + 4;

    for (let i = 0; i < totalBars; i++) {
        const sy = drawY + i * barHeight;
        if (sy > 136 || sy + barHeight < 0) continue;

        // Franjas amarillas y negras de advertencia industrial
        const isYellow = (i % 2 === 0);
        ctx.fillStyle = isYellow ? '#facc15' : '#0f172a';
        ctx.fillRect(gate.x, sy, gate.w, barHeight);

        // Bisel superior brillante
        ctx.fillStyle = isYellow ? '#fef08a' : '#334155';
        ctx.fillRect(gate.x, sy, gate.w, 1.5);

        // Pernos / Remaches en cada barra
        ctx.fillStyle = isYellow ? '#ca8a04' : '#020617';
        ctx.fillRect(gate.x + 2, sy + 3, 2, 2);
        ctx.fillRect(gate.x + gate.w - 4, sy + 3, 2, 2);
    }

    ctx.restore();
}

function renderSpikes() {
    const cfg = GameState.stageConfig || getStageConfig(GameState.level || 1);

    if (cfg.hazardType === 'lava') {
        GameState.spikes.forEach(sp => {
            // Fondo de lava volcánica ardiente
            const lavaGrad = ctx.createLinearGradient(0, sp.y, 0, sp.y + sp.h);
            lavaGrad.addColorStop(0, '#f97316');
            lavaGrad.addColorStop(0.3, '#dc2626');
            lavaGrad.addColorStop(1, '#7f1d1d');
            ctx.fillStyle = lavaGrad;
            ctx.fillRect(sp.x, sp.y, sp.w, sp.h);

            ctx.fillStyle = '#fef08a';
            ctx.fillRect(sp.x, sp.y, sp.w, 1.5);

            const t = Date.now() / 150;
            for (let bx = sp.x + 4; bx < sp.x + sp.w; bx += 14) {
                const bOffset = Math.sin(t + bx) * 2;
                ctx.fillStyle = '#ffea00';
                ctx.beginPath();
                ctx.arc(bx, sp.y + 1 + bOffset, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    } else if (cfg.hazardType === 'electric') {
        GameState.spikes.forEach(sp => {
            // Fosa con descarga eléctrica de alta tensión
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(sp.x, sp.y, sp.w, sp.h);

            // Rejilla electrificada
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(sp.x, sp.y, sp.w, 2);

            // Arcos de chispas y relámpagos zumbantes
            const tEl = Date.now() / 80;
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            for (let ex = sp.x + 4; ex < sp.x + sp.w; ex += 16) {
                const yOff = Math.sin(tEl + ex) * 4;
                ctx.beginPath();
                ctx.moveTo(ex, sp.y + sp.h);
                ctx.lineTo(ex + 4, sp.y + 2 + yOff);
                ctx.lineTo(ex + 8, sp.y + 6);
                ctx.stroke();

                ctx.fillStyle = '#fef08a';
                ctx.fillRect(ex + 3, sp.y + 1 + yOff, 2, 2);
            }
        });
    } else if (cfg.hazardType === 'ice_spikes') {
        GameState.spikes.forEach(sp => {
            // Estalagmitas de hielo cristalino afilado
            for (let sx = sp.x; sx < sp.x + sp.w; sx += 6) {
                ctx.fillStyle = '#7dd3fc';
                ctx.beginPath();
                ctx.moveTo(sx, sp.y + sp.h);
                ctx.lineTo(sx + 3, sp.y);
                ctx.lineTo(sx + 3, sp.y + sp.h);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#0284c7';
                ctx.beginPath();
                ctx.moveTo(sx + 3, sp.y);
                ctx.lineTo(sx + 6, sp.y + sp.h);
                ctx.lineTo(sx + 3, sp.y + sp.h);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 2.5, sp.y, 1, 3);
            }
        });
    } else if (cfg.hazardType === 'acid') {
        GameState.spikes.forEach(sp => {
            // Ácido corrosivo verde tóxico de Dr. Wily
            const acidGrad = ctx.createLinearGradient(0, sp.y, 0, sp.y + sp.h);
            acidGrad.addColorStop(0, '#22c55e');
            acidGrad.addColorStop(0.4, '#15803d');
            acidGrad.addColorStop(1, '#14532d');
            ctx.fillStyle = acidGrad;
            ctx.fillRect(sp.x, sp.y, sp.w, sp.h);

            // Cresta brillante de espuma tóxica
            ctx.fillStyle = '#86efac';
            ctx.fillRect(sp.x, sp.y, sp.w, 1.5);

            // Burbujas de ácido estallando
            const tA = Date.now() / 140;
            for (let ax = sp.x + 6; ax < sp.x + sp.w; ax += 18) {
                const bubbleY = Math.sin(tA + ax) * 2;
                ctx.fillStyle = '#4ade80';
                ctx.beginPath();
                ctx.arc(ax, sp.y + 2 + bubbleY, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(ax - 0.5, sp.y + 1 + bubbleY, 1, 1);
            }
        });
    } else {
        GameState.spikes.forEach(sp => {
            // Pinchos metálicos 3D con facetado y punta afilada
            for (let sx = sp.x; sx < sp.x + sp.w; sx += 6) {
                ctx.fillStyle = cfg.stageNum === 3 ? '#facc15' : '#f87171';
                ctx.beginPath();
                ctx.moveTo(sx, sp.y + sp.h);
                ctx.lineTo(sx + 3, sp.y);
                ctx.lineTo(sx + 3, sp.y + sp.h);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = cfg.stageNum === 3 ? '#a16207' : '#991b1b';
                ctx.beginPath();
                ctx.moveTo(sx + 3, sp.y);
                ctx.lineTo(sx + 6, sp.y + sp.h);
                ctx.lineTo(sx + 3, sp.y + sp.h);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx + 2.5, sp.y, 1, 3);
            }
        });
    }
}

function renderPickups() {
    GameState.pickups.forEach(pick => {
        if (pick.collected) return;
        // Cápsula redondeada 3D brillante
        ctx.save();
        ctx.translate(pick.x, pick.y);

        // Sombra de cápsula
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(pick.w / 2, pick.h + 1, pick.w / 2, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Contenedor cilíndrico de vidrio
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(0, 0, pick.w, pick.h, 4);
        else ctx.rect(0, 0, pick.w, pick.h);
        ctx.fill();

        // Núcleo de energía de plasma cian
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(2, 2, pick.w - 4, pick.h - 4, 3);
        else ctx.rect(2, 2, pick.w - 4, pick.h - 4);
        ctx.fill();

        // Brillo blanco interior
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(3, 3, 2, pick.h - 6);

        // Letra P de Power
        ctx.fillStyle = '#ffffff';
        ctx.font = '5px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('P', pick.w / 2, pick.h - 2.5);

        ctx.restore();
    });
}

function renderMegaMan() {
    const p = GameState.player;

    // Parpadeo durante invulnerabilidad
    if (p.invulnTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) return;

    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));

    // Si mira a la izquierda, reflejar horizontalmente
    if (p.facing === -1) {
        ctx.translate(p.w, 0);
        ctx.scale(-1, 1);
    }

    // Colores del sprite orgánico de Mega Man
    let armorDark = '#1d4ed8';       // Azul cobalto profundo
    let armorMid = '#2563eb';        // Azul clásico
    let armorLight = '#60a5fa';      // Resplandor azul
    let bodyColor = '#00d2ff';       // Cian brillante
    let bodyLight = '#a5f3fc';       // Brillo cian
    let faceColor = '#fed7aa';       // Tono piel anime
    let faceShadow = '#fba268';      // Sombra facial

    // Aura de carga pulsante
    if (p.isCharging) {
        const pulse = Math.floor(Date.now() / 70) % 3;
        if (pulse === 1) {
            armorDark = '#15803d';
            armorMid = '#16a34a';
            armorLight = '#86efac';
            bodyColor = '#4ade80';
        } else if (pulse === 2 && p.chargeTime >= 1.0) {
            armorDark = '#c2410c';
            armorMid = '#ea580c';
            armorLight = '#fde047';
            bodyColor = '#facc15';
        }

        // Ondas de plasma circulares alrededor de Mega Man
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const rWave = 12 + (Date.now() % 200) / 15;
        ctx.arc(p.w / 2, p.h / 2, rWave, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (p.isSliding) {
        // --- POSE DE DESLIZAMIENTO (SLIDE) CURVADA Y AERODINÁMICA ---
        // Líneas de velocidad / plasma cian en la estela
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.fillRect(-6, 15, 8, 2);
        ctx.fillRect(-10, 18, 10, 2);

        // Casco bajo aerodinámico
        ctx.fillStyle = armorDark;
        ctx.beginPath();
        ctx.ellipse(15, 14, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = armorLight;
        ctx.fillRect(13, 11, 4, 2);

        // Rostro mirando al frente
        ctx.fillStyle = faceColor;
        ctx.fillRect(16, 13, 4, 3);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(18, 14, 1.5, 1.5);

        // Torso bajo extendido
        ctx.fillStyle = bodyColor;
        ctx.fillRect(7, 13, 8, 6);
        ctx.fillStyle = bodyLight;
        ctx.fillRect(7, 13, 8, 1.5);

        // Piernas y botas extendidas horizontalmente
        ctx.fillStyle = armorMid;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(0, 16, 16, 6, 3);
        else ctx.rect(0, 16, 16, 6);
        ctx.fill();

        // Suela de las botas
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 21, 16, 2);

        // Destellos de fricción en el piso
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(1, 22, 2, 1);
        ctx.fillRect(8, 22, 2, 1);
    } else {
        // --- MEGA MAN DE PIE / CORRIENDO / SALTANDO (ALTA DEFINICIÓN) ---
        const bobY = (!p.onGround) ? -1 : (Math.abs(p.vx) > 0 ? (Math.floor(p.runAnimTimer * 2) % 2) : 0);

        // 1. Casco azul redondeado y estilizado
        ctx.fillStyle = armorDark;
        ctx.beginPath();
        ctx.arc(8, 5 + bobY, 6.5, Math.PI, 0); // Corona superior redondeada
        ctx.lineTo(14.5, 9 + bobY);
        ctx.lineTo(2.5, 9 + bobY);
        ctx.closePath();
        ctx.fill();

        // Cresta central del casco (elevación aerodinámica)
        ctx.fillStyle = armorMid;
        ctx.beginPath();
        ctx.moveTo(6, 2 + bobY);
        ctx.lineTo(8, -1 + bobY);
        ctx.lineTo(10, 2 + bobY);
        ctx.closePath();
        ctx.fill();
        // Brillo de la cresta
        ctx.fillStyle = bodyColor;
        ctx.fillRect(7.5, 0 + bobY, 1.5, 4);

        // Brillo especular en la frente del casco
        ctx.fillStyle = armorLight;
        ctx.beginPath();
        ctx.ellipse(7.5, 3 + bobY, 3.5, 1.2, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Orejera cilíndrica con sensor cian brillante
        ctx.fillStyle = armorDark;
        ctx.beginPath();
        ctx.arc(3.5, 6 + bobY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(3.5, 6 + bobY, 1.4, 0, Math.PI * 2);
        ctx.fill();

        // 2. Rostro anime detallado con expresión determinada
        ctx.fillStyle = faceShadow;
        ctx.fillRect(7, 5 + bobY, 6.5, 1.5); // Sombra del casco sobre la frente
        ctx.fillStyle = faceColor;
        ctx.beginPath();
        ctx.moveTo(6.5, 6.5 + bobY);
        ctx.lineTo(13.5, 6.5 + bobY);
        ctx.lineTo(13, 10.5 + bobY);
        ctx.lineTo(8.5, 11.5 + bobY); // Mentón redondeado
        ctx.lineTo(6.5, 9.5 + bobY);
        ctx.closePath();
        ctx.fill();

        // Ojo grande expresivo con parpadeo natural
        const isBlinking = (p.onGround && Math.abs(p.vx) === 0 && !p.isShooting && !p.isSliding && p.blinkTimer > 3.35 && p.blinkTimer < 3.55);
        if (isBlinking) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(9.5, 8 + bobY, 3, 1.5);
            ctx.fillStyle = faceShadow;
            ctx.fillRect(9.5, 7 + bobY, 3, 1);
        } else {
            ctx.fillStyle = '#0f172a'; // Contorno / pestaña superior
            ctx.fillRect(9.5, 6.5 + bobY, 3, 3.5);
            ctx.fillStyle = '#1e3a8a'; // Iris azul zafiro
            ctx.fillRect(10, 7 + bobY, 2.2, 2.8);
            ctx.fillStyle = '#ffffff'; // Destello blanco en la pupila (vida en la mirada)
            ctx.fillRect(11, 7 + bobY, 1.2, 1.2);
        }

        // 3. Torso y coraza pectoral cian
        ctx.fillStyle = armorDark; // Cuello y hombros base
        ctx.fillRect(4.5, 10.5 + bobY, 7.5, 2.5);

        // Pectoral cian contorneado
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(4, 11 + bobY, 8.5, 5.5, 2);
        else ctx.rect(4, 11 + bobY, 8.5, 5.5);
        ctx.fill();
        // Brillo superior del pectoral
        ctx.fillStyle = bodyLight;
        ctx.fillRect(4.5, 11.5 + bobY, 7.5, 1.5);
        // Sombra inferior del pectoral
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(4.5, 15 + bobY, 7.5, 1.5);

        // Cinturón azul marino
        ctx.fillStyle = armorDark;
        ctx.fillRect(4.5, 16.5 + bobY, 7.5, 2);
        ctx.fillStyle = bodyColor;
        ctx.fillRect(7.5, 16.5 + bobY, 2, 2); // Hebilla

        // 4. Brazos / Mega Buster
        if (p.isShooting) {
            // Cañón Buster extendido hacia adelante
            ctx.fillStyle = armorDark;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(9, 11 + bobY, 9, 5, 2);
            else ctx.rect(9, 11 + bobY, 9, 5);
            ctx.fill();

            // Ranura de ventilación y anillo de la boca
            ctx.fillStyle = bodyColor;
            ctx.fillRect(12, 12 + bobY, 3, 1.2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(17, 11.5 + bobY, 2, 4); // Anillo de salida

            // Núcleo de energía dentro del cañón
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(18.5, 12 + bobY, 1, 3);

            // Destello de disparo (Muzzle Flash burst)
            if (p.shootAnimTimer > 0.12) {
                const fx = 21;
                const fy = 13.5 + bobY;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(fx - 1, fy - 1, 3, 3);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(fx + 2, fy - 0.5, 3, 1);
                ctx.fillRect(fx - 4, fy - 0.5, 3, 1);
                ctx.fillRect(fx - 0.5, fy - 4, 1, 3);
                ctx.fillRect(fx - 0.5, fy + 2, 1, 3);
            }
        } else {
            // Brazo izquierdo en reposo con guantelete
            ctx.fillStyle = armorMid;
            ctx.beginPath();
            ctx.arc(3.5, 13.5 + bobY, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = armorDark;
            ctx.fillRect(2, 13.5 + bobY, 3, 3);
        }

        // 5. Piernas y Botas acampanadas (Animación dinámica)
        ctx.fillStyle = armorDark;

        if (!p.onGround) {
            // --- SALTO: Piernas recogidas aerodinámicas ---
            // Pierna izquierda doblada
            ctx.beginPath();
            ctx.arc(4, 18, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(1, 18, 6, 5);

            // Pierna derecha extendida hacia atrás
            ctx.beginPath();
            ctx.arc(11, 17, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(9, 17, 6, 5);

            // Suelas de salto
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(1, 22, 6, 1.5);
            ctx.fillRect(9, 21, 6, 1.5);
        } else if (Math.abs(p.vx) > 0) {
            // --- CORRER: Zancada fluida con botas acampanadas (3 frames) ---
            const frame = Math.floor(p.runAnimTimer) % 3;
            if (frame === 0) {
                // Pierna delantera adelantada con bota curvada
                ctx.fillStyle = armorMid;
                ctx.fillRect(1, 17 + bobY, 5, 6);
                ctx.fillStyle = armorDark;
                ctx.fillRect(0, 20 + bobY, 6, 3.5);

                // Pierna trasera retrasada
                ctx.fillStyle = armorMid;
                ctx.fillRect(9, 17 + bobY, 5, 5);
                ctx.fillStyle = armorDark;
                ctx.fillRect(9, 19 + bobY, 6, 4);
            } else if (frame === 1) {
                // Posición intermedia
                ctx.fillStyle = armorMid;
                ctx.fillRect(3.5, 17 + bobY, 4.5, 6.5);
                ctx.fillStyle = armorDark;
                ctx.fillRect(2.5, 20.5 + bobY, 5.5, 3.5);

                ctx.fillStyle = armorMid;
                ctx.fillRect(8.5, 17 + bobY, 4.5, 6.5);
                ctx.fillStyle = armorDark;
                ctx.fillRect(7.5, 20.5 + bobY, 5.5, 3.5);
            } else {
                // Pierna trasera adelantada
                ctx.fillStyle = armorMid;
                ctx.fillRect(0, 17 + bobY, 5, 5);
                ctx.fillStyle = armorDark;
                ctx.fillRect(0, 19 + bobY, 6, 4);

                ctx.fillStyle = armorMid;
                ctx.fillRect(8, 17 + bobY, 5, 6);
                ctx.fillStyle = armorDark;
                ctx.fillRect(8, 20 + bobY, 6, 3.5);
            }

            // Suelas de las botas
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 23 + bobY, 14, 1.5);
        } else {
            // --- DE PIE: Pose heroica con botas firmes ---
            ctx.fillStyle = armorMid;
            ctx.fillRect(2.5, 17, 4.5, 6);
            ctx.fillRect(8.5, 17, 4.5, 6);

            // Botas acampanadas en la base
            ctx.fillStyle = armorDark;
            ctx.fillRect(1.5, 20, 5.5, 3.5);
            ctx.fillRect(7.5, 20, 5.5, 3.5);

            // Reflejo en la rodilla
            ctx.fillStyle = armorLight;
            ctx.fillRect(3, 18, 2, 2);
            ctx.fillRect(9, 18, 2, 2);

            // Suelas de goma
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(1.5, 23, 5.5, 1.5);
            ctx.fillRect(7.5, 23, 5.5, 1.5);
        }
    }

    ctx.restore();
}

function renderBoss() {
    const b = GameState.boss;
    if (b.hp <= 0) return;

    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));

    if (b.facing === 1) {
        ctx.translate(b.w, 0);
        ctx.scale(-1, 1);
    }

    // Parpadeo blanco al recibir daño
    const isFlashing = b.invulnTimer > 0 && Math.floor(Date.now() / 40) % 2 === 0;

    if (b.bossType === 'fireman') {
        // --- FIRE MAN: Antorcha de fuego fluida y cañones de llama ---
        // Cabeza y coraza
        ctx.fillStyle = isFlashing ? '#ffffff' : '#dc2626';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(3, 2, 14, 14, 3);
        else ctx.rect(3, 2, 14, 14);
        ctx.fill();

        // Llama orgánica en la cabeza (Curvas Bézier vivas)
        const tFlame = Date.now() / 90;
        const flameWave = Math.sin(tFlame) * 2;
        // Capa exterior roja
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(6, 2);
        ctx.quadraticCurveTo(7 + flameWave, -7, 10 + flameWave, -11);
        ctx.quadraticCurveTo(13 - flameWave, -6, 14, 2);
        ctx.closePath();
        ctx.fill();

        // Capa media naranja
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(7, 2);
        ctx.quadraticCurveTo(8 + flameWave, -5, 10 + flameWave, -8);
        ctx.quadraticCurveTo(12 - flameWave, -4, 13, 2);
        ctx.closePath();
        ctx.fill();

        // Núcleo caliente amarillo
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(8.5, 2);
        ctx.lineTo(10 + flameWave, -4);
        ctx.lineTo(11.5, 2);
        ctx.closePath();
        ctx.fill();

        // Visor / Ojos
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(6, 5, 4, 3);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(7, 6, 2, 1.5);

        // Pecho con reactor de fuego
        ctx.fillStyle = isFlashing ? '#ffffff' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(10, 11, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(9, 10, 2, 2);

        // Cañones de fuego en las manos
        ctx.fillStyle = isFlashing ? '#ffffff' : '#f59e0b';
        ctx.fillRect(0, 8, 4, 6);
        ctx.fillRect(16, 8, 4, 6);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(0, 10, 1.5, 3);
        ctx.fillRect(18.5, 10, 1.5, 3);

        // Botas acampanadas
        ctx.fillStyle = isFlashing ? '#ffffff' : '#991b1b';
        ctx.fillRect(2, 16, 6, 10);
        ctx.fillRect(12, 16, 6, 10);
    } else if (b.bossType === 'gutsman') {
        // --- GUTS MAN: Robot de construcción pesado con hombreras gigantes ---
        // Casco pesado con visera
        ctx.fillStyle = isFlashing ? '#ffffff' : '#eab308';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(3, -3, 16, 10, 3);
        else ctx.rect(3, -3, 16, 10);
        ctx.fill();
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(2, 3, 18, 3);

        // Mandíbula blindada
        ctx.fillStyle = isFlashing ? '#ffffff' : '#334155';
        ctx.fillRect(4, 6, 14, 5);

        // Visor de ojos
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(6, 2, 4, 2);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(7, 2, 2, 1.5);

        // Hombreras redondeadas gigantes
        ctx.fillStyle = isFlashing ? '#ffffff' : '#65a30d';
        ctx.beginPath();
        ctx.arc(1, 7, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(21, 7, 5, 0, Math.PI * 2);
        ctx.fill();

        // Torso marrón acorazado
        ctx.fillStyle = isFlashing ? '#ffffff' : '#5c3d1e';
        ctx.fillRect(3, 7, 16, 10);
        ctx.fillStyle = '#84cc16';
        ctx.fillRect(6, 9, 10, 6);

        // Botas macizas
        ctx.fillStyle = isFlashing ? '#ffffff' : '#1e293b';
        ctx.fillRect(1, 17, 8, 11);
        ctx.fillRect(13, 17, 8, 11);
    } else if (b.bossType === 'elecman') {
        // --- ELEC MAN: Máscara eléctrica de sol y traje oro/negro ---
        // 1. Casco con máscara de rayo de 5 puntas
        ctx.fillStyle = isFlashing ? '#ffffff' : '#facc15';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(4, 1, 12, 11, 2);
        else ctx.rect(4, 1, 12, 11);
        ctx.fill();

        // Puntas del sol / corona eléctrica de la máscara
        ctx.fillStyle = isFlashing ? '#ffffff' : '#eab308';
        ctx.beginPath();
        ctx.moveTo(9, 1); ctx.lineTo(10, -5); ctx.lineTo(11, 1); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(5, 2); ctx.lineTo(2, -3); ctx.lineTo(7, 2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(13, 2); ctx.lineTo(17, -3); ctx.lineTo(15, 2); ctx.fill();

        // Visor negro con ojos cian brillantes
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(5, 4, 10, 3.5);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(6, 5, 2.5, 2);
        ctx.fillRect(11, 5, 2.5, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(7, 5, 1, 1);
        ctx.fillRect(12, 5, 1, 1);

        // 2. Torso aerodinámico negro con rayo dorado
        ctx.fillStyle = isFlashing ? '#ffffff' : '#1e1b4b';
        ctx.fillRect(4, 12, 12, 7);
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(11, 12);
        ctx.lineTo(8, 15);
        ctx.lineTo(10, 15);
        ctx.lineTo(9, 18);
        ctx.lineTo(12, 14);
        ctx.lineTo(10, 14);
        ctx.closePath();
        ctx.fill();

        // 3. Guanteletes con bobinas de chispa
        ctx.fillStyle = isFlashing ? '#ffffff' : '#eab308';
        ctx.fillRect(1, 11, 3.5, 6);
        ctx.fillRect(15.5, 11, 3.5, 6);
        if (Math.sin(Date.now() / 60) > 0.2) {
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(0, 13, 2, 2);
            ctx.fillRect(17.5, 13, 2, 2);
        }

        // 4. Botas altas doradas y negras
        ctx.fillStyle = isFlashing ? '#ffffff' : '#eab308';
        ctx.fillRect(2.5, 18, 6, 8);
        ctx.fillRect(11.5, 18, 6, 8);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(2.5, 24, 6, 2);
        ctx.fillRect(11.5, 24, 6, 2);
    } else if (b.bossType === 'iceman') {
        // --- ICE MAN: Robot polar con capucha de esquimal y gafas glaciares ---
        // 1. Capucha de parka polar azul con ribete de pelo blanco
        ctx.fillStyle = isFlashing ? '#ffffff' : '#0284c7';
        ctx.beginPath();
        ctx.arc(10, 6, 7.5, 0, Math.PI * 2);
        ctx.fill();

        // Ribete de pelo blanco de la capucha
        ctx.fillStyle = '#f0fdf4';
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
            ctx.beginPath();
            ctx.arc(10 + Math.cos(a) * 7.5, 6 + Math.sin(a) * 7.5, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Rostro dentro de la capucha
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(6, 4, 8, 7);

        // Gafas de ventisca (Goggles) azules con reflejo
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(5, 4, 10, 4);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(6, 4.5, 3.5, 3);
        ctx.fillRect(10.5, 4.5, 3.5, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(7, 4.5, 1.5, 1.5);
        ctx.fillRect(11.5, 4.5, 1.5, 1.5);

        // Boca decidida
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(9, 9.5, 2, 1);

        // 2. Torso con abrigo polar azul y cinturón blanco
        ctx.fillStyle = isFlashing ? '#ffffff' : '#0284c7';
        ctx.fillRect(4, 12, 12, 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(4, 16, 12, 2.5);

        // 3. Manoplas / guantes blancos gruesos
        ctx.fillStyle = isFlashing ? '#ffffff' : '#f8fafc';
        ctx.beginPath();
        ctx.arc(2, 14, 3, 0, Math.PI * 2);
        ctx.arc(18, 14, 3, 0, Math.PI * 2);
        ctx.fill();

        // 4. Botas de nieve polares con suela de tracción
        ctx.fillStyle = isFlashing ? '#ffffff' : '#0369a1';
        ctx.fillRect(3, 19, 5.5, 7);
        ctx.fillRect(11.5, 19, 5.5, 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(2.5, 18, 6.5, 2);
        ctx.fillRect(11, 18, 6.5, 2);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(3, 24.5, 5.5, 1.5);
        ctx.fillRect(11.5, 24.5, 5.5, 1.5);
    } else if (b.bossType === 'wily') {
        // --- DR. WILY: Máquina voladora / Cápsula Calavera de combate ---
        // 1. Cúpula de cristal transparente superior
        ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.beginPath();
        ctx.arc(13, 7, 7, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Silueta cómica de Dr. Wily dentro de la cúpula
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(13, 6, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(9, 4, 2, 4);
        ctx.fillRect(15, 4, 2, 4);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(11, 7, 4, 1.5);

        // 2. Chasis del platillo / cápsula blindada púrpura
        ctx.fillStyle = isFlashing ? '#ffffff' : '#581c87';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(2, 7, 22, 14, 4);
        else ctx.rect(2, 7, 22, 14);
        ctx.fill();

        // 3. Calavera metálica en el frontal de la máquina
        ctx.fillStyle = isFlashing ? '#ffffff' : '#e2e8f0';
        ctx.beginPath();
        ctx.arc(13, 13, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(10, 11, 2.5, 2.5);
        ctx.fillRect(13.5, 11, 2.5, 2.5);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(10.5, 11.5, 1.5, 1.5);
        ctx.fillRect(14, 11.5, 1.5, 1.5);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(11, 16, 4, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(11.5, 16, 1, 1.5);
        ctx.fillRect(13.5, 16, 1, 1.5);

        // 4. Cañones láser laterales
        ctx.fillStyle = '#3b0764';
        ctx.fillRect(0, 12, 3, 4);
        ctx.fillRect(23, 12, 3, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(0, 13, 1, 2);
        ctx.fillRect(25, 13, 1, 2);

        // 5. Tobera de propulsión inferior con llamarada de plasma
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(9, 21, 8, 3);
        const tJet = Date.now() / 40;
        const jetH = 3 + (Math.sin(tJet) + 1) * 2;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(10, 24);
        ctx.lineTo(13, 24 + jetH);
        ctx.lineTo(16, 24);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(12, 24, 2, jetH * 0.5);
    } else {
        // --- CUT MAN: Tijeras curvas afiladas y chasis cerámico ---
        // Cuchillas tijera superiores (Curvas reales con filo brillante)
        ctx.fillStyle = '#cbd5e1';
        // Hoja izquierda
        ctx.beginPath();
        ctx.moveTo(8, -1);
        ctx.quadraticCurveTo(3, -6, 2, -12);
        ctx.quadraticCurveTo(6, -11, 9, -2);
        ctx.closePath();
        ctx.fill();

        // Hoja derecha
        ctx.beginPath();
        ctx.moveTo(11, -1);
        ctx.quadraticCurveTo(16, -6, 17, -12);
        ctx.quadraticCurveTo(13, -11, 10, -2);
        ctx.closePath();
        ctx.fill();

        // Filo cortante blanco
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(2, -12);
        ctx.lineTo(8, -1);
        ctx.moveTo(17, -12);
        ctx.lineTo(11, -1);
        ctx.stroke();

        // Perno central de las tijeras
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(9.5, -1.5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Cabeza redondeada
        ctx.fillStyle = isFlashing ? '#ffffff' : '#fcd34d';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(4, 0, 12, 10, 3);
        else ctx.rect(4, 0, 12, 10);
        ctx.fill();

        // Ojos
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(6, 3, 2.5, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(7, 3, 1, 1);

        // Chasis naranja
        ctx.fillStyle = isFlashing ? '#ffffff' : '#f59e0b';
        ctx.fillRect(3, 10, 14, 7);
        // Emblema circular en el pecho
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(10, 13.5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Botas
        ctx.fillStyle = isFlashing ? '#ffffff' : '#b45309';
        ctx.fillRect(2, 17, 6, 9);
        ctx.fillRect(12, 17, 6, 9);
    }

    ctx.restore();
}

function renderEnemies() {
    GameState.enemies.forEach(e => {
        ctx.save();
        ctx.translate(Math.round(e.x), Math.round(e.y));

        const isHurt = e.hurtTimer > 0;

        if (e.type === 'metool') {
            // --- METOOL: Casco de construcción redondeado con insignia de cruz ---
            const helmColor = isHurt ? '#ffffff' : (e.subtype === 'fire' ? '#ea580c' : e.subtype === 'miner' ? '#78350f' : '#facc15');

            // Cúpula del casco
            ctx.fillStyle = helmColor;
            ctx.beginPath();
            ctx.arc(7, 6, 6.5, Math.PI, 0);
            ctx.fill();

            // Ala delantera del casco
            ctx.fillRect(0, 6, 14, 3);

            // Reflejo brillante superior
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.ellipse(6, 3, 3, 1, 0, 0, Math.PI * 2);
            ctx.fill();

            // Insignia de cruz de seguridad
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(6, 3.5, 2, 2);

            if (e.state === 'ATTACKING') {
                // Asoma los ojos
                ctx.fillStyle = isHurt ? '#ffffff' : '#0f172a';
                ctx.fillRect(2, 7, 10, 4);
                // Ojos brillantes
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(3, 8, 2, 2);
                ctx.fillRect(8, 8, 2, 2);
            }

            // Pies pequeños
            ctx.fillStyle = isHurt ? '#ffffff' : (e.subtype === 'fire' ? '#991b1b' : '#78350f');
            ctx.beginPath();
            ctx.arc(3, 10, 1.5, 0, Math.PI * 2);
            ctx.arc(11, 10, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (e.type === 'blader') {
            // --- BLADER: Dron helicóptero con aspas giratorias ---
            const bodyColor = isHurt ? '#ffffff' : (e.subtype === 'fire' ? '#ef4444' : e.subtype === 'quarry' ? '#65a30d' : '#38bdf8');

            // Cuerpo aerodinámico
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.ellipse(7, 7, 5, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Visor rojo
            ctx.fillStyle = isHurt ? '#ffffff' : '#ef4444';
            ctx.fillRect(7, 6, 4, 2.5);

            // Aspas giratorias con difuminado de movimiento
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            const hRot = Math.floor(Date.now() / 35) % 2;
            if (hRot) {
                ctx.fillRect(0, 2, 14, 1.5);
            } else {
                ctx.fillRect(3, 1.5, 8, 2);
            }
        } else if (e.type === 'spikey') {
            // --- SPIKEY: Rueda con púas cónicas 3D y centro metálico ---
            const wheelColor = isHurt ? '#ffffff' : (e.subtype === 'fire' ? '#dc2626' : e.subtype === 'boulder' ? '#475569' : '#64748b');

            // Giro animado
            ctx.save();
            ctx.translate(7, 6);
            ctx.rotate(Date.now() / 80);

            // Púas cónicas en 4 direcciones
            ctx.fillStyle = isHurt ? '#ffffff' : '#ef4444';
            for (let a = 0; a < 4; a++) {
                ctx.rotate(Math.PI / 2);
                ctx.beginPath();
                ctx.moveTo(-2, -5);
                ctx.lineTo(0, -8);
                ctx.lineTo(2, -5);
                ctx.closePath();
                ctx.fill();
            }

            // Cuerpo circular de la rueda
            ctx.fillStyle = wheelColor;
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();

            // Centro del eje
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        ctx.restore();
    });
}

function renderBullets() {
    // Balas de Mega Man
    GameState.bullets.forEach(b => {
        if (b.charged) {
            // Super disparo cargado: esfera de plasma cósmica con anillos de choque
            ctx.save();
            ctx.translate(b.x + b.w / 2, b.y + b.h / 2);

            // Resplandor exterior pulsante
            const rPulse = 7 + (Date.now() % 100) / 30;
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, rPulse, 0, Math.PI * 2);
            ctx.fill();

            // Núcleo plasmático brillante
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.ellipse(0, 0, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Centro blanco ardiente
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(0, 0, b.w / 3, b.h / 3, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        } else {
            // Disparo normal de Buster: Lemon pellet redondeado con resplandor
            ctx.save();
            ctx.translate(b.x, b.y);

            // Halo exterior amarillo / cian
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(0, 0, b.w, b.h, 2.5);
            else ctx.rect(0, 0, b.w, b.h);
            ctx.fill();

            // Centro blanco de alta energía
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(1, 0.8, b.w - 2, b.h - 1.6, 2);
            else ctx.rect(1, 0.8, b.w - 2, b.h - 1.6);
            ctx.fill();

            ctx.restore();
        }
    });

    // Balas enemigas
    GameState.enemyBullets.forEach(eb => {
        if (eb.isBlade) {
            // Cuchilla rodante de Cut Man
            ctx.save();
            ctx.translate(eb.x + 5, eb.y + 5);
            ctx.rotate(Date.now() / 45);

            ctx.fillStyle = '#f1f5f9';
            ctx.beginPath();
            ctx.moveTo(-5, -2);
            ctx.lineTo(0, -6);
            ctx.lineTo(5, -2);
            ctx.lineTo(2, 0);
            ctx.lineTo(5, 5);
            ctx.lineTo(-2, 2);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        } else if (eb.isFire) {
            // Bola de fuego de Fire Man
            ctx.save();
            ctx.translate(eb.x + 5, eb.y + 5);
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        } else if (eb.isBoulder) {
            // Roca rodante de Guts Man facetada con cráteres
            ctx.save();
            ctx.translate(eb.x + 6, eb.y + 6);
            ctx.rotate(Date.now() / 80);

            // Silueta de roca facetada
            ctx.fillStyle = '#78716c';
            ctx.beginPath();
            ctx.moveTo(-5, -3);
            ctx.lineTo(-2, -6);
            ctx.lineTo(4, -5);
            ctx.lineTo(6, 1);
            ctx.lineTo(3, 6);
            ctx.lineTo(-4, 5);
            ctx.closePath();
            ctx.fill();

            // Cráteres / sombras interiores
            ctx.fillStyle = '#44403c';
            ctx.fillRect(-2, -2, 3, 3);
            ctx.fillRect(2, 1, 2, 2);

            // Reflejo
            ctx.fillStyle = '#d6d3d1';
            ctx.fillRect(-1, -4, 2, 1.5);

            ctx.restore();
        } else if (eb.isLightning) {
            // Thunder Beam de Elec Man: Relámpago en zigzag de alta energía
            ctx.save();
            ctx.translate(eb.x, eb.y + 4);
            // Corona exterior cian
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(4, -3);
            ctx.lineTo(8, 3);
            ctx.lineTo(12, 0);
            ctx.stroke();

            // Núcleo blanco/amarillo
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(4, -3);
            ctx.lineTo(8, 3);
            ctx.lineTo(12, 0);
            ctx.stroke();

            ctx.restore();
        } else if (eb.isIce) {
            // Ice Slasher de Ice Man: Dardo de hielo cristalino facetado
            ctx.save();
            ctx.translate(eb.x + 5, eb.y + 4);
            const ang = Math.atan2(eb.vy, eb.vx);
            ctx.rotate(ang);

            // Cuerpo del carámbano
            ctx.fillStyle = '#7dd3fc';
            ctx.beginPath();
            ctx.moveTo(6, 0);
            ctx.lineTo(-4, -4);
            ctx.lineTo(-2, 0);
            ctx.lineTo(-4, 4);
            ctx.closePath();
            ctx.fill();

            // Filo interior blanco puro
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(5, 0);
            ctx.lineTo(-2, -1.5);
            ctx.lineTo(-2, 1.5);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        } else if (eb.isMissile) {
            // Misil Calavera de Dr. Wily
            ctx.save();
            ctx.translate(eb.x + 6, eb.y + 5);
            const dir = eb.vx < 0 ? -1 : 1;
            ctx.scale(dir, 1);

            // Ojiva roja
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(6, 0);
            ctx.lineTo(1, -4);
            ctx.lineTo(1, 4);
            ctx.closePath();
            ctx.fill();

            // Cuerpo cilíndrico púrpura
            ctx.fillStyle = '#581c87';
            ctx.fillRect(-5, -4, 6, 8);

            // Aletas estabilizadoras
            ctx.fillStyle = '#eab308';
            ctx.fillRect(-6, -6, 2, 12);

            // Emblema de calavera blanca en miniatura
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-3, -2, 3, 3);
            ctx.fillStyle = '#000000';
            ctx.fillRect(-2, -1, 1, 1);

            // Llama de escape del motor cohete
            ctx.fillStyle = '#f97316';
            ctx.fillRect(-9, -2, 3, 4);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(-7, -1, 2, 2);

            ctx.restore();
        } else {
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(eb.x + eb.w / 2, eb.y + eb.h / 2, eb.w / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function renderParticles() {
    GameState.particles.forEach(pt => {
        ctx.fillStyle = pt.color;
        if (pt.isCircle) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(0.5, pt.size || 1.5), 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(pt.x, pt.y, pt.size || 1.5, pt.size || 1.5);
        }
    });
}

function renderHUD() {
    // 1. Barra de Vida de Mega Man (Cápsula CRT de Vidrio y Neón a la izquierda)
    const barX = 7;
    const barY = 22;
    const barH = 58;

    // Carcasa exterior metálica de la cápsula
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(barX - 1.5, barY - 1.5, 7, barH + 3, 2);
    else ctx.rect(barX - 1.5, barY - 1.5, 7, barH + 3);
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Tubo interior de vidrio oscuro
    ctx.fillStyle = '#061325';
    ctx.fillRect(barX, barY, 4, barH);

    // Segmentos de diodo LED de vida (28 segmentos)
    for (let i = 0; i < MAX_HP; i++) {
        const segY = barY + barH - (i + 1) * 2;
        if (i < GameState.player.hp) {
            // Gradiente cian/azul zafiro o rojo crítico de advertencia
            ctx.fillStyle = i < 7 ? '#ef4444' : (i % 2 === 0 ? '#38bdf8' : '#00ffff');
            ctx.fillRect(barX, segY, 4, 1.5);
            // Destello brillante en el centro del diodo
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(barX + 1, segY, 2, 0.7);
        }
    }

    // Reflejo blanco especular de vidrio a lo largo del tubo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(barX - 0.5, barY + 2, 1, barH - 4);

    // Icono pixel-art de Casco de Mega Man sobre la cápsula
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(barX + 2, barY - 6, 3, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#00d2ff';
    ctx.fillRect(barX + 1, barY - 8, 2, 2);
    ctx.fillRect(barX, barY - 5, 4, 2);

    // 2. Marquee Superior: Badge Arcade Central con Nombre de Nivel y Subtítulo
    const cfg = GameState.stageConfig || getStageConfig(GameState.level || 1);
    const pillW = 104;
    const pillH = 12;
    const pillX = (CANVAS_WIDTH - pillW) / 2;
    const pillY = 3;

    ctx.save();
    // Fondo de placa oscura con brillo
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 3);
    else ctx.rect(pillX, pillY, pillW, pillH);
    ctx.fill();

    // Borde de neón según el color del Boss
    ctx.strokeStyle = cfg.bossColor || '#38bdf8';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Texto del nivel y nombre
    ctx.font = '5px "Press Start 2P"';
    ctx.fillStyle = cfg.bossColor || '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText(`STG ${GameState.level || 1}: ${cfg.name}`, CANVAS_WIDTH / 2, pillY + 8.5);
    ctx.restore();

    // 3. Barra de Vida del Boss (Si está presente en la arena)
    if (GameState.boss && GameState.boss.hp > 0 && GameState.bossActive) {
        const bossBarX = CANVAS_WIDTH - 11;
        const bossMaxHp = GameState.boss.maxHp || 10;
        const bossBarH = Math.min(36, Math.max(20, bossMaxHp * 2.4));
        const bossBarY = barY + barH - bossBarH;

        // Carcasa metálica
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bossBarX - 1.5, bossBarY - 1.5, 7, bossBarH + 3, 2);
        else ctx.rect(bossBarX - 1.5, bossBarY - 1.5, 7, bossBarH + 3);
        ctx.fill();

        ctx.strokeStyle = cfg.bossColor || '#f59e0b';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#061325';
        ctx.fillRect(bossBarX, bossBarY, 4, bossBarH);

        const totalSegments = Math.round(bossBarH / 2);
        const fillSegments = Math.round((GameState.boss.hp / bossMaxHp) * totalSegments);
        for (let i = 0; i < totalSegments; i++) {
            const segY = bossBarY + bossBarH - (i + 1) * 2;
            if (i < fillSegments) {
                ctx.fillStyle = cfg.bossColor || '#f59e0b';
                ctx.fillRect(bossBarX, segY, 4, 1.5);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(bossBarX + 1, segY, 2, 0.7);
            }
        }

        // Reflejo de vidrio
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.fillRect(bossBarX + 3.5, bossBarY + 2, 1, bossBarH - 4);

        // Insignia circular con letra del Boss ('C', 'F', 'G', 'E', 'I', 'W')
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(bossBarX + 2, bossBarY - 5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = cfg.bossColor || '#f59e0b';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '5px "Press Start 2P"';
        ctx.fillStyle = cfg.bossColor || '#f59e0b';
        ctx.textAlign = 'center';
        ctx.fillText(cfg.bossLetter || 'B', bossBarX + 2, bossBarY - 2.5);
    }
}

// ==========================================
// 🔁 Game Loop Principal a 60 FPS
// ==========================================
let lastTime = 0;
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    updatePhysics(dt);
    render();

    requestAnimationFrame(gameLoop);
}

// ==========================================
// ⌨️ Controles de Teclado (Fase 6 Obligatoria)
// ==========================================
window.addEventListener('keydown', (e) => {
    audio.init();
    const key = e.key.toLowerCase();

    // Si estamos en pantalla de Game Over, cualquier interacción vuelve de inmediato al QR
    if (GameState.gameOver) {
        if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'space', 'd', 'x', 'enter', 'z'].includes(key) || e.code === 'Space') {
            e.preventDefault();
            returnToQrCode();
            return;
        }
    }

    // Inicio instantáneo / bypass local si está en pantalla de espera con código QR
    if (!GameState.running) {
        if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'space', 'd', 'x', 'enter', 'z'].includes(key) || e.code === 'Space') {
            e.preventDefault();
            playPreGameAdThenStart('MEGAMAN', () => startNewGame());
            return;
        }
    }

    // 1. Movimiento exclusivo con Flechas Izquierda y Derecha
    if (key === 'arrowleft') inputKeys.left = true;
    if (key === 'arrowright') inputKeys.right = true;
    if (key === 'arrowup') inputKeys.up = true;
    if (key === 'arrowdown') inputKeys.down = true;

    // 2. Salto con la Barra Espaciadora
    if (e.code === 'Space' || key === ' ' || key === 'z') {
        e.preventDefault();
        inputKeys.jump = true;
    }

    // 3. Disparar con la letra 'd' (y soporte de conveniencia para 'x' o 'Enter')
    if (key === 'd' || key === 'x' || key === 'enter') {
        if (!inputKeys.buster) {
            inputKeys.buster = true;
            GameState.player.chargeTime = 0;
            fireBuster(false, false); // ¡Disparo lemon instantáneo al presionar la tecla D!
        }
    }

    // 4. Barrida / Slide
    if (key === 'c' || key === 'k') {
        triggerSlide();
    }
    if (inputKeys.down && (e.code === 'Space' || key === ' ')) {
        triggerSlide();
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'arrowleft') inputKeys.left = false;
    if (key === 'arrowright') inputKeys.right = false;
    if (key === 'arrowup') inputKeys.up = false;
    if (key === 'arrowdown') inputKeys.down = false;
    if (e.code === 'Space' || key === ' ' || key === 'z') inputKeys.jump = false;

    // Al soltar la tecla 'd', si acumuló carga dispara el Súper Buster
    if (key === 'd' || key === 'x' || key === 'enter') {
        if (inputKeys.buster) {
            audio.stopChargeHum();
            const p = GameState.player;
            if (p.chargeTime >= 0.8) {
                fireBuster(true, true); // ¡Súper tiro cargado de plasma al soltar D!
            }
            p.chargeTime = 0;
            p.isCharging = false;
            inputKeys.buster = false;
        }
    }
});

// Clic directo en pantalla para volver al QR si es Game Over, o arrancar juego local con video pre-juego
[mainScreen, waitingOverlay].forEach(el => {
    if (el) {
        el.addEventListener('click', () => {
            audio.init();
            if (GameState.gameOver) {
                returnToQrCode();
            } else if (!GameState.running) {
                playPreGameAdThenStart('MEGAMAN', () => startNewGame());
            }
        });
    }
});
if (gameOverOverlay) {
    gameOverOverlay.addEventListener('click', () => {
        audio.init();
        if (GameState.gameOver) {
            returnToQrCode();
        }
    });
}

// ==========================================
// 📡 WebRTC Signaling y Host (server/server.js)
// ==========================================
let socket;
const peerConnections = new Map();
const dataChannels = new Map();

function initSignaling() {
    if (!GameState.roomId || GameState.roomId === '----') {
        GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    }
    if (roomIdElement) roomIdElement.textContent = `ID: ${GameState.roomId}`;

    const serverIp = CONFIG.SIGNALING_SERVER_IP || window.location.hostname;
    const serverPort = CONFIG.SIGNALING_SERVER_PORT || '8080';
    const signalingUrl = CONFIG.SIGNALING_SERVER_URL || `${serverIp}:${serverPort}`;
    const wsUrl = signalingUrl.startsWith('ws://') || signalingUrl.startsWith('wss://')
        ? signalingUrl
        : `wss://${signalingUrl}`;

    try {
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

                if (data.type === 'controller_connected') {
                    waitingOverlay.classList.add('hidden');
                    if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
                } else if (data.type === 'offer') {
                    await handleOffer(data);
                } else if (data.type === 'candidate') {
                    const pc = peerConnections.get(data.playerId);
                    if (pc && data.candidate) {
                        if (pc.remoteDescription) {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                            } catch (_) {}
                        } else if (pc._pendingCandidates) {
                            pc._pendingCandidates.push(data.candidate);
                        }
                    }
                } else if (data.type === 'controller_disconnected') {
                    handleControllerDisconnect(data.playerId);
                }
            } catch (err) {
                console.error('Error JSON socket:', err);
            }
        };

        socket.onerror = (e) => console.error('WS Error:', e);
        socket.onclose = () => {
            setTimeout(initSignaling, 3000);
        };
    } catch (e) {
        console.error('WS Excep:', e);
    }
}

async function handleOffer(data) {
    const { playerId, type, sdp } = data;
    const targetPlayerId = playerId || 'controller';

    const rtcConfig = (window.GAME_CONFIG && window.GAME_CONFIG.getIceConfig)
        ? window.GAME_CONFIG.getIceConfig()
        : { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    const pc = new RTCPeerConnection(rtcConfig);
    pc._pendingCandidates = [];
    peerConnections.set(targetPlayerId, pc);

    pc.onicecandidate = (e) => {
        if (e.candidate && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'candidate',
                candidate: e.candidate,
                roomId: GameState.roomId,
                playerId: targetPlayerId
            }));
        }
    };

    pc.ondatachannel = (e) => {
        const dc = e.channel;
        dataChannels.set(targetPlayerId, dc);
        setupDataChannel(dc, targetPlayerId);
    };

    const sdpStr = typeof sdp === 'string' ? sdp : (sdp?.sdp || '');
    await pc.setRemoteDescription(new RTCSessionDescription({ type: type || 'offer', sdp: sdpStr }));

    while (pc._pendingCandidates && pc._pendingCandidates.length > 0) {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(pc._pendingCandidates.shift()));
        } catch (_) {}
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.send(JSON.stringify({
        type: 'answer',
        sdp: answer.sdp,
        roomId: GameState.roomId,
        playerId: targetPlayerId
    }));
}

// ==========================================
// 📺 Sistema de Publicidad Pre-Juego
// ==========================================
function broadcastToControllers(msg) {
    const payload = JSON.stringify(msg);
    dataChannels.forEach(dc => {
        if (dc && dc.readyState === 'open') {
            try { dc.send(payload); } catch (_) {}
        }
    });
}

function requestAdVideo() {
    if (!cachedAdVideoUrl) {
        try {
            const urlAd = new URLSearchParams(window.location.search).get('adVideo');
            if (urlAd) cachedAdVideoUrl = decodeURIComponent(urlAd);
        } catch (_) {}
    }
    if (cachedAdVideoUrl) return Promise.resolve(cachedAdVideoUrl);
    if (adVideoPromise) return adVideoPromise;

    adVideoPromise = new Promise((resolve) => {
        if (cachedAdVideoUrl) return resolve(cachedAdVideoUrl);

        const sId = new URLSearchParams(window.location.search).get('screenId');
        const isDev = typeof window !== 'undefined' && (
            window.location.hostname.includes('dev') ||
            window.location.hostname.includes('staging') ||
            window.location.hostname.includes('test')
        );
        const videoServer = (typeof CONFIG !== 'undefined' && CONFIG.VIDEO_SERVER_URL)
            ? CONFIG.VIDEO_SERVER_URL
            : (isDev ? 'https://dev-videos.myplayad.com' : 'https://videos.myplayad.com');

        let settled = false;
        const finalize = (url) => {
            if (settled) return;
            settled = true;
            if (url) {
                cachedAdVideoUrl = url;
            } else {
                adVideoPromise = null;
            }
            resolve(cachedAdVideoUrl || null);
        };

        const msgHandler = (event) => {
            if (event.data && event.data.type === 'AD_VIDEO_RESPONSE') {
                window.removeEventListener('message', msgHandler);
                finalize(event.data.videoUrl || null);
            }
        };
        window.addEventListener('message', msgHandler);

        if (window.parent && window.parent !== window) {
            try { window.parent.postMessage({ type: 'GET_AD_VIDEO' }, '*'); } catch (_) {}
        }

        if (sId) {
            fetch(`${videoServer}/api/videos/${sId}`)
                .then(r => r.ok ? r.json() : null)
                .then(d => {
                    if (d && d.videos && d.videos.length > 0) {
                        const rawName = d.videos[0] || '';
                        const cleanName = rawName.split('/').pop();
                        const fullUrl = `${videoServer}/videos/${sId}/${encodeURIComponent(cleanName)}`;
                        finalize(fullUrl);
                    }
                })
                .catch(() => {});
        }

        setTimeout(() => {
            window.removeEventListener('message', msgHandler);
            finalize(cachedAdVideoUrl || null);
        }, 1200);
    });

    return adVideoPromise;
}

window.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'AD_VIDEO_RESPONSE') {
        if (event.data.videoUrl) {
            cachedAdVideoUrl = event.data.videoUrl;
        }
    }
});

function playPreGameAdThenStart(nickname, startGameCallback) {
    if (GameState.adPlaying) return;

    if (waitingOverlay) waitingOverlay.classList.add('hidden');
    if (gameOverOverlay) gameOverOverlay.classList.add('hidden');

    if (!adVideoOverlay || !adVideoPlayer) {
        broadcastToControllers({ type: 'game_start' });
        startGameCallback();
        return;
    }

    const startAdPlayback = (videoUrl) => {
        if (!videoUrl) {
            console.log('[ad] No hay video publicitario configurado. Arrancando partida de una.');
            broadcastToControllers({ type: 'game_start' });
            startGameCallback();
            return;
        }

        // SOLO avisar al celular si REALMENTE hay un video publicitario válido para reproducir
        broadcastToControllers({ type: 'ad_playing', nickname: nickname });

        GameState.adPlaying = true;
        if (adPilotName) adPilotName.textContent = `PILOTO: ${(nickname || 'MEGAMAN').toUpperCase()}`;
        if (adCountdown) adCountdown.textContent = 'INICIANDO...';
        adVideoOverlay.classList.remove('hidden');

        if (window.parent && window.parent !== window) {
            try { window.parent.postMessage({ type: 'GAME_AD_START' }, '*'); } catch (_) {}
        }

        let adFinished = false;
        let safetyTimer = null;

        const finishAd = () => {
            if (adFinished) return;
            adFinished = true;
            if (safetyTimer) clearTimeout(safetyTimer);

            adVideoPlayer.onended = null;
            adVideoPlayer.onerror = null;
            adVideoPlayer.ontimeupdate = null;

            try {
                adVideoPlayer.pause();
                adVideoPlayer.removeAttribute('src');
                adVideoPlayer.load();
            } catch (_) {}

            adVideoOverlay.classList.add('hidden');
            GameState.adPlaying = false;

            if (window.parent && window.parent !== window) {
                try { window.parent.postMessage({ type: 'GAME_AD_END' }, '*'); } catch (_) {}
            }

            broadcastToControllers({ type: 'game_start' });
            startGameCallback();
        };

        window._finishCurrentAd = finishAd;

        adVideoPlayer.onended = finishAd;
        adVideoPlayer.onerror = (err) => {
            console.warn('[ad] Error en video publicitario, omitiendo:', err);
            finishAd();
        };

        adVideoPlayer.ontimeupdate = () => {
            if (adVideoPlayer.duration && !isNaN(adVideoPlayer.duration)) {
                const remaining = Math.max(0, Math.ceil(adVideoPlayer.duration - adVideoPlayer.currentTime));
                if (adCountdown) adCountdown.textContent = `JUEGO EN: ${remaining}s`;
            }
        };

        adVideoPlayer.src = videoUrl;
        adVideoPlayer.currentTime = 0;
        adVideoPlayer.muted = false;

        const p = adVideoPlayer.play();
        if (p !== undefined) {
            p.catch(() => {
                console.warn('[ad] Autoplay con audio bloqueado, reintentando silenciado...');
                adVideoPlayer.muted = true;
                adVideoPlayer.play().catch(finishAd);
            });
        }

        safetyTimer = setTimeout(finishAd, 35000);
    };

    requestAdVideo().then((videoUrl) => {
        startAdPlayback(videoUrl);
    });
}

function setupDataChannel(channel, playerId) {
    channel.onopen = () => {
        waitingOverlay.classList.add('hidden');
        if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
    };

    channel.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'join' || msg.type === 'nickname') {
                GameState.currentNickname = (msg.nickname || msg.value || 'MEGAMAN').toUpperCase().substring(0, 10);
                if (playerNickElement) playerNickElement.textContent = `PLAYER: ${GameState.currentNickname}`;
                playPreGameAdThenStart(GameState.currentNickname, () => {
                    startNewGame();
                });
            } else if (msg.type === 'control') {
                if (msg.cmd === 'left') inputKeys.left = !!msg.val;
                if (msg.cmd === 'right') inputKeys.right = !!msg.val;
                if (msg.cmd === 'up') inputKeys.up = !!msg.val;
                if (msg.cmd === 'down') inputKeys.down = !!msg.val;
                if (msg.cmd === 'jump') {
                    inputKeys.jump = !!msg.val;
                    if (msg.val) {
                        const p = GameState.player;
                        if (p.onGround && !p.isSliding) {
                            p.vy = -280;
                            p.onGround = false;
                            audio.playJump();
                        }
                    }
                }
                if (msg.cmd === 'buster_down') {
                    if (!inputKeys.buster) {
                        inputKeys.buster = true;
                        GameState.player.chargeTime = 0;
                        fireBuster(false, false);
                    }
                }
                if (msg.cmd === 'buster_up') {
                    if (inputKeys.buster) {
                        audio.stopChargeHum();
                        const p = GameState.player;
                        if (p.chargeTime >= 0.8) {
                            fireBuster(true, true);
                        }
                        p.chargeTime = 0;
                        p.isCharging = false;
                        inputKeys.buster = false;
                    }
                }
                if (msg.cmd === 'slide') triggerSlide();
            } else if (msg.type === 'joystick') {
                const DEADZONE = 0.22;
                inputKeys.left = msg.x < -DEADZONE;
                inputKeys.right = msg.x > DEADZONE;
                inputKeys.up = msg.y < -DEADZONE;
                inputKeys.down = msg.y > DEADZONE;
            }
        } catch (_) {}
    };

    channel.onclose = () => handleControllerDisconnect(playerId);
}

function handleControllerDisconnect(playerId) {
    const pc = peerConnections.get(playerId);
    if (pc) {
        try { pc.close(); } catch (_) {}
    }
    peerConnections.delete(playerId);
    dataChannels.delete(playerId);

    if (peerConnections.size === 0) {
        returnToQrCode();
    }
}

// ==========================================
// 📱 Generación Local y Rápida de QR Offline
// ==========================================
function updateQrCode() {
    const qrContainer = document.getElementById('qrcode');
    if (!qrContainer) return;
    qrContainer.innerHTML = '';

    const controlUrl = `${CONFIG.CONTROL_URL}/?room=${GameState.roomId}`;

    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
            text: controlUrl,
            width: 160,
            height: 160,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    }
}

// ==========================================
// 🏆 Hall of Fame / Marcadores Locales
// ==========================================
function saveScore(name, score) {
    try {
        const scores = JSON.parse(localStorage.getItem('megaman_halloffame') || '[]');
        scores.push({ name: name || 'MEGAMAN', score: score, date: new Date().toLocaleDateString() });
        scores.sort((a, b) => b.score - a.score);
        const top5 = scores.slice(0, 5);
        localStorage.setItem('megaman_halloffame', JSON.stringify(top5));
        if (top5[0]) {
            GameState.highScore = top5[0].score;
            localStorage.setItem('megaman_highscore', GameState.highScore.toString());
        }
        renderHallOfFame();
    } catch (_) {}
}

function renderHallOfFame() {
    try {
        const scores = JSON.parse(localStorage.getItem('megaman_halloffame') || '[]');
        const top5 = scores.slice(0, 5);
        if (rankingList) {
            rankingList.innerHTML = top5.map((s, idx) => `
                <li><span>#${idx + 1} ${s.name}</span><span>${s.score.toString().padStart(6, '0')}</span></li>
            `).join('') || '<li><span>NO RECORDS</span><span>000000</span></li>';
        }

        if (window.parent && window.parent !== window) {
            try {
                window.parent.postMessage({
                    type: 'RANKING_UPDATE',
                    slug: 'megaman',
                    ranking: top5
                }, '*');
            } catch (_) {}
        }
    } catch (_) {}
}

// ==========================================
// 📐 Escalado Reactivo autoScale()
// ==========================================
function autoScale() {
    const container = document.querySelector('.container');
    if (!container) return;

    container.style.transform = 'none';
    const naturalW = container.offsetWidth || 480;
    const naturalH = container.offsetHeight || 470;

    const availableW = window.innerWidth || document.documentElement.clientWidth;
    const availableH = window.innerHeight || document.documentElement.clientHeight;
    if (!availableW || !availableH) return;

    const padding = 20;
    const scaleX = (availableW - padding) / naturalW;
    const scaleY = (availableH - padding) / naturalH;
    const scale = Math.max(0.1, Math.min(scaleX, scaleY));

    container.style.transform = `scale(${scale})`;
}

// ==========================================
// 🚀 Arranque Inicial
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    initStage();
    renderHallOfFame();

    // Generar Room ID y código QR de forma inmediata sin esperar la red (0ms)
    if (!GameState.roomId || GameState.roomId === '----') {
        GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        if (roomIdElement) roomIdElement.textContent = `ID: ${GameState.roomId}`;
    }
    updateQrCode();

    const instantPlayBtn = document.getElementById('instant-play-btn');
    if (instantPlayBtn) {
        instantPlayBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            audio.init();
            playPreGameAdThenStart('MEGAMAN', () => startNewGame());
        });
    }

    requestAdVideo();

    autoScale();
    setTimeout(initSignaling, 30);
    requestAnimationFrame(gameLoop);
});

window.addEventListener('resize', autoScale);
window.addEventListener('load', () => { updateQrCode(); autoScale(); });
if (window.ResizeObserver) new ResizeObserver(autoScale).observe(document.body);
[0, 50, 150, 300, 600, 1200].forEach(d => setTimeout(autoScale, d));

window.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.type === 'RESCALE') autoScale();
    if (e.data.type === 'GET_RANKING') renderHallOfFame();
});
