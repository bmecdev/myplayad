// Pinball Arcade - Retro Neon Table Engine
// Full Pure Arcade Standard: 200x160 internal canvas, WebRTC DataChannel, Web Audio API

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 160;

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
            const f = up ? 240 : 160;
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
            osc.frequency.setValueAtTime(900, t);
            osc.frequency.exponentialRampToValueAtTime(1600, t + 0.06);
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.07);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.07);
        } catch (_) {}
    }

    playRollover() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.setValueAtTime(1500, t + 0.04);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.09);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.09);
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
            osc.frequency.exponentialRampToValueAtTime(800, t + 0.18);
            gain.gain.setValueAtTime(0.45, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.22);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.22);
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

    playMultiball() {
        if (!this.ctx || this.muted) return;
        try {
            const notes = [440, 554, 659, 880];
            notes.forEach((freq, idx) => {
                const t = this.ctx.currentTime + idx * 0.07;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
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

    // Plunger (Resorte lanzador)
    plunger: {
        charging: false,
        power: 0,            // 0 a 1
        x: 172,
        y: 148,
        restY: 148,
        maxChargeY: 156
    },

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
    dropTargets: [],
    rolloverLanes: [],
    particles: [],
    popups: [],

    // Flippers
    flippers: {
        left: {
            pivotX: 68,
            pivotY: 136,
            length: 24,
            width: 5,
            angle: 0.48,       // radianes reposo (~27.5°)
            restAngle: 0.48,
            upAngle: -0.42,    // radianes arriba (~-24°)
            targetAngle: 0.48,
            angularSpeed: 24,  // rad/s
            active: false
        },
        right: {
            pivotX: 122,
            pivotY: 136,
            length: 24,
            width: 5,
            angle: Math.PI - 0.48,
            restAngle: Math.PI - 0.48,
            upAngle: Math.PI + 0.42,
            targetAngle: Math.PI - 0.48,
            angularSpeed: 24,
            active: false
        }
    }
};

// ==========================================
// 📐 Inicialización de la Mesa de Pinball
// ==========================================
function initTableElements() {
    // 3 Pop Bumpers con luces y física reflectante
    GameState.bumpers = [
        { id: 1, x: 74,  y: 50, radius: 8.5, lit: 0, color: '#00f5d4', edge: '#ffffff', points: 100 },
        { id: 2, x: 116, y: 50, radius: 8.5, lit: 0, color: '#ff007f', edge: '#ffffff', points: 100 },
        { id: 3, x: 95,  y: 72, radius: 9.0, lit: 0, color: '#3dff8a', edge: '#ffffff', points: 150 }
    ];

    // 2 Slingshots triangulares sobre los inlanes
    GameState.slingshots = [
        {
            side: 'left',
            p1: { x: 50, y: 106 },
            p2: { x: 64, y: 124 },
            p3: { x: 50, y: 124 },
            lit: 0,
            color: '#ffb703'
        },
        {
            side: 'right',
            p1: { x: 140, y: 106 },
            p2: { x: 126, y: 124 },
            p3: { x: 140, y: 124 },
            lit: 0,
            color: '#ffb703'
        }
    ];

    // 4 Drop Targets en la pared lateral izquierda
    GameState.dropTargets = [
        { x: 30, y: 52, w: 4, h: 7, down: false, color: '#ffea00' },
        { x: 30, y: 62, w: 4, h: 7, down: false, color: '#ffea00' },
        { x: 30, y: 72, w: 4, h: 7, down: false, color: '#ffea00' },
        { x: 30, y: 82, w: 4, h: 7, down: false, color: '#ffea00' }
    ];

    // 3 Rollover Lanes superiores (A - B - C)
    GameState.rolloverLanes = [
        { letter: 'A', x: 70,  y: 22, lit: false, color: '#00f5d4' },
        { letter: 'B', x: 95,  y: 18, lit: false, color: '#ffea00' },
        { letter: 'C', x: 120, y: 22, lit: false, color: '#ff007f' }
    ];
}

// Carga una nueva bola en el shooter lane
function spawnBallInPlunger() {
    GameState.balls.push({
        x: 172,
        y: 140,
        vx: 0,
        vy: 0,
        radius: 3.2,
        active: true,
        inPlunger: true,
        trail: []
    });
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

function addScore(points, x = 100, y = 80) {
    const total = points * GameState.multiplier;
    GameState.score += total;
    GameState.combo++;
    GameState.comboTimer = 2.0;

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

function triggerMultiball() {
    audio.playMultiball();
    broadcastSFX('multiball');
    GameState.popups.push({
        text: '¡MULTIBOLA!',
        x: 100,
        y: 60,
        vy: -15,
        alpha: 1.0,
        color: '#ffea00'
    });

    // Spawnea una bola extra desde el centro
    GameState.balls.push({
        x: 95,
        y: 40,
        vx: (Math.random() - 0.5) * 60,
        vy: -40,
        radius: 3.2,
        active: true,
        inPlunger: false,
        trail: []
    });
}

// ==========================================
// ⚙️ Física y Colisiones de Mesa de Pinball
// ==========================================
const GRAVITY = 180;
const DAMPING = 0.999;
const RESTITUTION_WALL = 0.75;

// Paredes estáticas de la mesa (Segmentos de línea)
const tableWalls = [
    // Borde izquierdo exterior
    { p1: { x: 26, y: 140 }, p2: { x: 26, y: 40 } },
    // Arco superior exterior izquierdo
    { p1: { x: 26, y: 40 },  p2: { x: 50, y: 16 } },
    // Arco superior central
    { p1: { x: 50, y: 16 },  p2: { x: 145, y: 16 } },
    // Curva que recibe la bola del lanzador
    { p1: { x: 145, y: 16 }, p2: { x: 178, y: 36 } },
    // Pared exterior derecha del plunger lane
    { p1: { x: 178, y: 36 }, p2: { x: 178, y: 156 } },
    // Fondo del plunger
    { p1: { x: 178, y: 156 }, p2: { x: 166, y: 156 } },
    // Pared divisoria del plunger lane (lado izquierdo del canal)
    { p1: { x: 166, y: 156 }, p2: { x: 166, y: 44 } },

    // Guías de los inlanes/outlanes inferiores
    // Lado izquierdo: pared inclinada hacia el flipper
    { p1: { x: 26, y: 122 }, p2: { x: 44, y: 136 } },
    { p1: { x: 44, y: 136 }, p2: { x: 68, y: 142 } },
    // Lado derecho: pared inclinada hacia el flipper derecho
    { p1: { x: 166, y: 122 }, p2: { x: 148, y: 136 } },
    { p1: { x: 148, y: 136 }, p2: { x: 122, y: 142 } }
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

    // Actualizar animación de bumpers y slingshots
    GameState.bumpers.forEach(b => { if (b.lit > 0) b.lit -= dt * 4; });
    GameState.slingshots.forEach(s => { if (s.lit > 0) s.lit -= dt * 4; });

    // Actualizar Flippers (movimiento angular fluido)
    const fl = GameState.flippers.left;
    const fr = GameState.flippers.right;

    if (GameState.tiltActive) {
        fl.targetAngle = fl.restAngle;
        fr.targetAngle = fr.restAngle;
    } else {
        fl.targetAngle = fl.active ? fl.upAngle : fl.restAngle;
        fr.targetAngle = fr.active ? fr.upAngle : fr.restAngle;
    }

    const dThetaL = fl.targetAngle - fl.angle;
    fl.angle += dThetaL * Math.min(1.0, fl.angularSpeed * dt);

    const dThetaR = fr.targetAngle - fr.angle;
    fr.angle += dThetaR * Math.min(1.0, fr.angularSpeed * dt);

    // Carga del Plunger
    if (GameState.plunger.charging) {
        GameState.plunger.power = Math.min(1.0, GameState.plunger.power + dt * 1.8);
    }

    // Sub-stepping de física para evitar túneles
    const SUB_STEPS = 4;
    const sdt = dt / SUB_STEPS;

    for (let step = 0; step < SUB_STEPS; step++) {
        GameState.balls.forEach((ball, bIdx) => {
            if (!ball.active) return;

            // Bola en el plunger lane reposando sobre el resorte
            if (ball.inPlunger) {
                ball.x = 172;
                ball.y = GameState.plunger.restY - 6 + GameState.plunger.power * 8;
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

            // 2. Colisión con Flippers Dinámicos
            // Flipper Izquierdo
            const tipLX = fl.pivotX + Math.cos(fl.angle) * fl.length;
            const tipLY = fl.pivotY + Math.sin(fl.angle) * fl.length;
            const flipperOmegaL = (dThetaL * Math.min(1.0, fl.angularSpeed * dt)) / sdt;
            collideBallWithFlipper(ball, fl.pivotX, fl.pivotY, tipLX, tipLY, flipperOmegaL);

            // Flipper Derecho
            const tipRX = fr.pivotX + Math.cos(fr.angle) * fr.length;
            const tipRY = fr.pivotY + Math.sin(fr.angle) * fr.length;
            const flipperOmegaR = (dThetaR * Math.min(1.0, fr.angularSpeed * dt)) / sdt;
            collideBallWithFlipper(ball, fr.pivotX, fr.pivotY, tipRX, tipRY, flipperOmegaR);

            // 3. Colisión con Pop Bumpers Circulares
            GameState.bumpers.forEach(b => {
                const dx = ball.x - b.x;
                const dy = ball.y - b.y;
                const dist = Math.hypot(dx, dy);
                const minDist = ball.radius + b.radius;

                if (dist < minDist && dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Posicionar fuera
                    ball.x = b.x + nx * minDist;
                    ball.y = b.y + ny * minDist;

                    // Impulso potente de rebote radial
                    const impulse = 175;
                    ball.vx = nx * impulse;
                    ball.vy = ny * impulse;

                    b.lit = 1.0;
                    audio.playBumper();
                    broadcastSFX('bumper');
                    addScore(b.points, b.x, b.y - 10);
                    createSparks(ball.x, ball.y, b.color, 12);
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

            // 5. Colisión con Drop Targets
            GameState.dropTargets.forEach(dt => {
                if (dt.down) return;
                if (ball.x + ball.radius > dt.x && ball.x - ball.radius < dt.x + dt.w &&
                    ball.y + ball.radius > dt.y && ball.y - ball.radius < dt.y + dt.h) {
                    dt.down = true;
                    ball.vx = Math.abs(ball.vx) * 0.9;
                    audio.playTarget();
                    addScore(250, dt.x + 12, dt.y);
                    createSparks(dt.x, dt.y, dt.color, 6);

                    // Si todos están derribados, reset y multiball
                    if (GameState.dropTargets.every(t => t.down)) {
                        setTimeout(() => {
                            GameState.dropTargets.forEach(t => t.down = false);
                            triggerMultiball();
                        }, 500);
                    }
                }
            });

            // 6. Rollover Lanes superiores
            GameState.rolloverLanes.forEach(lane => {
                if (Math.hypot(ball.x - lane.x, ball.y - lane.y) < 7) {
                    if (!lane.lit) {
                        lane.lit = true;
                        audio.playRollover();
                        addScore(150, lane.x, lane.y);
                        createSparks(lane.x, lane.y, lane.color, 5);

                        // Si todas están encendidas, sube el multiplicador
                        if (GameState.rolloverLanes.every(l => l.lit)) {
                            GameState.multiplier = Math.min(5, GameState.multiplier + 1);
                            multCountElement.textContent = `${GameState.multiplier}X`;
                            GameState.popups.push({
                                text: `MULT ${GameState.multiplier}X!`,
                                x: 95,
                                y: 35,
                                vy: -15,
                                alpha: 1.0,
                                color: '#00f5d4'
                            });
                            setTimeout(() => {
                                GameState.rolloverLanes.forEach(l => l.lit = false);
                            }, 1200);
                        }
                    }
                }
            });

            // 7. Puerta antirretorno del plunger (lane superior derecho)
            if (ball.y < 34 && ball.x > 156 && ball.vx < 0) {
                // Ya entró al campo principal: ya no está en plunger
                ball.inPlunger = false;
            }

            // 8. Drenaje de Bola al fondo (Drain)
            if (ball.y > CANVAS_HEIGHT + 10) {
                ball.active = false;
            }
        });
    }

    // Filtrar bolas activas y verificar si se perdió la bola
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
}

// Colisión Bola vs Segmento de Línea con Restitución
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

// Colisión Dinámica con el Flipper Móvil (aporta velocidad angular del golpe)
function collideBallWithFlipper(ball, px, py, tx, ty, omega) {
    const dx = tx - px;
    const dy = ty - py;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return;

    let t = ((ball.x - px) * dx + (ball.y - py) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const nearX = px + t * dx;
    const nearY = py + t * dy;

    const distX = ball.x - nearX;
    const distY = ball.y - nearY;
    const dist = Math.hypot(distX, distY);

    if (dist < ball.radius + 2.5 && dist > 0) {
        const nx = distX / dist;
        const ny = distY / dist;

        ball.x = nearX + nx * (ball.radius + 2.5);
        ball.y = nearY + ny * (ball.radius + 2.5);

        // Velocidad lineal del punto de impacto sobre el flipper
        const contactDist = Math.hypot(nearX - px, nearY - py);
        const flipperVx = -Math.sin(Math.atan2(dy, dx)) * omega * contactDist;
        const flipperVy = Math.cos(Math.atan2(dy, dx)) * omega * contactDist;

        // Velocidad relativa
        const relVx = ball.vx - flipperVx;
        const relVy = ball.vy - flipperVy;
        const dot = relVx * nx + relVy * ny;

        if (dot < 0) {
            const restitution = 0.85;
            ball.vx = (relVx - 2 * dot * nx) * restitution + flipperVx;
            ball.vy = (relVy - 2 * dot * ny) * restitution + flipperVy;

            // Impulso extra si el flipper se movió bruscamente hacia arriba
            if (Math.abs(omega) > 1.0) {
                ball.vy -= Math.abs(omega) * 12;
                createSparks(ball.x, ball.y, '#ffffff', 5);
            }
        }
    }
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
// 🎨 Renderizado de la Mesa Arcade
// ==========================================
function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.translate(GameState.shakeX, GameState.shakeY);

    // 1. Fondo de la Mesa Arcade (Tablero de Madera Neón / Cyberpunk)
    ctx.fillStyle = '#08100d';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Cuadrícula Cyberpunk sutil en el fondo
    ctx.strokeStyle = 'rgba(61, 255, 138, 0.05)';
    ctx.lineWidth = 0.6;
    for (let x = 30; x <= 165; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 15) {
        ctx.beginPath();
        ctx.moveTo(26, y);
        ctx.lineTo(178, y);
        ctx.stroke();
    }

    // 2. Gráficos de Paredes y Canal de Lanzamiento
    ctx.strokeStyle = '#3dff8a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    tableWalls.forEach(w => {
        ctx.moveTo(w.p1.x, w.p1.y);
        ctx.lineTo(w.p2.x, w.p2.y);
    });
    ctx.stroke();

    // Pared divisoria del plunger
    ctx.strokeStyle = '#1f7d49';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(166, 44);
    ctx.lineTo(166, 156);
    ctx.stroke();

    // Puerta antiretorno (One-way gate)
    ctx.strokeStyle = '#ffea00';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(166, 44);
    ctx.lineTo(178, 38);
    ctx.stroke();

    // 3. Render Rollover Lanes superiores
    GameState.rolloverLanes.forEach(l => {
        ctx.fillStyle = l.lit ? l.color : '#152b21';
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(l.x, l.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '5px "Press Start 2P", monospace';
        ctx.fillStyle = l.lit ? '#000000' : '#7fae94';
        ctx.textAlign = 'center';
        ctx.fillText(l.letter, l.x, l.y + 2);
    });

    // 4. Render Pop Bumpers
    GameState.bumpers.forEach(b => {
        ctx.save();
        const glow = b.lit > 0 ? 12 : 3;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = glow;

        // Anillo exterior
        ctx.fillStyle = b.lit > 0 ? '#ffffff' : b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // Núcleo central
        ctx.fillStyle = '#06130e';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });

    // 5. Render Slingshots
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

    // 6. Render Drop Targets
    GameState.dropTargets.forEach(dt => {
        if (dt.down) {
            ctx.fillStyle = '#102018';
            ctx.fillRect(dt.x, dt.y + dt.h - 1, dt.w, 1);
        } else {
            ctx.fillStyle = dt.color;
            ctx.fillRect(dt.x, dt.y, dt.w, dt.h);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.6;
            ctx.strokeRect(dt.x, dt.y, dt.w, dt.h);
        }
    });

    // 7. Render Flippers
    const renderFlipper = (f, isLeft) => {
        const tipX = f.pivotX + Math.cos(f.angle) * f.length;
        const tipY = f.pivotY + Math.sin(f.angle) * f.length;

        ctx.save();
        ctx.shadowColor = isLeft ? '#00f5d4' : '#3dff8a';
        ctx.shadowBlur = f.active ? 8 : 2;

        ctx.strokeStyle = isLeft ? '#00f5d4' : '#3dff8a';
        ctx.lineWidth = f.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(f.pivotX, f.pivotY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        // Goma blanca sobre la pala del flipper
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = f.width * 0.45;
        ctx.beginPath();
        ctx.moveTo(f.pivotX, f.pivotY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        // Pivote central
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(f.pivotX, f.pivotY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    };

    renderFlipper(GameState.flippers.left, true);
    renderFlipper(GameState.flippers.right, false);

    // 8. Render Plunger (Resorte lanzador)
    const p = GameState.plunger;
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 2;
    // Resorte en espiral
    const springY = p.restY + p.power * 8;
    ctx.beginPath();
    ctx.moveTo(p.x, 156);
    ctx.lineTo(p.x, springY);
    ctx.stroke();

    // Cabeza del lanzador
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(p.x - 3.5, springY - 2, 7, 3);

    // 9. Render Bolas de Pinball
    GameState.balls.forEach(ball => {
        ctx.save();
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 6;

        // Cuerpo metálico cromado
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

    // 10. Partículas
    GameState.particles.forEach(pt => {
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    });

    // 11. Popups de puntuación
    GameState.popups.forEach(pop => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pop.alpha);
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.fillStyle = pop.color;
        ctx.textAlign = 'center';
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
    });

    // Mensaje de TILT si está activo
    if (GameState.tiltActive) {
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = '#ff4d6d';
        ctx.textAlign = 'center';
        ctx.fillText('¡TILT!', 95, 100);
    }

    ctx.restore();
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
    const flipper = side === 'left' ? GameState.flippers.left : GameState.flippers.right;
    if (flipper.active !== active) {
        flipper.active = active;
        if (active) audio.playFlipper(true);
        else audio.playFlipper(false);
    }
}

function chargePlunger() {
    GameState.plunger.charging = true;
}

function releasePlunger() {
    if (!GameState.plunger.charging && GameState.plunger.power === 0) {
        // Toque rápido: disparo a 85% de potencia
        GameState.plunger.power = 0.85;
    }
    GameState.plunger.charging = false;

    // Disparar las bolas que estén en el plunger
    GameState.balls.forEach(ball => {
        if (ball.inPlunger) {
            ball.inPlunger = false;
            const shootVelocity = -180 - GameState.plunger.power * 140;
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

                if (data.type === 'offer') {
                    const pc = new RTCPeerConnection(getIceConfig());
                    peerConnections.set(playerId, pc);

                    pc.ondatachannel = (e) => {
                        const dc = e.channel;
                        dataChannels.set(playerId, dc);
                        setupDataChannel(dc, playerId);
                    };

                    pc.onicecandidate = (e) => {
                        if (e.candidate && socket.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({
                                type: 'candidate',
                                candidate: e.candidate,
                                roomId: GameState.roomId,
                                playerId: playerId
                            }));
                        }
                    };

                    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    socket.send(JSON.stringify({
                        type: 'answer',
                        sdp: answer,
                        roomId: GameState.roomId,
                        playerId: playerId
                    }));
                } else if (data.type === 'candidate') {
                    const pc = peerConnections.get(playerId);
                    if (pc && data.candidate) {
                        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
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
