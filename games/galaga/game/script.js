// Galaga Retro Arcade - MyPlayAd
// Canvas base: 200 x 160 px, CRT Scanlines, WebRTC Host, Web Audio API Synthesizer

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
const qrContainer = document.getElementById('qrcode');
const iceRouteElement = document.getElementById('ice-route');

const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 160;

// ==========================================
// 🔊 Retro Arcade Web Audio API Synthesizer
// ==========================================
class GalagaAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
    }

    init() {
        if (!this.ctx) {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                this.ctx = new AudioCtx();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
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

    playLaser() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1400, t);
            osc.frequency.exponentialRampToValueAtTime(260, t + 0.08);
            gain.gain.setValueAtTime(0.28, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.08);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.08);
        } catch (e) {}
        broadcastSFX('laser');
    }

    playAlienHit() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(480, t);
            osc.frequency.linearRampToValueAtTime(160, t + 0.06);
            gain.gain.setValueAtTime(0.22, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.06);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.06);
        } catch (e) {}
        broadcastSFX('alienHit');
    }

    playBossDamage() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.linearRampToValueAtTime(1100, t + 0.07);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.07);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.07);
        } catch (e) {}
        broadcastSFX('bossHit');
    }

    playAlienExplosion() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, t);
            osc.frequency.linearRampToValueAtTime(30, t + 0.22);
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.22);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.22);
        } catch (e) {}
        broadcastSFX('alienKilled');
    }

    playDiveChirp() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(700, t);
            osc.frequency.linearRampToValueAtTime(450, t + 0.1);
            osc.frequency.linearRampToValueAtTime(600, t + 0.2);
            gain.gain.setValueAtTime(0.18, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.2);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.2);
        } catch (e) {}
    }

    playTractorBeam() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, t);
            osc.frequency.linearRampToValueAtTime(540, t + 0.15);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.15);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.15);
        } catch (e) {}
    }

    playPlayerExplosion() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(140, t);
            osc.frequency.linearRampToValueAtTime(20, t + 0.45);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.45);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.45);
        } catch (e) {}
        broadcastSFX('playerExplode');
    }

    playStageIntro() {
        if (!this.ctx) return;
        this.resume();
        const notes = [293.66, 369.99, 440, 587.33, 523.25, 659.25, 783.99];
        const t = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t + idx * 0.09);
            gain.gain.setValueAtTime(0.22, t + idx * 0.09);
            gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.09 + 0.12);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.09);
            osc.stop(t + idx * 0.09 + 0.13);
        });
    }

    playStageClear() {
        if (!this.ctx) return;
        this.resume();
        const notes = [440, 554.37, 659.25, 880, 1108.73];
        const t = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t + idx * 0.08);
            gain.gain.setValueAtTime(0.25, t + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.08 + 0.14);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.08);
            osc.stop(t + idx * 0.08 + 0.15);
        });
        broadcastSFX('waveClear');
    }

    playGameOver() {
        if (!this.ctx) return;
        this.resume();
        const notes = [440, 392, 349.23, 329.63, 293.66, 220];
        const t = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t + idx * 0.15);
            gain.gain.setValueAtTime(0.28, t + idx * 0.15);
            gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.15 + 0.18);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.15);
            osc.stop(t + idx * 0.15 + 0.2);
        });
        broadcastSFX('gameover');
    }
}
const audio = new GalagaAudio();

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

// ==========================================
// 🌌 Galaga Game State & Entities
// ==========================================
const PLAYER_WIDTH = 15;
const PLAYER_HEIGHT = 13;
const PLAYER_SPEED = 240;
const MAX_PLAYER_BULLETS = 16; // Permite disparos rápidos continuos sin bloquear los toques rápidos

const GameState = {
    running: false,
    gameOver: false,
    paused: false,
    score: 0,
    highScore: 0,
    lives: 3,
    stage: 1,
    stageIntroTimer: 0,
    stageClearTimer: 0,
    currentNickname: 'Player',
    roomId: Math.random().toString(36).substring(2, 6).toUpperCase(),
    lastTime: 0,
    
    // Player
    player: {
        x: (CANVAS_WIDTH - 15) / 2,
        y: CANVAS_HEIGHT - 17,
        dx: 0,
        bankAngle: 0,
        invulnerableTimer: 0,
        isCaptured: false,
        captureProgress: 0,
        captureRotation: 0,
        fireCooldown: 0,
        muzzleFlashTimer: 0
    },
    
    // Bullets & Objects
    bullets: [],       // Player torpedoes
    alienBullets: [],  // Alien red pulses
    aliens: [],        // Galaga swarm
    explosions: [],    // Particle explosions & shockwaves
    scorePopups: [],   // Floating score indicators (+160, +400, etc.)
    stars: [],         // Multi-depth parallax starfield
    
    // Wave & Visual FX state
    formationSway: 0,
    formationTimer: 0,
    nextDiveTimer: 2.0,
    wingAnimFlip: false,
    animTimer: 0,
    animTimerTotal: 0,
    animFrame: 0,
    screenShake: 0,
    
    // Active Tractor Beam from a Boss
    tractorBeam: null // { bossId, x, y, width, timer, state: 'expanding'|'holding'|'closing' }
};

// 🌌 High-Fidelity 3-Tier Parallax Starfield Generator
function initStarfield(count = 75) {
    const stars = [];
    const colorsTier1 = ['#3a0ca3', '#4361ee', '#7209b7', '#0077b6', '#3f37c9', '#4cc9f0'];
    const colorsTier2 = ['#00f5d4', '#ffb703', '#3dff8a', '#ff4d6d', '#ffffff', '#ffd166'];
    const colorsTier3 = ['#ffffff', '#fff382', '#e0fbfc'];
    
    // Tier 1: Distant Deep Cosmos (35 stars, slow, subtle, tiny)
    for (let i = 0; i < 35; i++) {
        stars.push({
            tier: 1,
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            speed: 0.25 + Math.random() * 0.2,
            size: 1,
            color: colorsTier1[Math.floor(Math.random() * colorsTier1.length)],
            alpha: 0.35 + Math.random() * 0.3,
            twinkleSpeed: 1.0 + Math.random() * 2.0
        });
    }
    // Tier 2: Midfield Nebula (25 stars, medium speed, color-twinkle)
    for (let i = 0; i < 25; i++) {
        stars.push({
            tier: 2,
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            speed: 0.8 + Math.random() * 0.4,
            size: 1,
            color: colorsTier2[Math.floor(Math.random() * colorsTier2.length)],
            alpha: 0.7 + Math.random() * 0.3,
            twinkleSpeed: 2.0 + Math.random() * 3.0
        });
    }
    // Tier 3: Foreground Hyperspace (15 stars, bright, fast, cross-glimmer)
    for (let i = 0; i < 15; i++) {
        stars.push({
            tier: 3,
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            speed: 1.8 + Math.random() * 0.6,
            size: 2,
            color: colorsTier3[Math.floor(Math.random() * colorsTier3.length)],
            alpha: 0.95,
            twinkleSpeed: 3.5 + Math.random() * 3.0
        });
    }
    return stars;
}

// Build Swarm Formation Grid (40 enemies)
function createSwarmFormation(stage = 1) {
    const aliens = [];
    let idCounter = 1;
    
    // Row 0: 4 Boss Galagas (Cols 3, 4, 5, 6)
    for (let c = 3; c <= 6; c++) {
        const colX = 20 + c * 16;
        const rowY = 18;
        aliens.push({
            id: idCounter++,
            type: 'boss',
            col: c,
            row: 0,
            homeX: colX,
            homeY: rowY,
            x: colX,
            y: -20, // starts offscreen for swoop in
            width: 12,
            height: 10,
            hp: 2,
            maxHp: 2,
            pointsFormation: 150,
            pointsDive: 400,
            state: 'entering', // 'entering', 'formation', 'diving', 'returning', 'beaming'
            pathProgress: 0,
            path: generateEntrancePath(c, 0, (c - 3) * 0.18 + 0.6),
            diveSpeed: 90 + stage * 6,
            angle: 0
        });
    }

    // Rows 1 & 2: Red Butterflies (Goei) (Cols 1 to 8, 8 per row = 16)
    for (let r = 1; r <= 2; r++) {
        for (let c = 1; c <= 8; c++) {
            const colX = 20 + c * 16;
            const rowY = 18 + r * 10;
            aliens.push({
                id: idCounter++,
                type: 'butterfly',
                col: c,
                row: r,
                homeX: colX,
                homeY: rowY,
                x: colX,
                y: -20,
                width: 11,
                height: 9,
                hp: 1,
                maxHp: 1,
                pointsFormation: 80,
                pointsDive: 160,
                state: 'entering',
                pathProgress: 0,
                path: generateEntrancePath(c, r, (r === 1 ? c * 0.1 : (9 - c) * 0.1) + 0.3),
                diveSpeed: 95 + stage * 7,
                angle: 0
            });
        }
    }

    // Rows 3 & 4: Blue Bees (Zako) (Cols 0 to 9, 10 per row = 20)
    for (let r = 3; r <= 4; r++) {
        for (let c = 0; c <= 9; c++) {
            const colX = 20 + c * 16;
            const rowY = 18 + r * 10;
            aliens.push({
                id: idCounter++,
                type: 'bee',
                col: c,
                row: r,
                homeX: colX,
                homeY: rowY,
                x: colX,
                y: -20,
                width: 10,
                height: 9,
                hp: 1,
                maxHp: 1,
                pointsFormation: 50,
                pointsDive: 100,
                state: 'entering',
                pathProgress: 0,
                path: generateEntrancePath(c, r, (c % 2 === 0 ? c * 0.08 : (10 - c) * 0.08)),
                diveSpeed: 100 + stage * 8,
                angle: 0
            });
        }
    }

    return aliens;
}

// Generate parametric entrance swoop curves
function generateEntrancePath(col, row, delay = 0) {
    const isLeft = col < 5;
    const startX = isLeft ? -15 : CANVAS_WIDTH + 15;
    const startY = 40 + (row * 15);
    const loopCenterX = isLeft ? 60 : 140;
    const loopCenterY = 90;
    
    return {
        delay: delay,
        startX: startX,
        startY: startY,
        loopX: loopCenterX,
        loopY: loopCenterY,
        duration: 2.2
    };
}

// ==========================================
// 🚀 Game Setup & Reset
// ==========================================
function startNewGame() {
    GameState.score = 0;
    GameState.lives = 3;
    GameState.stage = 1;
    GameState.gameOver = false;
    GameState.running = true;
    GameState.bullets = [];
    GameState.alienBullets = [];
    GameState.explosions = [];
    GameState.scorePopups = [];
    GameState.tractorBeam = null;
    
    resetPlayerPosition();
    startStage(1);
    
    gameOverOverlay.classList.add('hidden');
    waitingOverlay.classList.add('hidden');
    updateUI();
}

function startStage(stageNum) {
    GameState.stage = stageNum;
    GameState.stageIntroTimer = 2.0; // 2 seconds "STAGE X" banner
    GameState.stageClearTimer = 0;
    GameState.aliens = createSwarmFormation(stageNum);
    GameState.bullets = [];
    GameState.alienBullets = [];
    GameState.tractorBeam = null;
    GameState.nextDiveTimer = 2.5;
    
    audio.playStageIntro();
}

function resetPlayerPosition() {
    GameState.player.x = (CANVAS_WIDTH - PLAYER_WIDTH) / 2;
    GameState.player.y = CANVAS_HEIGHT - 17;
    GameState.player.dx = 0;
    GameState.player.bankAngle = 0;
    GameState.player.invulnerableTimer = 1.8;
    GameState.player.isCaptured = false;
    GameState.player.captureProgress = 0;
    GameState.player.captureRotation = 0;
    GameState.player.muzzleFlashTimer = 0;
}

// ==========================================
// 🕹️ Input & Update Loop
// ==========================================
function handleInput(dt) {
    if (!GameState.running || GameState.gameOver || GameState.player.isCaptured) return;
    
    GameState.player.x += GameState.player.dx * dt;
    if (GameState.player.x < 2) GameState.player.x = 2;
    if (GameState.player.x + PLAYER_WIDTH > CANVAS_WIDTH - 2) {
        GameState.player.x = CANVAS_WIDTH - 2 - PLAYER_WIDTH;
    }

    if (GameState.player.fireCooldown > 0) {
        GameState.player.fireCooldown -= dt;
    }
}

function shootTorpedo() {
    if (!GameState.running || GameState.gameOver || GameState.player.isCaptured) return;
    if (GameState.bullets.length >= MAX_PLAYER_BULLETS) return;
    if (GameState.player.fireCooldown > 0) return;

    // Enfriamiento ultra-rápido (40ms): la nave dispara tan rápido como el usuario toque el botón
    GameState.player.fireCooldown = 0.04;
    GameState.player.muzzleFlashTimer = 0.08;
    audio.playLaser();

    // Twin Torpedoes launched from wing cannons
    const pX = GameState.player.x;
    const pY = GameState.player.y;
    GameState.bullets.push({
        x: pX + 1,
        y: pY - 2,
        w: 2,
        h: 6,
        speed: 380
    });
    GameState.bullets.push({
        x: pX + PLAYER_WIDTH - 3,
        y: pY - 2,
        w: 2,
        h: 6,
        speed: 380
    });
}

// Update aliens, dives, swoops, bullets, collisions
function updateGame(dt) {
    // Parallax Starfield with hyperspace warp during stage intro
    const isWarp = GameState.stageIntroTimer > 0;
    const starSpeedMultiplier = isWarp ? 4.5 : 1.0;
    GameState.stars.forEach(star => {
        star.y += star.speed * starSpeedMultiplier * (dt * 60);
        if (star.y > CANVAS_HEIGHT) {
            star.y = 0;
            star.x = Math.random() * CANVAS_WIDTH;
        }
    });

    if (GameState.stageIntroTimer > 0) {
        GameState.stageIntroTimer -= dt;
    }

    // Screen Shake decay
    if (GameState.screenShake > 0) {
        GameState.screenShake -= dt * 1.6;
        if (GameState.screenShake < 0) GameState.screenShake = 0;
    }

    // Player bank angle interpolation
    const targetBank = GameState.player.dx < -10 ? -0.16 : (GameState.player.dx > 10 ? 0.16 : 0);
    GameState.player.bankAngle += (targetBank - GameState.player.bankAngle) * Math.min(1, dt * 18);

    // Muzzle flash timer decay
    if (GameState.player.muzzleFlashTimer > 0) {
        GameState.player.muzzleFlashTimer -= dt;
    }

    // 4-phase wing flapping & pulsing animation
    GameState.animTimerTotal += dt;
    GameState.animFrame = Math.floor((GameState.animTimerTotal * 8) % 4);
    GameState.animTimer += dt;
    if (GameState.animTimer > 0.22) {
        GameState.animTimer = 0;
        GameState.wingAnimFlip = !GameState.wingAnimFlip;
    }

    // Formation swaying
    GameState.formationTimer += dt * 2.2;
    GameState.formationSway = Math.sin(GameState.formationTimer) * 10;

    // Player invulnerability flash
    if (GameState.player.invulnerableTimer > 0) {
        GameState.player.invulnerableTimer -= dt;
    }

    handleInput(dt);

    // Update Player Bullets
    for (let i = GameState.bullets.length - 1; i >= 0; i--) {
        const b = GameState.bullets[i];
        b.y -= b.speed * dt;
        if (b.y < -10) {
            GameState.bullets.splice(i, 1);
        }
    }

    // Update Alien Bullets
    for (let i = GameState.alienBullets.length - 1; i >= 0; i--) {
        const ab = GameState.alienBullets[i];
        ab.x += ab.vx * dt;
        ab.y += ab.vy * dt;

        // Player Collision
        if (!GameState.player.isCaptured && GameState.player.invulnerableTimer <= 0) {
            if (ab.x > GameState.player.x && ab.x < GameState.player.x + PLAYER_WIDTH &&
                ab.y > GameState.player.y && ab.y < GameState.player.y + PLAYER_HEIGHT) {
                killPlayer();
                GameState.alienBullets.splice(i, 1);
                continue;
            }
        }

        if (ab.y > CANVAS_HEIGHT + 10 || ab.x < -10 || ab.x > CANVAS_WIDTH + 10) {
            GameState.alienBullets.splice(i, 1);
        }
    }

    // Update Aliens
    let inFormationCount = 0;
    GameState.aliens.forEach(alien => {
        if (alien.state === 'entering') {
            updateAlienEntering(alien, dt);
        } else if (alien.state === 'formation') {
            inFormationCount++;
            alien.x = alien.homeX + GameState.formationSway;
            alien.y = alien.homeY;
        } else if (alien.state === 'diving') {
            updateAlienDiving(alien, dt);
        } else if (alien.state === 'beaming') {
            updateAlienBeaming(alien, dt);
        } else if (alien.state === 'returning') {
            updateAlienReturning(alien, dt);
        }
    });

    // Handle Dive Attacks
    if (GameState.running && !GameState.gameOver && GameState.stageIntroTimer <= 0) {
        GameState.nextDiveTimer -= dt;
        if (GameState.nextDiveTimer <= 0) {
            triggerDiveAttack();
            // Faster dive rate on higher stages
            GameState.nextDiveTimer = Math.max(1.0, 2.8 - GameState.stage * 0.25) + Math.random() * 0.6;
        }
    }

    // Check Tractor Beam
    if (GameState.tractorBeam) {
        updateTractorBeam(dt);
    }

    // Collisions: Player Bullets vs Aliens
    checkBulletAlienCollisions();

    // Collisions: Diving Aliens vs Player Ship
    checkAlienPlayerCollisions();

    // Update Explosions
    for (let i = GameState.explosions.length - 1; i >= 0; i--) {
        const exp = GameState.explosions[i];
        exp.timer += dt;
        exp.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * 2.5;
        });
        if (exp.timer > 0.45) {
            GameState.explosions.splice(i, 1);
        }
    }

    // Update Floating Score Popups
    for (let i = GameState.scorePopups.length - 1; i >= 0; i--) {
        const sp = GameState.scorePopups[i];
        sp.y -= 18 * dt;
        sp.timer -= dt;
        if (sp.timer <= 0) {
            GameState.scorePopups.splice(i, 1);
        }
    }

    // Check Stage Clear
    if (GameState.aliens.length === 0 && GameState.running && !GameState.gameOver) {
        if (GameState.stageClearTimer === 0) {
            audio.playStageClear();
            GameState.score += 1000; // Stage bonus
            updateUI();
        }
        GameState.stageClearTimer += dt;
        if (GameState.stageClearTimer > 2.5) {
            startStage(GameState.stage + 1);
        }
    }
}

// Alien Entrance Animation via Parametric Curves
function updateAlienEntering(alien, dt) {
    alien.path.delay -= dt;
    if (alien.path.delay > 0) return;

    alien.pathProgress += dt / alien.path.duration;
    if (alien.pathProgress >= 1) {
        alien.state = 'formation';
        alien.x = alien.homeX;
        alien.y = alien.homeY;
        alien.angle = 0;
        return;
    }

    const t = alien.pathProgress;
    // Cubic bezier from entry to loop to slot
    const p0 = { x: alien.path.startX, y: alien.path.startY };
    const p1 = { x: alien.path.loopX, y: alien.path.loopY };
    const p2 = { x: alien.homeX + (alien.col < 5 ? -40 : 40), y: 120 };
    const p3 = { x: alien.homeX + GameState.formationSway, y: alien.homeY };

    // Bezier interpolation
    const cx = (1 - t) ** 3 * p0.x + 3 * (1 - t) ** 2 * t * p1.x + 3 * (1 - t) * t ** 2 * p2.x + t ** 3 * p3.x;
    const cy = (1 - t) ** 3 * p0.y + 3 * (1 - t) ** 2 * t * p1.y + 3 * (1 - t) * t ** 2 * p2.y + t ** 3 * p3.y;

    // Calculate rotation angle facing motion path
    const vx = cx - alien.x;
    const vy = cy - alien.y;
    if (Math.hypot(vx, vy) > 0.1) {
        alien.angle = Math.atan2(vx, -vy);
    }

    alien.x = cx;
    alien.y = cy;
}

// Trigger dive attack (single or Boss with escort)
function triggerDiveAttack() {
    const formationAliens = GameState.aliens.filter(a => a.state === 'formation');
    if (formationAliens.length === 0) return;

    // Favor Boss dive with escorts if bosses are available
    const bosses = formationAliens.filter(a => a.type === 'boss');
    const shouldBossDive = bosses.length > 0 && Math.random() < 0.35;

    if (shouldBossDive) {
        const boss = bosses[Math.floor(Math.random() * bosses.length)];
        launchDive(boss, true);
        
        // Find 1-2 butterflies to escort
        const butterflies = formationAliens.filter(a => a.type === 'butterfly');
        const escortCount = Math.min(butterflies.length, Math.random() > 0.5 ? 2 : 1);
        for (let i = 0; i < escortCount; i++) {
            launchDive(butterflies[i], false, boss);
        }
    } else {
        // Normal dive: 1 to 2 bees or butterflies
        const target = formationAliens[Math.floor(Math.random() * formationAliens.length)];
        launchDive(target, false);
    }

    audio.playDiveChirp();
}

function launchDive(alien, isBoss = false, leader = null) {
    alien.state = 'diving';
    alien.diveStartTime = performance.now();
    alien.startX = alien.x;
    alien.startY = alien.y;
    alien.targetX = GameState.player.x + (leader ? (alien.col % 2 === 0 ? -14 : 14) : 0);
    alien.hasShot = false;
    alien.loopT = 0;
    alien.canBeam = isBoss && Math.random() < 0.45 && !GameState.tractorBeam;
    alien.angle = Math.PI; // Face downward when dive starts
}

function updateAlienDiving(alien, dt) {
    alien.loopT += dt * 0.9;
    
    // Check if Boss decides to activate Tractor Beam mid-dive
    if (alien.canBeam && alien.y > 65 && alien.y < 85 && !GameState.tractorBeam) {
        startTractorBeam(alien);
        return;
    }

    const prevX = alien.x;
    const prevY = alien.y;

    // Curved swoop towards target X and down
    alien.y += alien.diveSpeed * dt;
    const dx = (alien.targetX - alien.x) * dt * 2.5;
    alien.x += dx;

    // 360-degree rotational angle facing flight heading
    const vx = alien.x - prevX;
    const vy = alien.y - prevY;
    if (Math.hypot(vx, vy) > 0.05) {
        alien.angle = Math.atan2(vx, -vy);
    }

    // Alien fire during dive
    if (!alien.hasShot && alien.y > 50 && alien.y < 110) {
        if (Math.random() < 0.75 + GameState.stage * 0.05) {
            fireAlienBullet(alien);
            alien.hasShot = true;
        }
    }

    // Passed bottom: loop back from top
    if (alien.y > CANVAS_HEIGHT + 15) {
        alien.y = -15;
        alien.state = 'returning';
    }
}

function updateAlienReturning(alien, dt) {
    const targetX = alien.homeX + GameState.formationSway;
    const targetY = alien.homeY;
    
    const dx = targetX - alien.x;
    const dy = targetY - alien.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 4) {
        alien.x = targetX;
        alien.y = targetY;
        alien.state = 'formation';
        alien.angle = 0;
    } else {
        const stepX = (dx / dist) * (alien.diveSpeed * 0.9) * dt;
        const stepY = (dy / dist) * (alien.diveSpeed * 0.9) * dt;
        alien.x += stepX;
        alien.y += stepY;
        alien.angle = Math.atan2(stepX, -stepY);
    }
}

function fireAlienBullet(alien) {
    const angle = Math.atan2(GameState.player.y - alien.y, GameState.player.x - alien.x);
    const speed = 100 + GameState.stage * 10;
    GameState.alienBullets.push({
        x: alien.x + alien.width / 2,
        y: alien.y + alien.height,
        vx: Math.cos(angle) * speed * 0.6,
        vy: Math.sin(angle) * speed,
        w: 2,
        h: 4
    });
}

// ==========================================
// 🌀 Tractor Beam Mechanics
// ==========================================
function startTractorBeam(boss) {
    boss.state = 'beaming';
    GameState.tractorBeam = {
        boss: boss,
        x: boss.x + boss.width / 2,
        y: boss.y + boss.height,
        bottomY: CANVAS_HEIGHT,
        width: 0,
        maxWidth: 28,
        timer: 3.5,
        state: 'opening'
    };
    audio.playTractorBeam();
}

function updateAlienBeaming(boss, dt) {
    // Boss hovers in place during tractor beam
    if (!GameState.tractorBeam) {
        boss.state = 'diving';
    }
}

function updateTractorBeam(dt) {
    const tb = GameState.tractorBeam;
    if (!tb.boss || !GameState.aliens.includes(tb.boss)) {
        GameState.tractorBeam = null;
        return;
    }

    tb.x = tb.boss.x + tb.boss.width / 2;
    tb.y = tb.boss.y + tb.boss.height;

    if (tb.state === 'opening') {
        tb.width += 40 * dt;
        if (tb.width >= tb.maxWidth) {
            tb.width = tb.maxWidth;
            tb.state = 'holding';
        }
    } else if (tb.state === 'holding') {
        tb.timer -= dt;
        // Check if player is caught in the beam cone
        const pX = GameState.player.x + PLAYER_WIDTH / 2;
        const pY = GameState.player.y;
        if (!GameState.player.isCaptured && GameState.player.invulnerableTimer <= 0) {
            const beamLeftAtPlayer = tb.x - (tb.width * ((pY - tb.y) / (CANVAS_HEIGHT - tb.y)));
            const beamRightAtPlayer = tb.x + (tb.width * ((pY - tb.y) / (CANVAS_HEIGHT - tb.y)));
            if (pX >= beamLeftAtPlayer && pX <= beamRightAtPlayer) {
                capturePlayer(tb.boss);
            }
        }
        if (tb.timer <= 0) {
            tb.state = 'closing';
        }
    } else if (tb.state === 'closing') {
        tb.width -= 50 * dt;
        if (tb.width <= 0) {
            tb.boss.state = 'diving';
            GameState.tractorBeam = null;
        }
    }
}

function capturePlayer(boss) {
    GameState.player.isCaptured = true;
    audio.playPlayerExplosion();
    addExplosion(GameState.player.x + PLAYER_WIDTH / 2, GameState.player.y + PLAYER_HEIGHT / 2, true);
    
    setTimeout(() => {
        GameState.lives--;
        updateUI();
        if (GameState.lives <= 0) {
            endGame();
        } else {
            resetPlayerPosition();
        }
        if (GameState.tractorBeam) {
            GameState.tractorBeam = null;
            boss.state = 'diving';
        }
    }, 1200);
}

// ==========================================
// 💥 Collisions & Score
// ==========================================
function checkBulletAlienCollisions() {
    for (let bi = GameState.bullets.length - 1; bi >= 0; bi--) {
        const b = GameState.bullets[bi];
        let bulletRemoved = false;

        for (let ai = GameState.aliens.length - 1; ai >= 0; ai--) {
            const alien = GameState.aliens[ai];

            if (b.x + b.w > alien.x && b.x < alien.x + alien.width &&
                b.y + b.h > alien.y && b.y < alien.y + alien.height) {
                
                bulletRemoved = true;
                alien.hp--;

                if (alien.hp <= 0) {
                    // Destroyed!
                    const isDiving = alien.state === 'diving' || alien.state === 'beaming';
                    let points = isDiving ? alien.pointsDive : alien.pointsFormation;

                    if (alien.state === 'beaming') points = 1000; // Huge bonus for saving from beam!

                    GameState.score += points;
                    if (GameState.score > GameState.highScore) {
                        GameState.highScore = GameState.score;
                    }

                    audio.playAlienExplosion();
                    addExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, alien.type === 'boss');
                    
                    if (isDiving) {
                        addScorePopup(alien.x, alien.y, points);
                    }

                    if (GameState.tractorBeam && GameState.tractorBeam.boss === alien) {
                        GameState.tractorBeam = null;
                    }

                    GameState.aliens.splice(ai, 1);
                    updateUI();
                } else {
                    // Damaged Boss Galaga (turns blue)
                    audio.playBossDamage();
                    addExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, false);
                }
                break;
            }
        }

        if (bulletRemoved) {
            GameState.bullets.splice(bi, 1);
        }
    }
}

function checkAlienPlayerCollisions() {
    if (!GameState.running || GameState.gameOver || GameState.player.isCaptured || GameState.player.invulnerableTimer > 0) return;

    const p = GameState.player;
    for (let i = GameState.aliens.length - 1; i >= 0; i--) {
        const alien = GameState.aliens[i];
        if (alien.state === 'diving' || alien.state === 'beaming') {
            if (p.x + PLAYER_WIDTH > alien.x && p.x < alien.x + alien.width &&
                p.y + PLAYER_HEIGHT > alien.y && p.y < alien.y + alien.height) {
                
                // Kamikaze crash!
                addExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, alien.type === 'boss');
                GameState.aliens.splice(i, 1);
                killPlayer();
                break;
            }
        }
    }
}

function killPlayer() {
    audio.playPlayerExplosion();
    addExplosion(GameState.player.x + PLAYER_WIDTH / 2, GameState.player.y + PLAYER_HEIGHT / 2, true);
    GameState.lives--;
    updateUI();

    if (GameState.lives <= 0) {
        endGame();
    } else {
        resetPlayerPosition();
    }
}

function addExplosion(x, y, isBoss = false) {
    const colors = isBoss 
        ? ['#ffffff', '#ffea00', '#ff0055', '#00f3ff', '#ff7700'] 
        : ['#ffffff', '#ffea00', '#ff3344', '#ff7700'];
    const pCount = isBoss ? 28 : 16;
    const particles = [];

    for (let i = 0; i < pCount; i++) {
        const angle = (Math.PI * 2 / pCount) * i + (Math.random() - 0.5) * 0.3;
        const spd = (isBoss ? 45 : 30) + Math.random() * 55;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: colors[i % colors.length],
            life: 1.0,
            size: Math.random() > 0.4 ? 2 : 1
        });
    }

    GameState.explosions.push({
        timer: 0,
        maxTime: isBoss ? 0.55 : 0.42,
        isBoss: isBoss,
        cx: x,
        cy: y,
        particles
    });

    // Screen shake trigger on kill
    GameState.screenShake = isBoss ? 0.22 : 0.08;
}

function drawExplosionFX(exp) {
    const progress = exp.timer / exp.maxTime;

    // Expanding shockwave ring
    if (progress < 0.65) {
        const ringRadius = progress * (exp.isBoss ? 26 : 16);
        ctx.save();
        ctx.beginPath();
        ctx.arc(exp.cx, exp.cy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = exp.isBoss ? '#00f3ff' : '#ffea00';
        ctx.globalAlpha = 1.0 - progress / 0.65;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    // Flash core during first 0.08s
    if (exp.timer < 0.08) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(exp.cx - 3, exp.cy - 3, 6, 6);
    }

    // Particle debris
    exp.particles.forEach(p => {
        if (p.life > 0) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        }
    });
    ctx.globalAlpha = 1.0;
}

function addScorePopup(x, y, points) {
    GameState.scorePopups.push({
        x: x,
        y: y,
        text: `+${points}`,
        timer: 0.85
    });
}

// ==========================================
// 🎨 Rendering
// ==========================================
function render() {
    ctx.save();

    // Screen Shake Offset
    if (GameState.screenShake > 0) {
        const shakeMag = GameState.screenShake * 8;
        const sx = (Math.random() - 0.5) * shakeMag;
        const sy = (Math.random() - 0.5) * shakeMag;
        ctx.translate(sx, sy);
    }

    // 0. Space Vacuum Background
    ctx.fillStyle = '#040705';
    ctx.fillRect(-4, -4, CANVAS_WIDTH + 8, CANVAS_HEIGHT + 8);

    // 1. Deep Space Multi-Layer Starfield
    const isWarp = GameState.stageIntroTimer > 0;
    GameState.stars.forEach(star => {
        const twinkle = Math.sin(performance.now() * 0.003 * star.twinkleSpeed) * 0.3;
        const alpha = Math.max(0.15, Math.min(1.0, star.alpha + twinkle));
        ctx.fillStyle = star.color;
        ctx.globalAlpha = alpha;

        if (isWarp) {
            // Warp speed streaks
            const streakLen = star.tier * 4 + 3;
            ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, streakLen);
        } else {
            ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
            // 4-point cross-glimmer for bright foreground stars
            if (star.tier === 3 && alpha > 0.8) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillRect(Math.floor(star.x) - 1, Math.floor(star.y), 3, 1);
                ctx.fillRect(Math.floor(star.x), Math.floor(star.y) - 1, 1, 3);
            }
        }
    });
    ctx.globalAlpha = 1.0;

    // 2. Tractor Beam Visual FX
    if (GameState.tractorBeam) {
        drawTractorBeamFX(GameState.tractorBeam);
    }

    // 3. Swarm Aliens (with rotational banking)
    GameState.aliens.forEach(alien => {
        drawAlien(alien);
    });

    // 4. Player Twin Torpedoes
    GameState.bullets.forEach(b => {
        // Plasma tail glow
        ctx.fillStyle = 'rgba(255, 60, 0, 0.4)';
        ctx.fillRect(b.x - 1, b.y + 2, b.w + 2, b.h);

        // Torpedo missile body (Red-Yellow gradient)
        ctx.fillStyle = '#ff2a4b';
        ctx.fillRect(b.x, b.y + 2, b.w, b.h - 2);
        ctx.fillStyle = '#ffea00';
        ctx.fillRect(b.x, b.y + 1, b.w, 2);

        // White-hot warhead tip
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(b.x, b.y, b.w, 1);
    });

    // 5. Alien Energy Bullets
    GameState.alienBullets.forEach(ab => {
        // Red plasma aura
        ctx.fillStyle = 'rgba(255, 40, 60, 0.35)';
        ctx.fillRect(ab.x - 1, ab.y - 1, ab.w + 2, ab.h + 2);

        // Orange body
        ctx.fillStyle = '#ff3344';
        ctx.fillRect(ab.x, ab.y, ab.w, ab.h);

        // White energy core
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ab.x, ab.y + 1, 1, ab.h - 2);
    });

    // 6. Player Fighter
    if (GameState.running && !GameState.player.isCaptured) {
        drawPlayerShip(GameState.player.x, GameState.player.y);
    }

    // 7. Explosions & Shockwaves
    GameState.explosions.forEach(exp => {
        drawExplosionFX(exp);
    });

    // 8. Floating Score Popups
    GameState.scorePopups.forEach(sp => {
        ctx.font = '8px "Press Start 2P", monospace';
        // Black drop shadow
        ctx.fillStyle = '#000000';
        ctx.fillText(sp.text, sp.x - 3, sp.y + 1);
        // Yellow retro text
        ctx.fillStyle = '#ffea00';
        ctx.fillText(sp.text, sp.x - 4, sp.y);
    });

    // 9. Stage Intro Text
    if (GameState.stageIntroTimer > 0) {
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(`STAGE ${GameState.stage}`, CANVAS_WIDTH / 2 + 1, CANVAS_HEIGHT / 2 - 9);
        ctx.fillStyle = '#3dff8a';
        ctx.fillText(`STAGE ${GameState.stage}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

        ctx.fillStyle = '#000000';
        ctx.fillText('READY', CANVAS_WIDTH / 2 + 1, CANVAS_HEIGHT / 2 + 9);
        ctx.fillStyle = '#ffb703';
        ctx.fillText('READY', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 8);
        ctx.textAlign = 'start';
    }

    // 10. Stage Clear Text
    if (GameState.stageClearTimer > 0) {
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        ctx.fillText('STAGE CLEAR!', CANVAS_WIDTH / 2 + 1, CANVAS_HEIGHT / 2 - 5);
        ctx.fillStyle = '#00f3ff';
        ctx.fillText('STAGE CLEAR!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 6);

        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = '#000000';
        ctx.fillText('+1000 BONUS', CANVAS_WIDTH / 2 + 1, CANVAS_HEIGHT / 2 + 13);
        ctx.fillStyle = '#ffea00';
        ctx.fillText('+1000 BONUS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 12);
        ctx.textAlign = 'start';
    }

    ctx.restore();
}

// 🌀 Authentic Galaga Tractor Beam Visual FX
function drawTractorBeamFX(tb) {
    ctx.save();
    const topY = tb.y;
    const botY = tb.bottomY;
    const halfW = tb.width;

    // Volumetric gradient cone
    const grad = ctx.createLinearGradient(tb.x, topY, tb.x, botY);
    grad.addColorStop(0, 'rgba(0, 243, 255, 0.35)');
    grad.addColorStop(0.5, 'rgba(61, 255, 138, 0.22)');
    grad.addColorStop(1, 'rgba(0, 180, 216, 0.12)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(tb.x - 3, topY);
    ctx.lineTo(tb.x + 3, topY);
    ctx.lineTo(tb.x + halfW, botY);
    ctx.lineTo(tb.x - halfW, botY);
    ctx.closePath();
    ctx.fill();

    // Glowing border beams
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tb.x - 3, topY);
    ctx.lineTo(tb.x - halfW, botY);
    ctx.moveTo(tb.x + 3, topY);
    ctx.lineTo(tb.x + halfW, botY);
    ctx.stroke();

    // Cascading downward concentric laser rings
    const ringSpacing = 12;
    const scrollOffset = (performance.now() * 0.04) % ringSpacing;
    for (let ry = topY + 6 + scrollOffset; ry < botY; ry += ringSpacing) {
        const progress = (ry - topY) / (botY - topY);
        const w = Math.max(4, halfW * progress);
        ctx.beginPath();
        ctx.ellipse(tb.x, ry, w, 2.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 200, ${0.45 + Math.sin(ry * 0.1) * 0.3})`;
        ctx.stroke();
    }

    // Upward rising quantum tractor dust particles
    const particleTime = performance.now() * 0.05;
    for (let i = 0; i < 6; i++) {
        const py = botY - ((particleTime + i * 22) % (botY - topY));
        const progress = (py - topY) / (botY - topY);
        const px = tb.x + Math.sin(py * 0.2 + i) * (halfW * progress * 0.6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.floor(px), Math.floor(py), 1.5, 1.5);
    }

    ctx.restore();
}

// 🚀 Pixel Art Drawing: Iconic Galaga Fighter Ship (15x13)
function drawPlayerShip(x, y) {
    const cx = Math.floor(x + 7.5);
    const cy = Math.floor(y + 6.5);

    // Blinking if invulnerable
    if (GameState.player.invulnerableTimer > 0) {
        if (Math.floor(GameState.player.invulnerableTimer * 12) % 2 === 0) return;
    }

    ctx.save();
    ctx.translate(cx, cy);

    // Banking rotation when dodging left/right
    ctx.rotate(GameState.player.bankAngle || 0);

    // Trailing Engine Thruster Flames (animated & responsive)
    const flameFlicker = Math.sin(performance.now() * 0.04) * 1.5;
    const isAccelerating = Math.abs(GameState.player.dx) > 10;
    const flameLen = isAccelerating ? (4 + flameFlicker) : (2.5 + flameFlicker * 0.6);

    // Left Thruster Flame (at x: -3)
    ctx.fillStyle = '#ff3300';
    ctx.fillRect(-3, 6, 2, flameLen + 1);
    ctx.fillStyle = '#ffea00';
    ctx.fillRect(-3, 6, 2, flameLen - 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, 6, 1, 2);

    // Right Thruster Flame (at x: 2)
    ctx.fillStyle = '#ff3300';
    ctx.fillRect(2, 6, 2, flameLen + 1);
    ctx.fillStyle = '#ffea00';
    ctx.fillRect(2, 6, 2, flameLen - 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, 6, 1, 2);

    // Outer Blue Stabilizer Wings
    ctx.fillStyle = '#0055d4';
    ctx.fillRect(-7, 0, 2, 6);
    ctx.fillRect(5, 0, 2, 6);
    ctx.fillStyle = '#0033aa';
    ctx.fillRect(-6, 2, 2, 4);
    ctx.fillRect(4, 2, 2, 4);

    // Wingtip Missile Tips (Red Needles)
    ctx.fillStyle = '#ff2a4b';
    ctx.fillRect(-6, -2, 1, 3);
    ctx.fillRect(5, -2, 1, 3);

    // Main White Hull & Swept Wings
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, 0, 8, 6);
    ctx.fillRect(-2, -4, 4, 5);
    ctx.fillRect(-1, -6, 2, 3);

    // Hull Shading
    ctx.fillStyle = '#b0c4de';
    ctx.fillRect(-4, 4, 8, 2);

    // Crimson Fuselage Stripes
    ctx.fillStyle = '#e63946';
    ctx.fillRect(-3, 1, 1, 4);
    ctx.fillRect(2, 1, 1, 4);
    ctx.fillRect(-1, -6, 2, 1); // nose tip red

    // Cockpit Canopy (Glass with Cyan Reflection)
    ctx.fillStyle = '#00f5d4';
    ctx.fillRect(-1, -3, 2, 3);
    ctx.fillStyle = '#0077b6';
    ctx.fillRect(0, -2, 1, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -3, 1, 1); // glint

    // Muzzle Flash Effect (Twin wing cannons)
    if (GameState.player.muzzleFlashTimer > 0) {
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(-7, -4, 3, 3);
        ctx.fillRect(4, -4, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-6, -3, 1, 1);
        ctx.fillRect(5, -3, 1, 1);
    }

    ctx.restore();

    // Invulnerability Electric Forcefield Ring
    if (GameState.player.invulnerableTimer > 0) {
        const pulse = 0.5 + Math.sin(performance.now() * 0.02) * 0.3;
        const radiusX = 11;
        const radiusY = 10;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 243, 255, ${pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 3 Orbiting shield spark nodes
        const angleRot = performance.now() * 0.006;
        for (let i = 0; i < 3; i++) {
            const a = angleRot + (i * Math.PI * 2 / 3);
            const sx = cx + Math.cos(a) * radiusX;
            const sy = cy + Math.sin(a) * radiusY;
            ctx.fillStyle = '#ffea00';
            ctx.fillRect(Math.floor(sx - 0.5), Math.floor(sy - 0.5), 2, 2);
        }
        ctx.restore();
    }
}

// 👾 Pixel Art Drawing: Galaga Swarm Aliens with 360° Dynamic Rotation
function drawAlien(alien) {
    const cx = Math.floor(alien.x + alien.width / 2);
    const cy = Math.floor(alien.y + alien.height / 2);
    const frame = GameState.animFrame || 0;

    ctx.save();
    ctx.translate(cx, cy);

    // Apply 360-degree rotation when diving, looping or returning
    if (alien.state === 'diving' || alien.state === 'entering' || alien.state === 'returning') {
        ctx.rotate(alien.angle || 0);
    }

    if (alien.type === 'boss') {
        drawBossGalagaSprite(frame, alien.hp, alien.state === 'beaming');
    } else if (alien.type === 'butterfly') {
        drawButterflySprite(frame);
    } else if (alien.type === 'bee') {
        drawBeeSprite(frame);
    }

    ctx.restore();
}

// 👑 Boss Galaga (Commander) - 14x12 matrix
function drawBossGalagaSprite(frame, hp, isBeaming) {
    const isDamaged = hp === 1;
    const cPrimary = isDamaged ? '#00d2ff' : '#22c55e';
    const cDark = isDamaged ? '#0077b6' : '#15803d';
    const cAccent = isDamaged ? '#ffea00' : '#ffd166';
    const cCore = isDamaged ? '#ff3344' : '#ef4444';

    // 4-phase wing flapping cycle
    if (frame === 0) {
        ctx.fillStyle = cPrimary;
        ctx.fillRect(-6, -1, 3, 6);
        ctx.fillRect(3, -1, 3, 6);
    } else if (frame === 1) {
        ctx.fillStyle = cPrimary;
        ctx.fillRect(-7, -2, 4, 7);
        ctx.fillRect(3, -2, 4, 7);
    } else if (frame === 2) {
        ctx.fillStyle = cPrimary;
        ctx.fillRect(-7, -3, 3, 8);
        ctx.fillRect(4, -3, 3, 8);
        ctx.fillStyle = cAccent;
        ctx.fillRect(-7, 3, 2, 2);
        ctx.fillRect(5, 3, 2, 2);
    } else {
        ctx.fillStyle = cPrimary;
        ctx.fillRect(-6, -2, 3, 7);
        ctx.fillRect(3, -2, 3, 7);
    }

    // Head plate & Curved pincers
    ctx.fillStyle = cPrimary;
    ctx.fillRect(-2, -5, 4, 3);
    ctx.fillRect(-4, -6, 2, 3);
    ctx.fillRect(2, -6, 2, 3);

    // Pincer Tips
    ctx.fillStyle = cAccent;
    ctx.fillRect(-4, -7, 1, 2);
    ctx.fillRect(3, -7, 1, 2);

    // Multifaceted Compound Eyes
    ctx.fillStyle = '#ffea00';
    ctx.fillRect(-3, -3, 2, 2);
    ctx.fillRect(1, -3, 2, 2);
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(-2, -3, 1, 1);
    ctx.fillRect(1, -3, 1, 1);

    // Carapace & Abdomen
    ctx.fillStyle = cPrimary;
    ctx.fillRect(-3, -2, 6, 6);
    ctx.fillStyle = cDark;
    ctx.fillRect(-2, 1, 4, 1);
    ctx.fillRect(-1, 3, 2, 1);

    // Central Pulsing Energy Core
    ctx.fillStyle = cCore;
    ctx.fillRect(-1, -1, 2, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, -1, 1, 1);

    // Damaged Electric Sparks
    if (isDamaged && Math.random() < 0.6) {
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(Math.floor((Math.random() - 0.5) * 12), Math.floor((Math.random() - 0.5) * 10), 1, 1);
    }

    // Tractor Beam Emitter Glow
    if (isBeaming) {
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(-3, 4, 6, 2);
    }
}

// 🦋 Butterfly (Goei - Red Swarm) - 12x10 matrix
function drawButterflySprite(frame) {
    const cRed = '#ff2a4b';
    const cDarkRed = '#991b1b';
    const cGold = '#ffea00';

    // Head & Antennae
    ctx.fillStyle = cRed;
    ctx.fillRect(-2, -4, 4, 2);
    ctx.fillStyle = cGold;
    ctx.fillRect(-3, -5, 1, 2);
    ctx.fillRect(-4, -6, 1, 1);
    ctx.fillRect(2, -5, 1, 2);
    ctx.fillRect(3, -6, 1, 1);

    // Center Sensory Eye
    ctx.fillStyle = '#00f5d4';
    ctx.fillRect(-1, -3, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, -3, 1, 1);

    // Abdomen
    ctx.fillStyle = cRed;
    ctx.fillRect(-2, -1, 4, 5);
    ctx.fillStyle = cGold;
    ctx.fillRect(-1, 0, 2, 1);
    ctx.fillRect(-1, 2, 2, 1);

    // 4-phase wing flapping cycle
    if (frame === 0) {
        ctx.fillStyle = cRed;
        ctx.fillRect(-5, -2, 3, 5);
        ctx.fillRect(2, -2, 3, 5);
        ctx.fillStyle = cGold;
        ctx.fillRect(-6, 0, 1, 2);
        ctx.fillRect(5, 0, 1, 2);
    } else if (frame === 1) {
        ctx.fillStyle = cRed;
        ctx.fillRect(-6, -3, 4, 6);
        ctx.fillRect(2, -3, 4, 6);
        ctx.fillStyle = cGold;
        ctx.fillRect(-6, -4, 2, 2);
        ctx.fillRect(4, -4, 2, 2);
    } else if (frame === 2) {
        ctx.fillStyle = cRed;
        ctx.fillRect(-6, -4, 4, 7);
        ctx.fillRect(2, -4, 4, 7);
        ctx.fillStyle = cGold;
        ctx.fillRect(-6, -4, 2, 2);
        ctx.fillRect(4, -4, 2, 2);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-6, 1, 1, 2);
        ctx.fillRect(5, 1, 1, 2);
    } else {
        ctx.fillStyle = cRed;
        ctx.fillRect(-5, -3, 3, 6);
        ctx.fillRect(2, -3, 3, 6);
        ctx.fillStyle = cGold;
        ctx.fillRect(-5, -1, 1, 2);
        ctx.fillRect(4, -1, 1, 2);
    }
}

// 🐝 Bee (Zako - Blue Swarm) - 11x10 matrix
function drawBeeSprite(frame) {
    // Eyes & Head
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -4, 1, 2);
    ctx.fillRect(1, -4, 1, 2);
    ctx.fillStyle = '#ffea00';
    ctx.fillRect(-3, -5, 1, 1);
    ctx.fillRect(2, -5, 1, 1);

    // Thorax & Stinger
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-2, -1, 4, 1);
    ctx.fillRect(-1, 1, 2, 1);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-1, 3, 2, 2); // stinger

    // 4-phase flutter
    if (frame === 0) {
        ctx.fillStyle = '#00d2ff';
        ctx.fillRect(-5, -3, 3, 5);
        ctx.fillRect(2, -3, 3, 5);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-5, -1, 1, 2);
        ctx.fillRect(4, -1, 1, 2);
    } else if (frame === 1) {
        ctx.fillStyle = '#00b4d8';
        ctx.fillRect(-5, -4, 3, 6);
        ctx.fillRect(2, -4, 3, 6);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-5, -4, 2, 1);
        ctx.fillRect(3, -4, 2, 1);
    } else if (frame === 2) {
        ctx.fillStyle = '#0077b6';
        ctx.fillRect(-5, -3, 3, 7);
        ctx.fillRect(2, -3, 3, 7);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-5, 2, 1, 2);
        ctx.fillRect(4, 2, 1, 2);
    } else {
        ctx.fillStyle = '#00d2ff';
        ctx.fillRect(-4, -2, 2, 5);
        ctx.fillRect(2, -2, 2, 5);
    }
}

// ==========================================
// 🔁 Game Loop & Lifecycle
// ==========================================
function gameLoop(timestamp) {
    if (!GameState.lastTime) GameState.lastTime = timestamp;
    const dt = Math.min((timestamp - GameState.lastTime) / 1000, 0.05);
    GameState.lastTime = timestamp;

    updateGame(dt);
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

    // Auto-restart countdown (15s Hall of Fame display)
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
// 🏆 Hall of Fame & Ranking
// ==========================================
function loadRanking() {
    try {
        const ranking = JSON.parse(localStorage.getItem('galaga-ranking')) || [];
        const top5 = ranking.slice(0, 5);
        if (top5.length > 0) {
            GameState.highScore = top5[0].score;
            updateUI();
        }
        displayRanking(ranking);

        if (window.parent && window.parent !== window) {
            try {
                window.parent.postMessage({
                    type: 'RANKING_UPDATE',
                    slug: 'galaga',
                    ranking: top5
                }, '*');
            } catch (_) {}
        }
    } catch (e) {
        console.error('Error cargando ranking:', e);
    }
}

function saveScore(nickname, score) {
    if (score === 0) return;
    try {
        let ranking = JSON.parse(localStorage.getItem('galaga-ranking')) || [];
        ranking = ranking.filter(entry => !(entry.name === nickname && entry.score < score));
        if (!ranking.some(entry => entry.name === nickname && entry.score === score)) {
            ranking.push({ name: nickname, score: score, date: new Date().toLocaleDateString() });
        }
        ranking.sort((a, b) => b.score - a.score);
        ranking = ranking.slice(0, 5);
        localStorage.setItem('galaga-ranking', JSON.stringify(ranking));
        displayRanking(ranking);
    } catch (e) {
        console.error('Error guardando score:', e);
    }
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
}

// ==========================================
// 📡 WebRTC Signaling & Host Setup
// ==========================================
const peerConnections = new Map();
const dataChannels = new Map();
let socket = null;

const signalingState = {
    shouldReconnect: true,
    manualClose: false,
    reconnectTimer: null,
    reconnectAttempts: 0,
    maxAttempts: 10,
    baseDelay: 1000
};

function getControlUrl() {
    const baseUrl = CONFIG.CONTROL_URL || 'https://controllers.myplayad.com/galaga';
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
                throw new Error('QRCode library not loaded');
            }
        } catch (e) {
            console.warn('QRCode local error, using fallback API:', e);
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

function resetSignalingAndRoom() {
    dataChannels.forEach(ch => ch.close());
    peerConnections.forEach(pc => pc.close());
    dataChannels.clear();
    peerConnections.clear();

    GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    GameState.running = false;
    GameState.gameOver = false;
    GameState.currentNickname = 'Player';
    if (playerNickElement) playerNickElement.textContent = 'PLAYER: ----';
    
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
            signalingState.reconnectAttempts = 0;
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
                    const playerId = data.playerId || 'controller';
                    const pc = peerConnections.get(playerId);
                    if (pc) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                        } catch (err) {
                            console.warn('Error añadiendo candidate:', err);
                        }
                    }
                } else if (data.type === 'controller_connected') {
                    console.log('Controlador conectado:', data.playerId);
                    waitingOverlay.classList.add('hidden');
                } else if (data.type === 'controller_disconnected') {
                    console.log('Controlador desconectado:', data.playerId);
                    handleControllerDisconnect(data.playerId || 'controller');
                }
            } catch (err) {
                console.error('Error procesando mensaje de señalización:', err);
            }
        };

        socket.onclose = () => {
            if (signalingState.shouldReconnect && !signalingState.manualClose) {
                setTimeout(connectSignaling, 2000);
            }
        };

        socket.onerror = (e) => {
            console.warn('WebSocket error en Host:', e);
        };
    } catch (e) {
        console.error('Error conectando a WS:', e);
    }
}

async function handleOffer(data) {
    const { playerId, type, sdp } = data;
    const targetPlayerId = playerId || 'controller';
    const rtcConfig = (window.GAME_CONFIG && window.GAME_CONFIG.getIceConfig) 
        ? window.GAME_CONFIG.getIceConfig() 
        : { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.set(targetPlayerId, pc);

    if (window.GAME_CONFIG && window.GAME_CONFIG.attachPCDiagnostics) {
        try { window.GAME_CONFIG.attachPCDiagnostics(pc, `host-${targetPlayerId}`); } catch (e) {}
    }

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
        if (window.GAME_CONFIG && window.GAME_CONFIG.attachDataChannelDiagnostics) {
            try { window.GAME_CONFIG.attachDataChannelDiagnostics(dc, `dc-${targetPlayerId}`); } catch (e) {}
        }
        setupDataChannel(dc, targetPlayerId);
    };

    await pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
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
        console.log('WebRTC DataChannel abierto con el controlador:', playerId);
        waitingOverlay.classList.add('hidden');
    };

    channel.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'join' || msg.type === 'nickname') {
                GameState.currentNickname = (msg.nickname || msg.value || 'PILOT').toUpperCase().substring(0, 10);
                if (playerNickElement) playerNickElement.textContent = `PLAYER: ${GameState.currentNickname}`;
                startNewGame();
            }
            if (msg.x !== undefined) {
                const rawX = msg.x || 0;
                const expX = Math.sign(rawX) * Math.pow(Math.abs(rawX), 1.15);
                GameState.player.dx = expX * PLAYER_SPEED;
            }
            if (msg.fire || msg.type === 'fire') {
                shootTorpedo();
            }
            if (msg.type === 'restart' && GameState.gameOver) {
                startNewGame();
            }
        } catch (err) {}
    };

    channel.onclose = () => {
        console.log('WebRTC DataChannel cerrado:', playerId);
        handleControllerDisconnect(playerId);
    };
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

// Keyboard controls fallback for browser testing
window.addEventListener('keydown', (e) => {
    audio.init();
    const key = e.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') GameState.player.dx = -PLAYER_SPEED;
    if (key === 'arrowright' || key === 'd') GameState.player.dx = PLAYER_SPEED;
    if (key === ' ' || key === 'w' || key === 'arrowup') shootTorpedo();
    if (key === 'enter') {
        if (!GameState.running || GameState.gameOver) startNewGame();
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if ((key === 'arrowleft' || key === 'a') && GameState.player.dx < 0) GameState.player.dx = 0;
    if ((key === 'arrowright' || key === 'd') && GameState.player.dx > 0) GameState.player.dx = 0;
});

mainScreen.addEventListener('click', () => {
    audio.init();
    if (!GameState.running || GameState.gameOver) startNewGame();
});

// ==========================================
// 📐 AutoScale Responsive Multi-Stage Engine
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

window.addEventListener('resize', autoScale);
window.addEventListener('load', () => {
    updateQrCode();
    autoScale();
});
if (document.fonts && document.fonts.ready) document.fonts.ready.then(autoScale);
if (window.ResizeObserver) new ResizeObserver(() => autoScale()).observe(document.body);
window.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.type === 'RESCALE') autoScale();
    if (e.data.type === 'GET_RANKING') loadRanking();
});
[0, 50, 150, 300, 600, 1200].forEach(d => setTimeout(autoScale, d));

// ==========================================
// 🚀 Initialization
// ==========================================
GameState.stars = initStarfield(75);
loadRanking();
updateUI();
updateQrCode();
autoScale();
requestAnimationFrame(gameLoop);
connectSignaling();
