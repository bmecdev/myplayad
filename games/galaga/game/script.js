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
const videoRankingList = document.getElementById('video-ranking-list');
const qrCodeImg = document.getElementById('qr-code-img');
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
const PLAYER_WIDTH = 13;
const PLAYER_HEIGHT = 11;
const PLAYER_SPEED = 120;
const MAX_PLAYER_BULLETS = 4; // 2 pairs of torpedoes

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
        x: (CANVAS_WIDTH - PLAYER_WIDTH) / 2,
        y: CANVAS_HEIGHT - 16,
        dx: 0,
        invulnerableTimer: 0,
        isCaptured: false,
        captureProgress: 0,
        fireCooldown: 0
    },
    
    // Bullets & Objects
    bullets: [],       // Player torpedoes
    alienBullets: [],  // Alien red pulses
    aliens: [],        // Galaga swarm
    explosions: [],    // Particle explosions
    scorePopups: [],   // Floating score indicators (+160, +400, etc.)
    stars: [],         // Multi-colored starfield
    
    // Wave state
    formationSway: 0,
    formationTimer: 0,
    nextDiveTimer: 2.0,
    wingAnimFlip: false,
    animTimer: 0,
    
    // Active Tractor Beam from a Boss
    tractorBeam: null // { bossId, x, y, width, timer, state: 'expanding'|'holding'|'closing' }
};

// Starfield Generator
function initStarfield(count = 55) {
    const stars = [];
    const colors = ['#ffffff', '#fff382', '#ff5964', '#38b000', '#00e5ff', '#c77dff'];
    for (let i = 0; i < count; i++) {
        stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            speed: 0.3 + Math.random() * 1.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() > 0.8 ? 1.5 : 1,
            twinkle: Math.random() * 10
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
    GameState.player.y = CANVAS_HEIGHT - 16;
    GameState.player.dx = 0;
    GameState.player.invulnerableTimer = 1.8;
    GameState.player.isCaptured = false;
    GameState.player.captureProgress = 0;
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

    GameState.player.fireCooldown = 0.16; // 160ms rapid fire limit
    audio.playLaser();

    // Twin Torpedoes
    const pX = GameState.player.x;
    const pY = GameState.player.y;
    GameState.bullets.push({
        x: pX + 2,
        y: pY - 2,
        w: 2,
        h: 5,
        speed: 240
    });
    GameState.bullets.push({
        x: pX + PLAYER_WIDTH - 4,
        y: pY - 2,
        w: 2,
        h: 5,
        speed: 240
    });
}

// Update aliens, dives, swoops, bullets, collisions
function updateGame(dt) {
    // Starfield animation
    const starSpeedMultiplier = GameState.stageIntroTimer > 0 ? 3.5 : 1.0;
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

    // Wing flapping animation
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
}

function updateAlienDiving(alien, dt) {
    alien.loopT += dt * 0.9;
    
    // Check if Boss decides to activate Tractor Beam mid-dive
    if (alien.canBeam && alien.y > 65 && alien.y < 85 && !GameState.tractorBeam) {
        startTractorBeam(alien);
        return;
    }

    // Curved swoop towards target X and down
    alien.y += alien.diveSpeed * dt;
    const dx = (alien.targetX - alien.x) * dt * 2.5;
    alien.x += dx;

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
    } else {
        alien.x += (dx / dist) * (alien.diveSpeed * 0.9) * dt;
        alien.y += (dy / dist) * (alien.diveSpeed * 0.9) * dt;
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
    addExplosion(GameState.player.x + PLAYER_WIDTH / 2, GameState.player.y + PLAYER_HEIGHT / 2);
    
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
                    addExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2);
                    
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
                    addExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, 6);
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
                addExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2);
                GameState.aliens.splice(i, 1);
                killPlayer();
                break;
            }
        }
    }
}

function killPlayer() {
    audio.playPlayerExplosion();
    addExplosion(GameState.player.x + PLAYER_WIDTH / 2, GameState.player.y + PLAYER_HEIGHT / 2, 20);
    GameState.lives--;
    updateUI();

    if (GameState.lives <= 0) {
        endGame();
    } else {
        resetPlayerPosition();
    }
}

function addExplosion(x, y, count = 12) {
    const particles = [];
    const colors = ['#ffffff', '#ffeb3b', '#ff5722', '#f44336'];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 20 + Math.random() * 55;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 1.0,
            size: Math.random() > 0.5 ? 2 : 1
        });
    }
    GameState.explosions.push({ timer: 0, particles });
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
    ctx.fillStyle = '#060a08';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Draw Starfield
    GameState.stars.forEach(star => {
        ctx.fillStyle = star.color;
        ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
    });

    // 2. Draw Tractor Beam
    if (GameState.tractorBeam) {
        const tb = GameState.tractorBeam;
        ctx.save();
        ctx.strokeStyle = '#00f3ff';
        ctx.fillStyle = 'rgba(0, 243, 255, 0.18)';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(tb.x - 3, tb.y);
        ctx.lineTo(tb.x + 3, tb.y);
        ctx.lineTo(tb.x + tb.width, tb.bottomY);
        ctx.lineTo(tb.x - tb.width, tb.bottomY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Pulsing rings inside beam
        for (let ringY = tb.y + 10; ringY < tb.bottomY; ringY += 15) {
            const progress = (ringY - tb.y) / (tb.bottomY - tb.y);
            const w = tb.width * progress;
            ctx.beginPath();
            ctx.ellipse(tb.x, ringY, w, 3, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 170, ${0.4 + Math.sin(performance.now() * 0.01 + ringY) * 0.3})`;
            ctx.stroke();
        }
        ctx.restore();
    }

    // 3. Draw Aliens
    GameState.aliens.forEach(alien => {
        drawAlien(alien);
    });

    // 4. Draw Player Torpedoes
    ctx.fillStyle = '#ffff00';
    GameState.bullets.forEach(b => {
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = '#ff2222';
        ctx.fillRect(b.x, b.y + 2, b.w, b.h - 2);
        ctx.fillStyle = '#ffff00';
    });

    // 5. Draw Alien Bullets
    ctx.fillStyle = '#ff3344';
    GameState.alienBullets.forEach(ab => {
        ctx.fillRect(ab.x, ab.y, ab.w, ab.h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ab.x, ab.y + 1, 1, 2);
        ctx.fillStyle = '#ff3344';
    });

    // 6. Draw Player Fighter
    if (GameState.running && !GameState.player.isCaptured) {
        // Blinking if invulnerable
        if (GameState.player.invulnerableTimer <= 0 || Math.floor(GameState.player.invulnerableTimer * 10) % 2 === 0) {
            drawPlayerShip(GameState.player.x, GameState.player.y);
        }
    }

    // 7. Draw Explosions
    GameState.explosions.forEach(exp => {
        exp.particles.forEach(p => {
            if (p.life > 0) {
                ctx.fillStyle = p.color;
                ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
            }
        });
    });

    // 8. Draw Score Popups
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffea00';
    GameState.scorePopups.forEach(sp => {
        ctx.fillText(sp.text, sp.x - 4, sp.y);
    });

    // 9. Stage Intro Text
    if (GameState.stageIntroTimer > 0) {
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = '#3dff8a';
        ctx.textAlign = 'center';
        ctx.fillText(`STAGE ${GameState.stage}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
        ctx.fillStyle = '#ffb703';
        ctx.fillText('READY', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 8);
        ctx.textAlign = 'start';
    }

    // 10. Stage Clear Text
    if (GameState.stageClearTimer > 0) {
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = '#00f3ff';
        ctx.textAlign = 'center';
        ctx.fillText('STAGE CLEAR!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 6);
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffea00';
        ctx.fillText('+1000 BONUS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 12);
        ctx.textAlign = 'start';
    }
}

// Pixel Art Drawing: Iconic Galaga Fighter Ship
function drawPlayerShip(x, y) {
    ctx.save();
    // Fuselage (White)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 5, y + 2, 3, 9);
    ctx.fillRect(x + 4, y + 5, 5, 4);

    // Red Nosecone & Wing Accents
    ctx.fillStyle = '#ff2244';
    ctx.fillRect(x + 6, y, 1, 3);
    ctx.fillRect(x + 3, y + 7, 2, 4);
    ctx.fillRect(x + 8, y + 7, 2, 4);

    // Blue Stabilizer Wings
    ctx.fillStyle = '#0077ff';
    ctx.fillRect(x, y + 6, 2, 5);
    ctx.fillRect(x + 11, y + 6, 2, 5);
    ctx.fillRect(x + 2, y + 8, 2, 3);
    ctx.fillRect(x + 9, y + 8, 2, 3);

    // Engine Exhaust Glow
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(x + 5, y + 10, 3, 2);
    ctx.restore();
}

// Pixel Art Drawing: Galaga Swarm Aliens
function drawAlien(alien) {
    const x = Math.floor(alien.x);
    const y = Math.floor(alien.y);
    const flip = GameState.wingAnimFlip;

    ctx.save();

    if (alien.type === 'boss') {
        // Boss Galaga (Green crest, yellow eyes, blue wings / turns blue when hit once)
        const isDamaged = alien.hp === 1;
        const mainColor = isDamaged ? '#00b4d8' : '#3dff8a';
        const wingColor = isDamaged ? '#0077b6' : '#22aa55';

        // Wings
        ctx.fillStyle = wingColor;
        if (flip) {
            ctx.fillRect(x, y + 2, 3, 6);
            ctx.fillRect(x + 9, y + 2, 3, 6);
        } else {
            ctx.fillRect(x + 1, y + 1, 3, 7);
            ctx.fillRect(x + 8, y + 1, 3, 7);
        }

        // Body / Crest
        ctx.fillStyle = mainColor;
        ctx.fillRect(x + 3, y + 1, 6, 8);
        ctx.fillRect(x + 4, y, 4, 3);

        // Yellow Eyes
        ctx.fillStyle = '#ffea00';
        ctx.fillRect(x + 4, y + 3, 1, 2);
        ctx.fillRect(x + 7, y + 3, 1, 2);

        // Core Horns
        ctx.fillStyle = '#ff3344';
        ctx.fillRect(x + 5, y + 6, 2, 3);

    } else if (alien.type === 'butterfly') {
        // Red Butterfly (Goei - Red body, yellow tips)
        ctx.fillStyle = '#ff2244';
        ctx.fillRect(x + 3, y + 1, 5, 7);

        // Wings
        if (flip) {
            ctx.fillRect(x, y + 3, 3, 5);
            ctx.fillRect(x + 8, y + 3, 3, 5);
        } else {
            ctx.fillRect(x + 1, y + 1, 3, 6);
            ctx.fillRect(x + 7, y + 1, 3, 6);
        }

        // Yellow Antennae & Wingtips
        ctx.fillStyle = '#ffea00';
        ctx.fillRect(x + 3, y, 1, 2);
        ctx.fillRect(x + 7, y, 1, 2);
        ctx.fillRect(x, y + (flip ? 3 : 1), 2, 2);
        ctx.fillRect(x + 9, y + (flip ? 3 : 1), 2, 2);

        // Center Eye
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 5, y + 3, 1, 2);

    } else if (alien.type === 'bee') {
        // Blue Bee (Zako - Electric blue, yellow abdomen)
        ctx.fillStyle = '#00d2ff';
        if (flip) {
            ctx.fillRect(x, y + 2, 3, 5);
            ctx.fillRect(x + 7, y + 2, 3, 5);
        } else {
            ctx.fillRect(x + 1, y, 3, 6);
            ctx.fillRect(x + 6, y, 3, 6);
        }

        // Yellow Center Body & Eyes
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(x + 3, y + 1, 4, 6);
        ctx.fillStyle = '#ff3344';
        ctx.fillRect(x + 4, y + 7, 2, 2); // stinger

        // White Eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 3, y + 2, 1, 2);
        ctx.fillRect(x + 6, y + 2, 1, 2);
    }

    ctx.restore();
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

    // Show video ranking overlay
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
        if (ranking.length > 0) {
            GameState.highScore = ranking[0].score;
            updateUI();
        }
        displayRanking(ranking);
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
    if (qrCodeImg) {
        qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(controlUrl)}&margin=10`;
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
                GameState.player.dx = rawX * PLAYER_SPEED;
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
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const availableW = window.innerWidth || document.documentElement.clientWidth;
    const availableH = window.innerHeight || document.documentElement.clientHeight;
    if (!availableW || !availableH) return;

    const padding = 20;
    const scaleX = (availableW - padding) / rect.width;
    const scaleY = (availableH - padding) / rect.height;
    const scale = Math.max(0.1, Math.min(scaleX, scaleY));

    container.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', autoScale);
window.addEventListener('load', autoScale);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(autoScale);
if (window.ResizeObserver) new ResizeObserver(() => autoScale()).observe(document.body);
window.addEventListener('message', (e) => { if (e.data?.type === 'RESCALE') autoScale(); });
[0, 50, 150, 300, 600, 1200].forEach(d => setTimeout(autoScale, d));

// ==========================================
// 🚀 Initialization
// ==========================================
GameState.stars = initStarfield(55);
loadRanking();
updateUI();
requestAnimationFrame(gameLoop);
connectSignaling();
