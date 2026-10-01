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
const highScoreElement = document.getElementById('high-score');
const roomIdElement = document.getElementById('room-id');
const iceRouteElement = document.getElementById('ice-route');
const audioToggleBtn = document.getElementById('audio-toggle-btn');
const waitingOverlay = document.getElementById('waiting-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const rankingList = document.getElementById('ranking-list');
const mainScreen = document.getElementById('main-screen');

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
    victory: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('megaman_highscore') || '0', 10),
    lives: 3,
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
        runAnimTimer: 0
    },

    boss: {
        x: 1250,
        y: 100,
        vx: 0,
        vy: 0,
        w: 22,
        h: 26,
        hp: MAX_HP,
        maxHp: MAX_HP,
        active: false,
        onGround: false,
        facing: -1,
        stateTimer: 0,
        actionState: 'IDLE', // IDLE, JUMP, THROW, DASH, HURT
        invulnTimer: 0,
        scissors: []
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
    spikes: []
};

// ==========================================
// 🏗️ Generación del Escenario NES Industrial
// ==========================================
function initStage() {
    GameState.platforms = [
        // Suelo principal inicial
        { x: 0, y: 136, w: 280, h: 24, type: 'ground' },
        // Foso con plataformas flotantes
        { x: 210, y: 106, w: 45, h: 8, type: 'metal' },
        { x: 290, y: 84,  w: 50, h: 8, type: 'metal' },
        { x: 375, y: 106, w: 45, h: 8, type: 'metal' },
        
        // Segundo tramo de suelo con tuberías elevadas
        { x: 450, y: 136, w: 320, h: 24, type: 'ground' },
        { x: 500, y: 92,  w: 60, h: 10, type: 'pipe' },
        { x: 620, y: 80,  w: 70, h: 10, type: 'pipe' },
        { x: 730, y: 104, w: 55, h: 8, type: 'metal' },

        // Tramo de obstáculos y escalones industriales hacia el jefe
        { x: 810, y: 136, w: 306, h: 24, type: 'ground' }, // Suelo continuo hasta la compuerta
        { x: 860, y: 110, w: 36, h: 26, type: 'block' },
        { x: 940, y: 92,  w: 36, h: 44, type: 'block' },
        { x: 1000, y: 76, w: 45, h: 8,  type: 'metal' },

        // Arena del Boss (Robot Master "Cut Man")
        { x: 1116, y: 136, w: 204, h: 24, type: 'ground' }, // Suelo de la arena
        { x: 1160, y: 104, w: 35,  h: 8,  type: 'metal' },
        { x: 1235, y: 88,  w: 35,  h: 8,  type: 'metal' },
        { x: 1306, y: 0,   w: 14,  h: 160, type: 'wall' } // Pared final derecha
    ];

    // Pinchos mortales en los fosos anteriores
    GameState.spikes = [
        { x: 280, y: 152, w: 170, h: 8 },
        { x: 770, y: 152, w: 40,  h: 8 }
    ];

    // Enemigos colocados estratégicamente estilo NES
    GameState.enemies = [
        // Metools (Mets con casco que se esconden)
        { id: 1, type: 'metool', x: 160, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 2.0, hp: 1, facing: -1 },
        { id: 2, type: 'metool', x: 530, y: 80,  vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.5, hp: 1, facing: -1 },
        { id: 3, type: 'metool', x: 840, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 2.2, hp: 1, facing: -1 },
        { id: 4, type: 'metool', x: 990, y: 124, vx: 0, vy: 0, w: 14, h: 12, state: 'HIDING', timer: 1.8, hp: 1, facing: -1 },

        // Bladers (Drones voladores con hélice)
        { id: 5, type: 'blader', x: 340, y: 50,  vx: -35, vy: 0, w: 14, h: 12, startY: 50, t: 0, hp: 2 },
        { id: 6, type: 'blader', x: 670, y: 40,  vx: -40, vy: 0, w: 14, h: 12, startY: 40, t: 1.5, hp: 2 },
        { id: 7, type: 'blader', x: 910, y: 45,  vx: -35, vy: 0, w: 14, h: 12, startY: 45, t: 0.8, hp: 2 },

        // Spikey (Rueda mecánica rápida)
        { id: 8, type: 'spikey', x: 660, y: 124, vx: -50, vy: 0, w: 14, h: 12, minX: 580, maxX: 740, hp: 3 }
    ];

    // Cápsulas de energía para recoger
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

    // Reiniciar Boss
    GameState.boss = {
        x: 1250,
        y: 100,
        vx: 0,
        vy: 0,
        w: 20,
        h: 26,
        hp: MAX_HP,
        maxHp: MAX_HP,
        active: false,
        onGround: false,
        facing: -1,
        stateTimer: 2.0,
        actionState: 'WAITING',
        invulnTimer: 0,
        scissors: []
    };

    GameState.bossActive = false;
    GameState.bossIntroTimer = 0;
    GameState.bullets = [];
    GameState.enemyBullets = [];
    GameState.particles = [];
}

// Iniciar nueva partida
function startNewGame() {
    GameState.running = true;
    GameState.gameOver = false;
    GameState.victory = false;
    GameState.score = 0;
    GameState.lives = 3;
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

    // 1. Control Horizontal del Jugador
    const WALK_SPEED = 95;
    if (p.isSliding) {
        p.slideTimer -= dt;
        p.vx = p.facing * 180;
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
    }

    // 3. Carga del Mega Buster
    if (inputKeys.buster) {
        p.chargeTime += dt;
        if (p.chargeTime >= 0.35 && !p.isCharging) {
            p.isCharging = true;
            audio.startChargeHum();
        }
        // Partículas mientras carga
        if (p.isCharging && Math.random() < 0.4) {
            createSparks(p.x + p.w / 2 + (Math.random() - 0.5) * 12, p.y + p.h / 2 + (Math.random() - 0.5) * 12, p.chargeTime >= 0.8 ? '#00ffff' : '#ffea00', 1);
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
            if (p.x >= 1134) {
                gate.sealed = true;
                gate.state = 'CLOSING';
                audio.playGate();
            }
        } else {
            // Cerrando y sellando compuerta tras entrar
            if (gate.state === 'CLOSING') {
                gate.currentY += 280 * dt;
                if (gate.currentY >= 0) {
                    gate.currentY = 0;
                    gate.state = 'SEALED';
                    audio.playLand();
                    // Activar el Boss Cut Man
                    if (!GameState.bossActive && !GameState.victory) {
                        GameState.bossActive = true;
                        GameState.boss.active = true;
                        GameState.bossIntroTimer = 2.0;
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
                if (!p.onGround && p.vy > 100) audio.playLand();
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

        // Colisión con enemigos
        let bulletDestroyed = false;
        for (let j = GameState.enemies.length - 1; j >= 0; j--) {
            const e = GameState.enemies[j];
            if (b.x + b.w > e.x && b.x < e.x + e.w && b.y + b.h > e.y && b.y < e.y + e.h) {
                // Metool escondido rebota disparos normales pero es vulnerable a tiros cargados
                if (e.type === 'metool' && e.state === 'HIDING') {
                    if (b.charged || b.damage >= 2) {
                        e.hp -= b.damage;
                        createSparks(e.x + e.w / 2, e.y + e.h / 2, '#ffea00', 8);
                        if (e.hp <= 0) {
                            audio.playEnemyExplode();
                            createSparks(e.x + e.w / 2, e.y + e.h / 2, '#38bdf8', 12);
                            GameState.score += 150;
                            updateUI();
                            GameState.enemies.splice(j, 1);
                        }
                    } else {
                        audio.playDeflect();
                        createSparks(b.x, b.y, '#ffffff', 4);
                        e.state = 'ATTACKING';
                        e.timer = 1.0;
                    }
                    bulletDestroyed = true;
                    break;
                }

                e.hp -= b.damage;
                createSparks(e.x + e.w / 2, e.y + e.h / 2, '#ffea00', 6);

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
        if (!bulletDestroyed && GameState.bossActive && GameState.boss.hp > 0) {
            const boss = GameState.boss;
            if (b.x + b.w > boss.x && b.x < boss.x + boss.w && b.y + b.h > boss.y && b.y < boss.y + boss.h) {
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
    if (GameState.bossActive && GameState.boss.hp > 0) {
        updateBoss(dt);
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
        if (pt.life <= 0) GameState.particles.splice(i, 1);
    }
}

function updateBoss(dt) {
    const b = GameState.boss;
    const p = GameState.player;

    if (b.invulnTimer > 0) b.invulnTimer -= dt;

    b.stateTimer -= dt;
    b.facing = p.x < b.x ? -1 : 1;

    // Gravedad del Boss
    b.vy += GRAVITY * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Suelo de la arena
    if (b.y + b.h >= 136) {
        b.y = 136 - b.h;
        b.vy = 0;
        b.onGround = true;
    }

    // Patrón de ataque de Robot Master
    if (b.stateTimer <= 0) {
        const rand = Math.random();
        if (rand < 0.35 && b.onGround) {
            // Salto alto hacia Mega Man
            b.actionState = 'JUMP';
            b.vy = -310;
            b.vx = (p.x < b.x ? -1 : 1) * 85;
            b.onGround = false;
            b.stateTimer = 1.4;
        } else if (rand < 0.70) {
            // Lanzar Cuchilla Rolling Cutter / Disparo Boss
            b.actionState = 'THROW';
            b.vx = 0;
            GameState.enemyBullets.push({
                x: b.x + (b.facing === -1 ? -6 : b.w + 2),
                y: b.y + 6,
                vx: b.facing * 160,
                vy: -20,
                w: 10,
                h: 10,
                isBlade: true
            });
            audio.playDeflect();
            b.stateTimer = 0.9;
        } else {
            // Dash / Carrera rápida
            b.actionState = 'DASH';
            b.vx = (p.x < b.x ? -1 : 1) * 120;
            b.stateTimer = 0.8;
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
    GameState.victory = true;
    GameState.score += 10000;
    updateUI();

    // Círculo expansivo de explosiones de Robot Master
    for (let i = 0; i < 20; i++) {
        const ang = (i / 20) * Math.PI * 2;
        const spd = 40 + Math.random() * 60;
        GameState.particles.push({
            x: GameState.boss.x + GameState.boss.w / 2,
            y: GameState.boss.y + GameState.boss.h / 2,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            color: Math.random() > 0.5 ? '#ffffff' : '#38bdf8',
            life: 0.8 + Math.random() * 0.4,
            size: 3
        });
    }

    setTimeout(() => {
        endGame(true);
    }, 1800);
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

    // 6. Boss (Robot Master)
    if (GameState.bossActive) {
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
}

function renderBackground() {
    // Fondo de cielo nocturno industrial
    ctx.fillStyle = '#060f18';
    ctx.fillRect(GameState.cameraX, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Siluetas de fábricas y edificios distantes (Parallax 0.25)
    ctx.fillStyle = '#0b1b29';
    for (let bx = 0; bx < STAGE_LENGTH; bx += 32) {
        const h = 40 + ((bx * 13) % 45);
        ctx.fillRect(bx - GameState.cameraX * 0.15, 136 - h, 28, h);
    }

    // Tuberías y vigas de fondo (Parallax 0.5)
    ctx.fillStyle = '#10283d';
    for (let px = 0; px < STAGE_LENGTH; px += 80) {
        ctx.fillRect(px - GameState.cameraX * 0.35, 20, 8, 116);
        ctx.fillRect(px - 10 - GameState.cameraX * 0.35, 45, 28, 6);
    }
}

function renderPlatforms() {
    GameState.platforms.forEach(plat => {
        if (plat.type === 'ground' || plat.type === 'block') {
            ctx.fillStyle = '#1e3a5f';
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

            // Borde superior brillante de plataforma metálica
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(plat.x, plat.y, plat.w, 2);

            // Patrón de remaches de acero NES
            ctx.fillStyle = '#0f172a';
            for (let rx = plat.x + 4; rx < plat.x + plat.w - 4; rx += 16) {
                ctx.fillRect(rx, plat.y + 6, 2, 2);
            }
        } else if (plat.type === 'pipe') {
            ctx.fillStyle = '#16a34a';
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(plat.x, plat.y + 1, plat.w, 2);
            ctx.fillStyle = '#14532d';
            ctx.fillRect(plat.x, plat.y + plat.h - 2, plat.w, 2);
        } else if (plat.type === 'metal') {
            ctx.fillStyle = '#334155';
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = '#64748b';
            ctx.fillRect(plat.x, plat.y, plat.w, 1.5);
        } else if (plat.type === 'wall') {
            ctx.fillStyle = '#1e3a5f';
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(plat.x, plat.y, 2, plat.h);
            ctx.fillStyle = '#0f172a';
            for (let ry = 8; ry < plat.h; ry += 16) {
                ctx.fillRect(plat.x + 4, ry, 4, 2);
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

    // Persiana corrediza amarilla (Hazard Shutter NES)
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
    GameState.spikes.forEach(sp => {
        ctx.fillStyle = '#ef4444';
        for (let sx = sp.x; sx < sp.x + sp.w; sx += 6) {
            ctx.beginPath();
            ctx.moveTo(sx, sp.y + sp.h);
            ctx.lineTo(sx + 3, sp.y);
            ctx.lineTo(sx + 6, sp.y + sp.h);
            ctx.closePath();
            ctx.fill();
        }
    });
}

function renderPickups() {
    GameState.pickups.forEach(pick => {
        if (pick.collected) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pick.x, pick.y, pick.w, pick.h);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(pick.x + 2, pick.y + 2, pick.w - 4, pick.h - 4);
        ctx.fillStyle = '#ffffff';
        ctx.font = '5px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('P', pick.x + pick.w / 2, pick.y + pick.h - 2);
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

    // Colores del sprite clásico NES de Mega Man
    let armorColor = '#2563eb';      // Azul oscuro
    let bodyColor = '#00d2ff';       // Cyan brillante
    let faceColor = '#fed7aa';       // Piel
    const eyeColor = '#0f172a';

    // Aura de carga pulsante
    if (p.isCharging) {
        const pulse = Math.floor(Date.now() / 80) % 3;
        if (pulse === 1) {
            armorColor = '#16a34a';
            bodyColor = '#86efac';
        } else if (pulse === 2 && p.chargeTime >= 1.0) {
            armorColor = '#ea580c';
            bodyColor = '#fde047';
        }
    }

    if (p.isSliding) {
        // Sprite de deslizamiento (Pose baja)
        ctx.fillStyle = armorColor;
        ctx.fillRect(0, 10, 20, 10);
        ctx.fillStyle = bodyColor;
        ctx.fillRect(6, 12, 10, 6);
        ctx.fillStyle = faceColor;
        ctx.fillRect(14, 11, 4, 4);
    } else {
        // 1. Casco azul de Mega Man
        ctx.fillStyle = armorColor;
        ctx.fillRect(2, 0, 11, 8);
        ctx.fillRect(5, -1, 5, 2); // Cresta central del casco
        ctx.fillStyle = bodyColor;
        ctx.fillRect(1, 3, 2, 4);  // Orejera izquierda

        // 2. Rostro y ojos
        ctx.fillStyle = faceColor;
        ctx.fillRect(6, 2, 7, 6);
        ctx.fillStyle = eyeColor;
        ctx.fillRect(10, 3, 2, 3); // Ojo mirando al frente

        // 3. Torso / Pecho
        ctx.fillStyle = armorColor;
        ctx.fillRect(3, 8, 9, 7);
        ctx.fillStyle = bodyColor;
        ctx.fillRect(5, 9, 5, 5);

        // 4. Brazos / Mega Buster
        if (p.isShooting) {
            // Brazo extendido como cañón Buster
            ctx.fillStyle = armorColor;
            ctx.fillRect(10, 9, 7, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(15, 10, 2, 2); // Boca del cañón
        } else {
            ctx.fillStyle = armorColor;
            ctx.fillRect(2, 9, 3, 5);
        }

        // 5. Cinturón / Calzón
        ctx.fillStyle = armorColor;
        ctx.fillRect(4, 14, 7, 3);

        // 6. Piernas y Botas (Animación de correr / salto)
        ctx.fillStyle = armorColor;
        if (!p.onGround) {
            // Pose de salto: piernas flexionadas
            ctx.fillRect(2, 17, 4, 5);
            ctx.fillRect(8, 16, 5, 4);
        } else if (Math.abs(p.vx) > 0) {
            // Ciclo de correr NES (3 frames)
            const frame = Math.floor(p.runAnimTimer) % 3;
            if (frame === 0) {
                ctx.fillRect(1, 16, 5, 6);
                ctx.fillRect(9, 16, 5, 5);
            } else if (frame === 1) {
                ctx.fillRect(3, 16, 4, 6);
                ctx.fillRect(7, 16, 4, 6);
            } else {
                ctx.fillRect(0, 16, 5, 5);
                ctx.fillRect(8, 16, 6, 6);
            }
        } else {
            // De pie
            ctx.fillRect(3, 16, 4, 6);
            ctx.fillRect(8, 16, 4, 6);
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

    // Cuerpo de Cut Man
    ctx.fillStyle = isFlashing ? '#ffffff' : '#f59e0b'; // Naranja / Ámbar
    ctx.fillRect(2, 4, 16, 12);

    // Cabeza
    ctx.fillStyle = isFlashing ? '#ffffff' : '#fcd34d';
    ctx.fillRect(4, 0, 12, 10);

    // Cuchilla tijera en la cabeza (Cut Blade)
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(6, -8, 3, 9);
    ctx.fillRect(11, -8, 3, 9);
    ctx.fillRect(8, -9, 4, 2);

    // Ojos
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(5, 3, 2, 3);

    // Botas
    ctx.fillStyle = isFlashing ? '#ffffff' : '#b45309';
    ctx.fillRect(2, 16, 6, 10);
    ctx.fillRect(11, 16, 6, 10);

    ctx.restore();
}

function renderEnemies() {
    GameState.enemies.forEach(e => {
        ctx.save();
        ctx.translate(Math.round(e.x), Math.round(e.y));

        if (e.type === 'metool') {
            // Metool clásico
            ctx.fillStyle = '#facc15'; // Casco de construcción amarillo
            ctx.beginPath();
            ctx.arc(7, 6, 7, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(0, 6, 14, 4);

            if (e.state === 'ATTACKING') {
                // Asoma los ojos
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(2, 7, 10, 4);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(3, 8, 2, 2);
                ctx.fillRect(8, 8, 2, 2);
            }
            // Pies marrones
            ctx.fillStyle = '#78350f';
            ctx.fillRect(1, 10, 4, 2);
            ctx.fillRect(9, 10, 4, 2);
        } else if (e.type === 'blader') {
            // Drone con hélice
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(2, 4, 10, 8);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(4, 6, 4, 3); // Ojo visor rojo
            // Hélice giratoria
            ctx.fillStyle = '#ffffff';
            const hRot = Math.floor(Date.now() / 40) % 2;
            ctx.fillRect(hRot ? 0 : 3, 1, hRot ? 14 : 8, 2);
        } else if (e.type === 'spikey') {
            // Rueda de púas
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.arc(7, 6, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f87171';
            ctx.fillRect(4, 4, 6, 4);
        }

        ctx.restore();
    });
}

function renderBullets() {
    // Balas de Mega Man
    GameState.bullets.forEach(b => {
        if (b.charged) {
            // Super disparo cargado: anillo plasmático de alta energía
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x, b.y, b.w, b.h);
        } else {
            // Lemon pellet amarillo clásico
            ctx.fillStyle = '#ffea00';
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
        }
    });

    // Balas enemigas
    GameState.enemyBullets.forEach(eb => {
        if (eb.isBlade) {
            // Cuchilla rodante de Cut Man
            ctx.fillStyle = '#ffffff';
            ctx.save();
            ctx.translate(eb.x + 5, eb.y + 5);
            ctx.rotate(Date.now() / 60);
            ctx.fillRect(-5, -2, 10, 4);
            ctx.fillRect(-2, -5, 4, 10);
            ctx.restore();
        } else {
            ctx.fillStyle = '#f97316';
            ctx.fillRect(eb.x, eb.y, eb.w, eb.h);
        }
    });
}

function renderParticles() {
    GameState.particles.forEach(pt => {
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, pt.size || 1.5, pt.size || 1.5);
    });
}

function renderHUD() {
    // Barra de Vida de Mega Man (Estilo NES vertical a la izquierda)
    const barX = 8;
    const barY = 24;
    const barH = 56;

    ctx.fillStyle = '#020617';
    ctx.fillRect(barX - 1, barY - 1, 6, barH + 2);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 1, barY - 1, 6, barH + 2);

    // Segmentos de vida (28 segmentos)
    for (let i = 0; i < MAX_HP; i++) {
        const segY = barY + barH - (i + 1) * 2;
        if (i < GameState.player.hp) {
            ctx.fillStyle = i < 7 ? '#ef4444' : '#00d2ff';
            ctx.fillRect(barX, segY, 4, 1.5);
        }
    }

    // Icono de casco de Mega Man arriba de su barra de vida
    ctx.fillStyle = '#00d2ff';
    ctx.fillRect(barX, barY - 7, 4, 4);

    // Barra de Vida del Boss (Si está activo)
    if (GameState.bossActive && GameState.boss.hp > 0) {
        const bossBarX = CANVAS_WIDTH - 12;
        ctx.fillStyle = '#020617';
        ctx.fillRect(bossBarX - 1, barY - 1, 6, barH + 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.strokeRect(bossBarX - 1, barY - 1, 6, barH + 2);

        for (let i = 0; i < MAX_HP; i++) {
            const segY = barY + barH - (i + 1) * 2;
            if (i < GameState.boss.hp) {
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(bossBarX, segY, 4, 1.5);
            }
        }
        // Letra 'C' de Cut Man
        ctx.font = '5px "Press Start 2P"';
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        ctx.fillText('C', bossBarX + 2, barY - 4);
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

    // Inicio instantáneo / bypass si está en pantalla de espera o Game Over
    if (!GameState.running || GameState.gameOver) {
        if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'space', 'd', 'x', 'enter', 'z'].includes(key) || e.code === 'Space') {
            e.preventDefault();
            startNewGame();
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

// Clic directo en pantalla para bypass de QR y arranque instantáneo
if (mainScreen) {
    mainScreen.addEventListener('click', () => {
        audio.init();
        if (!GameState.running || GameState.gameOver) startNewGame();
    });
}
if (waitingOverlay) {
    waitingOverlay.addEventListener('click', () => {
        audio.init();
        if (!GameState.running || GameState.gameOver) startNewGame();
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

function setupDataChannel(channel, playerId) {
    channel.onopen = () => {
        waitingOverlay.classList.add('hidden');
    };

    channel.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'join') {
                GameState.currentNickname = (msg.nickname || msg.value || 'MEGAMAN').toUpperCase().substring(0, 10);
                if (playerNickElement) playerNickElement.textContent = `PLAYER: ${GameState.currentNickname}`;
                startNewGame();
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
            }
        } catch (_) {}
    };

    channel.onclose = () => handleControllerDisconnect(playerId);
}

function handleControllerDisconnect(playerId) {
    const pc = peerConnections.get(playerId);
    if (pc) pc.close();
    peerConnections.delete(playerId);
    dataChannels.delete(playerId);

    if (peerConnections.size === 0 && !GameState.gameOver) {
        waitingOverlay.classList.remove('hidden');
        GameState.running = false;
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
    } catch (_) {}
}

function renderHallOfFame() {
    if (!rankingList) return;
    try {
        const scores = JSON.parse(localStorage.getItem('megaman_halloffame') || '[]');
        rankingList.innerHTML = scores.map((s, idx) => `
            <li><span>#${idx + 1} ${s.name}</span><span>${s.score.toString().padStart(6, '0')}</span></li>
        `).join('') || '<li><span>NO RECORDS</span><span>000000</span></li>';
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
            startNewGame();
        });
    }

    autoScale();
    setTimeout(initSignaling, 30);
    requestAnimationFrame(gameLoop);
});

window.addEventListener('resize', autoScale);
window.addEventListener('load', () => { updateQrCode(); autoScale(); });
if (window.ResizeObserver) new ResizeObserver(autoScale).observe(document.body);
[0, 50, 150, 300, 600, 1200].forEach(d => setTimeout(autoScale, d));
