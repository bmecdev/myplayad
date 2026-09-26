// Pacman Clon Retro Arcade - MyPlayAd
// El Comecocos en el Laberinto vs Los 4 Fantasmas (Canvas 200x160)

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const playerNickElement = document.getElementById('player-nick');
const livesCountElement = document.getElementById('lives-count');
const gameOverOverlay = document.getElementById('game-over-overlay');
const waitingOverlay = document.getElementById('waiting-overlay');
const mainScreen = document.getElementById('main-screen');
const rankingList = document.getElementById('ranking-list');
const videoRankingList = document.getElementById('video-ranking-list');
const qrContainer = document.getElementById('qrcode');
const iceRouteElement = document.getElementById('ice-route');

const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 160;
const TILE_SIZE = 8;
const COLS = 25;
const ROWS = 20;

// ==========================================
// 🔊 Retro Arcade Web Audio API Synthesizer
// ==========================================
class PacmanAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.wakaStep = false;
    }

    init() {
        if (!this.ctx) {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                this.ctx = new AudioCtx();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.38, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
            } catch (e) {}
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

    playChomp() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            this.wakaStep = !this.wakaStep;
            const freq = this.wakaStep ? 260 : 340;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.05);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.05);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.05);
        } catch (e) {}
        broadcastSFX('chomp');
    }

    playPowerChomp() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(420, t);
            osc.frequency.exponentialRampToValueAtTime(840, t + 0.12);
            gain.gain.setValueAtTime(0.28, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.12);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.12);
        } catch (e) {}
        broadcastSFX('powerPellet');
    }

    playCatchBear() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            // Crunchy arcade victory tag
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, t);
            osc.frequency.exponentialRampToValueAtTime(1100, t + 0.16);
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.16);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.16);
        } catch (e) {}
        broadcastSFX('catchBear');
    }

    playDrinkSoda() {
        this.playCatchBear();
    }

    playDeath() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.linearRampToValueAtTime(80, t + 0.55);
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.55);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.55);
        } catch (e) {}
        broadcastSFX('playerDeath');
    }

    playLevelClear() {
        if (!this.ctx) return;
        this.resume();
        const notes = [392, 523.25, 659.25, 783.99, 1046.5];
        const t = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t + idx * 0.08);
            gain.gain.setValueAtTime(0.24, t + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.08 + 0.12);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.08);
            osc.stop(t + idx * 0.08 + 0.13);
        });
        broadcastSFX('levelClear');
    }

    playIntro() {
        if (!this.ctx) return;
        this.resume();
        const notes = [261.63, 523.25, 392, 329.63, 523.25, 392, 329.63];
        const t = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + idx * 0.1);
            gain.gain.setValueAtTime(0.22, t + idx * 0.1);
            gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.1 + 0.14);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.1);
            osc.stop(t + idx * 0.1 + 0.15);
        });
    }

    playGameOver() {
        if (!this.ctx) return;
        this.resume();
        const notes = [440, 392, 349.23, 311.13, 261.63];
        const t = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t + idx * 0.15);
            gain.gain.setValueAtTime(0.25, t + idx * 0.15);
            gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.15 + 0.2);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.15);
            osc.stop(t + idx * 0.15 + 0.22);
        });
        broadcastSFX('gameover');
    }
}
const audio = new PacmanAudio();

function broadcastSFX(sound, param = null) {
    if (typeof dataChannels === 'undefined') return;
    const payload = JSON.stringify({ type: 'sfx', sound, param });
    dataChannels.forEach(ch => {
        if (ch && ch.readyState === 'open') {
            try { ch.send(payload); } catch (e) {}
        }
    });
}

['pointerdown', 'click', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => {
        if (!audio.ctx) audio.init();
        else audio.resume();
    }, { passive: true });
});

window.addEventListener('DOMContentLoaded', () => {
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    if (audioToggleBtn) {
        audioToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!audio.ctx) audio.init();
            else audio.resume();
        });
    }
});

// ==========================================
// 🗺️ Arctic Glacier Maze Definition
// 0: Empty, 1: Ice Wall, 2: Snow Dot, 3: Mega Ice Cube (Power Pellet), 4: Fridge Door, 5: Fridge Inside
// 25 cols x 20 rows
// ==========================================
const BASE_MAZE = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,2,2,2,2,2,2,2,2,2,1,1,1,2,2,2,2,2,2,2,2,2,3,1],
    [1,2,1,1,1,2,1,1,1,1,2,1,1,1,2,1,1,1,1,2,1,1,1,2,1],
    [1,2,1,1,1,2,1,1,1,1,2,2,2,2,2,1,1,1,1,2,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,1,1,1,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,2,1],
    [1,2,2,2,2,2,1,2,2,2,2,1,1,1,2,2,2,2,1,2,2,2,2,2,1],
    [1,1,1,1,1,2,1,1,1,0,0,0,0,0,0,0,1,1,1,2,1,1,1,1,1],
    [1,1,1,1,1,2,1,0,0,0,1,4,4,4,1,0,0,0,1,2,1,1,1,1,1],
    [0,0,0,0,0,2,1,0,1,1,1,5,5,5,1,1,1,0,1,2,0,0,0,0,0], // Wrap tunnel row
    [1,1,1,1,1,2,1,0,1,5,5,5,5,5,5,5,1,0,1,2,1,1,1,1,1],
    [1,1,1,1,1,2,0,0,1,1,1,1,1,1,1,1,1,0,0,2,1,1,1,1,1],
    [1,2,1,1,1,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,1,1,1,2,1],
    [1,2,1,1,1,2,1,1,1,1,2,1,1,1,2,1,1,1,1,2,1,1,1,2,1],
    [1,2,2,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,2,2,1],
    [1,1,2,2,1,2,1,2,1,1,1,1,1,1,1,1,1,2,1,2,1,2,2,1,1],
    [1,2,2,2,2,2,1,2,2,2,2,1,1,1,2,2,2,2,1,2,2,2,2,2,1],
    [1,2,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,2,1],
    [1,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// ==========================================
// 🐻 Game State & Entities
// ==========================================
const GameState = {
    running: false,
    gameOver: false,
    paused: false,
    score: 0,
    highScore: 0,
    lives: 3,
    level: 1,
    stageIntroTimer: 0,
    currentNickname: 'PACMAN',
    roomId: Math.random().toString(36).substring(2, 6).toUpperCase(),
    lastTime: 0,
    
    // Maze grid copy for current level
    maze: [],
    dotsRemaining: 0,
    
    // Oso Polar (Hero)
    bear: {
        x: 12 * TILE_SIZE + 4,
        y: 14 * TILE_SIZE + 4,
        dirX: 0,
        dirY: 0,
        nextDirX: 0,
        nextDirY: 0,
        speed: 55, // px/s
        mouthAngle: 0.2,
        mouthOpening: true,
        invulnerableTimer: 0
    },

    // The Coca-Cola Gang (Ghosts)
    cokes: [],

    // Power Pellet Timer
    frightenedTimer: 0,
    cokesEatenInStreak: 0,
    scorePopups: []
};

function initCokes() {
    return [
        {
            name: 'Bruno',
            color: '#6f3a1b', // Bruno: Oso Pardo Alfa (Marrón Cálido)
            snoutColor: '#d4a373',
            earColor: '#4a250f',
            label: 'BRUNO',
            x: 12 * TILE_SIZE + 4,
            y: 7 * TILE_SIZE + 4,
            homeX: 12 * TILE_SIZE + 4,
            homeY: 9 * TILE_SIZE + 4,
            dirX: -1,
            dirY: 0,
            speed: 50,
            state: 'chase',
            inHouse: false,
            releaseTimer: 0,
            lastTile: '12,7'
        },
        {
            name: 'Kodiak',
            color: '#9e4719', // Kodiak: Oso Pardo Rojizo (Emboscador)
            snoutColor: '#deb887',
            earColor: '#6d2e0d',
            label: 'KODIAK',
            x: 11 * TILE_SIZE + 4,
            y: 9 * TILE_SIZE + 4,
            homeX: 11 * TILE_SIZE + 4,
            homeY: 9 * TILE_SIZE + 4,
            dirX: 0,
            dirY: -1,
            speed: 48,
            state: 'chase',
            inHouse: true,
            releaseTimer: 1.5,
            lastTile: null
        },
        {
            name: 'Boris',
            color: '#42220f', // Boris: Oso Pardo Chocolate (Flanqueador)
            snoutColor: '#bca085',
            earColor: '#251206',
            label: 'BORIS',
            x: 13 * TILE_SIZE + 4,
            y: 9 * TILE_SIZE + 4,
            homeX: 13 * TILE_SIZE + 4,
            homeY: 9 * TILE_SIZE + 4,
            dirX: 0,
            dirY: -1,
            speed: 46,
            state: 'chase',
            inHouse: true,
            releaseTimer: 3.5,
            lastTile: null
        },
        {
            name: 'Barnaby',
            color: '#c47d37', // Barnaby: Oso Pardo Canela / Miel (Glotón / Asustadizo)
            snoutColor: '#f3d3a2',
            earColor: '#8a521e',
            label: 'BARNABY',
            x: 12 * TILE_SIZE + 4,
            y: 10 * TILE_SIZE + 4,
            homeX: 12 * TILE_SIZE + 4,
            homeY: 10 * TILE_SIZE + 4,
            dirX: 0,
            dirY: -1,
            speed: 44,
            state: 'chase',
            inHouse: true,
            releaseTimer: 6.0,
            lastTile: null
        }
    ];
}

function loadMaze() {
    GameState.maze = [];
    GameState.dotsRemaining = 0;
    for (let r = 0; r < ROWS; r++) {
        GameState.maze[r] = [];
        for (let c = 0; c < COLS; c++) {
            const tile = BASE_MAZE[r][c];
            GameState.maze[r][c] = tile;
            if (tile === 2 || tile === 3) {
                GameState.dotsRemaining++;
            }
        }
    }
}

function startNewGame() {
    GameState.score = 0;
    GameState.lives = 3;
    GameState.level = 1;
    GameState.gameOver = false;
    GameState.running = true;
    GameState.scorePopups = [];
    
    loadMaze();
    resetRoundPositions();
    GameState.stageIntroTimer = 1.0;
    audio.playIntro();

    gameOverOverlay.classList.add('hidden');
    waitingOverlay.classList.add('hidden');
    updateUI();
}

function resetRoundPositions() {
    GameState.bear.x = 12 * TILE_SIZE + 4;
    GameState.bear.y = 14 * TILE_SIZE + 4;
    GameState.bear.dirX = -1; // Oso inicia moviéndose hacia la izquierda
    GameState.bear.dirY = 0;
    GameState.bear.nextDirX = -1;
    GameState.bear.nextDirY = 0;
    GameState.bear.invulnerableTimer = 1.5;

    GameState.cokes = initCokes();
    GameState.frightenedTimer = 0;
    GameState.cokesEatenInStreak = 0;
}

// ==========================================
// 🕹️ Movement & Collisions
// ==========================================
function isWall(tileX, tileY, isGhost = false, isEaten = false) {
    if (tileY === 9 && (tileX < 0 || tileX >= COLS)) return false; // Tunnel wrap
    if (tileX < 0 || tileX >= COLS || tileY < 0 || tileY >= ROWS) return true;

    const tile = GameState.maze[tileY][tileX];
    if (tile === 1) return true; // Ice wall
    if (tile === 4) {
        // Ghost House Door: Only eaten ghosts returning can pass through
        if (isEaten) return false;
        return true; // Polar Bear and normal ghosts CANNOT enter the door!
    }
    if (tile === 5) {
        // Inside fridge: normal ghosts in maze cannot enter
        if (!isEaten) return true;
        return false;
    }
    return false;
}

function updateBear(dt) {
    const bear = GameState.bear;

    if (bear.invulnerableTimer > 0) {
        bear.invulnerableTimer -= dt;
    }

    const currentTileX = Math.floor(bear.x / TILE_SIZE);
    const currentTileY = Math.floor(bear.y / TILE_SIZE);
    const centerX = currentTileX * TILE_SIZE + 4;
    const centerY = currentTileY * TILE_SIZE + 4;

    // Immediate 180 reverse in corridor
    if (bear.nextDirX !== 0 && bear.nextDirX === -bear.dirX) {
        bear.dirX = bear.nextDirX;
        bear.dirY = 0;
        bear.nextDirX = 0;
    } else if (bear.nextDirY !== 0 && bear.nextDirY === -bear.dirY) {
        bear.dirY = bear.nextDirY;
        bear.dirX = 0;
        bear.nextDirY = 0;
    }

    // If stopped, try queued direction
    if (bear.dirX === 0 && bear.dirY === 0) {
        const tryX = bear.nextDirX;
        const tryY = bear.nextDirY;
        if (tryX !== 0 || tryY !== 0) {
            if (!isWall(currentTileX + tryX, currentTileY + tryY)) {
                bear.dirX = tryX;
                bear.dirY = tryY;
                bear.nextDirX = 0;
                bear.nextDirY = 0;
            }
        }
    }

    const step = bear.speed * dt;

    if (bear.dirX !== 0) {
        bear.y = centerY;
        const prevX = bear.x;
        bear.x += bear.dirX * step;

        const crossed = (bear.dirX > 0 && prevX < centerX && bear.x >= centerX) ||
                        (bear.dirX < 0 && prevX > centerX && bear.x <= centerX);

        if (crossed) {
            if (bear.nextDirY !== 0 && !isWall(currentTileX, currentTileY + bear.nextDirY)) {
                bear.x = centerX;
                bear.dirY = bear.nextDirY;
                bear.dirX = 0;
                bear.nextDirX = 0;
            }
        }

        const nextTileX = currentTileX + bear.dirX;
        if (isWall(nextTileX, currentTileY)) {
            if ((bear.dirX > 0 && bear.x >= centerX) || (bear.dirX < 0 && bear.x <= centerX)) {
                bear.x = centerX;
                bear.dirX = 0;
            }
        }
    } else if (bear.dirY !== 0) {
        bear.x = centerX;
        const prevY = bear.y;
        bear.y += bear.dirY * step;

        const crossed = (bear.dirY > 0 && prevY < centerY && bear.y >= centerY) ||
                        (bear.dirY < 0 && prevY > centerY && bear.y <= centerY);

        if (crossed) {
            if (bear.nextDirX !== 0 && !isWall(currentTileX + bear.nextDirX, currentTileY)) {
                bear.y = centerY;
                bear.dirX = bear.nextDirX;
                bear.dirY = 0;
                bear.nextDirX = 0;
            }
        }

        const nextTileY = currentTileY + bear.dirY;
        if (isWall(currentTileX, nextTileY)) {
            if ((bear.dirY > 0 && bear.y >= centerY) || (bear.dirY < 0 && bear.y <= centerY)) {
                bear.y = centerY;
                bear.dirY = 0;
            }
        }
    }

    // Mouth chomp animation
    if (bear.dirX !== 0 || bear.dirY !== 0) {
        if (bear.mouthOpening) {
            bear.mouthAngle += dt * 7;
            if (bear.mouthAngle >= 0.5) bear.mouthOpening = false;
        } else {
            bear.mouthAngle -= dt * 7;
            if (bear.mouthAngle <= 0.05) bear.mouthOpening = true;
        }
    }

    // Side tunnel wrap
    if (bear.x < -4) bear.x = CANVAS_WIDTH + 2;
    if (bear.x > CANVAS_WIDTH + 4) bear.x = -2;

    // Eat dots
    const finalTileX = Math.floor(bear.x / TILE_SIZE);
    const finalTileY = Math.floor(bear.y / TILE_SIZE);
    if (finalTileX >= 0 && finalTileX < COLS && finalTileY >= 0 && finalTileY < ROWS) {
        const tile = GameState.maze[finalTileY][finalTileX];
        if (tile === 2) {
            GameState.maze[finalTileY][finalTileX] = 0;
            GameState.score += 10;
            GameState.dotsRemaining--;
            audio.playChomp();
            checkStageProgress();
        } else if (tile === 3) {
            GameState.maze[finalTileY][finalTileX] = 0;
            GameState.score += 50;
            GameState.dotsRemaining--;
            GameState.frightenedTimer = 7.0;
            GameState.cokesEatenInStreak = 0;
            GameState.cokes.forEach(c => {
                if (c.state !== 'eaten') {
                    c.state = 'frightened';
                    if (!c.inHouse) {
                        c.dirX = -c.dirX;
                        c.dirY = -c.dirY;
                        c.lastTile = null;
                    }
                }
            });
            audio.playPowerChomp();
            checkStageProgress();
        }
    }
}

function updateCokes(dt) {
    if (GameState.stageIntroTimer > 0) return;

    if (GameState.frightenedTimer > 0) {
        GameState.frightenedTimer -= dt;
        if (GameState.frightenedTimer <= 0) {
            GameState.cokes.forEach(c => {
                if (c.state === 'frightened') c.state = 'chase';
            });
        }
    }

    GameState.cokes.forEach(coke => {
        let spd = coke.speed;
        if (coke.state === 'frightened') spd *= 0.55;
        if (coke.state === 'eaten') spd *= 1.8;

        // Inside fridge waiting or exiting
        if (coke.inHouse) {
            if (coke.releaseTimer > 0) {
                coke.releaseTimer -= dt;
                coke.y = coke.homeY + Math.sin(performance.now() * 0.008 + coke.homeX) * 2;
                return;
            }

            // Exiting through the door
            const doorX = 12 * TILE_SIZE + 4;
            if (Math.abs(coke.x - doorX) > 1) {
                coke.x += Math.sign(doorX - coke.x) * spd * dt * 0.7;
            } else {
                coke.x = doorX;
                coke.y -= spd * dt * 0.7;
                if (coke.y <= 7 * TILE_SIZE + 4) {
                    coke.inHouse = false;
                    coke.x = doorX;
                    coke.y = 7 * TILE_SIZE + 4;
                    coke.dirX = Math.random() > 0.5 ? 1 : -1;
                    coke.dirY = 0;
                    coke.lastTile = '12,7';
                }
            }
            return;
        }

        // Return to fridge if eaten
        if (coke.state === 'eaten') {
            const doorX = 12 * TILE_SIZE + 4;
            const doorY = 7 * TILE_SIZE + 4;
            if (Math.hypot(coke.x - doorX, coke.y - doorY) < 6) {
                coke.x = coke.homeX;
                coke.y = coke.homeY;
                coke.state = 'chase';
                coke.inHouse = true;
                coke.releaseTimer = 1.0;
                coke.lastTile = null;
                return;
            }
        }

        const currentTileX = Math.floor(coke.x / TILE_SIZE);
        const currentTileY = Math.floor(coke.y / TILE_SIZE);
        const centerX = currentTileX * TILE_SIZE + 4;
        const centerY = currentTileY * TILE_SIZE + 4;
        const currentTileKey = `${currentTileX},${currentTileY}`;
        const step = spd * dt;

        if (coke.dirX !== 0) {
            coke.y = centerY;
            const prevX = coke.x;
            coke.x += coke.dirX * step;

            const crossed = (coke.dirX > 0 && prevX < centerX && coke.x >= centerX) ||
                            (coke.dirX < 0 && prevX > centerX && coke.x <= centerX);

            if (crossed && coke.lastTile !== currentTileKey) {
                coke.x = centerX;
                coke.lastTile = currentTileKey;
                chooseNextCokeDirection(coke);
            } else {
                // Check wall ahead
                const nextTileX = currentTileX + coke.dirX;
                if (isWall(nextTileX, currentTileY, true, coke.state === 'eaten')) {
                    if ((coke.dirX > 0 && coke.x >= centerX) || (coke.dirX < 0 && coke.x <= centerX)) {
                        coke.x = centerX;
                        coke.lastTile = currentTileKey;
                        chooseNextCokeDirection(coke);
                    }
                }
            }
        } else if (coke.dirY !== 0) {
            coke.x = centerX;
            const prevY = coke.y;
            coke.y += coke.dirY * step;

            const crossed = (coke.dirY > 0 && prevY < centerY && coke.y >= centerY) ||
                            (coke.dirY < 0 && prevY > centerY && coke.y <= centerY);

            if (crossed && coke.lastTile !== currentTileKey) {
                coke.y = centerY;
                coke.lastTile = currentTileKey;
                chooseNextCokeDirection(coke);
            } else {
                // Check wall ahead
                const nextTileY = currentTileY + coke.dirY;
                if (isWall(currentTileX, nextTileY, true, coke.state === 'eaten')) {
                    if ((coke.dirY > 0 && coke.y >= centerY) || (coke.dirY < 0 && coke.y <= centerY)) {
                        coke.y = centerY;
                        coke.lastTile = currentTileKey;
                        chooseNextCokeDirection(coke);
                    }
                }
            }
        } else {
            chooseNextCokeDirection(coke);
        }

        // Tunnel wrap
        if (coke.x < -4) {
            coke.x = CANVAS_WIDTH + 2;
            coke.lastTile = null;
        }
        if (coke.x > CANVAS_WIDTH + 4) {
            coke.x = -2;
            coke.lastTile = null;
        }

        checkBearCokeCollision(coke);
    });
}

function chooseNextCokeDirection(coke) {
    const isEaten = coke.state === 'eaten';
    const cellX = Math.floor(coke.x / TILE_SIZE);
    const cellY = Math.floor(coke.y / TILE_SIZE);

    const dirs = [
        { dx: 0, dy: -1 }, // Up
        { dx: -1, dy: 0 }, // Left
        { dx: 0, dy: 1 },  // Down
        { dx: 1, dy: 0 }   // Right
    ];

    let validDirs = dirs.filter(d => {
        if (coke.dirX !== 0 && d.dx === -coke.dirX) return false;
        if (coke.dirY !== 0 && d.dy === -coke.dirY) return false;
        return !isWall(cellX + d.dx, cellY + d.dy, true, isEaten);
    });

    if (validDirs.length === 0) {
        validDirs = dirs.filter(d => !isWall(cellX + d.dx, cellY + d.dy, true, isEaten));
    }

    if (validDirs.length === 0) {
        return;
    }

    if (coke.state === 'frightened') {
        const pick = validDirs[Math.floor(Math.random() * validDirs.length)];
        coke.dirX = pick.dx;
        coke.dirY = pick.dy;
        return;
    }

    let targetX = GameState.bear.x;
    let targetY = GameState.bear.y;

    if (isEaten) {
        targetX = 12 * TILE_SIZE + 4;
        targetY = 7 * TILE_SIZE + 4;
    } else if (coke.name === 'Kodiak') {
        // Kodiak (Pinky): Emboscada 3 casillas por delante
        targetX += (GameState.bear.dirX || 0) * 24;
        targetY += (GameState.bear.dirY || 0) * 24;
    } else if (coke.name === 'Boris') {
        // Boris (Inky): Maniobra en pinza usando a Bruno
        const bruno = GameState.cokes.find(c => c.name === 'Bruno');
        if (bruno) {
            const pivotX = GameState.bear.x + (GameState.bear.dirX || 0) * 16;
            const pivotY = GameState.bear.y + (GameState.bear.dirY || 0) * 16;
            targetX = pivotX * 2 - bruno.x;
            targetY = pivotY * 2 - bruno.y;
        }
    } else if (coke.name === 'Barnaby') {
        // Barnaby (Clyde): Caza lejana, retirada al rincón si está a menos de 40px
        const distToBear = Math.hypot(coke.x - GameState.bear.x, coke.y - GameState.bear.y);
        if (distToBear < 40) {
            targetX = 2 * TILE_SIZE + 4;
            targetY = 18 * TILE_SIZE + 4;
        }
    }

    let bestDir = validDirs[0];
    let bestDist = Infinity;

    validDirs.forEach(d => {
        const nextX = (cellX + d.dx) * TILE_SIZE + 4;
        const nextY = (cellY + d.dy) * TILE_SIZE + 4;
        const dist = Math.hypot(nextX - targetX, nextY - targetY);
        if (dist < bestDist) {
            bestDist = dist;
            bestDir = d;
        }
    });

    coke.dirX = bestDir.dx;
    coke.dirY = bestDir.dy;
}

function checkBearCokeCollision(coke) {
    if (coke.state === 'eaten') return;
    const dist = Math.hypot(GameState.bear.x - coke.x, GameState.bear.y - coke.y);

    if (dist < 6) {
        if (coke.state === 'frightened') {
            // El Oso Polar atrapa al Oso Pardo asustado!
            coke.state = 'eaten';
            GameState.cokesEatenInStreak++;
            const points = 200 * Math.pow(2, GameState.cokesEatenInStreak - 1);
            GameState.score += points;
            audio.playCatchBear();
            addScorePopup(coke.x, coke.y, `+${points}`);
            updateUI();
        } else if (GameState.bear.invulnerableTimer <= 0) {
            // Polar Bear gets caught by a Brown Bear!
            killBear();
        }
    }
}

function killBear() {
    audio.playDeath();
    GameState.lives--;
    updateUI();

    if (GameState.lives <= 0) {
        endGame();
    } else {
        resetRoundPositions();
        GameState.stageIntroTimer = 1.5;
    }
}

function checkStageProgress() {
    if (GameState.score > GameState.highScore) {
        GameState.highScore = GameState.score;
    }
    updateUI();

    if (GameState.dotsRemaining <= 0) {
        audio.playLevelClear();
        GameState.score += 1000;
        GameState.level++;
        updateUI();
        loadMaze();
        resetRoundPositions();
        GameState.stageIntroTimer = 2.0;
        audio.playIntro();
    }
}

function addScorePopup(x, y, text) {
    GameState.scorePopups.push({
        x: x,
        y: y,
        text: text,
        timer: 0.9
    });
}

// ==========================================
// 🎨 Pixel-Art Rendering
// ==========================================
function render() {
    // 1. Clear Ice Glacier Background
    ctx.fillStyle = '#060f14';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Draw Maze Ice Walls & Pellets
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = GameState.maze[r][c];
            const px = c * TILE_SIZE;
            const py = r * TILE_SIZE;

            if (tile === 1) {
                // Sleek Icy Glacier Wall
                ctx.fillStyle = '#0a2a3a';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#00d2ff';
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
                // Frost corner highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillRect(px + 1, py + 1, 2, 2);
            } else if (tile === 2) {
                // Snow Dot
                ctx.fillStyle = '#e0f7fa';
                ctx.fillRect(px + 3, py + 3, 2, 2);
            } else if (tile === 3) {
                // Mega Ice Cube (Pulsing Power Pellet)
                const pulse = Math.sin(performance.now() * 0.008) * 0.5 + 1.5;
                ctx.fillStyle = '#ffb703';
                ctx.fillRect(px + 4 - pulse, py + 4 - pulse, pulse * 2, pulse * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(px + 3, py + 3, 2, 2);
            } else if (tile === 4) {
                // Bear Cave Wooden Gate
                ctx.fillStyle = 'rgba(212, 163, 115, 0.75)';
                ctx.fillRect(px, py + 3, TILE_SIZE, 2);
            }
        }
    }

    // 3. Draw The Brown Bears (Osos Pardos)
    GameState.cokes.forEach(bear => {
        drawBrownBear(bear);
    });

    // 4. Draw Polar Bear (Hero)
    if (GameState.running) {
        if (GameState.bear.invulnerableTimer <= 0 || Math.floor(GameState.bear.invulnerableTimer * 10) % 2 === 0) {
            drawPolarBear(GameState.bear);
        }
    }

    // 5. Draw Floating Score Popups
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffea00';
    for (let i = GameState.scorePopups.length - 1; i >= 0; i--) {
        const sp = GameState.scorePopups[i];
        ctx.fillText(sp.text, sp.x - 6, sp.y);
        sp.y -= 0.3;
        sp.timer -= 0.016;
        if (sp.timer <= 0) GameState.scorePopups.splice(i, 1);
    }

    // 6. Stage Intro Banner
    if (GameState.stageIntroTimer > 0) {
        ctx.font = '9px "Press Start 2P", monospace';
        ctx.fillStyle = '#3dff8a';
        ctx.textAlign = 'center';
        ctx.fillText(`LEVEL ${GameState.level}`, CANVAS_WIDTH / 2, 85);
        ctx.fillStyle = '#ffb703';
        ctx.fillText('READY!', CANVAS_WIDTH / 2, 98);
        ctx.textAlign = 'start';
    }
}

// Draw Polar Bear with animated chomp jaws and cute ears
function drawPolarBear(bear) {
    const x = Math.floor(bear.x);
    const y = Math.floor(bear.y);
    const radius = 4.5;

    ctx.save();
    ctx.translate(x, y);

    // Rotate towards movement direction
    let angle = 0;
    if (bear.dirX === 1) angle = 0;
    else if (bear.dirX === -1) angle = Math.PI;
    else if (bear.dirY === -1) angle = -Math.PI / 2;
    else if (bear.dirY === 1) angle = Math.PI / 2;
    ctx.rotate(angle);

    // Polar Bear Head with mouth wedge
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, radius, bear.mouthAngle, Math.PI * 2 - bear.mouthAngle);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    // Cute Round Bear Ears
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2, -radius + 1, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffccd5'; // Inner pink ear
    ctx.beginPath();
    ctx.arc(-2, -radius + 1, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Cute Dark Eye
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(1, -2, 1, 0, Math.PI * 2);
    ctx.fill();

    // Black Button Nose
    ctx.fillStyle = '#111111';
    ctx.fillRect(radius - 1.5, -0.8, 1.5, 1.5);

    ctx.restore();
}

// Draw Brown Bears (Osos Pardos) - Retro Pixel Art
function drawBrownBear(bear) {
    const x = Math.floor(bear.x);
    const y = Math.floor(bear.y);

    ctx.save();
    ctx.translate(x, y);

    // Eaten State: Cartoon frightened bear eyes racing back to cave
    if (bear.state === 'eaten') {
        const eyeDx = bear.dirX * 1.5;
        const eyeDy = bear.dirY * 1.5;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3, -2, 2.5, 3.5);
        ctx.fillRect(1, -2, 2.5, 3.5);
        ctx.fillStyle = '#0055ff';
        ctx.fillRect(-2.5 + eyeDx * 0.6, -1 + eyeDy * 0.6, 1.5, 1.5);
        ctx.fillRect(1.5 + eyeDx * 0.6, -1 + eyeDy * 0.6, 1.5, 1.5);
        ctx.restore();
        return;
    }

    // Frightened State: Shivering frozen ice-blue bear with panic eyes
    if (bear.state === 'frightened') {
        const blink = GameState.frightenedTimer < 2.0 && Math.floor(performance.now() * 0.008) % 2 === 0;
        const shiver = Math.sin(performance.now() * 0.05 + bear.homeX) * 0.6;
        ctx.translate(shiver, 0);

        const bodyColor = blink ? '#ffffff' : '#00b4d8';
        const innerColor = blink ? '#ff4d6d' : '#90e0ef';

        // 1. Shivering Bear Ears
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(-3.2, -3.8, 1.8, 0, Math.PI * 2);
        ctx.arc(3.2, -3.8, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // 2. Round Bear Body / Head
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // 3. Icy Snout
        ctx.fillStyle = innerColor;
        ctx.beginPath();
        ctx.ellipse(0, 1.2, 2.5, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. Panic Eyes (wide white circles with tiny dots)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2.8, -1.8, 2, 2);
        ctx.fillRect(0.8, -1.8, 2, 2);
        ctx.fillStyle = blink ? '#000000' : '#03045e';
        ctx.fillRect(-2, -1.2, 1, 1);
        ctx.fillRect(1.5, -1.2, 1, 1);

        // 5. Wavy Scared Mouth
        ctx.fillStyle = blink ? '#000000' : '#03045e';
        ctx.fillRect(-1.5, 2.2, 3, 0.8);

        ctx.restore();
        return;
    }

    // ==========================================
    // Normal Brown Bear (Oso Pardo)
    // ==========================================
    const walkCycle = Math.sin(performance.now() * 0.015 + bear.homeX);

    // 1. Round Furry Bear Ears
    ctx.fillStyle = bear.color;
    ctx.beginPath();
    ctx.arc(-3.2, -3.8, 2, 0, Math.PI * 2);
    ctx.arc(3.2, -3.8, 2, 0, Math.PI * 2);
    ctx.fill();

    // Inner Ears
    ctx.fillStyle = bear.earColor || '#4a250f';
    ctx.beginPath();
    ctx.arc(-3.2, -3.8, 1.1, 0, Math.PI * 2);
    ctx.arc(3.2, -3.8, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // 2. Plump Bear Body / Head
    ctx.fillStyle = bear.color;
    ctx.beginPath();
    ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
    ctx.fill();

    // 3. Bear Muzzle / Snout (Lighter Tan Fur)
    ctx.fillStyle = bear.snoutColor || '#d4a373';
    ctx.beginPath();
    ctx.ellipse(0, 1.2, 2.7, 2.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Black Button Nose
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(0, 0.4, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // 5. Cute Bear Mouth Line
    ctx.fillRect(-0.4, 1.1, 0.8, 0.9);
    ctx.fillRect(-1.2, 1.8, 2.4, 0.6);

    // 6. Expressive Eyes Looking in Direction
    const eyeOffsetX = bear.dirX * 1.0;
    const eyeOffsetY = bear.dirY * 1.0;

    // Sclera (White)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2.7, -1.8, 2, 2);
    ctx.fillRect(0.7, -1.8, 2, 2);

    // Pupils (Black)
    ctx.fillStyle = '#000000';
    ctx.fillRect(-2.3 + eyeOffsetX * 0.6, -1.5 + eyeOffsetY * 0.6, 1.2, 1.2);
    ctx.fillRect(1.1 + eyeOffsetX * 0.6, -1.5 + eyeOffsetY * 0.6, 1.2, 1.2);

    // 7. Little Trotting Paws at Bottom
    ctx.fillStyle = bear.earColor || '#4a250f';
    const leftPawY = 4.2 + (walkCycle > 0 ? 0.6 : -0.4);
    const rightPawY = 4.2 + (walkCycle > 0 ? -0.4 : 0.6);
    ctx.fillRect(-3, leftPawY, 2, 1.2);
    ctx.fillRect(1, rightPawY, 2, 1.2);

    ctx.restore();
}
const drawCocaCola = drawBrownBear;

// ==========================================
// 🔁 Game Loop & Lifecycle
// ==========================================
function gameLoop(timestamp) {
    if (!GameState.lastTime) GameState.lastTime = timestamp;
    const dt = Math.min((timestamp - GameState.lastTime) / 1000, 0.05);
    GameState.lastTime = timestamp;

    if (GameState.running && !GameState.gameOver && !GameState.paused) {
        if (GameState.stageIntroTimer > 0) {
            GameState.stageIntroTimer -= dt;
        } else {
            updateBear(dt);
            updateCokes(dt);
        }
    }
    render();

    requestAnimationFrame(gameLoop);
}

function endGame() {
    audio.playGameOver();
    GameState.gameOver = true;
    GameState.running = false;
    gameOverOverlay.classList.remove('hidden');

    saveScore(GameState.currentNickname, GameState.score);

    // Notify mobile controller
    dataChannels.forEach(ch => {
        if (ch && ch.readyState === 'open') {
            try {
                ch.send(JSON.stringify({ type: 'game_over', score: GameState.score }));
            } catch (e) {}
        }
    });

    const videoOverlay = document.getElementById('video-ranking-overlay');
    if (videoOverlay) {
        videoOverlay.classList.remove('hidden');
        if (typeof fetchAndShowUpcomingGames === 'function') {
            fetchAndShowUpcomingGames();
        }
        setTimeout(() => {
            if (!GameState.running) videoOverlay.classList.add('hidden');
        }, 5000);
    }

    setTimeout(() => {
        if (!GameState.running) {
            resetSignalingAndRoom();
        }
    }, 15000);
}

function updateUI() {
    scoreElement.textContent = `SCORE: ${GameState.score.toString().padStart(3, '0')}`;
    highScoreElement.textContent = `HI: ${GameState.highScore.toString().padStart(3, '0')}`;
    livesCountElement.textContent = GameState.lives;
}

// ==========================================
// 🏆 Hall of Fame
// ==========================================
function loadRanking() {
    try {
        const ranking = JSON.parse(localStorage.getItem('pacman-ranking')) || [];
        if (ranking.length > 0) {
            GameState.highScore = ranking[0].score;
            updateUI();
        }
        displayRanking(ranking);
    } catch (e) {}
}

function saveScore(nickname, score) {
    if (score === 0) return;
    try {
        let ranking = JSON.parse(localStorage.getItem('pacman-ranking')) || [];
        ranking = ranking.filter(entry => !(entry.name === nickname && entry.score < score));
        if (!ranking.some(entry => entry.name === nickname && entry.score === score)) {
            ranking.push({ name: nickname, score: score, date: new Date().toLocaleDateString() });
        }
        ranking.sort((a, b) => b.score - a.score);
        ranking = ranking.slice(0, 5);
        localStorage.setItem('pacman-ranking', JSON.stringify(ranking));
        displayRanking(ranking);
    } catch (e) {}
}

function displayRanking(ranking) {
    if (rankingList) {
        rankingList.innerHTML = ranking.slice(0, 5).map((entry, idx) => `
            <li>
                <span class="rank">${idx + 1}.</span>
                <span class="nick">${entry.name.toUpperCase().substring(0, 10)}</span>
                <span class="score">${entry.score.toString().padStart(3, '0')}</span>
            </li>
        `).join('');
    }
    if (videoRankingList) {
        videoRankingList.innerHTML = ranking.slice(0, 5).map((entry, idx) => `
            <li>
                <span>${idx + 1}. ${entry.name.toUpperCase()}</span>
                <span>${entry.score.toString().padStart(3, '0')}</span>
            </li>
        `).join('');
    }
}

// ==========================================
// 📡 WebRTC Signaling & Handshake
// ==========================================
const peerConnections = new Map();
const dataChannels = new Map();
let socket = null;

function getControlUrl() {
    const baseUrl = CONFIG.CONTROL_URL || 'https://controllers.myplayad.com/pacman';
    return baseUrl.includes('://')
        ? `${baseUrl}?room=${GameState.roomId}`
        : `${window.location.protocol}//${baseUrl}?room=${GameState.roomId}`;
}

function updateQrCode() {
    const controlUrl = getControlUrl();
    const qrContainer = document.getElementById('qrcode');
    if (qrContainer) {
        qrContainer.innerHTML = '';
        try {
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, {
                    text: controlUrl,
                    width: 160,
                    height: 160,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            } else {
                throw new Error('QRCode not loaded');
            }
        } catch (e) {
            console.warn('QRCode error, using fallback API:', e);
            qrContainer.innerHTML = `<img id="qr-code-img" src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(controlUrl)}&margin=10" alt="QR" style="width: 160px; height: 160px; display: block;">`;
        }
    } else {
        const qrCodeImg = document.getElementById('qr-code-img');
        if (qrCodeImg) {
            qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(controlUrl)}&margin=10`;
        }
    }
    const roomIdEl = document.getElementById('room-id');
    if (roomIdEl) roomIdEl.textContent = `ID: ${GameState.roomId}`;
}

function setIceRouteText(text) {
    if (iceRouteElement) {
        iceRouteElement.textContent = `ICE: ${text}`;
    }
}

function getIceRouteType(stats) {
    let selectedPair = null;
    let localCandidate = null;

    stats.forEach(report => {
        if (report.type === 'candidate-pair' && (report.selected || report.state === 'succeeded' || report.selectedCandidatePairId)) {
            selectedPair = report;
        }
    });

    if (!selectedPair) {
        stats.forEach(report => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                selectedPair = report;
            }
        });
    }

    if (selectedPair) {
        stats.forEach(report => {
            if (report.type === 'local-candidate' && report.id === selectedPair.localCandidateId) {
                localCandidate = report;
            }
        });
        if (localCandidate) {
            return localCandidate.candidateType === 'relay' ? 'TURN' : 'STUN';
        }
    }
    return null;
}

function refreshIceRoute(pc) {
    if (!pc || !pc.getStats) return;
    pc.getStats().then(stats => {
        const routeType = getIceRouteType(stats);
        if (routeType) {
            setIceRouteText(routeType);
        } else {
            setIceRouteText('P2P');
        }
    }).catch(err => {
        setIceRouteText('P2P');
    });
}

function handleControllerDisconnect(playerId) {
    const pc = peerConnections.get(playerId);
    if (pc) pc.close();
    peerConnections.delete(playerId);
    dataChannels.delete(playerId);

    if (peerConnections.size === 0) {
        waitingOverlay.classList.remove('hidden');
        GameState.running = false;
        GameState.gameOver = true;
    }
}

async function handleOffer(data) {
    const { playerId, type, sdp } = data;
    const rtcConfig = (window.GAME_CONFIG && window.GAME_CONFIG.getIceConfig) ? window.GAME_CONFIG.getIceConfig() : getIceConfig();
    const pc = new RTCPeerConnection(rtcConfig);
    
    if (window.GAME_CONFIG && window.GAME_CONFIG.attachPCDiagnostics) {
        try { window.GAME_CONFIG.attachPCDiagnostics(pc, `pc-${playerId}`); } catch (e) {}
    }
    peerConnections.set(playerId, pc);

    pc.onicecandidate = (event) => {
        if (event.candidate && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'candidate',
                candidate: event.candidate,
                roomId: GameState.roomId,
                playerId: playerId
            }));
        }
    };

    pc.ondatachannel = (event) => {
        const receiveChannel = event.channel;
        dataChannels.set(playerId, receiveChannel);

        if (window.GAME_CONFIG && window.GAME_CONFIG.attachDataChannelDiagnostics) {
            try { window.GAME_CONFIG.attachDataChannelDiagnostics(receiveChannel, `dc-${playerId}`); } catch (e) {}
        }

        setupDataChannel(receiveChannel, playerId);
    };

    pc.oniceconnectionstatechange = () => {
        refreshIceRoute(pc);
        const state = pc.iceConnectionState;
        if (state === 'disconnected' || state === 'failed') {
            handleControllerDisconnect(playerId);
        }
    };

    pc.onconnectionstatechange = () => {
        refreshIceRoute(pc);
        const state = pc.connectionState;
        if (state === 'disconnected' || state === 'failed') {
            handleControllerDisconnect(playerId);
        }
    };

    await pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.send(JSON.stringify({
        type: 'answer',
        sdp: answer.sdp,
        roomId: GameState.roomId,
        playerId: playerId
    }));
}

function resetSignalingAndRoom() {
    dataChannels.forEach(ch => ch.close());
    peerConnections.forEach(pc => pc.close());
    dataChannels.clear();
    peerConnections.clear();

    GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    GameState.running = false;
    GameState.gameOver = false;
    GameState.currentNickname = 'PACMAN';
    if (playerNickElement) playerNickElement.textContent = 'PACMAN: ----';
    
    waitingOverlay.classList.remove('hidden');
    gameOverOverlay.classList.add('hidden');
    updateQrCode();
    
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'register',
            role: 'host',
            roomId: GameState.roomId,
            maxPlayers: CONFIG.MAX_PLAYERS || 1
        }));
    } else {
        connectSignaling();
    }
}

function connectSignaling() {
    updateQrCode();
    const serverIp = CONFIG.SIGNALING_SERVER_IP || window.location.hostname;
    const serverPort = CONFIG.SIGNALING_SERVER_PORT || '8080';
    const serverUrl = CONFIG.SIGNALING_SERVER_URL || `${serverIp}:${serverPort}`;
    const wsUrl = serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://')
        ? serverUrl
        : `wss://${serverUrl}`;

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            updateQrCode();
            socket.send(JSON.stringify({
                type: 'register',
                role: 'host',
                roomId: GameState.roomId,
                maxPlayers: CONFIG.MAX_PLAYERS || 1
            }));
        };

        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'offer') {
                    await handleOffer(data);
                } else if (data.type === 'candidate') {
                    const pc = peerConnections.get(data.playerId);
                    if (pc && data.candidate) {
                        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                    }
                } else if (data.type === 'controller_connected') {
                    waitingOverlay.classList.add('hidden');
                } else if (data.type === 'controller_disconnected') {
                    handleControllerDisconnect(data.playerId);
                }
            } catch (err) {
                console.error('Error procesando mensaje signaling:', err);
            }
        };

        socket.onclose = () => {
            setTimeout(connectSignaling, 2000);
        };
    } catch (e) {
        console.error('Error conectando signaling:', e);
    }
}

function setupDataChannel(channel, playerId) {
    channel.onopen = () => {
        console.log(`WebRTC DataChannel conectado con Pacman (Player ${playerId})`);
        waitingOverlay.classList.add('hidden');
        refreshIceRoute(peerConnections.get(playerId));
    };

    channel.onclose = () => {
        handleControllerDisconnect(playerId);
    };

    channel.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'join' || msg.type === 'nickname') {
                GameState.currentNickname = msg.nickname || msg.value || 'PACMAN';
                if (playerNickElement) playerNickElement.textContent = `PACMAN: ${GameState.currentNickname.toUpperCase()}`;
                startNewGame();
            } else if (msg.dir) {
                // Discrete Directional Swipe / D-Pad
                handleDirection(msg.dir);
            } else if (msg.type === 'input' || (msg.x !== undefined && msg.y !== undefined)) {
                // Joystick angle to discrete direction
                const x = msg.x || 0;
                const y = msg.y || 0;
                if (Math.abs(x) > 0.4 || Math.abs(y) > 0.4) {
                    if (Math.abs(x) > Math.abs(y)) {
                        handleDirection(x > 0 ? 'RIGHT' : 'LEFT');
                    } else {
                        handleDirection(y > 0 ? 'DOWN' : 'UP');
                    }
                }
            } else if (msg.type === 'restart' && GameState.gameOver) {
                startNewGame();
            }
        } catch (err) {}
    };
}

function handleDirection(dir) {
    if (!GameState.running || GameState.gameOver) {
        startNewGame();
    }
    if (dir === 'UP') {
        GameState.bear.nextDirX = 0;
        GameState.bear.nextDirY = -1;
    } else if (dir === 'DOWN') {
        GameState.bear.nextDirX = 0;
        GameState.bear.nextDirY = 1;
    } else if (dir === 'LEFT') {
        GameState.bear.nextDirX = -1;
        GameState.bear.nextDirY = 0;
    } else if (dir === 'RIGHT') {
        GameState.bear.nextDirX = 1;
        GameState.bear.nextDirY = 0;
    }
}

// Keyboard controls fallback for desktop browser testing
window.addEventListener('keydown', (e) => {
    audio.init();
    const key = e.key.toLowerCase();
    
    // Auto-iniciar partida inmediatamente al presionar cualquier tecla direccional, espacio o enter
    if (['arrowup', 'w', 'arrowdown', 's', 'arrowleft', 'a', 'arrowright', 'd', 'enter', ' '].includes(key)) {
        if (!GameState.running || GameState.gameOver) {
            startNewGame();
        }
    }

    if (key === 'arrowup' || key === 'w') handleDirection('UP');
    if (key === 'arrowdown' || key === 's') handleDirection('DOWN');
    if (key === 'arrowleft' || key === 'a') handleDirection('LEFT');
    if (key === 'arrowright' || key === 'd') handleDirection('RIGHT');
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


// ==========================================
// 📐 AutoScale Multi-Stage Engine
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

window.addEventListener('DOMContentLoaded', () => {
    updateQrCode();
    autoScale();
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    if (audioToggleBtn) {
        audioToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!audio.ctx) audio.init();
            else audio.resume();
        });
    }
});

window.addEventListener('resize', autoScale);
window.addEventListener('load', () => {
    updateQrCode();
    autoScale();
});
if (document.fonts && document.fonts.ready) document.fonts.ready.then(autoScale);
if (window.ResizeObserver) new ResizeObserver(() => autoScale()).observe(document.body);
window.addEventListener('message', (e) => { if (e.data?.type === 'RESCALE') autoScale(); });
[0, 50, 150, 300, 600, 1200].forEach(d => setTimeout(autoScale, d));

// ==========================================
// 🚀 Initial Launch
// ==========================================
loadMaze();
loadRanking();
updateUI();
updateQrCode();
autoScale();
requestAnimationFrame(gameLoop);
connectSignaling();
