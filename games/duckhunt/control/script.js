// ==============================================================================
// DUCK HUNT - Mobile Controller Script (NES Zapper WebRTC)
// ==============================================================================

const statusEl = document.getElementById('status');
const roomSelection = document.getElementById('room-selection');
const gameContainer = document.getElementById('game-container');
const thanksScreen = document.getElementById('thanks-screen');
const nicknameInput = document.getElementById('nickname-input');
const connectBtn = document.getElementById('connect-btn');
const hudNick = document.getElementById('hud-nick');
const hudAmmo = document.getElementById('hud-ammo');
const aimPad = document.getElementById('aim-pad');
const reticle = document.getElementById('reticle');
const fireBtn = document.getElementById('fire-btn');
const finalScoreText = document.getElementById('final-score-text');
const audioBtn = document.getElementById('audio-btn');
const hudLevel = document.getElementById('hud-level');
const hudLives = document.getElementById('hud-lives');
const thanksIcon = document.getElementById('thanks-icon');
const thanksTitle = document.getElementById('thanks-title');
const thanksSubtitle = document.getElementById('thanks-subtitle');

// ==============================================================================
// AUDIO SINTETIZADO WEB AUDIO API PARA SMARTPHONE (NES DUCK HUNT)
// ==============================================================================

class MobileDuckHuntAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.enabled = true;
    }

    init() {
        if (!this.enabled) return;
        if (!this.ctx) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                this.ctx = new AudioContext();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);

                // Warm-up dummy buffer para desbloqueo estricto en iOS Safari
                try {
                    const buf = this.ctx.createBuffer(1, 1, 22050);
                    const src = this.ctx.createBufferSource();
                    src.buffer = buf;
                    src.connect(this.ctx.destination);
                    src.start(0);
                } catch (_) {}
            } catch (e) {
                console.warn('Fallo init audio móvil:', e);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => this.updateUI()).catch(() => {});
        } else if (this.ctx && this.ctx.state === 'running') {
            this.updateUI();
        }
    }

    toggleMute() {
        if (!this.ctx) this.init();
        this.enabled = !this.enabled;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.enabled ? 0.7 : 0.0001, this.ctx.currentTime);
        }
        this.updateUI();
    }

    updateUI() {
        if (!audioBtn) return;
        if (this.enabled && this.ctx && this.ctx.state === 'running') {
            audioBtn.textContent = '🔊 ON';
            audioBtn.style.opacity = '1';
        } else if (!this.enabled) {
            audioBtn.textContent = '🔇 OFF';
            audioBtn.style.opacity = '0.6';
        } else {
            audioBtn.textContent = '🔊 ON';
            audioBtn.style.opacity = '0.8';
        }
    }

    play(sound, param) {
        if (!this.enabled) return;
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        switch (sound) {
            case 'gunshot': this.playGunshot(); break;
            case 'quack': this.playQuack(); break;
            case 'bark': this.playBark(); break;
            case 'laugh': this.playDogLaugh(); break;
            case 'caught': this.playCaught(); break;
            case 'round_pass': this.playRoundPass(); break;
            case 'intro': this.playIntro(); break;
            case 'fall': this.playFall(); break;
            case 'thud': this.playThud(); break;
            case 'gameover':
            case 'game_over_tune': this.playGameOver(); break;
        }
    }

    // Disparo Zapper instantáneo
    playGunshot() {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        try {
            const now = Math.max(this.ctx.currentTime, 0.001) + 0.005;

            // 1. Punch de recámara grave
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(190, now);
            osc.frequency.linearRampToValueAtTime(35, now + 0.16);
            oscGain.gain.setValueAtTime(0.65, now);
            oscGain.gain.linearRampToValueAtTime(0.0001, now + 0.16);
            osc.connect(oscGain);
            oscGain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.16);

            // 2. Ruido blanco de detonación
            const bufSize = Math.floor(this.ctx.sampleRate * 0.18);
            const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.28));
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1400, now);
            filter.frequency.linearRampToValueAtTime(260, now + 0.18);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.7, now);
            noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.18);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.masterGain);
            noise.start(now);
        } catch (_) {}
    }

    // Cuac / Graznido de pato impactado
    playQuack() {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        try {
            const now = Math.max(this.ctx.currentTime, 0.001) + 0.01;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(460, now);
            osc.frequency.setValueAtTime(590, now + 0.04);
            osc.frequency.linearRampToValueAtTime(230, now + 0.18);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.linearRampToValueAtTime(0.0001, now + 0.18);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.18);
        } catch (_) {}
    }

    // Ladrido del perro cazador
    playBark() {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        try {
            const now = Math.max(this.ctx.currentTime, 0.001) + 0.01;
            [0, 0.14].forEach(t => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(360, now + t);
                osc.frequency.linearRampToValueAtTime(140, now + t + 0.10);
                gain.gain.setValueAtTime(0.5, now + t);
                gain.gain.linearRampToValueAtTime(0.0001, now + t + 0.10);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + t);
                osc.stop(now + t + 0.10);
            });
        } catch (_) {}
    }

    // Risa burlona del perro
    playDogLaugh() {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        try {
            const now = Math.max(this.ctx.currentTime, 0.001) + 0.02;
            for (let i = 0; i < 7; i++) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                const f = (i % 2 === 0) ? 620 : 780;
                osc.frequency.setValueAtTime(f, now + i * 0.09);
                gain.gain.setValueAtTime(0.4, now + i * 0.09);
                gain.gain.linearRampToValueAtTime(0.0001, now + i * 0.09 + 0.07);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + i * 0.09);
                osc.stop(now + i * 0.09 + 0.07);
            }
        } catch (_) {}
    }

    // Fanfarria de patos capturados
    playCaught() {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        try {
            const now = Math.max(this.ctx.currentTime, 0.001) + 0.02;
            [440, 554.37, 659.25, 880].forEach((f, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, now + idx * 0.08);
                gain.gain.setValueAtTime(0.4, now + idx * 0.08);
                gain.gain.linearRampToValueAtTime(0.0001, now + idx * 0.08 + 0.14);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.14);
            });
        } catch (_) {}
    }

    // Fanfarria de ronda completada
    playRoundPass() {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        try {
            const now = Math.max(this.ctx.currentTime, 0.001) + 0.02;
            [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(f, now + idx * 0.12);
                gain.gain.setValueAtTime(0.4, now + idx * 0.12);
                gain.gain.linearRampToValueAtTime(0.0001, now + idx * 0.12 + 0.22);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + idx * 0.12);
                osc.stop(now + idx * 0.12 + 0.22);
            });
        } catch (_) {}
    }

    // Intro clásica Duck Hunt
    playIntro() {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        try {
            const now = Math.max(this.ctx.currentTime, 0.001) + 0.02;
            const notes = [
                { f: 523.25, d: 0.12 },
                { f: 659.25, d: 0.12 },
                { f: 783.99, d: 0.12 },
                { f: 1046.50, d: 0.20 },
                { f: 783.99, d: 0.12 },
                { f: 1046.50, d: 0.35 }
            ];
            let offset = 0;
            notes.forEach(n => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(n.f, now + offset);
                gain.gain.setValueAtTime(0.4, now + offset);
                gain.gain.linearRampToValueAtTime(0.0001, now + offset + n.d);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + offset);
                osc.stop(now + offset + n.d);
                offset += n.d + 0.025;
            });
        } catch (_) {}
    }

    // Melodía Game Over
    playGameOver() {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        try {
            const now = Math.max(this.ctx.currentTime, 0.001) + 0.02;
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
                gain.gain.setValueAtTime(0.4, now + offset);
                gain.gain.linearRampToValueAtTime(0.0001, now + offset + n.d);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + offset);
                osc.stop(now + offset + n.d);
                offset += n.d + 0.04;
            });
        } catch (_) {}
    }

    playFall() {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        try {
            const now = Math.max(this.ctx.currentTime, 0.001) + 0.01;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.linearRampToValueAtTime(140, now + 0.40);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.linearRampToValueAtTime(0.0001, now + 0.40);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.40);
        } catch (_) {}
    }

    playThud() {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        try {
            const now = Math.max(this.ctx.currentTime, 0.001) + 0.01;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.linearRampToValueAtTime(35, now + 0.12);
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.linearRampToValueAtTime(0.0001, now + 0.12);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.12);
        } catch (_) {}
    }
}

const mobileAudio = new MobileDuckHuntAudio();

// Activación y desbloqueo de audio en cualquier interacción táctil
['touchstart', 'pointerdown', 'click'].forEach(evt => {
    window.addEventListener(evt, () => {
        if (typeof mobileAudio !== 'undefined' && mobileAudio) mobileAudio.init();
    }, { passive: true });
});

if (audioBtn) {
    audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileAudio.toggleMute();
    });
}

let socket = null;
let pc = null;
let dataChannel = null;
let pendingCandidates = [];
let targetRoomId = '';
let playerNickname = '';

// Leer parámetro ?room=XXXX y credenciales TURN
const urlParams = new URLSearchParams(window.location.search);
targetRoomId = (urlParams.get('room') || '').toUpperCase().trim();
const roomInput = document.getElementById('room-input');

if (targetRoomId) {
    if (roomInput) {
        roomInput.value = targetRoomId;
        roomInput.style.display = 'none';
    }
} else {
    if (roomInput) {
        roomInput.style.display = 'block';
        roomInput.placeholder = 'CÓDIGO DE SALA';
    }
}

const turnIp = urlParams.get('turn_ip');
const turnUser = urlParams.get('turn_user');
const turnPass = urlParams.get('turn_pass');
if (turnIp) localStorage.setItem('TURN_PUBLIC_IP', turnIp);
if (turnUser) localStorage.setItem('TURN_USER', turnUser);
if (turnPass) localStorage.setItem('TURN_PASS', turnPass);

function checkValidForm() {
    const nickVal = nicknameInput.value.trim();
    const effectiveRoom = targetRoomId || (roomInput ? roomInput.value.trim() : '');
    connectBtn.disabled = nickVal.length < 2 || !effectiveRoom;
}

// Validación obligatoria de Nickname (mínimo 2 caracteres) y Sala
nicknameInput.addEventListener('input', checkValidForm);
if (roomInput) roomInput.addEventListener('input', checkValidForm);

nicknameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !connectBtn.disabled) {
        connectBtn.click();
    }
});

connectBtn.addEventListener('click', () => {
    mobileAudio.init();
    const val = nicknameInput.value.trim().toUpperCase();
    if (val.length < 2) return;
    if (!targetRoomId && roomInput) {
        targetRoomId = roomInput.value.trim().toUpperCase();
    }
    if (!targetRoomId) {
        alert('Por favor, ingresa o escanea el código de sala.');
        return;
    }
    playerNickname = val.substring(0, 10);
    if (hudNick) hudNick.textContent = playerNickname;

    connectBtn.disabled = true;
    statusEl.textContent = 'CONECTANDO AL SERVIDOR...';
    initSignaling();
});

function initSignaling() {
    const serverUrl = (typeof CONFIG !== 'undefined' && CONFIG.SIGNALING_SERVER_URL) ? CONFIG.SIGNALING_SERVER_URL : 'signaling.myplayad.com';
    const wsUrl = serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://')
        ? serverUrl
        : `wss://${serverUrl}`;

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            statusEl.textContent = 'BUSCANDO SALA...';
            socket.send(JSON.stringify({
                type: 'register',
                role: 'controller',
                roomId: targetRoomId
            }));
        };

        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'host_ready') {
                    statusEl.textContent = 'CONECTANDO CON PANTALLA...';
                    pendingCandidates = [];
                    setupWebRTC();
                } else if (data.type === 'answer') {
                    if (pc) {
                        const sdp = typeof data.sdp === 'string' ? data.sdp : (data.sdp?.sdp || '');
                        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));

                        // Transición inmediata a los controles al recibir answer
                        roomSelection.style.display = 'none';
                        gameContainer.style.display = 'flex';
                        statusEl.textContent = 'ZAPPER CONECTADO';

                        while (pendingCandidates.length > 0) {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(pendingCandidates.shift()));
                            } catch (_) {}
                        }
                    }
                } else if (data.type === 'candidate') {
                    if (pc && data.candidate) {
                        if (pc.remoteDescription) {
                            try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (_) {}
                        } else {
                            pendingCandidates.push(data.candidate);
                        }
                    }
                } else if (data.type === 'error') {
                    statusEl.textContent = data.message || 'ERROR DE CONEXIÓN';
                    connectBtn.disabled = false;
                }
            } catch (err) {
                console.error('Error en socket controller:', err);
            }
        };

        socket.onclose = () => {
            if (gameContainer.style.display !== 'flex') {
                statusEl.textContent = 'CONEXIÓN CERRADA. REINTENTANDO...';
            }
        };
    } catch (e) {
        console.warn('Fallo WebSocket signaling:', e);
        statusEl.textContent = 'ERROR DE RED';
        connectBtn.disabled = false;
    }
}

async function setupWebRTC() {
    const turnPublicIp = localStorage.getItem('TURN_PUBLIC_IP') || '31.97.43.72';
    const turnUser = localStorage.getItem('TURN_USER') || 'game';
    const turnPass = localStorage.getItem('TURN_PASS') || 'changeme';

    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: `turn:${turnPublicIp}:3478?transport=udp`, username: turnUser, credential: turnPass },
            { urls: `turn:${turnPublicIp}:3478?transport=tcp`, username: turnUser, credential: turnPass },
            { urls: `turns:${turnPublicIp}:5349`, username: turnUser, credential: turnPass }
        ]
    };

    pc = new RTCPeerConnection(rtcConfig);

    pc.onicecandidate = (e) => {
        if (e.candidate && socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'candidate',
                candidate: e.candidate,
                roomId: targetRoomId
            }));
        }
    };

    // Crear DataChannel principal (SIN maxRetransmits: 0 para evitar pérdida de join)
    dataChannel = pc.createDataChannel('control', { ordered: false });

    dataChannel.onopen = () => {
        statusEl.textContent = 'ZAPPER LISTO';
        roomSelection.style.display = 'none';
        gameContainer.style.display = 'flex';

        // Enviar identificación del jugador
        dataChannel.send(JSON.stringify({
            type: 'join',
            nickname: playerNickname,
            value: playerNickname
        }));
    };

    dataChannel.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'ammo') {
                updateAmmoHUD(msg.count);
            } else if (msg.type === 'state') {
                if (msg.round) updateLevelHUD(msg.round);
                if (typeof msg.lives !== 'undefined') updateLivesHUD(msg.lives);
            } else if (msg.type === 'sfx') {
                if (msg.sound === 'gunshot') {
                    if (performance.now() - lastLocalFireTime > 200) {
                        mobileAudio.playGunshot();
                    }
                } else {
                    mobileAudio.play(msg.sound, msg.param);
                }
            } else if (msg.type === 'game_over') {
                gameContainer.style.display = 'none';
                thanksScreen.style.display = 'flex';
                statusEl.textContent = 'PARTIDA FINALIZADA';
                if (thanksIcon) thanksIcon.textContent = '🐕';
                if (thanksTitle) thanksTitle.textContent = '¡FIN DEL JUEGO!';
                if (thanksSubtitle) thanksSubtitle.textContent = 'Agotaste tus 3 oportunidades. Escanea de nuevo el código QR en la pantalla arcade para volver a jugar.';
                if (finalScoreText) {
                    finalScoreText.textContent = `PUNTUACIÓN FINAL: ${msg.score || 0}`;
                }
            } else if (msg.type === 'victory') {
                gameContainer.style.display = 'none';
                thanksScreen.style.display = 'flex';
                statusEl.textContent = '¡MISIÓN CUMPLIDA!';
                if (thanksIcon) thanksIcon.textContent = '🏆';
                if (thanksTitle) thanksTitle.textContent = '¡HAS GANADO!';
                if (thanksSubtitle) thanksSubtitle.textContent = '¡Felicitaciones Cazador! Llegaste al Nivel 4 con éxito. Escanea el código QR para jugar otra partida.';
                if (finalScoreText) {
                    finalScoreText.textContent = `¡LLEGASTE AL NIVEL 4! • SCORE: ${msg.score || 0}`;
                }
            }
        } catch (_) {}
    };

    dataChannel.onclose = () => {
        statusEl.textContent = 'DESCONECTADO';
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.send(JSON.stringify({
        type: 'offer',
        sdp: offer.sdp,
        roomId: targetRoomId
    }));
}

function updateAmmoHUD(count) {
    if (!hudAmmo) return;
    let bullets = '';
    for (let i = 0; i < count; i++) {
        bullets += '● ';
    }
    for (let i = count; i < 4; i++) {
        bullets += '○ ';
    }
    hudAmmo.textContent = bullets.trim();
}

function updateLevelHUD(round) {
    if (hudLevel) hudLevel.textContent = `${round}/4`;
}

function updateLivesHUD(count) {
    if (hudLives) {
        let hearts = '';
        for (let i = 0; i < count; i++) hearts += '❤️';
        for (let i = count; i < 3; i++) hearts += '🖤';
        hudLives.textContent = hearts || '---';
    }
}

// ==============================================================================
// GESTIÓN DEL VISOR DE PUNTERÍA (AIM TRACKPAD) Y DISPARO
// ==============================================================================

let lastAimSend = 0;
let currentNormX = 0.5;
let currentNormY = 0.5;

function updateAim(clientX, clientY, shouldSend = true) {
    const rect = aimPad.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

    currentNormX = x / rect.width;
    currentNormY = y / rect.height;

    // Actualizar retícula en pantalla móvil
    reticle.style.left = `${currentNormX * 100}%`;
    reticle.style.top = `${currentNormY * 100}%`;

    // Enviar a la pantalla arcade a 60fps
    const now = performance.now();
    if (shouldSend && dataChannel && dataChannel.readyState === 'open' && (now - lastAimSend > 16)) {
        lastAimSend = now;
        dataChannel.send(JSON.stringify({
            type: 'aim',
            x: currentNormX,
            y: currentNormY
        }));
    }
}

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isDragging = false;

// Touch / Pointer en Aim Pad
aimPad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    aimPad.setPointerCapture(e.pointerId);
    touchStartX = e.clientX;
    touchStartY = e.clientY;
    touchStartTime = performance.now();
    isDragging = false;
    updateAim(e.clientX, e.clientY, true);
});

aimPad.addEventListener('pointermove', (e) => {
    e.preventDefault();
    if (e.buttons > 0 || e.pointerType === 'touch') {
        const dist = Math.hypot(e.clientX - touchStartX, e.clientY - touchStartY);
        if (dist > 8) isDragging = true;
        updateAim(e.clientX, e.clientY, true);
    }
});

aimPad.addEventListener('pointerup', (e) => {
    e.preventDefault();
    try { aimPad.releasePointerCapture(e.pointerId); } catch (_) {}
    const duration = performance.now() - touchStartTime;
    // Si fue un toque rápido sin arrastrar mucho, disparar en la posición tocada
    if (!isDragging && duration < 240) {
        triggerFire();
    }
});

let lastLocalFireTime = 0;

// Botón de Disparo / Gatillo Zapper
function triggerFire() {
    lastLocalFireTime = performance.now();
    mobileAudio.playGunshot();

    if (navigator.vibrate) {
        try { navigator.vibrate(35); } catch (_) {}
    }

    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({
            type: 'fire',
            x: currentNormX,
            y: currentNormY
        }));
    }
}

fireBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    triggerFire();
});

// Inicializar retícula centrada
reticle.style.left = '50%';
reticle.style.top = '50%';

// ==============================================================================
// 🚫 Restricciones Móviles: Prohibir Zoom (Pellizco / Doble Toque) y Selección
// ==============================================================================
(function preventZoomAndSelection() {
    // 1. Prevenir gestos de zoom en iOS Safari (pinch/gesture)
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });

    // 2. Prevenir zoom por pellizco multitáctil en Android y navegadores web
    document.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // 3. Prevenir doble toque para zoom (Double-tap zoom)
    let lastTouchEndTime = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEndTime <= 300) {
            if (!e.target || (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA')) {
                e.preventDefault();
            }
        }
        lastTouchEndTime = now;
    }, { passive: false });

    // 4. Prevenir selección de texto accidental al tocar o arrastrar
    document.addEventListener('selectstart', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
    });

    // 5. Prevenir menú contextual de pulsación larga (Copy / Select All / Callout)
    document.addEventListener('contextmenu', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
    });
})();
