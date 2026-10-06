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
    shields: 4,
    maxShields: 4,
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
    lockedTarget: null
};

let gameOverTimeout = null;

// Jugador: El Halcón Milenario (YT-1300)
const Player = {
    x: 0,          // -140 a +140
    y: 35,         // -55 a +65
    vx: 0,
    vy: 0,
    roll: 0,       // Inclinación lateral (banking)
    targetRoll: 0,
    pitch: 0,
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
let canyonRocks = [];   // Rocas y monolitos gigantes del cañón a los lados

// Inicializar estrellas del espacio profundo
function initStars() {
    stars = [];
    for (let i = 0; i < 120; i++) {
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
    for (let i = 0; i < 10; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        canyonRocks.push({
            x: side * (180 + Math.random() * 120),
            y: 35 + Math.random() * 20,
            z: (i * 90) + 100,
            width: 35 + Math.random() * 25,
            height: 90 + Math.random() * 40,
            side: side
        });
    }
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

function spawnPowerup(x, y, z) {
    const types = ['shield', 'spread', 'turbo'];
    const type = types[Math.floor(Math.random() * types.length)];
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

    // Texto de Escudos
    ctx.fillStyle = '#38bdf8';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SHIELDS: ${GameState.shields}`, saberX + hiltW + maxBladeW + 8, saberY + 6);

    // Marcador de Cazas TIE Destruidos
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'right';
    ctx.fillText(`TIEs: ${String(GameState.kills).padStart(2, '0')}`, CANVAS_WIDTH - 14, saberY + 6);
}

// 2. FONDO Y TERRENO PLANETARIO ESTILO MODE 7 CON MONOLITOS LATERALES
function renderEnvironment(dt) {
    GameState.worldScroll += (GameState.boost ? 560 : 270) * dt;

    if (GameState.stage === 1) {
        // --- ETAPA 1: DESIERTO Y CAÑÓN DE TATOOINE ---

        // 1. Cielo crepuscular con gradiente cálido multicapa
        const skyGrad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
        skyGrad.addColorStop(0, '#2d1b36');    // Violeta espacial
        skyGrad.addColorStop(0.45, '#6b2d42'); // Magenta terracota
        skyGrad.addColorStop(0.85, '#b45309'); // Ámbar dorado
        skyGrad.addColorStop(1, '#d97706');    // Naranja horizonte
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, HORIZON_Y);

        // 2. Soles gemelos de Tatooine
        ctx.save();
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#fef9c3';
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH * 0.65, HORIZON_Y - 48, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = '#ea580c';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH * 0.74, HORIZON_Y - 36, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 3. Mesetas montañosas del cañón en el fondo
        ctx.fillStyle = '#5c2429';
        ctx.beginPath();
        ctx.moveTo(0, HORIZON_Y);
        ctx.lineTo(0, HORIZON_Y - 15);
        ctx.lineTo(40, HORIZON_Y - 28);
        ctx.lineTo(85, HORIZON_Y - 18);
        ctx.lineTo(135, HORIZON_Y - 33);
        ctx.lineTo(185, HORIZON_Y - 21);
        ctx.lineTo(245, HORIZON_Y - 39);
        ctx.lineTo(315, HORIZON_Y - 23);
        ctx.lineTo(375, HORIZON_Y - 31);
        ctx.lineTo(CANVAS_WIDTH, HORIZON_Y - 16);
        ctx.lineTo(CANVAS_WIDTH, HORIZON_Y);
        ctx.closePath();
        ctx.fill();

        // 4. Sandcrawler de los Jawas en el horizonte
        const crawlerX = ((CANVAS_WIDTH * 0.42) - (Player.x * 0.08));
        const crawlerY = HORIZON_Y - 28;
        ctx.fillStyle = '#3a171b';
        ctx.beginPath();
        ctx.moveTo(crawlerX - 22, HORIZON_Y);
        ctx.lineTo(crawlerX - 22, crawlerY + 6);
        ctx.lineTo(crawlerX - 14, crawlerY);
        ctx.lineTo(crawlerX + 18, crawlerY);
        ctx.lineTo(crawlerX + 24, crawlerY + 12);
        ctx.lineTo(crawlerX + 26, HORIZON_Y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#200c0f';
        ctx.fillRect(crawlerX - 20, HORIZON_Y - 4, 44, 4);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(crawlerX - 12, crawlerY + 3, 6, 2);

        // 5. Suelo del desierto estilo Mode 7 con bandas de textura y perspectiva
        const groundH = CANVAS_HEIGHT - HORIZON_Y;
        const desertGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, CANVAS_HEIGHT);
        desertGrad.addColorStop(0, '#9a3412');
        desertGrad.addColorStop(0.35, '#c2410c');
        desertGrad.addColorStop(1, '#ea580c');
        ctx.fillStyle = desertGrad;
        ctx.fillRect(0, HORIZON_Y, CANVAS_WIDTH, groundH);

        // Bandas de textura pseudo Mode 7
        for (let i = 0; i < groundH; i += 3) {
            const stripe = Math.sin((i * 1.5) + (GameState.worldScroll * 0.12));
            if (stripe > 0.3) {
                ctx.fillStyle = 'rgba(254, 215, 170, 0.18)';
                ctx.fillRect(0, HORIZON_Y + i, CANVAS_WIDTH, 2);
            }
        }

        // Líneas de huella y perspectiva
        ctx.strokeStyle = 'rgba(124, 45, 18, 0.35)';
        ctx.lineWidth = 1.5;
        const centerOffset = -Player.x * 0.35;
        [-160, -90, -35, 35, 90, 160].forEach(lx => {
            ctx.beginPath();
            ctx.moveTo((CANVAS_WIDTH / 2) + centerOffset * 0.1, HORIZON_Y);
            ctx.lineTo((CANVAS_WIDTH / 2) + lx + centerOffset, CANVAS_HEIGHT);
            ctx.stroke();
        });

        // 6. Monolitos gigantes de roca a los lados del cañón que pasan a toda velocidad
        const currentSpeed = GameState.boost ? GameState.speed * 2.3 : GameState.speed;
        canyonRocks.forEach(r => {
            r.z -= currentSpeed * dt * 0.9;
            if (r.z <= 15) {
                r.z = 900;
                r.x = r.side * (180 + Math.random() * 120);
            }
            const p = project3D(r.x, r.y, r.z);
            if (p && p.scale > 0.1) {
                const rw = r.width * p.scale;
                const rh = r.height * p.scale;
                ctx.fillStyle = '#7c2d12';
                ctx.strokeStyle = '#431407';
                ctx.lineWidth = Math.max(1, 1.5 * p.scale);
                ctx.beginPath();
                ctx.moveTo(p.x - rw / 2, p.y);
                ctx.lineTo(p.x - rw * 0.3, p.y - rh);
                ctx.lineTo(p.x + rw * 0.3, p.y - rh);
                ctx.lineTo(p.x + rw / 2, p.y);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        });

    } else if (GameState.stage === 2) {
        // --- ETAPA 2: CAMPO DE ASTEROIDES & ESPACIO PROFUNDO ---
        ctx.fillStyle = '#020409';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const nebGrad = ctx.createRadialGradient(CANVAS_WIDTH * 0.35, HORIZON_Y * 0.7, 10, CANVAS_WIDTH * 0.35, HORIZON_Y * 0.7, 140);
        nebGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
        nebGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.14)');
        nebGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = nebGrad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Destructor Estelar
        const isdX = CANVAS_WIDTH * 0.72 - Player.x * 0.05;
        const isdY = HORIZON_Y - 35;
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(isdX, isdY);
        ctx.lineTo(isdX - 45, isdY + 18);
        ctx.lineTo(isdX + 45, isdY + 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillRect(isdX - 10, isdY + 8, 20, 6);

    } else {
        // --- ETAPA 3: TRINCHERA DE LA ESTRELLA DE LA MUERTE ---
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, CANVAS_WIDTH, HORIZON_Y);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, HORIZON_Y - 25, CANVAS_WIDTH, CANVAS_HEIGHT - HORIZON_Y + 25);

        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1;
        for (let x = 30; x < CANVAS_WIDTH; x += 38) {
            ctx.beginPath();
            ctx.moveTo(CANVAS_WIDTH / 2, HORIZON_Y);
            ctx.lineTo(x, CANVAS_HEIGHT);
            ctx.stroke();
        }
    }

    // Estrellas volando hacia el jugador
    stars.forEach(s => {
        const p = project3D(s.x, s.y, s.z);
        if (p) {
            ctx.fillStyle = s.color;
            if (GameState.boost) {
                const pPrev = project3D(s.x, s.y, s.z + 65);
                if (pPrev) {
                    ctx.strokeStyle = s.color;
                    ctx.lineWidth = Math.max(1, p.scale * 2.2);
                    ctx.beginPath();
                    ctx.moveTo(pPrev.x, pPrev.y);
                    ctx.lineTo(p.x, p.y);
                    ctx.stroke();
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

    // Sombra en el suelo
    if (GameState.stage === 1) {
        const shadowY = Math.min(CANVAS_HEIGHT - 12, cy + 38);
        const shadowScale = Math.max(0.6, 1 - (Player.y + 40) / 200);
        ctx.fillStyle = 'rgba(67, 20, 7, 0.45)';
        ctx.beginPath();
        ctx.ellipse(cx, shadowY, 46 * shadowScale, 14 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        Player.thrusterFlicker += dt * 30;
        if (Math.random() < 0.45) {
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

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Player.roll);

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

    // Motor subluz azul cyan
    const isBoost = GameState.boost;
    const engineGlowRadius = isBoost ? 20 : 10;
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
    for (let i = -28; i <= 28; i += 7) {
        const flameLen = (Math.sin(Player.thrusterFlicker + i) * 0.5 + 0.5) * (isBoost ? 18 : 8) + 5;
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
    enemies.forEach(e => {
        if (e.z > 100 && e.z < 650) {
            const p = project3D(e.x, e.y, e.z);
            if (p && Math.hypot(p.x - crosshairX, p.y - crosshairY) < 28) {
                targetLocked = true;
                GameState.lockedTarget = p;
            }
        }
    });

    const reticleColor = targetLocked ? '#ef4444' : 'rgba(56, 189, 248, 0.65)';
    ctx.strokeStyle = reticleColor;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(crosshairX, crosshairY, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(crosshairX - 20, crosshairY);
    ctx.lineTo(crosshairX - 5, crosshairY);
    ctx.moveTo(crosshairX + 5, crosshairY);
    ctx.lineTo(crosshairX + 20, crosshairY);
    ctx.moveTo(crosshairX, crosshairY - 20);
    ctx.lineTo(crosshairX, crosshairY - 5);
    ctx.moveTo(crosshairX, crosshairY + 5);
    ctx.lineTo(crosshairX, crosshairY + 20);
    ctx.stroke();

    if (targetLocked) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('[ LOCK ]', crosshairX, crosshairY - 22);
    }
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

// 7. RENDERIZADO DE POWER-UPS
function renderPowerup(pu) {
    const p = project3D(pu.x, pu.y, pu.z);
    if (!p) return;

    const size = Math.max(6, 17 * p.scale);
    ctx.save();
    ctx.translate(p.x, p.y);

    let color = '#38bdf8';
    let icon = '🛡️';
    if (pu.type === 'spread') {
        color = '#f59e0b';
        icon = '⚡';
    } else if (pu.type === 'turbo') {
        color = '#10b981';
        icon = '🚀';
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = `${Math.max(8, Math.floor(size * 1.15))}px sans-serif`;
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
        const boltLen = Math.min(46, el.speed * 0.045);
        const p1 = project3D(el.x, el.y, el.z);
        const p2 = project3D(
            el.x + (el.vx / el.speed) * boltLen,
            el.y + (el.vy / el.speed) * boltLen,
            el.z + boltLen
        );

        if (p1 && p2) {
            ctx.save();
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = Math.max(2, 3.8 * p1.scale);
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, 1.5 * p1.scale);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
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

    const moveSpeed = 195 * dt;
    let dx = 0;
    let dy = 0;

    if (Keys.left) dx -= 1;
    if (Keys.right) dx += 1;
    if (Keys.up) dy -= 1;
    if (Keys.down) dy += 1;

    if (Player.vx !== 0) dx = Player.vx;
    if (Player.vy !== 0) dy = Player.vy;

    Player.x += dx * moveSpeed;
    Player.y += dy * moveSpeed;

    Player.x = Math.max(-140, Math.min(140, Player.x));
    Player.y = Math.max(-50, Math.min(65, Player.y));

    Player.targetRoll = dx * 0.40;
    Player.roll += (Player.targetRoll - Player.roll) * 12 * dt;

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

                        if (Math.random() < 0.3) {
                            spawnPowerup(e.x, e.y, e.z);
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
                            obstacles.splice(k, 1);
                        } else {
                            createExplosion(l.x, l.y, l.z, 6, false);
                        }
                        break;
                    }
                }
            }
        }

        if (hit || l.z > 960) {
            lasers.splice(i, 1);
        }
    }

    // Actualizar Cazas TIE
    enemySpawnTimer -= dt;
    if (enemySpawnTimer <= 0) {
        spawnEnemy();
        enemySpawnTimer = Math.max(0.85, 2.0 - (GameState.kills * 0.03));
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.z -= (e.speed + currentSpeed * 0.4) * dt;
        e.swayAngle += e.swaySpeed * dt;
        e.x += Math.sin(e.swayAngle) * 48 * dt;
        e.roll = Math.cos(e.swayAngle) * 0.25; // Inclinación suave al maniobrar

        if (e.muzzleFlash > 0) e.muzzleFlash -= dt;

        // Disparo de TIEs
        e.shootCooldown -= dt;
        if (e.shootCooldown <= 0 && e.z > 130 && e.z < 650) {
            audio.playTieLaser();
            e.muzzleFlash = 0.08;
            enemyLasers.push({
                x: e.x,
                y: e.y + 6,
                z: e.z,
                vx: (Player.x - e.x) * 0.65,
                vy: (Player.y - e.y) * 0.65,
                speed: 430
            });
            e.shootCooldown = Math.random() * 1.9 + 1.1;
        }

        // Colisión con el Halcón
        if (e.z <= 40 && e.z >= -10) {
            const distXY = Math.hypot(e.x - Player.x, e.y - Player.y);
            if (distXY < 42) {
                damagePlayer();
                createExplosion(e.x, e.y, e.z, 28, true);
                enemies.splice(i, 1);
                continue;
            }
        }

        if (e.z < -20) {
            enemies.splice(i, 1);
        }
    }

    // Actualizar disparos enemigos
    for (let i = enemyLasers.length - 1; i >= 0; i--) {
        const el = enemyLasers[i];
        el.z -= (el.speed + currentSpeed * 0.3) * dt;
        el.x += el.vx * dt;
        el.y += el.vy * dt;

        if (el.z <= 35 && el.z >= -15) {
            const distXY = Math.hypot(el.x - Player.x, el.y - Player.y);
            if (distXY < 35) {
                damagePlayer();
                enemyLasers.splice(i, 1);
                continue;
            }
        }

        if (el.z < -25) {
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

        if (o.z <= 40 && o.z >= -10) {
            const distXY = Math.hypot(o.x - Player.x, o.y - Player.y);
            if (distXY < o.radius + 30) {
                damagePlayer();
                createExplosion(o.x, o.y, o.z, 25, true);
                obstacles.splice(i, 1);
                continue;
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

        if (pu.z <= 40 && pu.z >= -10) {
            const distXY = Math.hypot(pu.x - Player.x, pu.y - Player.y);
            if (distXY < 42) {
                applyPowerup(pu.type);
                powerups.splice(i, 1);
                continue;
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

    // Transición de etapas
    GameState.stageProgress += dt;
    if (GameState.kills >= 25 && GameState.stage === 1) {
        GameState.stage = 2;
        addFloatingScore('NIVEL 2: ASTEROID BELT', CANVAS_WIDTH / 2, 70, '#38bdf8');
    } else if (GameState.kills >= 55 && GameState.stage === 2) {
        GameState.stage = 3;
        addFloatingScore('NIVEL 3: DEATH STAR TRENCH', CANVAS_WIDTH / 2, 70, '#f43f5e');
    }
}

function applyPowerup(type) {
    audio.playPowerup();
    if (type === 'shield') {
        if (GameState.shields < GameState.maxShields) {
            GameState.shields++;
            shieldsCountElement.textContent = GameState.shields;
            addFloatingScore('+1 ESCUDO', CANVAS_WIDTH / 2, 80, '#38bdf8');
        } else {
            GameState.score += 300;
            scoreElement.textContent = `SCORE: ${String(GameState.score).padStart(6, '0')}`;
            addFloatingScore('+300 PTS', CANVAS_WIDTH / 2, 80, '#facc15');
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

function damagePlayer() {
    if (Player.invulnerableTime > 0 || GameState.boost) return;

    audio.playShieldHit();
    GameState.shields--;
    shieldsCountElement.textContent = GameState.shields;
    Player.shieldFlash = 0.45;
    Player.invulnerableTime = 1.7;
    GameState.screenShake = 12;

    if (GameState.shields <= 0) {
        triggerGameOver();
    }
}

function triggerGameOver() {
    GameState.gameOver = true;
    GameState.running = false;
    createExplosion(Player.x, Player.y, 10, 50, true);

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
        resetSignalingAndRoom();
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

    // 8. HUD Super Star Wars con Sable de Luz
    if (GameState.running && !GameState.gameOver) {
        renderSuperStarWarsHUD();
    }

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

function renderObstaclesAndEnemies() {
    const list = [];
    enemies.forEach(e => list.push({ type: 'enemy', z: e.z, obj: e }));
    obstacles.forEach(o => list.push({ type: 'obstacle', z: o.z, obj: o }));

    list.sort((a, b) => b.z - a.z); // Pintor 3D: lejanos primero
    list.forEach(item => {
        if (item.type === 'enemy') renderTIEFighter(item.obj);
        else renderObstacle(item.obj);
    });
}

function renderPowerups() {
    powerups.forEach(pu => renderPowerup(pu));
}

function startNewGame() {
    GameState.running = true;
    GameState.gameOver = false;
    GameState.score = 0;
    GameState.shields = GameState.maxShields;
    GameState.kills = 0;
    GameState.stage = 1;
    GameState.stageProgress = 0;
    GameState.boost = false;

    Player.x = 0;
    Player.y = 35;
    Player.vx = 0;
    Player.vy = 0;
    Player.roll = 0;
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
    audio.init();
    audio.playIntroFanfare();
}

// ==============================================================================
// CONTROLES DE TECLADO (PRE-PUSH OBLIGATORIO)
// ==============================================================================

window.addEventListener('keydown', (e) => {
    if (audio.init) audio.init();
    const key = e.key.toLowerCase();

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
        waitingOverlay.classList.add('hidden');
    };

    channel.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'join' || msg.type === 'nickname') {
                GameState.currentNickname = (msg.nickname || msg.value || 'PILOT').toUpperCase().substring(0, 10);
                if (playerNickElement) playerNickElement.textContent = `PILOT: ${GameState.currentNickname}`;
                startNewGame();
            } else if (msg.type === 'move') {
                Player.vx = (msg.x || 0);
                Player.vy = (msg.y || 0);
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
    if (pc) pc.close();
    peerConnections.delete(playerId);
    dataChannels.delete(playerId);
    if (peerConnections.size === 0 && !GameState.gameOver && GameState.running) {
        waitingOverlay.classList.remove('hidden');
        GameState.running = false;
    }
}

function resetSignalingAndRoom() {
    GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    updateQrCode();
    waitingOverlay.classList.remove('hidden');
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
