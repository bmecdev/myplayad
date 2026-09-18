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
const qrCodeImg = document.getElementById('qr-code-img');
const iceRouteElement = document.getElementById('ice-route');
const roomIdElement = document.getElementById('room-id');
const finalScoreText = document.getElementById('final-score-text');
const checkpointsClearedText = document.getElementById('checkpoints-cleared-text');

// Dimensiones fijas para renderizado pixel-art
const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 160;

// Constantes de carretera y perspectiva pseudo-3D
const ROAD_WIDTH = 1800;
const SEGMENT_LENGTH = 200;
const CAMERA_HEIGHT = 850;
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

// Estructura Piramidal de Rutas de OutRun (1986): 5 Etapas y 5 Metas (A, B, C, D, E)
const STAGE_SEGMENTS = 400;

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
            curves: (s) => (s > 40 && s < 140 ? 3.0 : (s > 190 && s < 290 ? -3.4 : 0)),
            hills: (s) => Math.sin(s / 28) * 550
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
            curves: (s) => (s > 40 && s < 150 ? -3.8 : (s > 200 && s < 310 ? 3.6 : 0)),
            hills: (s) => Math.sin(s / 20) * 850 + Math.cos(s / 38) * 350
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
            curves: (s) => (s > 50 && s < 150 ? 3.5 : (s > 210 && s < 320 ? -3.6 : 0)),
            hills: (s) => Math.sin(s / 22) * 950 + Math.cos(s / 40) * 400
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
            curves: (s) => (s > 40 && s < 140 ? -4.0 : (s > 200 && s < 310 ? 3.8 : 0)),
            hills: (s) => Math.sin(s / 26) * 650
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
            curves: (s) => (s > 40 && s < 140 ? 4.2 : (s > 200 && s < 310 ? -4.0 : 0)),
            hills: (s) => Math.sin(s / 18) * 1100
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
            curves: (s) => (s > 50 && s < 150 ? -3.5 : (s > 210 && s < 320 ? 3.7 : 0)),
            hills: (s) => Math.sin(s / 30) * 750
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
            curves: (s) => (s > 50 && s < 150 ? 3.4 : (s > 220 && s < 320 ? -3.2 : 0)),
            hills: (s) => Math.sin(s / 35) * 550
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
            curves: (s) => (s > 40 && s < 140 ? -4.2 : (s > 200 && s < 310 ? 4.0 : 0)),
            hills: (s) => Math.sin(s / 25) * 750
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
            curves: (s) => (s > 50 && s < 150 ? 3.8 : (s > 220 && s < 330 ? -3.9 : 0)),
            hills: (s) => Math.sin(s / 28) * 850
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
            curves: (s) => (s > 40 && s < 150 ? -4.6 : (s > 200 && s < 320 ? 4.5 : 0)),
            hills: (s) => Math.sin(s / 22) * 900
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
            curves: (s) => (s > 40 && s < 150 ? 3.2 : 0),
            hills: (s) => Math.sin(s / 32) * 500
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
            curves: (s) => (s > 40 && s < 150 ? -3.6 : 0),
            hills: (s) => Math.sin(s / 28) * 650
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
            curves: (s) => (s > 50 && s < 160 ? 3.8 : -3.5),
            hills: (s) => Math.sin(s / 24) * 800
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
            roadDark: '#1e272e',
            spriteTheme: 'city',
            curves: (s) => (s > 40 && s < 140 ? -4.4 : 4.2),
            hills: (s) => Math.sin(s / 20) * 950
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
            curves: (s) => (s > 40 && s < 150 ? 4.8 : -4.6),
            hills: (s) => Math.sin(s / 22) * 900
        }
    ]
];

// Estado General del Juego
const GameState = {
    score: 0,
    highScore: 0,
    timeLeft: 60,
    checkpointsCleared: 0,
    currentTier: 0,            // 0 = Coconut Beach, 1 = Tier 2, ..., 4 = Tier 5 (Goals A-E)
    currentRouteIndex: 0,       // Índice en el tier actual
    routePath: [{ tier: 0, index: 0 }],
    currentStage: null,
    gameWon: false,
    stageCleared: false,
    running: false,
    gameOver: false,
    paused: false,
    lastTime: 0,
    lastWarningSecond: -1,
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

    // Pista y Tráfico
    segments: [],
    trackLength: 0,
    cars: []
};

// Construcción de la Pista de la Etapa Seleccionada
function buildStageTrack(tier = 0, routeIndex = 0) {
    const stage = ROUTE_TREE[tier][routeIndex];
    GameState.currentStage = stage;
    GameState.currentTier = tier;
    GameState.currentRouteIndex = routeIndex;
    GameState.segments = [];
    GameState.stageCleared = false;

    const leftNext = (tier < 4) ? ROUTE_TREE[tier + 1][routeIndex] : null;
    const rightNext = (tier < 4) ? ROUTE_TREE[tier + 1][routeIndex + 1] : null;

    for (let i = 0; i < STAGE_SEGMENTS; i++) {
        const isCheckpoint = (i === STAGE_SEGMENTS - 10);
        const alt = Math.floor(i / 3) % 2 === 0;

        const curve = stage.curves(i);
        const hill = stage.hills(i);
        const nextHill = stage.hills(i + 1);

        let sprite = null;
        if (isCheckpoint) {
            if (tier === 4) {
                sprite = { type: 'finish_arch', offset: 0, goalLetter: stage.goalLetter };
            } else {
                sprite = { type: 'checkpoint_arch', offset: 0 };
            }
        } else if (tier < 4 && i >= 315 && i < 385) {
            if (i === 325 || i === 345 || i === 365) {
                sprite = { type: 'fork_sign_left', offset: -1.7, label: `◄ ${leftNext.name}` };
            } else if (i === 326 || i === 346 || i === 366) {
                sprite = { type: 'fork_sign_right', offset: 1.7, label: `${rightNext.name} ►` };
            } else if (i === 335 || i === 355) {
                sprite = { type: 'median_sign', offset: 0 };
            }
        } else if (i % 6 === 0 && i < 310) {
            const side = (Math.floor(i / 6) % 2 === 0) ? -1.7 : 1.7;
            sprite = {
                type: stage.spriteTheme,
                offset: side + (Math.random() * 0.3 - 0.15)
            };
        }

        GameState.segments.push({
            index: i,
            stage: stage,
            tier: tier,
            routeIndex: routeIndex,
            isCheckpoint: isCheckpoint,
            p1: { world: { x: 0, y: hill, z: i * SEGMENT_LENGTH }, camera: {}, screen: {} },
            p2: { world: { x: 0, y: nextHill, z: (i + 1) * SEGMENT_LENGTH }, camera: {}, screen: {} },
            curve: curve,
            color: {
                grass: alt ? stage.grassLight : stage.grassDark,
                curb: alt ? stage.curbLight : stage.curbDark,
                road: alt ? stage.roadLight : stage.roadDark,
                lane: (i >= 320 && i <= 385 && tier < 4) ? '#ffeaa7' : (alt ? '#ffffff' : 'transparent')
            },
            sprite: sprite
        });
    }

    GameState.trackLength = GameState.segments.length * SEGMENT_LENGTH;
    spawnTraffic();
}

function buildTrack() {
    buildStageTrack(GameState.currentTier || 0, GameState.currentRouteIndex || 0);
}

// Generación de Tráfico Rival (50 coches competidores activos)
function spawnTraffic() {
    GameState.cars = [];
    const carTypes = ['blue_coupe', 'yellow_cab', 'white_truck', 'green_gt', 'purple_muscle'];
    const count = 50;

    for (let i = 0; i < count; i++) {
        // Distribuir a lo largo de toda la pista
        const zPos = 1500 + (i * (GameState.trackLength / count)) + (Math.random() * 800);
        const laneOffset = [-0.6, 0, 0.6][i % 3];
        const type = carTypes[i % carTypes.length];
        
        let baseSpeed = 6500;
        if (type === 'white_truck') baseSpeed = 4800;
        else if (type === 'yellow_cab') baseSpeed = 6200;
        else if (type === 'blue_coupe') baseSpeed = 7400;
        else if (type === 'green_gt') baseSpeed = 8500;
        else if (type === 'purple_muscle') baseSpeed = 8000;

        GameState.cars.push({
            type: type,
            z: zPos % GameState.trackLength,
            offset: laneOffset,
            targetOffset: laneOffset,
            laneChangeTimer: 2 + Math.random() * 4,
            speed: baseSpeed + (Math.random() * 600 - 300),
            passed: false
        });
    }
}

// Proyección de Coordenadas 3D de Mundo a Pantalla 2D
function project3D(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
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
    if (e.code === 'ArrowUp' || e.code === 'KeyW') GameState.input.gas = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') GameState.input.brake = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') GameState.input.steer = -1.0;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') GameState.input.steer = 1.0;
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') GameState.input.turbo = true;
    
    // Auto-iniciar juego al presionar tecla si está esperando
    if (!GameState.running && !GameState.gameOver) {
        startGame();
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
                if (input.type === 'nickname') {
                    GameState.currentNickname = (input.value || 'DRIVER').toUpperCase().substring(0, 10);
                    if (playerNickElement) playerNickElement.textContent = `DRIVER: ${GameState.currentNickname}`;
                    startGame();
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
    GameState.score = 0;
    GameState.timeLeft = 60;
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

    // Aceleración y Frenado
    const topSpeed = GameState.input.turbo ? GameState.turboSpeed : GameState.maxSpeed;
    const isOffRoad = Math.abs(GameState.playerX) > 1.05;

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

    // Movimiento Z
    if (GameState.gameWon) {
        GameState.speed = Math.max(1200, GameState.speed - 3200 * dt);
    }
    GameState.playerZ += GameState.speed * dt;
    if (GameState.playerZ >= GameState.trackLength) {
        GameState.playerZ -= GameState.trackLength;
    }

    // Posición del segmento actual
    const currentSegmentIndex = Math.floor(GameState.playerZ / SEGMENT_LENGTH) % GameState.segments.length;
    const currentSegment = GameState.segments[currentSegmentIndex];
    if (!currentSegment) return;
    GameState.currentStage = currentSegment.stage || GameState.currentStage;

    // Checkpoint Crossing & Bifurcación en 5 Metas
    if (currentSegment.isCheckpoint && !currentSegment.cleared && !GameState.stageCleared) {
        currentSegment.cleared = true;
        GameState.stageCleared = true;
        GameState.checkpointsCleared++;

        if (GameState.currentTier < 4) {
            // Bifurcación: Izquierda (playerX < 0) o Derecha (playerX >= 0)
            const choice = (GameState.playerX < 0) ? 0 : 1;
            const nextRouteIndex = GameState.currentRouteIndex + choice;
            const nextTier = GameState.currentTier + 1;

            GameState.currentTier = nextTier;
            GameState.currentRouteIndex = nextRouteIndex;
            GameState.routePath.push({ tier: nextTier, index: nextRouteIndex });

            GameState.timeLeft += 30; // +30 segundos
            GameState.score += 5000;
            audio.playCheckpoint();

            const nextStage = ROUTE_TREE[nextTier][nextRouteIndex];
            const sideText = (choice === 0) ? '◄ LEFT FORK' : 'RIGHT FORK ►';
            showBanner(`STAGE ${nextTier + 1}: ${nextStage.name}`, `${sideText} • +30s EXTENDED!`, '#3dff8a', 3.0);

            // Reconstruir pista de la nueva etapa seleccionada y reiniciar posición Z
            buildStageTrack(nextTier, nextRouteIndex);
            GameState.playerZ = 0;
        } else {
            // TIER 4: ¡META ALCANZADA! (GOALS A, B, C, D, E)
            GameState.gameWon = true;
            const goalLetter = GameState.currentStage?.goalLetter || ['A', 'B', 'C', 'D', 'E'][GameState.currentRouteIndex] || 'A';
            
            // Bonificación por tiempo y meta alcanzada
            const timeBonus = Math.floor(GameState.timeLeft) * 1000;
            const goalBonus = 25000;
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

    // Puntuación continua basada en velocidad
    GameState.score += (GameState.speed / 1000) * dt * 25;
    if (GameState.score > GameState.highScore) {
        GameState.highScore = GameState.score;
    }

    // Actualización de Tráfico Rival y Competidores
    GameState.cars.forEach(car => {
        car.z += car.speed * dt;
        if (car.z >= GameState.trackLength) car.z -= GameState.trackLength;

        // IA: cambio de carril ocasional
        car.laneChangeTimer -= dt;
        if (car.laneChangeTimer <= 0) {
            car.laneChangeTimer = 3 + Math.random() * 5;
            if (Math.random() < 0.35) {
                const lanes = [-0.6, 0, 0.6];
                car.targetOffset = lanes[Math.floor(Math.random() * lanes.length)];
            }
        }
        if (car.targetOffset !== undefined) {
            car.offset += (car.targetOffset - car.offset) * 1.6 * dt;
        }

        // Distancia relativa con respecto al jugador
        let relZ = car.z - GameState.playerZ;
        if (relZ < -GameState.trackLength / 2) relZ += GameState.trackLength;
        if (relZ > GameState.trackLength / 2) relZ -= GameState.trackLength;

        // Detección de rebase (Pass bonus de +500 PTS)
        if (relZ < -30 && relZ > -300 && !car.passed) {
            car.passed = true;
            GameState.score += 500;
            audio.playPassBonus();
            showBanner('OVERTAKE!', '+500 PTS', '#ffb703', 1.0);
        } else if (relZ > 200 || relZ < -450) {
            car.passed = false;
        }

        // Colisión frontal/lateral: SOLO si está en el MISMO carril (distX < 0.32)
        if (Math.abs(relZ) < 65) {
            const distX = Math.abs(car.offset - GameState.playerX);
            if (distX < 0.32) {
                // Choque real
                GameState.speed = Math.min(GameState.speed, 2500); // 50 KM/H
                GameState.shakeAmount = 6;
                audio.playCrash();
                showBanner('CRASH!', 'WATCH OUT!', '#ff4d6d', 1.4);
                
                // Efecto de empuje mutuo
                car.speed = Math.max(2000, car.speed - 1500);
                if (GameState.playerX > car.offset) {
                    GameState.playerX += 0.15;
                    car.offset -= 0.15;
                } else {
                    GameState.playerX -= 0.15;
                    car.offset += 0.15;
                }
            }
        }
    });

    updateHUD();
}

// Renderizado Gráfico en Canvas 200x160
function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const stage = GameState.currentStage || ROUTE_TREE[0][0];

    // 1. Cielo Gradiente y Horizonte Parallax
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT / 2);
    skyGrad.addColorStop(0, stage.skyTop);
    skyGrad.addColorStop(1, stage.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT / 2);

    // Sol / Luna retro
    ctx.fillStyle = stage.sunColor;
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH * 0.72, 28, 16, 0, Math.PI * 2);
    ctx.fill();

    // Montañas lejanas en silueta
    ctx.fillStyle = stage.mountains;
    ctx.beginPath();
    const mountainBaseY = CANVAS_HEIGHT / 2;
    ctx.moveTo(0, mountainBaseY);
    for (let x = 0; x <= CANVAS_WIDTH; x += 20) {
        const offset = (x + GameState.skyOffset * 100) % CANVAS_WIDTH;
        const h = Math.sin(offset * 0.08) * 12 + Math.cos(offset * 0.04) * 8;
        ctx.lineTo(x, mountainBaseY - 14 - h);
    }
    ctx.lineTo(CANVAS_WIDTH, mountainBaseY);
    ctx.closePath();
    ctx.fill();

    // Efecto temblor de pantalla (Camera shake)
    ctx.save();
    if (GameState.running && GameState.shakeAmount > 0) {
        const shakeX = (Math.random() - 0.5) * GameState.shakeAmount;
        const shakeY = (Math.random() - 0.5) * GameState.shakeAmount;
        ctx.translate(shakeX, shakeY);
    }

    // 2. Renderizado de Carretera Pseudo-3D
    const baseSegmentIndex = Math.floor(GameState.playerZ / SEGMENT_LENGTH);
    const baseSegment = GameState.segments[baseSegmentIndex % GameState.segments.length];
    const basePercent = (GameState.playerZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;
    const cameraX = GameState.playerX * ROAD_WIDTH;
    const cameraZ = GameState.playerZ;
    let cameraY = CAMERA_HEIGHT;

    if (baseSegment) cameraY += baseSegment.p1.world.y;

    let maxY = CANVAS_HEIGHT;
    let dx = -(baseSegment ? (baseSegment.curve * basePercent) : 0);
    let x = 0;

    for (let n = 0; n < DRAW_DISTANCE; n++) {
        const seg = GameState.segments[(baseSegmentIndex + n) % GameState.segments.length];
        const loopWrap = ((baseSegmentIndex + n) >= GameState.segments.length) ? GameState.trackLength : 0;

        project3D(seg.p1, cameraX - x, cameraY, cameraZ - loopWrap, CAMERA_DEPTH, CANVAS_WIDTH, CANVAS_HEIGHT, ROAD_WIDTH);
        project3D(seg.p2, cameraX - x - dx, cameraY, cameraZ - loopWrap, CAMERA_DEPTH, CANVAS_WIDTH, CANVAS_HEIGHT, ROAD_WIDTH);

        x = x + dx;
        dx = dx + (seg.curve || 0);

        seg.clip = maxY;

        if (seg.p1.camera.z <= CAMERA_DEPTH || seg.p2.screen.y >= maxY) continue;

        // Pasto lateral
        ctx.fillStyle = seg.color.grass;
        ctx.fillRect(0, seg.p2.screen.y, CANVAS_WIDTH, seg.p1.screen.y - seg.p2.screen.y);

        // Bermas / Bordillos (Curb)
        const curbW1 = seg.p1.screen.w * 0.16;
        const curbW2 = seg.p2.screen.w * 0.16;
        drawTrapezoid(
            seg.p1.screen.x - seg.p1.screen.w - curbW1, seg.p1.screen.y,
            seg.p1.screen.x - seg.p1.screen.w, seg.p1.screen.y,
            seg.p2.screen.x - seg.p2.screen.w, seg.p2.screen.y,
            seg.p2.screen.x - seg.p2.screen.w - curbW2, seg.p2.screen.y,
            seg.color.curb
        );
        drawTrapezoid(
            seg.p1.screen.x + seg.p1.screen.w, seg.p1.screen.y,
            seg.p1.screen.x + seg.p1.screen.w + curbW1, seg.p1.screen.y,
            seg.p2.screen.x + seg.p2.screen.w + curbW2, seg.p2.screen.y,
            seg.p2.screen.x + seg.p2.screen.w, seg.p2.screen.y,
            seg.color.curb
        );

        // Asfalto
        drawTrapezoid(
            seg.p1.screen.x - seg.p1.screen.w, seg.p1.screen.y,
            seg.p1.screen.x + seg.p1.screen.w, seg.p1.screen.y,
            seg.p2.screen.x + seg.p2.screen.w, seg.p2.screen.y,
            seg.p2.screen.x - seg.p2.screen.w, seg.p2.screen.y,
            seg.color.road
        );

        // Líneas divisoras
        if (seg.color.lane !== 'transparent') {
            const laneW1 = seg.p1.screen.w * 0.03;
            const laneW2 = seg.p2.screen.w * 0.03;
            for (let l = 1; l < LANES; l++) {
                const laneX1 = seg.p1.screen.x - seg.p1.screen.w + (seg.p1.screen.w * 2 / LANES) * l;
                const laneX2 = seg.p2.screen.x - seg.p2.screen.w + (seg.p2.screen.w * 2 / LANES) * l;
                drawTrapezoid(
                    laneX1 - laneW1, seg.p1.screen.y,
                    laneX1 + laneW1, seg.p1.screen.y,
                    laneX2 + laneW2, seg.p2.screen.y,
                    laneX2 - laneW2, seg.p2.screen.y,
                    seg.color.lane
                );
            }
        }

        maxY = seg.p2.screen.y;
    }

    // 3. Renderizado de Objetos (Árboles y Tráfico Rival) ordenados por profundidad Z
    const drawables = [];

    // Agregar sprites de carretera
    for (let n = 0; n < DRAW_DISTANCE; n++) {
        const seg = GameState.segments[(baseSegmentIndex + n) % GameState.segments.length];
        if (seg.sprite && seg.p1.screen.scale > 0 && seg.p1.camera.z > CAMERA_DEPTH) {
            drawables.push({
                kind: 'sprite',
                relZ: (n + 1) * SEGMENT_LENGTH,
                sprite: seg.sprite,
                screenX: Math.round(seg.p1.screen.x + (seg.sprite.offset * seg.p1.screen.w)),
                screenY: seg.p1.screen.y,
                scale: seg.p1.screen.scale
            });
        }
    }

    // Agregar coches competidores en el rango visible delante del jugador
    GameState.cars.forEach(car => {
        let relZ = car.z - GameState.playerZ;
        if (relZ < -GameState.trackLength / 2) relZ += GameState.trackLength;
        if (relZ > GameState.trackLength / 2) relZ -= GameState.trackLength;

        if (relZ > 20 && relZ < (DRAW_DISTANCE - 2) * SEGMENT_LENGTH) {
            const carSegIndex = Math.floor(car.z / SEGMENT_LENGTH) % GameState.segments.length;
            const carSeg = GameState.segments[carSegIndex];
            if (!carSeg || !carSeg.p1.screen || !carSeg.p2.screen || !carSeg.p1.screen.scale) return;

            const carPercent = (car.z % SEGMENT_LENGTH) / SEGMENT_LENGTH;
            const carScale = carSeg.p1.screen.scale + (carSeg.p2.screen.scale - carSeg.p1.screen.scale) * carPercent;
            if (carScale <= 0) return;

            const roadCenterX = carSeg.p1.screen.x + (carSeg.p2.screen.x - carSeg.p1.screen.x) * carPercent;
            const roadW = carSeg.p1.screen.w + (carSeg.p2.screen.w - carSeg.p1.screen.w) * carPercent;
            const screenX = Math.round(roadCenterX + (car.offset * roadW));
            const screenY = Math.round(carSeg.p1.screen.y + (carSeg.p2.screen.y - carSeg.p1.screen.y) * carPercent);

            const carW = Math.max(4, Math.round(carScale * 75000));
            const carH = Math.round(carW * 0.55);

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
            drawWorldSprite(item.sprite, item.screenX, item.screenY, item.scale);
        } else if (item.kind === 'car') {
            drawRivalCar(item.car.type, item.screenX, item.screenY, item.w, item.h);
        }
    });

    // 4. Coche del Jugador (Iconic Red Convertible en primer plano)
    drawPlayerCar();

    // 5. Minimapa de Rutas (Bifurcación en 5 Metas de OutRun)
    drawCourseMap();

    // 6. Banner de Checkpoint / Alertas en Pantalla
    if (GameState.banner.timer > 0) {
        ctx.textAlign = 'center';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = GameState.banner.color;
        ctx.fillText(GameState.banner.text, CANVAS_WIDTH / 2, 45);
        if (GameState.banner.subtext) {
            ctx.font = '6px "Press Start 2P", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(GameState.banner.subtext, CANVAS_WIDTH / 2, 57);
        }
    }

    ctx.restore();
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
    const mapW = 66;
    const mapH = 34;
    const mapX = 4;
    const mapY = 4;

    ctx.save();
    // Marco retro translúcido
    ctx.fillStyle = 'rgba(10, 15, 13, 0.78)';
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.strokeStyle = 'rgba(61, 255, 138, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX, mapY, mapW, mapH);

    // Título
    ctx.fillStyle = '#3dff8a';
    ctx.font = '4px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('COURSE', mapX + 3, mapY + 6);

    const centerX = mapX + (mapW / 2);
    const startY = mapY + 11;
    const tierStepY = 5.2;
    const nodeSpacingX = 9.5;

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
            ctx.strokeStyle = isTakenLeft ? '#ffb703' : 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = isTakenLeft ? 1.5 : 0.8;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(toRight.x, toRight.y);
            ctx.strokeStyle = isTakenRight ? '#ffb703' : 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = isTakenRight ? 1.5 : 0.8;
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
                ctx.font = '4px "Press Start 2P", monospace';
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
                    ctx.arc(pos.x, pos.y, 2.2 + pulse * 0.8, 0, Math.PI * 2);
                    ctx.fillStyle = '#3dff8a';
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                } else if (isVisited) {
                    ctx.arc(pos.x, pos.y, 1.8, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffb703';
                    ctx.fill();
                } else {
                    ctx.arc(pos.x, pos.y, 1.3, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                    ctx.fill();
                }
            }
        }
    }

    ctx.restore();
}

// Sprites de Escenarios, Palmeras, Cactus, Rocas, Columnas, Molinos, Carteles de Ruta y Arcos
function drawWorldSprite(spriteObj, x, y, scale) {
    const type = (typeof spriteObj === 'string') ? spriteObj : spriteObj.type;
    const size = Math.round(scale * 95000);
    if (size < 2) return;

    ctx.save();
    ctx.translate(x, y);

    if (type === 'palm') {
        // Tronco con textura
        ctx.fillStyle = '#8e5b32';
        ctx.fillRect(-size * 0.05, -size, size * 0.1, size);
        // Corona de palmera
        ctx.fillStyle = '#10ac84';
        ctx.beginPath();
        ctx.arc(0, -size, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1dd1a1';
        ctx.beginPath();
        ctx.arc(0, -size * 1.05, size * 0.22, 0, Math.PI * 2);
        ctx.fill();
    } else if (type === 'cactus') {
        ctx.fillStyle = '#218c74';
        ctx.fillRect(-size * 0.06, -size * 0.7, size * 0.12, size * 0.7);
        ctx.fillRect(-size * 0.22, -size * 0.5, size * 0.44, size * 0.1);
        ctx.fillRect(-size * 0.22, -size * 0.65, size * 0.08, size * 0.18);
        ctx.fillRect(size * 0.14, -size * 0.65, size * 0.08, size * 0.18);
    } else if (type === 'pine') {
        // Tronco
        ctx.fillStyle = '#5c3d2e';
        ctx.fillRect(-size * 0.04, -size * 0.2, size * 0.08, size * 0.2);
        // Capas de pino
        const drawPineTier = (tierY, w, h, col) => {
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(-w / 2, tierY);
            ctx.lineTo(0, tierY - h);
            ctx.lineTo(w / 2, tierY);
            ctx.closePath();
            ctx.fill();
        };
        drawPineTier(-size * 0.15, size * 0.45, size * 0.35, '#1b4332');
        drawPineTier(-size * 0.38, size * 0.35, size * 0.32, '#2d6a4f');
        drawPineTier(-size * 0.60, size * 0.25, size * 0.30, '#40916c');
        // Nieve en la punta
        ctx.fillStyle = '#f8f9fa';
        ctx.beginPath();
        ctx.moveTo(-size * 0.08, -size * 0.78);
        ctx.lineTo(0, -size * 0.90);
        ctx.lineTo(size * 0.08, -size * 0.78);
        ctx.closePath();
        ctx.fill();
    } else if (type === 'rock') {
        ctx.fillStyle = '#8d4925';
        ctx.beginPath();
        ctx.moveTo(-size * 0.3, 0);
        ctx.lineTo(-size * 0.25, -size * 0.4);
        ctx.lineTo(-size * 0.05, -size * 0.6);
        ctx.lineTo(size * 0.2, -size * 0.55);
        ctx.lineTo(size * 0.35, -size * 0.25);
        ctx.lineTo(size * 0.3, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#5a2d16';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(size * 0.2, -size * 0.55);
        ctx.lineTo(size * 0.35, -size * 0.25);
        ctx.lineTo(size * 0.3, 0);
        ctx.closePath();
        ctx.fill();
    } else if (type === 'column') {
        const colW = size * 0.18;
        const colH = size * 0.85;
        ctx.fillStyle = '#dcdde1';
        ctx.fillRect(-colW * 0.75, -size * 0.1, colW * 1.5, size * 0.1);
        ctx.fillStyle = '#f5f6fa';
        ctx.fillRect(-colW / 2, -colH, colW, colH - size * 0.1);
        ctx.fillStyle = '#ced6e0';
        ctx.fillRect(-colW * 0.15, -colH, colW * 0.3, colH - size * 0.1);
        ctx.fillStyle = '#f5f6fa';
        ctx.fillRect(-colW * 0.8, -colH - size * 0.08, colW * 1.6, size * 0.08);
    } else if (type === 'windmill') {
        const baseW = size * 0.28;
        const bodyH = size * 0.75;
        ctx.fillStyle = '#f5f6fa';
        ctx.beginPath();
        ctx.moveTo(-baseW / 2, 0);
        ctx.lineTo(-baseW * 0.35, -bodyH);
        ctx.lineTo(baseW * 0.35, -bodyH);
        ctx.lineTo(baseW / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e17055';
        ctx.beginPath();
        ctx.moveTo(-baseW * 0.4, -bodyH);
        ctx.lineTo(0, -bodyH - size * 0.18);
        ctx.lineTo(baseW * 0.4, -bodyH);
        ctx.closePath();
        ctx.fill();
        const angle = (Date.now() / 300) % (Math.PI * 2);
        ctx.save();
        ctx.translate(0, -bodyH + size * 0.05);
        ctx.rotate(angle);
        ctx.fillStyle = '#dfe6e9';
        for (let b = 0; b < 4; b++) {
            ctx.rotate(Math.PI / 2);
            ctx.fillRect(-size * 0.03, 0, size * 0.06, size * 0.45);
        }
        ctx.restore();
    } else if (type === 'city') {
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(-size * 0.03, -size * 0.9, size * 0.06, size * 0.9);
        ctx.fillStyle = '#ff00ea';
        ctx.fillRect(-size * 0.15, -size * 0.9, size * 0.3, size * 0.1);
    } else if (type === 'fork_sign_left') {
        const signW = Math.max(30, size * 1.1);
        const signH = Math.max(14, size * 0.45);
        ctx.fillStyle = '#718093';
        ctx.fillRect(-3, -signH, 6, signH);
        ctx.fillStyle = '#10ac84';
        ctx.fillRect(-signW / 2, -signH - signH * 0.85, signW, signH * 0.85);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-signW / 2, -signH - signH * 0.85, signW, signH * 0.85);
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(4, Math.floor(size * 0.08))}px "Press Start 2P"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = (spriteObj.label || '◄ ROUTE').substring(0, 15);
        ctx.fillText(label, 0, -signH - signH * 0.42);
    } else if (type === 'fork_sign_right') {
        const signW = Math.max(30, size * 1.1);
        const signH = Math.max(14, size * 0.45);
        ctx.fillStyle = '#718093';
        ctx.fillRect(-3, -signH, 6, signH);
        ctx.fillStyle = '#10ac84';
        ctx.fillRect(-signW / 2, -signH - signH * 0.85, signW, signH * 0.85);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-signW / 2, -signH - signH * 0.85, signW, signH * 0.85);
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(4, Math.floor(size * 0.08))}px "Press Start 2P"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = (spriteObj.label || 'ROUTE ►').substring(0, 15);
        ctx.fillText(label, 0, -signH - signH * 0.42);
    } else if (type === 'median_sign') {
        const signS = Math.max(12, size * 0.35);
        ctx.fillStyle = '#2f3640';
        ctx.fillRect(-2, -signS * 1.6, 4, signS * 1.6);
        ctx.save();
        ctx.translate(0, -signS * 1.6);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(-signS / 2, -signS / 2, signS, signS);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-signS / 2, -signS / 2, signS, signS);
        ctx.restore();
        ctx.fillStyle = '#000000';
        ctx.font = `${Math.max(4, Math.floor(size * 0.09))}px "Press Start 2P"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('◄►', 0, -signS * 1.6);
    } else if (type === 'checkpoint_arch') {
        const archW = Math.max(26, size * 1.7);
        const archH = Math.max(18, size * 1.15);
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(-archW / 2, -archH, 4, archH);
        ctx.fillRect(archW / 2 - 4, -archH, 4, archH);
        ctx.fillRect(-archW / 2, -archH, archW, 9);
        ctx.fillStyle = '#ff4d6d';
        ctx.font = `${Math.max(4, Math.floor(size * 0.12))}px "Press Start 2P"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CHECKPOINT', 0, -archH + 5);
    } else if (type === 'finish_arch') {
        const archW = Math.max(34, size * 2.0);
        const archH = Math.max(22, size * 1.3);
        const colW = 5;
        for (let yPos = 0; yPos < archH; yPos += 5) {
            const isWhite = (Math.floor(yPos / 5) % 2 === 0);
            ctx.fillStyle = isWhite ? '#ffffff' : '#111111';
            ctx.fillRect(-archW / 2, -archH + yPos, colW, 5);
            ctx.fillRect(archW / 2 - colW, -archH + yPos, colW, 5);
        }
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(-archW / 2, -archH, archW, 11);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-archW / 2, -archH, archW, 11);
        const letter = spriteObj.goalLetter || 'GOAL';
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(4, Math.floor(size * 0.11))}px "Press Start 2P"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`★ GOAL ${letter} ★`, 0, -archH + 6);
    }

    ctx.restore();
}

// Coche Rival Renderizado Pixel-Art con Sombras y Detalles Claros
function drawRivalCar(type, x, y, w, h) {
    if (w < 3) return;

    ctx.save();
    ctx.translate(x - w / 2, y - h);

    // Sombra del coche en el asfalto
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(-w * 0.05, h * 0.85, w * 1.1, h * 0.2);

    let bodyColor = '#0984e3'; // blue coupe
    if (type === 'yellow_cab') bodyColor = '#f1c40f';
    else if (type === 'white_truck') bodyColor = '#f5f6fa';
    else if (type === 'green_gt') bodyColor = '#2ecc71';
    else if (type === 'purple_muscle') bodyColor = '#9b59b6';

    // Neumáticos
    ctx.fillStyle = '#111';
    ctx.fillRect(0, h * 0.6, w * 0.2, h * 0.4);
    ctx.fillRect(w * 0.8, h * 0.6, w * 0.2, h * 0.4);

    // Carrocería principal
    ctx.fillStyle = bodyColor;
    ctx.fillRect(w * 0.06, h * 0.24, w * 0.88, h * 0.56);

    // Cabina / Ventanas
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(w * 0.18, 0, w * 0.64, h * 0.35);

    // Brillo en el parabrisas
    ctx.fillStyle = '#74b9ff';
    ctx.fillRect(w * 0.22, h * 0.06, w * 0.56, h * 0.14);

    // Luces traseras rojas
    ctx.fillStyle = '#ff3838';
    ctx.fillRect(w * 0.1, h * 0.44, w * 0.18, h * 0.2);
    ctx.fillRect(w * 0.72, h * 0.44, w * 0.18, h * 0.2);

    // Parachoques / Matrícula
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(w * 0.35, h * 0.55, w * 0.3, h * 0.15);

    ctx.restore();
}

// Coche del Jugador (Iconic Red Convertible)
function drawPlayerCar() {
    const carW = 42;
    const carH = 22;
    const carX = Math.round(CANVAS_WIDTH / 2 - carW / 2);
    const carY = CANVAS_HEIGHT - carH - 6;

    const steer = GameState.input.steer;
    const baseSegmentIndex = Math.floor(GameState.playerZ / SEGMENT_LENGTH);
    const currentSeg = GameState.segments[baseSegmentIndex % GameState.segments.length];
    const curveTilt = currentSeg ? (currentSeg.curve * 0.35) : 0;
    const tilt = Math.max(-4, Math.min(4, Math.round((steer + curveTilt) * 2.5))); // Inclinación de carrocería en curvas

    ctx.save();
    ctx.translate(carX, carY);

    // Sombra del coche del jugador
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(-2 + tilt, carH - 3, carW + 4, 5);

    // Neumáticos anchos
    ctx.fillStyle = '#111';
    ctx.fillRect(-2 + tilt, carH - 8, 8, 8);
    ctx.fillRect(carW - 6 + tilt, carH - 8, 8, 8);

    // Carrocería principal (Rojo Ferrari OutRun)
    ctx.fillStyle = '#d63031';
    ctx.beginPath();
    ctx.roundRect(0 + tilt, 6, carW, carH - 8, 3);
    ctx.fill();

    // Alerón trasero y detalles
    ctx.fillStyle = '#b71540';
    ctx.fillRect(2 + tilt, 4, carW - 4, 3);

    // Parabrisas
    ctx.fillStyle = '#74b9ff';
    ctx.fillRect(6 + tilt, 1, carW - 12, 5);

    // Piloto (gorra azul)
    ctx.fillStyle = '#0984e3';
    ctx.fillRect(11 + tilt, 0, 5, 4);
    // Copiloto rubia (pelo amarillo ondeando)
    ctx.fillStyle = '#ffeaa7';
    ctx.fillRect(25 + tilt + (Math.sin(Date.now() / 60) * 1.5), -1, 7, 5);

    // Luces traseras (brillan intensamente al frenar)
    const isBraking = GameState.input.brake;
    ctx.fillStyle = isBraking ? '#ff3838' : '#e17055';
    ctx.fillRect(3 + tilt, 9, 7, 4);
    ctx.fillRect(carW - 10 + tilt, 9, 7, 4);

    // Matrícula
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(carW / 2 - 7 + tilt, 11, 14, 4);
    ctx.fillStyle = '#000000';
    ctx.font = '3px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('OUTRUN', carW / 2 + tilt, 14);

    ctx.restore();
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
}

// Actualización del Código QR
function updateQrCode() {
    const baseUrl = CONFIG.CONTROL_URL || 'https://controllers.myplayad.com/outrun';
    const controlUrl = baseUrl.includes('://')
        ? `${baseUrl}?room=${GameState.roomId}`
        : `${window.location.protocol}//${baseUrl}?room=${GameState.roomId}`;

    if (qrCodeImg) {
        qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(controlUrl)}&margin=10`;
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
    if (!GameState.lastTime) GameState.lastTime = timestamp;
    const dt = Math.min((timestamp - GameState.lastTime) / 1000, 0.1);
    GameState.lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

// Auto-Scale Reactivo para Kiosco / TV
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

// Inicio
buildTrack();
updateHUD();
fetchRanking();
setInterval(fetchRanking, 30000);
requestAnimationFrame(gameLoop);
connectSignalingServer();
