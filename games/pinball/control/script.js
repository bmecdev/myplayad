// Pinball Arcade Mobile Controller - WebRTC P2P DataChannel & Haptics

const container = document.getElementById('controls-container');
const status = document.getElementById('status');
const nicknameInput = document.getElementById('nickname-input');
const connectBtn = document.getElementById('connect-btn');
const roomSelection = document.getElementById('room-selection');
const thanksScreen = document.getElementById('thanks-screen');
const thanksMessage = document.getElementById('thanks-message');

const btnFlipperLeft = document.getElementById('btn-flipper-left');
const btnFlipperRight = document.getElementById('btn-flipper-right');
const btnLaunch = document.getElementById('btn-launch');
const btnNudge = document.getElementById('btn-nudge');

container.style.touchAction = 'none';

let pc;
let dataChannel;
let socket;
let currentRoomId = null;
let nickname = 'Player';

// ==========================================
// 📡 Configuración ICE dinámica con TURN
// ==========================================
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
                `turns:${turnPublicIp}:5349`
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

    playFlipper() {
        this.ensureContext();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, t);
            osc.frequency.exponentialRampToValueAtTime(120, t + 0.05);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.06);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.06);
        } catch (e) {}
    }

    playBumper() {
        this.ensureContext();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(650, t);
            osc.frequency.exponentialRampToValueAtTime(1100, t + 0.09);
            gain.gain.setValueAtTime(0.45, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.1);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.1);
        } catch (e) {}
    }

    playSlingshot() {
        this.ensureContext();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(420, t);
            osc.frequency.exponentialRampToValueAtTime(200, t + 0.06);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.07);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.07);
        } catch (e) {}
    }

    playLaunch() {
        this.ensureContext();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(180, t);
            osc.frequency.exponentialRampToValueAtTime(720, t + 0.22);
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.25);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.25);
        } catch (e) {}
    }

    playDrain() {
        this.ensureContext();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(280, t);
            osc.frequency.exponentialRampToValueAtTime(60, t + 0.4);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.42);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.42);
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
            status.textContent = 'Buscando mesa arcade...';
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
                    status.textContent = 'Mesa encontrada. Enlazando...';
                    setupWebRTC();
                } else if (data.type === 'answer') {
                    if (pc) {
                        await pc.setRemoteDescription(new RTCSessionDescription(data));
                        status.textContent = '⚡ FLIPPERS CONECTADOS';
                    }
                } else if (data.type === 'candidate') {
                    if (pc && data.candidate) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                        } catch (err) {
                            console.warn('Error candidate:', err);
                        }
                    }
                } else if (data.type === 'error') {
                    if (data.message === 'SALA_LLENA' || data.message === 'SALA_OCUPADA') {
                        status.textContent = 'MESA OCUPADA - RECARGA LA PANTALLA';
                        status.style.color = '#ffb703';
                        alert('La mesa de pinball ya tiene un jugador conectado. Recarga la pantalla grande (F5) para generar un nuevo código.');
                    } else {
                        status.textContent = 'Error: ' + data.message;
                        status.style.color = '#ff4d6d';
                    }
                    roomSelection.style.display = 'flex';
                }
            } catch (err) {
                console.error('Error JSON en socket:', err);
            }
        };

        socket.onerror = () => {
            status.textContent = 'Error de conexión';
            status.style.color = '#ff4d6d';
            roomSelection.style.display = 'flex';
        };

        socket.onclose = () => {
            if (thanksScreen.style.display === 'none' || thanksScreen.style.display === '') {
                // Desconexión inesperada
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
                roomSelection.style.display = 'flex';
            }
        }
    };

    dataChannel = pc.createDataChannel('control', { ordered: false });

    dataChannel.onopen = () => {
        status.textContent = '⚡ FLIPPERS ACTIVOS';
        roomSelection.style.display = 'none';
        container.style.display = 'flex';

        // Enviar evento inicial con nickname
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
                if (data.sound === 'bumper') {
                    mobileAudio.playBumper();
                    if (navigator.vibrate) navigator.vibrate(25);
                } else if (data.sound === 'slingshot') {
                    mobileAudio.playSlingshot();
                    if (navigator.vibrate) navigator.vibrate(20);
                } else if (data.sound === 'flipper') {
                    mobileAudio.playFlipper();
                } else if (data.sound === 'launch') {
                    mobileAudio.playLaunch();
                    if (navigator.vibrate) navigator.vibrate(40);
                } else if (data.sound === 'drain') {
                    mobileAudio.playDrain();
                    if (navigator.vibrate) navigator.vibrate(180);
                } else if (data.sound === 'multiball') {
                    mobileAudio.playLaunch();
                    if (navigator.vibrate) navigator.vibrate([50, 60, 50, 60]);
                }
            }
        } catch (e) {}
    };

    dataChannel.onclose = () => {
        status.textContent = 'Desconectado';
        if (thanksScreen.style.display === 'none' || thanksScreen.style.display === '') {
            container.style.display = 'none';
            roomSelection.style.display = 'flex';
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
    thanksScreen.style.display = 'flex';

    if (thanksMessage) {
        thanksMessage.innerHTML = `¡Gran partida, Jugador <span style="color: var(--primary);">${nickname.toUpperCase()}</span>!<br>Puntuación:<br><span style="font-size: 38px; color: var(--amber); font-weight: 900; display: block; margin: 14px 0;">${finalScore.toString().padStart(6, '0')}</span>`;
    }

    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

// Envío de Acciones al Host
function sendAction(actionName) {
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({
            type: 'action',
            action: actionName
        }));
    }
}

// ==========================================
// 🕹️ Captura de Eventos Táctiles (Flippers y Botones)
// ==========================================
function bindButtonAction(btn, downAction, upAction, hapticDuration = 12) {
    if (!btn) return;

    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try {
            if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId);
        } catch (_) {}
        btn.classList.add('active');
        if (navigator.vibrate) navigator.vibrate(hapticDuration);
        sendAction(downAction);
    });

    const release = (e) => {
        btn.classList.remove('active');
        try {
            if (e && btn.hasPointerCapture && btn.hasPointerCapture(e.pointerId)) {
                btn.releasePointerCapture(e.pointerId);
            }
        } catch (_) {}
        if (upAction) sendAction(upAction);
    };

    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
}

// Flippers Izquierdo y Derecho
bindButtonAction(btnFlipperLeft, 'FLIPPER_LEFT_DOWN', 'FLIPPER_LEFT_UP', 15);
bindButtonAction(btnFlipperRight, 'FLIPPER_RIGHT_DOWN', 'FLIPPER_RIGHT_UP', 15);

// Lanzador / Plunger
if (btnLaunch) {
    btnLaunch.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        mobileAudio.playLaunch();
        if (navigator.vibrate) navigator.vibrate(30);
        sendAction('LAUNCH_CHARGE');
    });
    btnLaunch.addEventListener('pointerup', () => sendAction('LAUNCH_RELEASE'));
    btnLaunch.addEventListener('pointercancel', () => sendAction('LAUNCH_RELEASE'));
}

// Empujón de Mesa (Nudge / Tilt)
if (btnNudge) {
    btnNudge.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (navigator.vibrate) navigator.vibrate(35);
        sendAction('NUDGE');
    });
}

// ==========================================
// 🚀 Inicialización y Lectura de Parámetros URL
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
        currentRoomId = roomParam.toUpperCase();
        status.textContent = `Sala: ${currentRoomId} - INGRESA TU NICKNAME`;
    }

    const savedNick = localStorage.getItem('pinball_nickname');
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
                localStorage.setItem('pinball_nickname', nickname);
            }
            if (!currentRoomId) {
                currentRoomId = 'TEST';
            }

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
