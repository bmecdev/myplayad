// ==========================================
// 🎪 Circus Charlie - Controlador Móvil WebRTC
// ==========================================

const container = document.getElementById('controls-container');
const status = document.getElementById('status');
const roomInput = document.getElementById('room-input');
const nicknameInput = document.getElementById('nickname-input');
const connectBtn = document.getElementById('connect-btn');
const roomSelection = document.getElementById('room-selection');
const thanksScreen = document.getElementById('thanks-screen');
const thanksMessage = document.getElementById('thanks-message');
const playAgainBtn = document.getElementById('play-again-btn');

const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnJump = document.getElementById('btn-jump');

container.style.touchAction = 'none';

let pc;
let dataChannel;
let socket;
let currentRoomId = null;
let nickname = 'Charlie';
let pendingCandidates = [];

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
// 🔊 Efectos de Audio Móvil Sintetizado
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
            } catch (_) {}
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    play(sound) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        const t = this.ctx.currentTime;
        try {
            if (sound === 'jump') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, t);
                osc.frequency.linearRampToValueAtTime(750, t + 0.12);
                gain.gain.setValueAtTime(0.25, t);
                gain.gain.linearRampToValueAtTime(0.001, t + 0.12);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.12);
            } else if (sound === 'crash') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, t);
                osc.frequency.linearRampToValueAtTime(60, t + 0.25);
                gain.gain.setValueAtTime(0.35, t);
                gain.gain.linearRampToValueAtTime(0.001, t + 0.25);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.25);
            }
        } catch (_) {}
    }
}

const mobileAudio = new MobileAudio();
['touchstart', 'pointerdown', 'click'].forEach(evt => {
    window.addEventListener(evt, () => mobileAudio.init(), { passive: true });
});

// ==========================================
// 📡 Conexión WebRTC P2P
// ==========================================
async function initConnection() {
    status.textContent = 'CONECTANDO...';

    const serverIp = CONFIG.SIGNALING_SERVER_IP || window.location.hostname;
    const serverPort = CONFIG.SIGNALING_SERVER_PORT || '8080';
    const signalingUrl = CONFIG.SIGNALING_SERVER_URL || `${serverIp}:${serverPort}`;
    const wsUrl = signalingUrl.startsWith('ws://') || signalingUrl.startsWith('wss://')
        ? signalingUrl
        : `wss://${signalingUrl}`;

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            status.textContent = 'BUSCANDO PANTALLA...';
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
                    status.textContent = 'ENLAZANDO...';
                    pendingCandidates = [];
                    setupWebRTC();
                } else if (data.type === 'answer') {
                    if (pc) {
                        const sdp = typeof data.sdp === 'string' ? data.sdp : (data.sdp?.sdp || '');
                        await pc.setRemoteDescription(new RTCSessionDescription({
                            type: 'answer',
                            sdp: sdp
                        }));
                        status.textContent = '⚡ CONECTADO';
                        roomSelection.style.display = 'none';
                        container.style.display = 'flex';

                        while (pendingCandidates.length > 0) {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(pendingCandidates.shift()));
                            } catch (_) {}
                        }
                    }
                } else if (data.type === 'candidate') {
                    if (pc && data.candidate) {
                        if (pc.remoteDescription) {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                            } catch (_) {}
                        } else {
                            pendingCandidates.push(data.candidate);
                        }
                    }
                } else if (data.type === 'error') {
                    status.textContent = 'ERROR: ' + data.message;
                    roomSelection.style.display = 'flex';
                }
            } catch (err) {
                console.error('Error JSON en socket:', err);
            }
        };

        socket.onerror = () => {
            status.textContent = 'ERROR DE CONEXIÓN';
            roomSelection.style.display = 'flex';
        };
    } catch (e) {
        console.error('WS Exception:', e);
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
            status.textContent = 'DESCONECTADO';
            if (thanksScreen.style.display === 'none' || thanksScreen.style.display === '') {
                container.style.display = 'none';
                roomSelection.style.display = 'flex';
            }
        }
    };

    dataChannel = pc.createDataChannel('control', { ordered: false });

    dataChannel.onopen = () => {
        status.textContent = '⚡ EN LÍNEA';
        roomSelection.style.display = 'none';
        container.style.display = 'flex';

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
                    mobileAudio.play('jump');
                    if (navigator.vibrate) navigator.vibrate(25);
                } else if (data.sound === 'crash') {
                    mobileAudio.play('crash');
                    if (navigator.vibrate) navigator.vibrate([60, 50, 60]);
                }
            }
        } catch (_) {}
    };

    dataChannel.onclose = () => {
        status.textContent = 'DESCONECTADO';
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
        thanksMessage.innerHTML = `¡Gran acrobacia, <span style="color: var(--primary);">${nickname.toUpperCase()}</span>!<br>PUNTUACIÓN:<br><span style="font-size: 32px; color: var(--primary); font-weight: bold; display: block; margin: 12px 0;">${finalScore.toString().padStart(6, '0')}</span>`;
    }

    if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
}

function sendCommand(cmd, value = true) {
    if (dataChannel && dataChannel.readyState === 'open') {
        try {
            dataChannel.send(JSON.stringify({
                type: 'control',
                cmd: cmd,
                val: value
            }));
        } catch (_) {}
    }
}

// ==========================================
// 🕹️ Captura de Botones Táctiles
// ==========================================
function bindButton(btn, cmdName) {
    if (!btn) return;

    let isPressed = false;
    const startHandler = (e) => {
        e.preventDefault();
        if (isPressed) return;
        isPressed = true;
        btn.classList.add('pressed');
        sendCommand(cmdName, true);
        if (navigator.vibrate) navigator.vibrate(15);
    };

    const endHandler = (e) => {
        e.preventDefault();
        if (!isPressed) return;
        isPressed = false;
        btn.classList.remove('pressed');
        sendCommand(cmdName, false);
    };

    btn.addEventListener('touchstart', startHandler, { passive: false });
    btn.addEventListener('touchend', endHandler, { passive: false });
    btn.addEventListener('touchcancel', endHandler, { passive: false });
    btn.addEventListener('pointerdown', startHandler, { passive: false });
    btn.addEventListener('pointerup', endHandler, { passive: false });
    btn.addEventListener('pointerleave', endHandler, { passive: false });
}

bindButton(btnUp, 'up');
bindButton(btnDown, 'down');
bindButton(btnLeft, 'left');
bindButton(btnRight, 'right');
bindButton(btnJump, 'jump');

// ==========================================
// 🚀 Inicialización y Carga
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');

    if (roomParam) {
        currentRoomId = roomParam.trim().toUpperCase();
        if (roomInput) roomInput.value = currentRoomId;
    }

    if (nicknameInput) nicknameInput.focus();

    if (connectBtn) {
        connectBtn.addEventListener('click', () => {
            mobileAudio.init();
            const nick = nicknameInput.value.trim();
            if (nick) nickname = nick;

            if (!currentRoomId) {
                currentRoomId = roomInput.value.trim().toUpperCase();
            }

            if (!currentRoomId) {
                alert('Por favor escanea el código QR de la pantalla.');
                return;
            }

            initConnection();
        });
    }

    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            try {
                if (dataChannel) dataChannel.close();
                if (pc) pc.close();
                if (socket) socket.close();
            } catch (_) {}
            window.location.href = window.location.pathname;
        });
    }
});
