// ==========================================
// 🎪 Circus Charlie - Controlador Móvil WebRTC
// ==========================================

const container = document.getElementById('controls-container');
const status = document.getElementById('status');
const roomInput = document.getElementById('room-input');
const nicknameInput = document.getElementById('nickname-input');
const connectBtn = document.getElementById('connect-btn');
const roomSelection = document.getElementById('room-selection');
const rotateScreen = document.getElementById('rotate-screen');
const thanksScreen = document.getElementById('thanks-screen');
const thanksMessage = document.getElementById('thanks-message');
const playAgainBtn = document.getElementById('play-again-btn');

const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const btnJump = document.getElementById('btn-jump');

container.style.touchAction = 'none';

let pc;
let dataChannel;
let socket;
let currentRoomId = null;
let nickname = 'Charlie';
let pendingCandidates = [];
let hasStarted = false;

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
                        updateOrientationView();

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
                    if (rotateScreen) rotateScreen.style.display = 'none';
                    if (container) container.style.display = 'none';
                    roomSelection.style.display = 'flex';
                }
            } catch (err) {
                console.error('Error JSON en socket:', err);
            }
        };

        socket.onerror = () => {
            status.textContent = 'ERROR DE CONEXIÓN';
            if (rotateScreen) rotateScreen.style.display = 'none';
            if (container) container.style.display = 'none';
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
                if (rotateScreen) rotateScreen.style.display = 'none';
                if (container) container.style.display = 'none';
                roomSelection.style.display = 'flex';
            }
        }
    };

    dataChannel = pc.createDataChannel('control', { ordered: false });

    dataChannel.onopen = () => {
        status.textContent = '⚡ EN LÍNEA';
        updateOrientationView();

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
    if (rotateScreen) rotateScreen.style.display = 'none';
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
// 🕹️ Joystick Virtual Analógico y Controles
// ==========================================
let currentDir = { left: false, right: false, up: false, down: false };

function updateJoystickState(left, right, up, down) {
    if (left !== currentDir.left) {
        currentDir.left = left;
        sendCommand('left', left);
    }
    if (right !== currentDir.right) {
        currentDir.right = right;
        sendCommand('right', right);
    }
    if (up !== currentDir.up) {
        currentDir.up = up;
        sendCommand('up', up);
    }
    if (down !== currentDir.down) {
        currentDir.down = down;
        sendCommand('down', down);
    }
}

if (joystickBase && joystickKnob) {
    const MAX_RADIUS = 50; // Límite de desplazamiento del pomo en px
    let activePointerId = null;

    function handleJoystickMove(clientX, clientY) {
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const distance = Math.hypot(dx, dy);

        let knobX = 0;
        let knobY = 0;

        if (distance > 0) {
            const clampedDist = Math.min(distance, MAX_RADIUS);
            const angle = Math.atan2(dy, dx);
            knobX = Math.cos(angle) * clampedDist;
            knobY = Math.sin(angle) * clampedDist;
        }

        joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

        // Normalizar valores entre -1.0 y +1.0
        const normX = knobX / MAX_RADIUS;
        const normY = knobY / MAX_RADIUS;

        // Umbrales para activar movimientos
        const DEADZONE = 0.22;
        const isLeft = normX < -DEADZONE;
        const isRight = normX > DEADZONE;
        const isUp = normY < -DEADZONE;
        const isDown = normY > DEADZONE;

        updateJoystickState(isLeft, isRight, isUp, isDown);

        // Envío continuo para el motor de host
        if (dataChannel && dataChannel.readyState === 'open') {
            try {
                dataChannel.send(JSON.stringify({
                    type: 'joystick',
                    x: normX,
                    y: normY
                }));
            } catch (_) {}
        }
    }

    function resetJoystick() {
        activePointerId = null;
        joystickBase.classList.remove('active');
        joystickKnob.style.transform = 'translate(0px, 0px)';
        updateJoystickState(false, false, false, false);
        if (dataChannel && dataChannel.readyState === 'open') {
            try {
                dataChannel.send(JSON.stringify({
                    type: 'joystick',
                    x: 0,
                    y: 0
                }));
            } catch (_) {}
        }
    }

    joystickBase.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        activePointerId = e.pointerId;
        try {
            if (joystickBase.setPointerCapture) {
                joystickBase.setPointerCapture(e.pointerId);
            }
        } catch (_) {}
        joystickBase.classList.add('active');
        if (navigator.vibrate) navigator.vibrate(10);
        handleJoystickMove(e.clientX, e.clientY);
    });

    joystickBase.addEventListener('pointermove', (e) => {
        if (activePointerId !== e.pointerId) return;
        handleJoystickMove(e.clientX, e.clientY);
    });

    const endJoystick = (e) => {
        if (activePointerId !== e.pointerId) return;
        try {
            if (e && joystickBase.hasPointerCapture && joystickBase.hasPointerCapture(e.pointerId)) {
                joystickBase.releasePointerCapture(e.pointerId);
            }
        } catch (_) {}
        resetJoystick();
    };

    joystickBase.addEventListener('pointerup', endJoystick);
    joystickBase.addEventListener('pointercancel', endJoystick);
}

// Botón de Salto Gigante
if (btnJump) {
    btnJump.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btnJump.classList.add('pressed');
        mobileAudio.play('jump');
        sendCommand('jump', true);
        if (navigator.vibrate) navigator.vibrate(25);
    });

    const endJump = (e) => {
        e.preventDefault();
        btnJump.classList.remove('pressed');
        sendCommand('jump', false);
    };

    btnJump.addEventListener('pointerup', endJump);
    btnJump.addEventListener('pointercancel', endJump);
}

// ==========================================
// 🔄 Control de Orientación Horizontal (Landscape)
// ==========================================
function isPortraitMode() {
    // 1. Orientación física de hardware (Screen Orientation API moderna)
    if (window.screen && window.screen.orientation && typeof window.screen.orientation.type === 'string') {
        if (window.screen.orientation.type.startsWith('portrait')) return true;
        if (window.screen.orientation.type.startsWith('landscape')) return false;
    }

    // 2. window.orientation tradicional (Safari iOS y WebViews de Android)
    if (typeof window.orientation === 'number') {
        if (window.orientation === 0 || window.orientation === 180) return true;
        if (window.orientation === 90 || window.orientation === -90) return false;
    }

    // 3. MatchMedia CSS en tiempo real
    if (window.matchMedia && window.matchMedia('(orientation: portrait)').matches) {
        return true;
    }

    // 4. Fallback por proporción de dimensiones
    return window.innerHeight > window.innerWidth;
}

function updateOrientationView() {
    if (thanksScreen && thanksScreen.style.display === 'flex') {
        if (rotateScreen) rotateScreen.style.display = 'none';
        return;
    }

    const inPortrait = isPortraitMode();

    if (hasStarted) {
        if (inPortrait) {
            // El usuario ya colocó su nombre pero tiene el celular en vertical:
            // Mostrar ÚNICAMENTE el aviso animado en pantalla completa pidiendo girar
            if (rotateScreen) rotateScreen.style.display = 'flex';
            if (container) container.style.display = 'none';
            if (roomSelection) roomSelection.style.display = 'none';
        } else {
            // El usuario puso el celular en horizontal: ocultar aviso y mostrar mandos
            if (rotateScreen) rotateScreen.style.display = 'none';
            if (roomSelection) roomSelection.style.display = 'none';
            if (container) container.style.display = 'flex';
        }
    } else {
        // Pantalla inicial de bienvenida y nickname
        if (rotateScreen) rotateScreen.style.display = 'none';
        if (roomSelection) roomSelection.style.display = 'flex';
        if (container) container.style.display = 'none';
    }
}

window.addEventListener('orientationchange', () => {
    setTimeout(updateOrientationView, 120);
});
if (window.screen && window.screen.orientation) {
    try {
        window.screen.orientation.addEventListener('change', () => {
            setTimeout(updateOrientationView, 100);
        });
    } catch (_) {}
}
window.addEventListener('resize', () => {
    if (hasStarted) {
        setTimeout(updateOrientationView, 150);
    }
});

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

    if (nicknameInput) {
        // Validación obligatoria de Nickname (mínimo 2 caracteres)
        const validateNick = () => {
            const val = nicknameInput.value.trim();
            if (connectBtn) {
                connectBtn.disabled = val.length < 2;
            }
        };
        nicknameInput.addEventListener('input', validateNick);
        validateNick();

        nicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (nicknameInput.value.trim().length >= 2) {
                    if (connectBtn) connectBtn.click();
                } else {
                    nicknameInput.style.borderColor = 'var(--danger)';
                    setTimeout(() => { nicknameInput.style.borderColor = ''; }, 1200);
                }
            }
        });
    }

    if (connectBtn) {
        connectBtn.addEventListener('click', (e) => {
            if (e) e.preventDefault();

            // Cerrar teclado virtual explícitamente para que no distorsione el viewport
            if (nicknameInput) nicknameInput.blur();

            mobileAudio.init();

            const nick = nicknameInput ? nicknameInput.value.trim() : '';
            if (!nick || nick.length < 2) {
                if (nicknameInput) {
                    nicknameInput.focus();
                    nicknameInput.style.borderColor = 'var(--danger)';
                    setTimeout(() => { nicknameInput.style.borderColor = ''; }, 1200);
                }
                return;
            }
            nickname = nick;

            if (!currentRoomId && roomInput) {
                currentRoomId = roomInput.value.trim().toUpperCase();
            }

            if (!currentRoomId) {
                alert('Por favor escanea el código QR de la pantalla.');
                return;
            }

            hasStarted = true;
            roomSelection.style.display = 'none';
            updateOrientationView();

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
