// PolarPac Mobile Controller - WebRTC P2P DataChannel & Swipe Gestures

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
let nickname = 'Bear';

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
// 🔊 Audio Móvil Sintetizado
// ==========================================
class MobilePolarPacAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
    }

    init() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            return;
        }
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
        } catch (e) {}
    }

    play(sound) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;
        try {
            if (sound === 'chomp') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, t);
                osc.frequency.exponentialRampToValueAtTime(180, t + 0.05);
                gain.gain.setValueAtTime(0.18, t);
                gain.gain.linearRampToValueAtTime(0.0001, t + 0.05);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.05);
            } else if (sound === 'drinkSoda') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(500, t);
                osc.frequency.linearRampToValueAtTime(1200, t + 0.15);
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.linearRampToValueAtTime(0.0001, t + 0.15);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.15);
            } else if (sound === 'playerDeath') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(550, t);
                osc.frequency.linearRampToValueAtTime(90, t + 0.5);
                gain.gain.setValueAtTime(0.32, t);
                gain.gain.linearRampToValueAtTime(0.0001, t + 0.5);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.5);
            }
        } catch (e) {}
    }
}
const mobileAudio = new MobilePolarPacAudio();
['touchstart', 'pointerdown', 'click'].forEach(evt => {
    window.addEventListener(evt, () => mobileAudio.init(), { passive: true });
});

// ==========================================
// 🔗 Inicialización y Señalización
// ==========================================
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
        roomInput.value = roomFromUrl.toUpperCase();
        nicknameInput.focus();
    }
});

connectBtn.addEventListener('click', () => {
    const roomId = roomInput.value.trim().toUpperCase();
    nickname = nicknameInput.value.trim() || 'Bear';
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

    status.textContent = 'Conectando...';
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
                    if (data.message === 'SALA_OCUPADA') {
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
                    status.textContent = 'CONECTADO AL GLACIAR';
                    status.style.color = '#3dff8a';
                    roomSelection.style.display = 'none';
                    container.style.display = 'flex';
                } else if (data.type === 'candidate') {
                    if (pc) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            } catch (e) {}
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
    } catch (e) {}
}

async function startWebRTC() {
    pc = new RTCPeerConnection(getIceConfig());
    dataChannel = pc.createDataChannel('gameControls', { ordered: false, maxRetransmits: 0 });

    dataChannel.onopen = () => {
        status.textContent = 'OSO POLAR LISTO';
        status.style.color = '#3dff8a';
        roomSelection.style.display = 'none';
        container.style.display = 'flex';
        dataChannel.send(JSON.stringify({ type: 'join', nickname: nickname }));
    };

    dataChannel.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'game_over') {
                if (navigator.vibrate) navigator.vibrate([100, 50, 150]);
                showThanks(data.score || 0);
            } else if (data.type === 'sfx') {
                mobileAudio.play(data.sound);
                if (data.sound === 'drinkSoda' && navigator.vibrate) {
                    navigator.vibrate(30);
                } else if (data.sound === 'playerDeath' && navigator.vibrate) {
                    navigator.vibrate([40, 30, 40]);
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

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.send(JSON.stringify({ ...offer, roomId: currentRoomId }));
}

function showThanks(finalScore) {
    container.style.display = 'none';
    roomSelection.style.display = 'none';
    thanksScreen.style.display = 'block';

    const thanksText = thanksScreen.querySelector('p');
    if (thanksText) {
        thanksText.innerHTML = `¡Bien jugado, Oso <span style="color: var(--primary);">${nickname.toUpperCase()}</span>!<br>Puntuación:<br><span style="font-size: 46px; color: var(--accent); font-weight: 900; display: block; margin: 10px 0;">${finalScore.toString().padStart(3, '0')}</span>`;
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
