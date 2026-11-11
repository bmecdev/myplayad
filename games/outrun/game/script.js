// OutRun Retro Arcade - Motor Pseudo-3D y Lógica de Juego en Pantalla
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const playerNickElement = document.getElementById('player-nick');
const timeCountElement = document.getElementById('time-count');
const timeContainerElement = document.getElementById('time-container');
const speedCountElement = document.getElementById('speed-count');
const gameOverOverlay = document.getElementById('game-over-overlay');
const waitingOverlay = document.getElementById('waiting-overlay');
const rankingList = document.getElementById('ranking-list');
const videoRankingList = document.getElementById('video-ranking-list');
const qrContainer = document.getElementById('qrcode');
const iceRouteElement = document.getElementById('ice-route');
const roomIdElement = document.getElementById('room-id');
const finalScoreText = document.getElementById('final-score-text');
const checkpointsClearedText = document.getElementById('checkpoints-cleared-text');

const adVideoOverlay = document.getElementById('ad-video-overlay');
const adVideoPlayer = document.getElementById('ad-video-player');
const adCountdown = document.getElementById('ad-countdown');
const adPilotName = document.getElementById('ad-pilot-name');
let cachedAdVideoUrl = null;
let adVideoPromise = null;

// Dimensiones de renderizado fluido y nítido de alta definición (2x HiDPI sobre 400x320 lógico)
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 320;
const RENDER_SCALE = 2;
if (canvas) {
    canvas.width = CANVAS_WIDTH * RENDER_SCALE;
    canvas.height = CANVAS_HEIGHT * RENDER_SCALE;
}

// Constantes de carretera y perspectiva pseudo-3D
const ROAD_WIDTH = 1800;
const SEGMENT_LENGTH = 200;
const CAMERA_HEIGHT = 900;
const CAMERA_DEPTH = 0.84;
const DRAW_DISTANCE = 80;
const LANES = 3;

// // Audio Arcade Sintetizado (Web Audio API)
class ArcadeAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.engineOsc = null;
        this.engineGain = null;
        this.bgmTimer = null;
    }

    init() {
        if (!this.ctx) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                this.ctx = new AudioContext();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);

                this.engineOsc = this.ctx.createOscillator();
                this.engineGain = this.ctx.createGain();
                this.engineOsc.type = 'sawtooth';
                this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
                this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(360, this.ctx.currentTime);

                this.engineOsc.connect(filter);
                filter.connect(this.engineGain);
                this.engineGain.connect(this.masterGain);
                this.engineOsc.start();
            } catch (e) {
                console.warn('Audio no soportado:', e);
            }
        }
        this.resume();
    }

    resume() {
        if (!this.ctx) {
            this.init();
            return;
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => this.updateUI()).catch(() => {});
        } else if (this.ctx.state === 'running') {
            this.updateUI();
        }
    }

    toggleMute() {
        this.init();
        if (!this.ctx) return;
        this.resume();
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.5, this.ctx.currentTime);
        }
        if (!this.isMuted && GameState.running && !this.bgmTimer) {
            this.startMusic();
        }
        this.updateUI();
    }

    updateUI() {
        const btn = document.getElementById('audio-toggle-btn');
        if (!btn) return;
        if (this.isMuted) {
            btn.textContent = '🔇 AUDIO: OFF';
            btn.classList.add('muted');
        } else if (this.ctx && this.ctx.state === 'running') {
            btn.textContent = '🔊 AUDIO: ON';
            btn.classList.remove('muted');
        } else {
            btn.textContent = '🔇 CLIC AUDIO';
            btn.classList.add('muted');
        }
    }

    playBeep() {
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(587.33, t);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.08);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.08);
        } catch (e) {}
    }

    updateEngine(speed, maxSpeed) {
        if (!this.ctx || !this.engineGain) return;
        const ratio = Math.max(0, Math.min(1, speed / maxSpeed));
        const freq = 55 + (ratio * 260);
        const gain = speed > 10 ? (0.12 + ratio * 0.22) : (speed > 0 ? 0.06 : 0);
        const t = this.ctx.currentTime;
        this.engineOsc.frequency.setTargetAtTime(freq, t, 0.04);
        this.engineGain.gain.setTargetAtTime(gain, t, 0.04);
    }

    stopEngine() {
        if (!this.ctx || !this.engineGain) return;
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    }

    playTireScreech() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(750 + Math.random() * 200, t);
            gain.gain.setValueAtTime(0.22, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.16);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.16);
        } catch (e) {}
    }

    playCrash() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(160, t);
            osc.frequency.linearRampToValueAtTime(35, t + 0.4);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.4);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.4);
        } catch (e) {}
        broadcastSFX('crash');
    }

    playCheckpoint() {
        if (!this.ctx) return;
        this.resume();
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
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
        broadcastSFX('checkpoint');
    }

    playPassBonus() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1046.50, t);
            osc.frequency.setValueAtTime(1318.51, t + 0.06);
            gain.gain.setValueAtTime(0.24, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.18);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.18);
        } catch (e) {}
        broadcastSFX('pass');
    }

    playWarningBeep() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, t);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.09);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.09);
        } catch (e) {}
        broadcastSFX('warning');
    }

    playStartTune() {
        if (!this.ctx) return;
        this.resume();
        const notes = [440, 554.37, 659.25, 880];
        const t = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + idx * 0.09);
            gain.gain.setValueAtTime(0.26, t + idx * 0.09);
            gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.09 + 0.14);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.09);
            osc.stop(t + idx * 0.09 + 0.15);
        });
        broadcastSFX('start');
    }

    playGameOver() {
        if (!this.ctx) return;
        this.resume();
        const notes = [440, 370, 311, 246.94];
        const t = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t + idx * 0.16);
            gain.gain.setValueAtTime(0.28, t + idx * 0.16);
            gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.16 + 0.22);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.16);
            osc.stop(t + idx * 0.16 + 0.24);
        });
        broadcastSFX('gameover');
    }

    startMusic() {
        this.init();
        if (!this.ctx) return;
        this.resume();
        this.stopMusic();

        if (!this.musicGain) {
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(0.32, this.ctx.currentTime);
            this.musicGain.connect(this.masterGain);
        }

        // 130 BPM tempo -> 16th note step = (60 / 130) / 4 = ~0.1154 seconds
        let step = 0;

        // OutRun "Magical Sunshine" Chiptune Lead Theme (32 steps = 2 bars)
        const leadNotes = {
            0: 440.00,  // A4
            2: 587.33,  // D5
            4: 698.46,  // F5
            6: 880.00,  // A5
            8: 783.99,  // G5
            10: 698.46, // F5
            12: 659.25, // E5
            14: 587.33, // D5
            16: 659.25, // E5
            18: 783.99, // G5
            20: 1046.50,// C6
            22: 987.77, // B5
            24: 880.00, // A5
            26: 783.99, // G5
            28: 698.46, // F5
            30: 659.25  // E5
        };

        // Funky Bassline (sawtooth filtered): Dm, G, C, Am
        const bassNotes = [
            146.83, 146.83, 174.61, 146.83,
            146.83, 220.00, 196.00, 174.61,
            196.00, 196.00, 246.94, 196.00,
            196.00, 220.00, 196.00, 164.81,
            130.81, 130.81, 164.81, 130.81,
            130.81, 196.00, 174.61, 164.81,
            220.00, 220.00, 261.63, 220.00,
            220.00, 246.94, 220.00, 196.00
        ];

        // Chiptune Arp (triangle wave):
        const arpNotes = [
            293.66, 349.23, 440.00, 523.25,
            293.66, 349.23, 440.00, 587.33,
            392.00, 493.88, 587.33, 698.46,
            392.00, 493.88, 587.33, 783.99,
            261.63, 329.63, 392.00, 493.88,
            261.63, 329.63, 392.00, 523.25,
            440.00, 523.25, 659.25, 783.99,
            440.00, 523.25, 659.25, 880.00
        ];

        this.bgmTimer = setInterval(() => {
            if (!GameState.running || GameState.gameOver) {
                this.stopMusic();
                return;
            }
            if (!this.ctx || this.ctx.state !== 'running') {
                if (this.ctx && this.ctx.state === 'suspended') {
                    this.ctx.resume().catch(() => {});
                }
                return;
            }
            const t = this.ctx.currentTime;
            const s = step % 32;
            step++;

            try {
                // 1. Kick Drum (Steps 0, 8, 16, 24)
                if (s % 8 === 0) {
                    const kickOsc = this.ctx.createOscillator();
                    const kickGain = this.ctx.createGain();
                    kickOsc.type = 'sine';
                    kickOsc.frequency.setValueAtTime(140, t);
                    kickOsc.frequency.exponentialRampToValueAtTime(38, t + 0.08);
                    kickGain.gain.setValueAtTime(0.24, t);
                    kickGain.gain.linearRampToValueAtTime(0.0001, t + 0.09);
                    kickOsc.connect(kickGain);
                    kickGain.connect(this.musicGain);
                    kickOsc.start(t);
                    kickOsc.stop(t + 0.09);
                }

                // 2. Snare Drum (Steps 4, 12, 20, 28)
                if (s % 8 === 4) {
                    const bufferSize = Math.floor(this.ctx.sampleRate * 0.06);
                    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = buffer;
                    const snareFilter = this.ctx.createBiquadFilter();
                    snareFilter.type = 'highpass';
                    snareFilter.frequency.setValueAtTime(1000, t);
                    const snareGain = this.ctx.createGain();
                    snareGain.gain.setValueAtTime(0.14, t);
                    snareGain.gain.linearRampToValueAtTime(0.0001, t + 0.06);
                    noise.connect(snareFilter);
                    snareFilter.connect(snareGain);
                    snareGain.connect(this.musicGain);
                    noise.start(t);
                    noise.stop(t + 0.065);
                }

                // 3. Hi-Hat (Steps 2, 6, 10, 14, 18, 22, 26, 30)
                if (s % 4 === 2) {
                    const bufferSize = Math.floor(this.ctx.sampleRate * 0.02);
                    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = buffer;
                    const hatFilter = this.ctx.createBiquadFilter();
                    hatFilter.type = 'highpass';
                    hatFilter.frequency.setValueAtTime(6500, t);
                    const hatGain = this.ctx.createGain();
                    hatGain.gain.setValueAtTime(0.05, t);
                    hatGain.gain.linearRampToValueAtTime(0.0001, t + 0.02);
                    noise.connect(hatFilter);
                    hatFilter.connect(hatGain);
                    hatGain.connect(this.musicGain);
                    noise.start(t);
                    noise.stop(t + 0.022);
                }

                // 4. Bassline (Every 16th note)
                const bFreq = bassNotes[s];
                if (bFreq) {
                    const bassOsc = this.ctx.createOscillator();
                    const bassFilter = this.ctx.createBiquadFilter();
                    const bGain = this.ctx.createGain();
                    bassOsc.type = 'sawtooth';
                    bassOsc.frequency.setValueAtTime(bFreq, t);
                    bassFilter.type = 'lowpass';
                    bassFilter.frequency.setValueAtTime(500, t);
                    bGain.gain.setValueAtTime(0.15, t);
                    bGain.gain.linearRampToValueAtTime(0.0001, t + 0.10);
                    bassOsc.connect(bassFilter);
                    bassFilter.connect(bGain);
                    bGain.connect(this.musicGain);
                    bassOsc.start(t);
                    bassOsc.stop(t + 0.105);
                }

                // 5. Arp Countermelody (Every 16th note)
                const aFreq = arpNotes[s];
                if (aFreq) {
                    const aOsc = this.ctx.createOscillator();
                    const aGain = this.ctx.createGain();
                    aOsc.type = 'triangle';
                    aOsc.frequency.setValueAtTime(aFreq, t);
                    aGain.gain.setValueAtTime(0.08, t);
                    aGain.gain.linearRampToValueAtTime(0.0001, t + 0.09);
                    aOsc.connect(aGain);
                    aGain.connect(this.musicGain);
                    aOsc.start(t);
                    aOsc.stop(t + 0.095);
                }

                // 6. Lead Melody
                if (leadNotes[s]) {
                    const mFreq = leadNotes[s];
                    const mOsc = this.ctx.createOscillator();
                    const mGain = this.ctx.createGain();
                    mOsc.type = 'square';
                    mOsc.frequency.setValueAtTime(mFreq, t);
                    mGain.gain.setValueAtTime(0.12, t);
                    mGain.gain.linearRampToValueAtTime(0.0001, t + 0.18);
                    mOsc.connect(mGain);
                    mGain.connect(this.musicGain);
                    mOsc.start(t);
                    mOsc.stop(t + 0.19);
                }
            } catch (e) {}
        }, 115);
    }

    stopMusic() {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    playBGM() {
        this.startMusic();
    }

    stopBGM() {
        this.stopMusic();
    }

    playVictory() {
        if (!this.ctx) return;
        this.stopMusic();
        this.resume();
        const t = this.ctx.currentTime;
        const notes = [
            { f: 523.25, d: 0.12 }, // C5
            { f: 659.25, d: 0.12 }, // E5
            { f: 783.99, d: 0.12 }, // G5
            { f: 1046.50, d: 0.28 },// C6
            { f: 880.00, d: 0.14 }, // A5
            { f: 1046.50, d: 0.50 } // C6 final
        ];
        let offset = 0;
        notes.forEach(n => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(n.f, t + offset);
            gain.gain.setValueAtTime(0.28, t + offset);
            gain.gain.linearRampToValueAtTime(0.0001, t + offset + n.d);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + offset);
            osc.stop(t + offset + n.d + 0.05);
            offset += n.d;
        });
        broadcastSFX('victory');
    }
}

const audio = new ArcadeAudio();

function broadcastSFX(sound, param = null) {
    const payload = JSON.stringify({ type: 'sfx', sound, param });
    dataChannels.forEach(ch => {
        if (ch && ch.readyState === 'open') {
            try { ch.send(payload); } catch (e) {}
        }
    });
}

// Desbloqueo y gestión global de audio en cualquier interacción
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
            audio.toggleMute();
            if (!audio.isMuted) audio.playBeep();
        });
    }
});

// ==============================================================
// 🏁 Configuración de Dificultad Dinámica (Easy / Normal / Hard)
// ==============================================================
const DIFFICULTY_CONFIG = {
    easy: {
        id: 'easy',
        label: 'FÁCIL',
        color: '#3dff8a',
        initialTime: 25,
        checkpointBonus: 20,
        trafficCountMult: 0.65,
        trafficSpeedMult: 0.85,
        centrifugal: 0.16,
        offRoadDecel: 2600,
        scoreMultiplier: 1.0,
        laneChangeFreq: 0.5
    },
    normal: {
        id: 'normal',
        label: 'NORMAL',
        color: '#ffb703',
        initialTime: 25,
        checkpointBonus: 20,
        trafficCountMult: 1.0,
        trafficSpeedMult: 1.0,
        centrifugal: 0.22,
        offRoadDecel: 4200,
        scoreMultiplier: 1.25,
        laneChangeFreq: 1.0
    },
    hard: {
        id: 'hard',
        label: 'DIFÍCIL',
        color: '#ff4d6d',
        initialTime: 25,
        checkpointBonus: 20,
        trafficCountMult: 1.35,
        trafficSpeedMult: 1.2,
        centrifugal: 0.28,
        offRoadDecel: 6200,
        scoreMultiplier: 1.75,
        laneChangeFreq: 1.8
    }
};

// Estructura Piramidal de Rutas de OutRun (1986): 5 Etapas y 5 Metas (A, B, C, D, E)
const STAGE_SEGMENTS = 1200;

const ROUTE_TREE = [
    // Tier 0 (Etapa 1 - Inicio)
    [
        {
            id: 'coconut_beach',
            name: 'COCONUT BEACH',
            goalLetter: null,
            skyTop: '#ff4d6d',
            skyBottom: '#ffb703',
            sunColor: '#ffe66d',
            seaColor: '#0a3d62',
            mountains: '#2f3640',
            grassLight: '#1b8a47',
            grassDark: '#136e37',
            curbLight: '#ffffff',
            curbDark: '#d63031',
            roadLight: '#444444',
            roadDark: '#3b3b3b',
            spriteTheme: 'palm',
            curves: (s) => (s > 120 && s < 300 ? 1.8 : (s > 360 && s < 540 ? -2.0 : (s > 620 && s < 780 ? 2.1 : (s > 840 && s < 980 ? -1.7 : 0))))
        }
    ],
    // Tier 1 (Etapa 2 - 2 rutas)
    [
        {
            id: 'desert_dunes',
            name: 'DESERT DUNES',
            goalLetter: null,
            skyTop: '#d35400',
            skyBottom: '#f39c12',
            sunColor: '#fff275',
            seaColor: '#a04000',
            mountains: '#6e2c00',
            grassLight: '#c28b38',
            grassDark: '#ab772a',
            curbLight: '#ffffff',
            curbDark: '#e67e22',
            roadLight: '#48443e',
            roadDark: '#3d3a35',
            spriteTheme: 'cactus',
            curves: (s) => (s > 120 && s < 280 ? -2.2 : (s > 340 && s < 520 ? 2.4 : (s > 600 && s < 760 ? -2.3 : (s > 820 && s < 980 ? 2.1 : 0))))
        },
        {
            id: 'alpine_valley',
            name: 'ALPINE VALLEY',
            goalLetter: null,
            skyTop: '#0984e3',
            skyBottom: '#74b9ff',
            sunColor: '#ffffff',
            seaColor: '#2d3436',
            mountains: '#636e72',
            grassLight: '#2ed573',
            grassDark: '#26af61',
            curbLight: '#ffffff',
            curbDark: '#ff4757',
            roadLight: '#474747',
            roadDark: '#383838',
            spriteTheme: 'pine',
            curves: (s) => (s > 120 && s < 300 ? 2.3 : (s > 360 && s < 540 ? -2.5 : (s > 620 && s < 800 ? 2.4 : (s > 860 && s < 980 ? -2.2 : 0))))
        }
    ],
    // Tier 2 (Etapa 3 - 3 rutas)
    [
        {
            id: 'ancient_ruins',
            name: 'ANCIENT RUINS',
            goalLetter: null,
            skyTop: '#e17055',
            skyBottom: '#fdcb6e',
            sunColor: '#ffeaa7',
            seaColor: '#d63031',
            mountains: '#b2bec3',
            grassLight: '#b8a07e',
            grassDark: '#998365',
            curbLight: '#ffeaa7',
            curbDark: '#d63031',
            roadLight: '#534e4a',
            roadDark: '#44403c',
            spriteTheme: 'column',
            curves: (s) => (s > 120 && s < 290 ? -2.4 : (s > 350 && s < 530 ? 2.3 : (s > 610 && s < 780 ? -2.5 : (s > 840 && s < 980 ? 2.2 : 0))))
        },
        {
            id: 'devils_canyon',
            name: "DEVIL'S CANYON",
            goalLetter: null,
            skyTop: '#c0392b',
            skyBottom: '#e67e22',
            sunColor: '#f1c40f',
            seaColor: '#962d22',
            mountains: '#78281f',
            grassLight: '#a04000',
            grassDark: '#873600',
            curbLight: '#f39c12',
            curbDark: '#c0392b',
            roadLight: '#423735',
            roadDark: '#352c2a',
            spriteTheme: 'rock',
            curves: (s) => (s > 120 && s < 280 ? 2.6 : (s > 340 && s < 500 ? -2.7 : (s > 580 && s < 750 ? 2.5 : (s > 820 && s < 980 ? -2.4 : 0))))
        },
        {
            id: 'winding_vineyards',
            name: 'WINDING VINEYARDS',
            goalLetter: null,
            skyTop: '#6c5ce7',
            skyBottom: '#a29bfe',
            sunColor: '#ffeaa7',
            seaColor: '#4834d4',
            mountains: '#2d3436',
            grassLight: '#6ab04c',
            grassDark: '#487e31',
            curbLight: '#ffffff',
            curbDark: '#6c5ce7',
            roadLight: '#3d444a',
            roadDark: '#32373c',
            spriteTheme: 'pine',
            curves: (s) => (s > 120 && s < 290 ? -2.3 : (s > 360 && s < 540 ? 2.4 : (s > 620 && s < 790 ? -2.2 : (s > 850 && s < 980 ? 2.3 : 0))))
        }
    ],
    // Tier 3 (Etapa 4 - 4 rutas)
    [
        {
            id: 'autobahn_highway',
            name: 'AUTOBAHN HIGHWAY',
            goalLetter: null,
            skyTop: '#2d3436',
            skyBottom: '#636e72',
            sunColor: '#dfe6e9',
            seaColor: '#1e272e',
            mountains: '#2f3542',
            grassLight: '#57606f',
            grassDark: '#2f3542',
            curbLight: '#ffa502',
            curbDark: '#ff4757',
            roadLight: '#333333',
            roadDark: '#262626',
            spriteTheme: 'city',
            curves: (s) => (s > 140 && s < 320 ? 1.9 : (s > 400 && s < 580 ? -2.0 : (s > 660 && s < 820 ? 1.8 : (s > 880 && s < 980 ? -1.7 : 0))))
        },
        {
            id: 'seaside_blvd',
            name: 'SEASIDE BOULEVARD',
            goalLetter: null,
            skyTop: '#ff7675',
            skyBottom: '#fdcb6e',
            sunColor: '#ffeaa7',
            seaColor: '#0984e3',
            mountains: '#2d3436',
            grassLight: '#00b894',
            grassDark: '#009475',
            curbLight: '#ffffff',
            curbDark: '#d63031',
            roadLight: '#444444',
            roadDark: '#383838',
            spriteTheme: 'palm',
            curves: (s) => (s > 120 && s < 300 ? -2.5 : (s > 370 && s < 550 ? 2.4 : (s > 630 && s < 800 ? -2.3 : (s > 860 && s < 980 ? 2.2 : 0))))
        },
        {
            id: 'windmill_valley',
            name: 'WINDMILL VALLEY',
            goalLetter: null,
            skyTop: '#00cec9',
            skyBottom: '#81ecec',
            sunColor: '#ffeaa7',
            seaColor: '#0984e3',
            mountains: '#636e72',
            grassLight: '#2ecc71',
            grassDark: '#27ae60',
            curbLight: '#ffffff',
            curbDark: '#e74c3c',
            roadLight: '#4a4d45',
            roadDark: '#3d4039',
            spriteTheme: 'windmill',
            curves: (s) => (s > 120 && s < 290 ? 2.3 : (s > 360 && s < 530 ? -2.4 : (s > 610 && s < 780 ? 2.2 : (s > 850 && s < 980 ? -2.3 : 0))))
        },
        {
            id: 'neon_metropolis',
            name: 'NEON METROPOLIS',
            goalLetter: null,
            skyTop: '#2c003e',
            skyBottom: '#511845',
            sunColor: '#ff007f',
            seaColor: '#120129',
            mountains: '#1c0a35',
            grassLight: '#0f1b29',
            grassDark: '#08101a',
            curbLight: '#00f3ff',
            curbDark: '#ff00ea',
            roadLight: '#262933',
            roadDark: '#1e2029',
            spriteTheme: 'city',
            curves: (s) => (s > 120 && s < 280 ? -2.6 : (s > 350 && s < 520 ? 2.7 : (s > 600 && s < 770 ? -2.5 : (s > 840 && s < 980 ? 2.6 : 0))))
        }
    ],
    // Tier 4 (Etapa 5 - LAS 5 METAS: A, B, C, D, E)
    [
        {
            id: 'goal_a',
            name: 'PACIFIC PALISADES',
            goalLetter: 'A',
            skyTop: '#ff7979',
            skyBottom: '#f9ca24',
            sunColor: '#ffffff',
            seaColor: '#22a6b3',
            mountains: '#30336b',
            grassLight: '#badc58',
            grassDark: '#6ab04c',
            curbLight: '#ffffff',
            curbDark: '#eb4d4b',
            roadLight: '#535c68',
            roadDark: '#303952',
            spriteTheme: 'palm',
            curves: (s) => (s > 120 && s < 350 ? 2.1 : (s > 450 && s < 700 ? -2.0 : (s > 800 && s < 1050 ? 1.9 : 0)))
        },
        {
            id: 'goal_b',
            name: 'IMPERIAL GARDENS',
            goalLetter: 'B',
            skyTop: '#ff9ff3',
            skyBottom: '#feca57',
            sunColor: '#fff200',
            seaColor: '#54a0ff',
            mountains: '#5f27cd',
            grassLight: '#1dd1a1',
            grassDark: '#10ac84',
            curbLight: '#ffffff',
            curbDark: '#ff6b6b',
            roadLight: '#576574',
            roadDark: '#222f3e',
            spriteTheme: 'column',
            curves: (s) => (s > 120 && s < 350 ? -2.2 : (s > 450 && s < 700 ? 2.1 : (s > 800 && s < 1050 ? -1.9 : 0)))
        },
        {
            id: 'goal_c',
            name: 'CRYSTAL LAKE',
            goalLetter: 'C',
            skyTop: '#48dbfb',
            skyBottom: '#0abde3',
            sunColor: '#ffffff',
            seaColor: '#006266',
            mountains: '#2c3a47',
            grassLight: '#2ed573',
            grassDark: '#26af61',
            curbLight: '#ffffff',
            curbDark: '#ee5253',
            roadLight: '#474747',
            roadDark: '#383838',
            spriteTheme: 'pine',
            curves: (s) => (s > 120 && s < 350 ? 2.3 : (s > 450 && s < 700 ? -2.2 : (s > 800 && s < 1050 ? 2.1 : 0)))
        },
        {
            id: 'goal_d',
            name: 'NEO TOKYO SKYWAY',
            goalLetter: 'D',
            skyTop: '#341f97',
            skyBottom: '#5f27cd',
            sunColor: '#ff007f',
            seaColor: '#10ac84',
            mountains: '#222f3e',
            grassLight: '#1e272e',
            grassDark: '#0a0d10',
            curbLight: '#00d2d3',
            curbDark: '#ff9f43',
            roadLight: '#2d3436',
            roadDark: '#1e2e2e',
            spriteTheme: 'city',
            curves: (s) => (s > 120 && s < 350 ? -2.5 : (s > 450 && s < 700 ? 2.4 : (s > 800 && s < 1050 ? -2.3 : 0)))
        },
        {
            id: 'goal_e',
            name: 'SUNSET HORIZON',
            goalLetter: 'E',
            skyTop: '#ee5253',
            skyBottom: '#ff9f43',
            sunColor: '#feca57',
            seaColor: '#833471',
            mountains: '#2c2c54',
            grassLight: '#d35400',
            grassDark: '#ba4a00',
            curbLight: '#f1c40f',
            curbDark: '#c0392b',
            roadLight: '#3d3d3d',
            roadDark: '#2d2d2d',
            spriteTheme: 'palm',
            curves: (s) => (s > 120 && s < 350 ? 2.6 : (s > 450 && s < 700 ? -2.5 : (s > 800 && s < 1050 ? 2.4 : 0)))
        }
    ]
];

// Estado General del Juego
const GameState = {
    difficulty: 'normal',      // 'easy' | 'normal' | 'hard'
    score: 0,
    highScore: 0,
    timeLeft: 25,
    checkpointsCleared: 0,
    currentTier: 0,            // 0 = Coconut Beach, 1 = Tier 2, ..., 4 = Tier 5 (Goals A-E)
    currentRouteIndex: 0,       // Índice en el tier actual
    routePath: [{ tier: 0, index: 0 }],
    currentStage: null,
    gameWon: false,
    stageCleared: false,
    running: false,
    gameOver: false,
    adPlaying: false,
    paused: false,
    lastTime: 0,
    lastWarningSecond: -1,
    forkWarned: false,
    currentNickname: 'DRIVER',
    roomId: Math.random().toString(36).substring(2, 6).toUpperCase(),

    // Física del Jugador
    playerX: 0,           // -1 (borde izquierdo) a +1 (borde derecho de la pista)
    playerZ: 0,           // Posición absoluta en la pista
    speed: 0,             // Velocidad actual en px/segundo
    maxSpeed: 12000,      // Velocidad máxima estándar (~240 KM/H)
    turboSpeed: 14500,    // Velocidad con Turbo activado (~290 KM/H)
    accel: 6800,          // Aceleración rápida y reactiva
    braking: 10500,       // Frenado con pedal
    decel: 800,           // Desaceleración suave al soltar gas (no frena de golpe)
    offRoadDecel: 4200,   // Resistencia en pasto/arena (no frena a 0)
    centrifugal: 0.22,    // Fuerza centrífuga en curvas
    skyOffset: 0,         // Parallax del cielo
    shakeAmount: 0,       // Efecto temblor por choque o offroad

    // Controles (soporta móvil WebRTC y teclado de escritorio)
    input: {
        steer: 0,         // -1 a +1
        gas: false,
        brake: false,
        turbo: false
    },

    // Notificaciones en pantalla
    banner: {
        text: '',
        subtext: '',
        color: '#ffb703',
        timer: 0
    },

    // Efectos Visuales y Jugabilidad
    invulnerableTimer: 0, // Tiempo de gracia / invulnerabilidad tras choque
    smokeParticles: [],   // Partículas de humo, derrape y chispas
    turboFlameTimer: 0,   // Efecto visual de llamas de nitro en escapes

    // Pista y Tráfico
    segments: [],
    trackLength: 0,
    cars: []
};

// ==============================================================
// 🎨 Utilidades de Color e Interpolación para Transiciones Suaves
// ==============================================================
function parseColor(str) {
    if (!str) return { r: 100, g: 100, b: 100 };
    if (str.startsWith('#')) {
        let hex = str.slice(1);
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const num = parseInt(hex, 16);
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }
    const match = str.match(/\d+/g);
    if (match && match.length >= 3) {
        return { r: parseInt(match[0]), g: parseInt(match[1]), b: parseInt(match[2]) };
    }
    return { r: 100, g: 100, b: 100 };
}

function lerpColor(c1, c2, t) {
    const p1 = parseColor(c1);
    const p2 = parseColor(c2);
    const r = Math.round(p1.r + (p2.r - p1.r) * t);
    const g = Math.round(p1.g + (p2.g - p1.g) * t);
    const b = Math.round(p1.b + (p2.b - p1.b) * t);
    return `rgb(${r},${g},${b})`;
}

// ==============================================================
// 🎛️ Selector y Gestión de Dificultad
// ==============================================================
function setDifficulty(level, broadcast = false) {
    if (!DIFFICULTY_CONFIG[level]) level = 'normal';
    GameState.difficulty = level;
    const cfg = DIFFICULTY_CONFIG[level];
    GameState.centrifugal = cfg.centrifugal;
    GameState.offRoadDecel = cfg.offRoadDecel;

    // Actualizar indicador en HUD
    const diffBadge = document.getElementById('diff-badge');
    if (diffBadge) {
        diffBadge.textContent = cfg.label;
        diffBadge.style.color = cfg.color;
        diffBadge.style.borderColor = cfg.color;
    }

    // Actualizar botones en el overlay de espera
    ['easy', 'normal', 'hard'].forEach(k => {
        const btn = document.getElementById(`diff-${k}`);
        if (btn) {
            if (k === level) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });

    // Actualizar contador de tiempo inicial en HUD si el juego no está corriendo
    if (!GameState.running) {
        GameState.timeLeft = cfg.initialTime;
        if (timeCountElement) {
            timeCountElement.textContent = cfg.initialTime.toString().padStart(2, '0');
        }
    }

    if (broadcast) {
        broadcastToControllers({ type: 'difficulty_changed', difficulty: level });
    }
}

// ==============================================================
// 🛣️ Construcción Continua de Etapas y Bifurcaciones sin Cortes
// ==============================================================
function createStageSegments(tier, routeIndex, startSegIndex, prevStage = null, transitionChoice = null, startWorldY = 0) {
    const stage = ROUTE_TREE[tier][routeIndex];
    const leftNext = (tier < 4) ? ROUTE_TREE[tier + 1][routeIndex] : null;
    const rightNext = (tier < 4) ? ROUTE_TREE[tier + 1][routeIndex + 1] : null;

    const segments = [];
    const stageTotalLen = (tier < 4) ? 1360 : 1240;
    const transitionLen = (prevStage && transitionChoice !== null) ? 120 : 0;
    const forkStartRel = 1040; // a los 1040 segmentos relativos (~208,000 px)
    const checkpointRel = 1200; // a los 1200 segmentos relativos (~240,000 px)

    for (let s = 0; s < stageTotalLen; s++) {
        const i = startSegIndex + s;
        const alt = Math.floor(i / 3) % 2 === 0;

        let curve = stage.curves ? stage.curves(s) : 0;

        // 1. La bifurcación y la zona de transición son completamente rectas para evitar cruces o deformaciones visuales
        if ((tier < 4 && s >= forkStartRel - 25) || s < transitionLen) {
            curve = 0;
        }

        // 2. Carretera nivelada en elevación constante (evita cambios de cámara bruscos, distorsiones y efecto de vista interior)
        const segWorldY1 = 0;
        const segWorldY2 = 0;

        let isTransition = false;
        let chosenRoadCenter = 0;
        let chosenRoadWidth = 1.0;
        let otherRoadCenter = 999;
        let forkProgress = 0;
        let isCheckpoint = (s === checkpointRel);

        let grassCol = alt ? stage.grassLight : stage.grassDark;
        let curbCol = alt ? stage.curbLight : stage.curbDark;
        let roadCol = alt ? stage.roadLight : stage.roadDark;
        let laneCol = alt ? '#ffffff' : 'transparent';

        let envColors = {
            skyTop: stage.skyTop,
            skyBottom: stage.skyBottom,
            sunColor: stage.sunColor,
            seaColor: stage.seaColor,
            mountains: stage.mountains
        };

        const sprites = [];

        // 1. ZONA DE TRANSICIÓN POST-CHECKPOINT (Sin corte: la salida elegida se centra y la otra se desvanece suavemente)
        if (s < transitionLen && prevStage && transitionChoice !== null) {
            isTransition = true;
            forkProgress = 1.0; // Conecta geométricamente al 100% con la salida de bifurcación
            const t = s / transitionLen;
            const blend = t * t * (3 - 2 * t); // Smoothstep

            if (transitionChoice === 0) {
                // Se eligió la salida izquierda: la calzada izquierda se centra suavemente de -1.35 a 0.0
                chosenRoadCenter = -1.35 * (1 - blend);
                chosenRoadWidth = 0.85 + 0.15 * blend;
                otherRoadCenter = 1.35 + (blend * 2.85); // la salida derecha se curva y sale de pantalla
            } else {
                // Se eligió la salida derecha: la calzada derecha se centra suavemente de +1.35 a 0.0
                chosenRoadCenter = 1.35 * (1 - blend);
                chosenRoadWidth = 0.85 + 0.15 * blend;
                otherRoadCenter = -1.35 - (blend * 2.85); // la salida izquierda se curva y sale de pantalla
            }

            // Interpolación continua y suave de colores de bioma y cielo
            grassCol = lerpColor(alt ? prevStage.grassLight : prevStage.grassDark, alt ? stage.grassLight : stage.grassDark, blend);
            curbCol = lerpColor(alt ? prevStage.curbLight : prevStage.curbDark, alt ? stage.curbLight : stage.curbDark, blend);
            roadCol = lerpColor(alt ? prevStage.roadLight : prevStage.roadDark, alt ? stage.roadLight : stage.roadDark, blend);
            laneCol = alt ? (blend < 0.45 ? '#ffeaa7' : '#ffffff') : 'transparent';

            envColors.skyTop = lerpColor(prevStage.skyTop, stage.skyTop, blend);
            envColors.skyBottom = lerpColor(prevStage.skyBottom, stage.skyBottom, blend);
            envColors.sunColor = lerpColor(prevStage.sunColor || '#ffffff', stage.sunColor || '#ffffff', blend);
            envColors.mountains = lerpColor(prevStage.mountains, stage.mountains, blend);
            if (prevStage.seaColor && stage.seaColor) {
                envColors.seaColor = lerpColor(prevStage.seaColor, stage.seaColor, blend);
            }

            // Vegetación transicional en ambos pastos exteriores sin invadir las calzadas
            const chosenSide = (transitionChoice === 0) ? -1 : 1;
            if (s % 6 === 0) {
                const theme = blend < 0.5 ? prevStage.spriteTheme : stage.spriteTheme;
                if (blend < 0.6) {
                    sprites.push({
                        type: theme,
                        offset: chosenSide * (2.4 + (Math.random() * 0.2 - 0.1)),
                        forkBranch: 'chosen'
                    });
                    sprites.push({
                        type: theme,
                        offset: -chosenSide * (2.4 + (Math.random() * 0.2 - 0.1)),
                        forkBranch: 'other'
                    });
                } else {
                    sprites.push({
                        type: theme,
                        offset: -2.4 + (Math.random() * 0.2 - 0.1),
                        forkBranch: 'chosen'
                    });
                    sprites.push({
                        type: theme,
                        offset: 2.4 + (Math.random() * 0.2 - 0.1),
                        forkBranch: 'chosen'
                    });
                }
            }

            // Cartel de bienvenida y confirmación de nueva zona
            if (s === 40) {
                sprites.push({
                    type: transitionChoice === 0 ? 'fork_sign_left' : 'fork_sign_right',
                    offset: chosenSide * 2.3,
                    forkBranch: 'chosen',
                    label: stage.name,
                    sublabel: 'ZONA ALCANZADA'
                });
            }
        } else if (isCheckpoint) {
            // 2. ARCOS DE CHECKPOINT (O META FINAL) - Mantienen separación perfecta sobre cada vía
            forkProgress = (tier < 4) ? 1.0 : 0;
            laneCol = (tier < 4) ? '#ffeaa7' : (alt ? '#ffffff' : 'transparent');
            if (tier === 4) {
                sprites.push({ type: 'finish_arch', offset: 0, goalLetter: stage.goalLetter });
            } else {
                sprites.push({ type: 'checkpoint_arch', offset: 0, label: leftNext.name, forkBranch: 'left' });
                sprites.push({ type: 'checkpoint_arch', offset: 0, label: rightNext.name, forkBranch: 'right' });
            }
        } else if (tier < 4 && s >= forkStartRel && s < checkpointRel) {
            // 3. ZONA DE BIFURCACIÓN CONTINUA (Apertura progresiva en dos salidas)
            const t = (s - forkStartRel) / (checkpointRel - forkStartRel);
            forkProgress = t * t * (3 - 2 * t);
            laneCol = '#ffeaa7';

            // Carteles de autopista en el pasto exterior
            if (s === forkStartRel + 20 || s === forkStartRel + 60) {
                sprites.push({
                    type: 'fork_sign_left',
                    offset: -2.3,
                    label: leftNext.name,
                    sublabel: '◄ SALIDA IZQ'
                });
                sprites.push({
                    type: 'fork_sign_right',
                    offset: 2.3,
                    label: rightNext.name,
                    sublabel: 'SALIDA DER ►'
                });
            } else if (s === forkStartRel + 40) {
                // Atenuador de choque reflectante en la mediana de pasto central
                sprites.push({
                    type: 'median_gore',
                    offset: 0,
                    forkBranch: 'median'
                });
            } else if (s === forkStartRel + 100) {
                sprites.push({
                    type: 'fork_sign_left',
                    offset: -2.3,
                    label: leftNext.name,
                    sublabel: '◄ SALIDA IZQ',
                    forkBranch: 'left'
                });
                sprites.push({
                    type: 'fork_sign_right',
                    offset: 2.3,
                    label: rightNext.name,
                    sublabel: 'SALIDA DER ►',
                    forkBranch: 'right'
                });
            }
        } else if (tier < 4 && s >= checkpointRel) {
            // Salidas continuas post-checkpoint (pre-elección) con vegetación coherente en bordes exteriores
            forkProgress = 1.0;
            laneCol = '#ffeaa7';
            if (s > checkpointRel && s % 6 === 0) {
                sprites.push({
                    type: stage.spriteTheme,
                    offset: -2.4 + (Math.random() * 0.2 - 0.1),
                    forkBranch: 'left'
                });
                sprites.push({
                    type: stage.spriteTheme,
                    offset: 2.4 + (Math.random() * 0.2 - 0.1),
                    forkBranch: 'right'
                });
            }
        } else {
            // 4. CARRETERA REGULAR
            // Chevrons de curva reflectantes en el pasto exterior
            if (Math.abs(curve) >= 2.0 && (s % 8 === 0)) {
                sprites.push({
                    type: curve > 0 ? 'curve_sign_right' : 'curve_sign_left',
                    offset: curve > 0 ? -2.3 : 2.3
                });
            }
            // Señales de límite de velocidad en el pasto exterior
            if (s % 250 === 40) {
                sprites.push({
                    type: 'speed_sign',
                    offset: 2.3
                });
            }
            // Vegetación y elementos temáticos principales en ambos márgenes
            if (s % 6 === 0) {
                const side = (Math.floor(s / 6) % 2 === 0) ? -2.4 : 2.4;
                sprites.push({
                    type: stage.spriteTheme,
                    offset: side + (Math.random() * 0.25 - 0.12)
                });
            }
            // Detalles secundarios variados para enriquecer el paisaje lateral
            if (s % 18 === 9) {
                const altSide = (Math.floor(s / 18) % 2 === 0) ? 2.75 : -2.75;
                let secType = 'bush';
                if (stage.spriteTheme === 'palm') secType = (s % 36 === 9) ? 'beach_umbrella' : 'bush';
                else if (stage.spriteTheme === 'cactus') secType = (s % 36 === 9) ? 'rock' : 'bush';
                else if (stage.spriteTheme === 'pine') secType = 'flower_bush';
                else if (stage.spriteTheme === 'rock') secType = 'cactus';
                else if (stage.spriteTheme === 'windmill' || stage.spriteTheme === 'column') secType = 'flower_bush';
                else if (stage.spriteTheme === 'city') secType = (s % 36 === 9) ? 'city_billboard' : 'bush';
                sprites.push({
                    type: secType,
                    offset: altSide + (Math.random() * 0.2 - 0.1)
                });
            }
        }

        segments.push({
            index: i,
            stageIndex: s,
            stage: stage,
            tier: tier,
            routeIndex: routeIndex,
            isCheckpoint: isCheckpoint,
            isTransition: isTransition,
            chosenRoadCenter: chosenRoadCenter,
            chosenRoadWidth: chosenRoadWidth,
            otherRoadCenter: otherRoadCenter,
            forkProgress: forkProgress,
            env: envColors,
            p1: { world: { x: 0, y: segWorldY1, z: i * SEGMENT_LENGTH }, camera: {}, screen: {} },
            p2: { world: { x: 0, y: segWorldY2, z: (i + 1) * SEGMENT_LENGTH }, camera: {}, screen: {} },
            curve: curve,
            color: {
                grass: grassCol,
                curb: curbCol,
                road: roadCol,
                lane: laneCol
            },
            sprites: sprites,
            sprite: sprites[0] || null
        });
    }

    return segments;
}

function buildInitialTrack() {
    GameState.currentTier = 0;
    GameState.currentRouteIndex = 0;
    GameState.currentStage = ROUTE_TREE[0][0];
    GameState.stageCleared = false;
    GameState.forkWarned = false;

    // Generar Stage 1 continuo inicial
    GameState.segments = createStageSegments(0, 0, 0, null, null, 0);
    GameState.trackLength = GameState.segments.length * SEGMENT_LENGTH;
    spawnTraffic(0);
}

function appendNextStage(nextTier, nextRouteIndex, choice, checkpointIndex) {
    const prevStage = GameState.currentStage;
    const nextStage = ROUTE_TREE[nextTier][nextRouteIndex];
    GameState.currentStage = nextStage;
    GameState.currentTier = nextTier;
    GameState.currentRouteIndex = nextRouteIndex;
    GameState.stageCleared = false;
    GameState.forkWarned = false;

    // Preservar intacto el segmento del checkpoint (checkpointIndex) con sus arcos para que el jugador pase por debajo sin cortes,
    // y comenzar la transición fluida y el empalme a partir de checkpointIndex + 1
    const startNewIdx = checkpointIndex + 1;
    const prevSeg = GameState.segments[checkpointIndex] || GameState.segments[checkpointIndex - 1];
    const lastY = (prevSeg && prevSeg.p2 && prevSeg.p2.world) ? prevSeg.p2.world.y : 0;

    // Generar la nueva etapa a partir de startNewIdx conectando suavemente sin corte
    const newSegments = createStageSegments(nextTier, nextRouteIndex, startNewIdx, prevStage, choice, lastY);
    
    // Reemplazar los segmentos posteriores al checkpoint
    const deleteCount = Math.max(0, GameState.segments.length - startNewIdx);
    GameState.segments.splice(startNewIdx, deleteCount, ...newSegments);
    GameState.trackLength = GameState.segments.length * SEGMENT_LENGTH;

    // Mantener los autos en pantalla sin eliminarlos de golpe para máxima continuidad
    spawnTrafficForStage(nextTier, startNewIdx * SEGMENT_LENGTH);
}

function spawnTrafficForStage(tier, startZ) {
    const diffCfg = DIFFICULTY_CONFIG[GameState.difficulty] || DIFFICULTY_CONFIG.normal;
    const carTypes = ['blue_coupe', 'yellow_cab', 'white_truck', 'green_gt', 'purple_muscle'];
    const baseCounts = [8, 10, 12, 14, 16];
    const targetCount = Math.max(4, Math.round(baseCounts[Math.min(tier, baseCounts.length - 1)] * diffCfg.trafficCountMult));

    // Mantener los vehículos que están adelante para evitar desapariciones bruscas
    const existingAheadCars = GameState.cars.filter(car => {
        let relZ = car.z - GameState.playerZ;
        if (relZ < -GameState.trackLength / 2) relZ += GameState.trackLength;
        if (relZ > GameState.trackLength / 2) relZ -= GameState.trackLength;
        return relZ > 400 && relZ < (DRAW_DISTANCE * SEGMENT_LENGTH);
    });

    GameState.cars = existingAheadCars;

    // Espaciar vehículos adicionales más allá de la zona de transición (+18,000 px por delante del checkpoint)
    const safeZ = startZ + 18000;
    const availableTrack = GameState.trackLength - safeZ - 8000;
    const needed = Math.max(0, targetCount - GameState.cars.length);
    const waveSpacing = needed > 0 ? Math.max(6000, availableTrack / needed) : 7000;

    const lanes = [-0.6, 0, 0.6];
    let lastLane = 1;

    for (let i = 0; i < needed; i++) {
        const zPos = safeZ + (i * waveSpacing) + (Math.random() * 800 - 400);
        let laneIndex;
        do {
            laneIndex = Math.floor(Math.random() * lanes.length);
        } while (laneIndex === lastLane && Math.random() < 0.8);
        lastLane = laneIndex;
        const laneOffset = lanes[laneIndex];

        const type = carTypes[i % carTypes.length];
        let baseSpeed = 3000;
        if (type === 'white_truck') baseSpeed = 2400;
        else if (type === 'yellow_cab') baseSpeed = 2800;
        else if (type === 'blue_coupe') baseSpeed = 3200;
        else if (type === 'purple_muscle') baseSpeed = 3600;
        else if (type === 'green_gt') baseSpeed = 4000;

        const adjustedSpeed = (baseSpeed * diffCfg.trafficSpeedMult) + (Math.random() * 200 - 100);

        GameState.cars.push({
            type: type,
            z: zPos % GameState.trackLength,
            offset: laneOffset,
            targetOffset: laneOffset,
            laneChangeTimer: (14 + Math.random() * 10) / diffCfg.laneChangeFreq,
            speed: adjustedSpeed,
            passed: false
        });
    }

    GameState.cars.sort((a, b) => a.z - b.z);
}

function buildStageTrack(tier = 0, routeIndex = 0) {
    buildInitialTrack();
}

function buildTrack() {
    buildInitialTrack();
}

// Generación Inteligente de Tráfico Rival con Escalado de Dificultad
function spawnTraffic(tier = 0) {
    GameState.cars = [];
    const diffCfg = DIFFICULTY_CONFIG[GameState.difficulty] || DIFFICULTY_CONFIG.normal;
    const carTypes = ['blue_coupe', 'yellow_cab', 'white_truck', 'green_gt', 'purple_muscle'];
    
    // Conteo escalado según la dificultad seleccionada
    const baseCounts = [8, 10, 12, 14, 16];
    const count = Math.max(4, Math.round(baseCounts[Math.min(tier, baseCounts.length - 1)] * diffCfg.trafficCountMult));

    // Zona de salida amplia y libre: NINGÚN vehículo en los primeros 9,000 px
    const startSafeZ = 9000;
    const availableTrack = GameState.trackLength - startSafeZ - 8000;
    const waveSpacing = availableTrack / count;

    const lanes = [-0.6, 0, 0.6];
    let lastLane = 1;

    for (let i = 0; i < count; i++) {
        const zPos = startSafeZ + (i * waveSpacing) + (Math.random() * 800 - 400);

        // Alternar carriles para que nunca se amontonen en el mismo carril
        let laneIndex;
        do {
            laneIndex = Math.floor(Math.random() * lanes.length);
        } while (laneIndex === lastLane && Math.random() < 0.8);
        lastLane = laneIndex;
        const laneOffset = lanes[laneIndex];

        const type = carTypes[i % carTypes.length];
        
        let baseSpeed = 3000;
        if (type === 'white_truck') baseSpeed = 2400;      // Camión pesado (el más lento)
        else if (type === 'yellow_cab') baseSpeed = 2800;   // Taxi / Escarabajo
        else if (type === 'blue_coupe') baseSpeed = 3200;   // Cupé clásico
        else if (type === 'purple_muscle') baseSpeed = 3600;// Muscle car
        else if (type === 'green_gt') baseSpeed = 4000;     // GT deportivo

        const adjustedSpeed = (baseSpeed * diffCfg.trafficSpeedMult) + (Math.random() * 200 - 100);

        GameState.cars.push({
            type: type,
            z: zPos % GameState.trackLength,
            offset: laneOffset,
            targetOffset: laneOffset,
            laneChangeTimer: (14 + Math.random() * 10) / diffCfg.laneChangeFreq,
            speed: adjustedSpeed,
            passed: false
        });
    }

    GameState.cars.sort((a, b) => a.z - b.z);
}

// Reubica un vehículo siempre MUCHO MÁS ADELANTE en el horizonte (nunca aparece ni sale desde atrás)
function recycleCarAhead(car) {
    const lanes = [-0.6, 0, 0.6];
    
    // Distancia al horizonte por delante del jugador (entre 15,000 y 24,000 px por delante)
    // El límite visual es DRAW_DISTANCE * SEGMENT_LENGTH = 16,000 px, así nace más allá del horizonte
    let aheadDist = 15000 + Math.random() * 8000;
    let targetZ = (GameState.playerZ + aheadDist) % GameState.trackLength;
    
    // Comprobar que mantenga una separación de al menos 4,500 px respecto a cualquier otro vehículo
    let attempts = 0;
    while (attempts < 12) {
        let tooClose = false;
        for (let other of GameState.cars) {
            if (other === car) continue;
            let diff = Math.abs(targetZ - other.z);
            if (diff > GameState.trackLength / 2) diff = GameState.trackLength - diff;
            if (diff < 4500) {
                tooClose = true;
                break;
            }
        }
        if (!tooClose) break;
        targetZ = (targetZ + 5000) % GameState.trackLength;
        attempts++;
    }

    car.z = targetZ;
    car.passed = false;
    car.crashCooldown = 0;

    // Asignar carril despejado
    const randomLane = lanes[Math.floor(Math.random() * lanes.length)];
    car.offset = randomLane;
    car.targetOffset = randomLane;
    car.laneChangeTimer = 14 + Math.random() * 10;
}

// Calcula la posición lateral efectiva de un rival (idéntica en física de colisión y renderizado 2D)
function getCarEffectiveRoadX(car, carSeg) {
    if (!carSeg) return car.offset;
    const forkProg = carSeg.forkProgress || 0;
    if (carSeg.isTransition) {
        const roadCenter = carSeg.chosenRoadCenter || 0;
        const roadWScale = carSeg.chosenRoadWidth || 1.0;
        return roadCenter + (car.offset * roadWScale);
    } else if (forkProg > 0.05) {
        if (car.forkSide === undefined) {
            car.forkSide = (car.offset < 0) ? -1 : 1;
        }
        const branchSep = 1.35 * forkProg;
        const bWScale = 0.85 + 0.15 * (1 - forkProg);
        return (car.forkSide * branchSep) + (car.offset * 0.45 * bWScale);
    }
    car.forkSide = undefined;
    return car.offset;
}

// Sistema de Partículas de Humo de Neumáticos, Derrapes y Chispas
function createTireSmoke(x, y, count = 1, isCrash = false, customColor = null) {
    if (GameState.smokeParticles.length > 50) return;
    for (let i = 0; i < count; i++) {
        GameState.smokeParticles.push({
            x: x + (Math.random() - 0.5) * 8,
            y: y + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * (isCrash ? 4.0 : 1.8),
            vy: -Math.random() * 2.2 - 0.6,
            size: isCrash ? Math.random() * 6 + 4 : Math.random() * 4 + 2.5,
            alpha: isCrash ? 0.95 : 0.65,
            color: customColor || (isCrash ? (Math.random() < 0.5 ? '#ff4d6d' : '#ffa502') : 'rgba(240, 245, 255, 0.8)'),
            life: isCrash ? 28 : 20,
            maxLife: isCrash ? 28 : 20
        });
    }
}

function updateParticles(dt) {
    for (let i = GameState.smokeParticles.length - 1; i >= 0; i--) {
        const p = GameState.smokeParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.size += 0.22;
        p.life--;
        p.alpha = Math.max(0, p.life / p.maxLife);
        if (p.life <= 0) {
            GameState.smokeParticles.splice(i, 1);
        }
    }
}

// Proyección de Coordenadas 3D de Mundo a Pantalla 2D
function project3D(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
    if (!p || !p.world) return;
    p.camera = p.camera || {};
    p.screen = p.screen || {};
    p.camera.x = (p.world.x || 0) - cameraX;
    p.camera.y = (p.world.y || 0) - cameraY;
    p.camera.z = (p.world.z || 0) - cameraZ;

    p.screen.scale = cameraDepth / Math.max(1, p.camera.z);
    p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
    p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
    p.screen.w = Math.round(p.screen.scale * roadWidth * width / 2);
}

// Soporte para Controles de Teclado (Pruebas directas en navegador)
window.addEventListener('keydown', (e) => {
    audio.init();

    // En la pantalla de espera, permitir cambiar dificultad con teclas numéricas 1, 2, 3 o con tecla D
    if (!GameState.running && !GameState.gameOver) {
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
            setDifficulty('easy');
            audio.playBeep();
            return;
        }
        if (e.code === 'Digit2' || e.code === 'Numpad2') {
            setDifficulty('normal');
            audio.playBeep();
            return;
        }
        if (e.code === 'Digit3' || e.code === 'Numpad3') {
            setDifficulty('hard');
            audio.playBeep();
            return;
        }
        if (e.code === 'KeyD') {
            const next = GameState.difficulty === 'easy' ? 'normal' : (GameState.difficulty === 'normal' ? 'hard' : 'easy');
            setDifficulty(next);
            audio.playBeep();
            return;
        }
    }

    if (e.code === 'ArrowUp' || e.code === 'KeyW') GameState.input.gas = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') GameState.input.brake = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') GameState.input.steer = -1.0;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') GameState.input.steer = 1.0;
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') GameState.input.turbo = true;
    
    // Auto-iniciar juego al presionar tecla si está esperando
    if (!GameState.running && !GameState.gameOver) {
        playPreGameAdThenStart('DRIVER', () => startGame());
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') GameState.input.gas = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') GameState.input.brake = false;
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && GameState.input.steer < 0) GameState.input.steer = 0;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && GameState.input.steer > 0) GameState.input.steer = 0;
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') GameState.input.turbo = false;
});

// WebRTC Host & Señalización
const peerConnections = new Map();
const dataChannels = new Map();
let socket;

// ==========================================
// 📺 Sistema de Publicidad Pre-Juego
// ==========================================
function broadcastToControllers(msg) {
    const payload = JSON.stringify(msg);
    dataChannels.forEach(dc => {
        if (dc && dc.readyState === 'open') {
            try { dc.send(payload); } catch (_) {}
        }
    });
}

function requestAdVideo() {
    if (!cachedAdVideoUrl) {
        try {
            const urlAd = new URLSearchParams(window.location.search).get('adVideo');
            if (urlAd) cachedAdVideoUrl = decodeURIComponent(urlAd);
        } catch (_) {}
    }
    if (cachedAdVideoUrl) return Promise.resolve(cachedAdVideoUrl);
    if (adVideoPromise) return adVideoPromise;

    adVideoPromise = new Promise((resolve) => {
        if (cachedAdVideoUrl) return resolve(cachedAdVideoUrl);

        const sId = new URLSearchParams(window.location.search).get('screenId');
        const isDev = typeof window !== 'undefined' && (
            window.location.hostname.includes('dev') ||
            window.location.hostname.includes('staging') ||
            window.location.hostname.includes('test')
        );
        const videoServer = (typeof CONFIG !== 'undefined' && CONFIG.VIDEO_SERVER_URL)
            ? CONFIG.VIDEO_SERVER_URL
            : (isDev ? 'https://dev-videos.myplayad.com' : 'https://videos.myplayad.com');

        let settled = false;
        const finalize = (url) => {
            if (settled) return;
            settled = true;
            if (url) {
                cachedAdVideoUrl = url;
            } else {
                adVideoPromise = null;
            }
            resolve(cachedAdVideoUrl || null);
        };

        const msgHandler = (event) => {
            if (event.data && event.data.type === 'AD_VIDEO_RESPONSE') {
                window.removeEventListener('message', msgHandler);
                finalize(event.data.videoUrl || null);
            }
        };
        window.addEventListener('message', msgHandler);

        if (window.parent && window.parent !== window) {
            try { window.parent.postMessage({ type: 'GET_AD_VIDEO' }, '*'); } catch (_) {}
        }

        if (sId) {
            fetch(`${videoServer}/api/videos/${sId}`)
                .then(r => r.ok ? r.json() : null)
                .then(d => {
                    if (d && d.videos && d.videos.length > 0) {
                        const rawName = d.videos[0] || '';
                        const cleanName = rawName.split('/').pop();
                        const fullUrl = `${videoServer}/videos/${sId}/${encodeURIComponent(cleanName)}`;
                        finalize(fullUrl);
                    }
                })
                .catch(() => {});
        }

        setTimeout(() => {
            window.removeEventListener('message', msgHandler);
            finalize(cachedAdVideoUrl || null);
        }, 1200);
    });

    return adVideoPromise;
}

window.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'AD_VIDEO_RESPONSE') {
        if (event.data.videoUrl) {
            cachedAdVideoUrl = event.data.videoUrl;
        }
    }
});

function playPreGameAdThenStart(nickname, startGameCallback) {
    if (GameState.adPlaying) return;

    if (waitingOverlay) waitingOverlay.classList.add('hidden');
    if (gameOverOverlay) gameOverOverlay.classList.add('hidden');

    if (!adVideoOverlay || !adVideoPlayer) {
        broadcastToControllers({ type: 'game_start' });
        startGameCallback();
        return;
    }

    const startAdPlayback = (videoUrl) => {
        if (!videoUrl) {
            console.log('[ad] No hay video publicitario configurado. Arrancando partida de una.');
            broadcastToControllers({ type: 'game_start' });
            startGameCallback();
            return;
        }

        // SOLO avisar al celular si REALMENTE hay un video publicitario válido para reproducir
        broadcastToControllers({ type: 'ad_playing', nickname: nickname });

        GameState.adPlaying = true;
        if (adPilotName) adPilotName.textContent = `PILOTO: ${(nickname || 'DRIVER').toUpperCase()}`;
        if (adCountdown) adCountdown.textContent = 'INICIANDO...';
        adVideoOverlay.classList.remove('hidden');

        if (window.parent && window.parent !== window) {
            try { window.parent.postMessage({ type: 'GAME_AD_START' }, '*'); } catch (_) {}
        }

        let adFinished = false;
        let safetyTimer = null;

        const finishAd = () => {
            if (adFinished) return;
            adFinished = true;
            if (safetyTimer) clearTimeout(safetyTimer);

            adVideoPlayer.onended = null;
            adVideoPlayer.onerror = null;
            adVideoPlayer.ontimeupdate = null;

            try {
                adVideoPlayer.pause();
                adVideoPlayer.removeAttribute('src');
                adVideoPlayer.load();
            } catch (_) {}

            adVideoOverlay.classList.add('hidden');
            GameState.adPlaying = false;

            if (window.parent && window.parent !== window) {
                try { window.parent.postMessage({ type: 'GAME_AD_END' }, '*'); } catch (_) {}
            }

            broadcastToControllers({ type: 'game_start' });
            startGameCallback();
        };

        window._finishCurrentAd = finishAd;

        adVideoPlayer.onended = finishAd;
        adVideoPlayer.onerror = (err) => {
            console.warn('[ad] Error en video publicitario, omitiendo:', err);
            finishAd();
        };

        adVideoPlayer.ontimeupdate = () => {
            if (adVideoPlayer.duration && !isNaN(adVideoPlayer.duration)) {
                const remaining = Math.max(0, Math.ceil(adVideoPlayer.duration - adVideoPlayer.currentTime));
                if (adCountdown) adCountdown.textContent = `JUEGO EN: ${remaining}s`;
            }
        };

        adVideoPlayer.src = videoUrl;
        adVideoPlayer.currentTime = 0;
        adVideoPlayer.muted = false;

        const p = adVideoPlayer.play();
        if (p !== undefined) {
            p.catch(() => {
                console.warn('[ad] Autoplay con audio bloqueado, reintentando silenciado...');
                adVideoPlayer.muted = true;
                adVideoPlayer.play().catch(finishAd);
            });
        }

        safetyTimer = setTimeout(finishAd, 35000);
    };

    requestAdVideo().then((videoUrl) => {
        startAdPlayback(videoUrl);
    });
}

const signalingState = {
    shouldReconnect: true,
    manualClose: false,
    reconnectAttempts: 0,
    reconnectTimer: null,
    baseDelay: 1000,
    maxAttempts: 8
};

function getIceConfig() {
    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    const turnPublicIp = localStorage.getItem('TURN_PUBLIC_IP') || (CONFIG.TURN_PUBLIC_IP || '31.97.43.72');
    let turnUser = localStorage.getItem('TURN_USER') || (CONFIG.TURN_USERNAME || 'game');
    if (turnUser === 'user') turnUser = 'game';
    const turnPass = localStorage.getItem('TURN_PASS') || (CONFIG.TURN_PASS || 'changeme');

    if (turnPublicIp && turnUser && turnPass) {
        iceServers.push({
            urls: [
                `turn:${turnPublicIp}:3478?transport=udp`,
                `turn:${turnPublicIp}:3478?transport=tcp`,
                `turn:${turnPublicIp}:5349?transport=udp`,
                `turn:${turnPublicIp}:5349?transport=tcp`
            ],
            username: turnUser,
            credential: turnPass
        });
    }
    return { iceServers };
}

function loadTurnParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const turnIp = urlParams.get('turn_ip');
    const turnUser = urlParams.get('turn_user');
    const turnPass = urlParams.get('turn_pass');

    if (turnIp) localStorage.setItem('TURN_PUBLIC_IP', turnIp);
    if (turnUser) localStorage.setItem('TURN_USER', turnUser);
    if (turnPass) localStorage.setItem('TURN_PASS', turnPass);
}
window.addEventListener('load', loadTurnParams);

function setIceRouteText(text) {
    if (iceRouteElement) iceRouteElement.textContent = `ICE: ${text}`;
}

function refreshIceRoute(pc) {
    if (!pc) return;
    pc.getStats().then(stats => {
        let routeType = null;
        let selectedPair = null;
        let localCandidate = null;

        stats.forEach(report => {
            if (report.type === 'candidate-pair' && (report.selected || report.state === 'succeeded' || report.selectedCandidatePairId)) {
                selectedPair = report;
            }
        });

        if (selectedPair) {
            stats.forEach(report => {
                if (report.type === 'local-candidate' && report.id === selectedPair.localCandidateId) {
                    localCandidate = report;
                }
            });
            if (localCandidate) {
                routeType = localCandidate.candidateType === 'relay' ? 'TURN' : 'STUN';
            }
        }
        setIceRouteText(routeType || 'P2P');
    }).catch(() => setIceRouteText('ERR'));
}

function connectSignalingServer() {
    if (socket && socket.readyState === WebSocket.OPEN) return;

    const serverIp = CONFIG.SIGNALING_SERVER_IP || window.location.hostname;
    const serverPort = CONFIG.SIGNALING_SERVER_PORT || '8080';
    const serverUrl = CONFIG.SIGNALING_SERVER_URL || `${serverIp}:${serverPort}`;
    const signalingUrl = serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://')
        ? serverUrl
        : `wss://${serverUrl}`;

    updateQrCode();
    const currentSocket = socket = new WebSocket(signalingUrl);

    currentSocket.onopen = () => {
        if (socket !== currentSocket) return;
        if (roomIdElement) roomIdElement.textContent = `ID: ${GameState.roomId}`;
        socket.send(JSON.stringify({
            type: 'register',
            role: 'host',
            roomId: GameState.roomId,
            maxPlayers: CONFIG.MAX_PLAYERS || 1
        }));
    };

    currentSocket.onerror = (e) => console.error('Signaling error:', e);

    currentSocket.onclose = () => {
        if (socket !== currentSocket) return;
        if (signalingState.shouldReconnect && !signalingState.manualClose) {
            setTimeout(connectSignalingServer, 2000);
        }
    };

    currentSocket.onmessage = async (message) => {
        try {
            const data = JSON.parse(message.data);
            if (data.type === 'offer') {
                await handleOffer(data);
            } else if (data.type === 'candidate') {
                const pc = peerConnections.get(data.playerId);
                if (pc) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else if (data.type === 'controller_connected') {
                waitingOverlay.classList.add('hidden');
            } else if (data.type === 'controller_disconnected') {
                handleControllerDisconnect(data.playerId);
            }
        } catch (e) {
            console.error('Signaling parse error:', e);
        }
    };
}

function handleControllerDisconnect(playerId) {
    const pc = peerConnections.get(playerId);
    if (pc) pc.close();
    peerConnections.delete(playerId);
    dataChannels.delete(playerId);

    if (peerConnections.size === 0 && !GameState.gameOver) {
        waitingOverlay.classList.remove('hidden');
        GameState.running = false;
        audio.stopEngine();
    }
}

async function handleOffer(data) {
    const { playerId, type, sdp } = data;
    const pc = new RTCPeerConnection(getIceConfig());
    peerConnections.set(playerId, pc);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({
                type: 'candidate',
                candidate: event.candidate,
                playerId: playerId
            }));
        }
    };

    pc.ondatachannel = (event) => {
        const receiveChannel = event.channel;
        dataChannels.set(playerId, receiveChannel);

        receiveChannel.onmessage = (e) => {
            try {
                const input = JSON.parse(e.data);
                if (input.type === 'nickname' || input.type === 'join') {
                    if (input.difficulty && DIFFICULTY_CONFIG[input.difficulty]) {
                        setDifficulty(input.difficulty);
                    }
                    GameState.currentNickname = (input.value || input.nickname || 'DRIVER').toUpperCase().substring(0, 10);
                    if (playerNickElement) playerNickElement.textContent = `DRIVER: ${GameState.currentNickname}`;
                    playPreGameAdThenStart(GameState.currentNickname, () => startGame());
                } else if (input.type === 'set_difficulty') {
                    if (input.difficulty && DIFFICULTY_CONFIG[input.difficulty]) {
                        setDifficulty(input.difficulty);
                        audio.playBeep();
                    }
                } else {
                    handleMobileInput(input);
                }
            } catch (err) {}
        };

        receiveChannel.onopen = () => {
            waitingOverlay.classList.add('hidden');
            refreshIceRoute(pc);
        };

        receiveChannel.onclose = () => handleControllerDisconnect(playerId);
    };

    pc.oniceconnectionstatechange = () => refreshIceRoute(pc);
    pc.onconnectionstatechange = () => refreshIceRoute(pc);

    await pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.send(JSON.stringify({
        type: 'answer',
        sdp: answer.sdp,
        playerId: playerId
    }));
}

function handleMobileInput(input) {
    if (input.steer !== undefined) {
        GameState.input.steer = Math.max(-1, Math.min(1, input.steer));
    }
    if (input.gas !== undefined) GameState.input.gas = !!input.gas;
    if (input.brake !== undefined) GameState.input.brake = !!input.brake;
    if (input.turbo !== undefined) GameState.input.turbo = !!input.turbo;
}

function notifyGameOver(won = false, goal = null) {
    dataChannels.forEach(channel => {
        if (channel.readyState === 'open') {
            channel.send(JSON.stringify({
                type: 'game_over',
                score: Math.floor(GameState.score),
                checkpoints: GameState.checkpointsCleared,
                won: !!won,
                goal: goal
            }));
        }
    });
}

function showBanner(text, subtext = '', color = '#ffb703', duration = 2.0) {
    GameState.banner.text = text;
    GameState.banner.subtext = subtext;
    GameState.banner.color = color;
    GameState.banner.timer = duration;
}

function startGame() {
    audio.init();
    audio.playStartTune();
    audio.startMusic();
    const diffCfg = DIFFICULTY_CONFIG[GameState.difficulty] || DIFFICULTY_CONFIG.normal;
    GameState.score = 0;
    GameState.timeLeft = diffCfg.initialTime;
    GameState.centrifugal = diffCfg.centrifugal;
    GameState.offRoadDecel = diffCfg.offRoadDecel;
    GameState.checkpointsCleared = 0;
    GameState.currentTier = 0;
    GameState.currentRouteIndex = 0;
    GameState.routePath = [{ tier: 0, index: 0 }];
    GameState.gameWon = false;
    GameState.stageCleared = false;
    GameState.playerX = 0;
    GameState.playerZ = 0;
    GameState.speed = 0;
    GameState.gameOver = false;
    GameState.running = true;
    GameState.lastWarningSecond = -1;
    GameState.invulnerableTimer = 0;
    GameState.smokeParticles = [];
    GameState.turboFlameTimer = 0;
    GameState.lastRoadCenter = null;

    buildStageTrack(0, 0);
    updateHUD();
    const stage0 = ROUTE_TREE[0][0];
    showBanner('STAGE 1', stage0.name, '#3dff8a', 2.5);

    gameOverOverlay.classList.add('hidden');
    waitingOverlay.classList.add('hidden');
}

function endGame(won = false, goal = null) {
    GameState.gameOver = true;
    GameState.running = false;
    audio.stopBGM();
    audio.stopEngine();
    if (!won) {
        audio.playGameOver();
    }

    const finalScore = Math.floor(GameState.score);
    if (finalScoreText) finalScoreText.textContent = `FINAL SCORE: ${finalScore.toString().padStart(5, '0')}`;
    if (checkpointsClearedText) checkpointsClearedText.textContent = `CHECKPOINTS: ${GameState.checkpointsCleared}`;

    notifyGameOver(won, goal);
    submitScore(GameState.currentNickname, finalScore);

    dataChannels.forEach(ch => ch.close());
    peerConnections.forEach(pc => pc.close());
    dataChannels.clear();
    peerConnections.clear();

    // Vuelve inmediatamente a la pantalla de espera con el QR y se queda allí
    gameOverOverlay.classList.add('hidden');
    waitingOverlay.classList.remove('hidden');

    GameState.currentNickname = 'DRIVER';
    if (playerNickElement) playerNickElement.textContent = 'DRIVER: ----';
    GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    if (roomIdElement) roomIdElement.textContent = `ID: ${GameState.roomId}`;
    updateQrCode();

    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'register',
            role: 'host',
            roomId: GameState.roomId,
            maxPlayers: CONFIG.MAX_PLAYERS || 1
        }));
    }

    // Reset de pista a Stage 1 inicial para que la pantalla de fondo muestre Coconut Beach
    buildStageTrack(0, 0);
    GameState.playerZ = 0;
    GameState.playerX = 0;
    GameState.speed = 0;
    updateHUD();
}

// Bucle de Física y Actualización
function update(dt) {
    if (!GameState.running || GameState.gameOver) return;

    // Temporizador Time Attack
    GameState.timeLeft -= dt;
    if (GameState.timeLeft <= 0) {
        GameState.timeLeft = 0;
        updateHUD();
        endGame();
        return;
    }

    // Alerta sonora en los últimos 10 segundos
    const currentSec = Math.floor(GameState.timeLeft);
    if (currentSec <= 10 && currentSec !== GameState.lastWarningSecond) {
        GameState.lastWarningSecond = currentSec;
        audio.playWarningBeep();
    }

    // Temporizador de banners
    if (GameState.banner.timer > 0) {
        GameState.banner.timer -= dt;
    }

    // Temporizador de invulnerabilidad / recuperación de choque
    if (GameState.invulnerableTimer > 0) {
        GameState.invulnerableTimer -= dt;
    }

    // Posición del segmento actual
    const currentSegmentIndex = Math.floor(GameState.playerZ / SEGMENT_LENGTH);
    const currentSegment = GameState.segments[currentSegmentIndex];
    if (!currentSegment) return;
    GameState.currentStage = currentSegment.stage || GameState.currentStage;

    // Aceleración y Frenado
    const topSpeed = GameState.input.turbo ? GameState.turboSpeed : GameState.maxSpeed;

    // Detección de fuera de pista (Off-road) adaptativa a transiciones continuas y bifurcaciones
    let isOffRoad = false;
    const currentForkProg = currentSegment ? (currentSegment.forkProgress || 0) : 0;
    
    if (currentSegment && currentSegment.isTransition) {
        // En zona de transición post-checkpoint (la salida elegida se centra a 0 sin corte)
        const roadCenter = currentSegment.chosenRoadCenter || 0;
        const roadW = currentSegment.chosenRoadWidth || 1.0;
        isOffRoad = Math.abs(GameState.playerX - roadCenter) > roadW * 1.08;

        // Centrado suave y continuo del vehículo acompañando la calzada elegida
        if (GameState.lastRoadCenter !== undefined && GameState.lastRoadCenter !== null) {
            const shift = roadCenter - GameState.lastRoadCenter;
            GameState.playerX += shift;
        }
        GameState.lastRoadCenter = roadCenter;
    } else {
        GameState.lastRoadCenter = null;
        if (currentForkProg > 0.1) {
            // En zona de bifurcación: hay dos calzadas independientes (salida izquierda y salida derecha)
            const sepRatio = 1.35 * currentForkProg;
            const branchHalfW = 0.85 + 0.15 * (1 - currentForkProg);
            const onLeftRoad = Math.abs(GameState.playerX - (-sepRatio)) <= branchHalfW * 1.08;
            const onRightRoad = Math.abs(GameState.playerX - (+sepRatio)) <= branchHalfW * 1.08;
            isOffRoad = !onLeftRoad && !onRightRoad;
        } else {
            isOffRoad = Math.abs(GameState.playerX) > 1.05;
        }
    }

    if (GameState.input.gas) {
        GameState.speed += GameState.accel * dt;
    } else if (GameState.input.brake) {
        GameState.speed -= GameState.braking * dt;
        if (GameState.speed > 3000) audio.playTireScreech();
    } else {
        // Desaceleración suave por inercia
        GameState.speed -= GameState.decel * dt;
    }

    // En pasto/arena desacelera pero NO frena a 0, permite conducir a ~90 KM/H
    if (isOffRoad) {
        if (GameState.speed > 4500) {
            GameState.speed -= GameState.offRoadDecel * dt;
        }
        GameState.shakeAmount = 2.2;
        if (GameState.speed > 2500 && Math.random() < 0.15) audio.playTireScreech();
    } else {
        GameState.shakeAmount = Math.max(0, GameState.shakeAmount - dt * 6);
    }

    // Límites de velocidad
    GameState.speed = Math.max(0, Math.min(GameState.speed, topSpeed));

    // Audio del motor
    audio.updateEngine(GameState.speed, GameState.turboSpeed);

    // Aviso de bifurcación al acercarse a la salida
    if (currentSegment.stageIndex >= 1000 && currentSegment.stageIndex <= 1025 && GameState.currentTier < 4 && !GameState.forkWarned) {
        GameState.forkWarned = true;
        showBanner('¡BIFURCACIÓN DE PISTA!', 'SALIDA ◄ IZQ  O  DER ►', '#ffb703', 3.0);
    }

    // Emisión de partículas de derrape, frenada y pasto
    if (GameState.running) {
        const carScreenX = CANVAS_WIDTH / 2;
        const carScreenY = CANVAS_HEIGHT - 16;

        if (GameState.input.brake && GameState.speed > 2500) {
            createTireSmoke(carScreenX - 28, carScreenY, 2);
            createTireSmoke(carScreenX + 28, carScreenY, 2);
        }
        if (Math.abs(GameState.input.steer) > 0.4 && GameState.speed > 6800) {
            const driftSide = GameState.input.steer > 0 ? -28 : 28;
            createTireSmoke(carScreenX + driftSide, carScreenY, 2);
        }
        if (isOffRoad && GameState.speed > 2200) {
            createTireSmoke(carScreenX - 28, carScreenY, 2, false, '#8e5b32');
            createTireSmoke(carScreenX + 28, carScreenY, 2, false, '#8e5b32');
        }
    }
    updateParticles(dt);

    // Movimiento Z continuo (sin reseteos a 0 entre etapas)
    if (GameState.gameWon) {
        GameState.speed = Math.max(1200, GameState.speed - 3200 * dt);
    }
    const prevPlayerZ = GameState.playerZ;
    GameState.playerZ += GameState.speed * dt;
    if (GameState.playerZ >= GameState.trackLength) {
        GameState.playerZ = GameState.trackLength - 100;
    }

    // Detección robusta y continua de cruce de checkpoint en el intervalo [prevPlayerZ, playerZ]
    const startIdx = Math.floor(prevPlayerZ / SEGMENT_LENGTH);
    const endIdx = Math.floor(GameState.playerZ / SEGMENT_LENGTH);
    let crossedCheckpointSeg = null;
    let crossedCheckpointIdx = -1;

    for (let idx = startIdx; idx <= endIdx && idx < GameState.segments.length; idx++) {
        const seg = GameState.segments[idx];
        if (seg && seg.isCheckpoint && !seg.cleared) {
            crossedCheckpointSeg = seg;
            crossedCheckpointIdx = idx;
            break;
        }
    }

    // Checkpoint Crossing & Bifurcación Continua en 5 Metas (SIN CORTE)
    if (crossedCheckpointSeg && !GameState.stageCleared) {
        crossedCheckpointSeg.cleared = true;
        GameState.stageCleared = true;
        GameState.checkpointsCleared++;

        if (GameState.currentTier < 4) {
            // Bifurcación: Izquierda (playerX < 0) o Derecha (playerX >= 0)
            const choice = (GameState.playerX < 0) ? 0 : 1;
            const nextRouteIndex = GameState.currentRouteIndex + choice;
            const nextTier = GameState.currentTier + 1;

            GameState.routePath.push({ tier: nextTier, index: nextRouteIndex });

            const diffCfg = DIFFICULTY_CONFIG[GameState.difficulty] || DIFFICULTY_CONFIG.normal;
            GameState.timeLeft += diffCfg.checkpointBonus;
            GameState.score += Math.round(5000 * diffCfg.scoreMultiplier);
            audio.playCheckpoint();

            const nextStage = ROUTE_TREE[nextTier][nextRouteIndex];
            const sideText = (choice === 0) ? '◄ SALIDA IZQUIERDA' : 'SALIDA DERECHA ►';
            showBanner(`STAGE ${nextTier + 1}: ${nextStage.name}`, `${sideText} • +${diffCfg.checkpointBonus}s EXTENDIDO!`, '#3dff8a', 3.0);

            // Transición continua sin corte: construir la siguiente etapa directamente adelante
            appendNextStage(nextTier, nextRouteIndex, choice, crossedCheckpointIdx);
        } else {
            // TIER 4: ¡META ALCANZADA! (GOALS A, B, C, D, E)
            GameState.gameWon = true;
            const diffCfg = DIFFICULTY_CONFIG[GameState.difficulty] || DIFFICULTY_CONFIG.normal;
            const goalLetter = GameState.currentStage?.goalLetter || ['A', 'B', 'C', 'D', 'E'][GameState.currentRouteIndex] || 'A';
            
            // Bonificación por tiempo y meta alcanzada
            const timeBonus = Math.floor(GameState.timeLeft) * 1000;
            const goalBonus = Math.round(25000 * diffCfg.scoreMultiplier);
            GameState.score += (timeBonus + goalBonus);
            
            audio.playVictory();
            showBanner(`¡GOAL ${goalLetter} CLEARED!`, `COURSE CLEAR! +${timeBonus + goalBonus} PTS`, '#ffeaa7', 3.5);

            setTimeout(() => {
                endGame(true, goalLetter);
            }, 3500);
        }
    }

    // Dirección (volante) y Fuerza centrífuga en curvas
    const speedRatio = GameState.speed / GameState.maxSpeed;
    GameState.playerX += GameState.input.steer * 2.4 * speedRatio * dt;
    GameState.playerX -= currentSegment.curve * speedRatio * GameState.centrifugal * dt;
    GameState.playerX = Math.max(-2.2, Math.min(2.2, GameState.playerX));

    // Parallax del cielo
    GameState.skyOffset += currentSegment.curve * speedRatio * 0.4 * dt;

    // Puntuación continua basada en velocidad y multiplicador de dificultad
    const diffCfg = DIFFICULTY_CONFIG[GameState.difficulty] || DIFFICULTY_CONFIG.normal;
    GameState.score += (GameState.speed / 1000) * dt * 25 * diffCfg.scoreMultiplier;
    if (GameState.score > GameState.highScore) {
        GameState.highScore = GameState.score;
    }

    // Actualización de Tráfico Rival y Colisiones Exactas por Barrido Continuo
    const lanes = [-0.6, 0, 0.6];
    const normalizeRelZ = (dz) => {
        if (dz < -GameState.trackLength / 2) dz += GameState.trackLength;
        if (dz > GameState.trackLength / 2) dz -= GameState.trackLength;
        return dz;
    };

    GameState.cars.forEach(car => {
        const prevCarZ = car.z;
        car.crashCooldown = Math.max(0, (car.crashCooldown || 0) - dt);

        car.z += car.speed * dt;
        if (car.z >= GameState.trackLength) car.z -= GameState.trackLength;

        const prevRelZ = normalizeRelZ(prevCarZ - prevPlayerZ);
        const relZ = normalizeRelZ(car.z - GameState.playerZ);

        // 1. REGLA ESTRICTA: Los vehículos NUNCA salen desde atrás ni adelantan al jugador por la espalda.
        // En cuanto el vehículo queda muy atrás detrás de la cámara (relZ < -150), se reubica adelante en el horizonte:
        if (relZ < -150) {
            recycleCarAhead(car);
            return;
        }

        // Si el auto ya quedó al costado o detrás del Ferrari del jugador (relZ < 750), evitar que alcance desde atrás
        if (relZ < 750 && car.speed >= GameState.speed) {
            car.speed = Math.max(0, GameState.speed * 0.6);
        }

        // IA: cambio de carril muy suave y raro (solo si el jugador está a más de 1600 px)
        car.laneChangeTimer -= dt;
        if (car.laneChangeTimer <= 0) {
            car.laneChangeTimer = 14 + Math.random() * 10;
            // No cambia de carril si el jugador está acercándose a rebasar
            if (relZ > 1600 && Math.random() < 0.25) {
                const availableLanes = lanes.filter(l => Math.abs(l - car.offset) > 0.1);
                if (availableLanes.length > 0) {
                    car.targetOffset = availableLanes[Math.floor(Math.random() * availableLanes.length)];
                }
            }
        }
        if (car.targetOffset !== undefined) {
            car.offset += (car.targetOffset - car.offset) * 0.8 * dt;
        }

        // Detección de rebase limpio (Pass bonus de +500 PTS al dejar atrás el auto sin chocar)
        if (relZ < 750 && relZ > -150 && !car.passed && car.crashCooldown <= 0) {
            car.passed = true;
            GameState.score += 500;
            audio.playPassBonus();
            showBanner('OVERTAKE!', '+500 PTS', '#3dff8a', 0.9);
        }

        // Colisión continua exacta en pantalla:
        // El Ferrari visualmente ocupa relZ en [760, 1030] (y=277 a y=319).
        // Se usa barrido [minRelZ, maxRelZ] para no traspasar ningún auto a alta velocidad ni en caídas de FPS,
        // y enfriamiento individual por coche (car.crashCooldown) para nunca volverse fantasma ante otros autos.
        const segMinZ = Math.min(prevRelZ, relZ);
        const segMaxZ = Math.max(prevRelZ, relZ);
        if (car.crashCooldown <= 0 && segMaxZ >= 760 && segMinZ <= 1030) {
            const totalSegs = GameState.segments.length;
            const carSegIndex = ((Math.floor(car.z / SEGMENT_LENGTH) % totalSegs) + totalSegs) % totalSegs;
            const carSeg = GameState.segments[carSegIndex];
            const carWorldX = getCarEffectiveRoadX(car, carSeg);

            const distX = Math.abs(carWorldX - GameState.playerX);
            // Ancho visual combinado: semiancho rival (0.208) + semiancho Ferrari (~0.125) = ~0.33 -> 0.32 garantiza choque al tocar cualquier borde
            if (distX < 0.32) {
                car.crashCooldown = 0.9;
                car.passed = true;
                GameState.invulnerableTimer = 0.45; // Parpadeo breve de impacto (NO desactiva choques con otros autos)
                GameState.speed = Math.max(3500, GameState.speed * 0.40);
                GameState.shakeAmount = 6.5;
                audio.playCrash();
                showBanner('CRASH!', 'RECOVERING...', '#ff4d6d', 1.5);

                // Empujar el coche impactado hacia adelante del Ferrari y separar lateralmente
                car.z = (car.z + 750) % GameState.trackLength;
                if (GameState.playerX >= carWorldX) {
                    GameState.playerX = Math.min(2.0, GameState.playerX + 0.18);
                    car.offset = Math.max(-0.85, car.offset - 0.18);
                } else {
                    GameState.playerX = Math.max(-2.0, GameState.playerX - 0.18);
                    car.offset = Math.min(0.85, car.offset + 0.18);
                }
                car.targetOffset = car.offset;

                // Chispas y humo de choque
                createTireSmoke(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 24, 12, true);
            }
        }
    });

    updateHUD();
}

// Renderizado Gráfico HD (800x640 interno sobre 400x320 lógico) con Atmósfera Multi-capa y Detalles Arcade
function drawAtmosphere(env, stage) {
    const horizonY = CANVAS_HEIGHT / 2;
    const now = Date.now();
    const isNight = (stage.id === 'neon_metropolis' || stage.id === 'goal_d');
    const isUrban = (isNight || stage.id === 'autobahn_highway');
    const isWaterStage = (
        stage.id === 'coconut_beach' ||
        stage.id === 'seaside_blvd' ||
        stage.id === 'windmill_valley' ||
        stage.id === 'goal_a' ||
        stage.id === 'goal_b' ||
        stage.id === 'goal_c'
    );
    const isAlpine = (stage.id === 'alpine_valley' || stage.id === 'winding_vineyards' || stage.id === 'goal_c');

    // 1. Cielo Gradiente Atmosférico Multi-stop
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, env.skyTop || stage.skyTop);
    skyGrad.addColorStop(0.68, env.skyBottom || stage.skyBottom);
    skyGrad.addColorStop(1, isNight ? '#ff2a85' : '#ffd29d');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, horizonY);

    // 2. Estrellas Nocturnas o Nubes Volumétricas en Paralaje
    if (isNight) {
        for (let s = 0; s < 32; s++) {
            const sx = ((s * 67 + 19 - GameState.skyOffset * 12) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
            const sy = 8 + ((s * 37) % (horizonY - 52));
            const twinkle = 0.45 + 0.55 * Math.sin(now * 0.004 + s * 1.7);
            ctx.fillStyle = `rgba(255, 255, 255, ${twinkle.toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(sx, sy, (s % 4 === 0) ? 1.2 : 0.75, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Posición suave del sol con leve paralaje
    const sunX = Math.round(CANVAS_WIDTH * 0.72 - Math.sin(GameState.skyOffset * 0.22) * 38);
    const sunY = isNight ? 60 : 54;
    const sunR = isNight ? 32 : 28;

    // 3. Aura Solar Atmosférica y Destello
    const sunAura = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 3.1);
    if (isNight) {
        sunAura.addColorStop(0, 'rgba(255, 80, 170, 0.85)');
        sunAura.addColorStop(0.45, 'rgba(255, 0, 128, 0.32)');
        sunAura.addColorStop(1, 'rgba(80, 0, 120, 0)');
    } else {
        sunAura.addColorStop(0, 'rgba(255, 248, 210, 0.92)');
        sunAura.addColorStop(0.35, 'rgba(255, 185, 85, 0.48)');
        sunAura.addColorStop(0.7, 'rgba(255, 100, 115, 0.16)');
        sunAura.addColorStop(1, 'rgba(255, 77, 109, 0)');
    }
    ctx.fillStyle = sunAura;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 3.1, 0, Math.PI * 2);
    ctx.fill();

    // Disco Solar con Degradado Suave
    const sunGrad = ctx.createRadialGradient(sunX, sunY - 5, 2, sunX, sunY, sunR);
    if (isNight) {
        sunGrad.addColorStop(0, '#ffe66d');
        sunGrad.addColorStop(0.45, '#ff4d94');
        sunGrad.addColorStop(1, '#7209b7');
    } else {
        sunGrad.addColorStop(0, '#ffffff');
        sunGrad.addColorStop(0.48, env.sunColor || stage.sunColor || '#fff0aa');
        sunGrad.addColorStop(0.88, '#ffa94d');
        sunGrad.addColorStop(1, '#ff6b6b');
    }
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    // Franjas sutiles Synthwave únicamente en el horizonte nocturno
    if (isNight) {
        ctx.fillStyle = env.skyBottom || '#511845';
        for (let b = 0; b < 4; b++) {
            const by = sunY + 4 + b * 6;
            const bh = 1.2 + b * 0.6;
            ctx.fillRect(sunX - sunR, by, sunR * 2, bh);
        }
    }

    // Nubes suaves en paralaje para etapas diurnas/atardecer
    if (!isNight) {
        const cloudDrift = now * 0.0045;
        for (let c = 0; c < 5; c++) {
            const span = CANVAS_WIDTH + 140;
            const cx = (((c * 105 + cloudDrift - GameState.skyOffset * (32 + (c % 2) * 24)) % span) + span) % span - 70;
            const cy = 22 + (c % 3) * 16;
            const cw = 32 + (c % 3) * 12;
            const cGrad = ctx.createLinearGradient(cx, cy - 10, cx, cy + 8);
            cGrad.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
            cGrad.addColorStop(1, 'rgba(255, 210, 175, 0.25)');
            ctx.fillStyle = cGrad;
            ctx.beginPath();
            ctx.ellipse(cx, cy, cw * 0.52, 6.5, 0, 0, Math.PI * 2);
            ctx.ellipse(cx - cw * 0.26, cy + 1.5, cw * 0.34, 5, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + cw * 0.28, cy + 1.5, cw * 0.36, 5.2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 4. Horizonte de Océano / Lago Costero con Veleros y Reflejos
    const seaColor = env.seaColor || stage.seaColor;
    if (seaColor && !isUrban) {
        const seaTop = horizonY - 24;
        const seaH = 24;
        const seaGrad = ctx.createLinearGradient(0, seaTop, 0, seaTop + seaH);
        seaGrad.addColorStop(0, seaColor);
        seaGrad.addColorStop(1, '#0c3554');
        ctx.fillStyle = seaGrad;
        ctx.fillRect(0, seaTop, CANVAS_WIDTH, seaH);

        if (isWaterStage) {
            // Línea de brillo horizontal en el horizonte del agua
            ctx.fillStyle = 'rgba(255, 240, 200, 0.32)';
            ctx.fillRect(0, seaTop, CANVAS_WIDTH, 1.2);

            // Sendero de reflejos dorados solares animándose suavemente
            const t = now / 220;
            for (let row = 0; row < 7; row++) {
                const waveY = seaTop + 3 + row * 3.0;
                const waveW = 10 + row * 11;
                const waveX = sunX + Math.sin(t + row * 0.9) * 5;
                ctx.fillStyle = `rgba(255, 238, 170, ${(0.62 - row * 0.05).toFixed(2)})`;
                ctx.beginPath();
                ctx.ellipse(waveX, waveY, waveW / 2, 1.2, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // Veleros distantes en el mar
            for (let b = 0; b < 2; b++) {
                const boatX = (((b * 185 + 60 - GameState.skyOffset * 48) % CANVAS_WIDTH) + CANVAS_WIDTH) % CANVAS_WIDTH;
                const boatY = seaTop + 5 + b * 4;
                ctx.fillStyle = '#f8fafc';
                ctx.beginPath();
                ctx.moveTo(boatX, boatY);
                ctx.lineTo(boatX + 4, boatY - 8);
                ctx.lineTo(boatX + 5, boatY);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(boatX - 1, boatY, 7, 1.5);
            }
        }
    }

    // 5. Skyline Urbano Nocturno / Autopista (Solo en etapas urbanas)
    if (isUrban) {
        const bCount = 26;
        const bWidth = CANVAS_WIDTH / bCount + 4;
        for (let b = 0; b < bCount; b++) {
            const bx = (((b * (CANVAS_WIDTH / bCount) - GameState.skyOffset * 50) % (CANVAS_WIDTH + 30)) + (CANVAS_WIDTH + 30)) % (CANVAS_WIDTH + 30) - 15;
            const bh = 18 + ((b * 37) % 34);
            const by = horizonY - bh - 4;
            ctx.fillStyle = isNight ? '#130728' : '#1e272e';
            ctx.fillRect(bx, by, bWidth, bh + 4);

            // Ventanas iluminadas de rascacielos
            ctx.fillStyle = (b % 3 === 0) ? 'rgba(0, 243, 255, 0.55)' : (b % 3 === 1 ? 'rgba(255, 0, 234, 0.45)' : 'rgba(250, 204, 21, 0.55)');
            for (let wy = by + 3; wy < horizonY - 8; wy += 4) {
                if ((wy + b) % 2 === 0) {
                    ctx.fillRect(bx + 2, wy, 2, 1.8);
                    if (bWidth > 10) ctx.fillRect(bx + 7, wy, 2, 1.8);
                }
            }
        }
    }

    // 6. Cordilleras en Paralaje Continuo (Sin cortes en bordes) con Cumbres Nevadas / Iluminación
    const mountainBaseY = horizonY;
    ctx.fillStyle = isNight ? 'rgba(38, 12, 68, 0.55)' : 'rgba(28, 24, 48, 0.40)';
    ctx.beginPath();
    ctx.moveTo(0, mountainBaseY);
    for (let x = 0; x <= CANVAS_WIDTH; x += 4) {
        const ox = x + GameState.skyOffset * 62;
        const h = Math.sin(ox * 0.025) * 28 + Math.cos(ox * 0.012) * 16 + Math.sin(ox * 0.055) * 6;
        ctx.lineTo(x, mountainBaseY - 22 - h);
    }
    ctx.lineTo(CANVAS_WIDTH, mountainBaseY);
    ctx.closePath();
    ctx.fill();

    // Capa 2: Relieve montañoso cercano con gradiente y perfil de cumbre
    const mtnGrad = ctx.createLinearGradient(0, mountainBaseY - 48, 0, mountainBaseY);
    mtnGrad.addColorStop(0, env.mountains || stage.mountains);
    mtnGrad.addColorStop(1, 'rgba(12, 18, 16, 0.96)');
    ctx.fillStyle = mtnGrad;
    ctx.beginPath();
    ctx.moveTo(0, mountainBaseY);
    const crestPts = [];
    for (let x = 0; x <= CANVAS_WIDTH; x += 4) {
        const ox = x + GameState.skyOffset * 115;
        const h = Math.sin(ox * 0.038) * 20 + Math.cos(ox * 0.019) * 13 + Math.sin(ox * 0.075) * 7;
        const py = mountainBaseY - 12 - h;
        ctx.lineTo(x, py);
        crestPts.push({ x, y: py, h });
    }
    ctx.lineTo(CANVAS_WIDTH, mountainBaseY);
    ctx.closePath();
    ctx.fill();

    // Luz cálida o nieve sobre las crestas montañosas
    ctx.strokeStyle = isAlpine ? 'rgba(248, 250, 252, 0.72)' : (isNight ? 'rgba(0, 243, 255, 0.35)' : 'rgba(255, 220, 170, 0.28)');
    ctx.lineWidth = isAlpine ? 2.2 : 1.0;
    ctx.beginPath();
    crestPts.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
}

function drawRoadStripWithDetails(x1L, x1R, y1, x2L, x2R, y2, w1, w2, seg, showCenterLanes = true) {
    // Asfalto principal
    drawTrapezoid(x1L, y1, x1R, y1, x2R, y2, x2L, y2, seg.color.road);

    // Franja ajedrezada de lado a lado sobre el asfalto en cada Checkpoint / Meta
    if (seg && seg.isCheckpoint) {
        const cols = 12;
        for (let c = 0; c < cols; c++) {
            const t0 = c / cols;
            const t1 = (c + 1) / cols;
            const cx1L = x1L + (x1R - x1L) * t0;
            const cx1R = x1L + (x1R - x1L) * t1;
            const cx2L = x2L + (x2R - x2L) * t0;
            const cx2R = x2L + (x2R - x2L) * t1;
            drawTrapezoid(
                cx1L, y1, cx1R, y1, cx2R, y2, cx2L, y2,
                (c % 2 === 0) ? '#ffffff' : '#0f172a'
            );
        }
        return;
    }

    // Huellas sutiles de rodadura y sombreado de profundidad en carril
    if (w1 > 10) {
        const trackOff1 = w1 * 0.42;
        const trackOff2 = w2 * 0.42;
        const trackW1 = w1 * 0.14;
        const trackW2 = w2 * 0.14;
        const cx1 = (x1L + x1R) * 0.5;
        const cx2 = (x2L + x2R) * 0.5;
        drawTrapezoid(
            cx1 - trackOff1 - trackW1, y1, cx1 - trackOff1 + trackW1, y1,
            cx2 - trackOff2 + trackW2, y2, cx2 - trackOff2 - trackW2, y2,
            'rgba(0, 0, 0, 0.09)'
        );
        drawTrapezoid(
            cx1 + trackOff1 - trackW1, y1, cx1 + trackOff1 + trackW1, y1,
            cx2 + trackOff2 + trackW2, y2, cx2 + trackOff2 - trackW2, y2,
            'rgba(0, 0, 0, 0.09)'
        );
    }

    // Líneas continuas de arcén interior para mayor nitidez y realismo de autopista
    if (w1 > 6) {
        const edgeInset1 = w1 * 0.045;
        const edgeInset2 = w2 * 0.045;
        const edgeW1 = Math.max(0.6, w1 * 0.022);
        const edgeW2 = Math.max(0.5, w2 * 0.022);
        drawTrapezoid(
            x1L + edgeInset1, y1, x1L + edgeInset1 + edgeW1, y1,
            x2L + edgeInset2 + edgeW2, y2, x2L + edgeInset2, y2,
            'rgba(255, 255, 255, 0.65)'
        );
        drawTrapezoid(
            x1R - edgeInset1 - edgeW1, y1, x1R - edgeInset1, y1,
            x2R - edgeInset2, y2, x2R - edgeInset2 - edgeW2, y2,
            'rgba(255, 255, 255, 0.65)'
        );
    }

    // Líneas divisorias de carril
    if (showCenterLanes && seg.color.lane !== 'transparent') {
        const laneW1 = w1 * 0.025;
        const laneW2 = w2 * 0.025;
        for (let l = 1; l < LANES; l++) {
            const laneX1 = x1L + ((x1R - x1L) / LANES) * l;
            const laneX2 = x2L + ((x2R - x2L) / LANES) * l;
            drawTrapezoid(
                laneX1 - laneW1, y1, laneX1 + laneW1, y1,
                laneX2 + laneW2, y2, laneX2 - laneW2, y2,
                seg.color.lane
            );
        }
    }
}

function draw() {
    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const baseSegmentIndex = Math.floor(GameState.playerZ / SEGMENT_LENGTH);
    const baseSegment = GameState.segments[baseSegmentIndex % GameState.segments.length];
    const stage = GameState.currentStage || ROUTE_TREE[0][0];
    const env = (baseSegment && baseSegment.env) ? baseSegment.env : stage;

    // 1. Atmósfera, Cielo, Nubes, Sol, Océano/Skyline y Montañas en Paralaje
    drawAtmosphere(env, stage);

    // Efecto temblor de pantalla (Camera shake)
    ctx.save();
    try {
        if (GameState.running && GameState.shakeAmount > 0) {
            const shakeX = (Math.random() - 0.5) * GameState.shakeAmount * 1.4;
            const shakeY = (Math.random() - 0.5) * GameState.shakeAmount * 1.4;
            ctx.translate(shakeX, shakeY);
        }

        // 2. Renderizado de Carretera Pseudo-3D
        const basePercent = (GameState.playerZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;
        const cameraX = GameState.playerX * ROAD_WIDTH;
        const cameraZ = GameState.playerZ;
        const cameraY = CAMERA_HEIGHT;

        let maxY = CANVAS_HEIGHT;
        let dx = -(baseSegment ? (baseSegment.curve * basePercent) : 0);
        let x = 0;

        for (let n = 0; n < DRAW_DISTANCE; n++) {
            const segIndex = baseSegmentIndex + n;
            if (segIndex >= GameState.segments.length) break;
            const seg = GameState.segments[segIndex];
            if (!seg || !seg.p1 || !seg.p2) continue;

            project3D(seg.p1, cameraX - x, cameraY, cameraZ, CAMERA_DEPTH, CANVAS_WIDTH, CANVAS_HEIGHT, ROAD_WIDTH);
            project3D(seg.p2, cameraX - x - dx, cameraY, cameraZ, CAMERA_DEPTH, CANVAS_WIDTH, CANVAS_HEIGHT, ROAD_WIDTH);

        x = x + dx;
        dx = dx + (seg.curve || 0);

        seg.clip = maxY;

        if (seg.p1.camera.z <= CAMERA_DEPTH) continue;
        if (seg.p2.screen.y >= maxY && seg.p1.screen.y >= maxY) continue;

        // Pasto lateral
        const grassY1 = Math.min(CANVAS_HEIGHT, Math.max(0, seg.p1.screen.y));
        const grassY2 = Math.min(CANVAS_HEIGHT, Math.max(0, seg.p2.screen.y));
        if (grassY1 > grassY2) {
            ctx.fillStyle = seg.color.grass;
            ctx.fillRect(0, grassY2, CANVAS_WIDTH, grassY1 - grassY2);
        }

        // Bermas, asfalto y bifurcaciones (Salida Izquierda y Salida Derecha)
        const fork1 = seg.forkProgress || 0;
        const nextSeg = (segIndex + 1 < GameState.segments.length) ? GameState.segments[segIndex + 1] : seg;
        const fork2 = (nextSeg && nextSeg.isTransition) ? 1.0 : (nextSeg ? (nextSeg.forkProgress || 0) : fork1);

        if (seg.isTransition) {
            // ==============================================================
            // TRANSICIÓN CONTINUA ENTRE ETAPAS (SIN CORTE: SALIDA FLUIDA)
            // ==============================================================
            const cCenter1 = seg.chosenRoadCenter || 0;
            const cCenter2 = (nextSeg && nextSeg.isTransition && nextSeg.chosenRoadCenter !== undefined) ? nextSeg.chosenRoadCenter : cCenter1;
            const cW1 = seg.p1.screen.w * (seg.chosenRoadWidth || 1.0);
            const cW2 = seg.p2.screen.w * ((nextSeg && nextSeg.isTransition && nextSeg.chosenRoadWidth !== undefined) ? nextSeg.chosenRoadWidth : (seg.chosenRoadWidth || 1.0));
            const curbW1 = cW1 * 0.16;
            const curbW2 = cW2 * 0.16;

            const roadX1 = seg.p1.screen.x + cCenter1 * seg.p1.screen.w;
            const roadX2 = seg.p2.screen.x + cCenter2 * seg.p2.screen.w;

            // Berma izquierda de la calzada elegida
            drawTrapezoid(
                roadX1 - cW1 - curbW1, seg.p1.screen.y,
                roadX1 - cW1, seg.p1.screen.y,
                roadX2 - cW2, seg.p2.screen.y,
                roadX2 - cW2 - curbW2, seg.p2.screen.y,
                seg.color.curb
            );
            // Berma derecha de la calzada elegida
            drawTrapezoid(
                roadX1 + cW1, seg.p1.screen.y,
                roadX1 + cW1 + curbW1, seg.p1.screen.y,
                roadX2 + cW2 + curbW2, seg.p2.screen.y,
                roadX2 + cW2, seg.p2.screen.y,
                seg.color.curb
            );
            // Asfalto principal con detalles de desgaste, arcén interior y líneas de carril
            drawRoadStripWithDetails(
                roadX1 - cW1, roadX1 + cW1, seg.p1.screen.y,
                roadX2 - cW2, roadX2 + cW2, seg.p2.screen.y,
                cW1, cW2, seg, true
            );

            // Calzada rechazada que se aleja y sale suavemente de la pantalla
            const oCenter1 = seg.otherRoadCenter;
            const oCenter2 = (nextSeg && nextSeg.isTransition && nextSeg.otherRoadCenter !== undefined) ? nextSeg.otherRoadCenter : oCenter1;
            if (oCenter1 !== undefined && Math.abs(oCenter1) < 4.0) {
                const oW1 = seg.p1.screen.w * 0.85;
                const oW2 = seg.p2.screen.w * 0.85;
                const oCurb1 = oW1 * 0.15;
                const oCurb2 = oW2 * 0.15;
                const otherX1 = seg.p1.screen.x + oCenter1 * seg.p1.screen.w;
                const otherX2 = seg.p2.screen.x + oCenter2 * seg.p2.screen.w;

                if (otherX1 + oW1 + oCurb1 > 0 && otherX1 - oW1 - oCurb1 < CANVAS_WIDTH) {
                    drawTrapezoid(
                        otherX1 - oW1 - oCurb1, seg.p1.screen.y,
                        otherX1 - oW1, seg.p1.screen.y,
                        otherX2 - oW2, seg.p2.screen.y,
                        otherX2 - oW2 - oCurb2, seg.p2.screen.y,
                        seg.color.curb
                    );
                    drawTrapezoid(
                        otherX1 + oW1, seg.p1.screen.y,
                        otherX1 + oW1 + oCurb1, seg.p1.screen.y,
                        otherX2 + oW2 + oCurb2, seg.p2.screen.y,
                        otherX2 + oW2, seg.p2.screen.y,
                        seg.color.curb
                    );
                    drawRoadStripWithDetails(
                        otherX1 - oW1, otherX1 + oW1, seg.p1.screen.y,
                        otherX2 - oW2, otherX2 + oW2, seg.p2.screen.y,
                        oW1, oW2, seg, false
                    );
                    if (seg.color.lane !== 'transparent') {
                        const laneW1 = oW1 * 0.035;
                        const laneW2 = oW2 * 0.035;
                        drawTrapezoid(
                            otherX1 - laneW1, seg.p1.screen.y,
                            otherX1 + laneW1, seg.p1.screen.y,
                            otherX2 + laneW2, seg.p2.screen.y,
                            otherX2 - laneW2, seg.p2.screen.y,
                            seg.color.lane
                        );
                    }
                }
            }
        } else if (fork1 < 0.02 && fork2 < 0.02) {
            // ==========================================
            // CARRETERA ESTÁNDAR DE UNA SOLA VÍA
            // ==========================================
            const curbW1 = seg.p1.screen.w * 0.16;
            const curbW2 = seg.p2.screen.w * 0.16;

            // Berma izquierda
            drawTrapezoid(
                seg.p1.screen.x - seg.p1.screen.w - curbW1, seg.p1.screen.y,
                seg.p1.screen.x - seg.p1.screen.w, seg.p1.screen.y,
                seg.p2.screen.x - seg.p2.screen.w, seg.p2.screen.y,
                seg.p2.screen.x - seg.p2.screen.w - curbW2, seg.p2.screen.y,
                seg.color.curb
            );
            // Berma derecha
            drawTrapezoid(
                seg.p1.screen.x + seg.p1.screen.w, seg.p1.screen.y,
                seg.p1.screen.x + seg.p1.screen.w + curbW1, seg.p1.screen.y,
                seg.p2.screen.x + seg.p2.screen.w + curbW2, seg.p2.screen.y,
                seg.p2.screen.x + seg.p2.screen.w, seg.p2.screen.y,
                seg.color.curb
            );

            // Asfalto principal con detalles de desgaste, arcén y carriles
            drawRoadStripWithDetails(
                seg.p1.screen.x - seg.p1.screen.w, seg.p1.screen.x + seg.p1.screen.w, seg.p1.screen.y,
                seg.p2.screen.x - seg.p2.screen.w, seg.p2.screen.x + seg.p2.screen.w, seg.p2.screen.y,
                seg.p1.screen.w, seg.p2.screen.w, seg, true
            );
        } else {
            // ==============================================================
            // BIFURCACIÓN DE PISTA: SALIDA IZQUIERDA Y SALIDA DERECHA
            // ==============================================================
            const sep1 = seg.p1.screen.w * 1.35 * fork1;
            const sep2 = seg.p2.screen.w * 1.35 * fork2;
            const bW1 = seg.p1.screen.w * (0.85 + 0.15 * (1 - fork1));
            const bW2 = seg.p2.screen.w * (0.85 + 0.15 * (1 - fork2));
            const cW1 = bW1 * 0.15;
            const cW2 = bW2 * 0.15;

            const leftX1 = seg.p1.screen.x - sep1;
            const leftX2 = seg.p2.screen.x - sep2;
            const rightX1 = seg.p1.screen.x + sep1;
            const rightX2 = seg.p2.screen.x + sep2;

            const hasMedian1 = (leftX1 + bW1 + cW1 < rightX1 - bW1 - cW1);
            const hasMedian2 = (leftX2 + bW2 + cW2 < rightX2 - bW2 - cW2);

            // 1. SALIDA IZQUIERDA
            drawTrapezoid(
                leftX1 - bW1 - cW1, seg.p1.screen.y,
                leftX1 - bW1, seg.p1.screen.y,
                leftX2 - bW2, seg.p2.screen.y,
                leftX2 - bW2 - cW2, seg.p2.screen.y,
                seg.color.curb
            );
            drawRoadStripWithDetails(
                leftX1 - bW1, leftX1 + bW1, seg.p1.screen.y,
                leftX2 - bW2, leftX2 + bW2, seg.p2.screen.y,
                bW1, bW2, seg, false
            );
            if (hasMedian1 || hasMedian2) {
                drawTrapezoid(
                    leftX1 + bW1, seg.p1.screen.y,
                    leftX1 + bW1 + cW1, seg.p1.screen.y,
                    leftX2 + bW2 + cW2, seg.p2.screen.y,
                    leftX2 + bW2, seg.p2.screen.y,
                    seg.color.curb
                );
            }
            if (seg.color.lane !== 'transparent') {
                const laneW1 = bW1 * 0.035;
                const laneW2 = bW2 * 0.035;
                drawTrapezoid(
                    leftX1 - laneW1, seg.p1.screen.y,
                    leftX1 + laneW1, seg.p1.screen.y,
                    leftX2 + laneW2, seg.p2.screen.y,
                    leftX2 - laneW2, seg.p2.screen.y,
                    seg.color.lane
                );
            }

            // 2. SALIDA DERECHA
            if (hasMedian1 || hasMedian2) {
                drawTrapezoid(
                    rightX1 - bW1 - cW1, seg.p1.screen.y,
                    rightX1 - bW1, seg.p1.screen.y,
                    rightX2 - bW2, seg.p2.screen.y,
                    rightX2 - bW2 - cW2, seg.p2.screen.y,
                    seg.color.curb
                );
            }
            drawRoadStripWithDetails(
                rightX1 - bW1, rightX1 + bW1, seg.p1.screen.y,
                rightX2 - bW2, rightX2 + bW2, seg.p2.screen.y,
                bW1, bW2, seg, false
            );
            drawTrapezoid(
                rightX1 + bW1, seg.p1.screen.y,
                rightX1 + bW1 + cW1, seg.p1.screen.y,
                rightX2 + bW2 + cW2, seg.p2.screen.y,
                rightX2 + bW2, seg.p2.screen.y,
                seg.color.curb
            );
            if (seg.color.lane !== 'transparent') {
                const laneW1 = bW1 * 0.035;
                const laneW2 = bW2 * 0.035;
                drawTrapezoid(
                    rightX1 - laneW1, seg.p1.screen.y,
                    rightX1 + laneW1, seg.p1.screen.y,
                    rightX2 + laneW2, seg.p2.screen.y,
                    rightX2 - laneW2, seg.p2.screen.y,
                    seg.color.lane
                );
            }

            // 3. Rayado amarillo en la zona de divergencia previa a la separación
            if (!hasMedian1 && fork1 > 0.08 && seg.index % 2 === 0) {
                const midW1 = (rightX1 - leftX1) * 0.28;
                const midW2 = (rightX2 - leftX2) * 0.28;
                drawTrapezoid(
                    seg.p1.screen.x - midW1, seg.p1.screen.y,
                    seg.p1.screen.x + midW1, seg.p1.screen.y,
                    seg.p2.screen.x + midW2, seg.p2.screen.y,
                    seg.p2.screen.x - midW2, seg.p2.screen.y,
                    'rgba(255, 234, 167, 0.7)'
                );
            }
        }

        maxY = Math.min(maxY, seg.p2.screen.y);
    }

    // Bruma atmosférica sutil en la línea del horizonte para profundidad natural
    const horizonMistY = CANVAS_HEIGHT / 2;
    const fogCol = parseColor(env.skyBottom || stage.skyBottom);
    const mistGrad = ctx.createLinearGradient(0, horizonMistY - 1, 0, horizonMistY + 18);
    mistGrad.addColorStop(0, `rgba(${fogCol.r},${fogCol.g},${fogCol.b},0.35)`);
    mistGrad.addColorStop(1, `rgba(${fogCol.r},${fogCol.g},${fogCol.b},0)`);
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, horizonMistY - 1, CANVAS_WIDTH, 19);

    // 3. Renderizado de Objetos (Árboles, Señales y Tráfico Rival) ordenados por profundidad Z
    const drawables = [];

    // Sprites y Señales de Carretera (Soporta múltiples sprites por segmento y anclaje en pasto exterior)
    for (let n = 0; n < DRAW_DISTANCE; n++) {
        const segIndex = baseSegmentIndex + n;
        if (segIndex >= GameState.segments.length) break;
        const seg = GameState.segments[segIndex];
        if (!seg || !seg.p1 || !seg.p1.screen || !seg.p1.camera || seg.p1.screen.scale <= 0 || seg.p1.camera.z <= CAMERA_DEPTH) continue;

        const sprites = seg.sprites || (seg.sprite ? [seg.sprite] : []);
        if (sprites.length === 0) continue;

        const forkProg = seg.forkProgress || 0;
        const forkSep = seg.p1.screen.w * 1.35 * forkProg;
        const bW = seg.p1.screen.w * (0.85 + 0.15 * (1 - forkProg));

        for (let sp of sprites) {
            let sprX;
            let roadHalfW = seg.p1.screen.w;
            if (seg.isTransition) {
                // Durante la transición post-checkpoint, los sprites están anclados a los laterales exteriores de la calzada
                roadHalfW = seg.p1.screen.w * (seg.chosenRoadWidth || 1.0);
                const chosenX = seg.p1.screen.x + (seg.chosenRoadCenter || 0) * seg.p1.screen.w;
                if (sp.forkBranch === 'other' && seg.otherRoadCenter !== undefined && Math.abs(seg.otherRoadCenter) < 3.2) {
                    const otherX = seg.p1.screen.x + seg.otherRoadCenter * seg.p1.screen.w;
                    sprX = otherX + (sp.offset * roadHalfW);
                } else {
                    sprX = chosenX + (sp.offset * roadHalfW);
                }
            } else if (forkProg > 0.05) {
                if (sp.forkBranch === 'left') {
                    // Posición relativa al centro de la salida izquierda
                    sprX = (seg.p1.screen.x - forkSep) + (sp.offset * bW);
                    roadHalfW = bW;
                } else if (sp.forkBranch === 'right') {
                    // Posición relativa al centro de la salida derecha
                    sprX = (seg.p1.screen.x + forkSep) + (sp.offset * bW);
                    roadHalfW = bW;
                } else if (sp.forkBranch === 'median') {
                    // En la mediana de pasto central
                    sprX = seg.p1.screen.x;
                } else {
                    if (sp.offset < 0) {
                        sprX = (seg.p1.screen.x - forkSep) + (sp.offset * bW);
                        roadHalfW = bW;
                    } else if (sp.offset > 0) {
                        sprX = (seg.p1.screen.x + forkSep) + (sp.offset * bW);
                        roadHalfW = bW;
                    } else {
                        sprX = seg.p1.screen.x;
                    }
                }
            } else {
                sprX = seg.p1.screen.x + (sp.offset * seg.p1.screen.w);
            }

            drawables.push({
                kind: 'sprite',
                relZ: (n + 1) * SEGMENT_LENGTH,
                sprite: sp,
                screenX: Math.round(sprX),
                screenY: seg.p1.screen.y,
                scale: seg.p1.screen.scale,
                roadHalfW: roadHalfW
            });
        }
    }

    // Tráfico rival ordenado y adaptado a salidas izquierda/derecha
    GameState.cars.forEach(car => {
        let relZ = car.z - GameState.playerZ;
        if (relZ > 0 && relZ < (DRAW_DISTANCE - 2) * SEGMENT_LENGTH) {
            const carSegIndex = Math.floor(car.z / SEGMENT_LENGTH);
            if (carSegIndex >= GameState.segments.length) return;
            const carSeg = GameState.segments[carSegIndex];
            if (!carSeg || !carSeg.p1 || !carSeg.p2 || !carSeg.p1.screen || !carSeg.p2.screen || !carSeg.p1.screen.scale) return;

            const carPercent = (car.z % SEGMENT_LENGTH) / SEGMENT_LENGTH;
            const carScale = carSeg.p1.screen.scale + (carSeg.p2.screen.scale - carSeg.p1.screen.scale) * carPercent;
            if (carScale <= 0) return;

            const roadCenterX = carSeg.p1.screen.x + (carSeg.p2.screen.x - carSeg.p1.screen.x) * carPercent;
            const roadW = carSeg.p1.screen.w + (carSeg.p2.screen.w - carSeg.p1.screen.w) * carPercent;
            const screenX = Math.round(roadCenterX + (getCarEffectiveRoadX(car, carSeg) * roadW));

            const screenY = Math.round(carSeg.p1.screen.y + (carSeg.p2.screen.y - carSeg.p1.screen.y) * carPercent);
            const carW = Math.max(10, Math.round(carScale * 150000));
            const carH = Math.round(carW * 0.54);

            drawables.push({
                kind: 'car',
                relZ: relZ,
                car: car,
                screenX: screenX,
                screenY: screenY,
                w: carW,
                h: carH
            });
        }
    });

    // Ordenar de más lejano a más cercano (Z descendente)
    drawables.sort((a, b) => b.relZ - a.relZ);

    drawables.forEach(item => {
        if (item.kind === 'sprite') {
            drawWorldSprite(item.sprite, item.screenX, item.screenY, item.scale, item.roadHalfW);
        } else if (item.kind === 'car') {
            const lean = (item.car.targetOffset !== undefined) ? (item.car.targetOffset - item.car.offset) : 0;
            drawRivalCar(item.car.type, item.screenX, item.screenY, item.w, item.h, lean);
        }
    });

    // Partículas de humo suaves y realistas (Con degradado radial difuminado)
    if (GameState.smokeParticles && GameState.smokeParticles.length > 0) {
        GameState.smokeParticles.forEach(p => {
            const radGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(1, p.size));
            radGrad.addColorStop(0, p.color);
            radGrad.addColorStop(0.5, p.color);
            radGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = radGrad;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }

    // 4. Coche del Jugador (Ferrari Testarossa Fluida y Detallada)
    drawPlayerCar();

    // Efecto sutil de líneas de velocidad periféricas en alta velocidad / Turbo
    if (GameState.running && (GameState.speed > 9200 || (GameState.input.turbo && GameState.speed > 6500))) {
        const intensity = GameState.input.turbo ? 0.24 : Math.min(0.16, (GameState.speed - 9200) / 20000);
        const phase = (Date.now() / 45) % 10;
        ctx.strokeStyle = GameState.input.turbo ? `rgba(0, 245, 212, ${intensity.toFixed(2)})` : `rgba(255, 255, 255, ${intensity.toFixed(2)})`;
        ctx.lineWidth = 1.1;
        for (let k = 0; k < 6; k++) {
            const leftY = CANVAS_HEIGHT * 0.56 + ((k * 23 + phase * 4) % (CANVAS_HEIGHT * 0.40));
            const len = 18 + (k % 3) * 10;
            ctx.beginPath();
            ctx.moveTo(2, leftY);
            ctx.lineTo(2 + len, leftY - len * 0.28);
            ctx.moveTo(CANVAS_WIDTH - 2, leftY + 5);
            ctx.lineTo(CANVAS_WIDTH - 2 - len, leftY + 5 - len * 0.28);
            ctx.stroke();
        }
    }

    // 5. Minimapa de Rutas (Solo visible en Game Over o Victoria, NUNCA estorbando la vista durante la carrera)
    if (GameState.gameOver || GameState.gameWon) {
        drawCourseMap();
    }

    // 6. Banner de Checkpoint / Alertas con sombra de contraste
    if (GameState.banner.timer > 0) {
        ctx.textAlign = 'center';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.fillText(GameState.banner.text, CANVAS_WIDTH / 2 + 1.5, 76.5);
        ctx.fillStyle = GameState.banner.color;
        ctx.fillText(GameState.banner.text, CANVAS_WIDTH / 2, 75);
        if (GameState.banner.subtext) {
            ctx.font = '9px "Press Start 2P", monospace';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
            ctx.fillText(GameState.banner.subtext, CANVAS_WIDTH / 2 + 1, 96);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(GameState.banner.subtext, CANVAS_WIDTH / 2, 95);
        }
    }
    } finally {
        ctx.restore();
    }
}

function drawTrapezoid(x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
}

// Minimapa de Rutas (Pirámide de 5 Metas A, B, C, D, E de OutRun 1986)
function drawCourseMap() {
    const mapW = 108;
    const mapH = 54;
    const mapX = Math.round((CANVAS_WIDTH - mapW) / 2);
    const mapY = 105;

    ctx.save();
    try {
        // Marco estilizado translúcido con esquinas redondeadas
    ctx.fillStyle = 'rgba(10, 15, 13, 0.82)';
    ctx.beginPath();
    ctx.roundRect(mapX, mapY, mapW, mapH, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(61, 255, 138, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Título
    ctx.fillStyle = '#3dff8a';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('COURSE', mapX + 6, mapY + 11);

    const centerX = mapX + (mapW / 2);
    const startY = mapY + 18;
    const tierStepY = 7.8;
    const nodeSpacingX = 15.5;

    const getNodePos = (t, i) => {
        const tierW = t * nodeSpacingX;
        const x = centerX - (tierW / 2) + (i * nodeSpacingX);
        const y = startY + (t * tierStepY);
        return { x, y };
    };

    // 1. Líneas de conexión
    for (let t = 0; t < 4; t++) {
        for (let i = 0; i <= t; i++) {
            const from = getNodePos(t, i);
            const toLeft = getNodePos(t + 1, i);
            const toRight = getNodePos(t + 1, i + 1);

            const currPath = GameState.routePath[t]?.index;
            const nextPath = GameState.routePath[t + 1]?.index;
            const isTakenLeft = (currPath === i && nextPath === i);
            const isTakenRight = (currPath === i && nextPath === i + 1);

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(toLeft.x, toLeft.y);
            ctx.strokeStyle = isTakenLeft ? '#ffb703' : 'rgba(255, 255, 255, 0.22)';
            ctx.lineWidth = isTakenLeft ? 2.0 : 1.0;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(toRight.x, toRight.y);
            ctx.strokeStyle = isTakenRight ? '#ffb703' : 'rgba(255, 255, 255, 0.22)';
            ctx.lineWidth = isTakenRight ? 2.0 : 1.0;
            ctx.stroke();
        }
    }

    // 2. Nodos del árbol
    const pulse = (Math.sin(Date.now() / 160) + 1) / 2;

    for (let t = 0; t < 5; t++) {
        for (let i = 0; i <= t; i++) {
            const pos = getNodePos(t, i);
            const isCurrent = (GameState.currentTier === t && GameState.currentRouteIndex === i);
            const isVisited = GameState.routePath.some(p => p.tier === t && p.index === i);

            if (t === 4) {
                // Nivel 5: Metas A, B, C, D, E
                const goalLetter = ['A', 'B', 'C', 'D', 'E'][i];
                ctx.font = '6px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                if (isCurrent && GameState.gameWon) {
                    ctx.fillStyle = '#ffeaa7';
                    ctx.fillText(goalLetter, pos.x, pos.y);
                } else if (isCurrent) {
                    ctx.fillStyle = `rgb(${Math.round(61 + pulse * 100)}, 255, ${Math.round(138 + pulse * 100)})`;
                    ctx.fillText(goalLetter, pos.x, pos.y);
                } else {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                    ctx.fillText(goalLetter, pos.x, pos.y);
                }
            } else {
                ctx.beginPath();
                if (isCurrent) {
                    ctx.arc(pos.x, pos.y, 3.2 + pulse * 1.0, 0, Math.PI * 2);
                    ctx.fillStyle = '#3dff8a';
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.0;
                    ctx.stroke();
                } else if (isVisited) {
                    ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffb703';
                    ctx.fill();
                } else {
                    ctx.arc(pos.x, pos.y, 1.8, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                    ctx.fill();
                }
            }
        }
    }
    } finally {
        ctx.restore();
    }
}

// Sprites de Escenarios Naturales y Detallados (Palmeras frondosas, cactus acanalados, pinos nevados, mesetas, columnas con hiedra, molinos, farolas y carteles HD)
function drawWorldSprite(spriteObj, x, y, scale, roadHalfW = 0) {
    const type = (typeof spriteObj === 'string') ? spriteObj : spriteObj.type;
    const size = Math.round(scale * 190000);
    if (size < 4) return;

    ctx.save();
    try {
        ctx.translate(x, y);

        if (type === 'palm') {
            // Sombra suave de palmera
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.28, size * 0.06, 0, 0, Math.PI * 2);
            ctx.fill();

            // Tronco curvado fibroso con luz cálida lateral y textura
            const trunkGrad = ctx.createLinearGradient(-size * 0.06, 0, size * 0.05, 0);
            trunkGrad.addColorStop(0, '#3e2310');
            trunkGrad.addColorStop(0.55, '#8c582b');
            trunkGrad.addColorStop(1, '#2b1608');

            ctx.fillStyle = trunkGrad;
            ctx.beginPath();
            ctx.moveTo(-size * 0.052, 0);
            ctx.quadraticCurveTo(-size * 0.075, -size * 0.5, -size * 0.024, -size);
            ctx.lineTo(size * 0.024, -size);
            ctx.quadraticCurveTo(-size * 0.018, -size * 0.5, size * 0.052, 0);
            ctx.closePath();
            ctx.fill();

            // Anillos de corteza
            if (size > 16) {
                ctx.fillStyle = 'rgba(30, 14, 5, 0.42)';
                for (let py = -size * 0.92; py < 0; py += size * 0.075) {
                    ctx.beginPath();
                    ctx.ellipse(-size * 0.042 * (1 + py / size), py, size * 0.045, size * 0.011, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Frondas inferiores más oscuras (profundidad de copa)
            const backFronds = [-165, -135, -45, -15];
            backFronds.forEach(deg => {
                const rad = (deg * Math.PI) / 180;
                const frondLen = size * 0.48;
                const tipX = Math.cos(rad) * frondLen;
                const tipY = -size + Math.sin(rad) * frondLen + size * 0.16;
                ctx.fillStyle = '#047857';
                ctx.beginPath();
                ctx.moveTo(0, -size);
                ctx.quadraticCurveTo(tipX * 0.48, -size + Math.sin(rad) * frondLen * 0.18 - size * 0.10, tipX, tipY);
                ctx.quadraticCurveTo(tipX * 0.52, -size + Math.sin(rad) * frondLen * 0.35 + size * 0.04, 0, -size + size * 0.03);
                ctx.closePath();
                ctx.fill();
            });

            // Cocos con brillo
            const drawCoconut = (cx, cy) => {
                const cGrad = ctx.createRadialGradient(cx - 1, cy - 1, 0.5, cx, cy, Math.max(1, size * 0.042));
                cGrad.addColorStop(0, '#8d6e63');
                cGrad.addColorStop(1, '#2d1810');
                ctx.fillStyle = cGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, size * 0.042, 0, Math.PI * 2);
                ctx.fill();
            };
            drawCoconut(-size * 0.04, -size + size * 0.03);
            drawCoconut(size * 0.04, -size + size * 0.03);
            drawCoconut(0, -size + size * 0.052);

            // Frondas superiores plumosas con brillo tropical
            const frontFronds = [-150, -120, -90, -60, -30, -105, -75];
            frontFronds.forEach((deg, idx) => {
                const rad = (deg * Math.PI) / 180;
                const frondLen = size * (0.46 + (idx % 3) * 0.07);
                const tipX = Math.cos(rad) * frondLen;
                const tipY = -size + Math.sin(rad) * frondLen + size * 0.14;
                const ctrlX = tipX * 0.52;
                const ctrlY = -size + Math.sin(rad) * frondLen * 0.15 - size * 0.11;

                // Hojas plumosas
                ctx.fillStyle = idx % 2 === 0 ? '#10b981' : '#34d399';
                ctx.beginPath();
                ctx.moveTo(0, -size);
                ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
                ctx.quadraticCurveTo(tipX * 0.45, -size + Math.sin(rad) * frondLen * 0.4 + size * 0.03, 0, -size + size * 0.025);
                ctx.closePath();
                ctx.fill();

                // Nervio iluminado superior
                if (size > 20) {
                    ctx.beginPath();
                    ctx.moveTo(0, -size);
                    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
                    ctx.strokeStyle = 'rgba(167, 243, 208, 0.55)';
                    ctx.lineWidth = Math.max(1, size * 0.015);
                    ctx.stroke();
                }
            });
        } else if (type === 'cactus') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.22, size * 0.05, 0, 0, Math.PI * 2);
            ctx.fill();

            const cGrad = ctx.createLinearGradient(-size * 0.07, 0, size * 0.07, 0);
            cGrad.addColorStop(0, '#0f5132');
            cGrad.addColorStop(0.35, '#2dd4bf');
            cGrad.addColorStop(0.75, '#0d9488');
            cGrad.addColorStop(1, '#115e59');

            ctx.fillStyle = cGrad;
            ctx.beginPath();
            ctx.roundRect(-size * 0.07, -size * 0.85, size * 0.14, size * 0.85, [size * 0.07, size * 0.07, 0, 0]);
            ctx.fill();

            // Brazos curvados orgánicos
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#0d9488';
            ctx.lineWidth = Math.max(2, size * 0.09);
            ctx.beginPath();
            ctx.moveTo(-size * 0.05, -size * 0.48);
            ctx.quadraticCurveTo(-size * 0.21, -size * 0.46, -size * 0.21, -size * 0.72);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(size * 0.05, -size * 0.38);
            ctx.quadraticCurveTo(size * 0.21, -size * 0.36, size * 0.21, -size * 0.65);
            ctx.stroke();

            // Costillas verticales y flores del desierto en puntas
            if (size > 22) {
                ctx.strokeStyle = 'rgba(204, 251, 241, 0.35)';
                ctx.lineWidth = Math.max(1, size * 0.015);
                ctx.beginPath();
                ctx.moveTo(-size * 0.025, -size * 0.80);
                ctx.lineTo(-size * 0.025, -size * 0.05);
                ctx.moveTo(size * 0.025, -size * 0.80);
                ctx.lineTo(size * 0.025, -size * 0.05);
                ctx.stroke();

                // Flores en la copa
                ctx.fillStyle = '#fb7185';
                ctx.beginPath();
                ctx.arc(0, -size * 0.87, size * 0.032, 0, Math.PI * 2);
                ctx.arc(-size * 0.21, -size * 0.76, size * 0.024, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (type === 'pine') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.26, size * 0.055, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#451a03';
            ctx.beginPath();
            ctx.roundRect(-size * 0.045, -size * 0.20, size * 0.09, size * 0.20, 2);
            ctx.fill();

            const drawPineTier = (tierY, w, h, col1, col2, snowDepth) => {
                const pGrad = ctx.createLinearGradient(-w / 2, tierY - h, w / 2, tierY);
                pGrad.addColorStop(0, col1);
                pGrad.addColorStop(0.6, col2);
                pGrad.addColorStop(1, '#022c22');
                ctx.fillStyle = pGrad;
                ctx.beginPath();
                ctx.moveTo(-w / 2, tierY);
                ctx.quadraticCurveTo(-w * 0.18, tierY - h * 0.55, 0, tierY - h);
                ctx.quadraticCurveTo(w * 0.18, tierY - h * 0.55, w / 2, tierY);
                ctx.quadraticCurveTo(w * 0.25, tierY + h * 0.10, 0, tierY + h * 0.05);
                ctx.quadraticCurveTo(-w * 0.25, tierY + h * 0.10, -w / 2, tierY);
                ctx.fill();

                if (snowDepth && size > 18) {
                    ctx.fillStyle = 'rgba(248, 250, 252, 0.88)';
                    ctx.beginPath();
                    ctx.moveTo(-w * 0.25, tierY - h * 0.45);
                    ctx.quadraticCurveTo(0, tierY - h * 1.05, w * 0.25, tierY - h * 0.45);
                    ctx.quadraticCurveTo(0, tierY - h * 0.58, -w * 0.25, tierY - h * 0.45);
                    ctx.fill();
                }
            };
            drawPineTier(-size * 0.14, size * 0.56, size * 0.34, '#15803d', '#064e3b', false);
            drawPineTier(-size * 0.36, size * 0.45, size * 0.30, '#16a34a', '#14532d', true);
            drawPineTier(-size * 0.56, size * 0.35, size * 0.27, '#22c55e', '#15803d', true);
            drawPineTier(-size * 0.74, size * 0.22, size * 0.22, '#4ade80', '#166534', true);
        } else if (type === 'rock') {
            // Sombra en suelo
            ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.38, size * 0.06, 0, 0, Math.PI * 2);
            ctx.fill();

            // Meseta estratificada de arenisca roja (Grand Canyon)
            const rGrad = ctx.createLinearGradient(-size * 0.35, -size * 0.62, size * 0.35, 0);
            rGrad.addColorStop(0, '#d97706');
            rGrad.addColorStop(0.5, '#9a3412');
            rGrad.addColorStop(1, '#451a03');
            ctx.fillStyle = rGrad;
            ctx.beginPath();
            ctx.moveTo(-size * 0.36, 0);
            ctx.lineTo(-size * 0.28, -size * 0.42);
            ctx.lineTo(-size * 0.10, -size * 0.62);
            ctx.lineTo(size * 0.18, -size * 0.58);
            ctx.lineTo(size * 0.36, -size * 0.26);
            ctx.lineTo(size * 0.34, 0);
            ctx.closePath();
            ctx.fill();

            // Estratos sedimentarios cálidos horizontales
            if (size > 16) {
                ctx.fillStyle = 'rgba(253, 186, 116, 0.38)';
                ctx.fillRect(-size * 0.24, -size * 0.36, size * 0.42, size * 0.035);
                ctx.fillStyle = 'rgba(251, 146, 60, 0.32)';
                ctx.fillRect(-size * 0.28, -size * 0.18, size * 0.48, size * 0.035);
            }

            // Cara sombreada derecha
            ctx.fillStyle = 'rgba(40, 12, 4, 0.45)';
            ctx.beginPath();
            ctx.moveTo(size * 0.04, 0);
            ctx.lineTo(size * 0.08, -size * 0.59);
            ctx.lineTo(size * 0.18, -size * 0.58);
            ctx.lineTo(size * 0.36, -size * 0.26);
            ctx.lineTo(size * 0.34, 0);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'column') {
            // Sombra proyectada
            ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.22, size * 0.05, 0, 0, Math.PI * 2);
            ctx.fill();

            const colW = size * 0.20;
            const colH = size * 0.85;

            // Pedestal escalonado
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(-colW * 0.90, -size * 0.06, colW * 1.8, size * 0.06);
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(-colW * 0.72, -size * 0.11, colW * 1.44, size * 0.05);

            // Fuste de mármol con gradiente cilíndrico
            const colGrad = ctx.createLinearGradient(-colW / 2, 0, colW / 2, 0);
            colGrad.addColorStop(0, '#94a3b8');
            colGrad.addColorStop(0.35, '#ffffff');
            colGrad.addColorStop(0.75, '#e2e8f0');
            colGrad.addColorStop(1, '#64748b');
            ctx.fillStyle = colGrad;
            ctx.fillRect(-colW / 2, -colH, colW, colH - size * 0.11);

            // Estrías verticales dóricas
            if (size > 20) {
                ctx.fillStyle = 'rgba(71, 85, 105, 0.30)';
                for (let f = -1; f <= 1; f++) {
                    ctx.fillRect(f * colW * 0.26 - Math.max(0.5, colW * 0.05), -colH + size * 0.03, Math.max(1, colW * 0.10), colH - size * 0.16);
                }
                // Hiedra trepadora verde
                ctx.fillStyle = '#16a34a';
                ctx.beginPath();
                ctx.arc(-colW * 0.28, -colH * 0.42, size * 0.035, 0, Math.PI * 2);
                ctx.arc(colW * 0.12, -colH * 0.52, size * 0.032, 0, Math.PI * 2);
                ctx.arc(-colW * 0.12, -colH * 0.65, size * 0.030, 0, Math.PI * 2);
                ctx.fill();
            }

            // Capitel esculpido con volutas
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.roundRect(-colW * 0.82, -colH - size * 0.09, colW * 1.64, size * 0.09, 2);
            ctx.fill();
            if (size > 18) {
                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath();
                ctx.arc(-colW * 0.65, -colH - size * 0.02, colW * 0.22, 0, Math.PI * 2);
                ctx.arc(colW * 0.65, -colH - size * 0.02, colW * 0.22, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (type === 'windmill') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.26, size * 0.055, 0, 0, Math.PI * 2);
            ctx.fill();

            const baseW = size * 0.30;
            const bodyH = size * 0.76;
            const towerGrad = ctx.createLinearGradient(-baseW / 2, 0, baseW / 2, 0);
            towerGrad.addColorStop(0, '#cbd5e1');
            towerGrad.addColorStop(0.4, '#ffffff');
            towerGrad.addColorStop(1, '#94a3b8');
            ctx.fillStyle = towerGrad;
            ctx.beginPath();
            ctx.moveTo(-baseW / 2, 0);
            ctx.lineTo(-baseW * 0.34, -bodyH);
            ctx.lineTo(baseW * 0.34, -bodyH);
            ctx.lineTo(baseW / 2, 0);
            ctx.closePath();
            ctx.fill();

            // Puerta de madera y ventana cálida iluminada
            if (size > 20) {
                ctx.fillStyle = '#78350f';
                ctx.beginPath();
                ctx.roundRect(-baseW * 0.14, -bodyH * 0.24, baseW * 0.28, bodyH * 0.24, [baseW * 0.14, baseW * 0.14, 0, 0]);
                ctx.fill();
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.roundRect(-baseW * 0.10, -bodyH * 0.62, baseW * 0.20, bodyH * 0.16, 2);
                ctx.fill();
            }

            // Techo cónico de tejas
            ctx.fillStyle = '#c2410c';
            ctx.beginPath();
            ctx.moveTo(-baseW * 0.42, -bodyH);
            ctx.lineTo(0, -bodyH - size * 0.20);
            ctx.lineTo(baseW * 0.42, -bodyH);
            ctx.closePath();
            ctx.fill();

            // Aspas de madera con entramado girando fluidamente
            const angle = (Date.now() / 360) % (Math.PI * 2);
            ctx.save();
            ctx.translate(0, -bodyH + size * 0.04);
            ctx.rotate(angle);
            for (let b = 0; b < 4; b++) {
                ctx.rotate(Math.PI / 2);
                ctx.fillStyle = '#78350f';
                ctx.fillRect(-size * 0.012, 0, size * 0.024, size * 0.46);
                ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
                ctx.beginPath();
                ctx.roundRect(size * 0.012, size * 0.09, size * 0.068, size * 0.35, 2);
                ctx.fill();
            }
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(1.5, size * 0.032), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (type === 'city') {
            // Farola moderna / neón de autopista con cono luminoso
            const postW = Math.max(1.5, size * 0.045);
            const postH = size * 0.92;
            const armDir = x < CANVAS_WIDTH / 2 ? 1 : -1;

            // Halo luminoso suave
            const lampX = armDir * size * 0.14;
            const lampY = -postH;
            const lightGrad = ctx.createRadialGradient(lampX, lampY + size * 0.04, 1, lampX, lampY + size * 0.15, size * 0.36);
            lightGrad.addColorStop(0, 'rgba(0, 243, 255, 0.42)');
            lightGrad.addColorStop(0.5, 'rgba(255, 0, 234, 0.16)');
            lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = lightGrad;
            ctx.beginPath();
            ctx.arc(lampX, lampY + size * 0.12, size * 0.36, 0, Math.PI * 2);
            ctx.fill();

            // Poste metálico y brazo en voladizo
            ctx.fillStyle = '#475569';
            ctx.fillRect(-postW / 2, -postH, postW, postH);
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.roundRect(-postW, -size * 0.06, postW * 2, size * 0.06, 1);
            ctx.fill();
            ctx.fillRect(Math.min(0, lampX), -postH, Math.abs(lampX), postW * 0.8);

            // Barra luminosa LED neón
            ctx.fillStyle = '#00f3ff';
            ctx.beginPath();
            ctx.roundRect(lampX - size * 0.08, -postH - size * 0.015, size * 0.16, Math.max(2, size * 0.04), 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(lampX - size * 0.05, -postH, size * 0.10, Math.max(1, size * 0.018));
        } else if (type === 'bush' || type === 'flower_bush') {
            const bw = size * 0.42;
            const bh = size * 0.25;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
            ctx.beginPath();
            ctx.ellipse(0, 0, bw * 0.62, size * 0.045, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#15803d';
            ctx.beginPath();
            ctx.arc(-bw * 0.26, -bh * 0.42, bh * 0.45, 0, Math.PI * 2);
            ctx.arc(bw * 0.26, -bh * 0.42, bh * 0.45, 0, Math.PI * 2);
            ctx.arc(0, -bh * 0.65, bh * 0.56, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(-bw * 0.16, -bh * 0.52, bh * 0.34, 0, Math.PI * 2);
            ctx.arc(bw * 0.14, -bh * 0.50, bh * 0.32, 0, Math.PI * 2);
            ctx.fill();

            if (type === 'flower_bush' && size > 18) {
                const flowerCols = ['#f43f5e', '#facc15', '#fb923c', '#f472b6'];
                for (let fl = 0; fl < 4; fl++) {
                    ctx.fillStyle = flowerCols[fl];
                    ctx.beginPath();
                    ctx.arc((-0.25 + fl * 0.16) * bw, -bh * (0.45 + (fl % 2) * 0.28), Math.max(1, size * 0.022), 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (type === 'beach_umbrella') {
            const uW = size * 0.48;
            const uH = size * 0.45;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
            ctx.beginPath();
            ctx.ellipse(size * 0.05, 0, uW * 0.48, size * 0.045, 0, 0, Math.PI * 2);
            ctx.fill();

            // Mástil inclinado
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = Math.max(1.2, size * 0.022);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-size * 0.04, -uH);
            ctx.stroke();

            // Toldo a rayas playero
            ctx.save();
            ctx.translate(-size * 0.04, -uH);
            ctx.rotate(-0.14);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(0, 0, uW * 0.5, Math.PI, 0);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, uW * 0.5, Math.PI * 1.25, Math.PI * 1.75);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(0, -uW * 0.5, Math.max(1, size * 0.022), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (type === 'city_billboard') {
            const bW = Math.round(size * 0.85);
            const bH = Math.round(size * 0.36);
            if (bW < 6) return;
            const postH = Math.round(size * 0.42);
            const postW = Math.max(1.5, Math.round(bW * 0.05));

            ctx.fillStyle = '#334155';
            ctx.fillRect(-bW * 0.30, -postH, postW, postH);
            ctx.fillRect(bW * 0.30 - postW, -postH, postW, postH);

            const boardY = -postH - bH;
            const bbGrad = ctx.createLinearGradient(-bW / 2, boardY, bW / 2, boardY + bH);
            bbGrad.addColorStop(0, '#3b0764');
            bbGrad.addColorStop(0.5, '#be185d');
            bbGrad.addColorStop(1, '#0e7490');
            ctx.fillStyle = bbGrad;
            ctx.beginPath();
            ctx.roundRect(-bW / 2, boardY, bW, bH, Math.min(3, bW * 0.05));
            ctx.fill();

            ctx.strokeStyle = '#00f3ff';
            ctx.lineWidth = Math.max(1, bW * 0.02);
            ctx.stroke();

            if (bW >= 34) {
                ctx.fillStyle = '#fef08a';
                ctx.font = `${Math.max(5, Math.floor(bH * 0.38))}px "Press Start 2P"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('TURBO', 0, boardY + bH / 2);
            }
        } else if (type === 'fork_sign_left' || type === 'fork_sign_right') {
            // Señales de bifurcación de autopista con sombra proyectada y brillo metálico
            const signW = Math.round(size * 0.95);
            const signH = Math.round(size * 0.42);
            if (signW < 6) return;
            const postH = Math.round(signH * 1.15);
            const postW = Math.max(1, Math.round(signW * 0.04));

            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.ellipse(0, 0, signW * 0.42, Math.max(1.5, size * 0.03), 0, 0, Math.PI * 2);
            ctx.fill();

            // Doble soporte de acero galvanizado
            ctx.fillStyle = '#64748b';
            ctx.fillRect(-signW * 0.35 - postW / 2, -postH, postW, postH);
            ctx.fillRect(signW * 0.35 - postW / 2, -postH, postW, postH);

            if (postW > 1) {
                ctx.fillStyle = '#94a3b8';
                ctx.fillRect(-signW * 0.35 - postW, -Math.max(2, postW), postW * 2, Math.max(2, postW));
                ctx.fillRect(signW * 0.35 - postW, -Math.max(2, postW), postW * 2, Math.max(2, postW));
            }

            const boardY = -postH - signH;
            const boardGrad = ctx.createLinearGradient(0, boardY, 0, boardY + signH);
            boardGrad.addColorStop(0, '#047857');
            boardGrad.addColorStop(1, '#064e3b');
            ctx.fillStyle = boardGrad;
            ctx.beginPath();
            if (signW >= 20) {
                ctx.roundRect(-signW / 2, boardY, signW, signH, Math.min(4, Math.floor(signW * 0.06)));
            } else {
                ctx.rect(-signW / 2, boardY, signW, signH);
            }
            ctx.fill();

            if (signW >= 14) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = Math.max(1, signW * 0.025);
                ctx.stroke();
            }

            if (signW >= 36) {
                ctx.fillStyle = '#facc15';
                ctx.font = `${Math.max(5, Math.floor(size * 0.075))}px "Press Start 2P"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                const arrowText = (type === 'fork_sign_left') ? '◄ SALIDA' : 'SALIDA ►';
                ctx.fillText(arrowText, 0, boardY + Math.max(2, signH * 0.12));

                ctx.fillStyle = '#ffffff';
                ctx.font = `${Math.max(5, Math.floor(size * 0.085))}px "Press Start 2P"`;
                ctx.textBaseline = 'bottom';
                const label = (spriteObj.label || 'RUTA').substring(0, 14);
                ctx.fillText(label, 0, boardY + signH - Math.max(2, signH * 0.10));
            } else if (signW >= 12) {
                ctx.fillStyle = '#facc15';
                const barH = Math.max(1, Math.floor(signH * 0.22));
                ctx.fillRect(-signW * 0.35, boardY + Math.floor(signH * 0.25), signW * 0.7, barH);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-signW * 0.30, boardY + Math.floor(signH * 0.60), signW * 0.6, barH);
            }
        } else if (type === 'median_gore' || type === 'median_sign') {
            const goreW = Math.round(size * 0.38);
            const goreH = Math.round(size * 0.52);
            if (goreW < 4) return;
            const cushionH = Math.round(goreH * 0.52);

            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.roundRect(-goreW / 2, -cushionH, goreW, cushionH, [Math.min(3, goreW * 0.1), Math.min(3, goreW * 0.1), 0, 0]);
            ctx.fill();

            if (goreW >= 12) {
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = Math.max(1, goreW * 0.04);
                ctx.stroke();

                ctx.save();
                ctx.clip();
                ctx.fillStyle = '#0f172a';
                const stripeW = Math.max(2, Math.floor(goreW * 0.16));
                for (let bx = -goreW * 1.5; bx < goreW * 1.5; bx += stripeW * 2) {
                    ctx.beginPath();
                    ctx.moveTo(bx, 0);
                    ctx.lineTo(bx + stripeW, 0);
                    ctx.lineTo(bx + stripeW + cushionH, -cushionH);
                    ctx.lineTo(bx + cushionH, -cushionH);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
            }

            const signS = Math.round(size * 0.24);
            const signCenterY = -cushionH - signS * 0.7;
            const postW = Math.max(1, Math.round(signS * 0.1));
            ctx.fillStyle = '#334155';
            ctx.fillRect(-postW / 2, -cushionH - signS * 1.2, postW, signS * 1.2);

            ctx.save();
            ctx.translate(0, signCenterY);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.roundRect(-signS / 2, -signS / 2, signS, signS, Math.min(2, signS * 0.15));
            ctx.fill();
            if (signS >= 10) {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = Math.max(1, signS * 0.06);
                ctx.stroke();
            }
            ctx.restore();

            if (signS >= 14) {
                ctx.fillStyle = '#000000';
                ctx.font = `${Math.max(5, Math.floor(signS * 0.38))}px "Press Start 2P"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('◄│►', 0, signCenterY);
            }
        } else if (type === 'curve_sign_left' || type === 'curve_sign_right') {
            const signW = Math.round(size * 0.38);
            const signH = Math.round(size * 0.30);
            if (signW < 4) return;
            const postH = Math.round(signH * 1.15);
            const postW = Math.max(1, Math.round(signW * 0.08));

            ctx.fillStyle = '#475569';
            ctx.fillRect(-postW / 2, -postH, postW, postH);

            const boardY = -postH - signH;
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.roundRect(-signW / 2, boardY, signW, signH, Math.min(3, signW * 0.1));
            ctx.fill();
            if (signW >= 10) {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = Math.max(1, signW * 0.05);
                ctx.stroke();
            }

            if (signW >= 14) {
                ctx.fillStyle = '#000000';
                ctx.font = `${Math.max(5, Math.floor(signH * 0.45))}px "Press Start 2P"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(type === 'curve_sign_left' ? '◄◄' : '►►', 0, boardY + signH / 2);
            }
        } else if (type === 'speed_sign') {
            const r = Math.round(size * 0.18);
            if (r < 3) return;
            const postH = Math.round(r * 2.2);
            const postW = Math.max(1, Math.round(r * 0.14));

            ctx.fillStyle = '#475569';
            ctx.fillRect(-postW / 2, -postH, postW, postH);

            const centerY = -postH - r;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, centerY, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = Math.max(1.5, r * 0.22);
            ctx.stroke();

            if (r >= 7) {
                ctx.fillStyle = '#0f172a';
                ctx.font = `${Math.max(5, Math.floor(r * 0.62))}px "Press Start 2P"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('240', 0, centerY);
            }
        } else if (type === 'checkpoint_arch') {
            // Pórtico ancho de borde exterior a borde exterior (cubre toda la pista y ambas bermas de lado a lado)
            const refHalfW = roadHalfW > 0 ? roadHalfW : Math.round(scale * ROAD_WIDTH * CANVAS_WIDTH / 2);
            const archW = Math.round(Math.max(size * 1.45, refHalfW * 2.40));
            const archH = Math.round(Math.max(size * 1.20, archW * 0.36));
            if (archW < 10) return;
            const postW = Math.max(2, Math.round(archW * 0.038));
            const barH = Math.max(4, Math.round(archH * 0.28));

            // Sombra proyectada de lado a lado sobre el asfalto
            ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
            ctx.fillRect(-archW * 0.52, -Math.max(2, archH * 0.03), archW * 1.04, Math.max(2, archH * 0.05));

            // Bases metálicas y torres laterales apoyadas sobre ambas bermas (izquierda y derecha)
            ctx.fillStyle = '#475569';
            ctx.fillRect(-archW / 2 - postW * 0.25, -postW * 0.9, postW * 1.5, postW * 0.9);
            ctx.fillRect(archW / 2 - postW * 1.25, -postW * 0.9, postW * 1.5, postW * 0.9);

            const postGrad = ctx.createLinearGradient(-postW / 2, 0, postW / 2, 0);
            postGrad.addColorStop(0, '#94a3b8');
            postGrad.addColorStop(0.5, '#f8fafc');
            postGrad.addColorStop(1, '#64748b');
            ctx.fillStyle = postGrad;
            ctx.fillRect(-archW / 2, -archH, postW, archH);
            ctx.fillRect(archW / 2 - postW, -archH, postW, archH);

            // Celosía diagonal interior en ambos pilares cuando está cerca
            if (postW >= 4) {
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = Math.max(1, postW * 0.14);
                const step = Math.max(6, Math.floor(archH / 6));
                ctx.beginPath();
                for (let py = -archH + barH; py < -step * 0.5; py += step) {
                    const yBtm = Math.min(0, py + step);
                    ctx.moveTo(-archW / 2 + 1, py);
                    ctx.lineTo(-archW / 2 + postW - 1, yBtm);
                    ctx.moveTo(archW / 2 - postW + 1, py);
                    ctx.lineTo(archW / 2 - 1, yBtm);
                }
                ctx.stroke();
            }

            // Viga superior panorámica de lado a lado
            const archGrad = ctx.createLinearGradient(0, -archH, 0, -archH + barH);
            archGrad.addColorStop(0, '#fde047');
            archGrad.addColorStop(0.45, '#f59e0b');
            archGrad.addColorStop(1, '#b45309');
            ctx.fillStyle = archGrad;
            ctx.beginPath();
            ctx.roundRect(-archW / 2, -archH, archW, barH, Math.min(4, archW * 0.02));
            ctx.fill();

            // Franja ajedrezada inferior decorativa en el cartel
            if (archW >= 24) {
                const stripH = Math.max(2, Math.round(barH * 0.18));
                const checkCount = Math.min(28, Math.max(8, Math.floor(archW / Math.max(4, stripH * 1.4))));
                const cellW = archW / checkCount;
                for (let ci = 0; ci < checkCount; ci++) {
                    ctx.fillStyle = (ci % 2 === 0) ? '#0f172a' : '#ffffff';
                    ctx.fillRect(-archW / 2 + ci * cellW, -archH + barH - stripH, cellW + 0.5, stripH);
                }

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = Math.max(1, barH * 0.06);
                ctx.beginPath();
                ctx.roundRect(-archW / 2, -archH, archW, barH, Math.min(4, archW * 0.02));
                ctx.stroke();

                // Luces LED estroboscópicas en ambos extremos del pórtico
                const t = Math.floor(Date.now() / 140) % 2;
                const ledCol = t === 0 ? '#38bdf8' : '#f43f5e';
                const ledR = Math.max(1.5, Math.floor(barH * 0.20));
                const lx1 = -archW / 2 + postW + ledR * 1.6;
                const lx2 = archW / 2 - postW - ledR * 1.6;
                const ly = -archH + (barH - stripH) / 2;

                ctx.fillStyle = t === 0 ? 'rgba(56, 189, 248, 0.42)' : 'rgba(244, 63, 94, 0.42)';
                ctx.beginPath();
                ctx.arc(lx1, ly, ledR * 2.2, 0, Math.PI * 2);
                ctx.arc(lx2, ly, ledR * 2.2, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = ledCol;
                ctx.beginPath();
                ctx.arc(lx1, ly, ledR, 0, Math.PI * 2);
                ctx.arc(lx2, ly, ledR, 0, Math.PI * 2);
                ctx.fill();
            }

            if (archW >= 36) {
                const stripH = Math.max(2, Math.round(barH * 0.18));
                const textZoneH = barH - stripH;
                const label = (spriteObj.label || 'CHECKPOINT').substring(0, 18);
                const prefix = spriteObj.forkBranch === 'left' ? '◄ ' : (spriteObj.forkBranch === 'right' ? '' : '');
                const suffix = spriteObj.forkBranch === 'right' ? ' ►' : '';
                const fullText = `${prefix}${label}${suffix}`;
                const fontSize = Math.max(5, Math.min(Math.floor(textZoneH * 0.48), Math.floor((archW * 0.72) / Math.max(8, fullText.length))));

                ctx.font = `${fontSize}px "Press Start 2P"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#0f172a';
                ctx.fillText(fullText, 0.9, -archH + textZoneH / 2 + 0.9);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(fullText, 0, -archH + textZoneH / 2);
            }
        } else if (type === 'finish_arch') {
            // Gran Meta Final spanning 100% desde el lado izquierdo hasta el lado derecho (incluyendo bermas)
            const refHalfW = roadHalfW > 0 ? roadHalfW : Math.round(scale * ROAD_WIDTH * CANVAS_WIDTH / 2);
            const archW = Math.round(Math.max(size * 1.75, refHalfW * 2.44));
            const archH = Math.round(Math.max(size * 1.32, archW * 0.38));
            if (archW < 10) return;
            const postW = Math.max(2, Math.round(archW * 0.042));
            const barH = Math.max(5, Math.round(archH * 0.30));

            ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
            ctx.fillRect(-archW * 0.52, -Math.max(2, archH * 0.03), archW * 1.04, Math.max(2, archH * 0.055));

            // Bases y columnas ajedrezadas de lado a lado sobre las bermas
            ctx.fillStyle = '#334155';
            ctx.fillRect(-archW / 2 - postW * 0.25, -postW * 0.9, postW * 1.5, postW * 0.9);
            ctx.fillRect(archW / 2 - postW * 1.25, -postW * 0.9, postW * 1.5, postW * 0.9);

            const sqH = Math.max(2, Math.floor(archH / 7));
            for (let yPos = 0; yPos < archH; yPos += sqH) {
                const isWhite = (Math.floor(yPos / sqH) % 2 === 0);
                ctx.fillStyle = isWhite ? '#ffffff' : '#0f172a';
                ctx.fillRect(-archW / 2, -archH + yPos, postW, sqH);
                ctx.fillRect(archW / 2 - postW, -archH + yPos, postW, sqH);
            }

            const goalGrad = ctx.createLinearGradient(0, -archH, 0, -archH + barH);
            goalGrad.addColorStop(0, '#fef08a');
            goalGrad.addColorStop(0.45, '#f59e0b');
            goalGrad.addColorStop(1, '#92400e');
            ctx.fillStyle = goalGrad;
            ctx.beginPath();
            ctx.roundRect(-archW / 2, -archH, archW, barH, Math.min(5, archW * 0.02));
            ctx.fill();

            if (archW >= 24) {
                // Franjas ajedrezadas superior e inferior en la gran viga de meta
                const trimH = Math.max(2, Math.round(barH * 0.16));
                const checkCount = Math.min(32, Math.max(10, Math.floor(archW / Math.max(4, trimH * 1.4))));
                const cellW = archW / checkCount;
                for (let ci = 0; ci < checkCount; ci++) {
                    ctx.fillStyle = (ci % 2 === 0) ? '#0f172a' : '#ffffff';
                    ctx.fillRect(-archW / 2 + ci * cellW, -archH, cellW + 0.5, trimH);
                    ctx.fillStyle = (ci % 2 === 1) ? '#0f172a' : '#ffffff';
                    ctx.fillRect(-archW / 2 + ci * cellW, -archH + barH - trimH, cellW + 0.5, trimH);
                }

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = Math.max(1, barH * 0.06);
                ctx.beginPath();
                ctx.roundRect(-archW / 2, -archH, archW, barH, Math.min(5, archW * 0.02));
                ctx.stroke();

                // Banderines de victoria ondeantes en lo alto
                const wave = Math.sin(Date.now() / 120) * (barH * 0.16);
                ctx.fillStyle = '#f43f5e';
                ctx.beginPath();
                ctx.moveTo(-archW * 0.44, -archH);
                ctx.lineTo(-archW * 0.44 + postW * 1.8, -archH - barH * 0.45 + wave);
                ctx.lineTo(-archW * 0.44, -archH - barH * 0.72);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(archW * 0.44, -archH);
                ctx.lineTo(archW * 0.44 - postW * 1.8, -archH - barH * 0.45 - wave);
                ctx.lineTo(archW * 0.44, -archH - barH * 0.72);
                ctx.closePath();
                ctx.fill();
            }

            if (archW >= 40) {
                const trimH = Math.max(2, Math.round(barH * 0.16));
                const letter = spriteObj.goalLetter || 'GOAL';
                const goalText = `★ GOAL ${letter} ★`;
                const fontSize = Math.max(6, Math.min(Math.floor((barH - trimH * 2) * 0.55), Math.floor((archW * 0.75) / goalText.length)));
                ctx.font = `${fontSize}px "Press Start 2P"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#0f172a';
                ctx.fillText(goalText, 1.0, -archH + barH / 2 + 1.0);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(goalText, 0, -archH + barH / 2);
            }
        } else {
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(0, -size * 0.5, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    } finally {
        ctx.restore();
    }
}

// Coches Rivales HD con Proporciones Dinámicas, Inclinación en Carril y Acabado Metálico
function drawRivalCar(type, x, y, w, h, lean = 0) {
    if (w < 4) return;

    ctx.save();
    try {
        ctx.translate(x - w / 2, y - h);
        const rTilt = Math.max(-w * 0.08, Math.min(w * 0.08, lean * w * 0.10));

        // Sombra suave realista bajo el chasis
        const shGrad = ctx.createRadialGradient(w / 2 + rTilt * 0.5, h * 0.95, w * 0.15, w / 2 + rTilt * 0.5, h * 0.95, w * 0.58);
        shGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
        shGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.25)');
        shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = shGrad;
        ctx.beginPath();
        ctx.ellipse(w / 2 + rTilt * 0.5, h * 0.96, w * 0.58, h * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();

        const drawRivalTires = (yTop, tireWRatio, tireHRatio) => {
            ctx.fillStyle = '#09090b';
            ctx.beginPath();
            ctx.roundRect(0, h * yTop, w * tireWRatio, h * tireHRatio, Math.max(1, w * 0.03));
            ctx.roundRect(w * (1 - tireWRatio), h * yTop, w * tireWRatio, h * tireHRatio, Math.max(1, w * 0.03));
            ctx.fill();
        };

        const drawGlassReflection = (gx, gy, gw, gh) => {
            if (w < 20) return;
            ctx.fillStyle = 'rgba(186, 230, 253, 0.55)';
            ctx.beginPath();
            ctx.moveTo(gx + gw * 0.18, gy);
            ctx.lineTo(gx + gw * 0.42, gy);
            ctx.lineTo(gx + gw * 0.24, gy + gh);
            ctx.lineTo(gx + gw * 0.08, gy + gh);
            ctx.closePath();
            ctx.fill();
        };

        if (type === 'white_truck') {
            drawRivalTires(0.62, 0.20, 0.38);

            // Remolque con sombreado 3D lateral
            const trkGrad = ctx.createLinearGradient(0, 0, w, 0);
            trkGrad.addColorStop(0, '#e2e8f0');
            trkGrad.addColorStop(0.18, '#ffffff');
            trkGrad.addColorStop(0.82, '#f8fafc');
            trkGrad.addColorStop(1, '#cbd5e1');
            ctx.fillStyle = trkGrad;
            ctx.beginPath();
            ctx.roundRect(rTilt * 0.4, 0, w, h * 0.84, Math.max(1.5, w * 0.05));
            ctx.fill();

            if (w >= 14) {
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = Math.max(0.7, w * 0.015);
                ctx.stroke();

                // Puertas traseras y bisagras cromadas
                ctx.fillStyle = '#f1f5f9';
                ctx.fillRect(rTilt * 0.4 + w * 0.06, h * 0.08, w * 0.41, h * 0.68);
                ctx.fillRect(rTilt * 0.4 + w * 0.53, h * 0.08, w * 0.41, h * 0.68);

                ctx.fillStyle = '#64748b';
                const barW = Math.max(1, w * 0.025);
                ctx.fillRect(rTilt * 0.4 + w * 0.25, h * 0.08, barW, h * 0.68);
                ctx.fillRect(rTilt * 0.4 + w * 0.73, h * 0.08, barW, h * 0.68);

                // Franja reflectante roja-blanca DOT
                ctx.fillStyle = '#dc2626';
                ctx.fillRect(rTilt * 0.4 + w * 0.04, h * 0.78, w * 0.92, h * 0.065);
            }

            // Luces de gálibo superiores ámbar escaladas
            const gR = Math.max(0.8, w * 0.025);
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(rTilt * 0.4 + w * 0.14, h * 0.05, gR, 0, Math.PI * 2);
            ctx.arc(rTilt * 0.4 + w * 0.50, h * 0.05, gR, 0, Math.PI * 2);
            ctx.arc(rTilt * 0.4 + w * 0.86, h * 0.05, gR, 0, Math.PI * 2);
            ctx.fill();

            // Parachoques metálico inferior y luces traseras
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(w * 0.08, h * 0.85, w * 0.84, h * 0.08);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.roundRect(w * 0.08, h * 0.85, w * 0.18, h * 0.08, 1);
            ctx.roundRect(w * 0.74, h * 0.85, w * 0.18, h * 0.08, 1);
            ctx.fill();
        } else if (type === 'yellow_cab') {
            drawRivalTires(0.58, 0.18, 0.42);

            const btlGrad = ctx.createRadialGradient(w * 0.48 + rTilt, h * 0.42, w * 0.08, w * 0.5 + rTilt, h * 0.48, w * 0.52);
            btlGrad.addColorStop(0, '#fef9c3');
            btlGrad.addColorStop(0.5, '#facc15');
            btlGrad.addColorStop(1, '#a16207');
            ctx.fillStyle = btlGrad;
            ctx.beginPath();
            ctx.ellipse(w / 2 + rTilt, h * 0.52, w * 0.46, h * 0.45, 0, Math.PI, 0);
            ctx.roundRect(w * 0.02 + rTilt * 0.5, h * 0.48, w * 0.96, h * 0.37, Math.max(2, w * 0.06));
            ctx.fill();

            // Luneta trasera curva y reflejo solar
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.ellipse(w / 2 + rTilt, h * 0.38, w * 0.28, h * 0.19, 0, Math.PI, 0);
            ctx.fill();
            drawGlassReflection(w * 0.25 + rTilt, h * 0.21, w * 0.5, h * 0.16);

            // Rejilla ventilación motor trasero y matrícula
            if (w >= 24) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.fillRect(w * 0.35 + rTilt * 0.5, h * 0.56, w * 0.30, h * 0.04);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(w * 0.38 + rTilt * 0.5, h * 0.67, w * 0.24, h * 0.10);
            }

            // Defensas cromadas y faros rojos
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.roundRect(w * 0.06 + rTilt * 0.4, h * 0.79, w * 0.88, h * 0.09, Math.max(1, w * 0.03));
            ctx.fill();

            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(w * 0.16 + rTilt * 0.5, h * 0.66, Math.max(1.2, w * 0.065), 0, Math.PI * 2);
            ctx.arc(w * 0.84 + rTilt * 0.5, h * 0.66, Math.max(1.2, w * 0.065), 0, Math.PI * 2);
            ctx.fill();
        } else if (type === 'blue_coupe') {
            drawRivalTires(0.60, 0.20, 0.40);

            const blueGrad = ctx.createLinearGradient(0, 0, 0, h);
            blueGrad.addColorStop(0, '#7dd3fc');
            blueGrad.addColorStop(0.35, '#0284c7');
            blueGrad.addColorStop(0.85, '#0369a1');
            blueGrad.addColorStop(1, '#0c4a6e');
            ctx.fillStyle = blueGrad;
            ctx.beginPath();
            ctx.roundRect(w * 0.02 + rTilt * 0.5, h * 0.32, w * 0.96, h * 0.53, [w * 0.07, w * 0.07, w * 0.04, w * 0.04]);
            ctx.fill();

            // Cabina fastback y luneta trasera
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.roundRect(w * 0.18 + rTilt, h * 0.08, w * 0.64, h * 0.30, [w * 0.09, w * 0.09, 0, 0]);
            ctx.fill();
            drawGlassReflection(w * 0.22 + rTilt, h * 0.11, w * 0.56, h * 0.16);

            // Alerón Porsche Whale Tail con borde de color
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.roundRect(w * 0.07 + rTilt * 0.7, h * 0.31, w * 0.86, h * 0.11, Math.max(1, w * 0.03));
            ctx.fill();
            ctx.fillStyle = '#09090b';
            ctx.fillRect(w * 0.10 + rTilt * 0.7, h * 0.31, w * 0.80, h * 0.045);

            // Franja óptica trasera roja iluminada
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.roundRect(w * 0.08 + rTilt * 0.5, h * 0.54, w * 0.84, h * 0.12, 2);
            ctx.fill();
            ctx.fillStyle = '#fca5a5';
            ctx.fillRect(w * 0.11 + rTilt * 0.5, h * 0.56, w * 0.17, h * 0.07);
            ctx.fillRect(w * 0.72 + rTilt * 0.5, h * 0.56, w * 0.17, h * 0.07);
            if (w >= 26) {
                ctx.fillStyle = '#fef08a';
                ctx.fillRect(w * 0.42 + rTilt * 0.5, h * 0.69, w * 0.16, h * 0.09);
            }
        } else if (type === 'purple_muscle') {
            drawRivalTires(0.58, 0.22, 0.42);

            const purpGrad = ctx.createLinearGradient(0, 0, 0, h);
            purpGrad.addColorStop(0, '#d8b4fe');
            purpGrad.addColorStop(0.4, '#7e22ce');
            purpGrad.addColorStop(1, '#3b0764');
            ctx.fillStyle = purpGrad;
            ctx.beginPath();
            ctx.roundRect(w * 0.03 + rTilt * 0.5, h * 0.26, w * 0.94, h * 0.58, Math.max(2, w * 0.05));
            ctx.fill();

            // Doble franja deportiva blanca
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(w * 0.34 + rTilt * 0.6, h * 0.10, w * 0.09, h * 0.72);
            ctx.fillRect(w * 0.57 + rTilt * 0.6, h * 0.10, w * 0.09, h * 0.72);

            ctx.fillStyle = '#09090b';
            ctx.beginPath();
            ctx.roundRect(w * 0.16 + rTilt, h * 0.06, w * 0.68, h * 0.28, [w * 0.07, w * 0.07, 0, 0]);
            ctx.fill();
            drawGlassReflection(w * 0.22 + rTilt, h * 0.09, w * 0.56, h * 0.14);

            // Defensa cromada trasera y doble escape
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.roundRect(w * 0.05 + rTilt * 0.4, h * 0.74, w * 0.90, h * 0.11, Math.max(1, w * 0.03));
            ctx.fill();

            ctx.fillStyle = '#ef4444';
            ctx.fillRect(w * 0.08 + rTilt * 0.5, h * 0.49, w * 0.17, h * 0.13);
            ctx.fillRect(w * 0.75 + rTilt * 0.5, h * 0.49, w * 0.17, h * 0.13);
        } else {
            // Superdeportivo Verde GT
            drawRivalTires(0.58, 0.22, 0.42);

            const gtGrad = ctx.createLinearGradient(0, 0, 0, h);
            gtGrad.addColorStop(0, '#86efac');
            gtGrad.addColorStop(0.35, '#16a34a');
            gtGrad.addColorStop(1, '#052e16');
            ctx.fillStyle = gtGrad;
            ctx.beginPath();
            ctx.roundRect(w * 0.02 + rTilt * 0.5, h * 0.32, w * 0.96, h * 0.54, [w * 0.09, w * 0.09, w * 0.03, w * 0.03]);
            ctx.fill();

            ctx.fillStyle = '#09090b';
            ctx.beginPath();
            ctx.roundRect(w * 0.20 + rTilt, h * 0.08, w * 0.60, h * 0.32, Math.max(2, w * 0.05));
            ctx.fill();
            drawGlassReflection(w * 0.24 + rTilt, h * 0.11, w * 0.52, h * 0.15);

            // Alerón fibra de carbono
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.roundRect(w * 0.06 + rTilt * 0.7, h * 0.28, w * 0.88, h * 0.075, 2);
            ctx.fill();

            // Difusor y barra óptica trasera
            ctx.fillStyle = '#09090b';
            ctx.fillRect(w * 0.22 + rTilt * 0.4, h * 0.75, w * 0.56, h * 0.11);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.roundRect(w * 0.08 + rTilt * 0.5, h * 0.57, w * 0.84, h * 0.09, 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(w * 0.43 + rTilt * 0.5, h * 0.58, w * 0.14, h * 0.07);
        }
    } finally {
        ctx.restore();
    }
}

// Coche del Jugador: 1986 Ferrari Testarossa Spider HD con Suspensión Dinámica, Difusor, Rines Animados y Reflejos
function drawPlayerCar() {
    ctx.save();
    try {
        if (GameState.invulnerableTimer > 0) {
            ctx.globalAlpha = (Math.floor(Date.now() / 90) % 2 === 0) ? 0.78 : 0.42;
        }

        const carW = 86;
        const carH = 47;
        const bounce = GameState.running && GameState.speed > 1500
            ? Math.sin(GameState.playerZ * 0.018) * (GameState.shakeAmount > 0.5 ? 1.4 : 0.6)
            : 0;
        const carX = Math.round(CANVAS_WIDTH / 2 - carW / 2);
        const carY = CANVAS_HEIGHT - carH - 12 + bounce;

        const steer = GameState.input.steer;
        const baseSegmentIndex = Math.floor(GameState.playerZ / SEGMENT_LENGTH);
        const currentSeg = GameState.segments[baseSegmentIndex % GameState.segments.length];
        const curveTilt = currentSeg ? (currentSeg.curve * 0.35) : 0;
        const tilt = Math.max(-8, Math.min(8, Math.round((steer + curveTilt) * 4.2)));
        const isBraking = GameState.input.brake;

        ctx.translate(carX, carY);

        // 1. Sombra suave elíptica + Halo rojo de freno proyectado sobre el asfalto
        const shadowGrad = ctx.createRadialGradient(carW / 2 + tilt, carH - 1, carW * 0.2, carW / 2 + tilt, carH - 1, carW * 0.60);
        shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
        shadowGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.38)');
        shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.ellipse(carW / 2 + tilt, carH - 1, carW * 0.60, 7.5, 0, 0, Math.PI * 2);
        ctx.fill();

        if (isBraking) {
            const brakeFloor = ctx.createRadialGradient(carW / 2 + tilt, carH + 1, 4, carW / 2 + tilt, carH + 1, carW * 0.48);
            brakeFloor.addColorStop(0, 'rgba(255, 20, 60, 0.35)');
            brakeFloor.addColorStop(1, 'rgba(255, 20, 60, 0)');
            ctx.fillStyle = brakeFloor;
            ctx.beginPath();
            ctx.ellipse(carW / 2 + tilt, carH + 1, carW * 0.48, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Neumáticos Anchos Deportivos con Rines de 5 Radios Giratorios y Banda de Rodadura
        const tireW = 16;
        const tireH = 18;
        const wheelSpin = (GameState.playerZ * 0.045) % (Math.PI * 2);

        const drawWheel = (wx, wy) => {
            ctx.fillStyle = '#070709';
            ctx.beginPath();
            ctx.roundRect(wx, wy, tireW, tireH, 4);
            ctx.fill();

            // Banda de rodadura sutil animada
            if (GameState.speed > 500) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                const treadOffset = (Math.floor(GameState.playerZ * 0.12) % 4);
                for (let ty = 2 + treadOffset; ty < tireH - 2; ty += 4) {
                    ctx.fillRect(wx + 2, wy + ty, tireW - 4, 1.2);
                }
            }

            // Rin de aleación metálica
            const rimX = wx + tireW / 2;
            const rimY = wy + tireH / 2;
            ctx.fillStyle = '#4b5563';
            ctx.beginPath();
            ctx.ellipse(rimX, rimY, tireW * 0.36, tireH * 0.38, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#e5e7eb';
            ctx.beginPath();
            ctx.arc(rimX, rimY, 3.8, 0, Math.PI * 2);
            ctx.fill();

            // 5 radios rotatorios
            ctx.strokeStyle = '#9ca3af';
            ctx.lineWidth = 1;
            for (let sp = 0; sp < 5; sp++) {
                const ang = wheelSpin + (sp * Math.PI * 2 / 5);
                ctx.beginPath();
                ctx.moveTo(rimX, rimY);
                ctx.lineTo(rimX + Math.cos(ang) * 4.2, rimY + Math.sin(ang) * 4.5);
                ctx.stroke();
            }

            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(rimX, rimY, 1.4, 0, Math.PI * 2);
            ctx.fill();
        };

        drawWheel(-3 + tilt, carH - tireH);
        drawWheel(carW - 13 + tilt, carH - tireH);

        // 3. Guardabarros Ensanchados y Carrocería Ferrari Rosso Corsa Metálica
        const bodyGrad = ctx.createLinearGradient(0, 9, 0, carH - 4);
        bodyGrad.addColorStop(0, '#ff6b81');
        bodyGrad.addColorStop(0.28, '#ef233c');
        bodyGrad.addColorStop(0.68, '#b91c1c');
        bodyGrad.addColorStop(1, '#6b0f1a');

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.roundRect(2 + tilt, 12, carW - 4, carH - 18, [9, 9, 4, 4]);
        ctx.fill();

        // Hombros laterales ensanchados Testarossa
        ctx.beginPath();
        ctx.ellipse(8 + tilt, carH - 17, 13, 10, -0.15, 0, Math.PI * 2);
        ctx.ellipse(carW - 8 + tilt, carH - 17, 13, 10, 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Brillo especular superior del capó / tapa trasera
        const hoodSpec = ctx.createLinearGradient(8 + tilt, 12, carW - 8 + tilt, 12);
        hoodSpec.addColorStop(0, 'rgba(255,255,255,0.12)');
        hoodSpec.addColorStop(0.5, 'rgba(255,255,255,0.55)');
        hoodSpec.addColorStop(1, 'rgba(255,255,255,0.12)');
        ctx.fillStyle = hoodSpec;
        ctx.beginPath();
        ctx.roundRect(9 + tilt, 13.5, carW - 18, 2.6, 1.3);
        ctx.fill();

        // Insignia metálica cromada superior central
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(carW / 2 + tilt, 16.5, 1.3, 0, Math.PI * 2);
        ctx.fill();

        // 4. Panel Trasero Ahumado con Branquias Aerodinámicas Testarossa
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.roundRect(6 + tilt, 19, carW - 12, 18, 3.5);
        ctx.fill();

        ctx.fillStyle = '#000000';
        for (let sy = 21; sy <= 35; sy += 3.2) {
            ctx.fillRect(7.5 + tilt, sy, carW - 15, 1.3);
        }

        // 5. Difusor Aerodinámico Inferior con Aletas Verticales
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(22 + tilt, carH - 10, carW - 44, 5, 1.5);
        ctx.fill();
        ctx.fillStyle = '#334155';
        for (let fx = 28; fx <= carW - 28; fx += 8) {
            ctx.fillRect(fx + tilt, carH - 10, 1.2, 5);
        }

        // 6. Faros Traseros Cuádruples + Direccionales Ámbar con Óptica Realista
        const tailCol = isBraking ? '#ff003c' : '#dc2626';
        const drawTailLamp = (lx, ly, isInner) => {
            if (isBraking) {
                const glow = ctx.createRadialGradient(lx, ly, 1.5, lx, ly, 15);
                glow.addColorStop(0, 'rgba(255, 10, 55, 0.92)');
                glow.addColorStop(1, 'rgba(255, 0, 50, 0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(lx, ly, 15, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = isInner ? '#f59e0b' : tailCol;
            ctx.beginPath();
            ctx.arc(lx, ly, 5.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = isBraking ? '#ffffff' : (isInner ? '#fef08a' : '#fca5a5');
            ctx.beginPath();
            ctx.arc(lx, ly, 2.0, 0, Math.PI * 2);
            ctx.fill();
        };

        drawTailLamp(14 + tilt, 28, false);
        drawTailLamp(23.5 + tilt, 28, true);
        drawTailLamp(carW - 23.5 + tilt, 28, true);
        drawTailLamp(carW - 14 + tilt, 28, false);

        // 7. Matrícula Vintage Enmarcada OUTRUN
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.roundRect(carW / 2 - 14 + tilt, 24, 28, 8.5, 2);
        ctx.fill();
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = '#1e3a8a';
        ctx.font = '5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('OUTRUN', carW / 2 + tilt, 28.5);

        // 8. Tubos de Escape Dobles Cromados
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.roundRect(10 + tilt, carH - 7.5, 8, 4.5, 2);
        ctx.roundRect(carW - 18 + tilt, carH - 7.5, 8, 4.5, 2);
        ctx.fill();
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.arc(12.2 + tilt, carH - 5.2, 1.7, 0, Math.PI * 2);
        ctx.arc(15.6 + tilt, carH - 5.2, 1.7, 0, Math.PI * 2);
        ctx.arc(carW - 15.6 + tilt, carH - 5.2, 1.7, 0, Math.PI * 2);
        ctx.arc(carW - 12.2 + tilt, carH - 5.2, 1.7, 0, Math.PI * 2);
        ctx.fill();

        // 9. Llamas de Plasma Nitro Turbo
        if (GameState.input.turbo && GameState.speed > 5000) {
            const flameLen = Math.random() * 9 + 10;
            const drawFlame = (fx) => {
                const fGrad = ctx.createLinearGradient(fx, carH - 3, fx, carH - 3 + flameLen);
                fGrad.addColorStop(0, '#ffffff');
                fGrad.addColorStop(0.28, '#00f5d4');
                fGrad.addColorStop(0.68, '#ff007f');
                fGrad.addColorStop(1, 'rgba(255, 0, 127, 0)');
                ctx.fillStyle = fGrad;
                ctx.beginPath();
                ctx.ellipse(fx, carH - 3 + flameLen / 2, 3.4, flameLen / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            };
            drawFlame(13.8 + tilt);
            drawFlame(carW - 13.8 + tilt);
        }

        // 10. Cabina Descapotable, Asientos de Cuero Tan, Retrovisor y Pasajeros
        // Reposacabezas cuero tan
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.roundRect(21 + tilt, 5, 10, 6, 3);
        ctx.roundRect(carW - 32 + tilt, 5, 10, 6, 3);
        ctx.fill();

        // Parabrisas panorámico con marco cromado y reflejo de cielo
        ctx.fillStyle = 'rgba(147, 197, 253, 0.72)';
        ctx.beginPath();
        ctx.roundRect(14 + tilt, 3.5, carW - 28, 9.5, [10, 10, 0, 0]);
        ctx.fill();
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.92)';
        ctx.lineWidth = 1.3;
        ctx.stroke();

        // Retrovisor central cromado
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.roundRect(carW / 2 - 4 + tilt, 4.5, 8, 2.2, 1);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
        ctx.beginPath();
        ctx.ellipse(23 + tilt, 6, 8, 1.8, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Piloto (Camisa azul clásica y gafas Aviator con destello)
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.arc(26.5 + tilt, 2, 5.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.roundRect(24 + tilt, 2, 6, 2.4, 1);
        ctx.fill();
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.roundRect(20.5 + tilt, 7.2, 12, 6.8, 3);
        ctx.fill();

        // Copiloto Rubia (Cabello dorado en dos mechones fluidos al viento)
        const hairSway = Math.sin(Date.now() / 55) * 4.2;
        const hairGrad = ctx.createLinearGradient(carW - 32 + tilt, -2, carW - 14 + tilt + hairSway, 11);
        hairGrad.addColorStop(0, '#fef9c3');
        hairGrad.addColorStop(0.5, '#facc15');
        hairGrad.addColorStop(1, '#ca8a04');

        ctx.fillStyle = hairGrad;
        ctx.beginPath();
        ctx.moveTo(carW - 30 + tilt, 6);
        ctx.quadraticCurveTo(carW - 24 + tilt + hairSway * 0.5, -4, carW - 17 + tilt + hairSway, 4);
        ctx.quadraticCurveTo(carW - 15 + tilt + hairSway * 1.2, 10, carW - 24 + tilt, 12);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(carW - 27 + tilt, 3, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#db2777';
        ctx.beginPath();
        ctx.roundRect(carW - 29 + tilt, 2.5, 5.5, 2.2, 1);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(carW - 32 + tilt, 8, 11, 6, 3);
        ctx.fill();
    } finally {
        ctx.restore();
    }
}

// Actualización del HUD de la Consola
function updateHUD() {
    if (scoreElement) scoreElement.textContent = `SCORE: ${Math.floor(GameState.score).toString().padStart(5, '0')}`;
    if (highScoreElement) highScoreElement.textContent = `HI: ${Math.floor(GameState.highScore).toString().padStart(5, '0')}`;
    if (timeCountElement) {
        timeCountElement.textContent = Math.ceil(GameState.timeLeft).toString().padStart(2, '0');
        if (GameState.timeLeft <= 10) {
            timeContainerElement.classList.add('urgent');
        } else {
            timeContainerElement.classList.remove('urgent');
        }
    }
    if (speedCountElement) {
        const kmh = Math.round((GameState.speed / GameState.maxSpeed) * 240);
        speedCountElement.textContent = kmh.toString().padStart(3, '0');
    }
    if (playerNickElement) {
        const stg = GameState.currentStage ? GameState.currentStage.name : 'COCONUT BEACH';
        const nick = GameState.currentNickname || 'PILOT';
        playerNickElement.textContent = `${nick} • STG ${GameState.currentTier + 1}`;
    }
    const diffBadge = document.getElementById('diff-badge');
    if (diffBadge) {
        const cfg = DIFFICULTY_CONFIG[GameState.difficulty] || DIFFICULTY_CONFIG.normal;
        diffBadge.textContent = cfg.label;
        diffBadge.style.color = cfg.color;
        diffBadge.style.borderColor = cfg.color;
    }
}

// Actualización del Código QR
function updateQrCode() {
    const baseUrl = CONFIG.CONTROL_URL || 'https://controllers.myplayad.com/outrun';
    const controlUrl = baseUrl.includes('://')
        ? `${baseUrl}?room=${GameState.roomId}`
        : `${window.location.protocol}//${baseUrl}?room=${GameState.roomId}`;

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
}

// Gestión de Rankings (Hall of Fame)
function fetchRanking() {
    try {
        const ranking = JSON.parse(localStorage.getItem('outrun-ranking')) || [
            { name: 'SEGA', score: 25000 },
            { name: 'PILOT', score: 18000 },
            { name: 'SPEED', score: 12500 },
            { name: 'RACER', score: 8500 },
            { name: 'TURBO', score: 5000 }
        ];

        const top5 = ranking.slice(0, 5);
        if (top5.length > 0 && GameState.highScore < top5[0].score) {
            GameState.highScore = top5[0].score;
            updateHUD();
        }

        const renderList = (element) => {
            if (!element) return;
            element.innerHTML = '';
            top5.forEach((item, idx) => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="rank">${idx + 1}.</span> <span class="nick">${item.name.toUpperCase().substring(0, 10)}</span> <span class="score">${item.score.toString().padStart(5, '0')}</span>`;
                element.appendChild(li);
            });
        };

        renderList(rankingList);
        renderList(videoRankingList);

        if (window.parent && window.parent !== window) {
            try {
                window.parent.postMessage({
                    type: 'RANKING_UPDATE',
                    slug: 'outrun',
                    ranking: top5
                }, '*');
            } catch (_) {}
        }
    } catch (e) {
        console.warn('Error ranking:', e);
    }
}

function submitScore(nickname, score) {
    if (score <= 0) return;
    try {
        let ranking = JSON.parse(localStorage.getItem('outrun-ranking')) || [];
        ranking = ranking.filter(entry => !(entry.name === nickname && entry.score < score));

        if (!ranking.some(e => e.name === nickname && e.score === score)) {
            ranking.push({ name: nickname, score: score, date: new Date().toLocaleDateString() });
        }

        ranking.sort((a, b) => b.score - a.score);
        ranking = ranking.slice(0, 5);
        localStorage.setItem('outrun-ranking', JSON.stringify(ranking));
        fetchRanking();
    } catch (e) {
        console.warn('Error saving score:', e);
    }
}

// Bucle Principal
function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    if (!GameState.lastTime) GameState.lastTime = timestamp;
    const dt = Math.min((timestamp - GameState.lastTime) / 1000, 0.1);
    GameState.lastTime = timestamp;

    try {
        update(dt);
        draw();
    } catch (err) {
        console.error('Frame loop error:', err);
    }
}

// Auto-Scale Reactivo para Kiosco / TV
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

    // Botones de Selección de Dificultad en Pantalla de Espera
    ['easy', 'normal', 'hard'].forEach(diff => {
        const btn = document.getElementById(`diff-${diff}`);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                setDifficulty(diff);
                audio.playBeep();
            });
        }
    });
    setDifficulty(GameState.difficulty);
});

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
    if (e.data.type === 'GET_RANKING') fetchRanking();
});
[0, 50, 150, 300, 600, 1200].forEach(d => setTimeout(autoScale, d));

const mainScreen = document.getElementById('main-screen');
if (mainScreen) {
    mainScreen.addEventListener('click', () => {
        audio.init();
        if (!GameState.running || GameState.gameOver) {
            playPreGameAdThenStart('DRIVER', () => startGame());
        }
    });
}

// Inicio
requestAdVideo();
buildTrack();
updateHUD();
fetchRanking();
updateQrCode();
autoScale();
setInterval(fetchRanking, 30000);
requestAnimationFrame(gameLoop);
connectSignalingServer();
