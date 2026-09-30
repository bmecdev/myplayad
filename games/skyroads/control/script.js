// Skyroads Mobile Controller - WebRTC P2P DataChannel & Haptics

const container = document.getElementById('joystick-container');
const status = document.getElementById('status');
const nicknameInput = document.getElementById('nickname-input');
const connectBtn = document.getElementById('connect-btn');
const roomSelection = document.getElementById('room-selection');
const thanksScreen = document.getElementById('thanks-screen');
const thanksMessage = document.getElementById('thanks-message');

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
let pendingCandidates = [];

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
                this.masterGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
            } catch (e) {}
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    ensureContext() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    playJump() {
        this.ensureContext();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(260, t);
            osc.frequency.exponentialRampToValueAtTime(750, t + 0.16);
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.18);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.18);
        } catch (e) {}
    }

    playLand() {
        this.ensureContext();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(140, t);
            osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.09);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.09);
        } catch (e) {}
    }

    playBoost() {
        this.ensureContext();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, t);
            osc.frequency.exponentialRampToValueAtTime(900, t + 0.22);
            gain.gain.setValueAtTime(0.30, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.24);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.24);
        } catch (e) {}
    }

    playCrash() {
        this.ensureContext();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, t);
            osc.frequency.linearRampToValueAtTime(35, t + 0.35);
            gain.gain.setValueAtTime(0.40, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.35);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.35);
        } catch (e) {}
    }

    playRing() {
        this.ensureContext();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, t);
            osc1.frequency.setValueAtTime(1320, t + 0.07);

            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(1760, t);
            osc2.frequency.setValueAtTime(2640, t + 0.07);

            gain.gain.setValueAtTime(0.35, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.masterGain);

            osc1.start(t);
            osc2.start(t);
            osc1.stop(t + 0.32);
            osc2.stop(t + 0.32);
        } catch (e) {}
    }

    playClear() {
        this.ensureContext();
        if (!this.ctx) return;
        try {
            const notes = [330, 392, 523, 659];
            const t = this.ctx.currentTime;
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t + idx * 0.12);
                gain.gain.setValueAtTime(0.28, t + idx * 0.12);
                gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.12 + 0.18);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t + idx * 0.12);
                osc.stop(t + idx * 0.12 + 0.2);
            });
        } catch (e) {}
    }

    playClick() {
        this.ensureContext();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, t);
            gain.gain.setValueAtTime(0.22, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.05);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.05);
        } catch (e) {}
    }
}
const mobileAudio = new MobileAudio();

// Desbloquear audio en el primer toque del usuario
['touchstart', 'touchend', 'pointerdown', 'click'].forEach(evt => {
    window.addEventListener(evt, () => mobileAudio.init(), { passive: true });
});

// ==========================================
// 📡 Conexión WebRTC P2P
// ==========================================
async function initConnection() {
    status.textContent = 'Conectando al servidor...';
    status.style.color = '#7fae94';

    const serverIp = CONFIG.SIGNALING_SERVER_IP || window.location.hostname;
    const serverPort = CONFIG.SIGNALING_SERVER_PORT || '8080';
    const signalingUrl = CONFIG.SIGNALING_SERVER_URL || `${serverIp}:${serverPort}`;
    const wsUrl = signalingUrl.startsWith('ws://') || signalingUrl.startsWith('wss://')
        ? signalingUrl
        : `wss://${signalingUrl}`;

    try {
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
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'host_ready') {
                    status.textContent = 'Pantalla encontrada. Enlazando...';
                    pendingCandidates = [];
                    setupWebRTC();
                } else if (data.type === 'answer') {
                    if (pc) {
                        const sdp = typeof data.sdp === 'string' ? data.sdp : (data.sdp?.sdp || '');
                        await pc.setRemoteDescription(new RTCSessionDescription({
                            type: 'answer',
                            sdp: sdp
                        }));
                        status.textContent = '⚡ ENLACE ACTIVO';
                        roomSelection.style.display = 'none';
                        container.style.display = 'flex';

                        while (pendingCandidates.length > 0) {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(pendingCandidates.shift()));
                            } catch (err) {
                                console.warn('Error procesando candidate pendiente:', err);
                            }
                        }
                    }
                } else if (data.type === 'candidate') {
                    if (pc && data.candidate) {
                        if (pc.remoteDescription) {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                            } catch (err) {
                                console.warn('Error candidate:', err);
                            }
                        } else {
                            pendingCandidates.push(data.candidate);
                        }
                    }
                } else if (data.type === 'error') {
                    if (data.message === 'SALA_LLENA' || data.message === 'SALA_OCUPADA') {
                        status.textContent = 'SALA OCUPADA - RECARGA LA PANTALLA';
                        status.style.color = '#ffb703';
                        alert('La sala actual ya tiene un jugador conectado o la sesión anterior sigue cerrándose. Por favor recarga la pantalla grande (F5) para generar un nuevo código QR limpio.');
                    } else {
                        status.textContent = 'Error: ' + data.message;
                        status.style.color = '#ff4d6d';
                    }
                    roomSelection.style.display = 'block';
                }
            } catch (err) {
                console.error('Error JSON en socket:', err);
            }
        };

        socket.onerror = () => {
            status.textContent = 'Error de conexión';
            status.style.color = '#ff4d6d';
            roomSelection.style.display = 'block';
        };

        socket.onclose = () => {
            if (thanksScreen.style.display === 'none' || thanksScreen.style.display === '') {
                // Si la partida no terminó normalmente
            }
        };
    } catch (e) {
        console.error('Excep WS:', e);
    }
}

async function setupWebRTC() {
    pc = new RTCPeerConnection(getIceConfig());

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
            status.textContent = 'Desconectado';
            if (thanksScreen.style.display === 'none' || thanksScreen.style.display === '') {
                container.style.display = 'none';
                roomSelection.style.display = 'block';
            }
        }
    };

    dataChannel = pc.createDataChannel('control', { ordered: false });

    dataChannel.onopen = () => {
        status.textContent = '⚡ ENLACE ACTIVO';
        roomSelection.style.display = 'none';
        container.style.display = 'flex';

        // Enviar evento de inicio con nickname
        dataChannel.send(JSON.stringify({
            type: 'join',
            nickname: nickname,
            value: nickname
        }));

        if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    };

    dataChannel.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'game_over') {
                showThanks(data.score || 0);
            } else if (data.type === 'sfx') {
                if (data.sound === 'jump') {
                    mobileAudio.playJump();
                    if (navigator.vibrate) navigator.vibrate(30);
                } else if (data.sound === 'ring') {
                    mobileAudio.playRing();
                    if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
                } else if (data.sound === 'land') {
                    mobileAudio.playLand();
                    if (navigator.vibrate) navigator.vibrate(15);
                } else if (data.sound === 'boost') {
                    mobileAudio.playBoost();
                    if (navigator.vibrate) navigator.vibrate(25);
                } else if (data.sound === 'crash') {
                    mobileAudio.playCrash();
                    if (navigator.vibrate) navigator.vibrate(200);
                } else if (data.sound === 'clear') {
                    mobileAudio.playClear();
                    if (navigator.vibrate) navigator.vibrate([50, 100, 50, 100]);
                }
            }
        } catch (e) {}
    };

    dataChannel.onclose = () => {
        status.textContent = 'Desconectado';
        if (thanksScreen.style.display === 'none' || thanksScreen.style.display === '') {
            container.style.display = 'none';
            roomSelection.style.display = 'block';
        }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'offer',
            sdp: offer.sdp,
            roomId: currentRoomId
        }));
    }
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

// 4. Touch Slider Track (Deslizamiento horizontal centrado y suave)
if (touchTrack) {
    let isTracking = false;

    function handleTouchTrack(e) {
        const rect = touchTrack.getBoundingClientRect();
        const touchX = e.clientX - rect.left;
        let pct = Math.max(0, Math.min(1, touchX / rect.width));
        let normX = (pct - 0.5) * 2; // -1 to +1

        if (Math.abs(normX) < 0.08) normX = 0; // Deadzone suave en el centro

        if (touchSlider) {
            touchSlider.style.left = `${pct * 100}%`;
        }

        sendSteer(normX);
    }

    touchTrack.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try {
            if (touchTrack.setPointerCapture) {
                touchTrack.setPointerCapture(e.pointerId);
            }
        } catch (_) {}
        isTracking = true;
        if (navigator.vibrate) navigator.vibrate(10);
        handleTouchTrack(e);
    });

    touchTrack.addEventListener('pointermove', (e) => {
        if (!isTracking) return;
        handleTouchTrack(e);
    });

    const resetTrack = (e) => {
        if (!isTracking) return;
        isTracking = false;
        try {
            if (e && touchTrack.hasPointerCapture && touchTrack.hasPointerCapture(e.pointerId)) {
                touchTrack.releasePointerCapture(e.pointerId);
            }
        } catch (_) {}
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
        status.textContent = `Sala: ${currentRoomId} - INGRESA TU NICKNAME`;
    }

    const savedNick = localStorage.getItem('skyroads_nickname');
    if (savedNick && nicknameInput) {
        nicknameInput.value = savedNick;
    }

    if (nicknameInput) {
        nicknameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && connectBtn) connectBtn.click();
        });
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

            // Cerrar conexiones previas antes de crear una nueva
            if (dataChannel) {
                try { dataChannel.close(); } catch (e) {}
                dataChannel = null;
            }
            if (pc) {
                try { pc.close(); } catch (e) {}
                pc = null;
            }
            if (socket) {
                try { socket.close(); } catch (e) {}
                socket = null;
            }

            initConnection();
        });
    }
});
