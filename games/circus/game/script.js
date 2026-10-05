// ==========================================
// 🎪 Circus Charlie Arcade - Core Game & WebRTC Engine
// ==========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 160;

const playerNickElement = document.getElementById('player-nick');
const scoreElement = document.getElementById('score');
const livesCountElement = document.getElementById('lives-count');
const stageDisplayElement = document.getElementById('stage-display');
const bonusDisplayElement = document.getElementById('bonus-display');
const highScoreElement = document.getElementById('high-score');
const roomIdElement = document.getElementById('room-id');
const audioToggleBtn = document.getElementById('audio-toggle-btn');
const waitingOverlay = document.getElementById('waiting-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const rankingList = document.getElementById('ranking-list');
const mainScreen = document.getElementById('main-screen');

// ==========================================
// 🔊 Motor de Audio y Música NES Circus (Web Audio API)
// ==========================================
class CircusAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.muted = false;
        this.isPlayingMusic = false;
        this.musicTimer = null;
        this.noteIndex = 0;
    }

    init() {
        if (!this.ctx) {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                this.ctx = new AudioCtx();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.3, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
            } catch (_) {}
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        if (!this.isPlayingMusic && !this.muted) {
            this.startMusic();
        }
    }

    toggleMute() {
        this.init();
        this.muted = !this.muted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.3, this.ctx.currentTime);
        }
        if (audioToggleBtn) {
            audioToggleBtn.classList.toggle('muted', this.muted);
            audioToggleBtn.textContent = this.muted ? '🔇 MUTED' : '🔊 AUDIO';
        }
    }

    // Melodía clásica de circo alegre de Circus Charlie
    startMusic() {
        if (this.isPlayingMusic || !this.ctx) return;
        this.isPlayingMusic = true;

        // Frecuencias de la melodía circense alegre
        const melody = [
            { f: 523.25, d: 0.12 }, { f: 659.25, d: 0.12 }, { f: 783.99, d: 0.12 }, { f: 1046.50, d: 0.24 },
            { f: 880.00, d: 0.12 }, { f: 783.99, d: 0.12 }, { f: 659.25, d: 0.24 },
            { f: 587.33, d: 0.12 }, { f: 659.25, d: 0.12 }, { f: 698.46, d: 0.24 },
            { f: 783.99, d: 0.12 }, { f: 698.46, d: 0.12 }, { f: 659.25, d: 0.12 }, { f: 587.33, d: 0.12 },
            { f: 523.25, d: 0.12 }, { f: 659.25, d: 0.12 }, { f: 783.99, d: 0.12 }, { f: 1046.50, d: 0.24 },
            { f: 987.77, d: 0.12 }, { f: 880.00, d: 0.12 }, { f: 783.99, d: 0.24 },
            { f: 698.46, d: 0.12 }, { f: 783.99, d: 0.12 }, { f: 880.00, d: 0.24 },
            { f: 783.99, d: 0.24 }, { f: 0, d: 0.1 }
        ];

        let idx = 0;
        const playNextNote = () => {
            if (!this.isPlayingMusic || !this.ctx || this.muted) {
                this.musicTimer = setTimeout(playNextNote, 200);
                return;
            }

            const note = melody[idx];
            idx = (idx + 1) % melody.length;

            if (note.f > 0) {
                try {
                    const t = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(note.f, t);

                    // Pequeño decay alegre staccato
                    gain.gain.setValueAtTime(0.12, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + note.d * 0.9);

                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start(t);
                    osc.stop(t + note.d);
                } catch (_) {}
            }

            this.musicTimer = setTimeout(playNextNote, note.d * 1000 * 1.15);
        };

        playNextNote();
    }

    stopMusic() {
        this.isPlayingMusic = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    }

    playJump() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280, t);
            osc.frequency.exponentialRampToValueAtTime(740, t + 0.15);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.16);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.16);
        } catch (_) {}
    }

    playBounce() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(180, t);
            osc.frequency.exponentialRampToValueAtTime(620, t + 0.14);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.15);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.15);
        } catch (_) {}
    }

    playScore() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(987, t);
            osc.frequency.setValueAtTime(1318, t + 0.06);
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.14);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.14);
        } catch (_) {}
    }

    playMoneyBag() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(1174, t);
            osc.frequency.setValueAtTime(1567, t + 0.05);
            osc.frequency.setValueAtTime(2093, t + 0.10);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.22);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.22);
        } catch (_) {}
    }

    playCrash() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, t);
            osc.frequency.linearRampToValueAtTime(60, t + 0.35);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.35);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.35);
        } catch (_) {}
    }

    playVictory() {
        if (!this.ctx || this.muted) return;
        try {
            const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
            notes.forEach((f, i) => {
                const t = this.ctx.currentTime + i * 0.12;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, t);
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.linearRampToValueAtTime(0.001, t + 0.16);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.16);
            });
        } catch (_) {}
    }
}

const audio = new CircusAudio();
if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.toggleMute();
    });
}

// ==========================================
// 🎪 Estado Global del Juego (GameState)
// ==========================================
const FLOOR_Y = 138;
const GRAVITY = 680;
const TRACK_LANES = [72, 94, 116, 138];

// ==========================================
// 🎨 Paleta Oficial y Temas Visuales NES Circus Charlie (1986 Konami)
// ==========================================
const NES_PALETTE = {
    BLACK: "#000000",
    WHITE: "#f8fcf8",
    CYAN: "#00f8f8",
    GREEN: "#308000",
    DARK_BLUE: "#400090",
    DARK_RED: "#b80400",
    RED: "#f82000",
    PINK: "#f82850",
    ORANGE: "#f89c10",
    GOLD: "#f8bc20",
    PEACH: "#f8d0b0",
    GRAY: "#c0c4c0"
};

const LEVEL_THEMES = [
    {
        name: "CIRCO CLÁSICO",
        bgWall: "#000000",
        stars: false,
        tentCornice: "#f8fcf8",
        diamond1: "#f82000",
        diamond2: "#f8bc20",
        garlands: ["#00f8f8", "#f8fcf8", "#f82850"],
        doorBg: "#b80400",
        animal: "elephant",
        arenaGrass: "#308000",
        arenaLine: "#000000",
        hoopFlameOuter: "#f82000",
        hoopFlameMid: "#f89c10",
        hoopFlameInner: "#f8bc20",
        wireColor: "#400090",
        potBody: "#f8fcf8",
        bonus: 5000
    },
    {
        name: "TRAMPOLÍN Y FUEGO",
        bgWall: "#dc2626",
        stars: false,
        tentCornice: "#1e1b4b",
        diamond1: "#7c3aed",
        diamond2: "#fde047",
        garlands: ["#a855f7", "#ec4899", "#f59e0b"],
        doorBg: "#312e81",
        animal: "strongman",
        arenaGrass: "#308000",
        arenaLine: "#000000",
        hoopFlameOuter: "#f82000",
        hoopFlameMid: "#f89c10",
        hoopFlameInner: "#f8bc20",
        wireColor: "#f8bc20",
        potBody: "#f8fcf8",
        bonus: 6000
    },
    {
        name: "TRAPECIOS VOLADORES",
        bgWall: "#000000",
        stars: false,
        tentCornice: "#f8fcf8",
        diamond1: "#f82000",
        diamond2: "#f8bc20",
        garlands: ["#00f8f8", "#f8fcf8", "#f82850"],
        doorBg: "#b80400",
        animal: "elephant",
        arenaGrass: "#308000",
        arenaLine: "#000000",
        hoopFlameOuter: "#f82000",
        hoopFlameMid: "#f89c10",
        hoopFlameInner: "#f8bc20",
        wireColor: "#400090",
        potBody: "#f8fcf8",
        bonus: 7000
    },
    {
        name: "CIRCO FANTASÍA",
        bgWall: "#040817",
        stars: true,
        tentCornice: "#0f172a",
        diamond1: "#06b6d4",
        diamond2: "#ec4899",
        garlands: ["#22c55e", "#3b82f6", "#f43f5e"],
        doorBg: "#581c87",
        animal: "monkey",
        arenaGrass: "#1e293b",
        arenaLine: "#10b981",
        hoopFlameOuter: "#06b6d4",
        hoopFlameMid: "#3b82f6",
        hoopFlameInner: "#ffffff",
        wireColor: "#ec4899",
        potBody: "#c084fc",
        bonus: 8000
    }
];

function getTheme(level = 1) {
    const idx = Math.max(0, (level - 1) % LEVEL_THEMES.length);
    return LEVEL_THEMES[idx];
}

// Dimensiones de los aros de fuego (óvalos verticales auténticos del arcade Circus Charlie)
function getHoopConfigForLane(lane) {
    if (lane <= 72) return { w: 30, h: 68 };
    if (lane <= 94) return { w: 32, h: 70 };
    if (lane <= 116) return { w: 34, h: 74 };
    return { w: 38, h: 76 };
}

const GameState = {
    running: false,
    gameOver: false,
    victory: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('circus_highscore') || '20000', 10),
    lives: 3,
    level: 1,
    bonus: 5000,
    bonusTimer: 0,
    stageIntroTimer: 0,
    currentNickname: 'CHARLIE',
    roomId: '----',

    // Recorrido de 100M a 0M
    distanceMeters: 100, // Comienza en 100M y baja a 0M
    distancePixels: 0,   // Avance interno

    // Charlie & León
    player: {
        screenX: 42,
        hasLion: true,       // true en Nivel 1 (León), false en Nivel 2 (Charlie a pie en camas elásticas)
        baseY: FLOOR_Y,      // Altura base sobre la pista (puede subir entre 94 y FLOOR_Y = 138)
        y: FLOOR_Y,          // Posición Y total (baseY + jumpY)
        jumpY: 0,            // Elevación vertical de salto
        vy: 0,
        w: 32,
        h: 24,
        onGround: true,
        gallopTimer: 0,
        gallopFrame: 0,
        invulnTimer: 0,
        isVictoryPodium: false
    },

    // Velocidad de avance de la pista
    baseSpeed: 55,       // Velocidad crucero automática
    playerSpeedBonus: 0, // -30 (frenar) a +45 (acelerar)

    // Modalidad de nivel: 'lion' (Nivel 1), 'trampoline' (Nivel 2) o 'trapeze' (Nivel 3)
    subgame: 'lion',

    // Obstáculos Nivel 1
    enemies: [],        // Enemigos que corren hacia nosotros (Monitos de circo)
    hoops: [],          // Compatibilidad retro
    firePots: [],       // Vasijas con fuego en el suelo
    particles: [],      // Chispas y polvo decorativo

    // Obstáculos Nivel 2 (Trampolines y Tragafuegos)
    trampolines: [],    // Camas elásticas y pedestales
    firebreathers: [],  // Tragafuegos en el suelo
    fenceBags: [],      // Bolsas de dinero en la valla
    wheelAngle: 0,      // Ángulo de rotación de la rueda de la fortuna

    // Obstáculos Nivel 3 (Trapecios Voladores)
    trapezes: [],       // Trapecios oscilantes
    safetyMats: [],     // Camas elásticas de seguridad en el suelo
    popups: [],         // Rótulos flotantes de puntos (ej. 500)

    // Podio final
    podium: null,

    // Decoración de carpa
    crowdAnimationTimer: 0
};

// ==========================================
// 🧱 Inicialización de Pistas y Obstáculos
// ==========================================
function initStage(level = 1) {
    GameState.level = level;
    const theme = getTheme(level);

    // Modalidad del nivel:
    // Nivel 1: 'lion' (Montando al león con aros de fuego gigantes)
    // Nivel 2: 'trampoline' (Camas elásticas y pedestales sobre tragafuegos)
    // Nivel 3: 'trapeze' (Los Trapecios Voladores - ¡Foto de Referencia Konami!)
    const stageModulo = (level - 1) % 3;
    const subgame = (stageModulo === 0) ? 'lion' : (stageModulo === 1 ? 'trampoline' : 'trapeze');
    GameState.subgame = subgame;

    GameState.distanceMeters = 100;
    GameState.distancePixels = 0;
    GameState.bonus = (subgame === 'trapeze') ? 7000 : ((subgame === 'trampoline') ? 6000 : (theme.bonus || 5000));
    GameState.bonusTimer = 0;
    GameState.stageIntroTimer = 2.5;

    const p = GameState.player;
    p.screenX = (subgame === 'trapeze') ? 46 : ((subgame === 'trampoline') ? 46 : 42);
    p.invulnTimer = 1.0;
    p.isVictoryPodium = false;

    GameState.enemies = [];
    GameState.hoops = [];
    GameState.firePots = [];
    GameState.particles = [];
    GameState.trampolines = [];
    GameState.firebreathers = [];
    GameState.fenceBags = [];
    GameState.trapezes = [];
    GameState.safetyMats = [];
    GameState.popups = [];

    if (subgame === 'lion') {
        p.hasLion = true;
        p.baseY = FLOOR_Y;
        p.y = FLOOR_Y;
        p.jumpY = 0;
        p.vy = 0;
        p.onGround = true;
        p.w = 32;
        p.h = 24;

        // Generar obstáculos a lo largo de los 100 metros (Monitos de circo corredores y vasijas con fuego)
        const speedMult = 1.0 + (level - 1) * 0.18;

        let nextMeter = 92;
        while (nextMeter > 6) {
            const rand = Math.random();
            // 80% de los obstáculos en la línea de suelo principal (FLOOR_Y = 138) donde galopa Charlie
            const lane = (Math.random() < 0.80) ? FLOOR_Y : TRACK_LANES[Math.floor(Math.random() * TRACK_LANES.length)];

            if (rand < 0.65) {
                // Monito de circo que corre velozmente hacia nosotros
                const isBlue = Math.random() < 0.30; // Monito azul especial más ágil
                const hasMoneyBag = Math.random() < 0.25; // Bolsa de $ flotando
                GameState.enemies.push({
                    initialMeter: nextMeter,
                    meter: nextMeter,
                    baseY: lane,
                    w: 16,
                    h: 14,
                    speed: (isBlue ? 32 : 22) * speedMult, // Corre hacia la izquierda contra Charlie
                    type: isBlue ? 'monkey_blue' : 'monkey_brown',
                    hasMoneyBag: hasMoneyBag,
                    bagCollected: false,
                    cleared: false,
                    animFrame: 0,
                    animTimer: 0
                });
                nextMeter -= Math.floor(6 + Math.random() * 5);
            } else if (rand < 0.90) {
                // Vasija con fuego en el suelo como obstáculo estático
                GameState.firePots.push({
                    meter: nextMeter,
                    baseY: lane,
                    w: 14,
                    h: 14,
                    y: lane - 14,
                    cleared: false
                });
                nextMeter -= Math.floor(5 + Math.random() * 4);
            } else {
                // Dúo de monitos corredores en líneas distintas
                const lane1 = (Math.random() < 0.75) ? FLOOR_Y : TRACK_LANES[Math.floor(Math.random() * TRACK_LANES.length)];
                const otherLanes = TRACK_LANES.filter(l => l !== lane1);
                const lane2 = otherLanes[Math.floor(Math.random() * otherLanes.length)];

                GameState.enemies.push({
                    initialMeter: nextMeter,
                    meter: nextMeter,
                    baseY: lane1,
                    w: 16,
                    h: 14,
                    speed: 24 * speedMult,
                    type: 'monkey_brown',
                    hasMoneyBag: true,
                    bagCollected: false,
                    cleared: false,
                    animFrame: 0,
                    animTimer: 0
                });

                GameState.enemies.push({
                    initialMeter: nextMeter + 1.5,
                    meter: nextMeter + 1.5,
                    baseY: lane2,
                    w: 16,
                    h: 14,
                    speed: 30 * speedMult,
                    type: 'monkey_blue',
                    hasMoneyBag: false,
                    bagCollected: false,
                    cleared: false,
                    animFrame: 0,
                    animTimer: 0
                });

                nextMeter -= Math.floor(7 + Math.random() * 5);
            }
        }

        // Podio de llegada en 0M
        GameState.podium = {
            meter: 0,
            w: 36,
            h: 22,
            y: FLOOR_Y - 22,
            reached: false
        };
    } else if (subgame === 'trampoline') {
        p.hasLion = false; // Charlie va a pie
        p.baseY = 124;
        p.y = 124;
        p.jumpY = 0;
        p.vy = -290; // Inicia con rebote elástico hacia arriba
        p.onGround = false;
        p.w = 18;
        p.h = 24;

        // Plataformas y camas elásticas continuas desde 100M hasta el podio en 0M (cada 2.5m = 60px)
        GameState.trampolines = [];
        for (let m = 100; m >= 2.5; m -= 2.5) {
            const isPedestal = (m === 100 || m === 75 || m === 50 || m === 25);
            GameState.trampolines.push({
                meter: m,
                w: isPedestal ? 42 : 36,
                h: 28,
                topY: 124,
                baseY: 152,
                squash: 0,
                isPedestal: isPedestal
            });
        }

        // Tragafuegos en el suelo escupiendo fuego hacia arriba en huecos alternos
        // Espaciados de forma justa para que el jugador siempre tenga plataformas seguras donde esperar
        GameState.firebreathers = [];
        const fbMeters = [93.75, 88.75, 83.75, 71.25, 66.25, 61.25, 46.25, 41.25, 36.25, 21.25, 16.25, 11.25, 6.25];
        fbMeters.forEach((m, idx) => {
            GameState.firebreathers.push({
                meter: m,
                w: 18,
                h: 24,
                y: 128,
                fireBaseY: 128,
                fireMaxHeight: 46, // Altura balanceada para que el salto con SALTO pase limpiamente por arriba
                firePhase: (idx * 0.8) % (Math.PI * 2),
                fireSpeed: 2.2
            });
        });

        // Bolsas de dinero ($) sobre la valla como en la foto
        const bagMeters = [95, 85, 75, 65, 55, 45, 35, 25, 15];
        GameState.fenceBags = [];
        bagMeters.forEach(m => {
            GameState.fenceBags.push({
                meter: m,
                y: 42,
                w: 14,
                h: 14,
                collected: false
            });
        });

        // Podio de llegada en 0M
        GameState.podium = {
            meter: 0,
            w: 36,
            h: 22,
            y: 124,
            reached: false
        };
    } else if (subgame === 'trapeze') {
        p.hasLion = false; // Charlie va en trapecio
        p.charlieState = 'holding'; // 'holding' o 'flying'
        p.currentTrapezeIdx = 0;
        p.lastTrapezeIdx = -1;
        p.hangTimer = 0.2;
        p.screenX = 46;
        p.baseY = 96;
        p.y = 96;
        p.jumpY = 0;
        p.vx = 0;
        p.vy = 0;
        p.flipAngle = 0;
        p.flipSpeed = 0;
        p.onGround = false;
        p.w = 16;
        p.h = 22;

        // Trapecios oscilantes desde 100M hasta 3M (conducentes directamente al podio de 0M)
        GameState.trapezes = [];
        const trapMeters = [100, 94, 88, 82, 76, 70, 64, 58, 52, 46, 40, 34, 28, 22, 16, 11, 7, 3];
        trapMeters.forEach((m, idx) => {
            GameState.trapezes.push({
                meter: m,
                length: 50,
                railY: 46,
                maxAngle: 0.72,
                angle: (idx % 2 === 0) ? 0.6 : -0.6,
                angleVel: 0,
                speed: 2.2 + (idx % 3) * 0.2,
                phase: idx * 1.3,
                barX: 46,
                barY: 96
            });
        });

        // Camas elásticas de seguridad en el suelo para rebotar si cae
        GameState.safetyMats = [];
        const matMeters = [97, 85, 73, 61, 49, 37, 25, 13, 5];
        matMeters.forEach(m => {
            GameState.safetyMats.push({
                meter: m,
                w: 34,
                h: 14,
                y: 138,
                squash: 0
            });
        });

        // Podio de llegada en 0M
        GameState.podium = {
            meter: 0,
            w: 36,
            h: 22,
            y: 124,
            reached: false
        };
    }

    updateUI();
}

// ==========================================
// 🔁 Retorno Automático y Rápido al QR
// ==========================================
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
    GameState.currentNickname = 'CHARLIE';

    if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
    if (waitingOverlay) waitingOverlay.classList.remove('hidden');

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

    // Nuevo Room ID
    GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    if (roomIdElement) roomIdElement.textContent = `ID: ${GameState.roomId}`;
    updateQrCode();

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

    initStage(1);
    updateUI();
    renderHallOfFame();
}

function startNewGame() {
    clearGameOverTimers();

    GameState.running = true;
    GameState.gameOver = false;
    GameState.victory = false;
    GameState.score = 0;
    GameState.lives = 3;
    GameState.level = 1;

    audio.init();
    audio.startMusic();

    initStage(1);

    waitingOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    updateUI();
}

function endGame(isVictory = false) {
    clearGameOverTimers();

    GameState.running = false;
    GameState.gameOver = true;
    GameState.victory = isVictory;
    audio.stopMusic();

    if (isVictory) {
        audio.playVictory();
        broadcastSFX('victory');
    } else {
        audio.playCrash();
        broadcastSFX('crash');
    }

    saveScore(GameState.currentNickname, GameState.score);
    renderHallOfFame();

    const titleEl = document.getElementById('game-over-title');
    if (titleEl) {
        titleEl.textContent = isVictory ? 'STAGE CLEAR!' : 'GAME OVER';
        titleEl.style.color = isVictory ? '#3dff8a' : '#ff4d6d';
    }

    gameOverOverlay.classList.remove('hidden');

    // Cuenta regresiva visible de 3s
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

    // Retorno automático rápido tras 3.5 segundos
    gameOverTimer = setTimeout(() => {
        returnToQrCode();
    }, 3500);

    // Notificar a los teléfonos
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
    if (scoreElement) scoreElement.textContent = GameState.score.toString().padStart(6, '0');
    if (highScoreElement) highScoreElement.textContent = `HI-${GameState.highScore.toString().padStart(6, '0')}`;
    if (stageDisplayElement) stageDisplayElement.textContent = `STAGE-${GameState.level.toString().padStart(2, '0')}`;
    if (bonusDisplayElement) bonusDisplayElement.textContent = `BONUS-${Math.floor(GameState.bonus).toString().padStart(4, '0')}`;

    // Iconos de payasito oficiales estilo Konami Circus Charlie para las vidas
    const clownSvg = `<svg width="9" height="9" viewBox="0 0 9 9" style="image-rendering:pixelated;vertical-align:middle;display:inline-block;margin-right:2px;"><rect x="3" y="0" width="3" height="3" fill="#00f8f8"/><rect x="4" y="0" width="1" height="1" fill="#f8fcf8"/><rect x="2" y="3" width="5" height="5" fill="#f8d0b0"/><rect x="4" y="5" width="1" height="1" fill="#f82000"/><rect x="1" y="4" width="1" height="3" fill="#f82000"/><rect x="7" y="4" width="1" height="3" fill="#f82000"/><rect x="3" y="4" width="1" height="1" fill="#000000"/><rect x="5" y="4" width="1" height="1" fill="#000000"/></svg>`;
    const livesCont = document.getElementById('lives-container');
    if (livesCont) {
        livesCont.innerHTML = clownSvg.repeat(Math.max(0, GameState.lives));
    }
}

// ==========================================
// 🕹️ Lógica de Controles (Teclado y Móvil)
// ==========================================
const inputKeys = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false
};

function performJump() {
    const p = GameState.player;
    if (p.onGround && !p.isVictoryPodium) {
        p.vy = -265;
        p.onGround = false;
        audio.playJump();
        broadcastSFX('jump');
    }
}

// ==========================================
// 🎪 Física de Camas Elásticas y Tragafuegos (Nivel 2)
// ==========================================
function updateTrampolinePhysics(dt) {
    const p = GameState.player;

    if (p.isVictoryPodium) {
        p.vx = 0;
        p.vy = 0;
        p.onGround = true;
        p.y = 118;
        p.screenX = getScreenXFromMeter(0) + 14;
        return;
    }

    // Actualizar rotación de la rueda de la fortuna
    GameState.wheelAngle = (GameState.wheelAngle || 0) + dt * 0.9;

    // Invulnerabilidad tras revivir
    if (p.invulnTimer > 0) p.invulnTimer -= dt;

    // Movimiento horizontal e inercia sobre las camas elásticas
    if (!p.isVictoryPodium) {
        if (inputKeys.left) {
            GameState.playerSpeedBonus = -36; // Frenar o retroceder sobre el trampolín
            p.screenX = Math.max(25, p.screenX - 35 * dt);
        } else if (inputKeys.right) {
            GameState.playerSpeedBonus = 42;  // Impulso hacia adelante para cruzar al siguiente trampolín
            p.screenX = Math.min(95, p.screenX + 45 * dt);
        } else {
            GameState.playerSpeedBonus = 12;
            // Tendencia suave a centrarse en pantalla
            if (p.screenX < 50) p.screenX += 15 * dt;
            if (p.screenX > 50) p.screenX -= 15 * dt;
        }
    } else {
        GameState.playerSpeedBonus = 0;
    }

    // Avance de distancia en metros hacia 0M
    const scrollSpeed = Math.max(0, 36 + GameState.playerSpeedBonus);
    const meterAdvance = (scrollSpeed * dt) / 24;
    GameState.distancePixels += scrollSpeed * dt;

    if (!p.isVictoryPodium) {
        GameState.distanceMeters = Math.max(0, GameState.distanceMeters - meterAdvance);
    }

    // Gravedad y Física Vertical de Charlie acrobático
    const TRAMP_GRAVITY = 640;
    p.y += p.vy * dt;
    p.vy += TRAMP_GRAVITY * dt;

    // Recuperación elástica de las camas elásticas (squash)
    GameState.trampolines.forEach(tr => {
        if (tr.squash > 0) tr.squash = Math.max(0, tr.squash - dt * 25);
    });

    // Detección de rebote en camas elásticas cuando Charlie desciende (vy > 0)
    if (p.vy > 0 && !p.isVictoryPodium) {
        GameState.trampolines.forEach(tr => {
            const trX = getScreenXFromMeter(tr.meter);
            const inRangeX = (p.screenX >= trX - tr.w / 2 - 4) && (p.screenX <= trX + tr.w / 2 + 4);
            const inRangeY = (p.y >= tr.topY - 6) && (p.y <= tr.topY + 16);

            if (inRangeX && inRangeY) {
                p.y = tr.topY;
                // Impulso superior si se mantiene presionada la tecla de salto
                const bounceForce = inputKeys.jump ? -330 : -280;
                p.vy = bounceForce;
                tr.squash = 4;

                audio.playBounce();
                broadcastSFX('jump');
                createSparks(p.screenX, tr.topY, tr.isPedestal ? '#facc15' : '#38bdf8', 6);

                GameState.score += tr.isPedestal ? 50 : 20;
                updateUI();
            }
        });
    }

    // Detección de Llegada y Aterrizaje en el Podio de Victoria en 0M
    const podiumX = getScreenXFromMeter(0);
    const isOverPodium = (p.screenX >= podiumX - 14 && p.screenX <= podiumX + 44);
    const isNearPodium = (GameState.distanceMeters <= 2.2) || isOverPodium;

    if (!p.isVictoryPodium) {
        // 1. Si Charlie desciende y sus pies tocan la superficie del podio (Y=118):
        if (isOverPodium && p.y >= 110) {
            triggerVictorySequence();
            return;
        }
        // 2. Si la distancia restante ya llegó a la meta (<= 1.2M):
        if (GameState.distanceMeters <= 1.2) {
            triggerVictorySequence();
            return;
        }
    }

    // Caída en el abismo entre plataformas (solo si NO está en el podio)
    if (p.y >= 148 && !p.isVictoryPodium) {
        if (isNearPodium || isOverPodium || GameState.distanceMeters <= 2.5) {
            // Llegó a la zona de meta: salvar y aterrizar en el podio triunfalmente
            triggerVictorySequence();
            return;
        }
        handleLifeLost();
        return;
    }

    // Actualizar tragafuegos y llamaradas de bolas de fuego
    GameState.firebreathers.forEach(fb => {
        fb.firePhase += dt * fb.fireSpeed;
        const sine = Math.sin(fb.firePhase);
        const isSpitting = sine > 0.1;
        const fireCurrentY = fb.y - (Math.max(0, sine) * 46);
        const fbScreenX = getScreenXFromMeter(fb.meter);

        // Chispas de fuego
        if (isSpitting && Math.random() < 0.35 && fbScreenX > -20 && fbScreenX < CANVAS_WIDTH + 20) {
            GameState.particles.push({
                x: fbScreenX + (Math.random() * 6 - 3),
                y: fireCurrentY + (Math.random() * 6 - 3),
                vx: -15 + Math.random() * 30,
                vy: -20 - Math.random() * 30,
                color: Math.random() > 0.4 ? '#f97316' : '#facc15',
                life: 0.15 + Math.random() * 0.15
            });
        }

        // Colisión justa entre Charlie y la bola de fuego (solo cuando sine > 0.35 para dar ventana segura)
        if (isSpitting && sine > 0.35 && p.invulnTimer <= 0 && !p.isVictoryPodium) {
            const charlieBox = { x: p.screenX - 5, y: p.y - 18, w: 10, h: 14 };
            const fireballBox = { x: fbScreenX - 4, y: fireCurrentY - 4, w: 8, h: 8 };
            if (checkAABB(charlieBox, fireballBox)) {
                handleLifeLost();
                return;
            }
        }
    });

    // Detección de bolsas de dinero ($) sobre la valla
    GameState.fenceBags.forEach(bag => {
        if (!bag.collected) {
            const bx = getScreenXFromMeter(bag.meter);
            const bagBox = { x: bx - 7, y: bag.y - 7, w: 14, h: 14 };
            const charlieBox = { x: p.screenX - 7, y: p.y - 20, w: 14, h: 20 };

            if (checkAABB(charlieBox, bagBox)) {
                bag.collected = true;
                GameState.score += 500;
                audio.playMoneyBag();
                createSparks(bx, bag.y, '#facc15', 14);
                updateUI();
            }
        }
    });

    // Actualizar partículas
    for (let i = GameState.particles.length - 1; i >= 0; i--) {
        const pt = GameState.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) GameState.particles.splice(i, 1);
    }

    // Llegada al Podio (0M)
    if (GameState.distanceMeters <= 1.0 && !p.isVictoryPodium) {
        triggerVictorySequence();
        return;
    }
}

// ==========================================
// 🎪 Física de Trapecios Voladores (Nivel 3 - Konami NES)
// ==========================================
function updateTrapezePhysics(dt) {
    const p = GameState.player;

    // Si ya está celebrando la victoria sobre el podio, mantenerlo inmóvil y triunfal
    if (p.isVictoryPodium) {
        p.vx = 0;
        p.vy = 0;
        p.flipAngle = 0;
        p.flipSpeed = 0;
        p.onGround = true;
        p.y = 118;
        p.screenX = getScreenXFromMeter(0) + 14;
        return;
    }

    if (p.invulnTimer > 0) p.invulnTimer -= dt;

    // 1. Actualizar oscilación pendular de todos los trapecios
    GameState.trapezes.forEach(tr => {
        tr.phase += dt * tr.speed;
        tr.angle = tr.maxAngle * Math.sin(tr.phase);
        tr.angleVel = tr.maxAngle * tr.speed * Math.cos(tr.phase);

        // Posición de la barra en la pantalla
        const anchorX = getScreenXFromMeter(tr.meter);
        tr.barX = anchorX + Math.sin(tr.angle) * tr.length;
        tr.barY = tr.railY + Math.cos(tr.angle) * tr.length;
    });

    // 2. Amortiguación de camas elásticas de seguridad en el suelo
    GameState.safetyMats.forEach(mat => {
        if (mat.squash > 0) mat.squash = Math.max(0, mat.squash - dt * 25);
    });

    // 3. Actualizar popups de puntos (ej: 500 al agarrar trapecio)
    for (let i = GameState.popups.length - 1; i >= 0; i--) {
        const pop = GameState.popups[i];
        pop.y -= 25 * dt;
        pop.life -= dt;
        if (pop.life <= 0) GameState.popups.splice(i, 1);
    }

    // 4. Estado A: Charlie Agarrado al Trapecio
    if (p.charlieState === 'holding') {
        const curTr = GameState.trapezes[p.currentTrapezeIdx] || GameState.trapezes[0];

        // Las manos de Charlie se anclan a la barra oscilante
        p.screenX = curTr.barX;
        p.y = curTr.barY + 6;
        p.vy = 0;
        p.vx = 0;
        p.flipAngle = 0;

        // Mantener la cámara anclada suavemente al trapecio actual
        const targetDistance = curTr.meter - (Math.sin(curTr.angle) * curTr.length) / 24;
        GameState.distanceMeters += (targetDistance - GameState.distanceMeters) * 0.18;

        // Al presionar SALTO (Espacio / Enter / Z / X o Botón Salto)
        if (p.hangTimer > 0) {
            p.hangTimer -= dt;
        } else if (inputKeys.jump) {
            inputKeys.jump = false;
            p.charlieState = 'flying';
            p.lastTrapezeIdx = p.currentTrapezeIdx;

            // Velocidad tangencial del péndulo al soltarse
            const tangSpeed = curTr.length * curTr.angleVel;
            let vx = Math.cos(curTr.angle) * tangSpeed;
            let vy = -Math.sin(curTr.angle) * tangSpeed;

            // Impulso acrobático de lanzamiento al frente
            if (curTr.angleVel > 0 || curTr.angle > 0) {
                vx += 75;
            } else {
                vx += 35;
            }

            if (inputKeys.right) vx += 45;
            if (inputKeys.left) vx -= 30;

            // Elevación para describir parábola hacia el siguiente trapecio
            vy = Math.min(-150, vy - 175);

            p.vx = vx;
            p.vy = vy;
            p.flipAngle = 0;
            p.flipSpeed = 9.5; // Volteretas en el aire

            audio.playJump();
            broadcastSFX('jump');
            createSparks(p.screenX, p.y, '#38bdf8', 8);
        }
    }
    // 5. Estado B: Charlie Volando en el Aire
    else if (p.charlieState === 'flying') {
        const TRAP_GRAVITY = 520;
        p.y += p.vy * dt;
        p.vy += TRAP_GRAVITY * dt;

        // Voltereta acrobática
        p.flipAngle += p.flipSpeed * dt;

        // Avance horizontal del mundo
        const scrollSpeed = Math.max(10, p.vx + (inputKeys.right ? 28 : (inputKeys.left ? -20 : 0)));
        const meterStep = (scrollSpeed * dt) / 24;
        GameState.distanceMeters = Math.max(0, GameState.distanceMeters - meterStep);
        GameState.distancePixels += scrollSpeed * dt;

        // Desplazamiento suave de Charlie hacia el centro de la pantalla
        if (p.screenX < 50) p.screenX += 16 * dt;
        if (p.screenX > 50) p.screenX -= 16 * dt;

        // Detección de agarre con trapecios
        // Solo puede agarrarse cuando va en trayectoria descendente o en el ápice (vy > -110)
        if (p.vy > -110) {
            for (let idx = 0; idx < GameState.trapezes.length; idx++) {
                // No re-agarrar el mismo trapecio en el impulso de salida si va subiendo
                if (idx === p.lastTrapezeIdx && p.vy < 0) continue;

                const tr = GameState.trapezes[idx];
                const distToBar = Math.hypot(p.screenX - tr.barX, (p.y - 6) - tr.barY);

                if (distToBar < 15) {
                    // ¡AGARRADO AL TRAPECIO CON ÉXITO!
                    p.charlieState = 'holding';
                    p.currentTrapezeIdx = idx;
                    p.hangTimer = 0.22;
                    inputKeys.jump = false;
                    p.flipAngle = 0;
                    p.screenX = tr.barX;
                    p.y = tr.barY + 6;

                    GameState.score += 500;
                    audio.playScore();
                    broadcastSFX('jump');

                    // Rótulo emergente '500' como en la foto de referencia
                    GameState.popups.push({
                        x: tr.barX + 8,
                        y: tr.barY,
                        text: '500',
                        life: 1.0
                    });

                    createSparks(tr.barX, tr.barY, '#facc15', 12);
                    updateUI();
                    break;
                }
            }
        }

        // Rebote en Camas Elásticas de Seguridad en el suelo
        if (p.vy > 0) {
            GameState.safetyMats.forEach(mat => {
                const matX = getScreenXFromMeter(mat.meter);
                const inRangeX = (p.screenX >= matX - mat.w / 2 - 4) && (p.screenX <= matX + mat.w / 2 + 4);
                const inRangeY = (p.y >= mat.y - 12) && (p.y <= mat.y + 10);

                if (inRangeX && inRangeY) {
                    p.y = mat.y - 8;
                    p.vy = -360; // Gran impulso vertical hacia los trapecios
                    p.vx = 48;
                    p.flipAngle = 0;
                    p.flipSpeed = 10;
                    mat.squash = 4;

                    audio.playBounce();
                    broadcastSFX('jump');
                    createSparks(p.screenX, mat.y, '#38bdf8', 10);
                }
            });
        }

        // Detección de Llegada al Podio de Victoria en 0M
        const podiumX = getScreenXFromMeter(0);
        const podiumTopY = 118; // Altura superior del podio (FLOOR_Y - 20)
        const isNearPodium = (GameState.distanceMeters <= 2.8) || (p.screenX >= podiumX - 16 && p.screenX <= podiumX + 44);

        if (isNearPodium && !p.isVictoryPodium) {
            // Si Charlie desciende hacia el podio o llega a la zona de meta:
            if (p.y >= podiumTopY - 20 || GameState.distanceMeters <= 1.2) {
                triggerVictorySequence();
                return;
            }
        }

        // Caída al vacío (suelo sin cama elástica):
        // Solo ocurre si está lejos de la meta (no en el podio)
        if (p.y >= 150 && !p.isVictoryPodium) {
            if (isNearPodium || GameState.distanceMeters <= 2.8) {
                triggerVictorySequence();
                return;
            }
            handleLifeLost();
            return;
        }
    }
}

// ==========================================
// ⚙️ Motor de Física y Colisiones
// ==========================================
function updatePhysics(dt) {
    if (!GameState.running || GameState.gameOver) return;

    if (GameState.stageIntroTimer > 0) {
        GameState.stageIntroTimer -= dt;
    }

    // Disminución del Bonus con el tiempo (se congela al llegar al podio para no morir)
    if (!GameState.player.isVictoryPodium) {
        GameState.bonusTimer += dt;
        if (GameState.bonusTimer >= 0.1) {
            GameState.bonus = Math.max(0, GameState.bonus - 10);
            GameState.bonusTimer = 0;
            bonusDisplayElement.textContent = `BONUS: ${Math.floor(GameState.bonus).toString().padStart(4, '0')}`;
            if (GameState.bonus === 0) {
                handleLifeLost();
                return;
            }
        }
    }

    // Si es modalidad Trampolín (Nivel 2), delegar a su motor físico dedicado
    if (GameState.subgame === 'trampoline') {
        updateTrampolinePhysics(dt);
        return;
    }

    // Si es modalidad Trapecios (Nivel 3), delegar a su motor físico dedicado
    if (GameState.subgame === 'trapeze') {
        updateTrapezePhysics(dt);
        return;
    }

    const p = GameState.player;

    // Si ya está celebrando la victoria sobre el podio, mantenerlo quieto y seguro
    if (p.isVictoryPodium) {
        p.vx = 0;
        p.vy = 0;
        p.jumpY = 0;
        p.onGround = true;
        p.baseY = FLOOR_Y;
        p.y = FLOOR_Y - 20;
        p.screenX = getScreenXFromMeter(0) + 14;
        return;
    }

    // Movimiento vertical en las líneas de la pista (subir y bajar líneas con agilidad)
    if (!p.isVictoryPodium) {
        if (inputKeys.up) {
            p.baseY = Math.max(72, p.baseY - 75 * dt);
        } else if (inputKeys.down) {
            p.baseY = Math.min(FLOOR_Y, p.baseY + 75 * dt);
        }
    }

    // Movimiento horizontal e inercia del león
    if (!p.isVictoryPodium) {
        if (inputKeys.left) {
            GameState.playerSpeedBonus = -32; // Frenar / ir hacia atrás
            p.screenX = Math.max(18, p.screenX - 30 * dt);
        } else if (inputKeys.right) {
            GameState.playerSpeedBonus = 38;  // Acelerar / galopar al frente
            p.screenX = Math.min(80, p.screenX + 35 * dt);
        } else {
            GameState.playerSpeedBonus = 0;
            // Retorno suave a la posición neutral (X=42)
            if (p.screenX < 42) p.screenX += 12 * dt;
            if (p.screenX > 42) p.screenX -= 12 * dt;
        }
    } else {
        GameState.playerSpeedBonus = 0;
    }

    // Velocidad neta de avance del escenario
    const scrollSpeed = Math.max(0, GameState.baseSpeed + GameState.playerSpeedBonus);
    const meterAdvance = (scrollSpeed * dt) / 24; // 24px = 1 Metro
    GameState.distancePixels += scrollSpeed * dt;

    if (!p.isVictoryPodium) {
        GameState.distanceMeters = Math.max(0, GameState.distanceMeters - meterAdvance);

        // Los enemigos de circo corren velozmente hacia la izquierda (hacia Charlie)
        GameState.enemies.forEach(e => {
            e.meter += (e.speed * dt) / 24;
            e.animTimer = (e.animTimer || 0) + dt;
            if (e.animTimer >= 0.08) {
                e.animTimer = 0;
                e.animFrame = ((e.animFrame || 0) + 1) % 4;
            }
        });
    }

    // Salto y Gravedad del león (elevación sobre la línea base actual)
    if (!p.onGround) {
        p.jumpY += p.vy * dt;
        p.vy += GRAVITY * dt;

        if (p.jumpY >= 0) {
            p.jumpY = 0;
            p.vy = 0;
            p.onGround = true;
        }
    }

    p.y = p.baseY + p.jumpY;

    // Animación de galope
    if (p.onGround && !p.isVictoryPodium) {
        p.gallopTimer += dt * (scrollSpeed > 0 ? (scrollSpeed / 40) : 0.5);
        if (p.gallopTimer >= 0.12) {
            p.gallopFrame = (p.gallopFrame + 1) % 4;
            p.gallopTimer = 0;
        }
    }

    // Invulnerabilidad tras revivir
    if (p.invulnTimer > 0) p.invulnTimer -= dt;

    // Polvo de carrera de los monitos y chispas de vasijas
    if (Math.random() < 0.6) {
        GameState.enemies.forEach(e => {
            const eScreenX = getScreenXFromMeter(e.meter);
            if (eScreenX > -20 && eScreenX < CANVAS_WIDTH + 20 && Math.random() < 0.45) {
                GameState.particles.push({
                    x: eScreenX + 8 + (Math.random() * 4),
                    y: (e.baseY || FLOOR_Y) - 1,
                    vx: 12 + Math.random() * 16,
                    vy: -4 - Math.random() * 8,
                    color: '#c0c4c0', // Polvo retro gris claro
                    life: 0.14 + Math.random() * 0.12
                });
            }
        });
        GameState.firePots.forEach(fp => {
            const fpScreenX = getScreenXFromMeter(fp.meter);
            if (fpScreenX > -20 && fpScreenX < CANVAS_WIDTH + 20) {
                GameState.particles.push({
                    x: fpScreenX + fp.w / 2 + (Math.random() * 6 - 3),
                    y: fp.y + 2,
                    vx: -10 + Math.random() * 20,
                    vy: -25 - Math.random() * 25,
                    color: Math.random() > 0.3 ? '#ef4444' : '#fbbf24',
                    life: 0.2 + Math.random() * 0.15
                });
            }
        });
    }

    // Actualizar partículas
    for (let i = GameState.particles.length - 1; i >= 0; i--) {
        const pt = GameState.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) GameState.particles.splice(i, 1);
    }

    // ==========================================
    // 💥 Detección de Colisiones
    // ==========================================
    const lionBox = {
        x: p.screenX - 12,
        y: p.y - 18,
        w: 24,
        h: 18
    };

    // 1. Vasijas de Fuego (repartidas en las líneas de la pista)
    GameState.firePots.forEach(fp => {
        const fpX = getScreenXFromMeter(fp.meter);
        const isSameLane = Math.abs(p.baseY - (fp.baseY || FLOOR_Y)) < 12;
        const potBox = { x: fpX + 2, y: fp.y + 2, w: fp.w - 4, h: fp.h - 2 };

        // Puntos al saltar por encima limpiamente en la misma línea
        if (isSameLane && !fp.cleared && lionBox.x > potBox.x + potBox.w && !p.onGround) {
            fp.cleared = true;
            GameState.score += 100;
            audio.playScore();
            updateUI();
        }

        // Colisión con la llama de la vasija (solo si comparte la misma línea)
        if (isSameLane && p.invulnTimer <= 0 && checkAABB(lionBox, potBox)) {
            handleLifeLost();
        }
    });

    // 2. Monitos de Circo Corredores (Enemigos que corren hacia Charlie)
    GameState.enemies.forEach(e => {
        const eX = getScreenXFromMeter(e.meter);
        const isSameLane = Math.abs(p.baseY - (e.baseY || FLOOR_Y)) < 14;
        const enemyBox = {
            x: eX - 8,
            y: (e.baseY || FLOOR_Y) - 15,
            w: 16,
            h: 14
        };

        // Bolsa de dinero ($) sobre el monito
        if (isSameLane && e.hasMoneyBag && !e.bagCollected) {
            const bagBox = { x: eX - 6, y: (e.baseY || FLOOR_Y) - 28, w: 12, h: 12 };
            if (checkAABB(lionBox, bagBox)) {
                e.bagCollected = true;
                GameState.score += 500;
                audio.playMoneyBag();
                createSparks(eX, (e.baseY || FLOOR_Y) - 22, '#facc15', 14);
                updateUI();
            }
        }

        // Puntos al saltar limpiamente por encima del enemigo en la misma línea
        if (isSameLane && !e.cleared && lionBox.x > enemyBox.x + enemyBox.w - 4 && !p.onGround) {
            e.cleared = true;
            GameState.score += (e.type === 'monkey_blue' ? 200 : 100);
            audio.playScore();
            createSparks(eX, (e.baseY || FLOOR_Y) - 8, '#facc15', 8);
            updateUI();
        }

        // Colisión con el enemigo (solo en la misma línea si está en el suelo o no saltó suficiente)
        if (isSameLane && p.invulnTimer <= 0) {
            if (checkAABB(lionBox, enemyBox)) {
                if (p.onGround || p.jumpY > -10) {
                    handleLifeLost();
                    return;
                }
            }
        }
    });

    // 3. Llegada al Podio (0M)
    const podiumX = getScreenXFromMeter(0);
    const isNearPodium = (GameState.distanceMeters <= 1.2) || (p.screenX >= podiumX - 10);
    if (isNearPodium && !p.isVictoryPodium) {
        triggerVictorySequence();
        return;
    }
}

function getScreenXFromMeter(targetMeter) {
    // Anclaje de cámara en pantalla: permite que Charlie pueda avanzar o retroceder libremente
    // con respecto a las plataformas y obstáculos en el escenario
    const anchorX = (GameState.subgame === 'trampoline' || GameState.subgame === 'trapeze') ? 46 : 42;
    const diffMeters = GameState.distanceMeters - targetMeter;
    return anchorX + (diffMeters * 24);
}

function checkAABB(r1, r2) {
    return !(
        r1.x + r1.w < r2.x ||
        r1.x > r2.x + r2.w ||
        r1.y + r1.h < r2.y ||
        r1.y > r2.y + r2.h
    );
}

function createSparks(x, y, color = '#facc15', count = 8) {
    for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 20 + Math.random() * 50;
        GameState.particles.push({
            x: x,
            y: y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            color: color,
            life: 0.2 + Math.random() * 0.2
        });
    }
}

function handleLifeLost() {
    GameState.lives--;
    updateUI();
    audio.playCrash();
    createSparks(GameState.player.screenX, GameState.player.y - 10, '#ef4444', 16);

    if (GameState.lives <= 0) {
        endGame(false);
    } else {
        if (GameState.subgame === 'trapeze') {
            const curIdx = Math.max(0, GameState.player.currentTrapezeIdx || 0);
            const tr = GameState.trapezes[curIdx] || GameState.trapezes[0];
            GameState.distanceMeters = tr.meter;

            const p = GameState.player;
            p.charlieState = 'holding';
            p.currentTrapezeIdx = curIdx;
            p.screenX = tr.barX;
            p.y = tr.barY + 6;
            p.vy = 0;
            p.vx = 0;
            p.flipAngle = 0;
            p.invulnTimer = 2.0;
            p.hangTimer = 0.3;
        } else if (GameState.subgame === 'trampoline') {
            // Respawn en la plataforma o cama elástica más cercana hacia atrás (paso de 2.5m)
            const nearestPlatform = Math.min(100, Math.ceil(GameState.distanceMeters / 2.5) * 2.5);
            GameState.distanceMeters = nearestPlatform;

            const p = GameState.player;
            p.screenX = 46;
            p.baseY = 124;
            p.y = 124;
            p.vy = -310; // Inmediato rebote elástico seguro al revivir
            p.invulnTimer = 2.0;

            // Restablecer bolsas no recogidas tras el hito
            GameState.fenceBags.forEach(b => {
                if (b.meter <= nearestPlatform) b.collected = false;
            });
        } else {
            // Respawn en el hito de 10 metros anterior (p. ej. si cayó en 74M, vuelve a 80M)
            const nearestMilestone = Math.min(100, Math.ceil((GameState.distanceMeters + 2) / 10) * 10);
            GameState.distanceMeters = nearestMilestone;

            const p = GameState.player;
            p.screenX = 42;
            p.baseY = FLOOR_Y;
            p.jumpY = 0;
            p.y = FLOOR_Y;
            p.vy = 0;
            p.onGround = true;
            p.invulnTimer = 2.0;

            // Resetear obstáculos que están adelante del hito para que vuelvan a desafiar a Charlie
            GameState.enemies.forEach(e => {
                if (e.meter < nearestMilestone) {
                    e.cleared = false;
                    if (e.initialMeter && e.meter > e.initialMeter) {
                        e.meter = e.initialMeter;
                    }
                }
            });
            GameState.firePots.forEach(fp => {
                if (fp.meter < nearestMilestone) fp.cleared = false;
            });
        }
    }
}

function triggerVictorySequence() {
    if (GameState.player.isVictoryPodium) return;

    const p = GameState.player;
    p.isVictoryPodium = true;
    p.charlieState = 'victory';
    p.flipAngle = 0;
    p.flipSpeed = 0;
    p.vx = 0;
    p.vy = 0;
    p.onGround = true;

    // Asegurar distancia en 0M exactos
    GameState.distanceMeters = 0;

    // Anclar a Charlie sobre el podio
    const podiumX = getScreenXFromMeter(0);
    p.screenX = podiumX + 14;
    p.y = 118; // Charlie de pie exactamente sobre la superficie dorada del podio (FLOOR_Y - 20)

    audio.stopMusic();
    audio.playVictory();

    // Bonificación de fin de nivel
    const earnedBonus = Math.floor(GameState.bonus);
    GameState.lastEarnedBonus = earnedBonus;
    GameState.score += earnedBonus;
    updateUI();

    // Partículas de fuegos artificiales de victoria
    createSparks(p.screenX, p.y - 10, '#facc15', 20);
    createSparks(p.screenX - 12, p.y - 18, '#38bdf8', 16);
    createSparks(p.screenX + 12, p.y - 18, '#ec4899', 16);

    const victoryInterval = setInterval(() => {
        if (!GameState.running || !p.isVictoryPodium) {
            clearInterval(victoryInterval);
            return;
        }
        createSparks(
            p.screenX + (Math.random() * 40 - 20),
            p.y - 10 - Math.random() * 25,
            ['#facc15', '#38bdf8', '#ec4899', '#4ade80', '#ffffff'][Math.floor(Math.random() * 5)],
            8
        );
    }, 200);

    setTimeout(() => {
        clearInterval(victoryInterval);
        p.isVictoryPodium = false;
        GameState.level++;
        initStage(GameState.level);
        audio.startMusic();
    }, 3500);
}

// ==========================================
// 🎨 Renderizado Canvas Pixel Art Retro
// ==========================================
function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (GameState.subgame === 'trampoline') {
        renderTrampolineStage();
    } else if (GameState.subgame === 'trapeze') {
        renderTrapezeStage();
    } else {
        // 1. Techo y Fondos de la Carpa de Circo
        renderCircusTent();

        // 2. Arena Verde de Circo con líneas de perspectiva
        renderArena();

        // 3. Podio de victoria en 0M
        renderPodium();

        // 4. Entidades del juego con ordenamiento de profundidad 2.5D (Z-Order según línea)
        renderDepthSortedEntities();
    }

    // 5. Partículas
    renderParticles();

    // 8. Medidor de Distancia NES (ej. 50M)
    renderDistanceMeter();

    // 9. Banner de Introducción del Nivel
    if (GameState.stageIntroTimer > 0) {
        const theme = getTheme(GameState.level);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 54, CANVAS_WIDTH, 34);
        ctx.strokeStyle = theme.diamond2;
        ctx.lineWidth = 1;
        ctx.strokeRect(6, 56, CANVAS_WIDTH - 12, 30);

        ctx.font = '7px "Press Start 2P"';
        ctx.fillStyle = theme.diamond2;
        ctx.textAlign = 'center';
        ctx.fillText(`STAGE ${GameState.level.toString().padStart(2, '0')}`, CANVAS_WIDTH / 2, 68);

        ctx.font = '6px "Press Start 2P"';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(theme.name, CANVAS_WIDTH / 2, 80);
    }

    // 9. Banner de Victoria
    if (GameState.player.isVictoryPodium) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 48, CANVAS_WIDTH, 28);
        ctx.font = '8px "Press Start 2P"';
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.fillText('STAGE CLEAR!', CANVAS_WIDTH / 2, 60);
        ctx.font = '6px "Press Start 2P"';
        ctx.fillStyle = '#3dff8a';
        ctx.fillText(`BONUS +${Math.floor(GameState.bonus)} PTS`, CANVAS_WIDTH / 2, 70);
    }
}

// ==========================================
// 🎪 Renderizado Nivel 2: Camas Elásticas y Tragafuegos (Referencia NES)
// ==========================================
function renderTrampolineStage() {
    // 1. Cielo Rojo retro con nubes blancas flotantes
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 48);

    ctx.fillStyle = '#ffffff';
    const t1 = (Date.now() / 90) % (CANVAS_WIDTH + 80) - 40;
    const t2 = ((Date.now() / 130) + 110) % (CANVAS_WIDTH + 80) - 40;
    ctx.fillRect(t1, 10, 18, 5);
    ctx.fillRect(t1 + 4, 7, 10, 8);
    ctx.fillRect(t2, 22, 14, 4);
    ctx.fillRect(t2 + 3, 19, 8, 7);

    // 2. Dirigible / Zeppelin plateado con BONUS en pantalla LED (arriba a la izquierda, como en la foto)
    const zx = 18;
    const zy = 6 + Math.sin(Date.now() / 800) * 1.5;
    // Aletas verdes en la cola
    ctx.fillStyle = '#15803d';
    ctx.fillRect(zx, zy + 1, 4, 3);
    ctx.fillRect(zx, zy + 12, 4, 3);
    ctx.fillRect(zx - 2, zy + 6, 4, 4);
    // Cuerpo plateado del dirigible (cápsula)
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(zx + 4, zy + 2, 54, 12);
    ctx.fillRect(zx + 7, zy, 48, 16);
    // Sombra plateada inferior
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(zx + 7, zy + 14, 46, 2);
    // Góndola inferior verde
    ctx.fillStyle = '#166534';
    ctx.fillRect(zx + 20, zy + 16, 22, 4);
    // Pantalla LED de marquesina negra
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(zx + 10, zy + 4, 42, 8);
    // Texto BONUS en amarillo fosforescente
    ctx.font = '5px "Press Start 2P"';
    ctx.fillStyle = '#fde047';
    ctx.textAlign = 'center';
    ctx.fillText(`BONUS ${Math.floor(GameState.bonus)}`, zx + 31, zy + 10.5);

    // 3. Carpa de Circo (Big Top) al centro con rayas amarillas y cian
    const tentPeakX = 104;
    const tentPeakY = 12;
    const tentBaseY = 48;
    const tentW = 44;
    const stripeW = 4;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tentPeakX, tentPeakY);
    ctx.lineTo(tentPeakX - tentW / 2, tentBaseY);
    ctx.lineTo(tentPeakX + tentW / 2, tentBaseY);
    ctx.closePath();
    ctx.clip();
    for (let sx = tentPeakX - tentW / 2; sx <= tentPeakX + tentW / 2; sx += stripeW) {
        ctx.fillStyle = ((Math.floor((sx - (tentPeakX - tentW / 2)) / stripeW)) % 2 === 0) ? '#fde047' : '#00e5ff';
        ctx.fillRect(sx, tentPeakY, stripeW, tentBaseY - tentPeakY);
    }
    ctx.restore();
    // Banderín verde en la cima
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.moveTo(tentPeakX, tentPeakY);
    ctx.lineTo(tentPeakX + 8, tentPeakY - 3 + Math.sin(Date.now() / 150) * 1);
    ctx.lineTo(tentPeakX, tentPeakY - 6);
    ctx.closePath();
    ctx.fill();

    // 4. Rueda de la Fortuna (Ferris Wheel) a la derecha
    const wheelX = 176;
    const wheelY = 24;
    const wheelR = 15;
    const angle = GameState.wheelAngle || 0;
    // Soporte en V
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(wheelX - 10, 48);
    ctx.lineTo(wheelX, wheelY);
    ctx.lineTo(wheelX + 10, 48);
    ctx.stroke();
    // Aro exterior
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelR, 0, Math.PI * 2);
    ctx.stroke();
    // Radios y cabinas giratorias
    const gondolaColors = ['#ef4444', '#3b82f6', '#10b981', '#facc15', '#ec4899', '#8b5cf6'];
    for (let i = 0; i < 6; i++) {
        const spkAng = angle + (i * Math.PI / 3);
        const gx = wheelX + Math.cos(spkAng) * wheelR;
        const gy = wheelY + Math.sin(spkAng) * wheelR;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wheelX, wheelY);
        ctx.lineTo(gx, gy);
        ctx.stroke();
        ctx.fillStyle = gondolaColors[i];
        ctx.fillRect(gx - 2.5, gy - 2, 5, 4);
    }
    // Eje central
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Franja de Luces de Marquesina parpadeantes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 48, CANVAS_WIDTH, 4);
    const bulbCols = ['#ef4444', '#3b82f6', '#facc15', '#10b981', '#ec4899'];
    const bulbOffset = Math.floor(Date.now() / 120) % bulbCols.length;
    for (let bx = 2; bx < CANVAS_WIDTH; bx += 8) {
        const colIdx = (Math.floor(bx / 8) + bulbOffset) % bulbCols.length;
        ctx.fillStyle = bulbCols[colIdx];
        ctx.fillRect(bx, 49, 3, 2);
    }

    // 6. Alambrado / Malla Ciclónica con Postes de Concreto
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 52, CANVAS_WIDTH, 24);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.8;
    const meshOffset = Math.floor(GameState.distancePixels * 0.4) % 12;
    ctx.beginPath();
    for (let mx = -12; mx < CANVAS_WIDTH + 12; mx += 6) {
        ctx.moveTo(mx - meshOffset, 52);
        ctx.lineTo(mx - meshOffset + 12, 76);
        ctx.moveTo(mx - meshOffset + 12, 52);
        ctx.lineTo(mx - meshOffset, 76);
    }
    ctx.stroke();

    // Postes de concreto cada 14 metros
    for (let m = 0; m <= 100; m += 14) {
        const px = getScreenXFromMeter(m);
        if (px > -15 && px < CANVAS_WIDTH + 15) {
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(px - 1.5, 52, 3, 24);
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(px - 2.5, 50, 5, 3);
        }
    }

    // Bolsas de dinero ($) sobre la valla como en la foto de referencia
    GameState.fenceBags.forEach(bag => {
        if (!bag.collected) {
            const bx = getScreenXFromMeter(bag.meter);
            if (bx > -20 && bx < CANVAS_WIDTH + 20) {
                ctx.fillStyle = '#fef08a';
                ctx.fillRect(bx - 6, bag.y - 7, 12, 13);
                ctx.fillStyle = '#ca8a04';
                ctx.fillRect(bx - 4, bag.y - 9, 8, 2);
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(bx - 2, bag.y - 7, 4, 2);
                ctx.fillStyle = '#ca8a04';
                ctx.font = '6px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.fillText('$', bx, bag.y + 3);
            }
        }
    });

    // 7. Faldón festoneado púrpura bajo la valla
    const drapeW = 12;
    const drapeScroll = Math.floor(GameState.distancePixels * 0.4) % drapeW;
    for (let dx = -drapeW; dx < CANVAS_WIDTH + drapeW; dx += drapeW) {
        const curX = dx - drapeScroll;
        ctx.fillStyle = '#7c3aed';
        ctx.beginPath();
        ctx.arc(curX + drapeW / 2, 76, drapeW / 2, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#581c87';
        ctx.beginPath();
        ctx.arc(curX + drapeW / 2, 76, drapeW / 3, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.fillRect(curX + drapeW / 2 - 1, 76 + drapeW / 2 - 1, 2, 2);
    }

    // 8. Fondo bajo y Suelo de hierba verde
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 84, CANVAS_WIDTH, 40);

    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 124, CANVAS_WIDTH, CANVAS_HEIGHT - 124);
    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, 124, CANVAS_WIDTH, 2);

    // 9. Plataformas de Circo y Camas Elásticas
    GameState.trampolines.forEach(tr => {
        const trX = getScreenXFromMeter(tr.meter);
        if (trX < -50 || trX > CANVAS_WIDTH + 50) return;

        const squash = tr.squash || 0;
        const topY = tr.topY + squash;
        const leftX = trX - tr.w / 2;

        // Sombra en el suelo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(leftX + 2, 148, tr.w - 4, 4);

        if (tr.isPedestal) {
            // ==========================================
            // 🏛️ PLATAFORMA DE CIRCO ELEVADA / PEDESTAL
            // ==========================================
            // Base roja clásica de circo
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(leftX + 2, topY + 5, tr.w - 4, 150 - (topY + 5));
            ctx.fillStyle = '#991b1b';
            ctx.fillRect(leftX + 2, topY + 11, tr.w - 4, 4);

            // Borde y cornisa dorada
            ctx.fillStyle = '#facc15';
            ctx.fillRect(leftX - 1, topY + 2, tr.w + 2, 4);
            ctx.fillStyle = '#ca8a04';
            ctx.fillRect(leftX, topY + 5, tr.w, 2);

            // Superficie superior dorada/blanca
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(leftX, topY, tr.w, 3);

            // Estrella central de circo
            ctx.fillStyle = '#ffffff';
            ctx.font = '6px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('★', trX, topY + 15);
        } else {
            // ==========================================
            // 🎪 CAMA ELÁSTICA (Tambor a rayas rosas y blancas)
            // ==========================================
            const bodyH = 150 - (topY + 7);
            const stripeW = 4;
            for (let sx = leftX + 1; sx < leftX + tr.w - 1; sx += stripeW) {
                const stripeIdx = Math.floor((sx - leftX) / stripeW);
                ctx.fillStyle = (stripeIdx % 2 === 0) ? '#f472b6' : '#ffffff';
                ctx.fillRect(sx, topY + 7, Math.min(stripeW, leftX + tr.w - 1 - sx), bodyH);
            }

            // Ribete base inferior fucsia oscuro
            ctx.fillStyle = '#831843';
            ctx.fillRect(leftX, 149, tr.w, 3);

            // Borde superior azul con triángulos decorativos amarillos y rojos
            ctx.fillStyle = '#1d4ed8';
            ctx.fillRect(leftX - 1, topY + 2, tr.w + 2, 5);

            for (let tx = leftX + 1; tx < leftX + tr.w - 3; tx += 6) {
                ctx.fillStyle = ((Math.floor((tx - leftX) / 6)) % 2 === 0) ? '#facc15' : '#ef4444';
                ctx.beginPath();
                ctx.moveTo(tx, topY + 7);
                ctx.lineTo(tx + 3, topY + 3);
                ctx.lineTo(tx + 6, topY + 7);
                ctx.closePath();
                ctx.fill();
            }

            // Superficie elástica blanca (Bounce Mat)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(leftX, topY, tr.w, 3);
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(leftX + 3, topY + 1, tr.w - 6, 1);
        }
    });

    // 10. Tragafuegos y Bolas de Fuego
    GameState.firebreathers.forEach(fb => {
        const fbX = getScreenXFromMeter(fb.meter);
        if (fbX < -30 || fbX > CANVAS_WIDTH + 30) return;

        const sine = Math.sin(fb.firePhase);
        const isSpitting = sine > 0.1;
        const fireCurrentY = fb.y - (Math.max(0, sine) * 46);

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(fbX - 7, 149, 14, 3);

        // Pantalones oscuros
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(fbX - 5, 137, 10, 11);
        // Botas
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(fbX - 6, 147, 5, 3);
        ctx.fillRect(fbX + 1, 147, 5, 3);
        // Torso musculoso desnudo
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(fbX - 6, 126, 12, 11);
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(fbX - 4, 128, 8, 4);
        // Cabeza
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(fbX - 3, 119, 7, 7);
        // Pelo negro
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(fbX - 4, 118, 9, 3);
        // Boca abierta
        if (isSpitting) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(fbX - 1, 120, 3, 3);
        }
        // Brazo con antorcha
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(fbX + 5, 126, 3, 6);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(fbX + 7, 123, 2, 10);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(fbX + 6, 119, 4, 4);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(fbX + 7, 120, 2, 2);

        // Bola de fuego lanzada hacia arriba
        if (isSpitting) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(fbX - 1, 120);
            ctx.lineTo(fbX + 1, 120);
            ctx.lineTo(fbX + 3, fireCurrentY + 4);
            ctx.lineTo(fbX - 3, fireCurrentY + 4);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(fbX, fireCurrentY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(fbX, fireCurrentY, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(fbX, fireCurrentY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // 11. Podio de Llegada en 0M
    renderPodium();

    // 12. Charlie a Pie
    renderCharlieOnFoot();
}

function renderCharlieOnFoot() {
    const p = GameState.player;
    if (p.invulnTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) return;

    ctx.save();
    ctx.translate(Math.round(p.screenX), Math.round(p.y));

    // Zapatos / Pies
    ctx.fillStyle = '#000000';
    if (p.vy < 0) {
        ctx.fillRect(-5, -3, 4, 3);
        ctx.fillRect(2, -3, 4, 3);
    } else {
        ctx.fillRect(-4, -1, 3, 3);
        ctx.fillRect(2, -1, 3, 3);
    }

    // Traje rojo de payaso
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-5, -12, 10, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -10, 2, 2);
    ctx.fillRect(-1, -6, 2, 2);

    // Cuello plisado blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, -14, 12, 2);

    // Brazos
    ctx.fillStyle = '#ef4444';
    if (p.vy < 0 || p.isVictoryPodium) {
        ctx.fillRect(-8, -19, 3, 7);
        ctx.fillRect(5, -19, 3, 7);
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(-8, -21, 3, 2);
        ctx.fillRect(5, -21, 3, 2);
    } else {
        ctx.fillRect(-9, -13, 4, 3);
        ctx.fillRect(5, -13, 4, 3);
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(-10, -13, 2, 3);
        ctx.fillRect(8, -13, 2, 3);
    }

    // Rostro de Charlie
    ctx.fillStyle = '#fbcfe8';
    ctx.fillRect(-4, -20, 8, 7);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(1, -18, 2, 2); // Nariz
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, -19, 2, 2);  // Ojo

    // Rizos de pelo naranja
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(-6, -21, 3, 4);

    // Sombrerito cónico azul con pompón amarillo
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.moveTo(-3, -21);
    ctx.lineTo(2, -26);
    ctx.lineTo(3, -21);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.fillRect(1, -28, 2, 2);

    ctx.restore();
}

// ==========================================
// 🎪 Renderizado Nivel 3: Los Trapecios Voladores (Konami NES Original)
// ==========================================
function renderTrapezeStage() {
    // 1. Techo del Circo Oscuro Nocturno
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 112);

    // 2. Riel / Viga Metálica de Trapecios en la parte superior (como en la foto)
    const railY = 46;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, railY - 2, CANVAS_WIDTH, 4);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, railY - 3, CANVAS_WIDTH, 1);
    ctx.fillRect(0, railY + 2, CANVAS_WIDTH, 1);

    // Estructura de celosía diagonal en el riel
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let rx = 0; rx < CANVAS_WIDTH; rx += 8) {
        ctx.moveTo(rx, railY - 2);
        ctx.lineTo(rx + 4, railY + 2);
        ctx.lineTo(rx + 8, railY - 2);
    }
    ctx.stroke();

    // 3. Pared Circense del Fondo (rombos festivos y cortinas como en la foto)
    const wallY = 112;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, wallY, CANVAS_WIDTH, 14);

    // Rombos rojos y amarillos alternados
    for (let rx = 0; rx < CANVAS_WIDTH; rx += 8) {
        ctx.fillStyle = ((rx / 8) % 2 === 0) ? '#dc2626' : '#facc15';
        ctx.beginPath();
        ctx.moveTo(rx + 4, wallY + 1);
        ctx.lineTo(rx + 7, wallY + 7);
        ctx.lineTo(rx + 4, wallY + 13);
        ctx.lineTo(rx + 1, wallY + 7);
        ctx.closePath();
        ctx.fill();
    }

    // Faldón festoneado púrpura bajo la cornisa
    const drapeW = 10;
    for (let dx = 0; dx < CANVAS_WIDTH; dx += drapeW) {
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(dx + drapeW / 2, wallY + 14, drapeW / 2, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(dx + drapeW / 2 - 1, wallY + 14 + drapeW / 2 - 1, 2, 2);
    }

    // Puerta con Elefante asomándose a la izquierda (como en la foto de referencia)
    const doorX = 14;
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(doorX, wallY - 8, 22, 22);
    ctx.fillStyle = '#000000';
    ctx.fillRect(doorX + 2, wallY - 6, 18, 20);

    // Elefante saludando con la trompa
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(doorX + 5, wallY, 11, 10);
    ctx.fillRect(doorX + 9, wallY + 6, 4, 7); // Trompa
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(doorX + 7, wallY + 2, 2, 2);  // Ojo
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(doorX + 8, wallY - 3, 5, 3);  // Sombrero

    // 4. Suelo Verde de la Arena de Circo
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 138, CANVAS_WIDTH, CANVAS_HEIGHT - 138);
    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, 138, CANVAS_WIDTH, 2);

    // 5. Camas Elásticas de Seguridad en el suelo (mats como en la foto)
    GameState.safetyMats.forEach(mat => {
        const matX = getScreenXFromMeter(mat.meter);
        if (matX < -40 || matX > CANVAS_WIDTH + 40) return;

        const leftX = matX - mat.w / 2;
        const topY = mat.y - (mat.squash || 0);

        // Base roja trapezoidal
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(leftX - 2, 149);
        ctx.lineTo(leftX + 2, topY + 4);
        ctx.lineTo(leftX + mat.w - 2, topY + 4);
        ctx.lineTo(leftX + mat.w + 2, 149);
        ctx.closePath();
        ctx.fill();

        // Triángulos blancos decorativos
        for (let tx = leftX + 2; tx < leftX + mat.w - 4; tx += 6) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(tx, 148);
            ctx.lineTo(tx + 3, topY + 4);
            ctx.lineTo(tx + 6, 148);
            ctx.closePath();
            ctx.fill();
        }

        // Lona blanca elástica superior
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(leftX, topY, mat.w, 4);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(leftX + 2, topY + 1, mat.w - 4, 1);
    });

    // 6. Trapecios Oscilantes con Cuerdas a Rayas Rojas y Blancas
    GameState.trapezes.forEach(tr => {
        const anchorX = getScreenXFromMeter(tr.meter);
        if (anchorX < -50 || anchorX > CANVAS_WIDTH + 50) return;

        // Soporte anclado en el riel
        ctx.fillStyle = '#fde047';
        ctx.fillRect(anchorX - 3, tr.railY - 2, 6, 4);

        // Cuerda izquierda y derecha
        const leftAnchorX = anchorX - 3;
        const rightAnchorX = anchorX + 3;
        const leftBarX = tr.barX - 8;
        const rightBarX = tr.barX + 8;
        const barY = tr.barY;

        drawCandyStripedRope(leftAnchorX, tr.railY, leftBarX, barY);
        drawCandyStripedRope(rightAnchorX, tr.railY, rightBarX, barY);

        // Barra dorada horizontal del trapecio
        ctx.fillStyle = '#facc15';
        ctx.fillRect(tr.barX - 10, barY - 1, 20, 3);
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(tr.barX - 11, barY - 1.5, 2, 4);
        ctx.fillRect(tr.barX + 9, barY - 1.5, 2, 4);
    });

    // 7. Podio de Llegada en 0M
    renderPodium();

    // 8. Charlie en el Trapecio / Volando en el Aire
    renderCharlieTrapeze();

    // 9. Rótulos Emergentes de Puntuación (ej: '500')
    GameState.popups.forEach(pop => {
        ctx.save();
        ctx.font = '6px "Press Start 2P"';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 3;
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
    });
}

function drawCandyStripedRope(x1, y1, x2, y2) {
    const steps = 14;
    for (let i = 0; i < steps; i++) {
        const tA = i / steps;
        const tB = (i + 1) / steps;
        const segX1 = x1 + (x2 - x1) * tA;
        const segY1 = y1 + (y2 - y1) * tA;
        const segX2 = x1 + (x2 - x1) * tB;
        const segY2 = y1 + (y2 - y1) * tB;

        ctx.strokeStyle = (i % 2 === 0) ? '#ef4444' : '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(segX1, segY1);
        ctx.lineTo(segX2, segY2);
        ctx.stroke();
    }
}

function renderCharlieTrapeze() {
    const p = GameState.player;
    if (p.invulnTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) return;

    ctx.save();
    ctx.translate(Math.round(p.screenX), Math.round(p.y));

    if (p.charlieState === 'flying' && !p.isVictoryPodium) {
        ctx.rotate(p.flipAngle);
    }

    // Traje magenta/rosa de acróbata (como en la foto de trapecios)
    // 1. Zapatos / Pies cian
    ctx.fillStyle = '#00e5ff';
    if (p.isVictoryPodium) {
        ctx.fillRect(-5, 11, 4, 3);
        ctx.fillRect(2, 11, 4, 3);
    } else if (p.charlieState === 'holding') {
        ctx.fillRect(-4, 12, 3, 3);
        ctx.fillRect(1, 12, 3, 3);
    } else {
        ctx.fillRect(-5, 8, 4, 3);
        ctx.fillRect(2, 8, 4, 3);
    }

    // 2. Traje magenta
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(-5, 0, 10, 12);
    // Cinturón cian
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(-5, 6, 10, 2);

    // 3. Volante blanco plisado
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, -2, 12, 2);

    // 4. Brazos
    ctx.fillStyle = '#ec4899';
    if (p.isVictoryPodium) {
        // Brazos en alto alzados celebrando la victoria
        ctx.fillRect(-8, -8, 3, 7);
        ctx.fillRect(5, -8, 3, 7);
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(-8, -10, 3, 2);
        ctx.fillRect(5, -10, 3, 2);
    } else if (p.charlieState === 'holding') {
        ctx.fillRect(-6, -7, 3, 7);
        ctx.fillRect(3, -7, 3, 7);
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(-6, -9, 3, 2);
        ctx.fillRect(3, -9, 3, 2);
    } else {
        ctx.fillRect(-8, -4, 3, 6);
        ctx.fillRect(5, -4, 3, 6);
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(-8, -6, 3, 2);
        ctx.fillRect(5, -6, 3, 2);
    }

    // 5. Rostro de Charlie
    ctx.fillStyle = '#fbcfe8';
    ctx.fillRect(-4, -9, 8, 7);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(1, -7, 2, 2); // Nariz
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, -8, 2, 2);  // Ojo

    // 6. Rizos naranjas
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(-6, -10, 3, 4);

    // 7. Sombrerito cian con pompón amarillo
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.moveTo(-3, -10);
    ctx.lineTo(2, -15);
    ctx.lineTo(3, -10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.fillRect(1, -17, 2, 2);

    ctx.restore();
}

function renderCircusTent() {
    const theme = getTheme(GameState.level);

    // 1. Cielo negro nocturno sobre la carpa
    ctx.fillStyle = theme.bgWall || '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 26);

    // 2. Barandilla superior de la carpa (White rail con remaches rojos)
    ctx.fillStyle = '#f8fcf8';
    ctx.fillRect(0, 26, CANVAS_WIDTH, 3);
    ctx.fillStyle = '#f82000';
    for (let x = 0; x < CANVAS_WIDTH; x += 4) {
        ctx.fillRect(x + 1, 27, 2, 1);
    }

    // 3. Gradas de Espectadores / Packed Circus Audience (4 filas de público estilo Konami NES)
    // Grilla clásica de cabezas de público en amarillo (#f8bc20), rojo (#f82000), blanco (#f8fcf8) y negro (#000000)
    const audienceY = 29;
    const audienceH = 16;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, audienceY, CANVAS_WIDTH, audienceH);

    for (let y = audienceY; y < audienceY + audienceH; y += 4) {
        const rowIdx = Math.floor((y - audienceY) / 4);
        for (let x = 0; x < CANVAS_WIDTH; x += 4) {
            const pattern = (Math.floor(x / 4) + rowIdx) % 3;
            // Cabeza del espectador
            ctx.fillStyle = pattern === 0 ? '#f8bc20' : (pattern === 1 ? '#f82000' : '#f8fcf8');
            ctx.fillRect(x + 1, y, 2, 2);
            // Sombra / cuello
            ctx.fillStyle = '#000000';
            ctx.fillRect(x + 1, y + 2, 2, 1);
        }
    }

    // 4. Franja divisoria entre el público y los cortinajes
    ctx.fillStyle = '#f8fcf8';
    ctx.fillRect(0, 45, CANVAS_WIDTH, 2);

    // 5. Cortinaje Festoneado / Scalloped Drapery Festoons (Idéntico a la referencia)
    // Arcos blancos festoneados con franjas verticales en cian (#00f8f8), rosa (#f82850) y blanco (#f8fcf8)
    const drapeY = 47;
    const scallopW = 12;
    for (let x = 0; x < CANVAS_WIDTH; x += scallopW) {
        // Fondo blanco del arco
        ctx.fillStyle = '#f8fcf8';
        ctx.fillRect(x, drapeY, scallopW - 1, 10);

        // Franjas verticales interiores: Cian y Rosa
        ctx.fillStyle = '#00f8f8';
        ctx.fillRect(x + 1, drapeY + 2, 3, 8);
        ctx.fillStyle = '#f82850';
        ctx.fillRect(x + 7, drapeY + 2, 3, 8);

        // Recorte inferior en forma de arco (color de césped)
        ctx.fillStyle = '#308000';
        ctx.fillRect(x, drapeY + 9, 2, 2);
        ctx.fillRect(x + scallopW - 3, drapeY + 9, 2, 2);

        // Pompón blanco en la unión de los festones
        ctx.fillStyle = '#f8fcf8';
        ctx.fillRect(x + scallopW - 2, drapeY + 8, 2, 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + scallopW - 2, drapeY + 10, 2, 1);
    }

    // 6. Puerta de Cortinaje con Elefante Animado en la derecha (como en la foto de referencia)
    const doorX = CANVAS_WIDTH - 36;
    const doorY = 26;
    const doorW = 28;
    const doorH = 32;

    // Toldo de circo a rayas rojas y blancas sobre la puerta
    for (let tx = doorX - 2; tx < doorX + doorW + 2; tx += 4) {
        ctx.fillStyle = ((Math.floor(tx / 4)) % 2 === 0) ? '#f82000' : '#f8fcf8';
        ctx.fillRect(tx, doorY, 4, 6);
    }
    ctx.fillStyle = '#f82000';
    ctx.fillRect(doorX - 2, doorY + 6, doorW + 4, 2);

    // Interior oscuro de la carpa
    ctx.fillStyle = '#000000';
    ctx.fillRect(doorX, doorY + 8, doorW, doorH - 8);

    // Elefante gris asomándose y saludando con la trompa
    const animFrame = Math.floor(Date.now() / 250) % 2;
    const elX = doorX + 4;
    const elY = doorY + 12;

    ctx.fillStyle = '#c0c4c0';
    ctx.fillRect(elX + 2, elY + 2, 12, 12);
    ctx.fillRect(elX, elY + 3, 4, 8); // Oreja izq
    ctx.fillRect(elX + 14, elY + 3, 3, 7); // Oreja der

    // Trompa levantada
    ctx.fillStyle = '#c0c4c0';
    ctx.fillRect(elX + 6, elY + 9, 4, 5);
    if (animFrame === 0) {
        ctx.fillRect(elX + 8, elY + 6, 4, 4);
        ctx.fillRect(elX + 11, elY + 4, 3, 3);
    } else {
        ctx.fillRect(elX + 7, elY + 7, 4, 4);
        ctx.fillRect(elX + 10, elY + 6, 3, 3);
    }

    // Ojo con pupila
    ctx.fillStyle = '#f8fcf8';
    ctx.fillRect(elX + 4, elY + 5, 3, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(elX + 5, elY + 6, 2, 2);

    // Sombrerito rojo de circo con pompón dorado
    ctx.fillStyle = '#f82000';
    ctx.fillRect(elX + 6, elY - 2, 4, 4);
    ctx.fillStyle = '#f8bc20';
    ctx.fillRect(elX + 7, elY - 3, 2, 2);
}

function renderArena() {
    // 1. Suelo de césped verde auténtico de Circus Charlie (NES #308000)
    ctx.fillStyle = '#308000';
    ctx.fillRect(0, 58, CANVAS_WIDTH, CANVAS_HEIGHT - 58);

    // 2. Líneas horizontales de perspectiva del circo en negro sólido (#000000)
    ctx.fillStyle = '#000000';
    TRACK_LANES.forEach(ly => {
        ctx.fillRect(0, ly, CANVAS_WIDTH, 1.5);
    });

    // 3. Postes de medición con banderitas cada 10M
    for (let m = 0; m <= 100; m += 10) {
        const px = getScreenXFromMeter(m);
        if (px > -20 && px < CANVAS_WIDTH + 20) {
            ctx.fillStyle = '#f8fcf8';
            ctx.fillRect(px, 58, 2, 10);
            ctx.fillStyle = '#f82000';
            ctx.beginPath();
            ctx.moveTo(px + 2, 58);
            ctx.lineTo(px + 8, 61);
            ctx.lineTo(px + 2, 64);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#f8fcf8';
            ctx.font = '5px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(`${m}m`, px + 1, 55);
        }
    }
}

function renderPodium() {
    if (!GameState.podium) return;
    const px = getScreenXFromMeter(GameState.podium.meter);
    if (px < -40 || px > CANVAS_WIDTH + 40) return;

    // Podio trapezoidal de circo NES
    ctx.fillStyle = NES_PALETTE.RED;
    ctx.fillRect(px - 4, FLOOR_Y - 18, 36, 18);

    // Borde dorado
    ctx.fillStyle = NES_PALETTE.GOLD;
    ctx.fillRect(px - 6, FLOOR_Y - 20, 40, 3);

    // Estrella central en el podio
    ctx.fillStyle = NES_PALETTE.WHITE;
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('★', px + 14, FLOOR_Y - 6);
}

function renderDepthSortedEntities() {
    const p = GameState.player;
    const entities = [];

    // Vasijas de fuego
    GameState.firePots.forEach(fp => {
        entities.push({ type: 'pot', baseY: fp.baseY || FLOOR_Y, data: fp });
    });

    // Monitos de circo corredores
    GameState.enemies.forEach(e => {
        entities.push({ type: 'enemy', baseY: e.baseY || FLOOR_Y, data: e });
    });

    // Jugador (Charlie y León)
    entities.push({ type: 'player', baseY: p.baseY, data: p });

    // Ordenar de menor baseY a mayor baseY (de fondo a primer plano)
    entities.sort((a, b) => a.baseY - b.baseY);

    entities.forEach(ent => {
        if (ent.type === 'pot') {
            renderSingleFirePot(ent.data);
        } else if (ent.type === 'enemy') {
            renderRunningEnemy(ent.data);
        } else if (ent.type === 'player') {
            renderCharlieAndLion();
        }
    });
}

function renderSingleFirePot(fp) {
    const sx = Math.round(getScreenXFromMeter(fp.meter));
    if (sx < -30 || sx > CANVAS_WIDTH + 30) return;

    const potX = sx;
    const potY = Math.round(fp.y);

    // Sombra ovalada negra en el césped
    ctx.fillStyle = '#000000';
    ctx.fillRect(potX + 2, potY + 12, 16, 2);
    ctx.fillRect(potX + 4, potY + 14, 12, 1);

    // Vasija de porcelana blanca auténtica de Circus Charlie con asas laterales
    ctx.fillStyle = '#f8fcf8';
    ctx.fillRect(potX, potY + 4, 3, 5);     // Asa izq
    ctx.fillRect(potX + 17, potY + 4, 3, 5); // Asa der
    ctx.fillStyle = '#000000';
    ctx.fillRect(potX + 1, potY + 5, 1, 3);
    ctx.fillRect(potX + 18, potY + 5, 1, 3);

    // Cuerpo de la vasija blanca
    ctx.fillStyle = '#f8fcf8';
    ctx.fillRect(potX + 3, potY + 3, 14, 9);
    ctx.fillRect(potX + 4, potY + 12, 12, 2); // Base

    // Ornamentos carmesí de circo en la vasija
    ctx.fillStyle = '#f82000';
    ctx.fillRect(potX + 4, potY + 4, 12, 2); // Cuello
    ctx.fillRect(potX + 6, potY + 7, 8, 3);  // Rombo central
    ctx.fillStyle = '#b80400';
    ctx.fillRect(potX + 5, potY + 12, 10, 1); // Borde base

    // Llamas ardientes pixel-art animadas (2 frames de parpadeo a 15fps)
    const flameFrame = Math.floor(Date.now() / 80) % 2;
    // Capa exterior roja (#f82000)
    ctx.fillStyle = '#f82000';
    if (flameFrame === 0) {
        ctx.fillRect(potX + 5, potY - 8, 3, 5);
        ctx.fillRect(potX + 8, potY - 11, 4, 8);
        ctx.fillRect(potX + 12, potY - 7, 3, 4);
    } else {
        ctx.fillRect(potX + 4, potY - 7, 3, 4);
        ctx.fillRect(potX + 7, potY - 11, 5, 8);
        ctx.fillRect(potX + 11, potY - 9, 4, 6);
    }
    ctx.fillRect(potX + 4, potY - 3, 12, 6);

    // Capa media naranja (#f89c10)
    ctx.fillStyle = '#f89c10';
    if (flameFrame === 0) {
        ctx.fillRect(potX + 6, potY - 5, 3, 4);
        ctx.fillRect(potX + 9, potY - 8, 3, 6);
        ctx.fillRect(potX + 12, potY - 4, 2, 3);
    } else {
        ctx.fillRect(potX + 5, potY - 4, 2, 3);
        ctx.fillRect(potX + 8, potY - 8, 3, 6);
        ctx.fillRect(potX + 11, potY - 6, 3, 4);
    }

    // Núcleo amarillo brillante (#f8bc20)
    ctx.fillStyle = '#f8bc20';
    ctx.fillRect(potX + 7, potY - 4, 5, 4);
    ctx.fillRect(potX + 8, potY - 6, 3, 3);
}

// ==========================================
// 🐵 Monitos de Circo Corredores (Enemigos Arcade Konami NES)
// ==========================================
function renderRunningEnemy(e) {
    const sx = Math.round(getScreenXFromMeter(e.meter));
    if (sx < -40 || sx > CANVAS_WIDTH + 40) return;

    const ey = Math.round(e.baseY || FLOOR_Y);
    const frame = (e.animFrame || 0) % 4;

    ctx.save();
    ctx.translate(sx, ey);

    // 1. Sombra ovalada en la pista verde
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Colores según tipo de mono de circo Konami
    const isBlue = e.type === 'monkey_blue';
    const furColor = isBlue ? '#00f8f8' : '#b80400';       // Cian brillante o Rojo/Marrón cálido NES
    const vestColor = isBlue ? '#f82000' : '#00f8f8';      // Chaleco contrastante
    const trimColor = '#f8bc20';                           // Botones / Ribete dorado
    const skinColor = '#f8d0b0';                           // Piel melocotón NES
    const hatColor = isBlue ? '#f8bc20' : '#f82000';       // Gorrito circense

    // Bobbing vertical según paso de carrera
    const bobY = (frame === 1 || frame === 3) ? 1 : 0;

    // 3. Cola rizada hacia arriba a la derecha (corre hacia la izquierda)
    ctx.fillStyle = furColor;
    if (frame === 0 || frame === 2) {
        ctx.fillRect(4, -10 + bobY, 3, 2);
        ctx.fillRect(6, -13 + bobY, 2, 4);
        ctx.fillRect(5, -15 + bobY, 2, 2);
    } else {
        ctx.fillRect(4, -9 + bobY, 3, 2);
        ctx.fillRect(6, -11 + bobY, 2, 3);
        ctx.fillRect(5, -13 + bobY, 2, 2);
    }

    // 4. Piernas / Patas traseras animadas
    ctx.fillStyle = furColor;
    if (frame === 0) {
        // Zancada abierta
        ctx.fillRect(2, -4 + bobY, 3, 4);
        ctx.fillRect(3, 0 + bobY, 3, 2); // Pie trasero estirado
        ctx.fillRect(-5, -4 + bobY, 3, 4);
        ctx.fillRect(-7, 0 + bobY, 3, 2); // Pie delantero aterrizando
    } else if (frame === 1) {
        // Agrupación bajo el cuerpo
        ctx.fillRect(0, -3 + bobY, 3, 3);
        ctx.fillRect(-3, -3 + bobY, 3, 3);
    } else if (frame === 2) {
        // Impulso cruzado
        ctx.fillRect(3, -5 + bobY, 3, 5);
        ctx.fillRect(4, 0 + bobY, 2, 2);
        ctx.fillRect(-6, -3 + bobY, 3, 3);
        ctx.fillRect(-8, 0 + bobY, 3, 2);
    } else {
        // En el aire
        ctx.fillRect(1, -4 + bobY, 3, 3);
        ctx.fillRect(-4, -4 + bobY, 3, 3);
    }

    // 5. Cuerpo del mono
    ctx.fillStyle = furColor;
    ctx.fillRect(-4, -11 + bobY, 8, 7);

    // 6. Chaleco circense
    ctx.fillStyle = vestColor;
    ctx.fillRect(-4, -11 + bobY, 3, 6);
    ctx.fillRect(1, -11 + bobY, 3, 6);
    // Botones dorados
    ctx.fillStyle = trimColor;
    ctx.fillRect(-1, -10 + bobY, 2, 2);
    ctx.fillRect(-1, -7 + bobY, 2, 2);

    // 7. Brazos corriendo hacia adelante (hacia la izquierda)
    ctx.fillStyle = furColor;
    if (frame === 0 || frame === 2) {
        ctx.fillRect(-7, -9 + bobY, 4, 3);
        ctx.fillStyle = skinColor;
        ctx.fillRect(-9, -8 + bobY, 2, 2); // Mano extendida
    } else {
        ctx.fillRect(-6, -7 + bobY, 3, 3);
        ctx.fillStyle = skinColor;
        ctx.fillRect(-8, -6 + bobY, 2, 2);
    }

    // 8. Cabeza del mono
    ctx.fillStyle = furColor;
    ctx.fillRect(-4, -17 + bobY, 7, 6);
    // Orejas
    ctx.fillStyle = skinColor;
    ctx.fillRect(3, -16 + bobY, 2, 3);
    ctx.fillRect(-5, -16 + bobY, 2, 3);

    // Cara / Mofletes de piel melocotón
    ctx.fillRect(-4, -15 + bobY, 6, 4);

    // Ojos negros (mirando hacia adelante / izquierda a Charlie)
    ctx.fillStyle = '#000000';
    ctx.fillRect(-3, -15 + bobY, 2, 2);
    ctx.fillStyle = '#f8fcf8';
    ctx.fillRect(-3, -15 + bobY, 1, 1); // Brillo

    // Hocico / Nariz
    ctx.fillStyle = '#000000';
    ctx.fillRect(-4, -13 + bobY, 2, 1);

    // 9. Gorrito circense (Fez con pompón)
    ctx.fillStyle = hatColor;
    ctx.fillRect(-2, -20 + bobY, 4, 3);
    ctx.fillStyle = trimColor;
    ctx.fillRect(2, -21 + bobY, 2, 2); // Pompón / Borla dorada

    // 10. Bolsa de dinero ($) o Globo de bonificación si tiene
    if (e.hasMoneyBag && !e.bagCollected) {
        const floatY = -24 + Math.sin(Date.now() / 150) * 2;
        ctx.fillStyle = '#f8bc20';
        ctx.fillRect(-5, floatY - 6, 10, 10);
        ctx.fillStyle = '#f82000';
        ctx.fillRect(-3, floatY - 8, 6, 2); // Atadura
        ctx.font = '6px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('$', 0, floatY + 1.5);
    }

    ctx.restore();
}

function renderCharlieAndLion() {
    const p = GameState.player;

    // Parpadeo de invulnerabilidad
    if (p.invulnTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) return;

    // Sombra del león proyectada en el suelo
    ctx.save();
    ctx.translate(Math.round(p.screenX), Math.round(p.baseY));
    const shadowScale = Math.max(0.6, 1.0 - Math.abs(p.jumpY || 0) / 90);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(-14 * shadowScale, 0, 28 * shadowScale, 3);
    ctx.restore();

    ctx.save();
    ctx.translate(Math.round(p.screenX), Math.round(p.y));

    // ============================
    // 🦁 LEÓN (Sprite auténtico NES Circus Charlie)
    // ============================
    const lionBody = '#f8d0b0'; // Melocotón/crema NES
    const lionMane = '#f82000'; // Rojo carmesí NES
    const lionManeDark = '#b80400'; // Rojo oscuro sombreado NES
    const blackColor = '#000000';
    const whiteColor = '#f8fcf8';

    // 1. Cola curvada con pompón rojo
    ctx.fillStyle = lionBody;
    ctx.fillRect(-15, -13, 3, 2);
    ctx.fillRect(-17, -11, 2, 2);
    ctx.fillStyle = lionMane;
    ctx.fillRect(-19, -15, 4, 4);

    // 2. Patas (Galope o Salto)
    ctx.fillStyle = lionBody;
    if (!p.onGround) {
        // Pose de salto: majestuoso vuelo con patas extendidas al frente y atrás
        ctx.fillRect(-17, -8, 8, 4); // Pata trasera horizontal
        ctx.fillRect(-19, -9, 3, 5); // Garra trasera
        ctx.fillRect(8, -8, 8, 4);   // Pata delantera horizontal
        ctx.fillRect(15, -7, 3, 5);  // Garra delantera
        ctx.fillStyle = blackColor;
        ctx.fillRect(-19, -6, 2, 2);
        ctx.fillRect(16, -5, 2, 2);
    } else {
        const f = p.gallopFrame;
        ctx.fillStyle = lionBody;
        if (f === 0) {
            ctx.fillRect(-12, -7, 4, 7); // Trasera izq
            ctx.fillRect(-7, -7, 4, 7);  // Trasera der
            ctx.fillRect(4, -7, 4, 7);   // Delantera izq
            ctx.fillRect(9, -7, 4, 7);   // Delantera der
        } else if (f === 1) {
            ctx.fillRect(-10, -6, 4, 6);
            ctx.fillRect(-5, -6, 4, 6);
            ctx.fillRect(2, -6, 4, 6);
            ctx.fillRect(7, -6, 4, 6);
        } else if (f === 2) {
            ctx.fillRect(-14, -7, 5, 7);
            ctx.fillRect(-8, -6, 4, 6);
            ctx.fillRect(6, -6, 4, 6);
            ctx.fillRect(11, -7, 5, 7);
        } else {
            ctx.fillRect(-8, -6, 4, 6);
            ctx.fillRect(-3, -6, 4, 6);
            ctx.fillRect(3, -6, 4, 6);
            ctx.fillRect(8, -6, 4, 6);
        }
        ctx.fillStyle = blackColor;
        ctx.fillRect(-11, -1, 3, 1);
        ctx.fillRect(7, -1, 3, 1);
    }

    // 3. Tronco y vientre del león
    ctx.fillStyle = lionBody;
    ctx.fillRect(-13, -15, 22, 10);
    // Sombra del vientre
    ctx.fillStyle = lionManeDark;
    ctx.fillRect(-10, -6, 16, 2);

    // 4. Melena voluptuosa carmesí que enmarca la cabeza y pecho
    ctx.fillStyle = lionMane;
    ctx.fillRect(5, -20, 11, 15);
    ctx.fillRect(3, -18, 5, 12);
    ctx.fillStyle = lionManeDark;
    ctx.fillRect(4, -14, 3, 7); // Sombra interior de la melena

    // 5. Cabeza y hocico
    ctx.fillStyle = lionBody;
    ctx.fillRect(10, -18, 8, 9);
    // Hocico y nariz negra
    ctx.fillStyle = blackColor;
    ctx.fillRect(16, -15, 3, 3);
    // Ojo expresivo con pupila
    ctx.fillStyle = whiteColor;
    ctx.fillRect(12, -17, 3, 3);
    ctx.fillStyle = blackColor;
    ctx.fillRect(13, -16, 2, 2);

    // ============================
    // 🤡 CHARLIE (Sprite auténtico Konami)
    // ============================
    const bobY = (p.onGround && p.gallopFrame % 2 === 1) ? -1 : 0;

    // 1. Traje cian de payaso (#00f8f8)
    ctx.fillStyle = '#00f8f8';
    ctx.fillRect(-5, -23 + bobY, 9, 10);

    // 2. Cuello con volante blanco plisado (#f8fcf8)
    ctx.fillStyle = '#f8fcf8';
    ctx.fillRect(-6, -24 + bobY, 11, 2);

    // 3. Brazos: en el salto alza las dos manos celebrando con júbilo
    if (!p.onGround || p.isVictoryPodium) {
        // Brazos estirados hacia arriba con alegría
        ctx.fillStyle = '#00f8f8';
        ctx.fillRect(-8, -30 + bobY, 3, 8); // Brazo izq
        ctx.fillRect(4, -30 + bobY, 3, 8);  // Brazo der
        // Manos abiertas melocotón
        ctx.fillStyle = '#f8d0b0';
        ctx.fillRect(-9, -32 + bobY, 4, 3);
        ctx.fillRect(4, -32 + bobY, 4, 3);
    } else {
        // Brazos al frente sosteniendo riendas
        ctx.fillStyle = '#00f8f8';
        ctx.fillRect(0, -22 + bobY, 6, 3);
        ctx.fillStyle = '#f8d0b0';
        ctx.fillRect(5, -22 + bobY, 3, 3); // Manos
    }

    // 4. Cabeza y rostro de Charlie
    ctx.fillStyle = '#f8d0b0';
    ctx.fillRect(-4, -30 + bobY, 8, 7);
    // Gran nariz roja redonda de payaso
    ctx.fillStyle = '#f82000';
    ctx.fillRect(2, -28 + bobY, 3, 3);
    // Ojo negro
    ctx.fillStyle = blackColor;
    ctx.fillRect(0, -29 + bobY, 2, 2);
    // Rizos de cabello rojo
    ctx.fillStyle = '#f82000';
    ctx.fillRect(-6, -31 + bobY, 3, 4);

    // 5. Gorro puntiagudo cian con pompón blanco
    ctx.fillStyle = '#00f8f8';
    ctx.fillRect(-3, -34 + bobY, 5, 4);
    ctx.fillRect(-2, -36 + bobY, 3, 2);
    ctx.fillStyle = '#f8fcf8';
    ctx.fillRect(-1, -38 + bobY, 2, 2); // Pompón blanco

    ctx.restore();
}

function renderParticles() {
    GameState.particles.forEach(pt => {
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, 2, 2);
    });
}

function renderDistanceMeter() {
    // Cuadro negro con borde rojo del indicador de distancia NES (ej. 50M)
    const meterBoxX = Math.round(CANVAS_WIDTH / 2 - 20);
    const meterBoxY = CANVAS_HEIGHT - 17;

    ctx.fillStyle = '#f82000';
    ctx.fillRect(meterBoxX - 2, meterBoxY - 2, 44, 16);
    ctx.fillStyle = '#000000';
    ctx.fillRect(meterBoxX, meterBoxY, 40, 12);

    ctx.font = '7px "Press Start 2P"';
    ctx.fillStyle = '#f8fcf8';
    ctx.textAlign = 'center';
    const displayM = Math.max(0, Math.ceil(GameState.distanceMeters));
    ctx.fillText(`${displayM}M`, meterBoxX + 20, meterBoxY + 9);
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
// ⌨️ Controles de Teclado (Fase 5 Obligatoria)
// ==========================================
window.addEventListener('keydown', (e) => {
    audio.init();
    const key = e.key.toLowerCase();

    // Retorno instantáneo al QR si está en pantalla de Game Over
    if (GameState.gameOver) {
        if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'space', 'enter', 'z', 'x'].includes(key) || e.code === 'Space') {
            e.preventDefault();
            returnToQrCode();
            return;
        }
    }

    // Arranque instantáneo / bypass local si está en pantalla de espera
    if (!GameState.running) {
        if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'space', 'enter', 'z', 'x'].includes(key) || e.code === 'Space') {
            e.preventDefault();
            startNewGame();
            return;
        }
    }

    // Atajos de prueba rápida para cambio de nivel:
    // Tecla 1: Nivel 1 (Montando al león a través de aros gigantes de fuego)
    // Tecla 2: Nivel 2 (Camas elásticas, dirigible BONUS y tragafuegos de la foto)
    if (key === '1') {
        GameState.level = 1;
        initStage(1);
        if (!GameState.running) startNewGame();
        return;
    }
    if (key === '2') {
        GameState.level = 2;
        initStage(2);
        if (!GameState.running) startNewGame();
        return;
    }
    if (key === '3') {
        GameState.level = 3;
        initStage(3);
        if (!GameState.running) startNewGame();
        return;
    }
    // Tecla 0: Transportar de inmediato a 4M para probar la llegada al podio
    if (key === '0') {
        GameState.distanceMeters = 4.0;
        if (GameState.subgame === 'trapeze') {
            GameState.player.currentTrapezeIdx = Math.max(0, GameState.trapezes.length - 2);
            GameState.player.charlieState = 'holding';
            const tr = GameState.trapezes[GameState.player.currentTrapezeIdx];
            if (tr) {
                GameState.player.screenX = tr.barX;
                GameState.player.y = tr.barY + 6;
            }
        }
        return;
    }

    // 1. Movimiento en 4 Direcciones:
    // Izquierda / Derecha: Frenar / Acelerar
    if (key === 'arrowleft' || key === 'a') inputKeys.left = true;
    if (key === 'arrowright' || key === 'd') inputKeys.right = true;

    // Arriba / Abajo: Subir y Bajar las líneas de la pista
    if (key === 'arrowup' || key === 'w') inputKeys.up = true;
    if (key === 'arrowdown' || key === 's') inputKeys.down = true;

    // 2. Salto con Espacio, Enter, Z o X
    if (e.code === 'Space' || key === ' ' || key === 'z' || key === 'x' || key === 'enter') {
        e.preventDefault();
        inputKeys.jump = true;
        performJump();
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') inputKeys.left = false;
    if (key === 'arrowright' || key === 'd') inputKeys.right = false;
    if (key === 'arrowup' || key === 'w') inputKeys.up = false;
    if (key === 'arrowdown' || key === 's') inputKeys.down = false;
    if (e.code === 'Space' || key === ' ' || key === 'z' || key === 'x' || key === 'enter') {
        inputKeys.jump = false;
    }
});

// Clic directo en pantalla para volver al QR o iniciar partida local
if (mainScreen) {
    mainScreen.addEventListener('click', () => {
        audio.init();
        if (GameState.gameOver) {
            returnToQrCode();
        } else if (!GameState.running) {
            startNewGame();
        }
    });
}
if (gameOverOverlay) {
    gameOverOverlay.addEventListener('click', () => {
        audio.init();
        if (GameState.gameOver) returnToQrCode();
    });
}
if (waitingOverlay) {
    waitingOverlay.addEventListener('click', () => {
        audio.init();
        if (!GameState.running) startNewGame();
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

function setupDataChannel(channel, playerId) {
    channel.onopen = () => {
        waitingOverlay.classList.add('hidden');
        if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
    };

    channel.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'join') {
                GameState.currentNickname = (msg.nickname || msg.value || 'CHARLIE').toUpperCase().substring(0, 10);
                if (playerNickElement) playerNickElement.textContent = `CHARLIE: ${GameState.currentNickname}`;
                startNewGame();
            } else if (msg.type === 'control') {
                if (msg.cmd === 'left') inputKeys.left = !!msg.val;
                if (msg.cmd === 'right') inputKeys.right = !!msg.val;
                if (msg.cmd === 'up') inputKeys.up = !!msg.val;
                if (msg.cmd === 'down') inputKeys.down = !!msg.val;
                if (msg.cmd === 'jump') {
                    inputKeys.jump = !!msg.val;
                    if (msg.val) performJump();
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
            width: 140,
            height: 140,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    }
}

// ==========================================
// 🏆 Hall of Fame
// ==========================================
function saveScore(name, score) {
    try {
        const scores = JSON.parse(localStorage.getItem('circus_halloffame') || '[]');
        scores.push({ name: name || 'CHARLIE', score: score, date: new Date().toLocaleDateString() });
        scores.sort((a, b) => b.score - a.score);
        const top5 = scores.slice(0, 5);
        localStorage.setItem('circus_halloffame', JSON.stringify(top5));
        if (top5[0]) {
            GameState.highScore = top5[0].score;
            localStorage.setItem('circus_highscore', GameState.highScore.toString());
        }
    } catch (_) {}
}

function renderHallOfFame() {
    if (!rankingList) return;
    try {
        const scores = JSON.parse(localStorage.getItem('circus_halloffame') || '[]');
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
    const naturalW = container.offsetWidth || 440;
    const naturalH = container.offsetHeight || 440;

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
    initStage(1);
    renderHallOfFame();

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
