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

// Mirilla / Retícula de la Zapper
const Reticle = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    targetX: CANVAS_WIDTH / 2,
    targetY: CANVAS_HEIGHT / 2,
    vx: 0,
    vy: 0,
    visible: true,
    lastFire: 0
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
        this.y = GROUND_Y - 10;
        
        // Velocidad y agilidad según la ronda y el tipo
        const baseSpeed = 110 + (round * 16);
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
        this.width = 32;
        this.height = 30;
        this.flapTimer = 0;
    }

    update(dt) {
        if (this.state === 'flying') {
            this.animTimer += dt;
            if (this.animTimer > 0.12) {
                this.animTimer = 0;
                this.frame = (this.frame + 1) % 3;
            }

            this.flapTimer += dt;
            if (this.flapTimer > 0.25) {
                this.flapTimer = 0;
                audio.playFlap();
            }

            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // Rebotar en bordes laterales y superior
            if (this.x < 16) {
                this.x = 16;
                this.vx = Math.abs(this.vx);
            } else if (this.x > CANVAS_WIDTH - 16) {
                this.x = CANVAS_WIDTH - 16;
                this.vx = -Math.abs(this.vx);
            }

            if (this.y < 24) {
                this.y = 24;
                this.vy = Math.abs(this.vy);
            } else if (this.y > GROUND_Y - 20) {
                this.y = GROUND_Y - 20;
                this.vy = -Math.abs(this.vy);
            }

            // Cambios de dirección aleatorios
            if (Math.random() < 0.035) {
                this.vx = (Math.random() > 0.5 ? 1 : -1) * (this.speed * (0.6 + Math.random() * 0.6));
                this.vy = (Math.random() > 0.5 ? 1 : -1) * (this.speed * (0.6 + Math.random() * 0.6));
            }

            this.flightTimer -= dt;
            if (this.flightTimer <= 0) {
                this.state = 'fly_away';
                this.vx = 0;
                this.vy = -this.speed * 1.35;
                GameState.targetSkyColor = '#ff8ea3'; // El cielo se torna crepúsculo al escapar
            }

        } else if (this.state === 'fly_away') {
            this.animTimer += dt;
            if (this.animTimer > 0.08) {
                this.animTimer = 0;
                this.frame = (this.frame + 1) % 3;
            }
            this.y += this.vy * dt;
            if (this.y < -40) {
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
            this.animTimer += dt;
            if (this.animTimer > 0.10) {
                this.animTimer = 0;
                this.frame = (this.frame + 1) % 2;
            }

            if (this.y >= GROUND_Y - 14) {
                this.y = GROUND_Y - 14;
                this.state = 'dead';
                audio.playThud();
                createFeathers(this.x, this.y, 10);
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));

        // Determinar paleta según el tipo de pato
        let headColor = '#22c55e'; // Mallard verde
        let bodyColor = '#854d0e';
        let wingColor = '#593208';
        if (this.type === 'blue') {
            headColor = '#0284c7';
            bodyColor = '#475569';
            wingColor = '#1e293b';
        } else if (this.type === 'red') {
            headColor = '#ef4444';
            bodyColor = '#d97706';
            wingColor = '#9a3412';
        }

        const dir = this.vx >= 0 ? 1 : -1;
        ctx.scale(dir, 1);

        if (this.state === 'hit') {
            // Pato congelado en shock al recibir el disparo
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-12, -12, 24, 24);
            ctx.fillStyle = headColor;
            ctx.fillRect(-8, -8, 16, 16);
            ctx.fillStyle = '#f97316'; // Pico abierto
            ctx.fillRect(8, -4, 6, 4);
            ctx.fillStyle = '#000000'; // Ojos en shock
            ctx.fillRect(2, -6, 3, 3);
            ctx.fillRect(-6, -6, 3, 3);

        } else if (this.state === 'falling') {
            // Pato cayendo verticalmente dando vueltas
            ctx.rotate(this.frame === 0 ? 0.3 : -0.3);
            ctx.fillStyle = bodyColor;
            ctx.fillRect(-7, -12, 14, 24);
            ctx.fillStyle = headColor;
            ctx.fillRect(-5, 8, 10, 8);
            ctx.fillStyle = '#f97316';
            ctx.fillRect(-3, 16, 6, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-10, -4, 4, 10);
            ctx.fillRect(6, -4, 4, 10);

        } else {
            // Pato volando (3 frames de aleteo)
            // 1. Cuerpo
            ctx.fillStyle = bodyColor;
            ctx.fillRect(-10, -4, 20, 10);

            // 2. Cuello y cabeza
            ctx.fillStyle = headColor;
            ctx.fillRect(4, -10, 10, 8);
            ctx.fillStyle = '#ffffff'; // Collarín blanco
            ctx.fillRect(3, -3, 3, 4);

            // 3. Pico anaranjado
            ctx.fillStyle = '#f97316';
            ctx.fillRect(14, -8, 6, 4);

            // 4. Ojo
            ctx.fillStyle = '#000000';
            ctx.fillRect(10, -9, 2, 2);

            // 5. Cola
            ctx.fillStyle = wingColor;
            ctx.fillRect(-14, -3, 4, 4);

            // 6. Alas según frame de animación
            ctx.fillStyle = wingColor;
            if (this.frame === 0) {
                // Alas arriba
                ctx.fillRect(-6, -16, 12, 12);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-4, -14, 8, 4);
            } else if (this.frame === 1) {
                // Alas horizontales
                ctx.fillRect(-8, -2, 16, 6);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-6, -1, 12, 3);
            } else {
                // Alas abajo
                ctx.fillRect(-6, 4, 12, 12);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-4, 6, 8, 4);
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

    // Paleta marrón retro del perro de Duck Hunt
    const furBrown = '#c2410c';
    const darkBrown = '#7c2d12';
    const bellyTan = '#fed7aa';
    const noseBlack = '#0f172a';

    if (Dog.state === 'walk') {
        // Perro caminando hacia la derecha
        ctx.fillStyle = furBrown;
        ctx.fillRect(-14, -14, 28, 18); // Cuerpo
        ctx.fillRect(8, -24, 16, 16);  // Cabeza
        ctx.fillStyle = darkBrown;
        ctx.fillRect(6, -20, 6, 12);   // Oreja caída
        ctx.fillStyle = noseBlack;
        ctx.fillRect(22, -18, 4, 4);   // Hocico
        ctx.fillStyle = bellyTan;
        ctx.fillRect(16, -14, 6, 6);   // Hocico claro

        // Patas caminando
        ctx.fillStyle = furBrown;
        if (Dog.frame % 2 === 0) {
            ctx.fillRect(-10, 4, 6, 10);
            ctx.fillRect(6, 4, 6, 10);
        } else {
            ctx.fillRect(-6, 4, 6, 10);
            ctx.fillRect(10, 4, 6, 10);
        }

    } else if (Dog.state === 'sniff') {
        // Perro oliendo el suelo
        ctx.fillStyle = furBrown;
        ctx.fillRect(-14, -10, 28, 16);
        ctx.fillRect(10, -12, 16, 14);
        ctx.fillStyle = darkBrown;
        ctx.fillRect(6, -14, 6, 14);
        ctx.fillStyle = noseBlack;
        ctx.fillRect(24, -4, 4, 4);
        ctx.fillStyle = bellyTan;
        ctx.fillRect(16, -4, 8, 4);
        ctx.fillStyle = furBrown;
        ctx.fillRect(-10, 6, 6, 8);
        ctx.fillRect(8, 6, 6, 8);

    } else if (Dog.state === 'alert') {
        // Perro sorprendido con signo de exclamación
        ctx.fillStyle = furBrown;
        ctx.fillRect(-14, -16, 28, 18);
        ctx.fillRect(8, -28, 16, 16);
        ctx.fillStyle = darkBrown;
        ctx.fillRect(4, -34, 6, 14); // Orejas tiesas hacia arriba
        ctx.fillStyle = noseBlack;
        ctx.fillRect(22, -22, 4, 4);

        // Signo de exclamación retro
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(12, -44, 4, 8);
        ctx.fillRect(12, -34, 4, 3);

    } else if (Dog.state === 'jump') {
        // Perro saltando en arco
        ctx.fillStyle = furBrown;
        ctx.fillRect(-16, -12, 32, 16);
        ctx.fillRect(10, -22, 14, 14);
        ctx.fillStyle = darkBrown;
        ctx.fillRect(6, -26, 6, 12);
        ctx.fillStyle = furBrown;
        ctx.fillRect(-22, 2, 10, 6); // Patas traseras extendidas
        ctx.fillRect(16, 2, 10, 6);  // Patas delanteras

    } else if (Dog.state === 'laugh') {
        // La famosa risa del perro burlón de Duck Hunt
        ctx.fillStyle = furBrown;
        ctx.fillRect(-14, -22, 28, 22);
        ctx.fillStyle = darkBrown;
        ctx.fillRect(-18, -26, 8, 14);
        ctx.fillRect(10, -26, 8, 14);

        // Ojos cerrados de risa
        ctx.fillStyle = noseBlack;
        ctx.fillRect(-8, -18, 5, 2);
        ctx.fillRect(3, -18, 5, 2);

        // Boca abierta riéndose (animada)
        const mouthOpen = Math.floor(Date.now() / 120) % 2 === 0;
        ctx.fillStyle = '#000000';
        ctx.fillRect(-5, -12, 10, mouthOpen ? 8 : 4);
        ctx.fillStyle = '#ef4444'; // Lengua
        ctx.fillRect(-3, -8, 6, 4);

    } else if (Dog.state === 'caught_one' || Dog.state === 'caught_two') {
        // Perro asomándose orgulloso sosteniendo patos
        ctx.fillStyle = furBrown;
        ctx.fillRect(-14, -24, 28, 24);
        ctx.fillStyle = darkBrown;
        ctx.fillRect(-18, -26, 8, 12);
        ctx.fillRect(10, -26, 8, 12);
        ctx.fillStyle = noseBlack;
        ctx.fillRect(-3, -16, 6, 4);

        // Ojos felices
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-8, -20, 4, 4);
        ctx.fillRect(4, -20, 4, 4);
        ctx.fillStyle = '#000000';
        ctx.fillRect(-6, -19, 2, 2);
        ctx.fillRect(6, -19, 2, 2);

        // Pato capturado sostenido en su pata izquierda
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(-24, -14, 12, 14);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-26, -18, 4, 4);

        if (Dog.state === 'caught_two') {
            // Segundo pato sostenido en su pata derecha
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(12, -14, 12, 14);
            ctx.fillStyle = '#f97316';
            ctx.fillRect(22, -18, 4, 4);
        }
    }

    ctx.restore();
}

// ==============================================================================
// AMBIENTE Y ESCENARIO RETRO NES (ÁRBOL, HIERBA Y NUBES)
// ==============================================================================

function drawEnvironment() {
    // 1. Cielo dinámico
    ctx.fillStyle = GameState.skyColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

    // 2. Nubes blancas pixeladas
    ctx.fillStyle = '#ffffff';
    [
        { x: 50, y: 40, w: 48, h: 14 },
        { x: 220, y: 30, w: 60, h: 16 },
        { x: 330, y: 65, w: 42, h: 12 }
    ].forEach(c => {
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillRect(c.x + 8, c.y - 6, c.w - 16, 8);
    });

    // 3. Árbol clásico retorcido de Duck Hunt a la izquierda
    // Tronco marrón
    ctx.fillStyle = '#78350f';
    ctx.fillRect(48, 90, 16, GROUND_Y - 90);
    ctx.fillRect(42, 120, 10, 12);
    ctx.fillRect(58, 145, 12, 10);
    ctx.fillRect(40, GROUND_Y - 14, 32, 14);

    // Copa frondosa verde
    ctx.fillStyle = '#15803d';
    ctx.fillRect(20, 48, 72, 54);
    ctx.fillRect(32, 34, 48, 18);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(28, 54, 56, 38);

    // 4. Arbusto a la derecha
    ctx.fillStyle = '#166534';
    ctx.fillRect(305, GROUND_Y - 38, 54, 38);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(312, GROUND_Y - 32, 40, 26);

    // 5. Suelo y césped alto de primer plano
    // Tierra
    ctx.fillStyle = '#713f12';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // Césped base
    ctx.fillStyle = '#84cc16';
    ctx.fillRect(0, GROUND_Y - 10, CANVAS_WIDTH, 14);

    // Briznas de hierba alta pixelada (ocultan al perro y a los patos al despegar)
    ctx.fillStyle = '#4ade80';
    for (let x = 0; x < CANVAS_WIDTH; x += 8) {
        const h = (x % 16 === 0) ? 14 : 10;
        ctx.fillRect(x, GROUND_Y - h, 4, h);
    }
}

// ==============================================================================
// RETÍCULA ZAPPER Y PARTICULAS
// ==============================================================================

function drawReticle() {
    if (!Reticle.visible) return;

    ctx.save();
    ctx.translate(Math.round(Reticle.x), Math.round(Reticle.y));

    // Círculo exterior rojo brillante
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Cruz de puntería
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-20, -1, 10, 2);
    ctx.fillRect(10, -1, 10, 2);
    ctx.fillRect(-1, -20, 2, 10);
    ctx.fillRect(-1, 10, 2, 10);

    // Punto central blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -1, 2, 2);

    ctx.restore();
}

function createFeathers(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
        feathers.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 80,
            vy: (Math.random() - 0.5) * 80 - 30,
            color: Math.random() > 0.5 ? '#22c55e' : '#f97316',
            life: 0.8,
            maxLife: 0.8,
            size: Math.random() * 3 + 2
        });
    }
}

function updateFeathers(dt) {
    for (let i = feathers.length - 1; i >= 0; i--) {
        const f = feathers[i];
        f.life -= dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy += 60 * dt; // Gravedad suave
        if (f.life <= 0) feathers.splice(i, 1);
    }
}

function drawFeathers() {
    feathers.forEach(f => {
        ctx.fillStyle = f.color;
        ctx.globalAlpha = Math.max(0.1, f.life / f.maxLife);
        ctx.fillRect(Math.round(f.x), Math.round(f.y), f.size, f.size);
    });
    ctx.globalAlpha = 1.0;
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
    // Caja del HUD inferior en la tierra
    const hudY = CANVAS_HEIGHT - 26;

    ctx.save();
    ctx.font = '7px "Press Start 2P", monospace';

    // 1. Contador de Balas / Cartuchos restantes
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SHOT', 16, hudY + 8);
    for (let i = 0; i < 3; i++) {
        if (i < GameState.ammo) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(16 + i * 9, hudY + 12, 6, 8);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(17 + i * 9, hudY + 12, 4, 2);
        } else {
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.strokeRect(16 + i * 9, hudY + 12, 6, 8);
        }
    }

    // 2. Barra de los 10 patos de la ronda
    ctx.fillStyle = '#ffffff';
    ctx.fillText('HIT', 110, hudY + 8);
    for (let i = 0; i < 10; i++) {
        const x = 110 + i * 14;
        const res = GameState.roundHitsArray[i];

        if (res === true) {
            // Pato cazado (Rojo radiante)
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(x, hudY + 12, 10, 8);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 2, hudY + 14, 2, 2);
        } else if (res === false) {
            // Pato escapado (Gris oscuro)
            ctx.fillStyle = '#334155';
            ctx.fillRect(x, hudY + 12, 10, 8);
        } else {
            // Pato pendiente (Blanco/Cyan si es el actual parpadeando)
            const isCurrent = (i === GameState.duckIndexInRound);
            const blink = Math.floor(Date.now() / 150) % 2 === 0;
            ctx.fillStyle = (isCurrent && blink) ? '#38bdf8' : '#64748b';
            ctx.fillRect(x, hudY + 14, 10, 4);
        }
    }

    // 3. Marcador de Ronda a la derecha
    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'right';
    ctx.fillText(`R=${GameState.round}`, CANVAS_WIDTH - 16, hudY + 16);

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

    // Sincronizar balas con el mando móvil
    broadcastAmmo();
    ammoCountElement.textContent = '● '.repeat(GameState.ammo).trim();

    let hitCount = 0;
    activeDucks.forEach(duck => {
        if (duck.state === 'flying' || duck.state === 'fly_away') {
            const dist = Math.hypot(duck.x - aimX, duck.y - aimY);
            // Hitbox generosa para diversión arcade
            if (dist < 34) {
                hitCount++;
                duck.state = 'hit';
                duck.hitTimer = 0.35;
                audio.playQuack();
                createFeathers(duck.x, duck.y, 14);

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

    // Suavizado de transición de color de cielo
    GameState.skyColor = GameState.targetSkyColor;

    // Actualizar movimiento de la retícula por teclado
    Reticle.x += Reticle.vx * 260 * dt;
    Reticle.y += Reticle.vy * 260 * dt;
    Reticle.x = Math.max(16, Math.min(CANVAS_WIDTH - 16, Reticle.x));
    Reticle.y = Math.max(16, Math.min(CANVAS_HEIGHT - 32, Reticle.y));

    updateDog(dt);
    updateFeathers(dt);

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

    // Si hubo disparo, destello blanco clásico Zapper de la NES
    if (GameState.whiteFlashTimer > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        // 1. Cielo, nubes y fondo
        drawEnvironment();

        // 2. Patos en vuelo
        activeDucks.forEach(d => d.draw());

        // 3. Perro cazador (dibujado detrás de la hierba de primer plano)
        drawDog();

        // 4. Plumas cayendo
        drawFeathers();

        // 5. Textos flotantes
        updateAndDrawFloatingScores(dt);

        // 6. Barra NES inferior de los 10 patos y balas
        drawNESBottomHUD();

        // 7. Retícula de puntería Zapper
        if (GameState.running && !GameState.gameOver) {
            drawReticle();
        }
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
