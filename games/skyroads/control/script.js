// Skyroads Mobile Controller - WebRTC P2P DataChannel & Haptics

const container = document.getElementById('joystick-container');
const status = document.getElementById('status');
const nicknameInput = document.getElementById('nickname-input');
const connectBtn = document.getElementById('connect-btn');
const roomSelection = document.getElementById('room-selection');
const thanksScreen = document.getElementById('thanks-screen');
const thanksMessage = document.getElementById('thanks-message');

const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnJump = document.getElementById('btn-jump');
const btnTurbo = document.getElementById('btn-turbo');
const btnBrake = document.getElementById('btn-brake');
const touchTrack = document.getElementById('touch-track');
const touchSlider = document.getElementById('touch-slider');

container.style.touchAction = 'none';

let pc;
let dataChannel;
let socket;
let currentRoomId = null;
let nickname = 'Pilot';

// Configuración ICE dinámica con TURN
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
class MobileAudio {
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
                this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
            } catch (e) {}
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playJump() {
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(260, t);
            osc.frequency.exponentialRampToValueAtTime(700, t + 0.15);
            gain.gain.setValueAtTime(0.28, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.16);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.16);
        } catch (e) {}
    }

    playClick() {
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, t);
            gain.gain.setValueAtTime(0.18, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.05);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.05);
        } catch (e) {}
    }
}
const mobileAudio = new MobileAudio();

// ==========================================
// 📡 Conexión WebRTC P2P
// ==========================================
async function initConnection() {
    status.textContent = 'Conectando al servidor...';

    const wsUrl = `wss://${CONFIG.SIGNALING_SERVER_URL || 'signaling.myplayad.com'}`;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        status.textContent = 'Buscando pantalla...';
        socket.send(JSON.stringify({
            type: 'register',
            role: 'controller',
            roomId: currentRoomId
        }));
    };

    socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'registered') {
            status.textContent = 'Pantalla encontrada. Enlazando...';
            setupWebRTC();
        } else if (data.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
        } else if (data.type === 'candidate') {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else if (data.type === 'error') {
            status.textContent = 'Error: ' + data.message;
            roomSelection.style.display = 'block';
        }
    };

    socket.onerror = () => {
        status.textContent = 'Error de conexión';
        roomSelection.style.display = 'block';
    };
}

async function setupWebRTC() {
    pc = new RTCPeerConnection(getIceConfig());

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({
                type: 'candidate',
                candidate: event.candidate,
                roomId: currentRoomId
            }));
        }
    };

    dataChannel = pc.createDataChannel('controls', { ordered: false, maxRetransmits: 0 });

    dataChannel.onopen = () => {
        status.textContent = '⚡ ENLACE ACTIVO';
        roomSelection.style.display = 'none';
        container.style.display = 'flex';

        // Enviar evento de inicio con nickname
        dataChannel.send(JSON.stringify({
            type: 'join',
            nickname: nickname
        }));

        if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    };

    dataChannel.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'game_over') {
                showThanks(data.score || 0);
            } else if (data.type === 'sfx') {
                if (data.sound === 'jump') mobileAudio.playJump();
                else if (data.sound === 'crash' && navigator.vibrate) navigator.vibrate(200);
                else if (data.sound === 'land' && navigator.vibrate) navigator.vibrate(15);
            }
        } catch (e) {}
    };

    dataChannel.onclose = () => {
        status.textContent = 'Desconectado';
        if (thanksScreen.style.display === 'none') {
            roomSelection.style.display = 'block';
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

    if (thanksMessage) {
        thanksMessage.innerHTML = `¡Buen vuelo, Piloto <span style="color: var(--primary);">${nickname.toUpperCase()}</span>!<br>Puntuación:<br><span style="font-size: 40px; color: var(--accent); font-weight: 900; display: block; margin: 12px 0;">${finalScore.toString().padStart(4, '0')}</span>`;
    }

    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    if (dataChannel) dataChannel.close();
    if (pc) pc.close();
    if (socket) socket.close();
}

function sendAction(action) {
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({ action }));
    }
}

function sendSteer(x) {
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({ type: 'input', x }));
    }
}

// ==========================================
// 🕹️ Controles Táctiles y Gestos
// ==========================================

// 1. Botón SALTO (JUMP)
if (btnJump) {
    btnJump.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        mobileAudio.playJump();
        if (navigator.vibrate) navigator.vibrate(30);
        sendAction('JUMP');
    });
    btnJump.addEventListener('pointerup', (e) => {
        e.preventDefault();
        sendAction('JUMP_RELEASE');
    });
    btnJump.addEventListener('pointercancel', (e) => {
        e.preventDefault();
        sendAction('JUMP_RELEASE');
    });
}

// 2. Botón TURBO (BOOST)
if (btnTurbo) {
    btnTurbo.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        mobileAudio.playClick();
        if (navigator.vibrate) navigator.vibrate(20);
        sendAction('BOOST');
    });
    btnTurbo.addEventListener('pointerup', () => sendAction('NORMAL_SPEED'));
    btnTurbo.addEventListener('pointercancel', () => sendAction('NORMAL_SPEED'));
}

// 3. Botón FRENO (BRAKE)
if (btnBrake) {
    btnBrake.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        mobileAudio.playClick();
        if (navigator.vibrate) navigator.vibrate(15);
        sendAction('BRAKE');
    });
    btnBrake.addEventListener('pointerup', () => sendAction('NORMAL_SPEED'));
    btnBrake.addEventListener('pointercancel', () => sendAction('NORMAL_SPEED'));
}

// 4. Botones de Dirección (IZQ / DER)
if (btnLeft) {
    btnLeft.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        mobileAudio.playClick();
        if (navigator.vibrate) navigator.vibrate(15);
        sendSteer(-1);
    });
    btnLeft.addEventListener('pointerup', () => sendSteer(0));
    btnLeft.addEventListener('pointercancel', () => sendSteer(0));
}

if (btnRight) {
    btnRight.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        mobileAudio.playClick();
        if (navigator.vibrate) navigator.vibrate(15);
        sendSteer(1);
    });
    btnRight.addEventListener('pointerup', () => sendSteer(0));
    btnRight.addEventListener('pointercancel', () => sendSteer(0));
}

// 5. Touch Slider Track (Deslizamiento horizontal suave)
if (touchTrack) {
    let isTracking = false;

    function handleTouchTrack(e) {
        const rect = touchTrack.getBoundingClientRect();
        const touchX = e.clientX - rect.left;
        let pct = Math.max(0, Math.min(1, touchX / rect.width));
        let normX = (pct - 0.5) * 2; // -1 to +1

        if (Math.abs(normX) < 0.1) normX = 0; // Deadzone

        if (touchSlider) {
            touchSlider.style.left = `${pct * 100}%`;
        }

        sendSteer(normX);
    }

    touchTrack.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        isTracking = true;
        handleTouchTrack(e);
    });

    touchTrack.addEventListener('pointermove', (e) => {
        if (!isTracking) return;
        handleTouchTrack(e);
    });

    const resetTrack = () => {
        if (!isTracking) return;
        isTracking = false;
        if (touchSlider) touchSlider.style.left = '50%';
        sendSteer(0);
    };

    touchTrack.addEventListener('pointerup', resetTrack);
    touchTrack.addEventListener('pointercancel', resetTrack);
}

// 6. Gesto de Deslizar hacia Arriba (Swipe Up = Salto)
let touchStartY = null;
let touchStartX = null;

window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
    }
}, { passive: true });

window.addEventListener('touchend', (e) => {
    if (touchStartY === null || touchStartX === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diffY = touchEndY - touchStartY;

    // Si deslizó hacia arriba al menos 35px
    if (diffY < -35) {
        mobileAudio.playJump();
        if (navigator.vibrate) navigator.vibrate(30);
        sendAction('JUMP');
    }

    touchStartY = null;
    touchStartX = null;
}, { passive: true });

// ==========================================
// 🚀 Inicio y Configuración de Sala
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
        currentRoomId = roomParam.toUpperCase();
        status.textContent = `Sala: ${currentRoomId}`;
    }

    const savedNick = localStorage.getItem('skyroads_nickname');
    if (savedNick && nicknameInput) {
        nicknameInput.value = savedNick;
    }

    if (connectBtn) {
        connectBtn.addEventListener('click', () => {
            mobileAudio.init();
            if (nicknameInput && nicknameInput.value.trim()) {
                nickname = nicknameInput.value.trim().substring(0, 10);
                localStorage.setItem('skyroads_nickname', nickname);
            }
            if (!currentRoomId) {
                currentRoomId = 'TEST';
            }
            initConnection();
        });
    }
});
