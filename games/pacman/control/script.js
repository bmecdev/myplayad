// Pacman Clon Mobile Controller - WebRTC P2P DataChannel & Swipe Gestures

const container = document.getElementById('joystick-container');
const status = document.getElementById('status');
const roomInput = document.getElementById('room-input');
const nicknameInput = document.getElementById('nickname-input');
const connectBtn = document.getElementById('connect-btn');
const roomSelection = document.getElementById('room-selection');
const thanksScreen = document.getElementById('thanks-screen');

container.style.touchAction = 'none';

let pc;
let dataChannel;
let socket;
let currentRoomId = null;
let nickname = 'Pacman';

function getIceConfig() {
    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    const turnPublicIp = localStorage.getItem('TURN_PUBLIC_IP') || '31.97.43.72';
    let turnUser = localStorage.getItem('TURN_USER') || 'game';
    if (turnUser === 'user') turnUser = 'game';
    const turnPass = localStorage.getItem('TURN_PASS') || 'changeme';

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

// ==========================================
// 🔊 Audio Móvil Sintetizado (Web Audio API)
// ==========================================
class MobilePacmanAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.unlocked = false;
        this.enabled = true;
        this.wakaStep = false;
    }

    init() {
        if (!this.enabled) return;
        try {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                this.ctx = new AudioCtx();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            // Unlock audio on iOS / Android with a dummy buffer
            if (this.ctx && !this.unlocked) {
                const buffer = this.ctx.createBuffer(1, 1, 22050);
                const source = this.ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(this.ctx.destination);
                source.start(0);
                this.unlocked = true;
            }
        } catch (e) {
            console.warn('Audio init error:', e);
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        if (this.enabled) {
            this.init();
            this.playTest();
        }
        return this.enabled;
    }

    playTest() {
        if (!this.ctx) this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.exponentialRampToValueAtTime(880, t + 0.1);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.1);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.1);
        } catch (e) {}
    }

    play(sound, param) {
        if (!this.enabled) return;
        if (!this.ctx) this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;
        try {
            if (sound === 'chomp') {
                this.wakaStep = !this.wakaStep;
                const freq = this.wakaStep ? 260 : 360;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.06);
                gain.gain.setValueAtTime(0.35, t);
                gain.gain.linearRampToValueAtTime(0.0001, t + 0.06);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.06);
            } else if (sound === 'powerPellet' || sound === 'drinkSoda') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(380, t);
                osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);
                gain.gain.setValueAtTime(0.4, t);
                gain.gain.linearRampToValueAtTime(0.0001, t + 0.15);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.15);
            } else if (sound === 'catchBear') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(320, t);
                osc.frequency.exponentialRampToValueAtTime(1100, t + 0.18);
                gain.gain.setValueAtTime(0.45, t);
                gain.gain.linearRampToValueAtTime(0.0001, t + 0.18);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.18);
            } else if (sound === 'playerDeath') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(580, t);
                osc.frequency.linearRampToValueAtTime(70, t + 0.55);
                gain.gain.setValueAtTime(0.45, t);
                gain.gain.linearRampToValueAtTime(0.0001, t + 0.55);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.55);
            } else if (sound === 'intro') {
                const notes = [261.63, 523.25, 392, 329.63, 523.25, 392, 329.63];
                notes.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, t + idx * 0.1);
                    gain.gain.setValueAtTime(0.35, t + idx * 0.1);
                    gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.1 + 0.12);
                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start(t + idx * 0.1);
                    osc.stop(t + idx * 0.1 + 0.13);
                });
            } else if (sound === 'levelClear') {
                const notes = [392, 523.25, 659.25, 783.99, 1046.5];
                notes.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(freq, t + idx * 0.08);
                    gain.gain.setValueAtTime(0.35, t + idx * 0.08);
                    gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.08 + 0.12);
                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start(t + idx * 0.08);
                    osc.stop(t + idx * 0.08 + 0.13);
                });
            } else if (sound === 'gameover') {
                const notes = [440, 392, 349.23, 311.13, 261.63];
                notes.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, t + idx * 0.14);
                    gain.gain.setValueAtTime(0.35, t + idx * 0.14);
                    gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.14 + 0.18);
                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start(t + idx * 0.14);
                    osc.stop(t + idx * 0.14 + 0.2);
                });
            }
        } catch (e) {}
    }
}
const mobileAudio = new MobilePacmanAudio();

// Desbloquear audio en cualquier interacción táctil
const unlockAudio = () => {
    mobileAudio.init();
};
['touchstart', 'touchend', 'pointerdown', 'pointerup', 'click'].forEach(evt => {
    window.addEventListener(evt, unlockAudio, { passive: true });
});

// Botón de Toggle Audio
window.addEventListener('DOMContentLoaded', () => {
    const audioBtn = document.getElementById('audio-btn');
    if (audioBtn) {
        audioBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isEnabled = mobileAudio.toggle();
            if (isEnabled) {
                audioBtn.textContent = '🔊';
                audioBtn.classList.remove('muted');
            } else {
                audioBtn.textContent = '🔇';
                audioBtn.classList.add('muted');
            }
        });
    }
});

// ==========================================
// 🔗 Inicialización y Señalización
// ==========================================
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
        roomInput.value = roomFromUrl.toUpperCase();
        status.textContent = 'INGRESA TU NICKNAME';
        status.style.color = '#ffb703';
        nicknameInput.focus();
    }
});

connectBtn.addEventListener('click', () => {
    unlockAudio();
    const roomId = roomInput.value.trim().toUpperCase();
    nickname = nicknameInput.value.trim() || 'PACMAN';
    if (roomId) {
        currentRoomId = roomId;
        connectSignaling(roomId);
    } else {
        alert('Por favor, escanea el código QR de la pantalla.');
    }
});

nicknameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connectBtn.click();
});

function connectSignaling(roomId) {
    const serverIp = CONFIG.SIGNALING_SERVER_IP || window.location.hostname;
    const serverPort = CONFIG.SIGNALING_SERVER_PORT || '8080';
    const signalingUrl = CONFIG.SIGNALING_SERVER_URL || `${serverIp}:${serverPort}`;
    const wsUrl = `wss://${signalingUrl}`;

    status.textContent = 'Conectando a la sala...';
    status.style.color = '#7fae94';

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            socket.send(JSON.stringify({ type: 'register', role: 'controller', roomId: roomId }));
        };

        socket.onmessage = async (message) => {
            try {
                const data = JSON.parse(message.data);
                if (data.type === 'error') {
                    if (data.message === 'SALA_OCUPADA' || data.message === 'SALA_LLENA') {
                        status.textContent = 'SALA OCUPADA - ESPERA UN MOMENTO';
                        status.style.color = '#ffb703';
                        alert('Esta partida ya tiene un jugador conectado.');
                    }
                    return;
                }

                if (data.type === 'host_ready') {
                    startWebRTC();
                } else if (data.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                    status.textContent = 'CONECTADO AL JUEGO';
                    status.style.color = '#3dff8a';
                    roomSelection.style.display = 'none';
                    container.style.display = 'flex';
                } else if (data.type === 'candidate') {
                    if (pc && data.candidate) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            } catch (e) {
                console.error('Error procesando mensaje signaling:', e);
            }
        };

        socket.onerror = () => {
            status.textContent = 'ERROR DE CONEXIÓN';
            status.style.color = '#ff4d6d';
        };

        socket.onclose = () => {
            if (thanksScreen.style.display === 'none') {
                roomSelection.style.display = 'block';
                container.style.display = 'none';
            }
        };
    } catch (e) {
        console.error('Error al conectar WebSocket:', e);
    }
}

async function startWebRTC() {
    pc = new RTCPeerConnection(getIceConfig());
    dataChannel = pc.createDataChannel('control', { ordered: false });

    dataChannel.onopen = () => {
        status.textContent = 'PACMAN LISTO';
        status.style.color = '#3dff8a';
        roomSelection.style.display = 'none';
        container.style.display = 'flex';
        dataChannel.send(JSON.stringify({ type: 'join', nickname: nickname, value: nickname }));
    };

    dataChannel.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'game_over') {
                if (navigator.vibrate) navigator.vibrate([100, 50, 150]);
                mobileAudio.play('gameover');
                showThanks(data.score || 0);
            } else if (data.type === 'sfx') {
                mobileAudio.play(data.sound, data.param);
                if ((data.sound === 'powerPellet' || data.sound === 'drinkSoda') && navigator.vibrate) {
                    navigator.vibrate(40);
                } else if (data.sound === 'catchBear' && navigator.vibrate) {
                    navigator.vibrate([30, 20, 50]);
                } else if (data.sound === 'playerDeath' && navigator.vibrate) {
                    navigator.vibrate([60, 40, 60, 40, 100]);
                } else if (data.sound === 'chomp' && navigator.vibrate) {
                    navigator.vibrate(8);
                }
            }
        } catch (err) {}
    };

    pc.onicecandidate = (event) => {
        if (event.candidate && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'candidate',
                candidate: event.candidate,
                roomId: currentRoomId
            }));
        }
    };

    pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'disconnected' || state === 'failed') {
            status.textContent = 'Desconectado del juego';
            status.style.color = '#ffb703';
            if (thanksScreen.style.display === 'none' || thanksScreen.style.display === '') {
                container.style.display = 'none';
                roomSelection.style.display = 'block';
            }
        }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.send(JSON.stringify({
        type: offer.type,
        sdp: offer.sdp,
        roomId: currentRoomId
    }));
}

function showThanks(finalScore) {
    container.style.display = 'none';
    roomSelection.style.display = 'none';
    thanksScreen.style.display = 'block';

    const thanksText = thanksScreen.querySelector('p');
    if (thanksText) {
        thanksText.innerHTML = `¡Bien jugado, <span style="color: var(--primary);">${nickname.toUpperCase()}</span>!<br>Puntuación:<br><span style="font-size: 46px; color: var(--accent); font-weight: 900; display: block; margin: 10px 0;">${finalScore.toString().padStart(3, '0')}</span>`;
    }

    status.textContent = 'Partida terminada';
    if (dataChannel) dataChannel.close();
    if (pc) pc.close();
    if (socket) socket.close();
}

// ==========================================
// 🕹️ D-Pad Buttons & Swipe Gestures
// ==========================================
function sendDirection(dir) {
    unlockAudio();
    if (navigator.vibrate) navigator.vibrate(10);
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({ dir: dir }));
    }
}

// Directional Buttons
document.querySelectorAll('.dpad-btn').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        unlockAudio();
        const dir = btn.getAttribute('data-dir');
        btn.classList.add('active');
        sendDirection(dir);
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => {
        btn.addEventListener(evt, () => btn.classList.remove('active'));
    });
});

// Fullscreen Swipes
let touchStartX = 0;
let touchStartY = 0;
let lastSwipeTime = 0;

window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 0) return;
    const now = Date.now();
    if (now - lastSwipeTime < 80) return; // throttle

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const dx = touchX - touchStartX;
    const dy = touchY - touchStartY;
    const threshold = 22; // px

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        if (Math.abs(dx) > Math.abs(dy)) {
            sendDirection(dx > 0 ? 'RIGHT' : 'LEFT');
        } else {
            sendDirection(dy > 0 ? 'DOWN' : 'UP');
        }
        touchStartX = touchX;
        touchStartY = touchY;
        lastSwipeTime = now;
    }
}, { passive: true });
