// Pinball Arcade - Retro Neon Table Engine
// Structure and Obstacles inspired by NES Pinball (1984) with Two-Tier Playfield
// Preserves CRT Neon Cyberpunk graphics & Full Pure Arcade standard

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 160;

// Virtual Pinball Table Dimensions (Two vertical screens: Upper = 0..160, Lower = 160..320)
const TABLE_WIDTH = 200;
const TABLE_HEIGHT = 320;

const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const livesCountElement = document.getElementById('lives-count');
const multCountElement = document.getElementById('mult-count');
const comboMeterElement = document.getElementById('combo-meter');
const playerNickElement = document.getElementById('player-nick');
const roomSpan = document.getElementById('room-id');
const gameOverOverlay = document.getElementById('game-over-overlay');
const waitingOverlay = document.getElementById('waiting-overlay');
const rankingList = document.getElementById('ranking-list');
const audioToggleBtn = document.getElementById('audio-toggle-btn');
const mainScreen = document.getElementById('main-screen');

// ==========================================
// 🔊 Synthesized Web Audio API System
// ==========================================
class SoundFX {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.muted = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        this.muted = false;
        if (audioToggleBtn) {
            audioToggleBtn.classList.remove('muted');
            audioToggleBtn.textContent = '🔊 ON';
        }
    }

    toggle() {
        if (!this.ctx) {
            this.init();
            return;
        }
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.4, this.ctx.currentTime);
        }
        if (audioToggleBtn) {
            if (this.muted) {
                audioToggleBtn.classList.add('muted');
                audioToggleBtn.textContent = '🔇 OFF';
            } else {
                audioToggleBtn.classList.remove('muted');
                audioToggleBtn.textContent = '🔊 ON';
            }
        }
    }

    playBumper() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(750, t);
            osc.frequency.exponentialRampToValueAtTime(1400, t + 0.08);
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.1);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.1);
        } catch (_) {}
    }

    playSlingshot() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(380, t);
            osc.frequency.exponentialRampToValueAtTime(180, t + 0.07);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.08);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.08);
        } catch (_) {}
    }

    playFlipper(up = true) {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            const f = up ? 260 : 160;
            osc.frequency.setValueAtTime(f, t);
            osc.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.035);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.04);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.04);
        } catch (_) {}
    }

    playTarget() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(950, t);
            osc.frequency.exponentialRampToValueAtTime(1600, t + 0.06);
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.07);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.07);
        } catch (_) {}
    }

    playCardFlip() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(500, t);
            osc.frequency.exponentialRampToValueAtTime(1100, t + 0.08);
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.09);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.09);
        } catch (_) {}
    }

    playPlugActive() {
        if (!this.ctx || this.muted) return;
        try {
            const notes = [523, 659, 783, 1046];
            notes.forEach((freq, idx) => {
                const t = this.ctx.currentTime + idx * 0.06;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.linearRampToValueAtTime(0.001, t + 0.08);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.08);
            });
        } catch (_) {}
    }

    playLaunch() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, t);
            osc.frequency.exponentialRampToValueAtTime(800, t + 0.22);
            gain.gain.setValueAtTime(0.45, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.25);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.25);
        } catch (_) {}
    }

    playDrain() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, t);
            osc.frequency.exponentialRampToValueAtTime(60, t + 0.35);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.38);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.38);
        } catch (_) {}
    }
}
const audio = new SoundFX();

// ==========================================
// 🕹️ Estado Global del Juego (GameState)
// ==========================================
const GameState = {
    running: false,
    gameOver: false,
    score: 0,
    highScore: 0,
    ballsLeft: 3,
    multiplier: 1,
    combo: 0,
    comboTimer: 0,
    currentNickname: 'Player',
    roomId: Math.random().toString(36).substring(2, 6).toUpperCase(),
    lastTime: 0,

    // Cámara dinámica que sigue a la bola entre las 2 pantallas (Upper y Lower)
    camY: 160,       // 0 = Pantalla Superior, 160 = Pantalla Inferior
    targetCamY: 160,

    // Plunger (Resorte lanzador ubicado al fondo de la pantalla inferior)
    plunger: {
        charging: false,
        power: 0,            // 0 a 1
        x: 180,
        y: 304,
        restY: 304
    },

    // Mecánica NES: "Stop Plug" (Tapón salvavidas en el drenaje inferior)
    stopPlug: {
        active: false,
        timer: 0,
        x: 97,
        y: 304,
        radius: 4.5
    },

    // Penguin Targets (3 dianas bajo la barrera superior que activan el Stop Plug)
    penguinHits: 0,
    barrierTimer: 0,

    // Tilt (Nudge)
    nudgeCount: 0,
    nudgeResetTimer: 0,
    tiltActive: false,
    tiltTimer: 0,
    shakeX: 0,
    shakeY: 0,

    // Colecciones de elementos de mesa
    balls: [],
    bumpers: [],
    slingshots: [],
    cards: [],            // 5 Card targets de NES Pinball
    bonusLadder: 0,       // 0 a 7
    sideKickers: [],      // Kickers laterales circulares (los brown bumpers)
    rolloverLanes: [],
    particles: [],
    popups: [],

    // Doble par de Flippers estilo NES (Superiores e Inferiores)
    flippers: {
        // Flippers Superiores (Pantalla 1)
        upperLeft: {
            pivotX: 54,
            pivotY: 132,
            length: 23,
            width: 4.5,
            angle: 0.44,
            restAngle: 0.44,
            upAngle: -0.38,
            targetAngle: 0.44,
            angularSpeed: 25,
            active: false
        },
        upperRight: {
            pivotX: 140,
            pivotY: 132,
            length: 23,
            width: 4.5,
            angle: Math.PI - 0.44,
            restAngle: Math.PI - 0.44,
            upAngle: Math.PI + 0.38,
            targetAngle: Math.PI - 0.44,
            angularSpeed: 25,
            active: false
        },
        // Flippers Inferiores (Pantalla 2)
        lowerLeft: {
            pivotX: 66,
            pivotY: 295,
            length: 25,
            width: 5,
            angle: 0.48,
            restAngle: 0.48,
            upAngle: -0.42,
            targetAngle: 0.48,
            angularSpeed: 25,
            active: false
        },
        lowerRight: {
            pivotX: 128,
            pivotY: 295,
            length: 25,
            width: 5,
            angle: Math.PI - 0.48,
            restAngle: Math.PI - 0.48,
            upAngle: Math.PI + 0.42,
            targetAngle: Math.PI - 0.48,
            angularSpeed: 25,
            active: false
        }
    }
};

// ==========================================
// 📐 Inicialización de Elementos de Mesa NES
// ==========================================
function initTableElements() {
    // 1. Pop Bumpers NES (1 superior rosado + 2 inferiores rosados + 1 inferior ámbar)
    GameState.bumpers = [
        // Pantalla Superior (y < 160)
        { id: 1, tier: 'upper', x: 97,  y: 46,  radius: 8.5, lit: 0, color: '#ff007f', edge: '#ffffff', points: 100, label: '100' },
        
        // Pantalla Inferior (y > 160): Trío clásico NES Pinball
        { id: 2, tier: 'lower', x: 74,  y: 242, radius: 8.5, lit: 0, color: '#ff007f', edge: '#ffffff', points: 100, label: '100' },
        { id: 3, tier: 'lower', x: 120, y: 242, radius: 8.5, lit: 0, color: '#ff007f', edge: '#ffffff', points: 100, label: '100' },
        { id: 4, tier: 'lower', x: 97,  y: 268, radius: 9.0, lit: 0, color: '#ffb703', edge: '#ffffff', points: 100, label: '100' }
    ];

    // 2. Slingshots sobre los flippers inferiores
    GameState.slingshots = [
        {
            side: 'left',
            p1: { x: 48, y: 272 },
            p2: { x: 62, y: 288 },
            p3: { x: 48, y: 288 },
            lit: 0,
            color: '#ffb703'
        },
        {
            side: 'right',
            p1: { x: 146, y: 272 },
            p2: { x: 132, y: 288 },
            p3: { x: 146, y: 288 },
            lit: 0,
            color: '#ffb703'
        }
    ];

    // 3. Fila de 5 Card Targets NES en la mesa inferior (y = 186)
    // En NES Pinball son 5 naipes que se dan vuelta al ser impactados
    GameState.cards = [
        { id: 1, x: 50,  y: 182, w: 12, h: 16, flipped: false, label: 'P', color: '#3dff8a' },
        { id: 2, x: 68,  y: 182, w: 12, h: 16, flipped: false, label: 'L', color: '#3dff8a' },
        { id: 3, x: 86,  y: 182, w: 12, h: 16, flipped: false, label: 'A', color: '#3dff8a' },
        { id: 4, x: 104, y: 182, w: 12, h: 16, flipped: false, label: 'Y', color: '#3dff8a' },
        { id: 5, x: 122, y: 182, w: 12, h: 16, flipped: false, label: '!', color: '#3dff8a' }
    ];

    // 4. Kickers laterales (los deflectores redondos marrones en las paredes de NES)
    GameState.sideKickers = [
        { x: 42,  y: 194, radius: 5.5, lit: 0, color: '#ffb703' },
        { x: 152, y: 194, radius: 5.5, lit: 0, color: '#ffb703' }
    ];

    // 5. Rollovers superiores NES (Top lanes de 500 puntos)
    GameState.rolloverLanes = [
        { id: 1, x: 74,  y: 22, lit: false, points: 500, label: '500' },
        { id: 2, x: 120, y: 22, lit: false, points: 500, label: '500' }
    ];

    // 6. Estado de Penguin Targets (Pantalla Superior)
    GameState.penguinHits = 0;
    GameState.stopPlug.active = false;
    GameState.bonusLadder = 0;
}

// Carga una nueva bola en el shooter lane (plunger)
function spawnBallInPlunger() {
    GameState.balls.push({
        x: 180,
        y: 295,
        vx: 0,
        vy: 0,
        radius: 3.2,
        active: true,
        inPlunger: true,
        hasLaunched: false,
        stuckTimer: 0,
        lastX: 180,
        lastY: 295,
        trail: []
    });
    GameState.targetCamY = 160;
}

function startNewGame() {
    GameState.score = 0;
    GameState.ballsLeft = 3;
    GameState.multiplier = 1;
    GameState.combo = 0;
    GameState.comboTimer = 0;
    GameState.gameOver = false;
    GameState.running = true;
    GameState.tiltActive = false;
    GameState.tiltTimer = 0;
    GameState.nudgeCount = 0;
    GameState.camY = 160;
    GameState.targetCamY = 160;
    GameState.particles = [];
    GameState.popups = [];
    GameState.balls = [];

    initTableElements();
    spawnBallInPlunger();

    gameOverOverlay.classList.add('hidden');
    waitingOverlay.classList.add('hidden');
    updateUI();
    audio.init();
}

function endGame() {
    GameState.running = false;
    GameState.gameOver = true;
    audio.playDrain();
    saveScore(GameState.currentNickname, GameState.score);

    // Notificar a los mandos móviles
    dataChannels.forEach(ch => {
        if (ch && ch.readyState === 'open') {
            try {
                ch.send(JSON.stringify({ type: 'game_over', score: GameState.score }));
            } catch (_) {}
        }
    });

    gameOverOverlay.classList.remove('hidden');
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

function addScore(points, x = 97, y = 160) {
    const total = points * GameState.multiplier;
    GameState.score += total;
    GameState.combo++;
    GameState.comboTimer = 2.2;

    // Subir peldaño en la escalera de bonus (1 a 7)
    if (GameState.bonusLadder < 7) {
        GameState.bonusLadder++;
        if (GameState.bonusLadder >= 7) {
            GameState.multiplier = Math.min(5, GameState.multiplier + 1);
            multCountElement.textContent = `${GameState.multiplier}X`;
        }
    }

    GameState.popups.push({
        text: `+${total}`,
        x: x,
        y: y,
        vy: -20,
        alpha: 1.0,
        color: GameState.multiplier > 1 ? '#00f5d4' : '#ffea00'
    });

    updateUI();
}

// ==========================================
// ⚙️ Paredes y Geometría de Mesa NES Pinball
// ==========================================
const GRAVITY = 185;
const DAMPING = 0.999;
const RESTITUTION_WALL = 0.75;

// Segmentos que componen la mesa vertical completa (200x320)
const tableWalls = [
    // 1. Canal Plunger Lateral Derecho
    { p1: { x: 188, y: 312 }, p2: { x: 188, y: 34 } },
    { p1: { x: 188, y: 312 }, p2: { x: 174, y: 312 } },
    { p1: { x: 174, y: 312 }, p2: { x: 174, y: 52 } },

    // 2. Arco Superior de Lanzamiento (curva hacia la mesa superior)
    { p1: { x: 188, y: 34 },  p2: { x: 170, y: 14 } },
    { p1: { x: 170, y: 14 },  p2: { x: 135, y: 10 } },
    { p1: { x: 135, y: 10 },  p2: { x: 65,  y: 10 } },
    { p1: { x: 65,  y: 10 },  p2: { x: 26,  y: 28 } },

    // 3. Pared Lateral Izquierda Superior (Pantalla 1)
    { p1: { x: 26,  y: 28 },  p2: { x: 26,  y: 118 } },

    // 4. Guías hacia los Flippers Superiores (Pantalla 1)
    { p1: { x: 26,  y: 118 }, p2: { x: 38,  y: 130 } },
    { p1: { x: 38,  y: 130 }, p2: { x: 54,  y: 134 } },

    { p1: { x: 174, y: 118 }, p2: { x: 156, y: 130 } },
    { p1: { x: 156, y: 130 }, p2: { x: 140, y: 134 } },

    // 5. Paredes de la Mesa Inferior (Pantalla 2)
    { p1: { x: 26,  y: 154 }, p2: { x: 26,  y: 275 } },
    { p1: { x: 174, y: 154 }, p2: { x: 174, y: 275 } },

    // 6. Guías hacia los Flippers Inferiores (Inlanes suaves sin esquinas muertas)
    // Lado Izquierdo
    { p1: { x: 26,  y: 275 }, p2: { x: 42,  y: 290 } },
    { p1: { x: 42,  y: 290 }, p2: { x: 66,  y: 295 } },

    // Lado Derecho
    { p1: { x: 174, y: 275 }, p2: { x: 152, y: 290 } },
    { p1: { x: 152, y: 290 }, p2: { x: 128, y: 295 } }
];

function updatePhysics(dt) {
    if (!GameState.running || GameState.gameOver) return;

    // Reductor de combo
    if (GameState.comboTimer > 0) {
        GameState.comboTimer -= dt;
        if (GameState.comboTimer <= 0) {
            GameState.combo = 0;
            updateUI();
        }
    }

    // Temporizador de tilt / nudge
    if (GameState.nudgeResetTimer > 0) {
        GameState.nudgeResetTimer -= dt;
        if (GameState.nudgeResetTimer <= 0) GameState.nudgeCount = 0;
    }
    if (GameState.tiltTimer > 0) {
        GameState.tiltTimer -= dt;
        if (GameState.tiltTimer <= 0) {
            GameState.tiltActive = false;
        }
    }

    // Amortiguar temblor de pantalla
    GameState.shakeX *= 0.85;
    GameState.shakeY *= 0.85;

    // Actualizar animación de bumpers, kickers y slingshots
    GameState.bumpers.forEach(b => { if (b.lit > 0) b.lit -= dt * 4; });
    GameState.slingshots.forEach(s => { if (s.lit > 0) s.lit -= dt * 4; });
    GameState.sideKickers.forEach(k => { if (k.lit > 0) k.lit -= dt * 4; });

    // Actualizar los 4 Flippers (ambos pares responden juntos)
    const flippers = GameState.flippers;
    ['upperLeft', 'lowerLeft', 'upperRight', 'lowerRight'].forEach(key => {
        const f = flippers[key];
        if (GameState.tiltActive) {
            f.targetAngle = f.restAngle;
        } else {
            f.targetAngle = f.active ? f.upAngle : f.restAngle;
        }
        const dTheta = f.targetAngle - f.angle;
        f.angle += dTheta * Math.min(1.0, f.angularSpeed * dt);
    });

    // Carga del Plunger
    if (GameState.plunger.charging) {
        GameState.plunger.power = Math.min(1.0, GameState.plunger.power + dt * 1.8);
    }

    // Sub-stepping de física para garantizar precisión milimétrica sin túneles
    const SUB_STEPS = 4;
    const sdt = dt / SUB_STEPS;

    for (let step = 0; step < SUB_STEPS; step++) {
        GameState.balls.forEach((ball) => {
            if (!ball.active) return;

            // Bola reposando en el lanzador (plunger lane)
            if (ball.inPlunger) {
                ball.x = 180;
                ball.y = GameState.plunger.restY - 6 + GameState.plunger.power * 10;
                ball.vx = 0;
                ball.vy = 0;
                return;
            }

            // Gravedad y fricción
            ball.vy += GRAVITY * sdt;
            ball.vx *= Math.pow(DAMPING, sdt * 60);
            ball.vy *= Math.pow(DAMPING, sdt * 60);

            // Avance posicional
            ball.x += ball.vx * sdt;
            ball.y += ball.vy * sdt;

            // 1. Colisión con Paredes Estáticas
            tableWalls.forEach(wall => {
                collideBallWithSegment(ball, wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y, RESTITUTION_WALL, false);
            });

            // 2. Colisión con los 4 Flippers Dinámicos
            collideBallWithFlipper(ball, flippers.upperLeft);
            collideBallWithFlipper(ball, flippers.upperRight);
            collideBallWithFlipper(ball, flippers.lowerLeft);
            collideBallWithFlipper(ball, flippers.lowerRight);

            // 3. Colisión con Pop Bumpers
            GameState.bumpers.forEach(b => {
                const dx = ball.x - b.x;
                const dy = ball.y - b.y;
                const dist = Math.hypot(dx, dy);
                const minDist = ball.radius + b.radius;

                if (dist < minDist && dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;

                    ball.x = b.x + nx * minDist;
                    ball.y = b.y + ny * minDist;

                    const impulse = 180;
                    ball.vx = nx * impulse;
                    ball.vy = ny * impulse;

                    b.lit = 1.0;
                    audio.playBumper();
                    broadcastSFX('bumper');
                    addScore(b.points, b.x, b.y - 8);
                    createSparks(ball.x, ball.y, b.color, 10);
                }
            });

            // 4. Colisión con Slingshots
            GameState.slingshots.forEach(s => {
                const hit = collideBallWithSegment(ball, s.p1.x, s.p1.y, s.p2.x, s.p2.y, 1.35, true);
                if (hit) {
                    s.lit = 1.0;
                    audio.playSlingshot();
                    broadcastSFX('slingshot');
                    addScore(75, (s.p1.x + s.p2.x) / 2, (s.p1.y + s.p2.y) / 2);
                    createSparks(ball.x, ball.y, s.color, 8);
                }
            });

            // 5. Colisión con los Kickers Laterales (Side Kickers)
            GameState.sideKickers.forEach(k => {
                const dx = ball.x - k.x;
                const dy = ball.y - k.y;
                const dist = Math.hypot(dx, dy);
                const minDist = ball.radius + k.radius;

                if (dist < minDist && dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;

                    ball.x = k.x + nx * minDist;
                    ball.y = k.y + ny * minDist;

                    const impulse = 160;
                    ball.vx = nx * impulse;
                    ball.vy = ny * impulse;

                    k.lit = 1.0;
                    audio.playSlingshot();
                    addScore(100, k.x, k.y);
                    createSparks(k.x, k.y, k.color, 6);
                }
            });

            // 6. Colisión con las 5 Card Targets (Pantalla Inferior)
            GameState.cards.forEach(card => {
                if (card.flipped) return;
                if (ball.x + ball.radius > card.x && ball.x - ball.radius < card.x + card.w &&
                    ball.y + ball.radius > card.y && ball.y - ball.radius < card.y + card.h) {
                    
                    card.flipped = true;
                    ball.vy = Math.abs(ball.vy) * 0.85; // Rebote hacia abajo
                    audio.playCardFlip();
                    addScore(200, card.x + 6, card.y - 6);
                    createSparks(card.x + 6, card.y + 8, '#3dff8a', 8);

                    // Si se voltean las 5 tarjetas: ¡Gran Bonificación!
                    if (GameState.cards.every(c => c.flipped)) {
                        addScore(2500, 97, 180);
                        audio.playPlugActive();
                        GameState.popups.push({
                            text: '¡CARD BONUS +2500!',
                            x: 97,
                            y: 175,
                            vy: -15,
                            alpha: 1.0,
                            color: '#00f5d4'
                        });
                        setTimeout(() => {
                            GameState.cards.forEach(c => c.flipped = false);
                        }, 1200);
                    }
                }
            });

            // 7. Colisión con la Barrera de los Pingüinos (Pantalla Superior)
            // Barra de protección at y = 80
            if (ball.y > 76 && ball.y < 86 && ball.x > 82 && ball.x < 112) {
                ball.vy = -Math.abs(ball.vy) * 1.15;
                audio.playTarget();
                GameState.penguinHits++;
                addScore(150, 97, 80);
                createSparks(ball.x, ball.y, '#00f5d4', 6);

                // Cada 3 golpes activa el "Stop Plug" (Tapón salvavidas del drenaje)
                if (GameState.penguinHits >= 3) {
                    GameState.penguinHits = 0;
                    GameState.stopPlug.active = true;
                    GameState.stopPlug.timer = 18.0;
                    audio.playPlugActive();
                    GameState.popups.push({
                        text: '¡STOP PLUG ACTIVO!',
                        x: 97,
                        y: 70,
                        vy: -15,
                        alpha: 1.0,
                        color: '#ffea00'
                    });
                }
            }

            // 8. Colisión con el "Stop Plug" activo (Tapón salvavidas en el drenaje inferior)
            if (GameState.stopPlug.active) {
                const sp = GameState.stopPlug;
                const dx = ball.x - sp.x;
                const dy = ball.y - sp.y;
                const dist = Math.hypot(dx, dy);
                const minDist = ball.radius + sp.radius;

                if (dist < minDist && dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;

                    ball.x = sp.x + nx * minDist;
                    ball.y = sp.y + ny * minDist;

                    ball.vx = nx * 170;
                    ball.vy = -180; // Salvada espectacular hacia arriba

                    sp.active = false; // Se consume tras salvar la bola
                    audio.playSlingshot();
                    createSparks(sp.x, sp.y, '#ffea00', 14);
                    GameState.popups.push({
                        text: '¡SALVADA!',
                        x: 97,
                        y: 290,
                        vy: -20,
                        alpha: 1.0,
                        color: '#ffea00'
                    });
                }
            }

            // 9. Rollover Lanes superiores (500 puntos)
            GameState.rolloverLanes.forEach(lane => {
                if (Math.hypot(ball.x - lane.x, ball.y - lane.y) < 8) {
                    if (!lane.lit) {
                        lane.lit = true;
                        audio.playTarget();
                        addScore(lane.points, lane.x, lane.y);
                        createSparks(lane.x, lane.y, '#ffffff', 6);
                    }
                }
            });

            // 10. Salida del Plunger hacia la mesa
            if (ball.y < 38 && ball.x < 172 && ball.inPlunger) {
                ball.inPlunger = false;
            }

            // Si la bola vuelve a caer en el canal del plunger
            if (ball.x > 172 && ball.y > 270 && ball.vy >= 0 && !ball.inPlunger) {
                ball.inPlunger = true;
                ball.x = 180;
                ball.y = 295;
                ball.vx = 0;
                ball.vy = 0;
            }

            // 11. Drenaje de la bola (Drain al fondo de la pantalla inferior)
            if (ball.y > TABLE_HEIGHT + 10) {
                ball.active = false;
            }
        });
    }

    // Filtrar bolas activas y verificar pérdida de bola
    GameState.balls = GameState.balls.filter(b => b.active);

    if (GameState.balls.length === 0) {
        audio.playDrain();
        broadcastSFX('drain');
        GameState.ballsLeft--;
        updateUI();

        if (GameState.ballsLeft > 0) {
            setTimeout(() => {
                spawnBallInPlunger();
            }, 800);
        } else {
            endGame();
        }
    }

    // Cámara dinámica inteligente: Sigue la bola activa entre las 2 pantallas
    if (GameState.balls.length > 0) {
        const leadBall = GameState.balls[0];
        if (leadBall.inPlunger) {
            GameState.targetCamY = 160; // Mostrar el lanzador en la pantalla inferior
        } else if (leadBall.y < 145) {
            GameState.targetCamY = 0;   // Pantalla Superior (Upper Tier)
        } else if (leadBall.y > 175) {
            GameState.targetCamY = 160; // Pantalla Inferior (Lower Tier)
        }
    }

    // Interpolación suave de cámara a 60fps
    GameState.camY += (GameState.targetCamY - GameState.camY) * Math.min(1.0, dt * 7.5);

    // Actualizar partículas
    for (let i = GameState.particles.length - 1; i >= 0; i--) {
        const p = GameState.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) GameState.particles.splice(i, 1);
    }

    // Actualizar popups de puntuación
    for (let i = GameState.popups.length - 1; i >= 0; i--) {
        const pop = GameState.popups[i];
        pop.y += pop.vy * dt;
        pop.alpha -= dt * 0.9;
        if (pop.alpha <= 0) GameState.popups.splice(i, 1);
    }

    // Detección de bola estancada: si la bola ha sido lanzada y deja de moverse por > 2.0s, reiniciar el juego
    GameState.balls.forEach(ball => {
        if (!ball.active || !ball.hasLaunched) {
            ball.stuckTimer = 0;
            ball.lastX = ball.x;
            ball.lastY = ball.y;
            return;
        }

        const speed = Math.hypot(ball.vx, ball.vy);
        const distMoved = Math.hypot(ball.x - (ball.lastX ?? ball.x), ball.y - (ball.lastY ?? ball.y));

        // Si la bola casi no tiene velocidad o su posición no cambia
        if (speed < 7.0 && distMoved < 2.0) {
            ball.stuckTimer = (ball.stuckTimer || 0) + dt;
            if (ball.stuckTimer >= 2.0) {
                ball.stuckTimer = 0;
                audio.playDrain();
                startNewGame();
                GameState.popups.push({
                    text: '¡BOLA ESTANCADA - REINICIANDO!',
                    x: 97,
                    y: 160,
                    vy: -15,
                    alpha: 1.0,
                    color: '#ff4d6d'
                });
            }
        } else {
            ball.stuckTimer = 0;
            ball.lastX = ball.x;
            ball.lastY = ball.y;
        }
    });
}

// Colisión Dinámica con Flipper (aporta velocidad angular del golpe)
function collideBallWithFlipper(ball, flipper) {
    const tipX = flipper.pivotX + Math.cos(flipper.angle) * flipper.length;
    const tipY = flipper.pivotY + Math.sin(flipper.angle) * flipper.length;

    const dx = tipX - flipper.pivotX;
    const dy = tipY - flipper.pivotY;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return;

    let t = ((ball.x - flipper.pivotX) * dx + (ball.y - flipper.pivotY) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const nearX = flipper.pivotX + t * dx;
    const nearY = flipper.pivotY + t * dy;

    const distX = ball.x - nearX;
    const distY = ball.y - nearY;
    const dist = Math.hypot(distX, distY);

    if (dist < ball.radius + 2.5 && dist > 0) {
        const nx = distX / dist;
        const ny = distY / dist;

        ball.x = nearX + nx * (ball.radius + 2.5);
        ball.y = nearY + ny * (ball.radius + 2.5);

        // Velocidad lineal del punto de impacto sobre la pala del flipper
        const contactDist = Math.hypot(nearX - flipper.pivotX, nearY - flipper.pivotY);
        const omega = (flipper.targetAngle - fAngleToRest(flipper)) * 4.0;
        const flipperVx = -Math.sin(Math.atan2(dy, dx)) * omega * contactDist;
        const flipperVy = Math.cos(Math.atan2(dy, dx)) * omega * contactDist;

        const relVx = ball.vx - flipperVx;
        const relVy = ball.vy - flipperVy;
        const dot = relVx * nx + relVy * ny;

        if (dot < 0) {
            const restitution = 0.85;
            ball.vx = (relVx - 2 * dot * nx) * restitution + flipperVx;
            ball.vy = (relVy - 2 * dot * ny) * restitution + flipperVy;

            // Impulso extra si el flipper se movió bruscamente hacia arriba
            if (flipper.active) {
                ball.vy -= 85;
                createSparks(ball.x, ball.y, '#ffffff', 5);
            }
        }
    }
}

function fAngleToRest(f) {
    return f.active ? f.upAngle : f.restAngle;
}

function collideBallWithSegment(ball, x1, y1, x2, y2, restitution = 0.8, isSlingshot = false) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return false;

    let t = ((ball.x - x1) * dx + (ball.y - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const nearX = x1 + t * dx;
    const nearY = y1 + t * dy;

    const distX = ball.x - nearX;
    const distY = ball.y - nearY;
    const dist = Math.hypot(distX, distY);

    if (dist < ball.radius && dist > 0) {
        const nx = distX / dist;
        const ny = distY / dist;

        ball.x = nearX + nx * ball.radius;
        ball.y = nearY + ny * ball.radius;

        const dot = ball.vx * nx + ball.vy * ny;
        if (dot < 0) {
            const bouncePower = isSlingshot ? 150 : 0;
            ball.vx = (ball.vx - 2 * dot * nx) * restitution + nx * bouncePower;
            ball.vy = (ball.vy - 2 * dot * ny) * restitution + ny * bouncePower;
            return true;
        }
    }
    return false;
}

function createSparks(x, y, color = '#3dff8a', count = 8) {
    for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 20 + Math.random() * 55;
        GameState.particles.push({
            x: x,
            y: y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 10,
            life: 0.2 + Math.random() * 0.25,
            color: color,
            size: 1.5
        });
    }
}

// ==========================================
// 🎨 Renderizado de la Mesa NES en Canvas
// ==========================================
function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    // Aplicar temblor de tilt y desplazamiento de cámara vertical
    ctx.translate(GameState.shakeX, -Math.round(GameState.camY) + GameState.shakeY);

    // 1. Fondo de la Mesa Arcade
    ctx.fillStyle = '#08100d';
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // Cuadrícula retro sutil
    ctx.strokeStyle = 'rgba(61, 255, 138, 0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 26; x <= 174; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, TABLE_HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y <= TABLE_HEIGHT; y += 16) {
        ctx.beginPath();
        ctx.moveTo(26, y);
        ctx.lineTo(174, y);
        ctx.stroke();
    }

    // 2. Línea divisoria decorativa entre Pantalla Superior e Inferior (y = 160)
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(26, 160);
    ctx.lineTo(174, 160);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Renderizado de Paredes de la Mesa
    ctx.strokeStyle = '#3dff8a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    tableWalls.forEach(w => {
        ctx.moveTo(w.p1.x, w.p1.y);
        ctx.lineTo(w.p2.x, w.p2.y);
    });
    ctx.stroke();

    // Pared divisoria del Plunger
    ctx.strokeStyle = '#1f7d49';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(174, 52);
    ctx.lineTo(174, 312);
    ctx.stroke();

    // 4. Puerta antirretorno del Plunger (One-way gate en la curva superior)
    ctx.strokeStyle = '#ffea00';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(174, 52);
    ctx.lineTo(188, 42);
    ctx.stroke();

    // ==========================================
    // PANTALLA SUPERIOR (Mesa 1: y = 0..160)
    // ==========================================
    // A. Rollover Lanes Superiores (500 pts)
    GameState.rolloverLanes.forEach(lane => {
        ctx.fillStyle = lane.lit ? '#ffea00' : 'rgba(255, 234, 0, 0.2)';
        ctx.font = '5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▼', lane.x, lane.y - 3);
        ctx.fillText(lane.label, lane.x, lane.y + 6);
    });

    // B. Chute Izquierdo Curvo (100 pts)
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(36, 60, 10, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
    ctx.fillStyle = '#00f5d4';
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.fillText('100', 36, 44);

    // C. Chute Verde Derecho (500 pts)
    ctx.fillStyle = 'rgba(61, 255, 138, 0.25)';
    ctx.fillRect(150, 42, 14, 24);
    ctx.strokeStyle = '#3dff8a';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(150, 42, 14, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.fillText('500', 157, 56);

    // D. Barrera de Pingüinos y Target Superior (Stop Plug Trigger)
    // Barrera de protección horizontal
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(84, 76, 26, 3);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(84, 76, 26, 3);

    // 3 Pequeños Objetivos Pingüino
    for (let pIdx = 0; pIdx < 3; pIdx++) {
        const px = 88 + pIdx * 9;
        ctx.fillStyle = GameState.penguinHits > pIdx ? '#ffea00' : '#00f5d4';
        ctx.fillRect(px - 3, 85, 6, 6);
    }

    // ==========================================
    // PANTALLA INFERIOR (Mesa 2: y = 160..320)
    // ==========================================
    // A. 5 Card Targets de NES Pinball (y = 182)
    GameState.cards.forEach(card => {
        if (card.flipped) {
            ctx.fillStyle = 'rgba(61, 255, 138, 0.15)';
            ctx.fillRect(card.x, card.y + card.h - 2, card.w, 2);
        } else {
            ctx.fillStyle = '#102b1f';
            ctx.fillRect(card.x, card.y, card.w, card.h);
            ctx.strokeStyle = card.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(card.x, card.y, card.w, card.h);

            ctx.font = '7px "Press Start 2P", monospace';
            ctx.fillStyle = card.color;
            ctx.textAlign = 'center';
            ctx.fillText(card.label, card.x + card.w / 2, card.y + 11);
        }
    });

    // B. Escalera de Bonus NES (1 a 7 en pared lateral izquierda)
    for (let b = 1; b <= 7; b++) {
        const by = 252 - (b - 1) * 7;
        const isLit = GameState.bonusLadder >= b;
        ctx.fillStyle = isLit ? '#ffea00' : '#14281c';
        ctx.fillRect(29, by, 8, 5);
        ctx.font = '4px "Press Start 2P", monospace';
        ctx.fillStyle = isLit ? '#000000' : '#4a755d';
        ctx.textAlign = 'center';
        ctx.fillText(b.toString(), 33, by + 4);
    }

    // C. Carril Rayado Rosado (Pink Ladder en pared lateral derecha)
    for (let r = 0; r < 5; r++) {
        const ry = 216 + r * 6;
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(168, ry, 5, 2);
    }

    // D. Pop Bumpers (Superiores e Inferiores)
    GameState.bumpers.forEach(b => {
        ctx.save();
        const glow = b.lit > 0 ? 12 : 3;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = glow;

        ctx.fillStyle = b.lit > 0 ? '#ffffff' : b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#06130e';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '5px "Press Start 2P", monospace';
        ctx.fillStyle = b.color;
        ctx.textAlign = 'center';
        ctx.fillText(b.label, b.x, b.y + 2);

        ctx.restore();
    });

    // E. Kickers Redondos Laterales (Brown Bumpers NES)
    GameState.sideKickers.forEach(k => {
        ctx.fillStyle = k.lit > 0 ? '#ffffff' : k.color;
        ctx.beginPath();
        ctx.arc(k.x, k.y, k.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.6;
        ctx.stroke();
    });

    // F. Slingshots Inferiores
    GameState.slingshots.forEach(s => {
        ctx.fillStyle = s.lit > 0 ? '#ffffff' : '#142a1e';
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(s.p1.x, s.p1.y);
        ctx.lineTo(s.p2.x, s.p2.y);
        ctx.lineTo(s.p3.x, s.p3.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });

    // G. Flippers Superiores e Inferiores
    const renderFlipper = (f, isLeft) => {
        const tipX = f.pivotX + Math.cos(f.angle) * f.length;
        const tipY = f.pivotY + Math.sin(f.angle) * f.length;

        ctx.save();
        const color = isLeft ? '#00f5d4' : '#3dff8a';
        ctx.shadowColor = color;
        ctx.shadowBlur = f.active ? 8 : 2;

        ctx.strokeStyle = color;
        ctx.lineWidth = f.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(f.pivotX, f.pivotY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        // Recubrimiento de goma blanco
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = f.width * 0.45;
        ctx.beginPath();
        ctx.moveTo(f.pivotX, f.pivotY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        // Pivote
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(f.pivotX, f.pivotY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    };

    renderFlipper(GameState.flippers.upperLeft, true);
    renderFlipper(GameState.flippers.upperRight, false);
    renderFlipper(GameState.flippers.lowerLeft, true);
    renderFlipper(GameState.flippers.lowerRight, false);

    // H. Tapón Salvavidas NES (Stop Plug en drenaje inferior)
    if (GameState.stopPlug.active) {
        const sp = GameState.stopPlug;
        ctx.save();
        ctx.shadowColor = '#ffea00';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // I. Plunger / Resorte Lanzador (Fondo mesa inferior)
    const p = GameState.plunger;
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 2;
    const springY = p.restY + p.power * 10;
    ctx.beginPath();
    ctx.moveTo(p.x, 312);
    ctx.lineTo(p.x, springY);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(p.x - 4, springY - 2, 8, 3);

    // J. Bolas de Pinball Cromadas
    GameState.balls.forEach(ball => {
        ctx.save();
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 5;

        const grad = ctx.createRadialGradient(
            ball.x - 1, ball.y - 1, 0.5,
            ball.x, ball.y, ball.radius
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#d8e6df');
        grad.addColorStop(1, '#688c7b');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });

    // K. Partículas
    GameState.particles.forEach(pt => {
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    });

    // L. Popups de Puntuación
    GameState.popups.forEach(pop => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pop.alpha);
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.fillStyle = pop.color;
        ctx.textAlign = 'center';
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
    });

    // M. Mensaje de TILT si está activo
    if (GameState.tiltActive) {
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = '#ff4d6d';
        ctx.textAlign = 'center';
        ctx.fillText('¡TILT!', 97, GameState.camY + 80);
    }

    ctx.restore();

    // 4. Indicador HUD Fijo de Cámara en Pantalla (▲ MESA SUPERIOR / ▼ MESA INFERIOR)
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(61, 255, 138, 0.4)';
    ctx.textAlign = 'right';
    const tierText = GameState.camY < 80 ? '▲ PANTALLA 1' : '▼ PANTALLA 2';
    ctx.fillText(tierText, CANVAS_WIDTH - 6, 12);
}

function updateUI() {
    scoreElement.textContent = `SCORE: ${GameState.score.toString().padStart(6, '0')}`;
    highScoreElement.textContent = `HI: ${GameState.highScore.toString().padStart(6, '0')}`;
    livesCountElement.textContent = GameState.ballsLeft;
    multCountElement.textContent = `${GameState.multiplier}X`;
    comboMeterElement.textContent = `COMBO: ${GameState.combo}`;
}

// ==========================================
// 🔁 Game Loop & Lifecycle
// ==========================================
function gameLoop(timestamp) {
    if (!GameState.lastTime) GameState.lastTime = timestamp;
    const dt = Math.min((timestamp - GameState.lastTime) / 1000, 0.04);
    GameState.lastTime = timestamp;

    updatePhysics(dt);
    render();

    requestAnimationFrame(gameLoop);
}

// ==========================================
// 🕹️ Entrada de Controles (Flippers, Plunger y Tilt)
// ==========================================
function activateFlipper(side, active) {
    if (GameState.tiltActive) return;

    if (side === 'left') {
        GameState.flippers.upperLeft.active = active;
        GameState.flippers.lowerLeft.active = active;
    } else {
        GameState.flippers.upperRight.active = active;
        GameState.flippers.lowerRight.active = active;
    }

    if (active) audio.playFlipper(true);
    else audio.playFlipper(false);
}

function chargePlunger() {
    GameState.plunger.charging = true;
}

function releasePlunger() {
    if (!GameState.plunger.charging && GameState.plunger.power === 0) {
        GameState.plunger.power = 0.9;
    }
    GameState.plunger.charging = false;

    GameState.balls.forEach(ball => {
        if (ball.inPlunger) {
            ball.inPlunger = false;
            ball.hasLaunched = true;
            ball.stuckTimer = 0;
            ball.lastX = ball.x;
            ball.lastY = ball.y;
            // Impulso potente que recorre todo el canal vertical hasta la mesa superior
            const shootVelocity = -360 - GameState.plunger.power * 140;
            ball.vy = shootVelocity;
            ball.vx = (Math.random() - 0.5) * 8;
            audio.playLaunch();
            broadcastSFX('launch');
        }
    });

    GameState.plunger.power = 0;
}

function nudgeTable() {
    if (GameState.tiltActive) return;

    GameState.nudgeCount++;
    GameState.nudgeResetTimer = 3.5;

    if (GameState.nudgeCount >= 3) {
        GameState.tiltActive = true;
        GameState.tiltTimer = 3.0;
        broadcastSFX('drain');
        return;
    }

    GameState.shakeX = (Math.random() - 0.5) * 6;
    GameState.shakeY = (Math.random() - 0.5) * 4;

    GameState.balls.forEach(b => {
        b.vx += (Math.random() - 0.5) * 35;
        b.vy -= 15;
    });
}

// Controles de Teclado
window.addEventListener('keydown', (e) => {
    audio.init();
    const key = e.key.toLowerCase();

    // Tecla 'R' para reiniciar partida manualmente en cualquier momento
    if (key === 'r') {
        startNewGame();
        return;
    }

    if (['arrowleft', 'a', 'z'].includes(key)) {
        if (!GameState.running || GameState.gameOver) {
            startNewGame();
            return;
        }
        activateFlipper('left', true);
    } else if (['arrowright', 'd', 'x', '/'].includes(key)) {
        if (!GameState.running || GameState.gameOver) {
            startNewGame();
            return;
        }
        activateFlipper('right', true);
    } else if (key === ' ' || key === 'arrowdown' || key === 'enter') {
        if (!GameState.running || GameState.gameOver) {
            startNewGame();
            return;
        }
        chargePlunger();
    } else if (key === 'w' || key === 'arrowup') {
        nudgeTable();
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (['arrowleft', 'a', 'z'].includes(key)) {
        activateFlipper('left', false);
    } else if (['arrowright', 'd', 'x', '/'].includes(key)) {
        activateFlipper('right', false);
    } else if (key === ' ' || key === 'arrowdown' || key === 'enter') {
        releasePlunger();
    }
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

if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.toggle();
    });
}

// ==========================================
// 🏆 Hall of Fame
// ==========================================
function loadRanking() {
    try {
        const ranking = JSON.parse(localStorage.getItem('pinball-ranking')) || [];
        if (ranking.length > 0) {
            GameState.highScore = ranking[0].score;
            updateUI();
        }
        displayRanking(ranking);
    } catch (_) {}
}

function saveScore(nickname, score) {
    if (score === 0) return;
    try {
        let ranking = JSON.parse(localStorage.getItem('pinball-ranking')) || [];
        ranking = ranking.filter(entry => !(entry.name === nickname && entry.score < score));
        if (!ranking.some(entry => entry.name === nickname && entry.score === score)) {
            ranking.push({ name: nickname, score: score, date: new Date().toLocaleDateString() });
        }
        ranking.sort((a, b) => b.score - a.score);
        ranking = ranking.slice(0, 5);
        localStorage.setItem('pinball-ranking', JSON.stringify(ranking));
        displayRanking(ranking);
    } catch (_) {}
}

function displayRanking(ranking) {
    if (rankingList) {
        rankingList.innerHTML = ranking.slice(0, 5).map((entry, idx) => `
            <li>
                <span class="rank">${idx + 1}.</span>
                <span class="nick">${entry.name.toUpperCase().substring(0, 10)}</span>
                <span class="score">${entry.score.toString().padStart(6, '0')}</span>
            </li>
        `).join('');
    }
}

// ==========================================
// 📡 Señalización WebRTC y WebSockets
// ==========================================
const peerConnections = new Map();
const dataChannels = new Map();
let socket;

function updateQrCode() {
    const qrContainer = document.getElementById('qrcode');
    if (!qrContainer || typeof QRCode === 'undefined') return;

    qrContainer.innerHTML = '';
    const baseUrl = CONFIG.CONTROL_URL;
    const finalUrl = baseUrl.includes('?') 
        ? `${baseUrl}&room=${GameState.roomId}` 
        : `${baseUrl}?room=${GameState.roomId}`;

    new QRCode(qrContainer, {
        text: finalUrl,
        width: 160,
        height: 160,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });

    if (roomSpan) roomSpan.textContent = `ID: ${GameState.roomId}`;
}

function connectSignaling() {
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
                roomId: GameState.roomId
            }));
        };

        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                const playerId = data.playerId;

                if (data.type === 'controller_connected') {
                    if (waitingOverlay) waitingOverlay.classList.add('hidden');
                } else if (data.type === 'offer') {
                    const pc = new RTCPeerConnection(getIceConfig());
                    peerConnections.set(playerId, pc);
                    pc._pendingCandidates = [];

                    pc.ondatachannel = (e) => {
                        const dc = e.channel;
                        dataChannels.set(playerId, dc);
                        setupDataChannel(dc, playerId);
                    };

                    pc.onicecandidate = (e) => {
                        if (e.candidate && socket && socket.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({
                                type: 'candidate',
                                candidate: e.candidate,
                                roomId: GameState.roomId,
                                playerId: playerId
                            }));
                        }
                    };

                    const sdp = typeof data.sdp === 'string' ? data.sdp : (data.sdp?.sdp || '');
                    await pc.setRemoteDescription(new RTCSessionDescription({
                        type: 'offer',
                        sdp: sdp
                    }));

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
                        playerId: playerId
                    }));
                } else if (data.type === 'candidate') {
                    const pc = peerConnections.get(playerId);
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
                    handleControllerDisconnect(playerId);
                }
            } catch (err) {
                console.error('Error WS:', err);
            }
        };

        socket.onclose = () => {
            setTimeout(connectSignaling, 3000);
        };
    } catch (_) {}
}

function handleControllerDisconnect(playerId) {
    peerConnections.delete(playerId);
    dataChannels.delete(playerId);
    if (dataChannels.size === 0 && !GameState.running) {
        waitingOverlay.classList.remove('hidden');
    }
}

function setupDataChannel(dc, senderId) {
    dc.onopen = () => {
        waitingOverlay.classList.add('hidden');
    };

    dc.onclose = () => {
        handleControllerDisconnect(senderId);
    };

    dc.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'join' || data.type === 'nickname') {
                GameState.currentNickname = data.nickname || data.value || 'Player';
                playerNickElement.textContent = `PLAYER: ${GameState.currentNickname.toUpperCase()}`;
                startNewGame();
            } else if (data.action === 'FLIPPER_LEFT_DOWN') {
                activateFlipper('left', true);
            } else if (data.action === 'FLIPPER_LEFT_UP') {
                activateFlipper('left', false);
            } else if (data.action === 'FLIPPER_RIGHT_DOWN') {
                activateFlipper('right', true);
            } else if (data.action === 'FLIPPER_RIGHT_UP') {
                activateFlipper('right', false);
            } else if (data.action === 'LAUNCH_CHARGE') {
                chargePlunger();
            } else if (data.action === 'LAUNCH_RELEASE') {
                releasePlunger();
            } else if (data.action === 'NUDGE') {
                nudgeTable();
            }
        } catch (_) {}
    };
}

// ==========================================
// 📐 AutoScale Multi-Stage Engine
// ==========================================
function autoScale() {
    const container = document.querySelector('.container');
    if (!container) return;

    container.style.transform = 'none';
    const naturalW = container.offsetWidth || 480;
    const naturalH = container.offsetHeight || 440;

    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const scaleX = (winW * 0.96) / naturalW;
    const scaleY = (winH * 0.96) / naturalH;
    const scale = Math.min(scaleX, scaleY, 2.8);

    container.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', autoScale);
window.addEventListener('load', () => {
    updateQrCode();
    autoScale();
});
if (document.fonts && document.fonts.ready) document.fonts.ready.then(autoScale);
if (window.ResizeObserver) new ResizeObserver(() => autoScale()).observe(document.body);
[0, 50, 150, 300, 600, 1200].forEach(d => setTimeout(autoScale, d));

// ==========================================
// 🚀 Lanzamiento Inicial
// ==========================================
initTableElements();
spawnBallInPlunger();
loadRanking();
updateUI();
updateQrCode();
autoScale();
requestAnimationFrame(gameLoop);
connectSignaling();
