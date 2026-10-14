// ==============================================================================
// DUCK HUNT - Retro Arcade NES Host Script (Master Pixel Edition)
// Auténtico clásico de cacería con Zapper, patos pixel-art, perro cazador y WebRTC
// ==============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const playerNickElement = document.getElementById('player-nick');
const roundCountElement = document.getElementById('round-count');
const ammoCountElement = document.getElementById('ammo-count');
const gameOverOverlay = document.getElementById('game-over-overlay');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverSubtitle = document.getElementById('game-over-subtitle');
const waitingOverlay = document.getElementById('waiting-overlay');
const mainScreen = document.getElementById('main-screen');
const rankingList = document.getElementById('ranking-list');
const qrContainer = document.getElementById('qrcode');
const roomIdElement = document.getElementById('room-id');

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 320;
const GROUND_Y = 245;

// ==============================================================================
// AUDIO SINTETIZADOR WEB AUDIO API (SONIDOS AUTÉNTICOS NES DUCK HUNT)
// ==============================================================================

class DuckHuntAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
    }

    init() {
        if (!this.ctx) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioContext();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
                this.updateUI();
            } catch (_) {}
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => this.updateUI());
        }
    }

    updateUI() {
        const btn = document.getElementById('audio-toggle-btn');
        if (!btn) return;
        if (this.ctx && this.ctx.state === 'running') {
            btn.classList.remove('muted');
            btn.textContent = '🔊 AUDIO';
        } else {
            btn.classList.add('muted');
            btn.textContent = '🔇 MUDO';
        }
    }

    // Intro clásica de Duck Hunt
    playIntro() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const notes = [
                { f: 523.25, d: 0.12 }, // C5
                { f: 659.25, d: 0.12 }, // E5
                { f: 783.99, d: 0.12 }, // G5
                { f: 1046.50, d: 0.22 }, // C6
                { f: 783.99, d: 0.12 },
                { f: 1046.50, d: 0.35 }
            ];
            let offset = 0;
            notes.forEach(n => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
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

    // Ladrido del perro
    playBark() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            [0, 0.14].forEach(t => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(320, now + t);
                osc.frequency.exponentialRampToValueAtTime(140, now + t + 0.10);
                gain.gain.setValueAtTime(0.3, now + t);
                gain.gain.exponentialRampToValueAtTime(0.01, now + t + 0.10);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + t);
                osc.stop(now + t + 0.10);
            });
        } catch (_) {}
    }

    // Aleteo del pato
    playFlap() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.06);
        } catch (_) {}
    }

    // Disparo atronador de la Zapper
    playGunshot() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // Ruido blanco de explosión de pólvora
            const bufferSize = this.ctx.sampleRate * 0.22;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1200, now);
            filter.frequency.exponentialRampToValueAtTime(200, now + 0.22);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            noise.start(now);
        } catch (_) {}
    }

    // Graznido / Cuac del pato al ser impactado
    playQuack() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.setValueAtTime(560, now + 0.05);
            osc.frequency.exponentialRampToValueAtTime(260, now + 0.18);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.18);
        } catch (_) {}
    }

    // Silbido descendente de caída del pato
    playFall() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(160, now + 0.45);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.45);
        } catch (_) {}
    }

    // Golpe sordo al caer en la hierba
    playThud() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.12);
        } catch (_) {}
    }

    // Risa burlona del perro
    playDogLaugh() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            for (let i = 0; i < 7; i++) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                const f = (i % 2 === 0) ? 580 : 720;
                osc.frequency.setValueAtTime(f, now + i * 0.09);
                gain.gain.setValueAtTime(0.25, now + i * 0.09);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.09 + 0.06);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + i * 0.09);
                osc.stop(now + i * 0.09 + 0.06);
            }
        } catch (_) {}
    }

    // Fanfarria de patos capturados
    playCaught() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const notes = [440, 554.37, 659.25, 880];
            notes.forEach((f, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, now + idx * 0.08);
                gain.gain.setValueAtTime(0.25, now + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.14);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.14);
            });
        } catch (_) {}
    }

    // Fanfarria de victoria de ronda
    playRoundPass() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((f, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(f, now + idx * 0.12);
                gain.gain.setValueAtTime(0.28, now + idx * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.22);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + idx * 0.12);
                osc.stop(now + idx * 0.12 + 0.22);
            });
        } catch (_) {}
    }

    // Melodía de Game Over
    playGameOver() {
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const notes = [
                { f: 587.33, d: 0.18 },
                { f: 554.37, d: 0.18 },
                { f: 523.25, d: 0.22 },
                { f: 493.88, d: 0.45 }
            ];
            let offset = 0;
            notes.forEach(n => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(n.f, now + offset);
                gain.gain.setValueAtTime(0.25, now + offset);
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

const audio = new DuckHuntAudio();

// ==============================================================================
// ESTADO GLOBAL DEL JUEGO
// ==============================================================================

const GameState = {
    running: false,
    gameOver: false,
    score: 0,
    highScore: 0,
    round: 1,
    ammo: 3,
    maxAmmo: 3,
    currentNickname: 'HUNTER',
    roomId: Math.random().toString(36).substring(2, 6).toUpperCase(),
    lastTime: 0,
    ducksTotalInRound: 10,
    duckIndexInRound: 0,
    ducksHitInRound: 0,
    roundTargetHits: 6, // Al menos 6 patos para pasar a la siguiente ronda
    roundHitsArray: [], // 10 booleanos/null para la barra inferior
    subRoundState: 'intro_dog', // 'intro_dog', 'spawn_ducks', 'hunting', 'dog_result', 'round_complete'
    subRoundTimer: 0,
    whiteFlashTimer: 0,
    skyColor: '#63b8ff',
    targetSkyColor: '#63b8ff',
    isMobileSession: false
};

let gameOverTimeout = null;
let activeDucks = [];
let floatingScores = [];
let feathers = [];
let ambientParticles = [];
let gunSmokes = [];
let fallingLeaves = [];
let screenShakeTimer = 0;

// Mirilla / Retícula de la Zapper
const Reticle = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    targetX: CANVAS_WIDTH / 2,
    targetY: CANVAS_HEIGHT / 2,
    vx: 0,
    vy: 0,
    visible: true,
    lastFire: 0,
    flashTimer: 0
};

// Perro Cazador (Dog)
const Dog = {
    x: -50,
    y: GROUND_Y - 32,
    state: 'sniff', // 'walk', 'sniff', 'alert', 'jump', 'caught_one', 'caught_two', 'laugh', 'hidden'
    frame: 0,
    timer: 0,
    animTimer: 0,
    targetY: GROUND_Y - 32,
    caughtDucksCount: 1
};

// ==============================================================================
// ENTIDAD PATO (DUCK)
// ==============================================================================

class Duck {
    constructor(round, slot = 0) {
        this.type = Math.random() < 0.25 ? 'red' : (Math.random() < 0.5 ? 'blue' : 'mallard');
        this.x = 80 + Math.random() * (CANVAS_WIDTH - 160);
        this.y = GROUND_Y - 14;
        
        // Velocidad y agilidad según la ronda y el tipo
        const baseSpeed = 115 + (round * 16);
        const speedMultiplier = this.type === 'red' ? 1.45 : (this.type === 'blue' ? 1.25 : 1.0);
        this.speed = baseSpeed * speedMultiplier;
        
        // Ángulo de despegue hacia arriba
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;

        this.state = 'flying'; // 'flying', 'fly_away', 'hit', 'falling', 'dead'
        this.frame = 0;
        this.animTimer = 0;
        this.flightTimer = 6.2 - Math.min(2.5, round * 0.25); // Tiempo antes de escapar
        this.hitTimer = 0;
        this.points = this.type === 'red' ? 1500 : (this.type === 'blue' ? 1000 : 500);
        this.width = 44;
        this.height = 38;
        this.flapTimer = 0;
        this.fallRotation = 0;
    }

    update(dt) {
        if (this.state === 'flying') {
            this.animTimer += dt;
            if (this.animTimer > 0.08) {
                this.animTimer = 0;
                this.frame = (this.frame + 1) % 4;
            }

            this.flapTimer += dt;
            if (this.flapTimer > 0.20) {
                this.flapTimer = 0;
                audio.playFlap();
            }

            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // Rebotar en bordes laterales y superior
            if (this.x < 20) {
                this.x = 20;
                this.vx = Math.abs(this.vx);
            } else if (this.x > CANVAS_WIDTH - 20) {
                this.x = CANVAS_WIDTH - 20;
                this.vx = -Math.abs(this.vx);
            }

            if (this.y < 26) {
                this.y = 26;
                this.vy = Math.abs(this.vy);
            } else if (this.y > GROUND_Y - 24) {
                this.y = GROUND_Y - 24;
                this.vy = -Math.abs(this.vy);
            }

            // Cambios de dirección aleatorios
            if (Math.random() < 0.038) {
                this.vx = (Math.random() > 0.5 ? 1 : -1) * (this.speed * (0.6 + Math.random() * 0.6));
                this.vy = (Math.random() > 0.5 ? 1 : -1) * (this.speed * (0.6 + Math.random() * 0.6));
            }

            this.flightTimer -= dt;
            if (this.flightTimer <= 0) {
                this.state = 'fly_away';
                this.vx = 0;
                this.vy = -this.speed * 1.4;
                GameState.targetSkyColor = '#ff8ea3';
            }

        } else if (this.state === 'fly_away') {
            this.animTimer += dt;
            if (this.animTimer > 0.06) {
                this.animTimer = 0;
                this.frame = (this.frame + 1) % 4;
            }
            this.y += this.vy * dt;
            if (this.y < -45) {
                this.state = 'dead';
            }

        } else if (this.state === 'hit') {
            this.hitTimer -= dt;
            if (this.hitTimer <= 0) {
                this.state = 'falling';
                audio.playFall();
            }

        } else if (this.state === 'falling') {
            this.y += 240 * dt;
            this.fallRotation += 14 * dt;
            this.animTimer += dt;
            if (this.animTimer > 0.09) {
                this.animTimer = 0;
                this.frame = (this.frame + 1) % 2;
            }

            if (this.y >= GROUND_Y - 14) {
                this.y = GROUND_Y - 14;
                this.state = 'dead';
                audio.playThud();
                createFeathers(this.x, this.y, 16);
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));

        const dir = this.vx >= 0 ? 1 : -1;
        ctx.scale(dir, 1);

        // Paleta 16-bit arcade de alta definición por variedad
        let headDark = '#064e3b';
        let headMid = '#15803d';
        let headLight = '#22c55e';
        let headSheen = '#86efac';
        let collarColor = '#ffffff';
        let chestDark = '#451a03';
        let chestMid = '#7c2d12';
        let chestLight = '#9a3412';
        let bodyDark = '#292524';
        let bodyMid = '#57534e';
        let bodyLight = '#a8a29e';
        let wingBase = '#44403c';
        let wingDark = '#1c1917';
        let speculum = '#1d4ed8'; // Azul cobalto auténtico ánade real
        let specBorder = '#ffffff';
        let beakColor = '#f59e0b';
        let beakDark = '#b45309';
        let feetColor = '#ea580c';

        if (this.type === 'blue') {
            headDark = '#082f49';
            headMid = '#0369a1';
            headLight = '#0284c7';
            headSheen = '#38bdf8';
            collarColor = '#e0f2fe';
            chestDark = '#0f172a';
            chestMid = '#334155';
            chestLight = '#475569';
            bodyDark = '#1e293b';
            bodyMid = '#475569';
            bodyLight = '#94a3b8';
            wingBase = '#1e293b';
            wingDark = '#0f172a';
            speculum = '#059669'; // Verde cerceta esmeralda
            specBorder = '#ffffff';
            beakColor = '#0f172a';
            beakDark = '#020617';
            feetColor = '#f97316';
        } else if (this.type === 'red') {
            headDark = '#7f1d1d';
            headMid = '#b91c1c';
            headLight = '#ef4444';
            headSheen = '#fca5a5';
            collarColor = '#fef08a';
            chestDark = '#78350f';
            chestMid = '#9a3412';
            chestLight = '#c2410c';
            bodyDark = '#451a03';
            bodyMid = '#b45309';
            bodyLight = '#fde047';
            wingBase = '#78350f';
            wingDark = '#451a03';
            speculum = '#7c3aed'; // Púrpura real
            specBorder = '#fef08a';
            beakColor = '#18181b';
            beakDark = '#ea580c';
            feetColor = '#f97316';
        }

        if (this.state === 'hit') {
            // ==========================================
            // IMPACTO ZAPPER: ESTRELLA DE CHOQUE CARTOON
            // ==========================================
            // Destello de impacto exterior
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const angle = (i * Math.PI) / 5;
                const r = (i % 2 === 0) ? 28 : 14;
                const sx = Math.cos(angle) * r;
                const sy = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.closePath();
            ctx.fill();

            // Centro blanco de choque
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4 + Math.PI / 8;
                const r = (i % 2 === 0) ? 16 : 8;
                const sx = Math.cos(angle) * r;
                const sy = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.closePath();
            ctx.fill();

            // Pato congelado en shock
            ctx.fillStyle = chestMid;
            ctx.fillRect(-12, -8, 22, 16);
            ctx.fillStyle = bodyLight;
            ctx.fillRect(-16, -5, 8, 10);

            // Cabeza aturdida
            ctx.fillStyle = headLight;
            ctx.fillRect(4, -16, 14, 14);
            ctx.fillStyle = collarColor;
            ctx.fillRect(2, -4, 6, 4);

            // Ojos con cruz de impacto ('X X')
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(8, -14, 8, 8);
            ctx.fillStyle = '#dc2626'; // Sangre cómica/venas
            ctx.fillRect(9, -13, 6, 2);
            ctx.fillRect(9, -9, 6, 2);
            ctx.fillStyle = '#000000';
            ctx.fillRect(11, -14, 2, 8);

            // Pico abierto graznando con lengua
            ctx.fillStyle = beakColor;
            ctx.fillRect(18, -15, 9, 4); // Mandíbula sup
            ctx.fillStyle = '#dc2626';  // Interior rojo boca
            ctx.fillRect(18, -11, 7, 3);
            ctx.fillStyle = '#f43f5e';  // Lengua
            ctx.fillRect(20, -10, 4, 2);
            ctx.fillStyle = beakColor;
            ctx.fillRect(18, -8, 8, 3); // Mandíbula inf

            // Patas temblando de miedo
            ctx.fillStyle = feetColor;
            ctx.fillRect(-8, 9, 5, 8);
            ctx.fillRect(2, 9, 5, 8);

        } else if (this.state === 'falling') {
            // ==========================================
            // CAÍDA EN ESPIRAL VERTICAL 360° CON VIENTO
            // ==========================================
            ctx.rotate(this.fallRotation * dir);

            // Estelas de viento de caída
            ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.fillRect(-15, -34, 3, 20);
            ctx.fillRect(10, -38, 2, 24);
            ctx.fillRect(-4, -28, 2, 14);

            // Cuerpo en picada
            ctx.fillStyle = chestMid;
            ctx.fillRect(-9, -12, 18, 24);
            ctx.fillStyle = bodyDark;
            ctx.fillRect(-7, -16, 14, 7);

            // Cabeza colgando hacia abajo
            ctx.fillStyle = headLight;
            ctx.fillRect(-6, 12, 12, 10);
            ctx.fillStyle = collarColor;
            ctx.fillRect(-5, 9, 10, 3);
            ctx.fillStyle = beakColor;
            ctx.fillRect(-4, 22, 8, 5);

            // Ojos mareados en espiral
            ctx.fillStyle = '#000000';
            ctx.fillRect(-4, 15, 8, 2);

            // Alas descontroladas
            ctx.fillStyle = wingBase;
            if (this.frame === 0) {
                ctx.fillRect(-18, -6, 10, 15);
                ctx.fillRect(8, -6, 10, 15);
                ctx.fillStyle = speculum;
                ctx.fillRect(-16, -2, 6, 5);
                ctx.fillRect(10, -2, 6, 5);
            } else {
                ctx.fillRect(-14, -14, 8, 18);
                ctx.fillRect(6, -14, 8, 18);
                ctx.fillStyle = speculum;
                ctx.fillRect(-12, -10, 5, 6);
                ctx.fillRect(8, -10, 5, 6);
            }

            // Patas extendidas flácidas
            ctx.fillStyle = feetColor;
            ctx.fillRect(-8, -22, 4, 8);
            ctx.fillRect(4, -22, 4, 8);

        } else {
            // ==========================================
            // VUELO 16-BIT AERODINÁMICO CON ESPECULO
            // ==========================================
            // Inclinación según ascenso/descenso
            const tilt = Math.min(0.42, Math.max(-0.42, (this.vy / this.speed) * 0.44 * dir));
            ctx.rotate(tilt);

            // 1. Sombra de vientre y pluma rizada de la cola
            ctx.fillStyle = bodyDark;
            ctx.fillRect(-20, -5, 8, 8);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-22, -8, 5, 4); // Rizo ánade real
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-20, -2, 6, 2); // Borde blanco supracaucal

            // 2. Torso anatómico con textura de escamas de pluma
            ctx.fillStyle = bodyMid;
            ctx.fillRect(-15, -4, 20, 11);
            ctx.fillStyle = bodyLight;
            ctx.fillRect(-10, 4, 14, 5); // Vientre claro
            ctx.fillStyle = chestDark;
            ctx.fillRect(-1, -6, 10, 13); // Pecho castaño profundo
            ctx.fillStyle = chestMid;
            ctx.fillRect(1, -5, 8, 10);
            ctx.fillStyle = chestLight;
            ctx.fillRect(3, -4, 5, 6);  // Relieve de pecho

            // 3. Patas palmeadas recogidas en vuelo
            ctx.fillStyle = feetColor;
            ctx.fillRect(-7, 7, 7, 3);
            ctx.fillStyle = '#b45309';
            ctx.fillRect(-3, 8, 3, 2);

            // 4. Cuello y cabeza estilizada con brillo iridiscente
            ctx.fillStyle = collarColor;
            ctx.fillRect(7, -7, 4, 9); // Anillo blanco nupcial
            ctx.fillStyle = headDark;
            ctx.fillRect(8, -17, 15, 13);
            ctx.fillStyle = headMid;
            ctx.fillRect(10, -16, 11, 8);
            ctx.fillStyle = headLight;
            ctx.fillRect(12, -15, 8, 6); // Brillo verde esmeralda
            ctx.fillStyle = headSheen;
            ctx.fillRect(13, -16, 7, 3); // Corona brillante

            // 5. Pico anatómico con orificio nasal y comisura
            ctx.fillStyle = beakColor;
            ctx.fillRect(21, -12, 10, 5);
            ctx.fillStyle = beakDark;
            ctx.fillRect(28, -10, 3, 3); // Punta
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(23, -12, 2, 2); // Fosa nasal
            ctx.fillStyle = '#451a03';
            ctx.fillRect(21, -9, 8, 1);  // Línea comisura

            // 6. Ojo expresivo con destello especular
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(14, -14, 5, 5);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(15, -14, 3, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(16, -14, 1, 2); // Brillo blanco pupila

            // 7. Alas 16-bit articuladas con el auténtico ESPÉCULO
            if (this.frame === 0) {
                // FASE 1: Alas alzadas en carrera ascendente
                // Ala trasera
                ctx.fillStyle = wingDark;
                ctx.fillRect(-6, -26, 12, 18);
                // Ala delantera
                ctx.fillStyle = wingBase;
                ctx.fillRect(-8, -30, 16, 24);
                // Banda del espéculo
                ctx.fillStyle = specBorder;
                ctx.fillRect(-6, -27, 12, 6);
                ctx.fillStyle = speculum;
                ctx.fillRect(-5, -26, 10, 4);
                // Puntas primarias oscuras separadas
                ctx.fillStyle = wingDark;
                ctx.fillRect(-4, -32, 4, 4);
                ctx.fillRect(1, -32, 4, 4);

            } else if (this.frame === 1) {
                // FASE 2: Planeo horizontal mostrando todo el perfil
                ctx.fillStyle = wingBase;
                ctx.fillRect(-15, -6, 26, 10);
                // Banda del espéculo completa en el centro
                ctx.fillStyle = specBorder;
                ctx.fillRect(-10, -5, 18, 7);
                ctx.fillStyle = speculum;
                ctx.fillRect(-8, -4, 14, 5);
                // Remeras primarias oscuras
                ctx.fillStyle = wingDark;
                ctx.fillRect(-20, -3, 6, 6);
                ctx.fillRect(-18, 0, 5, 4);

            } else if (this.frame === 2) {
                // FASE 3: Golpe descendente de alas potente
                ctx.fillStyle = wingBase;
                ctx.fillRect(-8, 4, 18, 22);
                ctx.fillStyle = specBorder;
                ctx.fillRect(-6, 7, 14, 6);
                ctx.fillStyle = speculum;
                ctx.fillRect(-5, 8, 12, 4);
                // Puntas empujando hacia abajo
                ctx.fillStyle = wingDark;
                ctx.fillRect(-4, 24, 6, 4);
                ctx.fillRect(3, 22, 5, 4);

            } else {
                // FASE 4: Recogida ágil preparando el siguiente aleteo
                ctx.fillStyle = wingBase;
                ctx.fillRect(-10, -15, 20, 15);
                ctx.fillStyle = specBorder;
                ctx.fillRect(-8, -13, 12, 6);
                ctx.fillStyle = speculum;
                ctx.fillRect(-7, -12, 10, 4);
                ctx.fillStyle = wingDark;
                ctx.fillRect(-8, -8, 15, 5);
            }
        }

        ctx.restore();
    }
}

// ==============================================================================
// SISTEMA DEL PERRO CAZADOR (NES DOG CONTROLLER)
// ==============================================================================

function updateDog(dt) {
    if (Dog.state === 'walk') {
        Dog.animTimer += dt;
        if (Dog.animTimer > 0.14) {
            Dog.animTimer = 0;
            Dog.frame = (Dog.frame + 1) % 4;
        }
        Dog.x += 65 * dt;
        if (Dog.x > 140) {
            Dog.state = 'sniff';
            Dog.timer = 1.0;
        }

    } else if (Dog.state === 'sniff') {
        Dog.timer -= dt;
        Dog.frame = Math.floor(Date.now() / 180) % 2;
        if (Dog.timer <= 0) {
            Dog.state = 'alert';
            Dog.timer = 0.8;
            audio.playBark();
        }

    } else if (Dog.state === 'alert') {
        Dog.timer -= dt;
        if (Dog.timer <= 0) {
            Dog.state = 'jump';
            Dog.timer = 0.85;
            Dog.targetY = GROUND_Y - 55;
        }

    } else if (Dog.state === 'jump') {
        Dog.timer -= dt;
        Dog.y += (Dog.targetY - Dog.y) * 8 * dt;
        Dog.x += 35 * dt;
        if (Dog.timer <= 0.45) {
            Dog.targetY = GROUND_Y + 40; // Cae detrás de los arbustos
        }
        if (Dog.timer <= 0) {
            Dog.state = 'hidden';
            startRoundHunting();
        }

    } else if (Dog.state === 'caught_one' || Dog.state === 'caught_two' || Dog.state === 'laugh') {
        Dog.timer -= dt;
        // Asoma desde la hierba y luego vuelve a esconderse
        if (Dog.timer > 0.6) {
            Dog.y += ((GROUND_Y - 45) - Dog.y) * 10 * dt;
        } else {
            Dog.y += ((GROUND_Y + 30) - Dog.y) * 10 * dt;
        }

        if (Dog.timer <= 0) {
            Dog.state = 'hidden';
            checkNextDuckOrEndRound();
        }
    }
}

function drawDog() {
    if (Dog.state === 'hidden') return;

    ctx.save();
    ctx.translate(Math.round(Dog.x), Math.round(Dog.y));

    // Paleta 16-bit del perro cazador arcade
    const furMain = '#b45309';      // Castaño cálido
    const furLight = '#d97706';     // Reflejo ámbar
    const furDark = '#78350f';      // Sombra profunda
    const earDark = '#451a03';      // Chocolate oscuro orejas y mancha
    const bellyCream = '#fed7aa';   // Pecho, hocico y almohadillas crema
    const muzzleLight = '#fef3c7';
    const noseBlack = '#0f172a';
    const eyeWhite = '#ffffff';
    const tonguePink = '#fb7185';

    if (Dog.state === 'walk') {
        // ==========================================
        // PERRO CAMINANDO: RÍTMICO CON COLA Y OREJAS
        // ==========================================
        const tailWag = Math.sin(Date.now() * 0.02) * 3;
        const earBob = Math.sin(Date.now() * 0.015) * 2;

        // Cola alegre moviéndose
        ctx.fillStyle = furMain;
        ctx.fillRect(-18, -16 + tailWag, 6, 4);
        ctx.fillRect(-22, -20 + tailWag, 5, 4);

        // Cuerpo con mancha dorsal y vientre crema
        ctx.fillStyle = furMain;
        ctx.fillRect(-14, -14, 28, 18);
        ctx.fillStyle = earDark;
        ctx.fillRect(-6, -14, 12, 8); // Mancha marrón oscura en el lomo
        ctx.fillStyle = bellyCream;
        ctx.fillRect(-8, -2, 18, 6);   // Vientre claro

        // Cabeza y hocico
        ctx.fillStyle = furMain;
        ctx.fillRect(8, -24, 16, 16);
        ctx.fillStyle = furLight;
        ctx.fillRect(10, -23, 12, 4); // Brillo corona
        ctx.fillStyle = earDark;
        ctx.fillRect(6, -22 + earBob, 6, 14); // Oreja caída ondeante

        // Ojo entusiasta
        ctx.fillStyle = eyeWhite;
        ctx.fillRect(16, -21, 4, 4);
        ctx.fillStyle = noseBlack;
        ctx.fillRect(18, -20, 2, 3);
        ctx.fillStyle = eyeWhite;
        ctx.fillRect(19, -21, 1, 1);

        // Hocico con botón negro y bigotes
        ctx.fillStyle = bellyCream;
        ctx.fillRect(18, -16, 8, 7);
        ctx.fillStyle = muzzleLight;
        ctx.fillRect(20, -15, 5, 4);
        ctx.fillStyle = noseBlack;
        ctx.fillRect(24, -17, 4, 4);
        ctx.fillStyle = eyeWhite;
        ctx.fillRect(25, -17, 1, 1); // Brillo nariz

        // Patas caminando en 4 tiempos con almohadillas
        ctx.fillStyle = furMain;
        if (Dog.frame === 0) {
            ctx.fillRect(-12, 4, 5, 10); ctx.fillRect(8, 4, 5, 10);
            ctx.fillStyle = bellyCream;
            ctx.fillRect(-12, 12, 5, 2); ctx.fillRect(8, 12, 5, 2);
        } else if (Dog.frame === 1) {
            ctx.fillRect(-9, 4, 5, 10); ctx.fillRect(5, 4, 5, 10);
            ctx.fillStyle = bellyCream;
            ctx.fillRect(-9, 12, 5, 2); ctx.fillRect(5, 12, 5, 2);
        } else if (Dog.frame === 2) {
            ctx.fillRect(-6, 4, 5, 10); ctx.fillRect(11, 4, 5, 10);
            ctx.fillStyle = bellyCream;
            ctx.fillRect(-6, 12, 5, 2); ctx.fillRect(11, 12, 5, 2);
        } else {
            ctx.fillRect(-9, 4, 5, 10); ctx.fillRect(7, 4, 5, 10);
            ctx.fillStyle = bellyCream;
            ctx.fillRect(-9, 12, 5, 2); ctx.fillRect(7, 12, 5, 2);
        }

    } else if (Dog.state === 'sniff') {
        // ==========================================
        // PERRO OLIENDO EL SUELO CURIOSO
        // ==========================================
        const sniffTwitch = Math.sin(Date.now() * 0.04) * 1.5;

        // Cola baja vibrando
        ctx.fillStyle = furMain;
        ctx.fillRect(-18, -10 + sniffTwitch, 6, 3);
        ctx.fillRect(-22, -12 + sniffTwitch, 5, 3);

        // Cuerpo agachado
        ctx.fillStyle = furMain;
        ctx.fillRect(-14, -10, 28, 16);
        ctx.fillStyle = earDark;
        ctx.fillRect(-4, -10, 10, 7);
        ctx.fillStyle = bellyCream;
        ctx.fillRect(-8, 0, 18, 5);

        // Cabeza pegada a la hierba
        ctx.fillStyle = furMain;
        ctx.fillRect(10, -12, 16, 14);
        ctx.fillStyle = earDark;
        ctx.fillRect(6, -15, 6, 15); // Orejas hacia adelante

        // Ojo olfateador enfocado hacia abajo
        ctx.fillStyle = eyeWhite;
        ctx.fillRect(17, -10, 4, 4);
        ctx.fillStyle = noseBlack;
        ctx.fillRect(19, -8, 2, 2);

        // Hocico tocando el césped con temblor de olfato
        ctx.fillStyle = bellyCream;
        ctx.fillRect(18, -4 + sniffTwitch, 8, 5);
        ctx.fillStyle = noseBlack;
        ctx.fillRect(25, -4 + sniffTwitch, 4, 4);

        // Patas plantadas en el suelo
        ctx.fillStyle = furMain;
        ctx.fillRect(-10, 6, 5, 8);
        ctx.fillRect(8, 6, 5, 8);
        ctx.fillStyle = bellyCream;
        ctx.fillRect(-10, 12, 5, 2);
        ctx.fillRect(8, 12, 5, 2);

    } else if (Dog.state === 'alert') {
        // ==========================================
        // PERRO EN ALERTA: OREJAS TIESAS Y '!' RETRO
        // ==========================================
        // Cola recta tiesa
        ctx.fillStyle = furMain;
        ctx.fillRect(-18, -20, 5, 8);

        // Cuerpo erguido
        ctx.fillStyle = furMain;
        ctx.fillRect(-14, -16, 28, 18);
        ctx.fillStyle = earDark;
        ctx.fillRect(-4, -16, 10, 8);
        ctx.fillStyle = bellyCream;
        ctx.fillRect(-6, -4, 16, 6);

        // Cabeza alta
        ctx.fillStyle = furMain;
        ctx.fillRect(8, -28, 16, 16);
        ctx.fillStyle = earDark;
        ctx.fillRect(6, -38, 5, 14); // Oreja izquierda erecta
        ctx.fillRect(12, -38, 5, 14); // Oreja derecha erecta

        // Ojos abiertos como platos con asombro
        ctx.fillStyle = eyeWhite;
        ctx.fillRect(15, -26, 6, 6);
        ctx.fillStyle = noseBlack;
        ctx.fillRect(17, -25, 3, 4);
        ctx.fillStyle = eyeWhite;
        ctx.fillRect(18, -25, 1, 1);

        // Hocico
        ctx.fillStyle = bellyCream;
        ctx.fillRect(18, -20, 7, 6);
        ctx.fillStyle = noseBlack;
        ctx.fillRect(23, -21, 4, 4);

        // Patas firmes listas para el salto
        ctx.fillStyle = furMain;
        ctx.fillRect(-10, 2, 5, 12);
        ctx.fillRect(8, 2, 5, 12);

        // ¡SIGNO DE EXCLAMACIÓN RETRO LUMINOSO!
        const pulse = Math.sin(Date.now() * 0.015) > 0 ? 1 : 0;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.fillRect(12 - pulse, -52 - pulse, 6 + pulse * 2, 18 + pulse * 2);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(13, -50, 4, 10);
        ctx.fillRect(13, -37, 4, 4);

        ctx.fillStyle = '#fef08a'; // Núcleo amarillo brillante
        ctx.fillRect(14, -48, 2, 6);
        ctx.fillRect(14, -36, 2, 2);

    } else if (Dog.state === 'jump') {
        // ==========================================
        // SALTO OLÍMPICO EN ARCO SOBRE LA HIERBA
        // ==========================================
        // Silueta aerodinámica inclinada
        ctx.fillStyle = furMain;
        ctx.fillRect(-18, -12, 34, 16);
        ctx.fillStyle = earDark;
        ctx.fillRect(-6, -12, 12, 8);
        ctx.fillStyle = bellyCream;
        ctx.fillRect(-10, -2, 20, 6);

        // Cabeza extendida hacia adelante
        ctx.fillStyle = furMain;
        ctx.fillRect(12, -22, 16, 14);
        ctx.fillStyle = earDark;
        ctx.fillRect(6, -26, 6, 14); // Orejas flotando atrás con el viento

        // Ojo decidido
        ctx.fillStyle = eyeWhite;
        ctx.fillRect(18, -20, 4, 4);
        ctx.fillStyle = noseBlack;
        ctx.fillRect(20, -19, 2, 3);

        // Hocico al frente
        ctx.fillStyle = bellyCream;
        ctx.fillRect(22, -16, 7, 6);
        ctx.fillStyle = noseBlack;
        ctx.fillRect(27, -17, 4, 4);

        // Patas extendidas: traseras hacia atrás, delanteras estiradas
        ctx.fillStyle = furMain;
        ctx.fillRect(-26, 0, 12, 6); // Traseras
        ctx.fillStyle = bellyCream;
        ctx.fillRect(-28, 2, 4, 4);

        ctx.fillStyle = furMain;
        ctx.fillRect(20, 0, 12, 6);  // Delanteras
        ctx.fillStyle = bellyCream;
        ctx.fillRect(30, 2, 4, 4);

        // Cola estirada
        ctx.fillStyle = furMain;
        ctx.fillRect(-24, -16, 8, 4);

    } else if (Dog.state === 'laugh') {
        // ==========================================
        // LA ICÓNICA RISA BURLONA DE DUCK HUNT
        // ==========================================
        // Sacudida rápida del vientre por la risa
        const chuckle = Math.sin(Date.now() * 0.038) * 2;

        // Torso y cuello
        ctx.fillStyle = furMain;
        ctx.fillRect(-14, -22 + chuckle, 28, 22);
        ctx.fillStyle = bellyCream;
        ctx.fillRect(-8, -12 + chuckle, 16, 12);

        // Cabeza temblando de risa
        ctx.fillStyle = furMain;
        ctx.fillRect(-12, -34 + chuckle, 24, 16);
        ctx.fillStyle = earDark;
        ctx.fillRect(-18, -36 + chuckle, 8, 16); // Oreja izquierda
        ctx.fillRect(10, -36 + chuckle, 8, 16);  // Oreja derecha

        // Ojos cerrados burlones en ángulo (> <)
        ctx.fillStyle = noseBlack;
        ctx.fillRect(-8, -28 + chuckle, 5, 2);
        ctx.fillRect(-9, -29 + chuckle, 2, 4);
        ctx.fillRect(3, -28 + chuckle, 5, 2);
        ctx.fillRect(7, -29 + chuckle, 2, 4);

        // Mejillas sonrojadas de tanta risa
        ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
        ctx.fillRect(-11, -25 + chuckle, 4, 3);
        ctx.fillRect(7, -25 + chuckle, 4, 3);

        // Patas tapándose la boca riéndose
        ctx.fillStyle = furMain;
        ctx.fillRect(-8, -18 + chuckle, 6, 8);
        ctx.fillRect(2, -18 + chuckle, 6, 8);
        ctx.fillStyle = bellyCream;
        ctx.fillRect(-8, -18 + chuckle, 6, 4);
        ctx.fillRect(2, -18 + chuckle, 6, 4);

        // Boca abierta riéndose con lengua
        const mouthOpen = Math.floor(Date.now() / 110) % 2 === 0;
        ctx.fillStyle = '#000000';
        ctx.fillRect(-4, -23 + chuckle, 8, mouthOpen ? 7 : 4);
        ctx.fillStyle = tonguePink;
        ctx.fillRect(-2, -20 + chuckle, 4, mouthOpen ? 4 : 2);

        // Ondas de sonido de carcajada ("HA HA HA")
        const laughWave = Math.floor(Date.now() / 140) % 2;
        ctx.fillStyle = laughWave === 0 ? '#fde047' : '#ffffff';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillText('HA', -28, -34 + chuckle);
        ctx.fillText('HA!', 14, -34 + chuckle);

        // Corchetes de sonido
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-22, -28 + chuckle, 2, 6);
        ctx.fillRect(-24, -26 + chuckle, 2, 2);
        ctx.fillRect(20, -28 + chuckle, 2, 6);
        ctx.fillRect(22, -26 + chuckle, 2, 2);

    } else if (Dog.state === 'caught_one' || Dog.state === 'caught_two') {
        // ==========================================
        // PERRO ORGULLOSO: SOSTENIENDO LOS PATOS CAZADOS
        // ==========================================
        // Torso asomando sobre la hierba
        ctx.fillStyle = furMain;
        ctx.fillRect(-14, -24, 28, 24);
        ctx.fillStyle = bellyCream;
        ctx.fillRect(-8, -14, 16, 14);

        // Cabeza con sonrisa victoriosa
        ctx.fillStyle = furMain;
        ctx.fillRect(-12, -36, 24, 16);
        ctx.fillStyle = earDark;
        ctx.fillRect(-18, -36, 7, 14);
        ctx.fillRect(11, -36, 7, 14);

        // Ojos felices cerrados (^ ^)
        ctx.fillStyle = noseBlack;
        ctx.fillRect(-8, -30, 4, 2);
        ctx.fillRect(-9, -29, 2, 2);
        ctx.fillRect(-5, -29, 2, 2);
        ctx.fillStyle = noseBlack;
        ctx.fillRect(4, -30, 4, 2);
        ctx.fillRect(3, -29, 2, 2);
        ctx.fillRect(7, -29, 2, 2);

        // Mejillas rosadas
        ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
        ctx.fillRect(-10, -26, 4, 3);
        ctx.fillRect(6, -26, 4, 3);

        // Nariz y hocico sonriente
        ctx.fillStyle = bellyCream;
        ctx.fillRect(-4, -26, 8, 6);
        ctx.fillStyle = noseBlack;
        ctx.fillRect(-2, -27, 4, 3);

        // Destellos de victoria (✦)
        const sparkBlink = Math.floor(Date.now() / 200) % 2 === 0;
        if (sparkBlink) {
            ctx.fillStyle = '#fde047';
            ctx.fillRect(-20, -42, 2, 6); ctx.fillRect(-22, -40, 6, 2);
            ctx.fillRect(16, -44, 2, 6); ctx.fillRect(14, -42, 6, 2);
        }

        // ==========================================
        // PATO 1 SOSTENIDO EN SU PATA IZQUIERDA (MALLARD)
        // ==========================================
        // Pata del perro sujetando al pato
        ctx.fillStyle = furMain;
        ctx.fillRect(-20, -18, 8, 8);
        ctx.fillStyle = bellyCream;
        ctx.fillRect(-20, -18, 4, 4);

        // Cuerpo flácido del pato cazado
        ctx.fillStyle = '#7c2d12'; // Pecho castaño
        ctx.fillRect(-30, -14, 12, 16);
        ctx.fillStyle = '#1d4ed8'; // Espéculo azul auténtico en el ala flácida
        ctx.fillRect(-28, -8, 6, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-29, -9, 8, 1);

        // Cabeza verde colgando flácida
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-32, -18, 6, 2); // Collar blanco
        ctx.fillStyle = '#15803d';
        ctx.fillRect(-34, -24, 8, 8);
        ctx.fillStyle = '#f59e0b'; // Pico amarillo colgando
        ctx.fillRect(-38, -22, 6, 3);

        // Patas naranjas colgando flácidas hacia abajo
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(-28, 2, 3, 6);
        ctx.fillRect(-24, 2, 3, 6);

        if (Dog.state === 'caught_two') {
            // ==========================================
            // PATO 2 SOSTENIDO EN SU PATA DERECHA (BLUE TEAL)
            // ==========================================
            ctx.fillStyle = furMain;
            ctx.fillRect(12, -18, 8, 8);
            ctx.fillStyle = bellyCream;
            ctx.fillRect(16, -18, 4, 4);

            // Cuerpo azul/gris flácido
            ctx.fillStyle = '#334155';
            ctx.fillRect(18, -14, 12, 16);
            ctx.fillStyle = '#059669'; // Espéculo verde esmeralda
            ctx.fillRect(22, -8, 6, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(21, -9, 8, 1);

            // Cabeza azul cerúleo colgando
            ctx.fillStyle = '#e0f2fe';
            ctx.fillRect(26, -18, 6, 2);
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(26, -24, 8, 8);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(32, -22, 6, 3);

            // Patas flácidas
            ctx.fillStyle = '#f97316';
            ctx.fillRect(21, 2, 3, 6);
            ctx.fillRect(25, 2, 3, 6);
        }
    }

    ctx.restore();
}

// ==============================================================================
// AMBIENTE Y ESCENARIO RETRO NES (FONDO, LAGO, ÁRBOL Y PRIMER PLANO)
// ==============================================================================

function drawBackgroundEnvironment() {
    // 1. Cielo con degradado atmosférico dinámico celestial
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    if (GameState.targetSkyColor === '#ff8ea3') {
        // Atardecer crepuscular dramático al escapar el pato
        skyGrad.addColorStop(0.0, '#3b0764'); // Violeta cósmico
        skyGrad.addColorStop(0.35, '#9d174d'); // Rosa oscuro
        skyGrad.addColorStop(0.70, '#ea580c'); // Naranja atardecer
        skyGrad.addColorStop(1.0, '#fef08a'); // Amarillo horizonte cálido
    } else {
        // Día soleado retro arcade luminoso
        skyGrad.addColorStop(0.0, '#1e40af'); // Azul arcade profundo
        skyGrad.addColorStop(0.28, '#38bdf8'); // Celeste nítido
        skyGrad.addColorStop(0.75, '#7dd3fc'); // Neblina celeste
        skyGrad.addColorStop(1.0, '#fef9c3'); // Calidez dorada del horizonte matutino
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

    // 2. Sol radiante con halo y destellos (durante el día)
    if (GameState.targetSkyColor !== '#ff8ea3') {
        const sunX = 305;
        const sunY = 44;

        // Halo difuso
        const halo = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 42);
        halo.addColorStop(0, 'rgba(254, 240, 138, 0.48)');
        halo.addColorStop(0.5, 'rgba(253, 224, 71, 0.16)');
        halo.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
        ctx.fill();

        // Núcleo solar
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Destellos de corona solar
        ctx.fillStyle = 'rgba(254, 240, 138, 0.65)';
        ctx.fillRect(sunX - 22, sunY - 1, 44, 2);
        ctx.fillRect(sunX - 1, sunY - 22, 2, 44);
    }

    // 3. Cadena montañosa distante (Capa 1 - Picos alpinos en perspectiva)
    ctx.fillStyle = (GameState.targetSkyColor === '#ff8ea3') ? '#4a154b' : '#334155';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(0, 198);
    ctx.lineTo(35, 172);
    ctx.lineTo(75, 192);
    ctx.lineTo(130, 166);
    ctx.lineTo(185, 188);
    ctx.lineTo(245, 162);
    ctx.lineTo(300, 184);
    ctx.lineTo(355, 168);
    ctx.lineTo(400, 186);
    ctx.lineTo(400, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // Aristas iluminadas y nieve en picos lejanos
    ctx.fillStyle = (GameState.targetSkyColor === '#ff8ea3') ? '#701a75' : '#475569';
    ctx.beginPath();
    ctx.moveTo(35, 172); ctx.lineTo(46, 192); ctx.lineTo(24, 192); ctx.closePath(); ctx.fill();
    ctx.moveTo(130, 166); ctx.lineTo(146, 188); ctx.lineTo(114, 188); ctx.closePath(); ctx.fill();
    ctx.moveTo(245, 162); ctx.lineTo(264, 184); ctx.lineTo(228, 184); ctx.closePath(); ctx.fill();
    ctx.moveTo(355, 168); ctx.lineTo(372, 186); ctx.lineTo(340, 186); ctx.closePath(); ctx.fill();

    // 4. Colinas ondulantes en pradera (Capa 2 - Verde bosque)
    ctx.fillStyle = (GameState.targetSkyColor === '#ff8ea3') ? '#78350f' : '#14532d';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(0, 214);
    ctx.quadraticCurveTo(80, 200, 160, 216);
    ctx.quadraticCurveTo(250, 202, 330, 220);
    ctx.quadraticCurveTo(370, 208, 400, 212);
    ctx.lineTo(400, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // Cresta soleada de las colinas
    ctx.strokeStyle = (GameState.targetSkyColor === '#ff8ea3') ? '#b45309' : '#16a34a';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 5. Lago / Humedal natural en el fondo con nenúfares y reflejos
    const lakeY = 216;
    const lakeH = GROUND_Y - lakeY;
    const lakeGrad = ctx.createLinearGradient(0, lakeY, 0, GROUND_Y);
    lakeGrad.addColorStop(0, '#0284c7');
    lakeGrad.addColorStop(0.5, '#0369a1');
    lakeGrad.addColorStop(1, '#0f766e');
    ctx.fillStyle = lakeGrad;
    ctx.fillRect(80, lakeY, CANVAS_WIDTH - 80, lakeH);

    // Ondas y reflejos en el agua
    const waterTime = Date.now() * 0.003;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let wy = lakeY + 3; wy < GROUND_Y - 2; wy += 5) {
        const offset = Math.sin(waterTime * 2 + wy) * 8;
        ctx.fillRect(100 + offset, wy, 24, 1.2);
        ctx.fillRect(160 - offset, wy, 18, 1.2);
        ctx.fillRect(230 + offset * 0.7, wy, 32, 1.2);
        ctx.fillRect(310 - offset, wy, 22, 1.2);
    }

    // Nenúfares / Hojas de loto flotantes con flores rosas
    [
        { x: 130, y: lakeY + 8 },
        { x: 210, y: lakeY + 14 },
        { x: 280, y: lakeY + 6 },
        { x: 350, y: lakeY + 12 }
    ].forEach(pad => {
        // Hoja verde de nenúfar
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.ellipse(pad.x, pad.y, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Flor rosa
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(pad.x - 1, pad.y - 2, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pad.x, pad.y - 1, 1, 1);
    });

    // 6. Nubes esponjosas 3D flotantes con relieve
    const cloudShift = (Date.now() * 0.005) % (CANVAS_WIDTH + 140) - 70;
    const clouds = [
        { x: 30 + cloudShift * 0.8, y: 36, scale: 1.0 },
        { x: 190 + cloudShift * 1.0, y: 28, scale: 1.25 },
        { x: 340 + cloudShift * 0.6, y: 55, scale: 0.85 }
    ];

    clouds.forEach(c => {
        let cx = c.x;
        if (cx > CANVAS_WIDTH + 70) cx -= (CANVAS_WIDTH + 140);
        if (cx < -70) cx += (CANVAS_WIDTH + 140);

        ctx.save();
        ctx.translate(Math.round(cx), Math.round(c.y));
        ctx.scale(c.scale, c.scale);

        // Sombra inferior de la nube
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(0, 8, 14, 0, Math.PI * 2);
        ctx.arc(18, 9, 13, 0, Math.PI * 2);
        ctx.arc(-16, 9, 11, 0, Math.PI * 2);
        ctx.fill();

        // Cuerpo blanco de la nube
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 3, 15, 0, Math.PI * 2);
        ctx.arc(16, 5, 13, 0, Math.PI * 2);
        ctx.arc(-14, 5, 12, 0, Math.PI * 2);
        ctx.arc(6, -6, 12, 0, Math.PI * 2);
        ctx.arc(-8, -4, 11, 0, Math.PI * 2);
        ctx.fill();

        // Base plana clásica
        ctx.fillRect(-22, 4, 44, 8);

        ctx.restore();
    });

    // 7. El icónico roble nudoso retorcido de Duck Hunt (a la izquierda)
    // Raíces y base ensanchada
    ctx.fillStyle = '#381a06'; // Sombra de corteza profunda
    ctx.fillRect(30, GROUND_Y - 20, 42, 20);
    ctx.fillStyle = '#78350f'; // Madera cálida
    ctx.fillRect(32, GROUND_Y - 18, 36, 18);
    ctx.fillStyle = '#9a3412'; // Luz en la raíz izquierda
    ctx.fillRect(28, GROUND_Y - 10, 10, 10);

    // Tronco principal con nudos y veta
    ctx.fillStyle = '#451a03';
    ctx.fillRect(42, 92, 22, GROUND_Y - 92);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(45, 92, 16, GROUND_Y - 92);
    ctx.fillStyle = '#9a3412'; // Veta iluminada lateral
    ctx.fillRect(45, 92, 5, GROUND_Y - 92);

    // Curvatura del tronco
    ctx.fillStyle = '#78350f';
    ctx.fillRect(38, 122, 12, 18);
    ctx.fillRect(58, 152, 12, 16);

    // Agujero de nudo en el tronco
    ctx.fillStyle = '#1c0d02';
    ctx.beginPath();
    ctx.ellipse(53, 164, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9a3412';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Ramas principales que se abren hacia la pantalla
    ctx.fillStyle = '#5c2b09';
    // Rama izquierda
    ctx.fillRect(22, 106, 24, 9);
    ctx.fillRect(16, 102, 12, 7);
    // Rama derecha hacia el centro
    ctx.fillRect(60, 110, 32, 10);
    ctx.fillRect(84, 116, 16, 8);

    // Copa frondosa del roble con 5 esferas de follaje 16-bit
    const foliagePuffs = [
        { x: 34, y: 70, r: 30 },
        { x: 72, y: 62, r: 32 },
        { x: 50, y: 40, r: 28 },
        { x: 92, y: 82, r: 24 },
        { x: 20, y: 90, r: 22 }
    ];

    foliagePuffs.forEach(p => {
        // 1. Sombra interior profunda
        ctx.fillStyle = '#064e3b';
        ctx.beginPath();
        ctx.arc(p.x, p.y + 4, p.r, 0, Math.PI * 2);
        ctx.fill();

        // 2. Follaje verde esmeralda medio
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r - 2, 0, Math.PI * 2);
        ctx.fill();

        // 3. Brillo de luz solar en el domo superior
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(p.x - 3, p.y - 4, p.r * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // 4. Toques de luz lima pura
        ctx.fillStyle = '#a7f3d0';
        ctx.fillRect(p.x - p.r * 0.4, p.y - p.r * 0.6, p.r * 0.5, 3);
    });

    // 8. Arbusto espeso con bayas silvestres rojas (a la derecha)
    const bushX = 302;
    const bushY = GROUND_Y - 44;

    // Follaje del arbusto en 3 tonos
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.arc(bushX + 16, bushY + 20, 24, 0, Math.PI * 2);
    ctx.arc(bushX + 46, bushY + 20, 26, 0, Math.PI * 2);
    ctx.arc(bushX + 30, bushY + 10, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(bushX + 16, bushY + 18, 20, 0, Math.PI * 2);
    ctx.arc(bushX + 46, bushY + 18, 22, 0, Math.PI * 2);
    ctx.arc(bushX + 30, bushY + 9, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(bushX + 14, bushY + 14, 14, 0, Math.PI * 2);
    ctx.arc(bushX + 44, bushY + 14, 15, 0, Math.PI * 2);
    ctx.arc(bushX + 28, bushY + 6, 13, 0, Math.PI * 2);
    ctx.fill();

    // Racimos de bayas rojas silvestres brillantes
    const berries = [
        { x: bushX + 10, y: bushY + 12 },
        { x: bushX + 14, y: bushY + 16 },
        { x: bushX + 26, y: bushY + 8 },
        { x: bushX + 32, y: bushY + 12 },
        { x: bushX + 44, y: bushY + 14 },
        { x: bushX + 50, y: bushY + 20 },
        { x: bushX + 36, y: bushY + 24 }
    ];
    berries.forEach(b => {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(b.x, b.y, 4, 4);
        ctx.fillStyle = '#fee2e2'; // Brillo blanco de la baya
        ctx.fillRect(b.x, b.y, 1, 1);
    });

    // 9. Suelo estratificado 16-bit (Tierra, grava y subsuelo)
    // Capa 1: Manto de humus vegetal
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 18);
    // Capa 2: Subsuelo arcilloso
    ctx.fillStyle = '#5c2b09';
    ctx.fillRect(0, GROUND_Y + 18, CANVAS_WIDTH, 26);
    // Capa 3: Roca madre profunda
    ctx.fillStyle = '#381a06';
    ctx.fillRect(0, GROUND_Y + 44, CANVAS_WIDTH, CANVAS_HEIGHT - (GROUND_Y + 44));

    // Guijarros y piedras incrustadas
    [
        { x: 30, y: GROUND_Y + 12, w: 4, h: 3 },
        { x: 95, y: GROUND_Y + 26, w: 6, h: 4 },
        { x: 175, y: GROUND_Y + 8, w: 5, h: 3 },
        { x: 260, y: GROUND_Y + 34, w: 6, h: 4 },
        { x: 340, y: GROUND_Y + 16, w: 4, h: 3 },
        { x: 385, y: GROUND_Y + 48, w: 7, h: 4 }
    ].forEach(s => {
        ctx.fillStyle = '#78716c';
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = '#a8a29e';
        ctx.fillRect(s.x, s.y, s.w - 1, 1);
    });
}

function drawSunbeams() {
    if (GameState.targetSkyColor === '#ff8ea3') return;
    ctx.save();
    // Rayos crepusculares / haces de luz solar diagonales atravesando el cielo
    const beamGrad = ctx.createLinearGradient(300, 40, 160, GROUND_Y);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.16)');
    beamGrad.addColorStop(0.5, 'rgba(253, 224, 71, 0.06)');
    beamGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');

    ctx.fillStyle = beamGrad;
    // Haz 1
    ctx.beginPath();
    ctx.moveTo(290, 42); ctx.lineTo(315, 42); ctx.lineTo(210, GROUND_Y); ctx.lineTo(160, GROUND_Y);
    ctx.closePath(); ctx.fill();

    // Haz 2
    ctx.beginPath();
    ctx.moveTo(300, 42); ctx.lineTo(325, 42); ctx.lineTo(360, GROUND_Y); ctx.lineTo(320, GROUND_Y);
    ctx.closePath(); ctx.fill();

    // Haz 3 hacia la izquierda cerca del roble
    ctx.beginPath();
    ctx.moveTo(280, 42); ctx.lineTo(300, 42); ctx.lineTo(90, GROUND_Y); ctx.lineTo(50, GROUND_Y);
    ctx.closePath(); ctx.fill();

    ctx.restore();
}

function drawForegroundGrass() {
    // 1. Línea base de césped
    ctx.fillStyle = '#84cc16';
    ctx.fillRect(0, GROUND_Y - 3, CANVAS_WIDTH, 5);

    const windTime = Date.now() * 0.004;

    // 2. Mechones de hierba oscilantes en dos capas de profundidad (OCULTAN LAS PATAS DEL PERRO)
    for (let x = 0; x < CANVAS_WIDTH; x += 5) {
        const sway = Math.sin(windTime + x * 0.08) * 3.2;
        const bladeHeight = (x % 15 === 0) ? 18 : ((x % 10 === 0) ? 14 : 10);

        // Capa trasera de hierba (verde bosque profundo)
        ctx.fillStyle = '#15803d';
        ctx.fillRect(x, GROUND_Y - bladeHeight + 3, 3, bladeHeight);

        // Capa delantera con inclinación por viento (verde lima radiante)
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y);
        ctx.lineTo(x + 3.5, GROUND_Y);
        ctx.lineTo(x + 2 + sway, GROUND_Y - bladeHeight);
        ctx.lineTo(x + sway, GROUND_Y - bladeHeight);
        ctx.closePath();
        ctx.fill();

        // Puntas brillantes amarillentas
        ctx.fillStyle = '#bef264';
        ctx.fillRect(Math.round(x + 1 + sway), Math.round(GROUND_Y - bladeHeight), 2, 2);

        // Margaritas silvestres y flores de trébol en la pradera
        if (x % 32 === 0 && x > 25 && x < 375) {
            const flowerX = x + 2 + sway * 0.5;
            const flowerY = GROUND_Y - bladeHeight + 5;
            // Pétalos blancos
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(flowerX - 2, flowerY, 5, 2);
            ctx.fillRect(flowerX, flowerY - 2, 2, 5);
            // Centro amarillo
            ctx.fillStyle = '#facc15';
            ctx.fillRect(flowerX, flowerY, 2, 2);
        } else if (x % 48 === 0 && x > 30) {
            // Flor de trébol rosa
            const flowerX = x + 1 + sway * 0.5;
            const flowerY = GROUND_Y - bladeHeight + 6;
            ctx.fillStyle = '#f472b6';
            ctx.fillRect(flowerX - 1, flowerY - 1, 3, 3);
            ctx.fillStyle = '#fb7185';
            ctx.fillRect(flowerX, flowerY, 1, 1);
        }
    }

    // 3. Espadañas / Juncos palustres (Cattails) en el primer plano
    const cattails = [
        { x: 18, h: 32 },
        { x: 75, h: 28 },
        { x: 215, h: 30 },
        { x: 275, h: 35 },
        { x: 382, h: 32 }
    ];

    cattails.forEach(c => {
        const sway = Math.sin(windTime * 0.8 + c.x * 0.05) * 2;
        // Tallo verde flexible
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c.x, GROUND_Y);
        ctx.quadraticCurveTo(c.x + sway * 0.5, GROUND_Y - c.h * 0.5, c.x + sway, GROUND_Y - c.h);
        ctx.stroke();

        // Mazorca cilíndrica de la espadaña (marrón aterciopelado)
        const headX = c.x + sway;
        const headY = GROUND_Y - c.h;
        ctx.fillStyle = '#381a06';
        ctx.fillRect(headX - 2, headY, 5, 14);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(headX - 1, headY + 1, 2, 12); // Brillo
        // Punta de pelusa
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(headX, headY - 3, 2, 3);
    });
}

function initAmbientParticles() {
    ambientParticles = [];
    for (let i = 0; i < 24; i++) {
        ambientParticles.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * (GROUND_Y - 20),
            vx: 10 + Math.random() * 16,
            vy: (Math.random() - 0.5) * 8,
            seed: Math.random() * Math.PI * 2,
            size: Math.random() < 0.3 ? 2 : 1.5,
            alpha: 0.35 + Math.random() * 0.45
        });
    }
}

function updateAmbient(dt) {
    // 1. Partículas flotantes de polen / motas doradas
    const time = Date.now() * 0.003;
    ambientParticles.forEach(p => {
        p.x += (p.vx + Math.sin(time + p.seed) * 14) * dt;
        p.y += (p.vy + Math.cos(time * 0.8 + p.seed) * 10) * dt;
        if (p.x > CANVAS_WIDTH + 10) p.x = -10;
        if (p.y < 10) p.y = GROUND_Y - 20;
        if (p.y > GROUND_Y - 10) p.y = 20;
    });

    // 2. Hojas cayendo del roble
    if (Math.random() < 0.04 && fallingLeaves.length < 8) {
        fallingLeaves.push({
            x: 40 + Math.random() * 55,
            y: 70 + Math.random() * 30,
            vx: 25 + Math.random() * 30,
            vy: 20 + Math.random() * 25,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 6,
            color: Math.random() < 0.5 ? '#84cc16' : (Math.random() < 0.8 ? '#eab308' : '#ca8a04')
        });
    }

    for (let i = fallingLeaves.length - 1; i >= 0; i--) {
        const l = fallingLeaves[i];
        l.x += l.vx * dt;
        l.y += l.vy * dt;
        l.rot += l.rotSpeed * dt;
        if (l.y >= GROUND_Y - 4) {
            fallingLeaves.splice(i, 1);
        }
    }

    // 3. Humo de disparos
    for (let i = gunSmokes.length - 1; i >= 0; i--) {
        const s = gunSmokes[i];
        s.life -= dt;
        s.r += 18 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.life <= 0) gunSmokes.splice(i, 1);
    }

    // 4. Temporizador de screen shake
    if (screenShakeTimer > 0) {
        screenShakeTimer -= dt;
    }
}

function drawFallingLeaves() {
    fallingLeaves.forEach(l => {
        ctx.save();
        ctx.translate(Math.round(l.x), Math.round(l.y));
        ctx.rotate(l.rot);
        ctx.fillStyle = l.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawGunSmokes() {
    gunSmokes.forEach(s => {
        const alpha = Math.max(0, s.life / s.maxLife) * 0.45;
        ctx.save();
        ctx.fillStyle = `rgba(240, 240, 250, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawAmbientParticles() {
    const isSunset = (GameState.targetSkyColor === '#ff8ea3');
    ambientParticles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = isSunset ? '#fde047' : '#ffffff';
        ctx.beginPath();
        ctx.arc(Math.round(p.x), Math.round(p.y), p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// ==============================================================================
// RETÍCULA ZAPPER Y PARTICULAS
// ==============================================================================

function drawReticle() {
    if (!Reticle.visible) return;

    ctx.save();
    ctx.translate(Math.round(Reticle.x), Math.round(Reticle.y));

    // Pulso sutil de la mira
    const pulse = Math.sin(Date.now() * 0.008) * 1.5;

    // Destello de disparo Zapper / Fogonazo
    if (Reticle.flashTimer > 0) {
        const flashAlpha = Math.min(1.0, Reticle.flashTimer / 0.15);
        ctx.save();
        // Anillo de expansión
        ctx.strokeStyle = `rgba(254, 240, 138, ${flashAlpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 22 + (1 - flashAlpha) * 14, 0, Math.PI * 2);
        ctx.stroke();

        // Destello central en estrella
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const r = (i % 2 === 0) ? 18 : 6;
            const fx = Math.cos(angle) * r;
            const fy = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(fx, fy);
            else ctx.lineTo(fx, fy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // Anillo exterior de precisión con muescas cardinales
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 14 + pulse * 0.4, 0.25, Math.PI * 0.5 - 0.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 14 + pulse * 0.4, Math.PI * 0.5 + 0.25, Math.PI - 0.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 14 + pulse * 0.4, Math.PI + 0.25, Math.PI * 1.5 - 0.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 14 + pulse * 0.4, Math.PI * 1.5 + 0.25, Math.PI * 2 - 0.25);
    ctx.stroke();

    // Puntas cardinales
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-22, -1, 7, 2);
    ctx.fillRect(15, -1, 7, 2);
    ctx.fillRect(-1, -22, 2, 7);
    ctx.fillRect(-1, 15, 2, 7);

    // Puntos diagonales de guía
    ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.fillRect(-8, -8, 2, 2);
    ctx.fillRect(7, -8, 2, 2);
    ctx.fillRect(-8, 7, 2, 2);
    ctx.fillRect(7, 7, 2, 2);

    // Punto central láser blanco/rojo
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -1, 2, 2);

    ctx.restore();
}

function createFeathers(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
        feathers.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 90,
            vy: (Math.random() - 0.5) * 80 - 25,
            color: Math.random() < 0.4 ? '#22c55e' : (Math.random() < 0.7 ? '#f59e0b' : '#38bdf8'),
            life: 1.0,
            maxLife: 1.0,
            size: Math.random() * 3 + 2,
            swayOffset: Math.random() * Math.PI * 2,
            swaySpeed: 4 + Math.random() * 4
        });
    }
}

function updateFeathers(dt) {
    for (let i = feathers.length - 1; i >= 0; i--) {
        const f = feathers[i];
        f.life -= dt;
        f.x += (f.vx + Math.sin(Date.now() * 0.008 + f.swayOffset) * 26) * dt;
        f.y += f.vy * dt;
        f.vy += 55 * dt; // Gravedad suave flotante
        if (f.life <= 0) feathers.splice(i, 1);
    }
}

function drawFeathers() {
    feathers.forEach(f => {
        const alpha = Math.max(0.1, f.life / f.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = f.color;
        ctx.fillRect(Math.round(f.x), Math.round(f.y), f.size, f.size * 1.5);
        // Punta blanca de pluma
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
        ctx.restore();
    });
}

function addFloatingScore(text, x, y, color = '#facc15') {
    floatingScores.push({
        text,
        x,
        y,
        color,
        life: 0.9,
        maxLife: 0.9
    });
}

function updateAndDrawFloatingScores(dt) {
    for (let i = floatingScores.length - 1; i >= 0; i--) {
        const fs = floatingScores[i];
        fs.life -= dt;
        fs.y -= 24 * dt;
        if (fs.life <= 0) {
            floatingScores.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = fs.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(fs.text, Math.round(fs.x), Math.round(fs.y));
        ctx.restore();
    }
}

// ==============================================================================
// HUD RETRO ESTILO NES (BARRA DE 10 PATOS EN EL FONDO)
// ==============================================================================

function drawNESBottomHUD() {
    const hudY = CANVAS_HEIGHT - 28;

    ctx.save();
    ctx.font = '7px "Press Start 2P", monospace';

    // 1. Contador de Balas / Cartuchos de escopeta 3D
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SHOT', 14, hudY + 8);
    for (let i = 0; i < 3; i++) {
        const bx = 14 + i * 11;
        if (i < GameState.ammo) {
            // Cartucho cargado 3D
            // Cuerpo rojo
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(bx, hudY + 12, 7, 10);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(bx + 1, hudY + 13, 5, 2); // Brillo
            // Base metálica de latón dorada
            ctx.fillStyle = '#ca8a04';
            ctx.fillRect(bx - 1, hudY + 20, 9, 3);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(bx, hudY + 20, 7, 1);
        } else {
            // Cartucho gastado (recámara vacía)
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, hudY + 12, 7, 11);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(bx + 1, hudY + 13, 5, 9);
        }
    }

    // 2. Barra de los 10 patos de la ronda (Siluetas pixel-art)
    ctx.fillStyle = '#ffffff';
    ctx.fillText('HIT', 110, hudY + 8);

    for (let i = 0; i < 10; i++) {
        const px = 110 + i * 15;
        const py = hudY + 11;
        const res = GameState.roundHitsArray[i];

        if (res === true) {
            // Pato cazado: silueta roja brillante con ojo dorado
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(px, py + 2, 11, 7);      // Torso
            ctx.fillRect(px + 6, py - 1, 5, 4);   // Cabeza
            ctx.fillRect(px + 10, py, 2, 2);      // Pico
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(px + 7, py, 1, 1);       // Ojo brillante
        } else if (res === false) {
            // Pato escapado: silueta gris carbón apagada
            ctx.fillStyle = '#334155';
            ctx.fillRect(px, py + 2, 11, 7);
            ctx.fillRect(px + 6, py - 1, 5, 4);
        } else {
            // Pato pendiente: animación de pulso si es el objetivo actual
            const isCurrent = (i === GameState.duckIndexInRound);
            if (isCurrent) {
                const blink = Math.floor(Date.now() / 120) % 2 === 0;
                ctx.fillStyle = blink ? '#38bdf8' : '#e0f2fe';
                ctx.fillRect(px, py + 2, 11, 7);
                ctx.fillRect(px + 6, py - 1, 5, 4);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(px + 2, py + 1, 4, 2); // Destello ala
            } else {
                ctx.fillStyle = '#475569';
                ctx.fillRect(px, py + 5, 10, 4);
            }
        }
    }

    // 3. Marcador de Ronda a la derecha con insignia arcade
    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'right';
    ctx.fillText(`R=${GameState.round}`, CANVAS_WIDTH - 14, hudY + 16);

    ctx.restore();
}

// ==============================================================================
// MECÁNICA DE DISPARO Y GESTIÓN DE RONDAS
// ==============================================================================

function fireShot(aimX, aimY) {
    if (!GameState.running || GameState.gameOver) return;
    if (GameState.subRoundState !== 'hunting') return;
    if (GameState.ammo <= 0) return;

    audio.playGunshot();
    GameState.ammo--;
    GameState.whiteFlashTimer = 0.06; // Destello Zapper NES
    Reticle.flashTimer = 0.15; // Destello Zapper arcade retícula
    screenShakeTimer = 0.08; // Retroceso / sacudida contundente de pantalla

    // Humo de pólvora saliendo del impacto de la Zapper
    gunSmokes.push({
        x: aimX + (Math.random() - 0.5) * 8,
        y: aimY + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 22,
        vy: -18 - Math.random() * 20,
        r: 6,
        life: 0.45,
        maxLife: 0.45
    });

    // Sincronizar balas con el mando móvil
    broadcastAmmo();
    ammoCountElement.textContent = '● '.repeat(GameState.ammo).trim();

    let hitCount = 0;
    activeDucks.forEach(duck => {
        if (duck.state === 'flying' || duck.state === 'fly_away') {
            const dist = Math.hypot(duck.x - aimX, duck.y - aimY);
            // Hitbox generosa para diversión arcade (44x38 sprite)
            if (dist < 36) {
                hitCount++;
                duck.state = 'hit';
                duck.hitTimer = 0.35;
                audio.playQuack();
                createFeathers(duck.x, duck.y, 16);

                GameState.score += duck.points;
                GameState.ducksHitInRound++;
                scoreElement.textContent = `SCORE: ${String(GameState.score).padStart(6, '0')}`;
                addFloatingScore(`+${duck.points}`, duck.x, duck.y - 12);
            }
        }
    });

    // Si se agotan las balas y los patos siguen volando, se escapan
    if (GameState.ammo <= 0) {
        activeDucks.forEach(duck => {
            if (duck.state === 'flying') {
                duck.state = 'fly_away';
                duck.vx = 0;
                duck.vy = -duck.speed * 1.35;
                GameState.targetSkyColor = '#ff8ea3';
            }
        });
    }
}

function broadcastAmmo() {
    dataChannels.forEach(dc => {
        try {
            dc.send(JSON.stringify({ type: 'ammo', count: GameState.ammo }));
        } catch (_) {}
    });
}

function startRoundIntro() {
    GameState.subRoundState = 'intro_dog';
    GameState.duckIndexInRound = 0;
    GameState.ducksHitInRound = 0;
    GameState.roundHitsArray = new Array(10).fill(null);
    GameState.targetSkyColor = '#63b8ff';

    roundCountElement.textContent = String(GameState.round).padStart(2, '0');
    addFloatingScore(`ROUND ${GameState.round}`, CANVAS_WIDTH / 2, 110, '#fde047');

    Dog.x = -40;
    Dog.y = GROUND_Y - 26;
    Dog.state = 'walk';
    Dog.animTimer = 0;
    audio.playIntro();
}

function startRoundHunting() {
    spawnDuckPair();
}

function spawnDuckPair() {
    GameState.ammo = GameState.maxAmmo;
    broadcastAmmo();
    ammoCountElement.textContent = '● ● ●';
    GameState.targetSkyColor = '#63b8ff';

    activeDucks = [];
    // En rondas 1-2: 1 pato a la vez. En ronda 3+: 2 patos simultáneos
    const ducksToSpawn = GameState.round >= 3 ? 2 : 1;

    for (let i = 0; i < ducksToSpawn; i++) {
        activeDucks.push(new Duck(GameState.round, i));
    }

    GameState.subRoundState = 'hunting';
}

function checkNextDuckOrEndRound() {
    if (GameState.duckIndexInRound >= GameState.ducksTotalInRound) {
        // Fin de la ronda de 10 patos: verificar si superó el mínimo
        if (GameState.ducksHitInRound >= GameState.roundTargetHits) {
            GameState.round++;
            audio.playRoundPass();
            addFloatingScore(`¡RONDA SUPERADA! (${GameState.ducksHitInRound}/10)`, CANVAS_WIDTH / 2, 110, '#22c55e');
            setTimeout(() => {
                if (GameState.running && !GameState.gameOver) {
                    startRoundIntro();
                }
            }, 1800);
        } else {
            triggerGameOver();
        }
    } else {
        // Lanzar la siguiente pareja o pato
        spawnDuckPair();
    }
}

function handleDucksFinished() {
    // Contar cuántos fueron cazados en esta tirada
    let hits = 0;
    let escapes = 0;
    activeDucks.forEach(d => {
        if (d.y >= GROUND_Y - 20 || d.state === 'dead' && d.hitTimer <= 0 && d.y > 0) {
            hits++;
        } else {
            escapes++;
        }
    });

    const isSuccess = (hits > 0 && escapes === 0);

    // Actualizar historial de la ronda
    for (let i = 0; i < activeDucks.length; i++) {
        const slot = GameState.duckIndexInRound;
        if (slot < 10) {
            GameState.roundHitsArray[slot] = (i < hits);
            GameState.duckIndexInRound++;
        }
    }

    GameState.subRoundState = 'dog_result';
    Dog.x = CANVAS_WIDTH / 2 - 14;
    Dog.y = GROUND_Y + 30;

    if (hits > 0) {
        Dog.state = hits >= 2 ? 'caught_two' : 'caught_one';
        Dog.timer = 1.6;
        audio.playCaught();
        addFloatingScore(`¡CAZADO!`, CANVAS_WIDTH / 2, 120, '#38bdf8');
    } else {
        Dog.state = 'laugh';
        Dog.timer = 1.8;
        audio.playDogLaugh();
        addFloatingScore(`¡SE ESCAPÓ!`, CANVAS_WIDTH / 2, 120, '#ef4444');
    }
}

function triggerGameOver() {
    if (GameState.gameOver) return;
    GameState.gameOver = true;
    GameState.running = false;
    audio.playGameOver();

    if (GameState.score > GameState.highScore) {
        GameState.highScore = GameState.score;
        highScoreElement.textContent = `HI: ${String(GameState.highScore).padStart(6, '0')}`;
        localStorage.setItem('duckhunt_highscore', GameState.highScore);
    }

    dataChannels.forEach(dc => {
        try {
            dc.send(JSON.stringify({ type: 'game_over', score: GameState.score }));
        } catch (_) {}
    });

    submitScore(GameState.currentNickname, GameState.score);

    gameOverTitle.textContent = 'GAME OVER';
    gameOverSubtitle.textContent = `PUNTUACIÓN FINAL: ${GameState.score}`;
    gameOverOverlay.classList.remove('hidden');

    if (gameOverTimeout) clearTimeout(gameOverTimeout);
    gameOverTimeout = setTimeout(() => {
        if (GameState.gameOver && !GameState.running) {
            resetSignalingAndRoom();
        }
    }, 15000);
}

// ==============================================================================
// BUCLE PRINCIPAL DE JUEGO (GAME LOOP)
// ==============================================================================

function update(dt) {
    if (!GameState.running || GameState.gameOver) return;

    // Destello de Zapper
    if (GameState.whiteFlashTimer > 0) {
        GameState.whiteFlashTimer -= dt;
    }
    if (Reticle.flashTimer > 0) {
        Reticle.flashTimer -= dt;
    }

    // Suavizado de transición de color de cielo
    GameState.skyColor = GameState.targetSkyColor;

    // Actualizar movimiento de la retícula por teclado
    Reticle.x += Reticle.vx * 260 * dt;
    Reticle.y += Reticle.vy * 260 * dt;
    Reticle.x = Math.max(16, Math.min(CANVAS_WIDTH - 16, Reticle.x));
    Reticle.y = Math.max(16, Math.min(CANVAS_HEIGHT - 32, Reticle.y));

    updateDog(dt);
    updateFeathers(dt);
    updateAmbient(dt);

    // Actualizar patos en vuelo
    if (GameState.subRoundState === 'hunting') {
        let allFinished = true;
        activeDucks.forEach(duck => {
            duck.update(dt);
            if (duck.state !== 'dead') {
                allFinished = false;
            }
        });

        if (allFinished && activeDucks.length > 0) {
            handleDucksFinished();
        }
    }
}

function gameLoop(time) {
    if (!GameState.lastTime) GameState.lastTime = time;
    const dt = Math.min((time - GameState.lastTime) / 1000, 0.1);
    GameState.lastTime = time;

    update(dt);

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Guardar contexto para Screen Shake / Retroceso de la Zapper
    ctx.save();
    if (screenShakeTimer > 0) {
        const shakeMag = (screenShakeTimer / 0.08) * 3.5;
        const shakeX = (Math.random() - 0.5) * shakeMag;
        const shakeY = (Math.random() - 0.5) * shakeMag;
        ctx.translate(shakeX, shakeY);
    }

    // 1. Cielo, cordillera, colinas, humedal/lago, nubes y roble centenario
    drawBackgroundEnvironment();

    // 2. Hojas cayendo del roble
    drawFallingLeaves();

    // 3. Patos en vuelo
    activeDucks.forEach(d => d.draw());

    // 4. Perro cazador (dibujado detrás de la hierba para que se oculte naturalmente)
    drawDog();

    // 5. Hierba oscilante de primer plano, espadañas y flores (cubre patas del perro y patos en el suelo)
    drawForegroundGrass();

    // 6. Plumas cayendo
    drawFeathers();

    // 7. Humo de disparos
    drawGunSmokes();

    // 8. Partículas y polen ambiental flotante
    drawAmbientParticles();

    // 9. Rayos de sol volumétricos / God rays
    drawSunbeams();

    // 10. Textos flotantes
    updateAndDrawFloatingScores(dt);

    // 11. Barra NES inferior de los 10 patos y balas
    drawNESBottomHUD();

    // 12. Retícula de puntería Zapper
    if (GameState.running && !GameState.gameOver) {
        drawReticle();
    }

    ctx.restore();

    // Destello incandescente Zapper (luz translúcida elegante para no cegar la escena)
    if (GameState.whiteFlashTimer > 0) {
        const flashAlpha = Math.min(0.40, GameState.whiteFlashTimer / 0.06);
        ctx.fillStyle = `rgba(255, 255, 240, ${flashAlpha})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    requestAnimationFrame(gameLoop);
}

// ==============================================================================
// INICIO Y REINICIO DE PARTIDA
// ==============================================================================

function startNewGame(fromController = false) {
    if (gameOverTimeout) {
        clearTimeout(gameOverTimeout);
        gameOverTimeout = null;
    }
    GameState.running = true;
    GameState.gameOver = false;
    GameState.isMobileSession = !!fromController;
    GameState.score = 0;
    GameState.round = 1;
    GameState.ammo = 3;

    activeDucks = [];
    feathers = [];
    floatingScores = [];
    gunSmokes = [];
    fallingLeaves = [];
    screenShakeTimer = 0;
    initAmbientParticles();

    scoreElement.textContent = 'SCORE: 000000';
    roundCountElement.textContent = '01';
    ammoCountElement.textContent = '● ● ●';
    playerNickElement.textContent = `HUNTER: ${GameState.currentNickname}`;

    waitingOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');

    audio.init();
    startRoundIntro();
}

// ==============================================================================
// CONTROLES DE TECLADO Y RATÓN (PRE-PUSH OBLIGATORIO)
// ==============================================================================

// Puntería y disparo directo con el ratón en la pantalla
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    Reticle.x = (e.clientX - rect.left) * scaleX;
    Reticle.y = (e.clientY - rect.top) * scaleY;
});

canvas.addEventListener('mousedown', (e) => {
    if (audio.init) audio.init();
    if (!GameState.running || GameState.gameOver) {
        startNewGame();
    } else {
        fireShot(Reticle.x, Reticle.y);
    }
});

// Controles de teclado
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 's', 'a', 'd', ' ', 'enter'].includes(key) || e.code === 'Space') {
        e.preventDefault();
    }
    if (audio.init) audio.init();

    if (key === 'arrowleft' || key === 'a') Reticle.vx = -1;
    if (key === 'arrowright' || key === 'd') Reticle.vx = 1;
    if (key === 'arrowup' || key === 'w') Reticle.vy = -1;
    if (key === 'arrowdown' || key === 's') Reticle.vy = 1;

    if (e.code === 'Space' || key === 'enter') {
        if (!GameState.running || GameState.gameOver) {
            startNewGame();
        } else {
            fireShot(Reticle.x, Reticle.y);
        }
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if ((key === 'arrowleft' || key === 'a') && Reticle.vx < 0) Reticle.vx = 0;
    if ((key === 'arrowright' || key === 'd') && Reticle.vx > 0) Reticle.vx = 0;
    if ((key === 'arrowup' || key === 'w') && Reticle.vy < 0) Reticle.vy = 0;
    if ((key === 'arrowdown' || key === 's') && Reticle.vy > 0) Reticle.vy = 0;
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
            colorDark: "#060a08",
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
                console.error('Error en socket Host:', err);
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
        sdp: answer.sdp, // OBLIGATORIO: answer.sdp (string), NUNCA objeto completo
        roomId: GameState.roomId,
        playerId: targetPlayerId // OBLIGATORIO
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
                GameState.currentNickname = (msg.nickname || msg.value || 'HUNTER').toUpperCase().substring(0, 10);
                if (playerNickElement) playerNickElement.textContent = `HUNTER: ${GameState.currentNickname}`;
                startNewGame(true);
            } else if (msg.type === 'aim') {
                // Mapear coordenadas normalizadas (0 a 1) al Canvas
                Reticle.x = (msg.x || 0.5) * CANVAS_WIDTH;
                Reticle.y = (msg.y || 0.5) * CANVAS_HEIGHT;
            } else if (msg.type === 'fire') {
                if (msg.x !== undefined && msg.y !== undefined) {
                    Reticle.x = msg.x * CANVAS_WIDTH;
                    Reticle.y = msg.y * CANVAS_HEIGHT;
                }
                fireShot(Reticle.x, Reticle.y);
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

    if (GameState.isMobileSession && peerConnections.size === 0 && !GameState.gameOver && GameState.running) {
        waitingOverlay.classList.remove('hidden');
        GameState.running = false;
    }
}

function resetSignalingAndRoom() {
    if (GameState.running && !GameState.gameOver) return;

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
    let scores = JSON.parse(localStorage.getItem('duckhunt_scores') || '[]');
    scores.push({ name: nickname, score: score, date: new Date().toLocaleDateString() });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 5);
    localStorage.setItem('duckhunt_scores', JSON.stringify(scores));
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

// Motor reactivo autoScale multi-etapa
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
    updateQrCode();
    autoScale();
    initSignaling();
    initAmbientParticles();
    const savedHi = localStorage.getItem('duckhunt_highscore');
    if (savedHi) {
        GameState.highScore = parseInt(savedHi, 10);
        highScoreElement.textContent = `HI: ${String(GameState.highScore).padStart(6, '0')}`;
    }
    const scores = JSON.parse(localStorage.getItem('duckhunt_scores') || '[]');
    renderRanking(scores);
    requestAnimationFrame(gameLoop);
});

window.addEventListener('resize', autoScale);
window.addEventListener('load', () => { updateQrCode(); autoScale(); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(autoScale);
if (window.ResizeObserver) new ResizeObserver(() => autoScale()).observe(document.body);
[0, 50, 150, 300, 600, 1200].forEach(d => setTimeout(autoScale, d));

