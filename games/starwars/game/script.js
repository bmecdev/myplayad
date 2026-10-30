// ==============================================================================
// STAR WARS: FALCON - Retro Arcade Host Script (Master 16-Bit Edition)
// Todos los enemigos: Caza TIE Imperial auténtico
// Gráficos de alta fidelidad inspirados en Super Star Wars (SNES) & Star Wars Arcade
// ==============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const playerNickElement = document.getElementById('player-nick');
const shieldsCountElement = document.getElementById('shields-count');
const killsCountElement = document.getElementById('kills-count');
const gameOverOverlay = document.getElementById('game-over-overlay');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverSubtitle = document.getElementById('game-over-subtitle');
const waitingOverlay = document.getElementById('waiting-overlay');
const mainScreen = document.getElementById('main-screen');
const rankingList = document.getElementById('ranking-list');
const qrContainer = document.getElementById('qrcode');
const iceRouteElement = document.getElementById('ice-route');
const roomIdElement = document.getElementById('room-id');

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 320;
const HORIZON_Y = 135;
const FOV = 230;

// Estado Global
const GameState = {
    running: false,
    gameOver: false,
    score: 0,
    highScore: 0,
    shields: 6,
    maxShields: 6,
    kills: 0,
    stage: 1, // 1: Tatooine Desert Canyon, 2: Asteroid Belt, 3: Death Star Trench
    stageProgress: 0,
    speed: 280,
    boost: false,
    boostTimer: 0,
    currentNickname: 'HAN SOLO',
    roomId: Math.random().toString(36).substring(2, 6).toUpperCase(),
    lastTime: 0,
    screenShake: 0,
    worldScroll: 0,
    lockedTarget: null,
    isMobileSession: false
};

let gameOverTimeout = null;

// Jugador: El Halcón Milenario (YT-1300)
const Player = {
    x: 0,          // -140 a +140 (desplazamiento horizontal)
    y: 0,          // -110 (gran altitud / cielo abierto) a +48 (vuelo rasante sobre la arena)
    vx: 0,
    vy: 0,
    roll: 0,       // Inclinación lateral (banking)
    targetRoll: 0,
    pitch: 0,      // Inclinación vertical (cabeceo de ascenso / descenso)
    targetPitch: 0,
    recoil: 0,
    muzzleFlash: 0,
    isFiring: false,
    fireCooldown: 0,
    fireRate: 0.12,
    invulnerableTime: 0,
    shieldFlash: 0,
    spreadTimer: 0,
    thrusterFlicker: 0
};

// Input de teclado
const Keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    boost: false
};

// ==============================================================================
// SISTEMA DE AUDIO WEB AUDIO API (Sintetizador Retro Star Wars)
// ==============================================================================

class StarWarsAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.engineOsc = null;
        this.engineGain = null;
        this.engineFilter = null;
    }

    init() {
        if (!this.ctx) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                this.ctx = new AudioContext();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
                this.startEngineSound();
            } catch (e) {
                console.warn('Audio no disponible:', e);
            }
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
            btn.textContent = '🔇 CLIC AUDIO';
            btn.classList.add('muted');
        }
    }

    startEngineSound() {
        if (!this.ctx) return;
        try {
            this.engineOsc = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();
            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(50, this.ctx.currentTime);
            this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.setValueAtTime(160, this.ctx.currentTime);

            this.engineOsc.connect(this.engineFilter);
            this.engineFilter.connect(this.engineGain);
            this.engineGain.connect(this.masterGain);
            this.engineOsc.start();
        } catch (_) {}
    }

    updateEngineSound(speed, boost) {
        if (!this.ctx || !this.engineOsc || !this.engineGain) return;
        const now = this.ctx.currentTime;
        const targetFreq = boost ? 96 : 48 + (speed / 300) * 22;
        const targetGain = boost ? 0.08 : 0.04;
        this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.1);
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.1);
        if (this.engineFilter) {
            this.engineFilter.frequency.setTargetAtTime(boost ? 350 : 160, now, 0.1);
        }
    }

    playLaser() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1750, now);
            osc.frequency.exponentialRampToValueAtTime(170, now + 0.11);

            gain.gain.setValueAtTime(0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.11);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.11);
        } catch (_) {}
    }

    playTieLaser() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1050, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);

            gain.gain.setValueAtTime(0.20, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.14);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.14);
        } catch (_) {}
    }

    playTieRoar() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = 'sawtooth';
            osc2.type = 'sawtooth';

            osc1.frequency.setValueAtTime(340, now);
            osc1.frequency.exponentialRampToValueAtTime(210, now + 0.38);

            osc2.frequency.setValueAtTime(348, now);
            osc2.frequency.exponentialRampToValueAtTime(214, now + 0.38);

            gain.gain.setValueAtTime(0.16, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.masterGain);

            osc1.start(now);
            osc2.start(now + 0.02);
            osc1.stop(now + 0.38);
            osc2.stop(now + 0.38);
        } catch (_) {}
    }

    playExplosion(isBig = false) {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const duration = isBig ? 0.48 : 0.28;
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(isBig ? 600 : 850, now);
            filter.frequency.exponentialRampToValueAtTime(60, now + duration);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(isBig ? 0.48 : 0.32, now);
            gain.gain.exponentialRampToValueAtTime(0.008, now + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            noise.start(now);
        } catch (_) {}
    }

    playShieldHit() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(290, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.22);

            gain.gain.setValueAtTime(0.32, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.22);
        } catch (_) {}
    }

    playPowerup() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            [320, 480, 640, 860].forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.05);
                gain.gain.setValueAtTime(0.18, now + i * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.08);

                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + i * 0.05);
                osc.stop(now + i * 0.05 + 0.08);
            });
        } catch (_) {}
    }

    playIntroFanfare() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const notes = [
                { f: 293.66, d: 0.16 }, // D4
                { f: 293.66, d: 0.16 },
                { f: 293.66, d: 0.16 },
                { f: 392.00, d: 0.48 }, // G4
                { f: 587.33, d: 0.48 }  // D5
            ];
            let offset = 0;
            notes.forEach(n => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, now + offset);
                gain.gain.setValueAtTime(0.24, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.01, now + offset + n.d);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + offset);
                osc.stop(now + offset + n.d);
                offset += n.d + 0.02;
            });
        } catch (_) {}
    }

    playBossAlert() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            for (let i = 0; i < 4; i++) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                const freq = (i % 2 === 0) ? 680 : 490;
                osc.frequency.setValueAtTime(freq, now + i * 0.20);
                gain.gain.setValueAtTime(0.28, now + i * 0.20);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.20 + 0.17);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + i * 0.20);
                osc.stop(now + i * 0.20 + 0.17);
            }
        } catch (_) {}
    }

    playVictoryFanfare() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const notes = [
                { f: 293.66, d: 0.20 }, // D4
                { f: 392.00, d: 0.20 }, // G4
                { f: 493.88, d: 0.20 }, // B4
                { f: 587.33, d: 0.35 }, // D5
                { f: 493.88, d: 0.18 }, // B4
                { f: 587.33, d: 0.65 }  // D5 sostenido
            ];
            let offset = 0;
            notes.forEach(n => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, now + offset);
                gain.gain.setValueAtTime(0.28, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.01, now + offset + n.d);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + offset);
                osc.stop(now + offset + n.d);
                offset += n.d + 0.04;
            });
        } catch (_) {}
    }
}

const audio = new StarWarsAudio();

// ==============================================================================
// ENTIDADES Y SISTEMAS DEL MUNDO 3D
// ==============================================================================

let stars = [];
let lasers = [];        // Cañón cuádruple del Halcón
let enemyLasers = [];   // Rayos verdes de los TIE
let enemies = [];       // TODOS son Cazas TIE imperiales idénticos y auténticos
let obstacles = [];     // Asteroides poligonales 3D
let powerups = [];      // Cápsulas de escudo/láser
let particles = [];     // Chispas, fuego y restos de naves
let wingDebris = [];    // Paneles solares hexagonales de TIE destruidos que giran
let dustPuffs = [];     // Polvo del desierto levantado por los motores
let floatingScores = [];
let canyonRocks = [];   // Rocas, monolitos y arcos gigantes del cañón
let ambientDust = [];   // Motas doradas de polvo ambiental en el desierto
let groundPebbles = []; // Gravilla 3D de alta velocidad en el suelo Mode 7
let distantFlak = [];   // Fuego antiaéreo y destellos en el horizonte
let currentBoss = null;
let bossWarningTimer = 0;
let bossWarningText = '';
let bossProjectiles = []; // Torpedos de protones y misiles de los jefes
let lifeSpawnTimer = 8;     // Temporizador para que aparezcan vidas periódicamente en cada nivel

// Inicializar estrellas del espacio profundo
function initStars() {
    stars = [];
    for (let i = 0; i < 140; i++) {
        stars.push({
            x: (Math.random() - 0.5) * 640,
            y: (Math.random() - 0.5) * 480,
            z: Math.random() * 850 + 40,
            size: Math.random() * 1.6 + 0.8,
            color: Math.random() > 0.85 ? '#93c5fd' : (Math.random() > 0.7 ? '#fde047' : '#ffffff')
        });
    }
}

// Inicializar monolitos del cañón desértico en los laterales
function initCanyonRocks() {
    canyonRocks = [];
    for (let i = 0; i < 12; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const isArch = (i === 4 || i === 9); // Arcos de piedra colosales bajo los que volar
        canyonRocks.push({
            type: isArch ? 'arch' : (i % 3 === 0 ? 'mesa' : 'spire'),
            side: side,
            x: isArch ? 0 : side * (170 + Math.random() * 110),
            y: isArch ? -18 : (32 + Math.random() * 18),
            z: (i * 75) + 110,
            width: isArch ? 270 : (42 + Math.random() * 26),
            height: isArch ? 135 : (95 + Math.random() * 45),
            strataSeed: Math.random()
        });
    }

    // Inicializar motas de polvo ambiental del desierto
    ambientDust = [];
    for (let i = 0; i < 35; i++) {
        ambientDust.push({
            x: Math.random() * CANVAS_WIDTH,
            y: HORIZON_Y + Math.random() * (CANVAS_HEIGHT - HORIZON_Y),
            size: Math.random() * 1.8 + 0.8,
            speedX: -(Math.random() * 32 + 18),
            speedY: (Math.random() - 0.5) * 8,
            alpha: Math.random() * 0.45 + 0.2
        });
    }

    // Guijarros y gravilla del suelo en perspectiva 3D
    groundPebbles = [];
    for (let i = 0; i < 40; i++) {
        groundPebbles.push({
            x: (Math.random() - 0.5) * 460,
            y: 44 + Math.random() * 12,
            z: Math.random() * 850 + 40,
            size: Math.random() * 2.2 + 1.0,
            color: Math.random() > 0.5 ? '#7c2d12' : '#b45309'
        });
    }

    distantFlak = [];
    for (let i = 0; i < 6; i++) {
        distantFlak.push({
            x: (Math.random() - 0.5) * 400,
            y: (Math.random() - 0.5) * 60,
            z: Math.random() * 600 + 300,
            life: Math.random() * 1.5,
            color: Math.random() > 0.5 ? '#22c55e' : '#ef4444'
        });
    }
}

// ==============================================================================
// SISTEMA DE JEFES DE NIVEL (BOSS BATTLES)
// ==============================================================================

function triggerBossWarning(type) {
    bossWarningTimer = 3.2;
    audio.playBossAlert();
    if (type === 'tie_bomber') {
        bossWarningText = '¡ALERTA! TIE BOMBER TITAN';
    } else if (type === 'tie_advanced') {
        bossWarningText = '¡PELIGRO! TIE ADVANCED - LORD VADER';
    } else {
        bossWarningText = '¡ALERTA MÁXIMA! NÚCLEO DEFENSIVO';
    }
}

function spawnBoss(type) {
    if (type === 'tie_bomber') {
        currentBoss = {
            type: 'tie_bomber',
            name: 'TIE BOMBER TITAN',
            x: 0,
            y: -10,
            z: 850,
            targetZ: 310,
            hp: 24,
            maxHp: 24,
            speed: 155,
            swayAngle: 0,
            shootCooldown: 1.8,
            missileCooldown: 3.8,
            roll: 0,
            hitFlash: 0
        };
    } else if (type === 'tie_advanced') {
        currentBoss = {
            type: 'tie_advanced',
            name: 'TIE ADVANCED x1 - LORD VADER',
            x: 0,
            y: -12,
            z: 850,
            targetZ: 275,
            hp: 36,
            maxHp: 36,
            speed: 195,
            swayAngle: 0,
            shootCooldown: 1.2,
            missileCooldown: 3.2,
            roll: 0,
            hitFlash: 0
        };
    } else {
        currentBoss = {
            type: 'death_star_core',
            name: 'NÚCLEO DEFENSIVO ESTRELLA DE LA MUERTE',
            x: 0,
            y: 8,
            z: 900,
            targetZ: 330,
            hp: 50,
            maxHp: 50,
            speed: 135,
            swayAngle: 0,
            shootCooldown: 1.0,
            missileCooldown: 2.8,
            roll: 0,
            hitFlash: 0
        };
    }
}

function updateBoss(dt) {
    if (!currentBoss) return;
    const b = currentBoss;
    const currentSpeed = GameState.boost ? GameState.speed * 2.3 : GameState.speed;

    // Acercamiento inicial hasta distancia óptima de combate
    if (b.z > b.targetZ) {
        b.z -= (b.speed + currentSpeed * 0.4) * dt;
        if (b.z < b.targetZ) b.z = b.targetZ;
    }

    // Maniobras de combate y balanceo 3D
    b.swayAngle += (b.type === 'tie_advanced' ? 2.4 : 1.7) * dt;
    const ampX = b.type === 'tie_advanced' ? 95 : 68;
    const ampY = b.type === 'death_star_core' ? 12 : 22;
    b.x = Math.sin(b.swayAngle) * ampX;
    b.y = (Math.cos(b.swayAngle * 0.7) * ampY) - (b.type === 'death_star_core' ? -8 : 10);
    b.roll = Math.cos(b.swayAngle) * (b.type === 'tie_advanced' ? 0.35 : 0.22);

    if (b.hitFlash > 0) b.hitFlash -= dt;

    // Disparos láser primarios del jefe
    b.shootCooldown -= dt;
    if (b.shootCooldown <= 0 && b.z <= b.targetZ + 80) {
        audio.playTieLaser();
        const falconScreen = getShipScreenPos(0, 0);
        const targetWorld = screenToWorld(falconScreen.x, falconScreen.y, 45);
        const flightTime = (b.z - 45) / 460;

        // Ráfaga doble o cuádruple
        const offsets = b.type === 'tie_advanced' ? [-5, -2, 2, 5] : [-4, 4];
        offsets.forEach(ox => {
            const sx = b.x + ox;
            const sy = b.y + 4;
            enemyLasers.push({
                x: sx,
                y: sy,
                z: b.z,
                vx: (targetWorld.x + ox * 0.2 - sx) / flightTime,
                vy: (targetWorld.y - sy) / flightTime,
                vz: 460,
                speed: 460
            });
        });

        b.shootCooldown = b.type === 'tie_advanced' ? 1.2 : 1.7;
    }

    // Ataque secundario: Torpedos de Protones / Misiles guiados
    b.missileCooldown -= dt;
    if (b.missileCooldown <= 0 && b.z <= b.targetZ + 80) {
        audio.playTieRoar();
        const falconScreen = getShipScreenPos(0, 0);
        const targetWorld = screenToWorld(falconScreen.x, falconScreen.y, 45);
        const flightTime = (b.z - 45) / 360;

        bossProjectiles.push({
            x: b.x,
            y: b.y + 6,
            z: b.z,
            vx: (targetWorld.x - b.x) / flightTime,
            vy: (targetWorld.y - (b.y + 6)) / flightTime,
            vz: 360,
            speed: 360,
            radius: 8,
            type: 'torpedo'
        });

        b.missileCooldown = b.type === 'tie_advanced' ? 3.0 : 4.0;
    }
}

function updateBossProjectiles(dt) {
    const falconScreenPos = getShipScreenPos(0, 0);

    for (let i = bossProjectiles.length - 1; i >= 0; i--) {
        const bp = bossProjectiles[i];
        bp.z -= bp.vz * dt;
        bp.x += bp.vx * dt;
        bp.y += bp.vy * dt;

        // Comprobar colisión con el Halcón Milenario
        if (bp.z <= 65 && bp.z >= 20) {
            const pl = project3D(bp.x, bp.y, bp.z);
            if (pl) {
                const dx = pl.x - falconScreenPos.x;
                const dy = (pl.y - falconScreenPos.y) * 1.4;
                if (Math.hypot(dx, dy) < 42) {
                    damagePlayer(0.7);
                    createExplosion(bp.x, bp.y, bp.z, 22, true);
                    bossProjectiles.splice(i, 1);
                    continue;
                }
            }
        }

        if (bp.z < 15) {
            bossProjectiles.splice(i, 1);
        }
    }
}

function defeatBoss() {
    if (!currentBoss) return;
    const b = currentBoss;
    const bossType = b.type;
    const bx = b.x;
    const by = b.y;
    const bz = b.z;

    // Cadena de explosiones múltiples
    createExplosion(bx, by, bz, 50, true);
    setTimeout(() => createExplosion(bx - 25, by + 10, bz, 35, true), 140);
    setTimeout(() => createExplosion(bx + 25, by - 12, bz, 35, true), 280);

    // Recompensa de vida garantizada al destruir al jefe
    spawnLifeCapsule(bx, by, bz);

    let pts = 2500;
    if (bossType === 'tie_bomber') {
        pts = 2500;
        GameState.score += pts;
        addFloatingScore(`+${pts} ¡JEFE DESTRUIDO!`, CANVAS_WIDTH / 2, 70, '#facc15');
        addFloatingScore('NIVEL 1 COMPLETADO', CANVAS_WIDTH / 2, 92, '#38bdf8');
        currentBoss = null;
        setTimeout(() => {
            GameState.stage = 2;
            addFloatingScore('NIVEL 2: ASTEROID BELT', CANVAS_WIDTH / 2, 70, '#38bdf8');
            spawnLifeCapsule(0, 0, 750); // Cápsula de vida de bienvenida al nivel 2
            lifeSpawnTimer = 6;
        }, 1600);
    } else if (bossType === 'tie_advanced') {
        pts = 4000;
        GameState.score += pts;
        addFloatingScore(`+${pts} ¡LORD VADER DERROTADO!`, CANVAS_WIDTH / 2, 70, '#facc15');
        addFloatingScore('NIVEL 2 COMPLETADO', CANVAS_WIDTH / 2, 92, '#38bdf8');
        currentBoss = null;
        setTimeout(() => {
            GameState.stage = 3;
            addFloatingScore('NIVEL 3: DEATH STAR TRENCH', CANVAS_WIDTH / 2, 70, '#f43f5e');
            spawnLifeCapsule(0, 0, 750); // Cápsula de vida de bienvenida al nivel 3
            lifeSpawnTimer = 6;
        }, 1600);
    } else {
        pts = 8000;
        GameState.score += pts;
        addFloatingScore(`+${pts} ¡ESTRELLA DE LA MUERTE DESTRUIDA!`, CANVAS_WIDTH / 2, 70, '#facc15');
        currentBoss = null;
        triggerVictory();
    }

    scoreElement.textContent = `SCORE: ${String(GameState.score).padStart(6, '0')}`;
}

function triggerVictory() {
    GameState.victory = true;
    GameState.running = false;
    audio.playVictoryFanfare();

    gameOverTitle.textContent = '¡MISIÓN CUMPLIDA!';
    gameOverTitle.style.color = '#38bdf8';
    gameOverSubtitle.textContent = `¡LA ESTRELLA DE LA MUERTE HA SIDO DESTRUIDA!\nPUNTUACIÓN FINAL: ${GameState.score}`;
    gameOverOverlay.classList.remove('hidden');

    if (GameState.score > GameState.highScore) {
        GameState.highScore = GameState.score;
        highScoreElement.textContent = `HI: ${String(GameState.highScore).padStart(6, '0')}`;
        localStorage.setItem('starwars_highscore', GameState.highScore);
    }

    submitScore(GameState.currentNickname, GameState.score);
}

// Spawners de enemigos, asteroides y powerups
let enemySpawnTimer = 0;
let obstacleSpawnTimer = 0;

// TODOS LOS ENEMIGOS SON EL MISMO Y GLORIOSO CAZA TIE
function spawnEnemy() {
    const x = (Math.random() - 0.5) * 340;
    const y = (Math.random() - 0.5) * 150;
    const hp = 2; // Resistencia balanceada: 2 impactos láser
    const speed = 210;

    enemies.push({
        type: 'tie',
        x: x,
        y: y,
        z: 880,
        hp: hp,
        maxHp: hp,
        speed: speed,
        shootCooldown: Math.random() * 1.1 + 0.7,
        swayAngle: Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 2 + 1.6,
        roll: 0,
        muzzleFlash: 0
    });

    if (Math.random() > 0.65) {
        audio.playTieRoar();
    }
}

function spawnObstacle() {
    const x = (Math.random() - 0.5) * 380;
    const y = (Math.random() - 0.5) * 180;
    const radius = Math.random() * 22 + 16;
    obstacles.push({
        x: x,
        y: y,
        z: 900,
        radius: radius,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 2.8,
        speed: 215,
        hp: Math.ceil(radius / 10),
        craters: [
            { rx: (Math.random() - 0.5) * 0.6, ry: (Math.random() - 0.5) * 0.6, r: Math.random() * 0.25 + 0.15 },
            { rx: (Math.random() - 0.5) * 0.6, ry: (Math.random() - 0.5) * 0.6, r: Math.random() * 0.25 + 0.15 }
        ]
    });
}

function spawnLifeCapsule(x, y, z) {
    powerups.push({
        type: 'life',
        x: x !== undefined ? x : (Math.random() - 0.5) * 220,
        y: y !== undefined ? y : (Math.random() - 0.5) * 80,
        z: z !== undefined ? z : 880,
        speed: 160
    });
}

function spawnPowerup(x, y, z) {
    // Si la nave ha sufrido daños, priorizar cápsulas de vida para recuperar
    const rand = Math.random();
    let type = 'life';
    if (GameState.shields < GameState.maxShields) {
        if (rand < 0.60) type = 'life';
        else if (rand < 0.82) type = 'spread';
        else type = 'turbo';
    } else {
        if (rand < 0.35) type = 'life';
        else if (rand < 0.70) type = 'spread';
        else type = 'turbo';
    }

    powerups.push({
        type: type,
        x: x,
        y: y,
        z: z,
        speed: 165
    });
}

function createExplosion(x, y, z, count = 28, isBig = false) {
    audio.playExplosion(isBig);
    GameState.screenShake = isBig ? 9 : 4.5;

    // Onda de choque circular expansiva
    particles.push({
        type: 'shockwave',
        x: x,
        y: y,
        z: z,
        radius: 6,
        maxRadius: isBig ? 65 : 42,
        life: 0.35,
        maxLife: 0.35,
        color: '#fef08a'
    });

    // Fragmentos de paneles solares hexagonales del TIE que giran al destruirse
    for (let w = 0; w < 2; w++) {
        wingDebris.push({
            x: x + (w === 0 ? -15 : 15),
            y: y,
            z: z,
            vx: (w === 0 ? -1 : 1) * (Math.random() * 80 + 50),
            vy: (Math.random() - 0.5) * 70,
            vz: (Math.random() - 0.5) * 60,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 9,
            life: 0.7,
            maxLife: 0.7,
            size: Math.random() * 12 + 10
        });
    }

    // Chispas de fuego ardientes
    for (let i = 0; i < count; i++) {
        const speed = Math.random() * 140 + 40;
        const angle = Math.random() * Math.PI * 2;
        const vz = (Math.random() - 0.5) * 90;
        const colors = ['#ffffff', '#fef08a', '#f59e0b', '#ef4444', '#b91c1c', '#38bdf8'];
        particles.push({
            type: 'spark',
            x: x,
            y: y,
            z: z,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            vz: vz,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: Math.random() * 0.45 + 0.25,
            maxLife: 0.7,
            size: Math.random() * 3.5 + 1.8
        });
    }
}

function addFloatingScore(text, x, y, color = '#facc15') {
    floatingScores.push({
        text: text,
        x: x,
        y: y,
        color: color,
        life: 0.85
    });
}

// Proyección en perspectiva 3D a pantalla 2D
function project3D(x, y, z) {
    if (z <= 12) return null;
    const scale = FOV / z;
    const sx = (CANVAS_WIDTH / 2) + x * scale;
    const sy = HORIZON_Y + y * scale;
    return { x: sx, y: sy, scale: scale };
}

// ==============================================================================
// RENDERIZADO VISUAL RETRO 16-BIT (ESTÁNDAR SUPER STAR WARS)
// ==============================================================================

// 1. DIBUJAR EL HUD ESTILO SUPER STAR WARS (Con Barra de Sable Láser Radiante)
function renderSuperStarWarsHUD() {
    const saberX = 14;
    const saberY = 16;
    const hiltW = 18;
    const hiltH = 7;
    const maxBladeW = 95;
    const currentBladeW = Math.max(0, (GameState.shields / GameState.maxShields) * maxBladeW);

    // Empuñadura metálica cromada del sable de luz de Luke
    ctx.fillStyle = '#64748b';
    ctx.fillRect(saberX, saberY, hiltW, hiltH);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(saberX + 2, saberY + 1, hiltW - 4, 2);
    // Anillos negros de agarre
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(saberX + 4, saberY, 2, hiltH);
    ctx.fillRect(saberX + 8, saberY, 2, hiltH);
    ctx.fillRect(saberX + 12, saberY, 2, hiltH);
    // Emisor dorado del sable
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(saberX + hiltW - 2, saberY - 1, 2, hiltH + 2);

    // Hoja de plasma del sable de luz con pulsación de energía
    if (currentBladeW > 0) {
        ctx.save();
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.roundRect(saberX + hiltW, saberY + 1, currentBladeW, hiltH - 2, [0, 4, 4, 0]);
        ctx.fill();

        // Núcleo blanco brillante
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(saberX + hiltW + 1, saberY + 2, currentBladeW - 2, hiltH - 4, [0, 3, 3, 0]);
        ctx.fill();
        ctx.restore();
    }

    // Texto de Vidas / Escudos
    ctx.fillStyle = '#38bdf8';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`VIDAS: ${Math.ceil(GameState.shields)}`, saberX + hiltW + maxBladeW + 8, saberY + 6);

    // Marcador de Cazas TIE Destruidos
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'right';
    ctx.fillText(`TIEs: ${String(GameState.kills).padStart(2, '0')}`, CANVAS_WIDTH - 14, saberY + 6);
}

// 2. FONDO Y TERRENO PLANETARIO ESTILO MODE 7 CON MONOLITOS LATERALES
// 2. FONDO Y TERRENO PLANETARIO ESTILO MODE 7 CON MONOLITOS LATERALES Y ALTO DETALLE
function renderEnvironment(dt) {
    const currentSpeed = GameState.boost ? GameState.speed * 2.3 : GameState.speed;
    GameState.worldScroll += (GameState.boost ? 580 : 280) * dt;

    if (GameState.stage === 1) {
        // --- ETAPA 1: DESIERTO Y CAÑÓN DE TATOOINE (SUPER STAR WARS STYLE) ---

        // 1. Cielo crepuscular con gradiente cálido atmosférico multicapa
        const skyGrad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
        skyGrad.addColorStop(0, '#1a0d24');    // Noche violeta espacial
        skyGrad.addColorStop(0.35, '#481532'); // Terracota vino
        skyGrad.addColorStop(0.68, '#7e2a14'); // Óxido ámbar
        skyGrad.addColorStop(0.88, '#c2410c'); // Naranja atardecer
        skyGrad.addColorStop(1, '#f59e0b');    // Calima dorada del horizonte
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, HORIZON_Y);

        // Estrellas ténues en la alta estratosfera
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        [
            { x: 45, y: 18 }, { x: 92, y: 32 }, { x: 154, y: 14 },
            { x: 215, y: 26 }, { x: 288, y: 16 }, { x: 345, y: 28 }
        ].forEach(st => ctx.fillRect(st.x, st.y, 1.2, 1.2));

        // 2. Soles gemelos de Tatooine con corona radiante y destello anamórfico
        const sun1X = CANVAS_WIDTH * 0.65;
        const sun1Y = HORIZON_Y - 50;

        // Resplandor anamórfico horizontal
        ctx.fillStyle = 'rgba(254, 240, 138, 0.15)';
        ctx.fillRect(0, sun1Y - 1, CANVAS_WIDTH, 2);

        // Tatoo I (Sol Principal Dorado)
        const coronaGrad = ctx.createRadialGradient(sun1X, sun1Y, 3, sun1X, sun1Y, 42);
        coronaGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        coronaGrad.addColorStop(0.25, 'rgba(254, 240, 138, 0.85)');
        coronaGrad.addColorStop(0.65, 'rgba(249, 115, 22, 0.35)');
        coronaGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coronaGrad;
        ctx.beginPath();
        ctx.arc(sun1X, sun1Y, 42, 0, Math.PI * 2);
        ctx.fill();

        // Núcleo nuclear blanco-oro de Tatoo I
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sun1X, sun1Y, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Tatoo II (Sol Secundario de Cobre)
        const sun2X = CANVAS_WIDTH * 0.76;
        const sun2Y = HORIZON_Y - 36;
        const corona2 = ctx.createRadialGradient(sun2X, sun2Y, 2, sun2X, sun2Y, 22);
        corona2.addColorStop(0, '#fed7aa');
        corona2.addColorStop(0.5, 'rgba(234, 88, 12, 0.6)');
        corona2.addColorStop(1, 'transparent');
        ctx.fillStyle = corona2;
        ctx.beginPath();
        ctx.arc(sun2X, sun2Y, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(sun2X, sun2Y, 7.5, 0, Math.PI * 2);
        ctx.fill();

        // 3. Cordillera lejana de picos montañosos en paralaje (Capa 1)
        const pFarOffset = -Player.x * 0.03;
        ctx.fillStyle = '#2f0f1b';
        ctx.beginPath();
        ctx.moveTo(0, HORIZON_Y);
        ctx.lineTo(0, HORIZON_Y - 8);
        ctx.lineTo(35 + pFarOffset, HORIZON_Y - 24);
        ctx.lineTo(75 + pFarOffset, HORIZON_Y - 14);
        ctx.lineTo(125 + pFarOffset, HORIZON_Y - 30);
        ctx.lineTo(170 + pFarOffset, HORIZON_Y - 18);
        ctx.lineTo(235 + pFarOffset, HORIZON_Y - 34);
        ctx.lineTo(290 + pFarOffset, HORIZON_Y - 16);
        ctx.lineTo(345 + pFarOffset, HORIZON_Y - 28);
        ctx.lineTo(CANVAS_WIDTH, HORIZON_Y - 12);
        ctx.lineTo(CANVAS_WIDTH, HORIZON_Y);
        ctx.closePath();
        ctx.fill();

        // 4. Mesetas y riscos del Cañón de Beggar (Capa 2 con facetas iluminadas)
        const pMidOffset = -Player.x * 0.07;
        ctx.fillStyle = '#501720';
        ctx.beginPath();
        ctx.moveTo(0, HORIZON_Y);
        ctx.lineTo(0, HORIZON_Y - 12);
        ctx.lineTo(48 + pMidOffset, HORIZON_Y - 22);
        ctx.lineTo(92 + pMidOffset, HORIZON_Y - 14);
        ctx.lineTo(138 + pMidOffset, HORIZON_Y - 26);
        ctx.lineTo(188 + pMidOffset, HORIZON_Y - 16);
        ctx.lineTo(248 + pMidOffset, HORIZON_Y - 30);
        ctx.lineTo(312 + pMidOffset, HORIZON_Y - 18);
        ctx.lineTo(370 + pMidOffset, HORIZON_Y - 24);
        ctx.lineTo(CANVAS_WIDTH, HORIZON_Y - 10);
        ctx.lineTo(CANVAS_WIDTH, HORIZON_Y);
        ctx.closePath();
        ctx.fill();

        // Facetas rocosas iluminadas por los soles
        ctx.fillStyle = '#7a2530';
        [-30, 60, 150, 260, 350].forEach(fx => {
            const rx = fx + pMidOffset;
            ctx.beginPath();
            ctx.moveTo(rx, HORIZON_Y);
            ctx.lineTo(rx + 14, HORIZON_Y - 18);
            ctx.lineTo(rx + 24, HORIZON_Y - 18);
            ctx.lineTo(rx + 16, HORIZON_Y);
            ctx.closePath();
            ctx.fill();
        });

        // Condensadores de humedad (Moisture Vaporators) silueteados en los riscos
        [70, 210, 335].forEach(vx => {
            const vPos = vx + pMidOffset;
            ctx.fillStyle = '#1c070c';
            ctx.fillRect(vPos, HORIZON_Y - 18, 1.8, 18); // Mástil
            ctx.fillRect(vPos - 2.5, HORIZON_Y - 14, 7, 1.5); // Disco 1
            ctx.fillRect(vPos - 2, HORIZON_Y - 9, 6, 1.5);   // Disco 2
            // Luz roja parpadeante de baliza en la punta
            if (Math.floor(Date.now() / 350) % 2 === 0) {
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(vPos - 0.5, HORIZON_Y - 20, 3, 2);
            }
        });

        // 5. Sandcrawler Jawa con orugas detalladas y polvo
        const crawlerX = (CANVAS_WIDTH * 0.40) - (Player.x * 0.07);
        const crawlerY = HORIZON_Y - 26;

        // Polvareda detrás del Sandcrawler
        ctx.fillStyle = 'rgba(234, 88, 12, 0.25)';
        ctx.beginPath();
        ctx.ellipse(crawlerX - 28, HORIZON_Y - 4, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Casco angular marrón herrumbre
        ctx.fillStyle = '#3a1318';
        ctx.beginPath();
        ctx.moveTo(crawlerX - 22, HORIZON_Y);
        ctx.lineTo(crawlerX - 22, crawlerY + 5);
        ctx.lineTo(crawlerX - 14, crawlerY);
        ctx.lineTo(crawlerX + 16, crawlerY);
        ctx.lineTo(crawlerX + 22, crawlerY + 10);
        ctx.lineTo(crawlerX + 24, HORIZON_Y);
        ctx.closePath();
        ctx.fill();

        // Placas de blindaje y orugas
        ctx.fillStyle = '#220a0d';
        ctx.fillRect(crawlerX - 20, HORIZON_Y - 5, 42, 5);
        // Ventanal de la cabina de mando iluminado
        ctx.fillStyle = '#fde047';
        ctx.fillRect(crawlerX - 12, crawlerY + 3, 7, 2);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(crawlerX - 14, crawlerY + 6, 4, 1.5);

        // 6. Suelo del desierto estilo Mode 7 con dunas ondulantes y huellas
        const groundH = CANVAS_HEIGHT - HORIZON_Y;
        const desertGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, CANVAS_HEIGHT);
        desertGrad.addColorStop(0, '#9a3412');
        desertGrad.addColorStop(0.35, '#c2410c');
        desertGrad.addColorStop(0.80, '#ea580c');
        desertGrad.addColorStop(1, '#f97316');
        ctx.fillStyle = desertGrad;
        ctx.fillRect(0, HORIZON_Y, CANVAS_WIDTH, groundH);

        // Ondulaciones y bandas de dunas en perspectiva
        for (let i = 0; i < groundH; i += 3) {
            const wave = Math.sin((i * 0.18) + (GameState.worldScroll * 0.05));
            if (wave > 0.25) {
                const alpha = Math.min(0.28, (i / groundH) * 0.35);
                ctx.fillStyle = `rgba(254, 215, 170, ${alpha.toFixed(2)})`;
                ctx.fillRect(0, HORIZON_Y + i, CANVAS_WIDTH, 2);
            }
        }

        // Huellas de landspeeder y cañón en perspectiva hacia el horizonte
        ctx.strokeStyle = 'rgba(124, 45, 18, 0.40)';
        ctx.lineWidth = 1.5;
        const centerOffset = -Player.x * 0.35;
        [-170, -100, -40, 40, 100, 170].forEach(lx => {
            ctx.beginPath();
            ctx.moveTo((CANVAS_WIDTH / 2) + centerOffset * 0.1, HORIZON_Y);
            ctx.lineTo((CANVAS_WIDTH / 2) + lx + centerOffset, CANVAS_HEIGHT);
            ctx.stroke();
        });

        // Gravilla y guijarros en 3D que pasan a toda velocidad sobre la arena
        groundPebbles.forEach(gp => {
            const p = project3D(gp.x, gp.y, gp.z);
            if (p && p.y > HORIZON_Y) {
                ctx.fillStyle = gp.color;
                const r = Math.max(1, gp.size * p.scale * 1.5);
                ctx.fillRect(p.x, p.y, r, Math.max(1, r * 0.7));
            }
        });

        // 7. Monolitos de roca 3D y Arcos Naturales Gigantes
        canyonRocks.forEach(r => {
            r.z -= currentSpeed * dt * 0.88;
            if (r.z <= 12) {
                r.z = 900;
                if (r.type !== 'arch') {
                    r.x = r.side * (160 + Math.random() * 110);
                }
            }
            const p = project3D(r.x, r.y, r.z);
            if (!p || p.scale <= 0.08) return;

            const rw = r.width * p.scale;
            const rh = r.height * p.scale;

            if (r.type === 'arch') {
                // Arco natural de piedra colosal: el Halcón vuela por debajo
                ctx.save();
                ctx.translate(p.x, p.y);

                // Columna izquierda
                ctx.fillStyle = '#651f1f';
                ctx.fillRect(-rw / 2, -rh, rw * 0.22, rh);
                // Columna derecha (iluminada por los soles)
                ctx.fillStyle = '#8e2e25';
                ctx.fillRect(rw / 2 - rw * 0.22, -rh, rw * 0.22, rh);

                // Puente superior del arco
                ctx.fillStyle = '#7a2522';
                ctx.fillRect(-rw / 2, -rh, rw, rh * 0.28);
                // Curvatura del arco interior
                ctx.strokeStyle = '#431407';
                ctx.lineWidth = Math.max(1, 1.8 * p.scale);
                ctx.strokeRect(-rw / 2, -rh, rw, rh * 0.28);

                ctx.restore();
            } else {
                // Monolito / Aguja rocosa estratificada con bandas de sedimentos
                const left = p.x - rw / 2;
                const top = p.y - rh;

                // Sombra en el lado izquierdo
                ctx.fillStyle = '#4c151b';
                ctx.beginPath();
                ctx.moveTo(left, p.y);
                ctx.lineTo(p.x - rw * 0.1, top);
                ctx.lineTo(p.x, top);
                ctx.lineTo(p.x, p.y);
                ctx.closePath();
                ctx.fill();

                // Cara derecha iluminada por los soles
                ctx.fillStyle = '#8f2c25';
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x, top);
                ctx.lineTo(p.x + rw * 0.25, top);
                ctx.lineTo(left + rw, p.y);
                ctx.closePath();
                ctx.fill();

                // Bandas horizontales de estrato geológico
                ctx.fillStyle = '#b45309';
                ctx.fillRect(left + rw * 0.08, top + rh * 0.35, rw * 0.84, Math.max(1.5, 3.5 * p.scale));
                ctx.fillStyle = '#5c1d1d';
                ctx.fillRect(left + rw * 0.05, top + rh * 0.65, rw * 0.90, Math.max(1.5, 4.0 * p.scale));

                // Borde chiseled
                ctx.strokeStyle = '#320d12';
                ctx.lineWidth = Math.max(1, 1.2 * p.scale);
                ctx.stroke();
            }
        });

        // 8. Motas de polvo ambiental dorado flotando en el aire
        ambientDust.forEach(ad => {
            ctx.fillStyle = `rgba(254, 215, 170, ${ad.alpha.toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(ad.x, ad.y, ad.size, 0, Math.PI * 2);
            ctx.fill();
        });

    } else if (GameState.stage === 2) {
        // --- ETAPA 2: CAMPO DE ASTEROIDES & ESPACIO PROFUNDO ---
        ctx.fillStyle = '#020409';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Nebulosas cósmicas volumétricas en capas multicromáticas
        const neb1 = ctx.createRadialGradient(CANVAS_WIDTH * 0.30, HORIZON_Y * 0.6, 8, CANVAS_WIDTH * 0.30, HORIZON_Y * 0.6, 160);
        neb1.addColorStop(0, 'rgba(6, 182, 212, 0.25)'); // Cyan estelar
        neb1.addColorStop(0.5, 'rgba(139, 92, 246, 0.16)'); // Violeta cósmico
        neb1.addColorStop(1, 'transparent');
        ctx.fillStyle = neb1;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const neb2 = ctx.createRadialGradient(CANVAS_WIDTH * 0.75, HORIZON_Y * 0.9, 5, CANVAS_WIDTH * 0.75, HORIZON_Y * 0.9, 130);
        neb2.addColorStop(0, 'rgba(236, 72, 153, 0.18)'); // Magenta galáctico
        neb2.addColorStop(0.6, 'rgba(59, 130, 246, 0.10)');
        neb2.addColorStop(1, 'transparent');
        ctx.fillStyle = neb2;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Planeta gigante gaseoso / Tatooine en órbita lejana
        const planetX = CANVAS_WIDTH * 0.82 - Player.x * 0.04;
        const planetY = 58;
        const planetR = 28;

        // Atmósfera exterior
        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(planetX, planetY, planetR, 0, Math.PI * 2);
        ctx.fill();

        // Gradiente superficial del planeta con media luna
        const planetGrad = ctx.createLinearGradient(planetX - planetR, planetY - planetR, planetX + planetR, planetY + planetR);
        planetGrad.addColorStop(0, '#38bdf8');
        planetGrad.addColorStop(0.4, '#0369a1');
        planetGrad.addColorStop(0.75, '#082f49');
        planetGrad.addColorStop(1, '#020617');
        ctx.fillStyle = planetGrad;
        ctx.beginPath();
        ctx.arc(planetX, planetY, planetR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Destructor Estelar Imperial (Imperial Star Destroyer) en el fondo
        const isdX = CANVAS_WIDTH * 0.68 - Player.x * 0.05;
        const isdY = HORIZON_Y - 32;

        ctx.save();
        // Casco principal triangular
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(isdX, isdY);
        ctx.lineTo(isdX - 48, isdY + 20);
        ctx.lineTo(isdX + 48, isdY + 20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Torre de mando de puente y generadores de escudo
        ctx.fillStyle = '#334155';
        ctx.fillRect(isdX - 12, isdY + 8, 24, 7);
        // Cúpulas de escudo
        ctx.fillStyle = '#64748b';
        ctx.fillRect(isdX - 10, isdY + 6, 4, 3);
        ctx.fillRect(isdX + 6, isdY + 6, 4, 3);

        // Toberas de los 3 motores de iones cyan brillantes
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#00f0ff';
        [-8, 0, 8].forEach(ex => {
            ctx.beginPath();
            ctx.arc(isdX + ex, isdY + 20, 2, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // Destellos aleatorios de fuego antiaéreo distante (Flak)
        if (Math.random() < 0.12) {
            const fx = isdX + (Math.random() - 0.5) * 80;
            const fy = isdY + (Math.random() - 0.5) * 40;
            ctx.fillStyle = Math.random() > 0.5 ? '#22c55e' : '#ef4444';
            ctx.fillRect(fx, fy, 2, 2);
        }

    } else {
        // --- ETAPA 3: TRINCHERA DE LA ESTRELLA DE LA MUERTE (DEATH STAR TRENCH RUN) ---
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, CANVAS_WIDTH, HORIZON_Y);

        // Estrellas en el espacio exterior sobre la trinchera
        ctx.fillStyle = '#ffffff';
        [
            { x: 30, y: 25 }, { x: 85, y: 15 }, { x: 140, y: 35 },
            { x: 230, y: 20 }, { x: 310, y: 40 }, { x: 370, y: 15 }
        ].forEach(st => ctx.fillRect(st.x, st.y, 1, 1));

        // Superficie exterior y murallas de la trinchera
        const trenchTopY = HORIZON_Y - 20;

        // Pared izquierda de la trinchera con greebles mecánicos
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(0, trenchTopY);
        ctx.lineTo(CANVAS_WIDTH * 0.30, HORIZON_Y);
        ctx.lineTo(CANVAS_WIDTH * 0.12, CANVAS_HEIGHT);
        ctx.lineTo(0, CANVAS_HEIGHT);
        ctx.closePath();
        ctx.fill();

        // Pared derecha de la trinchera
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH, trenchTopY);
        ctx.lineTo(CANVAS_WIDTH * 0.70, HORIZON_Y);
        ctx.lineTo(CANVAS_WIDTH * 0.88, CANVAS_HEIGHT);
        ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.closePath();
        ctx.fill();

        // Suelo metálico de la trinchera
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH * 0.30, HORIZON_Y);
        ctx.lineTo(CANVAS_WIDTH * 0.70, HORIZON_Y);
        ctx.lineTo(CANVAS_WIDTH * 0.88, CANVAS_HEIGHT);
        ctx.lineTo(CANVAS_WIDTH * 0.12, CANVAS_HEIGHT);
        ctx.closePath();
        ctx.fill();

        // Canal central de escape térmico (Thermal Exhaust Channel)
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH * 0.47, HORIZON_Y);
        ctx.lineTo(CANVAS_WIDTH * 0.53, HORIZON_Y);
        ctx.lineTo(CANVAS_WIDTH * 0.56, CANVAS_HEIGHT);
        ctx.lineTo(CANVAS_WIDTH * 0.44, CANVAS_HEIGHT);
        ctx.closePath();
        ctx.fill();

        // Rejillas de perspectiva y paneles greebles en el suelo
        ctx.strokeStyle = '#0369a1';
        ctx.lineWidth = 1;
        for (let y = HORIZON_Y; y < CANVAS_HEIGHT; y += 14) {
            const progress = (y - HORIZON_Y) / (CANVAS_HEIGHT - HORIZON_Y);
            const xLeft = (CANVAS_WIDTH * 0.30) - (progress * 72);
            const xRight = (CANVAS_WIDTH * 0.70) + (progress * 72);
            ctx.beginPath();
            ctx.moveTo(xLeft, y);
            ctx.lineTo(xRight, y);
            ctx.stroke();
        }

        // Balizas luminosas rojas y ámbar parpadeando en la cresta de la trinchera
        const beaconPulse = Math.floor(Date.now() / 250) % 2 === 0;
        ctx.fillStyle = beaconPulse ? '#ef4444' : '#f59e0b';
        ctx.fillRect(CANVAS_WIDTH * 0.30, HORIZON_Y - 4, 3, 3);
        ctx.fillRect(CANVAS_WIDTH * 0.70, HORIZON_Y - 4, 3, 3);
        ctx.fillRect(CANVAS_WIDTH * 0.18, HORIZON_Y + 50, 4, 4);
        ctx.fillRect(CANVAS_WIDTH * 0.82, HORIZON_Y + 50, 4, 4);

        // Torres turboláser imperiales en las paredes
        ctx.fillStyle = '#475569';
        ctx.fillRect(CANVAS_WIDTH * 0.85, HORIZON_Y + 70, 16, 12);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(CANVAS_WIDTH * 0.83, HORIZON_Y + 73, 8, 2.5);
    }

    // Estrellas volando hacia el jugador con efecto warp durante el hiperespacio (Turbo)
    stars.forEach(s => {
        const p = project3D(s.x, s.y, s.z);
        if (p) {
            ctx.fillStyle = s.color;
            if (GameState.boost) {
                const pPrev = project3D(s.x, s.y, s.z + 85);
                if (pPrev) {
                    ctx.save();
                    ctx.strokeStyle = '#38bdf8';
                    ctx.shadowColor = '#00f0ff';
                    ctx.shadowBlur = 8;
                    ctx.lineWidth = Math.max(1.5, p.scale * 2.8);
                    ctx.beginPath();
                    ctx.moveTo(pPrev.x, pPrev.y);
                    ctx.lineTo(p.x, p.y);
                    ctx.stroke();
                    ctx.restore();
                }
            } else {
                const r = Math.max(0.7, s.size * p.scale * 1.6);
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });
}

// 3. RENDERIZADO DEL HALCÓN MILENARIO (SPRITE 16-BIT MULTICAPA ULTRA DETALLADO)
function renderMillenniumFalcon(dt) {
    const cx = (CANVAS_WIDTH / 2) + Player.x;
    const cy = (CANVAS_HEIGHT * 0.77) + Player.y;

    // Sombra en el suelo según altitud (Etapa 1: Cañón del Desierto de Tatooine)
    if (GameState.stage === 1) {
        const groundY = CANVAS_HEIGHT - 18;
        const altitude = Math.max(12, groundY - cy);
        const altitudeFactor = Math.min(1, Math.max(0, (altitude - 15) / 150));
        const shadowScale = Math.max(0.42, 1.0 - (altitudeFactor * 0.55));
        const shadowAlpha = Math.max(0.12, 0.48 - (altitudeFactor * 0.34));
        const shadowY = groundY + (Player.y * 0.08);

        ctx.fillStyle = `rgba(67, 20, 7, ${shadowAlpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.ellipse(cx, shadowY, 48 * shadowScale, 14 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ráfagas de polvo del motor cuando vuela rasante cerca del suelo
        if (altitudeFactor < 0.35) {
            Player.thrusterFlicker += dt * 30;
            if (Math.random() < 0.45 * (1 - altitudeFactor / 0.35)) {
                dustPuffs.push({
                    x: cx + (Math.random() - 0.5) * 55,
                    y: shadowY + (Math.random() - 0.5) * 6,
                    vx: (Math.random() - 0.5) * 35,
                    vy: -Math.random() * 20 - 10,
                    life: 0.35,
                    maxLife: 0.35,
                    size: Math.random() * 4 + 2
                });
            }
        }
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Player.roll);

    // Perspectiva y pitch al subir (ascenso) o bajar (descenso):
    const pitchScaleY = 1.0 - (Player.pitch * 0.22);
    ctx.scale(1 - Math.abs(Player.roll) * 0.08, pitchScaleY);

    if (Player.invulnerableTime > 0 && Math.floor(Date.now() / 70) % 2 === 0) {
        ctx.globalAlpha = 0.4;
    }

    // Escudo holográfico
    if (Player.shieldFlash > 0 || GameState.boost) {
        ctx.save();
        ctx.strokeStyle = GameState.boost ? '#38bdf8' : '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.ellipse(0, -2, 60, 42, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = GameState.boost ? 'rgba(56, 189, 248, 0.18)' : 'rgba(239, 68, 68, 0.18)';
        ctx.fill();
        ctx.restore();
    }

    // Motor subluz azul cyan (mayor resplandor al ascender o con turbo)
    const isClimbing = Player.pitch < -0.05;
    const isBoost = GameState.boost;
    const engineGlowRadius = isBoost ? 22 : (isClimbing ? 15 : 10);
    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = engineGlowRadius;

    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.roundRect(-32, 16, 64, 6, [0, 0, 4, 4]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-26, 17, 52, 4, [0, 0, 3, 3]);
    ctx.fill();
    ctx.restore();

    // Llamas de plasma
    const flameColor = isBoost ? '#67e8f9' : '#38bdf8';
    ctx.fillStyle = flameColor;
    const climbBonus = isClimbing ? 6 : 0;
    for (let i = -28; i <= 28; i += 7) {
        const flameLen = (Math.sin(Player.thrusterFlicker + i) * 0.5 + 0.5) * (isBoost ? 18 : 8) + 5 + climbBonus;
        ctx.fillRect(i, 22, 4, flameLen);
    }

    // Casco platillo
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(0, 0, 52, 33, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(0, -3, 50, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(-4, -6, 42, 23, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Rejillas y marcas de batalla
    ctx.fillStyle = '#334155';
    [-22, -11, 0, 11, 22].forEach(vx => {
        ctx.beginPath();
        ctx.arc(vx, 7, 3.5, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(-18, -14, 8, 3);
    ctx.fillRect(14, -8, 6, 2.5);

    ctx.fillStyle = '#475569';
    ctx.fillRect(-48, -7, 6, 9);
    ctx.fillRect(42, -7, 6, 9);

    // Mandíbulas de carga
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(-24, -20);
    ctx.lineTo(-26, -42);
    ctx.lineTo(-13, -42);
    ctx.lineTo(-11, -20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(11, -20);
    ctx.lineTo(13, -42);
    ctx.lineTo(26, -42);
    ctx.lineTo(24, -20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-11, -38, 22, 18);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-24, -41, 3, 2);
    ctx.fillRect(21, -41, 3, 2);

    // Cabina y tubo a estribor
    ctx.fillStyle = '#64748b';
    ctx.fillRect(38, -20, 18, 11);

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(45, -32);
    ctx.lineTo(57, -22);
    ctx.lineTo(55, -6);
    ctx.lineTo(41, -6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(46, -28);
    ctx.lineTo(54, -21);
    ctx.lineTo(52, -10);
    ctx.lineTo(44, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Antena sensora
    ctx.fillStyle = '#475569';
    ctx.fillRect(-31, -16, 6, 4);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(-33, -19, 9, 5, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // Torreta cuádruple
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, -7, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f1f5f9';
    const recoilOffset = Player.recoil > 0 ? 3 : 0;
    ctx.fillRect(-4, -19 + recoilOffset, 2.5, 10);
    ctx.fillRect(1.5, -19 + recoilOffset, 2.5, 10);

    // Destello de disparo en la boca del cañón (Muzzle Flash)
    if (Player.muzzleFlash > 0) {
        ctx.save();
        ctx.shadowColor = Player.spreadTimer > 0 ? '#38bdf8' : '#ef4444';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#ffffff';
        // Cañones de la torreta central
        [-2.75, 2.75].forEach(bx => {
            ctx.beginPath();
            ctx.arc(bx, -20, 5, 0, Math.PI * 2);
            ctx.fill();
        });
        if (Player.spreadTimer > 0) {
            // Mandíbulas exteriores en modo cuádruple
            [-18, 18].forEach(mx => {
                ctx.beginPath();
                ctx.arc(mx, -42, 6, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        ctx.restore();
    }

    ctx.restore();

    renderTargetingHUD();
}

function renderTargetingHUD() {
    const crosshairX = CANVAS_WIDTH / 2 + Player.x * 0.45;
    const crosshairY = HORIZON_Y + Player.y * 0.35;

    let targetLocked = false;
    let lockedEnemy = null;

    if (currentBoss && currentBoss.z > 80 && currentBoss.z < 850) {
        const pb = project3D(currentBoss.x, currentBoss.y, currentBoss.z);
        if (pb && Math.hypot(pb.x - crosshairX, pb.y - crosshairY) < 55) {
            targetLocked = true;
            lockedEnemy = { e: currentBoss, p: pb, isBoss: true };
            GameState.lockedTarget = pb;
        }
    }

    if (!targetLocked) {
        enemies.forEach(e => {
            if (e.z > 100 && e.z < 650) {
                const p = project3D(e.x, e.y, e.z);
                if (p && Math.hypot(p.x - crosshairX, p.y - crosshairY) < 32) {
                    targetLocked = true;
                    lockedEnemy = { e, p, isBoss: false };
                    GameState.lockedTarget = p;
                }
            }
        });
    }

    const reticleColor = targetLocked ? '#ef4444' : 'rgba(56, 189, 248, 0.75)';
    ctx.save();
    ctx.strokeStyle = reticleColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = reticleColor;
    ctx.shadowBlur = targetLocked ? 10 : 4;

    // Círculo de mira central
    ctx.beginPath();
    ctx.arc(crosshairX, crosshairY, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Cruz de puntería con muescas vectoriales
    ctx.beginPath();
    ctx.moveTo(crosshairX - 22, crosshairY);
    ctx.lineTo(crosshairX - 5, crosshairY);
    ctx.moveTo(crosshairX + 5, crosshairY);
    ctx.lineTo(crosshairX + 22, crosshairY);
    ctx.moveTo(crosshairX, crosshairY - 22);
    ctx.lineTo(crosshairX, crosshairY - 5);
    ctx.moveTo(crosshairX, crosshairY + 5);
    ctx.lineTo(crosshairX, crosshairY + 22);
    ctx.stroke();

    if (targetLocked && lockedEnemy) {
        const ep = lockedEnemy.p;
        const boxR = Math.max(16, (lockedEnemy.isBoss ? 45 : 28) * ep.scale);
        // Corchetes de computadora de tiro estilo Star Wars
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;

        // Esquinas de blanco fijado
        [-boxR, boxR].forEach(bx => {
            [-boxR, boxR].forEach(by => {
                const dirX = bx > 0 ? -6 : 6;
                const dirY = by > 0 ? -6 : 6;
                ctx.beginPath();
                ctx.moveTo(ep.x + bx, ep.y + by + dirY);
                ctx.lineTo(ep.x + bx, ep.y + by);
                ctx.lineTo(ep.x + bx + dirX, ep.y + by);
                ctx.stroke();
            });
        });

        // Lectura de distancia digital
        ctx.fillStyle = '#ef4444';
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        const lockText = lockedEnemy.isBoss ? `TARGET: ${lockedEnemy.e.name}` : `LOCK: ${Math.round(lockedEnemy.e.z)}m`;
        ctx.fillText(lockText, crosshairX, crosshairY - 26);
    }
    ctx.restore();
}

// 4. RENDERIZADO DEL CAZA TIE IMPERIAL (TODOS SON EL MISMO Y AUTÉNTICO CAZA TIE 3D)
function renderTIEFighter(e) {
    const p = project3D(e.x, e.y, e.z);
    if (!p) return;

    const scale = p.scale;
    const cx = p.x;
    const cy = p.y;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(e.roll);

    const span = Math.max(12, 32 * scale);      // Distancia entre alas
    const wingRadius = Math.max(8, 26 * scale); // Radio del hexágono solar
    const ballRadius = Math.max(4, 10 * scale); // Radio de la cabina esférica

    // 1. Pilones de conexión cilíndricos entre alas y cabina
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-span, -2.5 * scale, span * 2, 5 * scale);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(1, 1 * scale);
    ctx.strokeRect(-span, -2.5 * scale, span * 2, 5 * scale);

    // 2. Alas hexagonales (Izquierda y Derecha) con paneles fotovoltaicos y 6 radios
    [-span, span].forEach(wingX => {
        // Marco exterior hexagonal
        ctx.save();
        ctx.translate(wingX, 0);

        // A) Fondo negro azabache de las celdas solares
        ctx.fillStyle = '#050811';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const ang = (i * Math.PI) / 3;
            const hx = Math.sin(ang) * (wingRadius * 0.42); // Estrecho en perspectiva X
            const hy = -Math.cos(ang) * wingRadius;
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();

        // B) Borde exterior de titanio gris
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = Math.max(1, 1.6 * scale);
        ctx.stroke();

        // C) Los 6 radios estructurales que convergen en el centro
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = Math.max(1, 1.2 * scale);
        for (let i = 0; i < 6; i++) {
            const ang = (i * Math.PI) / 3;
            const hx = Math.sin(ang) * (wingRadius * 0.42);
            const hy = -Math.cos(ang) * wingRadius;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(hx, hy);
            ctx.stroke();
        }

        // D) Núcleo central del ala (Buje del pilón)
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.5 * scale, 3.5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.stroke();

        ctx.restore();
    });

    // 3. Cabina Esférica de Mando Central (Command Pod) con volumen 3D
    const podGrad = ctx.createRadialGradient(-ballRadius * 0.35, -ballRadius * 0.35, ballRadius * 0.1, 0, 0, ballRadius);
    podGrad.addColorStop(0, '#e2e8f0');
    podGrad.addColorStop(0.5, '#94a3b8');
    podGrad.addColorStop(1, '#334155');
    ctx.fillStyle = podGrad;
    ctx.beginPath();
    ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(1, 1.2 * scale);
    ctx.stroke();

    // 4. Ventanal de Transparisteel Octogonal (El icónico ojo del TIE Fighter)
    const windowR = ballRadius * 0.65;
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(0, 0, windowR, 0, Math.PI * 2);
    ctx.fill();

    // Marco con radios del ventanal
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = Math.max(1, 1 * scale);
    for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * windowR, Math.sin(ang) * windowR);
        ctx.stroke();
    }

    // Punto rojo de mira / computadora de tiro imperial en el centro
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1.5, 2.8 * scale), 0, Math.PI * 2);
    ctx.fill();

    // 5. Cañones Láser Gemelos SFS L-s1 montados debajo de la cabina
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-3 * scale, ballRadius * 0.75, 2 * scale, 3.5 * scale);
    ctx.fillRect(1 * scale, ballRadius * 0.75, 2 * scale, 3.5 * scale);

    // Muzzle flash verde al disparar
    if (e.muzzleFlash > 0) {
        ctx.save();
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-2 * scale, ballRadius * 0.95, 3.5 * scale, 0, Math.PI * 2);
        ctx.arc(2 * scale, ballRadius * 0.95, 3.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.restore();
}

// 5. RENDERIZADO DE RESTOS DE PANELES SOLARES DEL TIE
function renderWingDebris() {
    for (let i = wingDebris.length - 1; i >= 0; i--) {
        const wd = wingDebris[i];
        const p = project3D(wd.x, wd.y, wd.z);
        if (p) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(wd.rot);
            const s = wd.size * p.scale;
            ctx.fillStyle = '#090d16';
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = Math.max(1, 1.5 * p.scale);
            ctx.beginPath();
            for (let v = 0; v < 6; v++) {
                const ang = (v * Math.PI) / 3;
                const hx = Math.sin(ang) * (s * 0.4);
                const hy = -Math.cos(ang) * s;
                if (v === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }
}

// ==============================================================================
// RENDERIZADO DE JEFES DE NIVEL (BOSSES 16-BIT 3D)
// ==============================================================================

function renderBoss(b) {
    if (!b) return;
    if (b.type === 'tie_bomber') renderTIEBomber(b);
    else if (b.type === 'tie_advanced') renderTIEAdvanced(b);
    else if (b.type === 'death_star_core') renderDeathStarCore(b);
}

// Jefe 1: TIE Bomber Titan (Doble Cápsula y Alas Curvas)
function renderTIEBomber(b) {
    const pb = project3D(b.x, b.y, b.z);
    if (!pb) return;
    const scale = pb.scale;

    ctx.save();
    ctx.translate(pb.x, pb.y);
    ctx.rotate(b.roll);

    const span = Math.max(16, 42 * scale);
    const podR = Math.max(6, 12 * scale);
    const podGap = Math.max(8, 16 * scale);

    if (b.hitFlash > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ffffff';
    }

    // 1. Pilón central conector entre ambas cápsulas y alas
    ctx.fillStyle = b.hitFlash > 0 ? '#ffffff' : '#475569';
    ctx.fillRect(-span, -3 * scale, span * 2, 6 * scale);

    // 2. Cápsula Izquierda: Cabina de Mando del Piloto
    const leftPodX = -podGap * 0.6;
    ctx.fillStyle = b.hitFlash > 0 ? '#ffffff' : '#334155';
    ctx.beginPath();
    ctx.arc(leftPodX, 0, podR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.stroke();

    // Ventanal de piloto
    ctx.fillStyle = '#0a0f1d';
    ctx.beginPath();
    ctx.arc(leftPodX, 0, podR * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(leftPodX, 0, Math.max(1.5, 3 * scale), 0, Math.PI * 2);
    ctx.fill();

    // 3. Cápsula Derecha: Lanzador de Torpedos y Bahía de Bombas
    const rightPodX = podGap * 0.6;
    ctx.fillStyle = b.hitFlash > 0 ? '#ffffff' : '#1e293b';
    ctx.beginPath();
    ctx.arc(rightPodX, 0, podR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Boca cóncava con cabezas rojas de misiles
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(rightPodX, 0, podR * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    for (let m = 0; m < 6; m++) {
        const mang = (m * Math.PI) / 3;
        ctx.beginPath();
        ctx.arc(rightPodX + Math.cos(mang) * podR * 0.45, Math.sin(mang) * podR * 0.45, Math.max(1, 2 * scale), 0, Math.PI * 2);
        ctx.fill();
    }

    // 4. Alas curvadas características del TIE Bomber
    [-span, span].forEach(wx => {
        ctx.save();
        ctx.translate(wx, 0);
        ctx.fillStyle = b.hitFlash > 0 ? '#ffffff' : '#050811';
        ctx.beginPath();
        const wingH = Math.max(12, 34 * scale);
        const wingW = Math.max(7, 16 * scale);
        ctx.moveTo(0, -wingH);
        ctx.lineTo(wx < 0 ? wingW * 0.5 : -wingW * 0.5, -wingH * 0.75);
        ctx.lineTo(wx < 0 ? wingW * 0.5 : -wingW * 0.5, wingH * 0.75);
        ctx.lineTo(0, wingH);
        ctx.lineTo(wx < 0 ? -wingW * 0.5 : wingW * 0.5, wingH * 0.75);
        ctx.lineTo(wx < 0 ? -wingW * 0.5 : wingW * 0.5, -wingH * 0.75);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = Math.max(1, 1.8 * scale);
        ctx.stroke();
        ctx.restore();
    });

    ctx.restore();
}

// Jefe 2: TIE Advanced x1 de Lord Vader
function renderTIEAdvanced(b) {
    const pb = project3D(b.x, b.y, b.z);
    if (!pb) return;
    const scale = pb.scale;

    ctx.save();
    ctx.translate(pb.x, pb.y);
    ctx.rotate(b.roll);

    const span = Math.max(18, 46 * scale);
    const ballR = Math.max(6, 13 * scale);

    if (b.hitFlash > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ffffff';
    }

    // 1. Pilones y soporte de motor
    ctx.fillStyle = b.hitFlash > 0 ? '#ffffff' : '#334155';
    ctx.fillRect(-span, -3 * scale, span * 2, 6 * scale);

    // 2. Cabina de mando esférica reforzada de Darth Vader
    const podGrad = ctx.createRadialGradient(-ballR * 0.3, -ballR * 0.3, 2, 0, 0, ballR);
    podGrad.addColorStop(0, '#f1f5f9');
    podGrad.addColorStop(0.6, '#475569');
    podGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = b.hitFlash > 0 ? '#ffffff' : podGrad;
    ctx.beginPath();
    ctx.arc(0, 0, ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(1, 1.6 * scale);
    ctx.stroke();

    // Ventanal de transparisteel octogonal con mira roja de Vader
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(0, 0, ballR * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, 3.5 * scale), 0, Math.PI * 2);
    ctx.fill();

    // Toberas dobles de motor hiperespacial cyan
    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00f0ff';
    [-4 * scale, 4 * scale].forEach(ex => {
        ctx.beginPath();
        ctx.arc(ex, ballR * 0.5, 2.5 * scale, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();

    // 3. Alas anguladas dobladas del TIE Advanced x1
    [-span, span].forEach(wx => {
        ctx.save();
        ctx.translate(wx, 0);
        ctx.fillStyle = b.hitFlash > 0 ? '#ffffff' : '#030712';
        ctx.beginPath();
        const wingH = Math.max(14, 38 * scale);
        const wingW = Math.max(9, 22 * scale);
        const dir = wx < 0 ? -1 : 1;
        ctx.moveTo(0, -wingH * 0.5);
        ctx.lineTo(dir * wingW, -wingH);
        ctx.lineTo(dir * wingW * 1.3, -wingH * 0.6);
        ctx.lineTo(dir * wingW * 1.3, wingH * 0.6);
        ctx.lineTo(dir * wingW, wingH);
        ctx.lineTo(0, wingH * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = Math.max(1, 1.8 * scale);
        ctx.stroke();
        ctx.restore();
    });

    ctx.restore();
}

// Jefe 3: Núcleo Defensivo de la Trinchera y Puerto de Escape Térmico
function renderDeathStarCore(b) {
    const pb = project3D(b.x, b.y, b.z);
    if (!pb) return;
    const scale = pb.scale;

    ctx.save();
    ctx.translate(pb.x, pb.y);

    const fortW = Math.max(30, 80 * scale);
    const fortH = Math.max(20, 50 * scale);

    // Escudo deflector de energía pulsante
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = Math.max(1.5, 2.5 * scale);
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, fortW * 0.7, fortH * 0.75, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Bastión fortificado imperial
    ctx.fillStyle = b.hitFlash > 0 ? '#ffffff' : '#1e293b';
    ctx.fillRect(-fortW / 2, -fortH / 2, fortW, fortH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.strokeRect(-fortW / 2, -fortH / 2, fortW, fortH);

    // Torretas turboláser gemelas superiores
    ctx.fillStyle = '#64748b';
    [-fortW * 0.3, fortW * 0.3].forEach(tx => {
        ctx.beginPath();
        ctx.arc(tx, -fortH * 0.5, 6 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#334155';
        ctx.fillRect(tx - 2 * scale, -fortH * 0.5 - 8 * scale, 4 * scale, 8 * scale);
    });

    // Puerto de Escape Térmico (Thermal Exhaust Port) radiante
    const portR = Math.max(5, 14 * scale);
    ctx.save();
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, fortH * 0.25, portR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, fortH * 0.25, portR * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
}

// Renderizado de Proyectiles del Jefe (Torpedos de Protones)
function renderBossProjectile(bp) {
    const p = project3D(bp.x, bp.y, bp.z);
    if (!p) return;

    const r = Math.max(2.5, bp.radius * p.scale);
    ctx.save();
    ctx.translate(p.x, p.y);

    // Resplandor del torpedo
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Núcleo brillante
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Estela de humo y plasma
    ctx.fillStyle = 'rgba(249, 115, 22, 0.45)';
    ctx.beginPath();
    ctx.arc(0, r * 1.8, r * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// HUD de Jefe de Nivel (Alerta y Barra de Vida)
function renderBossHUD() {
    if (bossWarningTimer > 0) {
        const pulse = Math.floor(Date.now() / 180) % 2 === 0;
        ctx.save();
        ctx.fillStyle = pulse ? 'rgba(239, 68, 68, 0.90)' : 'rgba(245, 158, 11, 0.90)';
        ctx.fillRect(0, 112, CANVAS_WIDTH, 26);
        ctx.fillStyle = '#050811';
        ctx.fillRect(0, 115, CANVAS_WIDTH, 20);
        ctx.fillStyle = pulse ? '#ffffff' : '#fde047';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(bossWarningText, CANVAS_WIDTH / 2, 129);
        ctx.restore();
    }

    if (currentBoss) {
        ctx.save();
        const barW = 220;
        const barH = 7;
        const barX = (CANVAS_WIDTH - barW) / 2;
        const barY = 28;

        // Marco metálico imperial
        ctx.fillStyle = '#090d16';
        ctx.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(barX - 3, barY - 3, barW + 6, barH + 6);

        // Barra de energía
        const hpRatio = Math.max(0, currentBoss.hp / currentBoss.maxHp);
        const fillW = hpRatio * barW;
        const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        barGrad.addColorStop(0, hpRatio < 0.3 ? '#ef4444' : '#f59e0b');
        barGrad.addColorStop(1, hpRatio < 0.3 ? '#b91c1c' : '#ef4444');
        ctx.fillStyle = barGrad;
        ctx.fillRect(barX, barY, fillW, barH);

        // Texto con nombre del Jefe
        ctx.fillStyle = '#ffffff';
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(currentBoss.name, CANVAS_WIDTH / 2, barY - 6);
        ctx.restore();
    }
}

// 6. RENDERIZADO DE ASTEROIDES 3D POLIGONALES CON CRÁTERES Y RELIEVE
function renderObstacle(o) {
    const p = project3D(o.x, o.y, o.z);
    if (!p) return;

    const r = o.radius * p.scale;
    if (r < 1.2) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(o.rot);

    const rockGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    rockGrad.addColorStop(0, '#64748b');
    rockGrad.addColorStop(0.7, '#334155');
    rockGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = rockGrad;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = Math.max(1, 1.6 * p.scale);

    ctx.beginPath();
    const vertices = 8;
    for (let i = 0; i < vertices; i++) {
        const ang = (i / vertices) * Math.PI * 2;
        const radVar = r * (0.82 + ((i % 3) * 0.14));
        const vx = Math.cos(ang) * radVar;
        const vy = Math.sin(ang) * radVar;
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (o.craters) {
        o.craters.forEach(c => {
            const cx = c.rx * r;
            const cy = c.ry * r;
            const cr = c.r * r;
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(cx, cy, cr, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.stroke();
        });
    }

    ctx.restore();
}

// 7. RENDERIZADO DE POWER-UPS Y CÁPSULAS DE VIDA
function renderPowerup(pu) {
    const p = project3D(pu.x, pu.y, pu.z);
    if (!p) return;

    const size = Math.max(7, 18 * p.scale);
    ctx.save();
    ctx.translate(p.x, p.y);

    let color = '#22c55e';
    let icon = '❤️';
    if (pu.type === 'shield') {
        color = '#38bdf8';
        icon = '🛡️';
    } else if (pu.type === 'spread') {
        color = '#f59e0b';
        icon = '⚡';
    } else if (pu.type === 'turbo') {
        color = '#10b981';
        icon = '🚀';
    }

    // Aura pulsante de energía
    const pulse = Math.sin(Date.now() * 0.009) * 0.18 + 0.95;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.8, 2.6 * p.scale);
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(8, 14 * p.scale);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.arc(0, 0, size * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Anillo orbital exterior brillante
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, (size + 4 * p.scale) * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.shadowBlur = 0;
    ctx.font = `${Math.max(9, Math.floor(size * 1.15))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, 0);

    ctx.restore();
}

// 8. RENDERIZADO DE LÁSERES RADIANTES
function renderLasers() {
    // Láseres del Halcón
    lasers.forEach(l => {
        const boltLen = Math.min(52, l.speed * 0.048);
        const p1 = project3D(l.x, l.y, l.z);
        const p2 = project3D(
            l.x + (l.vx / l.speed) * boltLen,
            l.y + (l.vy / l.speed) * boltLen,
            l.z + boltLen
        );

        if (p1 && p2) {
            const laserColor = Player.spreadTimer > 0 ? '#38bdf8' : '#ef4444';
            ctx.save();
            ctx.strokeStyle = laserColor;
            ctx.lineWidth = Math.max(2.2, 4.5 * p1.scale);
            ctx.shadowColor = laserColor;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // Núcleo blanco brillante de plasma
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1.2, 2.0 * p1.scale);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // Cabeza frontal luminosa
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(p2.x, p2.y, Math.max(1.5, 2.6 * p2.scale), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    });

    // Láseres verdes de los Cazas TIE
    enemyLasers.forEach(el => {
        const vz = el.vz || el.speed;
        const boltLen = Math.min(48, vz * 0.045);
        const p1 = project3D(el.x, el.y, el.z);
        const p2 = project3D(
            el.x - (el.vx / vz) * boltLen,
            el.y - (el.vy / vz) * boltLen,
            el.z + boltLen
        );

        if (p1 && p2) {
            ctx.save();
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = Math.max(2.2, 4.2 * p1.scale);
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            ctx.strokeStyle = '#eaffea';
            ctx.lineWidth = Math.max(1, 1.8 * p1.scale);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // Cabeza frontal luminosa del proyectil avanzando hacia el Halcón
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#4ade80';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, Math.max(1.8, 3.2 * p1.scale), 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    });
}

// 9. RENDERIZADO DE PARTÍCULAS, HUMO, ONDAS DE CHOQUE Y POLVO
function renderParticles() {
    particles.forEach(pt => {
        const p = project3D(pt.x, pt.y, pt.z);
        if (p) {
            if (pt.type === 'shockwave') {
                const r = pt.radius * p.scale;
                ctx.save();
                ctx.strokeStyle = pt.color;
                ctx.lineWidth = Math.max(1.5, 3 * p.scale);
                ctx.globalAlpha = Math.max(0.1, pt.life / pt.maxLife);
                ctx.shadowColor = pt.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else {
                ctx.fillStyle = pt.color;
                ctx.globalAlpha = Math.max(0.1, pt.life / pt.maxLife);
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(1.2, pt.size * p.scale), 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
        }
    });

    dustPuffs.forEach(dp => {
        ctx.fillStyle = 'rgba(254, 215, 170, 0.4)';
        ctx.globalAlpha = Math.max(0.05, dp.life / dp.maxLife);
        ctx.beginPath();
        ctx.arc(dp.x, dp.y, dp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    floatingScores.forEach(fs => {
        ctx.fillStyle = fs.color;
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(fs.text, fs.x, fs.y);
        ctx.shadowBlur = 0;
    });
}

// ==============================================================================
// LÓGICA DE ACTUALIZACIÓN DEL JUEGO (UPDATE)
// ==============================================================================

// Obtener la posición EXACTA en pantalla de cualquier punto local del Halcón
function getShipScreenPos(localX, localY) {
    const cx = (CANVAS_WIDTH / 2) + Player.x;
    const cy = (CANVAS_HEIGHT * 0.77) + Player.y;
    const cosR = Math.cos(Player.roll);
    const sinR = Math.sin(Player.roll);
    return {
        x: cx + (localX * cosR - localY * sinR),
        y: cy + (localX * sinR + localY * cosR)
    };
}

// Convertir coordenadas de pantalla (sx, sy) a coordenadas de mundo 3D a profundidad z
function screenToWorld(sx, sy, z) {
    const scale = FOV / z;
    return {
        x: (sx - CANVAS_WIDTH / 2) / scale,
        y: (sy - HORIZON_Y) / scale
    };
}

function fireFalconLasers() {
    audio.playLaser();
    Player.recoil = 0.08;
    Player.muzzleFlash = 0.07;

    const startZ = 45;
    const targetZ = 850;
    const speed = 1100;
    const flightTime = (targetZ - startZ) / speed;

    const crosshairX = CANVAS_WIDTH / 2 + Player.x * 0.45;
    const crosshairY = HORIZON_Y + Player.y * 0.35;

    // Puntos de salida de los cañones del Halcón Milenario
    let cannonPoints = [];
    if (Player.spreadTimer > 0) {
        // Disparo cuádruple: mandíbulas exteriores + torreta central
        cannonPoints = [
            { lx: -18, ly: -42, spreadAngle: -35 },
            { lx: -2.75, ly: -20, spreadAngle: -10 },
            { lx: 2.75, ly: -20, spreadAngle: 10 },
            { lx: 18, ly: -42, spreadAngle: 35 }
        ];
    } else {
        // Disparo dual estándar: Cañones gemelos de la torreta central
        cannonPoints = [
            { lx: -2.75, ly: -20, spreadAngle: 0 },
            { lx: 2.75, ly: -20, spreadAngle: 0 }
        ];
    }

    cannonPoints.forEach(cp => {
        // 1. Posición exacta del cañón en pantalla
        const screenPos = getShipScreenPos(cp.lx, cp.ly);
        // 2. Proyección inversa a 3D a profundidad startZ
        const startWorld = screenToWorld(screenPos.x, screenPos.y, startZ);
        // 3. Proyección del objetivo (retícula de mira) a profundidad targetZ
        const targetWorld = screenToWorld(crosshairX + cp.spreadAngle, crosshairY, targetZ);

        lasers.push({
            x: startWorld.x,
            y: startWorld.y,
            z: startZ,
            vx: (targetWorld.x - startWorld.x) / flightTime,
            vy: (targetWorld.y - startWorld.y) / flightTime,
            speed: speed
        });
    });
}

function update(dt) {
    if (!GameState.running || GameState.gameOver) return;

    if (GameState.boost) {
        GameState.boostTimer -= dt;
        if (GameState.boostTimer <= 0) {
            GameState.boost = false;
        }
    }
    const currentSpeed = GameState.boost ? GameState.speed * 2.3 : GameState.speed;
    audio.updateEngineSound(currentSpeed, GameState.boost);

    const moveSpeedX = 205 * dt;
    const moveSpeedY = 185 * dt;
    let dx = 0;
    let dy = 0;

    if (Keys.left) dx -= 1;
    if (Keys.right) dx += 1;
    if (Keys.up) dy -= 1;
    if (Keys.down) dy += 1;

    if (Player.vx !== 0) dx = Player.vx;
    if (Player.vy !== 0) dy = Player.vy;

    Player.x += dx * moveSpeedX;
    Player.y += dy * moveSpeedY;

    // Límites de pantalla:
    // X: de -140 a +140
    // Y: de -110 (alta altitud cerca del horizonte) a +48 (rasante sobre el suelo)
    Player.x = Math.max(-140, Math.min(140, Player.x));
    Player.y = Math.max(-110, Math.min(48, Player.y));

    // Inclinación lateral (Roll / Banking)
    Player.targetRoll = dx * 0.40;
    Player.roll += (Player.targetRoll - Player.roll) * 12 * dt;

    // Cabeceo vertical (Pitch / Ascenso y Descenso)
    Player.targetPitch = dy * 0.24;
    Player.pitch += (Player.targetPitch - Player.pitch) * 10 * dt;

    if (Player.invulnerableTime > 0) Player.invulnerableTime -= dt;
    if (Player.shieldFlash > 0) Player.shieldFlash -= dt;
    if (Player.spreadTimer > 0) Player.spreadTimer -= dt;
    if (Player.recoil > 0) Player.recoil -= dt;
    if (Player.muzzleFlash > 0) Player.muzzleFlash -= dt;

    Player.fireCooldown -= dt;
    if ((Keys.fire || Player.isFiring) && Player.fireCooldown <= 0) {
        fireFalconLasers();
        Player.fireCooldown = Player.fireRate;
    }

    stars.forEach(s => {
        s.z -= currentSpeed * dt;
        if (s.z <= 12) {
            s.z = 850;
            s.x = (Math.random() - 0.5) * 640;
            s.y = (Math.random() - 0.5) * 480;
        }
    });

    if (GameState.stage === 1) {
        groundPebbles.forEach(gp => {
            gp.z -= currentSpeed * dt;
            if (gp.z <= 12) {
                gp.z = 850;
                gp.x = (Math.random() - 0.5) * 460;
            }
        });
        ambientDust.forEach(ad => {
            ad.x += ad.speedX * dt;
            ad.y += ad.speedY * dt;
            if (ad.x < -10) ad.x = CANVAS_WIDTH + 10;
            if (ad.y < HORIZON_Y) ad.y = CANVAS_HEIGHT;
            if (ad.y > CANVAS_HEIGHT + 10) ad.y = HORIZON_Y;
        });
    }

    // Actualizar láseres del Halcón
    for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.z += l.speed * dt;
        l.x += l.vx * dt;
        l.y += l.vy * dt;

        let hit = false;
        // Impacto contra Cazas TIE (Chequeo 3D y en pantalla)
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (Math.abs(l.z - e.z) < 65) {
                const distXY = Math.hypot(l.x - e.x, l.y - e.y);
                const pl = project3D(l.x, l.y, l.z);
                const pe = project3D(e.x, e.y, e.z);
                const screenDist = (pl && pe) ? Math.hypot(pl.x - pe.x, pl.y - pe.y) : 999;

                if (distXY < 35 || screenDist < Math.max(16, 32 * (pe?.scale || 1))) {
                    hit = true;
                    e.hp--;
                    if (e.hp <= 0) {
                        const pts = 250;
                        GameState.score += pts;
                        GameState.kills++;
                        killsCountElement.textContent = String(GameState.kills).padStart(2, '0');
                        scoreElement.textContent = `SCORE: ${String(GameState.score).padStart(6, '0')}`;
                        addFloatingScore(`+${pts}`, (CANVAS_WIDTH / 2) + e.x * (FOV / e.z), HORIZON_Y + e.y * (FOV / e.z));
                        createExplosion(e.x, e.y, e.z, 30, true);

                        if (Math.random() < 0.45) {
                            if (GameState.shields < GameState.maxShields && Math.random() < 0.75) {
                                spawnLifeCapsule(e.x, e.y, e.z);
                            } else {
                                spawnPowerup(e.x, e.y, e.z);
                            }
                        }
                        enemies.splice(j, 1);
                    } else {
                        createExplosion(e.x, e.y, e.z, 8, false);
                    }
                    break;
                }
            }
        }

        // Impacto contra asteroides
        if (!hit) {
            for (let k = obstacles.length - 1; k >= 0; k--) {
                const o = obstacles[k];
                if (Math.abs(l.z - o.z) < 70) {
                    const distXY = Math.hypot(l.x - o.x, l.y - o.y);
                    const pl = project3D(l.x, l.y, l.z);
                    const po = project3D(o.x, o.y, o.z);
                    const screenDist = (pl && po) ? Math.hypot(pl.x - po.x, pl.y - po.y) : 999;

                    if (distXY < o.radius + 8 || screenDist < (o.radius * (po?.scale || 1) + 8)) {
                        hit = true;
                        o.hp--;
                        if (o.hp <= 0) {
                            GameState.score += 100;
                            scoreElement.textContent = `SCORE: ${String(GameState.score).padStart(6, '0')}`;
                            addFloatingScore('+100', (CANVAS_WIDTH / 2) + o.x * (FOV / o.z), HORIZON_Y + o.y * (FOV / o.z));
                            createExplosion(o.x, o.y, o.z, 20, false);
                            if (Math.random() < 0.35) {
                                spawnLifeCapsule(o.x, o.y, o.z);
                            }
                            obstacles.splice(k, 1);
                        } else {
                            createExplosion(l.x, l.y, l.z, 6, false);
                        }
                        break;
                    }
                }
            }
        }

        // Impacto contra el Jefe de Nivel
        if (!hit && currentBoss && currentBoss.z <= 700) {
            const b = currentBoss;
            if (Math.abs(l.z - b.z) < 70) {
                const distXY = Math.hypot(l.x - b.x, l.y - b.y);
                const pl = project3D(l.x, l.y, l.z);
                const pb = project3D(b.x, b.y, b.z);
                const screenDist = (pl && pb) ? Math.hypot(pl.x - pb.x, pl.y - pb.y) : 999;
                const bossHitR = (b.type === 'tie_advanced' ? 38 : (b.type === 'death_star_core' ? 56 : 42)) * (pb?.scale || 1) + 14;

                if (distXY < 48 || screenDist < bossHitR) {
                    hit = true;
                    b.hp--;
                    b.hitFlash = 0.15;
                    createExplosion(l.x, l.y, l.z, 14, false);
                    audio.playShieldHit();
                    if (b.hp <= 0) {
                        defeatBoss();
                    }
                }
            }
        }

        // Impacto contra torpedos / misiles del Jefe
        if (!hit && bossProjectiles.length > 0) {
            for (let pIdx = bossProjectiles.length - 1; pIdx >= 0; pIdx--) {
                const bp = bossProjectiles[pIdx];
                if (Math.abs(l.z - bp.z) < 55) {
                    const distXY = Math.hypot(l.x - bp.x, l.y - bp.y);
                    const pl = project3D(l.x, l.y, l.z);
                    const pbp = project3D(bp.x, bp.y, bp.z);
                    const screenDist = (pl && pbp) ? Math.hypot(pl.x - pbp.x, pl.y - pbp.y) : 999;

                    if (distXY < 28 || screenDist < (bp.radius * (pbp?.scale || 1) + 12)) {
                        hit = true;
                        GameState.score += 75;
                        scoreElement.textContent = `SCORE: ${String(GameState.score).padStart(6, '0')}`;
                        createExplosion(bp.x, bp.y, bp.z, 18, false);
                        bossProjectiles.splice(pIdx, 1);
                        break;
                    }
                }
            }
        }

        if (hit || l.z > 960) {
            lasers.splice(i, 1);
        }
    }

    // Actualizar Cazas TIE (solo aparecen si no hay un jefe activo ni en advertencia)
    if (!currentBoss && bossWarningTimer <= 0) {
        enemySpawnTimer -= dt;
        if (enemySpawnTimer <= 0) {
            spawnEnemy();
            enemySpawnTimer = Math.max(0.85, 2.0 - (GameState.kills * 0.03));
        }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.z -= (e.speed + currentSpeed * 0.4) * dt;
        e.swayAngle += e.swaySpeed * dt;
        e.x += Math.sin(e.swayAngle) * 48 * dt;
        e.roll = Math.cos(e.swayAngle) * 0.25; // Inclinación suave al maniobrar

        if (e.muzzleFlash > 0) e.muzzleFlash -= dt;

        // Disparo de Cazas TIE: proyectiles dirigidos directamente contra el Halcón Milenario
        e.shootCooldown -= dt;
        if (e.shootCooldown <= 0 && e.z > 140 && e.z < 680) {
            audio.playTieLaser();
            e.muzzleFlash = 0.10;

            const targetZ = 45; // Profundidad 3D en la que se encuentra el Halcón Milenario
            const laserSpeedZ = 440 + currentSpeed * 0.25;
            const flightTime = (e.z - targetZ) / laserSpeedZ;

            // Obtener la posición del Halcón y proyectar al mundo 3D en targetZ
            const falconScreen = getShipScreenPos(0, 0);
            const targetWorld = screenToWorld(falconScreen.x, falconScreen.y, targetZ);

            // Disparo gemelo auténtico desde los dos cañones inferiores del Caza TIE
            [-2.2, 2.2].forEach(cannonOffsetX => {
                const startX = e.x + cannonOffsetX;
                const startY = e.y + 4.5;
                const destX = targetWorld.x + (cannonOffsetX * 0.25);
                const destY = targetWorld.y;

                enemyLasers.push({
                    x: startX,
                    y: startY,
                    z: e.z,
                    vx: (destX - startX) / flightTime,
                    vy: (destY - startY) / flightTime,
                    vz: laserSpeedZ,
                    speed: laserSpeedZ
                });
            });

            e.shootCooldown = Math.random() * 1.8 + 1.1;
        }

        // Los cazas enemigos simplemente sobrevuelan y pasan de largo sin infligir daño por choque corporal
        if (e.z < -20) {
            enemies.splice(i, 1);
        }
    }

    // Actualizar disparos enemigos
    const falconScreenPos = getShipScreenPos(0, 0);

    for (let i = enemyLasers.length - 1; i >= 0; i--) {
        const el = enemyLasers[i];
        const vz = el.vz || el.speed;
        el.z -= vz * dt;
        el.x += el.vx * dt;
        el.y += el.vy * dt;

        // Comprobar colisión cuando el disparo cruza el plano de vuelo del Halcón
        if (el.z <= 65 && el.z >= 20) {
            const pl = project3D(el.x, el.y, el.z);
            if (pl) {
                const dx = pl.x - falconScreenPos.x;
                const dy = (pl.y - falconScreenPos.y) * 1.45;
                const distScreen = Math.hypot(dx, dy);

                // El Halcón ocupa aproximadamente 38px de radio en pantalla
                if (distScreen < 38) {
                    damagePlayer(0.35); // Daño moderado para que no cause tanto daño
                    createExplosion(el.x, el.y, el.z, 16, false);
                    enemyLasers.splice(i, 1);
                    continue;
                }
            }
        }

        // Eliminar disparos que ya rebasaron la cámara
        if (el.z < 15) {
            enemyLasers.splice(i, 1);
        }
    }

    // Actualizar obstáculos
    obstacleSpawnTimer -= dt;
    if (obstacleSpawnTimer <= 0) {
        spawnObstacle();
        obstacleSpawnTimer = Math.max(1.0, 2.4 - (GameState.kills * 0.035));
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.z -= (o.speed + currentSpeed * 0.5) * dt;
        o.rot += o.rotSpeed * dt;

        if (o.z <= 65 && o.z >= 20) {
            const po = project3D(o.x, o.y, o.z);
            if (po) {
                const dx = po.x - falconScreenPos.x;
                const dy = (po.y - falconScreenPos.y) * 1.35;
                const distScreen = Math.hypot(dx, dy);
                const hitRadius = (o.radius * po.scale) + 26;

                if (distScreen < hitRadius) {
                    damagePlayer(0.65);
                    createExplosion(o.x, o.y, o.z, 25, true);
                    obstacles.splice(i, 1);
                    continue;
                }
            }
        }

        if (o.z < -20) {
            obstacles.splice(i, 1);
        }
    }

    // Actualizar power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
        const pu = powerups[i];
        pu.z -= (pu.speed + currentSpeed * 0.4) * dt;

        if (pu.z <= 65 && pu.z >= 20) {
            const ppu = project3D(pu.x, pu.y, pu.z);
            if (ppu) {
                const dx = ppu.x - falconScreenPos.x;
                const dy = (ppu.y - falconScreenPos.y) * 1.35;
                if (Math.hypot(dx, dy) < 45) {
                    applyPowerup(pu.type);
                    powerups.splice(i, 1);
                    continue;
                }
            }
        }

        if (pu.z < -20) {
            powerups.splice(i, 1);
        }
    }

    // Actualizar fragmentos de paneles TIE
    for (let i = wingDebris.length - 1; i >= 0; i--) {
        const wd = wingDebris[i];
        wd.life -= dt;
        wd.x += wd.vx * dt;
        wd.y += wd.vy * dt;
        wd.z += wd.vz * dt;
        wd.rot += wd.rotSpeed * dt;
        if (wd.life <= 0) wingDebris.splice(i, 1);
    }

    // Actualizar partículas
    for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.life -= dt;
        if (pt.type === 'shockwave') {
            pt.radius += (pt.maxRadius - pt.radius) * 10 * dt;
        } else {
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.z += pt.vz * dt;
        }
        if (pt.life <= 0) particles.splice(i, 1);
    }

    // Actualizar polvo
    for (let i = dustPuffs.length - 1; i >= 0; i--) {
        const dp = dustPuffs[i];
        dp.life -= dt;
        dp.x += dp.vx * dt;
        dp.y += dp.vy * dt;
        dp.size += dt * 8;
        if (dp.life <= 0) dustPuffs.splice(i, 1);
    }

    // Puntos flotantes
    for (let i = floatingScores.length - 1; i >= 0; i--) {
        const fs = floatingScores[i];
        fs.life -= dt;
        fs.y -= 26 * dt;
        if (fs.life <= 0) floatingScores.splice(i, 1);
    }

    if (GameState.screenShake > 0) {
        GameState.screenShake -= dt * 18;
        if (GameState.screenShake < 0) GameState.screenShake = 0;
    }

    // Gestión del temporizador de advertencia de jefe
    if (bossWarningTimer > 0) {
        bossWarningTimer -= dt;
        if (bossWarningTimer <= 0) {
            bossWarningTimer = 0;
            if (GameState.stage === 1) {
                spawnBoss('tie_bomber');
            } else if (GameState.stage === 2) {
                spawnBoss('tie_advanced');
            } else if (GameState.stage === 3) {
                spawnBoss('death_star_core');
            }
        }
    }

    // Comprobación de activación de jefes al final de cada nivel
    if (!currentBoss && bossWarningTimer <= 0) {
        if (GameState.stage === 1 && GameState.kills >= 12) {
            triggerBossWarning('tie_bomber');
        } else if (GameState.stage === 2 && GameState.kills >= 26) {
            triggerBossWarning('tie_advanced');
        } else if (GameState.stage === 3 && GameState.kills >= 42) {
            triggerBossWarning('death_star_core');
        }
    }

    // Actualizar Jefe de Nivel y sus proyectiles
    if (currentBoss) {
        updateBoss(dt);
    }
    updateBossProjectiles(dt);

    // Cápsulas periódicas de vida y recuperación en cada nivel
    lifeSpawnTimer -= dt;
    if (lifeSpawnTimer <= 0) {
        spawnLifeCapsule();
        // Cada 12 a 15 segundos aparece una nueva cápsula de recuperación
        lifeSpawnTimer = Math.random() * 3 + 12;
    }

    GameState.stageProgress += dt;
}

function applyPowerup(type) {
    audio.playPowerup();
    if (type === 'shield' || type === 'life') {
        if (GameState.shields < GameState.maxShields) {
            GameState.shields = Math.min(GameState.maxShields, GameState.shields + 1.0);
            shieldsCountElement.textContent = Math.ceil(GameState.shields);
            addFloatingScore('+1 VIDA', CANVAS_WIDTH / 2, 80, '#22c55e');
        } else {
            GameState.score += 400;
            scoreElement.textContent = `SCORE: ${String(GameState.score).padStart(6, '0')}`;
            addFloatingScore('+400 PTS (MAX)', CANVAS_WIDTH / 2, 80, '#facc15');
        }
    } else if (type === 'spread') {
        Player.spreadTimer = 10;
        addFloatingScore('QUAD LASER!', CANVAS_WIDTH / 2, 80, '#38bdf8');
    } else if (type === 'turbo') {
        GameState.boost = true;
        GameState.boostTimer = 6;
        Player.invulnerableTime = 6;
        addFloatingScore('HYPERDRIVE!', CANVAS_WIDTH / 2, 80, '#10b981');
    }
}

function damagePlayer(amount = 0.35) {
    if (Player.invulnerableTime > 0 || GameState.boost) return;

    audio.playShieldHit();
    GameState.shields = Math.max(0, GameState.shields - amount);
    shieldsCountElement.textContent = Math.ceil(GameState.shields);
    Player.shieldFlash = 0.45;
    Player.invulnerableTime = 1.35;
    GameState.screenShake = 9;

    if (GameState.shields <= 0) {
        triggerGameOver();
    }
}

function triggerGameOver() {
    if (GameState.gameOver) return;
    GameState.gameOver = true;
    GameState.running = false;
    const falconScreen = getShipScreenPos(0, 0);
    const falconWorld = screenToWorld(falconScreen.x, falconScreen.y, 45);
    createExplosion(falconWorld.x, falconWorld.y, 45, 50, true);

    if (GameState.score > GameState.highScore) {
        GameState.highScore = GameState.score;
        highScoreElement.textContent = `HI: ${String(GameState.highScore).padStart(6, '0')}`;
        localStorage.setItem('starwars_highscore', GameState.highScore);
    }

    dataChannels.forEach(dc => {
        try {
            dc.send(JSON.stringify({ type: 'game_over', score: GameState.score }));
        } catch (_) {}
    });

    submitScore(GameState.currentNickname, GameState.score);

    gameOverTitle.textContent = 'MISIÓN FALLIDA';
    gameOverSubtitle.textContent = `PUNTUACIÓN FINAL: ${GameState.score}`;
    gameOverOverlay.classList.remove('hidden');

    if (gameOverTimeout) clearTimeout(gameOverTimeout);
    gameOverTimeout = setTimeout(() => {
        // Solo restaurar la sala si la partida no se ha reanudado
        if (GameState.gameOver && !GameState.running) {
            resetSignalingAndRoom();
        }
    }, 15000);
}

// ==============================================================================
// BUCLE PRINCIPAL DE JUEGO (GAME LOOP)
// ==============================================================================

function gameLoop(time) {
    if (!GameState.lastTime) GameState.lastTime = time;
    const dt = Math.min((time - GameState.lastTime) / 1000, 0.1);
    GameState.lastTime = time;

    update(dt);

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    if (GameState.screenShake > 0) {
        const sx = (Math.random() - 0.5) * GameState.screenShake;
        const sy = (Math.random() - 0.5) * GameState.screenShake;
        ctx.translate(sx, sy);
    }

    // 1. Fondo planetario & estrellas
    renderEnvironment(dt);

    // 2. Obstáculos y Cazas TIE ordenados por profundidad Z
    renderObstaclesAndEnemies();

    // 3. Paneles TIE destruidos que giran
    renderWingDebris();

    // 4. Rayos láser
    renderLasers();

    // 5. Power-ups
    renderPowerups();

    // 6. El Halcón Milenario
    if (GameState.running && !GameState.gameOver) {
        renderMillenniumFalcon(dt);
    }

    // 7. Efectos de partículas, shockwaves y polvo
    renderParticles();

    // 8. HUD Super Star Wars con Sable de Luz y Barra de Jefe
    if (GameState.running && !GameState.gameOver) {
        renderSuperStarWarsHUD();
        renderBossHUD();
    }

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

function renderObstaclesAndEnemies() {
    const list = [];
    enemies.forEach(e => list.push({ type: 'enemy', z: e.z, obj: e }));
    obstacles.forEach(o => list.push({ type: 'obstacle', z: o.z, obj: o }));
    if (currentBoss) list.push({ type: 'boss', z: currentBoss.z, obj: currentBoss });
    bossProjectiles.forEach(bp => list.push({ type: 'boss_projectile', z: bp.z, obj: bp }));

    list.sort((a, b) => b.z - a.z); // Pintor 3D: lejanos primero
    list.forEach(item => {
        if (item.type === 'enemy') renderTIEFighter(item.obj);
        else if (item.type === 'obstacle') renderObstacle(item.obj);
        else if (item.type === 'boss') renderBoss(item.obj);
        else if (item.type === 'boss_projectile') renderBossProjectile(item.obj);
    });
}

function renderPowerups() {
    powerups.forEach(pu => renderPowerup(pu));
}

function startNewGame(fromController = false) {
    if (gameOverTimeout) {
        clearTimeout(gameOverTimeout);
        gameOverTimeout = null;
    }
    GameState.running = true;
    GameState.gameOver = false;
    GameState.isMobileSession = !!fromController;
    GameState.score = 0;
    GameState.shields = GameState.maxShields;
    GameState.kills = 0;
    GameState.stage = 1;
    GameState.stageProgress = 0;
    GameState.boost = false;

    currentBoss = null;
    bossWarningTimer = 0;
    bossWarningText = '';
    bossProjectiles = [];
    GameState.victory = false;
    gameOverTitle.style.color = '';

    Player.x = 0;
    Player.y = 0;
    Player.vx = 0;
    Player.vy = 0;
    Player.roll = 0;
    Player.targetRoll = 0;
    Player.pitch = 0;
    Player.targetPitch = 0;
    Player.invulnerableTime = 2.0;
    Player.spreadTimer = 0;

    lasers = [];
    enemyLasers = [];
    enemies = [];
    obstacles = [];
    powerups = [];
    particles = [];
    wingDebris = [];
    dustPuffs = [];
    floatingScores = [];

    scoreElement.textContent = 'SCORE: 000000';
    shieldsCountElement.textContent = GameState.shields;
    killsCountElement.textContent = '00';
    playerNickElement.textContent = `PILOT: ${GameState.currentNickname}`;

    waitingOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');

    initCanyonRocks();
    lifeSpawnTimer = 7;
    spawnLifeCapsule(0, -10, 780); // Cápsula de vida inicial en nivel 1
    audio.init();
    audio.playIntroFanfare();
}

// ==============================================================================
// CONTROLES DE TECLADO (PRE-PUSH OBLIGATORIO)
// ==============================================================================

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 's', 'a', 'd', ' ', 'enter'].includes(key) || e.code === 'Space') {
        e.preventDefault();
    }
    if (audio.init) audio.init();

    if (key === 'arrowleft' || key === 'a') Keys.left = true;
    if (key === 'arrowright' || key === 'd') Keys.right = true;
    if (key === 'arrowup' || key === 'w') Keys.up = true;
    if (key === 'arrowdown' || key === 's') Keys.down = true;

    if (e.code === 'Space' || key === 'enter') {
        Keys.fire = true;
        if (!GameState.running || GameState.gameOver) {
            startNewGame();
        }
    }

    if (key === 'shift' || key === 'x') {
        Keys.boost = true;
        if (GameState.running && !GameState.gameOver && !GameState.boost) {
            applyPowerup('turbo');
        }
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') Keys.left = false;
    if (key === 'arrowright' || key === 'd') Keys.right = false;
    if (key === 'arrowup' || key === 'w') Keys.up = false;
    if (key === 'arrowdown' || key === 's') Keys.down = false;
    if (e.code === 'Space' || key === 'enter') Keys.fire = false;
    if (key === 'shift' || key === 'x') Keys.boost = false;
});

if (mainScreen) {
    mainScreen.addEventListener('click', () => {
        if (audio.init) audio.init();
        if (!GameState.running || GameState.gameOver) {
            startNewGame();
        }
    });
}

const audioBtn = document.getElementById('audio-toggle-btn');
if (audioBtn) {
    audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.init();
        if (audio.ctx) {
            if (audio.ctx.state === 'running') {
                audio.ctx.suspend().then(() => audio.updateUI());
            } else {
                audio.ctx.resume().then(() => audio.updateUI());
            }
        }
    });
}

// ==============================================================================
// WEBRTC Y SEÑALIZACIÓN (HOST SCREEN)
// ==============================================================================

let socket = null;
const peerConnections = new Map();
const dataChannels = new Map();

function updateQrCode() {
    if (!qrContainer) return;
    qrContainer.innerHTML = '';
    const controlUrl = `${CONFIG.CONTROL_URL}/?room=${GameState.roomId}`;
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
            text: controlUrl,
            width: 160,
            height: 160,
            colorDark: "#020617",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });
    }
    if (roomIdElement) roomIdElement.textContent = `ID: ${GameState.roomId}`;
}

function initSignaling() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${CONFIG.SIGNALING_SERVER_URL || 'signaling.myplayad.com'}:443`;

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            socket.send(JSON.stringify({
                type: 'register',
                role: 'host',
                roomId: GameState.roomId,
                maxPlayers: 1
            }));
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
                            try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (_) {}
                        } else if (pc._pendingCandidates) {
                            pc._pendingCandidates.push(data.candidate);
                        }
                    }
                } else if (data.type === 'controller_disconnected') {
                    handleControllerDisconnect(data.playerId);
                }
            } catch (err) {
                console.error('Error procesando socket:', err);
            }
        };

        socket.onclose = () => {
            setTimeout(initSignaling, 3000);
        };
    } catch (e) {
        console.warn('Fallo WebSocket signaling:', e);
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
        if (e.candidate && socket?.readyState === WebSocket.OPEN) {
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
        try { await pc.addIceCandidate(new RTCIceCandidate(pc._pendingCandidates.shift())); } catch (_) {}
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
        GameState.isMobileSession = true;
        waitingOverlay.classList.add('hidden');
    };

    channel.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'join' || msg.type === 'nickname') {
                GameState.currentNickname = (msg.nickname || msg.value || 'PILOT').toUpperCase().substring(0, 10);
                if (playerNickElement) playerNickElement.textContent = `PILOT: ${GameState.currentNickname}`;
                startNewGame(true);
            } else if (msg.type === 'move' || msg.type === 'joystick') {
                Player.vx = (msg.x || 0);
                Player.vy = (msg.y || 0);
            } else if (msg.type === 'control') {
                if (msg.cmd === 'left') Player.vx = msg.val ? -1 : 0;
                if (msg.cmd === 'right') Player.vx = msg.val ? 1 : 0;
                if (msg.cmd === 'up') Player.vy = msg.val ? -1 : 0;
                if (msg.cmd === 'down') Player.vy = msg.val ? 1 : 0;
                if (msg.cmd === 'fire') Player.isFiring = !!msg.val;
                if (msg.cmd === 'boost') applyPowerup('turbo');
            } else if (msg.type === 'fire') {
                Player.isFiring = !!msg.active;
            } else if (msg.type === 'boost') {
                if (GameState.running && !GameState.gameOver && !GameState.boost) {
                    applyPowerup('turbo');
                }
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

    // Solo si la sesión era estrictamente con mando móvil y ya no queda ningún móvil conectado
    if (GameState.isMobileSession && peerConnections.size === 0 && !GameState.gameOver && GameState.running) {
        waitingOverlay.classList.remove('hidden');
        GameState.running = false;
    }
}

function resetSignalingAndRoom() {
    // Si la partida está activa, ¡NUNCA interrumpirla ni mostrar el código QR!
    if (GameState.running && !GameState.gameOver) {
        return;
    }
    GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    updateQrCode();
    if (!GameState.running) {
        waitingOverlay.classList.remove('hidden');
    }
    gameOverOverlay.classList.add('hidden');
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'register',
            role: 'host',
            roomId: GameState.roomId,
            maxPlayers: 1
        }));
    }
}

function submitScore(nickname, score) {
    let scores = JSON.parse(localStorage.getItem('starwars_scores') || '[]');
    scores.push({ name: nickname, score: score, date: new Date().toLocaleDateString() });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 5);
    localStorage.setItem('starwars_scores', JSON.stringify(scores));
    renderRanking(scores);
}

function renderRanking(scores) {
    if (!rankingList) return;
    rankingList.innerHTML = '';
    scores.forEach((s, idx) => {
        const li = document.createElement('li');
        li.textContent = `${idx + 1}. ${s.name.padEnd(8, ' ')} - ${String(s.score).padStart(6, '0')}`;
        rankingList.appendChild(li);
    });
}

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

// Arranque del juego
window.addEventListener('DOMContentLoaded', () => {
    initStars();
    initCanyonRocks();
    updateQrCode();
    autoScale();
    initSignaling();
    const savedHi = localStorage.getItem('starwars_highscore');
    if (savedHi) {
        GameState.highScore = parseInt(savedHi, 10);
        highScoreElement.textContent = `HI: ${String(GameState.highScore).padStart(6, '0')}`;
    }
    const scores = JSON.parse(localStorage.getItem('starwars_scores') || '[]');
    renderRanking(scores);
    requestAnimationFrame(gameLoop);
});

window.addEventListener('resize', autoScale);
window.addEventListener('load', () => { updateQrCode(); autoScale(); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(autoScale);
if (window.ResizeObserver) new ResizeObserver(() => autoScale()).observe(document.body);
[0, 50, 150, 300, 600, 1200].forEach(d => setTimeout(autoScale, d));
