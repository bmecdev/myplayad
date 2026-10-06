// ==============================================================================
// STAR WARS: FALCON - Retro Arcade Host Script
// Simulador espacial 3D retro del Halcón Milenario
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
const HORIZON_Y = 140;
const FOV = 220;

// Estado Global
const GameState = {
    running: false,
    gameOver: false,
    score: 0,
    highScore: 0,
    shields: 3,
    maxShields: 3,
    kills: 0,
    stage: 1, // 1: Tatooine/Jakku Desert Canyon, 2: Asteroid Field, 3: Death Star Trench
    stageProgress: 0,
    speed: 280,
    boost: false,
    boostTimer: 0,
    currentNickname: 'HAN SOLO',
    roomId: Math.random().toString(36).substring(2, 6).toUpperCase(),
    lastTime: 0,
    screenShake: 0,
    hyperspaceAnim: 0
};

let gameOverTimeout = null;

// Jugador: El Halcón Milenario (YT-1300)
const Player = {
    x: 0,          // Posición relativa al centro (-150 a +150)
    y: 40,         // Altitud (-60 a +70)
    vx: 0,
    vy: 0,
    roll: 0,       // Inclinación lateral (banking)
    targetRoll: 0,
    pitch: 0,
    isFiring: false,
    fireCooldown: 0,
    fireRate: 0.14,
    invulnerableTime: 0,
    shieldFlash: 0,
    spreadGun: false,
    spreadTimer: 0
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

// Sistema de Audio Web Audio API Sintetizado
class StarWarsAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.engineOsc = null;
        this.engineGain = null;
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
                console.warn('Audio no soportado:', e);
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
            this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
            this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(140, this.ctx.currentTime);

            this.engineOsc.connect(filter);
            filter.connect(this.engineGain);
            this.engineGain.connect(this.masterGain);
            this.engineOsc.start();
        } catch (_) {}
    }

    updateEngineSound(speed, boost) {
        if (!this.ctx || !this.engineOsc || !this.engineGain) return;
        const baseFreq = boost ? 95 : 55 + (speed / 300) * 20;
        this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.1);
        this.engineGain.gain.setTargetAtTime(boost ? 0.08 : 0.04, this.ctx.currentTime, 0.1);
    }

    // Disparo láser clásico del Halcón Milenario (Pew-Pew)
    playLaser() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            // Barrido de frecuencia descendente muy rápido
            osc.frequency.setValueAtTime(1600, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.12);
        } catch (_) {}
    }

    // Disparo láser verde de caza TIE
    playTieLaser() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(950, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.15);
        } catch (_) {}
    }

    // Rugido característico del motor iónico de los TIE Fighters
    playTieRoar() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = 'sawtooth';
            osc2.type = 'sawtooth';

            osc1.frequency.setValueAtTime(320, now);
            osc1.frequency.exponentialRampToValueAtTime(220, now + 0.35);

            osc2.frequency.setValueAtTime(328, now); // Ligero batido iónico
            osc2.frequency.exponentialRampToValueAtTime(224, now + 0.35);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.masterGain);

            osc1.start(now);
            osc2.start(now + 0.02);
            osc1.stop(now + 0.35);
            osc2.stop(now + 0.35);
        } catch (_) {}
    }

    // Explosión de nave enemiga o asteroide
    playExplosion(isBig = false) {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const bufferSize = this.ctx.sampleRate * (isBig ? 0.45 : 0.25);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(isBig ? 650 : 900, now);
            filter.frequency.exponentialRampToValueAtTime(80, now + (isBig ? 0.45 : 0.25));

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(isBig ? 0.45 : 0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + (isBig ? 0.45 : 0.25));

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            noise.start(now);
        } catch (_) {}
    }

    // Impacto de escudo
    playShieldHit() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.2);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.2);
        } catch (_) {}
    }

    // Item power-up recogido
    playPowerup() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            [300, 450, 600, 800].forEach((freq, i) => {
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

    // Melodía corta chiptune de la Victoria / Inicio
    playIntroFanfare() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const notes = [
                { f: 293.66, d: 0.18 }, // D4
                { f: 293.66, d: 0.18 },
                { f: 293.66, d: 0.18 },
                { f: 392.00, d: 0.50 }, // G4
                { f: 587.33, d: 0.50 }  // D5
            ];
            let offset = 0;
            notes.forEach(n => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, now + offset);
                gain.gain.setValueAtTime(0.25, now + offset);
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

// Entidades del mundo 3D
let stars = [];
let lasers = [];        // Disparos del Halcón hacia adelante
let enemyLasers = [];   // Disparos enemigos hacia el jugador
let enemies = [];       // TIE Fighters, TIE Interceptors, Cazas Sith
let obstacles = [];     // Asteroides y escombros espaciales
let powerups = [];      // Cápsulas de escudo y mejoras
let particles = [];     // Chispas, humo y fuego de explosiones
let floatingScores = [];

// Inicializar campo de estrellas 3D
function initStars() {
    stars = [];
    for (let i = 0; i < 110; i++) {
        stars.push({
            x: (Math.random() - 0.5) * 600,
            y: (Math.random() - 0.5) * 450,
            z: Math.random() * 800 + 50,
            size: Math.random() * 1.5 + 0.8,
            color: Math.random() > 0.85 ? '#93c5fd' : (Math.random() > 0.7 ? '#fde047' : '#ffffff')
        });
    }
}

// Spawners de enemigos y asteroides
let enemySpawnTimer = 0;
let obstacleSpawnTimer = 0;

function spawnEnemy() {
    const types = ['tie', 'tie', 'tie_interceptor', 'sith_fighter'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = (Math.random() - 0.5) * 360;
    const y = (Math.random() - 0.5) * 160;
    const hp = type === 'sith_fighter' ? 3 : (type === 'tie_interceptor' ? 2 : 1);
    const speed = type === 'tie_interceptor' ? 260 : (type === 'sith_fighter' ? 210 : 180);

    enemies.push({
        type: type,
        x: x,
        y: y,
        z: 850,
        hp: hp,
        maxHp: hp,
        speed: speed,
        shootCooldown: Math.random() * 1.2 + 0.8,
        swayAngle: Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 2 + 1.5,
        roll: 0
    });

    if (Math.random() > 0.6) {
        audio.playTieRoar();
    }
}

function spawnObstacle() {
    const x = (Math.random() - 0.5) * 380;
    const y = (Math.random() - 0.5) * 200;
    const radius = Math.random() * 20 + 16;
    obstacles.push({
        x: x,
        y: y,
        z: 880,
        radius: radius,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 2.5,
        speed: 210,
        hp: Math.ceil(radius / 12)
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
        speed: 160,
        rot: 0
    });
}

function createExplosion(x, y, z, count = 20, isBig = false) {
    audio.playExplosion(isBig);
    GameState.screenShake = isBig ? 8 : 4;
    for (let i = 0; i < count; i++) {
        const speed = Math.random() * 120 + 30;
        const angle = Math.random() * Math.PI * 2;
        const vz = (Math.random() - 0.5) * 80;
        const colors = ['#f59e0b', '#ef4444', '#fbbf24', '#ffffff', '#38bdf8'];
        particles.push({
            x: x,
            y: y,
            z: z,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            vz: vz,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: Math.random() * 0.45 + 0.25,
            maxLife: 0.7,
            size: Math.random() * 3 + 1.5
        });
    }
}

function addFloatingScore(text, x, y, color = '#facc15') {
    floatingScores.push({
        text: text,
        x: x,
        y: y,
        color: color,
        life: 0.8
    });
}

// Proyección 3D a pantalla 2D
function project3D(x, y, z) {
    if (z <= 10) return null;
    const scale = FOV / z;
    const sx = (CANVAS_WIDTH / 2) + x * scale;
    const sy = HORIZON_Y + y * scale;
    return { x: sx, y: sy, scale: scale };
}

// ==============================================================================
// RENDERIZADO DE ELEMENTOS GRÁFICOS RETRO PIXEL-ART
// ==============================================================================

// Dibujar fondo estelar / terreno planetario según fase
function renderBackground() {
    // Fondo de espacio profundo con degradado cósmico
    if (GameState.stage === 1) {
        // Misión 1: Tatooine Canyon / Jakku - Horizonte desértico con sol gemelo
        const gradSky = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
        gradSky.addColorStop(0, '#1e112a');
        gradSky.addColorStop(0.6, '#3b1d3d');
        gradSky.addColorStop(1, '#83382f');
        ctx.fillStyle = gradSky;
        ctx.fillRect(0, 0, CANVAS_WIDTH, HORIZON_Y);

        // Soles gemelos de Tatooine
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH * 0.7, HORIZON_Y - 45, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH * 0.78, HORIZON_Y - 32, 10, 0, Math.PI * 2);
        ctx.fill();

        // Terreno del desierto inferior
        const gradGround = ctx.createLinearGradient(0, HORIZON_Y, 0, CANVAS_HEIGHT);
        gradGround.addColorStop(0, '#78350f');
        gradGround.addColorStop(0.3, '#92400e');
        gradGround.addColorStop(1, '#b45309');
        ctx.fillStyle = gradGround;
        ctx.fillRect(0, HORIZON_Y, CANVAS_WIDTH, CANVAS_HEIGHT - HORIZON_Y);

        // Líneas de perspectiva en el suelo desértico
        ctx.strokeStyle = 'rgba(254, 215, 170, 0.2)';
        ctx.lineWidth = 1;
        const groundOffset = (Date.now() * 0.3) % 24;
        for (let y = HORIZON_Y; y < CANVAS_HEIGHT; y += 8 + (y - HORIZON_Y) * 0.15) {
            const actualY = y + (groundOffset * (y - HORIZON_Y) / 100);
            if (actualY < CANVAS_HEIGHT) {
                ctx.beginPath();
                ctx.moveTo(0, actualY);
                ctx.lineTo(CANVAS_WIDTH, actualY);
                ctx.stroke();
            }
        }
    } else if (GameState.stage === 2) {
        // Misión 2: Campo de Asteroides - Espacio profundo
        ctx.fillStyle = '#020409';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Nebulosa distante
        const nebGrad = ctx.createRadialGradient(CANVAS_WIDTH * 0.3, HORIZON_Y * 0.6, 10, CANVAS_WIDTH * 0.3, HORIZON_Y * 0.6, 130);
        nebGrad.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
        nebGrad.addColorStop(0.5, 'rgba(147, 51, 234, 0.12)');
        nebGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = nebGrad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        // Misión 3: Trinchera de la Estrella de la Muerte
        ctx.fillStyle = '#060a10';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Paredes metálicas de la trinchera
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, HORIZON_Y - 20, CANVAS_WIDTH, CANVAS_HEIGHT - HORIZON_Y + 20);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        // Rejilla de trinchera
        for (let x = 20; x < CANVAS_WIDTH; x += 40) {
            ctx.beginPath();
            ctx.moveTo(CANVAS_WIDTH / 2, HORIZON_Y);
            ctx.lineTo(x, CANVAS_HEIGHT);
            ctx.stroke();
        }
    }

    // Dibujar estrellas viajando hacia el jugador
    const starSpeedMult = GameState.boost ? 4.5 : 1.0;
    stars.forEach(s => {
        const p = project3D(s.x, s.y, s.z);
        if (p) {
            ctx.fillStyle = s.color;
            if (GameState.boost) {
                // Trazas de hiperespacio
                const pPrev = project3D(s.x, s.y, s.z + 50);
                if (pPrev) {
                    ctx.strokeStyle = s.color;
                    ctx.lineWidth = Math.max(1, p.scale * 1.8);
                    ctx.beginPath();
                    ctx.moveTo(pPrev.x, pPrev.y);
                    ctx.lineTo(p.x, p.y);
                    ctx.stroke();
                }
            } else {
                const r = Math.max(0.8, s.size * p.scale * 1.5);
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });
}

// Dibujar el Halcón Milenario en perspectiva de 3ra persona con rotación e inclinación
function renderMillenniumFalcon() {
    const cx = (CANVAS_WIDTH / 2) + Player.x;
    const cy = (CANVAS_HEIGHT * 0.78) + Player.y;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Player.roll);

    const isHit = Player.invulnerableTime > 0 && Math.floor(Date.now() / 80) % 2 === 0;
    if (isHit) {
        ctx.globalAlpha = 0.5;
    }

    // Escudo de energía visible al recibir impacto o boost
    if (Player.shieldFlash > 0 || GameState.boost) {
        ctx.strokeStyle = GameState.boost ? 'rgba(56, 189, 248, 0.8)' : 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, -2, 54, 38, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = GameState.boost ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.15)';
        ctx.fill();
    }

    // 1. Motor subluz azul cyan en la popa (glowing hyperdrive stripe)
    const engineGlow = GameState.boost ? 14 : 7;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = engineGlow;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-28, 14, 56, 5);

    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(-22, 15, 44, 3);
    ctx.shadowBlur = 0;

    // 2. Chorro de partículas del motor
    const exhaustColor = GameState.boost ? '#67e8f9' : '#38bdf8';
    ctx.fillStyle = exhaustColor;
    for (let i = -24; i <= 24; i += 8) {
        const flameLen = Math.random() * (GameState.boost ? 18 : 8) + 4;
        ctx.fillRect(i, 19, 4, flameLen);
    }

    // 3. Casco principal del Halcón (Saucer disc hull)
    // Sombra/borde inferior
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 48, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Planchas de blindaje superior
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(0, -3, 46, 27, 0, 0, Math.PI * 2);
    ctx.fill();

    // Paneles oscuros y marcas de batalla
    ctx.fillStyle = '#475569';
    // Rejillas de ventilación circulares en la parte trasera
    [-20, -10, 10, 20].forEach(gx => {
        ctx.beginPath();
        ctx.arc(gx, 5, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    // 4. Mandíbulas delanteras (Forward cargo mandibles)
    ctx.fillStyle = '#94a3b8';
    // Mandíbula izquierda
    ctx.beginPath();
    ctx.moveTo(-22, -18);
    ctx.lineTo(-24, -36);
    ctx.lineTo(-12, -36);
    ctx.lineTo(-10, -18);
    ctx.closePath();
    ctx.fill();

    // Mandíbula derecha
    ctx.beginPath();
    ctx.moveTo(10, -18);
    ctx.lineTo(12, -36);
    ctx.lineTo(24, -36);
    ctx.lineTo(22, -18);
    ctx.closePath();
    ctx.fill();

    // Hueco central entre mandíbulas
    ctx.fillStyle = '#334155';
    ctx.fillRect(-10, -32, 20, 14);

    // 5. Cabina lateral desplazada a estribor (Cockpit tube & pod)
    ctx.fillStyle = '#64748b';
    ctx.fillRect(36, -18, 16, 10); // Tubo conector
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(42, -28);
    ctx.lineTo(52, -20);
    ctx.lineTo(50, -6);
    ctx.lineTo(38, -6);
    ctx.closePath();
    ctx.fill();

    // Parabrisas de la cabina (Canopy glass)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(41, -22, 8, 8);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.strokeRect(41, -22, 8, 8);

    // 6. Antena sensora de radar en babor (Sensor dish)
    ctx.fillStyle = '#475569';
    ctx.fillRect(-28, -14, 5, 3);
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(-30, -16, 7, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // 7. Torreta láser cuádruple en el centro (Quad-laser turret)
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, -6, 8, 0, Math.PI * 2);
    ctx.fill();

    // Cañones cuádruples
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-3, -16, 2, 8);
    ctx.fillRect(1, -16, 2, 8);

    ctx.restore();

    // Retícula de puntería holográfica Star Wars delante del Halcón
    const crosshairX = CANVAS_WIDTH / 2 + Player.x * 0.45;
    const crosshairY = HORIZON_Y + Player.y * 0.35;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(crosshairX, crosshairY, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(crosshairX - 16, crosshairY);
    ctx.lineTo(crosshairX - 4, crosshairY);
    ctx.moveTo(crosshairX + 4, crosshairY);
    ctx.lineTo(crosshairX + 16, crosshairY);
    ctx.moveTo(crosshairX, crosshairY - 16);
    ctx.lineTo(crosshairX, crosshairY - 4);
    ctx.moveTo(crosshairX, crosshairY + 4);
    ctx.lineTo(crosshairX, crosshairY + 16);
    ctx.stroke();
}

// Dibujar Caza TIE / Interceptor / Sith Fighter
function renderEnemy(e) {
    const p = project3D(e.x, e.y, e.z);
    if (!p) return;

    const scale = p.scale;
    const cx = p.x;
    const cy = p.y;

    ctx.save();
    ctx.translate(cx, cy);

    if (e.type === 'tie') {
        // TIE Fighter Clásico Imperial
        const wingW = 6 * scale;
        const wingH = 42 * scale;
        const span = 28 * scale;
        const ballR = 9 * scale;

        // Puntos de soporte de paneles solares
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-span, -2 * scale, span * 2, 4 * scale);

        // Panel solar izquierdo
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-span - wingW / 2, -wingH / 2, wingW, wingH);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = Math.max(1, 1 * scale);
        ctx.strokeRect(-span - wingW / 2, -wingH / 2, wingW, wingH);

        // Panel solar derecho
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(span - wingW / 2, -wingH / 2, wingW, wingH);
        ctx.strokeRect(span - wingW / 2, -wingH / 2, wingW, wingH);

        // Cabina esférica central
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(0, 0, ballR, 0, Math.PI * 2);
        ctx.fill();

        // Ojo de buey / ventana roja imperial
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, ballR * 0.45, 0, Math.PI * 2);
        ctx.fill();

    } else if (e.type === 'tie_interceptor') {
        // TIE Interceptor con alas en punta de flecha / daga
        const span = 32 * scale;
        const ballR = 8 * scale;

        ctx.fillStyle = '#475569';
        ctx.fillRect(-span, -2 * scale, span * 2, 4 * scale);

        // Alas en forma de chevron / tijera
        ctx.fillStyle = '#020617';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = Math.max(1, 1.2 * scale);

        // Ala izquierda
        ctx.beginPath();
        ctx.moveTo(-span, 0);
        ctx.lineTo(-span - 12 * scale, -24 * scale);
        ctx.lineTo(-span + 8 * scale, -10 * scale);
        ctx.lineTo(-span + 8 * scale, 10 * scale);
        ctx.lineTo(-span - 12 * scale, 24 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ala derecha
        ctx.beginPath();
        ctx.moveTo(span, 0);
        ctx.lineTo(span + 12 * scale, -24 * scale);
        ctx.lineTo(span - 8 * scale, -10 * scale);
        ctx.lineTo(span - 8 * scale, 10 * scale);
        ctx.lineTo(span + 12 * scale, 24 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cabina central
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(0, 0, ballR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(0, 0, ballR * 0.4, 0, Math.PI * 2);
        ctx.fill();

    } else {
        // Sith Infiltrator / Caza Sith (Nave angular negra y carmesí)
        const size = 30 * scale;
        ctx.fillStyle = '#7f1d1d';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = Math.max(1, 1.5 * scale);

        ctx.beginPath();
        ctx.moveTo(0, -size * 0.7);
        ctx.lineTo(-size, size * 0.6);
        ctx.lineTo(0, size * 0.2);
        ctx.lineTo(size, size * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Reactor Sith ardiente
        ctx.fillStyle = '#f87171';
        ctx.beginPath();
        ctx.arc(0, 0, 5 * scale, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// Dibujar Asteroide 3D rocoso
function renderObstacle(o) {
    const p = project3D(o.x, o.y, o.z);
    if (!p) return;

    const r = o.radius * p.scale;
    if (r < 1) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(o.rot);

    // Roca poligonal con relieve
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(1, 1.5 * p.scale);

    ctx.beginPath();
    const vertices = 8;
    for (let i = 0; i < vertices; i++) {
        const ang = (i / vertices) * Math.PI * 2;
        const radVar = r * (0.8 + ((i % 3) * 0.15));
        const vx = Math.cos(ang) * radVar;
        const vy = Math.sin(ang) * radVar;
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cráteres de impacto en la superficie
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(r * 0.25, -r * 0.2, r * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-r * 0.3, r * 0.25, r * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Dibujar Cápsulas Power-Up
function renderPowerup(pu) {
    const p = project3D(pu.x, pu.y, pu.z);
    if (!p) return;

    const size = 16 * p.scale;
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
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = `${Math.max(8, Math.floor(size * 1.2))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, 0);

    ctx.restore();
}

// Dibujar Láseres
function renderLasers() {
    // 1. Láseres del Halcón (Rojos / Azules)
    lasers.forEach(l => {
        const p1 = project3D(l.x, l.y, l.z);
        const p2 = project3D(l.x, l.y, l.z + 45);
        if (p1 && p2) {
            ctx.strokeStyle = Player.spreadTimer > 0 ? '#38bdf8' : '#ef4444';
            ctx.lineWidth = Math.max(1.5, 3.5 * p1.scale);
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    });

    // 2. Láseres enemigos (Verdes imperiales)
    enemyLasers.forEach(el => {
        const p1 = project3D(el.x, el.y, el.z);
        const p2 = project3D(el.x, el.y, el.z + 40);
        if (p1 && p2) {
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = Math.max(1.5, 3.0 * p1.scale);
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    });
}

// Dibujar Partículas y Puntos Flotantes
function renderParticles() {
    particles.forEach(pt => {
        const p = project3D(pt.x, pt.y, pt.z);
        if (p) {
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = Math.max(0.1, pt.life / pt.maxLife);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(1, pt.size * p.scale), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    });

    floatingScores.forEach(fs => {
        ctx.fillStyle = fs.color;
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(fs.text, fs.x, fs.y);
    });
}

// ==============================================================================
// LÓGICA DE ACTUALIZACIÓN DEL MUNDO (UPDATE)
// ==============================================================================

function fireFalconLasers() {
    audio.playLaser();
    const targetX = Player.x * 0.45;
    const targetY = Player.y * 0.35;

    if (Player.spreadTimer > 0) {
        // Disparo cuádruple disperso
        [-20, -7, 7, 20].forEach(ox => {
            lasers.push({
                x: Player.x + ox,
                y: Player.y - 12,
                z: 40,
                vx: (targetX - (Player.x + ox)) * 1.5,
                vy: (targetY - (Player.y - 12)) * 1.5,
                speed: 850
            });
        });
    } else {
        // Disparo dual estándar del Halcón
        [-12, 12].forEach(ox => {
            lasers.push({
                x: Player.x + ox,
                y: Player.y - 10,
                z: 40,
                vx: (targetX - (Player.x + ox)) * 1.2,
                vy: (targetY - (Player.y - 10)) * 1.2,
                speed: 800
            });
        });
    }
}

function update(dt) {
    if (!GameState.running || GameState.gameOver) return;

    // Manejo de Boost e Hiperespacio
    if (GameState.boost) {
        GameState.boostTimer -= dt;
        if (GameState.boostTimer <= 0) {
            GameState.boost = false;
        }
    }
    const currentSpeed = GameState.boost ? GameState.speed * 2.2 : GameState.speed;
    audio.updateEngineSound(currentSpeed, GameState.boost);

    // Controles de vuelo del Halcón
    const moveSpeed = 190 * dt;
    let dx = 0;
    let dy = 0;

    if (Keys.left) dx -= 1;
    if (Keys.right) dx += 1;
    if (Keys.up) dy -= 1;
    if (Keys.down) dy += 1;

    // Si viene de control analógico virtual
    if (Player.vx !== 0) dx = Player.vx;
    if (Player.vy !== 0) dy = Player.vy;

    Player.x += dx * moveSpeed;
    Player.y += dy * moveSpeed;

    // Límites de pantalla
    Player.x = Math.max(-145, Math.min(145, Player.x));
    Player.y = Math.max(-55, Math.min(65, Player.y));

    // Roll / Banking dinámico al girar
    Player.targetRoll = dx * 0.38;
    Player.roll += (Player.targetRoll - Player.roll) * 12 * dt;

    // Temporizadores de jugador
    if (Player.invulnerableTime > 0) Player.invulnerableTime -= dt;
    if (Player.shieldFlash > 0) Player.shieldFlash -= dt;
    if (Player.spreadTimer > 0) Player.spreadTimer -= dt;

    // Disparo
    Player.fireCooldown -= dt;
    if ((Keys.fire || Player.isFiring) && Player.fireCooldown <= 0) {
        fireFalconLasers();
        Player.fireCooldown = Player.fireRate;
    }

    // Actualizar estrellas
    stars.forEach(s => {
        s.z -= currentSpeed * dt;
        if (s.z <= 15) {
            s.z = 850;
            s.x = (Math.random() - 0.5) * 600;
            s.y = (Math.random() - 0.5) * 450;
        }
    });

    // Actualizar láseres del Halcón
    for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.z += l.speed * dt;
        l.x += l.vx * dt;
        l.y += l.vy * dt;

        // Comprobar colisión con enemigos
        let hit = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (Math.abs(l.z - e.z) < 55) {
                const distXY = Math.hypot(l.x - e.x, l.y - e.y);
                if (distXY < 28) {
                    hit = true;
                    e.hp--;
                    if (e.hp <= 0) {
                        const pts = e.type === 'sith_fighter' ? 500 : (e.type === 'tie_interceptor' ? 300 : 150);
                        GameState.score += pts;
                        GameState.kills++;
                        killsCountElement.textContent = String(GameState.kills).padStart(2, '0');
                        scoreElement.textContent = `SCORE: ${String(GameState.score).padStart(6, '0')}`;
                        addFloatingScore(`+${pts}`, (CANVAS_WIDTH / 2) + e.x * (FOV / e.z), HORIZON_Y + e.y * (FOV / e.z));
                        createExplosion(e.x, e.y, e.z, 24, e.type === 'sith_fighter');

                        if (Math.random() < 0.28) {
                            spawnPowerup(e.x, e.y, e.z);
                        }
                        enemies.splice(j, 1);
                    } else {
                        createExplosion(e.x, e.y, e.z, 6, false);
                    }
                    break;
                }
            }
        }

        // Comprobar colisión con asteroides
        if (!hit) {
            for (let k = obstacles.length - 1; k >= 0; k--) {
                const o = obstacles[k];
                if (Math.abs(l.z - o.z) < 65) {
                    const distXY = Math.hypot(l.x - o.x, l.y - o.y);
                    if (distXY < o.radius + 6) {
                        hit = true;
                        o.hp--;
                        if (o.hp <= 0) {
                            GameState.score += 100;
                            scoreElement.textContent = `SCORE: ${String(GameState.score).padStart(6, '0')}`;
                            addFloatingScore('+100', (CANVAS_WIDTH / 2) + o.x * (FOV / o.z), HORIZON_Y + o.y * (FOV / o.z));
                            createExplosion(o.x, o.y, o.z, 18, false);
                            obstacles.splice(k, 1);
                        } else {
                            createExplosion(l.x, l.y, l.z, 5, false);
                        }
                        break;
                    }
                }
            }
        }

        if (hit || l.z > 950) {
            lasers.splice(i, 1);
        }
    }

    // Actualizar enemigos
    enemySpawnTimer -= dt;
    if (enemySpawnTimer <= 0) {
        spawnEnemy();
        enemySpawnTimer = Math.max(0.9, 2.2 - (GameState.kills * 0.05));
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.z -= (e.speed + currentSpeed * 0.4) * dt;
        e.swayAngle += e.swaySpeed * dt;
        e.x += Math.sin(e.swayAngle) * 45 * dt;

        // Disparo de TIEs
        e.shootCooldown -= dt;
        if (e.shootCooldown <= 0 && e.z > 140 && e.z < 650) {
            audio.playTieLaser();
            enemyLasers.push({
                x: e.x,
                y: e.y,
                z: e.z,
                vx: (Player.x - e.x) * 0.6,
                vy: (Player.y - e.y) * 0.6,
                speed: 420
            });
            e.shootCooldown = Math.random() * 2.0 + 1.2;
        }

        // Colisión con el Halcón
        if (e.z <= 40 && e.z >= -10) {
            const distXY = Math.hypot(e.x - Player.x, e.y - Player.y);
            if (distXY < 42) {
                damagePlayer();
                createExplosion(e.x, e.y, e.z, 26, true);
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

        // Colisión con el Halcón
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

    // Actualizar obstáculos (Asteroides)
    obstacleSpawnTimer -= dt;
    if (obstacleSpawnTimer <= 0) {
        spawnObstacle();
        obstacleSpawnTimer = Math.max(1.1, 2.5 - (GameState.kills * 0.04));
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.z -= (o.speed + currentSpeed * 0.5) * dt;
        o.rot += o.rotSpeed * dt;

        // Colisión con el Halcón
        if (o.z <= 40 && o.z >= -10) {
            const distXY = Math.hypot(o.x - Player.x, o.y - Player.y);
            if (distXY < o.radius + 30) {
                damagePlayer();
                createExplosion(o.x, o.y, o.z, 24, true);
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
            if (distXY < 40) {
                applyPowerup(pu.type);
                powerups.splice(i, 1);
                continue;
            }
        }

        if (pu.z < -20) {
            powerups.splice(i, 1);
        }
    }

    // Actualizar partículas
    for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.life -= dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.z += pt.vz * dt;
        if (pt.life <= 0) particles.splice(i, 1);
    }

    // Puntos flotantes
    for (let i = floatingScores.length - 1; i >= 0; i--) {
        const fs = floatingScores[i];
        fs.life -= dt;
        fs.y -= 25 * dt;
        if (fs.life <= 0) floatingScores.splice(i, 1);
    }

    // Shake de pantalla
    if (GameState.screenShake > 0) {
        GameState.screenShake -= dt * 18;
        if (GameState.screenShake < 0) GameState.screenShake = 0;
    }

    // Avance de Fase
    GameState.stageProgress += dt;
    if (GameState.kills >= 25 && GameState.stage === 1) {
        GameState.stage = 2; // Pasa a campo de asteroides
        addFloatingScore('NIVEL 2: ASTEROID BELT', CANVAS_WIDTH / 2, 70, '#38bdf8');
    } else if (GameState.kills >= 55 && GameState.stage === 2) {
        GameState.stage = 3; // Pasa a trinchera
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
            GameState.score += 250;
            scoreElement.textContent = `SCORE: ${String(GameState.score).padStart(6, '0')}`;
            addFloatingScore('+250 PTS', CANVAS_WIDTH / 2, 80, '#facc15');
        }
    } else if (type === 'spread') {
        Player.spreadTimer = 10; // 10s de cuádruple láser
        addFloatingScore('QUAD LASER!', CANVAS_WIDTH / 2, 80, '#38bdf8');
    } else if (type === 'turbo') {
        GameState.boost = true;
        GameState.boostTimer = 6; // 6s de hiperespacio
        Player.invulnerableTime = 6;
        addFloatingScore('HYPERDRIVE!', CANVAS_WIDTH / 2, 80, '#10b981');
    }
}

function damagePlayer() {
    if (Player.invulnerableTime > 0 || GameState.boost) return;

    audio.playShieldHit();
    GameState.shields--;
    shieldsCountElement.textContent = GameState.shields;
    Player.shieldFlash = 0.4;
    Player.invulnerableTime = 1.6;
    GameState.screenShake = 12;

    if (GameState.shields <= 0) {
        triggerGameOver();
    }
}

function triggerGameOver() {
    GameState.gameOver = true;
    GameState.running = false;
    createExplosion(Player.x, Player.y, 10, 45, true);

    if (GameState.score > GameState.highScore) {
        GameState.highScore = GameState.score;
        highScoreElement.textContent = `HI: ${String(GameState.highScore).padStart(6, '0')}`;
        localStorage.setItem('starwars_highscore', GameState.highScore);
    }

    // Notificar al móvil
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

// Bucle principal de juego
function gameLoop(time) {
    if (!GameState.lastTime) GameState.lastTime = time;
    const dt = Math.min((time - GameState.lastTime) / 1000, 0.1);
    GameState.lastTime = time;

    update(dt);

    // Render
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    if (GameState.screenShake > 0) {
        const sx = (Math.random() - 0.5) * GameState.screenShake;
        const sy = (Math.random() - 0.5) * GameState.screenShake;
        ctx.translate(sx, sy);
    }

    renderBackground();
    renderObstaclesAndEnemies();
    renderLasers();
    renderPowerups();
    if (GameState.running && !GameState.gameOver) {
        renderMillenniumFalcon();
    }
    renderParticles();

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// Renderizado ordenado por profundidad Z (Pintor 3D)
function renderObstaclesAndEnemies() {
    const list = [];
    enemies.forEach(e => list.push({ type: 'enemy', z: e.z, obj: e }));
    obstacles.forEach(o => list.push({ type: 'obstacle', z: o.z, obj: o }));

    list.sort((a, b) => b.z - a.z); // Dibujar los más lejanos primero
    list.forEach(item => {
        if (item.type === 'enemy') renderEnemy(item.obj);
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
    Player.y = 40;
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
    floatingScores = [];

    scoreElement.textContent = 'SCORE: 000000';
    shieldsCountElement.textContent = GameState.shields;
    killsCountElement.textContent = '00';
    playerNickElement.textContent = `PILOT: ${GameState.currentNickname}`;

    waitingOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');

    audio.init();
    audio.playIntroFanfare();
}

// ==============================================================================
// TECLADO Y CONTROLES LOCALES (PRE-PUSH OBLIGATORIO)
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

// Clic en pantalla para iniciar de inmediato
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
                playerId: targetPlayerId // OBLIGATORIO
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
        sdp: answer.sdp, // OBLIGATORIO answer.sdp (string)
        roomId: GameState.roomId,
        playerId: targetPlayerId // OBLIGATORIO
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
                // Vector de joystick o botones: x, y (-1 a 1)
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

// Hall of Fame local
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

// Motor reactivo autoScale()
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

// Arranque
window.addEventListener('DOMContentLoaded', () => {
    initStars();
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
