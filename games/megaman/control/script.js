// Controlador Móvil WebRTC para Mega Man Arcade
const container = document.getElementById('controls-container');
const status = document.getElementById('status');
const roomInput = document.getElementById('room-input');
const nicknameInput = document.getElementById('nickname-input');
const connectBtn = document.getElementById('connect-btn');
const roomSelection = document.getElementById('room-selection');
const thanksScreen = document.getElementById('thanks-screen');
const thanksMessage = document.getElementById('thanks-message');
const playAgainBtn = document.getElementById('play-again-btn');

const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnJump = document.getElementById('btn-jump');
const btnBuster = document.getElementById('btn-buster');
const btnSlide = document.getElementById('btn-slide');
const chargeGauge = document.getElementById('charge-gauge');

container.style.touchAction = 'none';

let pc;
let dataChannel;
let socket;
let currentRoomId = null;
let nickname = 'MegaMan';
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
                this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
            } catch (e) {}
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
                osc.type = 'square';
                osc.frequency.setValueAtTime(260, t);
                osc.frequency.linearRampToValueAtTime(620, t + 0.1);
                gain.gain.setValueAtTime(0.25, t);
                gain.gain.linearRampToValueAtTime(0.001, t + 0.1);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.1);
            } else if (sound === 'buster') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(700, t);
                osc.frequency.exponentialRampToValueAtTime(240, t + 0.08);
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.linearRampToValueAtTime(0.001, t + 0.08);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.08);
            } else if (sound === 'charged') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(420, t);
                osc.frequency.exponentialRampToValueAtTime(1400, t + 0.18);
                gain.gain.setValueAtTime(0.4, t);
                gain.gain.linearRampToValueAtTime(0.001, t + 0.2);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.2);
            } else if (sound === 'slide') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(180, t);
                osc.frequency.linearRampToValueAtTime(80, t + 0.12);
                gain.gain.setValueAtTime(0.2, t);
                gain.gain.linearRampToValueAtTime(0.001, t + 0.12);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.12);
            } else if (sound === 'hit') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(120, t);
                osc.frequency.linearRampToValueAtTime(60, t + 0.15);
                gain.gain.setValueAtTime(0.35, t);
                gain.gain.linearRampToValueAtTime(0.001, t + 0.15);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.15);
            }
        } catch (e) {}
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

        socket.onclose = () => {
            // Desconexión limpia o cierre
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
                if (data.sound === 'hit') {
                    mobileAudio.play('hit');
                    if (navigator.vibrate) navigator.vibrate(60);
                } else if (data.sound === 'charged') {
                    mobileAudio.play('charged');
                    if (navigator.vibrate) navigator.vibrate([30, 40, 50]);
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
        thanksMessage.innerHTML = `¡Gran combate, <span style="color: var(--primary);">${nickname.toUpperCase()}</span>!<br>PUNTUACIÓN:<br><span style="font-size: 36px; color: var(--accent); font-weight: bold; display: block; margin: 12px 0;">${finalScore.toString().padStart(6, '0')}</span>`;
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
// 🕹️ Captura de D-Pad y Botones de Acción
// ==========================================
function bindDirectionButton(btn, directionName) {
    if (!btn) return;
    
    let isPressed = false;
    const startHandler = (e) => {
        e.preventDefault();
        if (isPressed) return;
        isPressed = true;
        btn.classList.add('pressed');
        sendCommand(directionName, true);
        if (navigator.vibrate) navigator.vibrate(12);
    };

    const endHandler = (e) => {
        e.preventDefault();
        if (!isPressed) return;
        isPressed = false;
        btn.classList.remove('pressed');
        sendCommand(directionName, false);
    };

    btn.addEventListener('pointerdown', startHandler);
    btn.addEventListener('touchstart', startHandler, { passive: false });
    btn.addEventListener('pointerup', endHandler);
    btn.addEventListener('touchend', endHandler, { passive: false });
    btn.addEventListener('pointercancel', endHandler);
    btn.addEventListener('touchcancel', endHandler, { passive: false });
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

bindDirectionButton(btnLeft, 'left');
bindDirectionButton(btnRight, 'right');

// Botón A: Salto
if (btnJump) {
    let isJumpPressed = false;
    const startJump = (e) => {
        e.preventDefault();
        if (isJumpPressed) return;
        isJumpPressed = true;
        btnJump.classList.add('pressed');
        sendCommand('jump', true);
        mobileAudio.play('jump');
        if (navigator.vibrate) navigator.vibrate(18);
    };

    const endJump = (e) => {
        e.preventDefault();
        if (!isJumpPressed) return;
        isJumpPressed = false;
        btnJump.classList.remove('pressed');
        sendCommand('jump', false);
    };

    btnJump.addEventListener('pointerdown', startJump);
    btnJump.addEventListener('touchstart', startJump, { passive: false });
    btnJump.addEventListener('pointerup', endJump);
    btnJump.addEventListener('touchend', endJump, { passive: false });
    btnJump.addEventListener('pointercancel', endJump);
    btnJump.addEventListener('touchcancel', endJump, { passive: false });
}

// Botón B: Mega Buster (Tap = Disparo normal, Hold = Carga de Mega Buster)
let busterChargeTimer = null;
let busterStartTime = 0;
let isFullCharged = false;

if (btnBuster) {
    btnBuster.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btnBuster.classList.add('pressed');
        busterStartTime = Date.now();
        isFullCharged = false;
        
        sendCommand('buster_down', true);
        mobileAudio.play('buster');
        if (navigator.vibrate) navigator.vibrate(12);

        if (chargeGauge) {
            chargeGauge.className = 'charge-gauge charging';
        }

        clearInterval(busterChargeTimer);
        busterChargeTimer = setInterval(() => {
            const elapsed = Date.now() - busterStartTime;
            if (elapsed >= 1000 && !isFullCharged) {
                isFullCharged = true;
                if (chargeGauge) chargeGauge.className = 'charge-gauge charged';
                if (navigator.vibrate) navigator.vibrate([25, 40, 25]);
            }
        }, 100);
    });

    const endBuster = (e) => {
        e.preventDefault();
        btnBuster.classList.remove('pressed');
        clearInterval(busterChargeTimer);

        const elapsed = Date.now() - busterStartTime;
        sendCommand('buster_up', { chargeMs: elapsed, fullCharged: isFullCharged });

        if (chargeGauge) {
            chargeGauge.className = 'charge-gauge';
        }

        if (isFullCharged) {
            mobileAudio.play('charged');
            if (navigator.vibrate) navigator.vibrate(35);
        }
        isFullCharged = false;
    };

    btnBuster.addEventListener('pointerup', endBuster);
    btnBuster.addEventListener('pointercancel', endBuster);
}

// Botón Slide: Deslizamiento
if (btnSlide) {
    btnSlide.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btnSlide.classList.add('pressed');
        sendCommand('slide', true);
        mobileAudio.play('slide');
        if (navigator.vibrate) navigator.vibrate(18);
    });

    const endSlide = (e) => {
        e.preventDefault();
        btnSlide.classList.remove('pressed');
        sendCommand('slide', false);
    };
    btnSlide.addEventListener('pointerup', endSlide);
    btnSlide.addEventListener('pointercancel', endSlide);
}

// ==========================================
// 🚀 Inicialización al Cargar
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
