// ==============================================================================
// CYBER CANYON: QuestWorld - Mobile Controller Script
// ==============================================================================

const container = document.getElementById('flight-container');
const status = document.getElementById('status');
const nicknameInput = document.getElementById('nickname-input');
const connectBtn = document.getElementById('connect-btn');
const roomSelection = document.getElementById('room-selection');
const thanksScreen = document.getElementById('thanks-screen');

const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const boostBtn = document.getElementById('boost-btn');

let pc = null;
let dataChannel = null;
let socket = null;
let currentRoomId = null;
let nickname = 'PILOT';
let pendingCandidates = [];

// Estado de control
const flightState = {
    x: 0,
    y: 0,
    boost: false,
    activePointerId: null
};

// Configuración ICE dinámica con TURN
function getIceConfig() {
    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    const turnPublicIp = localStorage.getItem('TURN_PUBLIC_IP') || '31.97.43.72';
    const turnUser = localStorage.getItem('TURN_USER') || 'game';
    const turnPass = localStorage.getItem('TURN_PASS') || 'changeme';

    if (turnPublicIp) {
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

// Vibración háptica en móvil
function haptic(pattern) {
    if ('vibrate' in navigator) {
        try { navigator.vibrate(pattern); } catch (e) {}
    }
}

// Detección automática del código de sala en URL (?room=XXXX)
const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');
if (roomParam) {
    currentRoomId = roomParam.toUpperCase();
}

// Conexión y señalización WebRTC
async function connectToHost() {
    if (!currentRoomId) {
        status.textContent = 'ERROR: CÓDIGO DE SALA INVÁLIDO';
        status.style.color = '#ff4d6d';
        return;
    }

    nickname = (nicknameInput.value.trim() || 'PILOT').toUpperCase();
    status.textContent = 'ENLAZANDO CON EL CAÑÓN...';
    connectBtn.disabled = true;

    const serverIp = CONFIG.SIGNALING_SERVER_IP || window.location.hostname;
    const serverPort = CONFIG.SIGNALING_SERVER_PORT || '8080';
    const serverUrl = CONFIG.SIGNALING_SERVER_URL || `${serverIp}:${serverPort}`;
    const signalingUrl = serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://')
        ? serverUrl
        : `wss://${serverUrl}`;

    socket = new WebSocket(signalingUrl);

    socket.onopen = async () => {
        socket.send(JSON.stringify({
            type: 'register',
            role: 'controller',
            roomId: currentRoomId
        }));
        await initPeerConnection();
    };

    socket.onerror = () => {
        status.textContent = 'ERROR DE RED DE SEÑALIZACIÓN';
        connectBtn.disabled = false;
    };

    socket.onmessage = async (message) => {
        try {
            const data = JSON.parse(message.data);

            if (data.type === 'answer') {
                const sdp = typeof data.sdp === 'string' ? data.sdp : (data.sdp?.sdp || '');
                await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));

                // Vaciar candidatos pendientes
                for (const candidate of pendingCandidates) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
                }
                pendingCandidates = [];

                // Transición visual inmediata al control
                roomSelection.style.display = 'none';
                container.style.display = 'flex';
                status.textContent = `PILOTO CONECTADO: ${nickname}`;
                haptic([40, 30, 40]);
            } else if (data.type === 'candidate') {
                if (pc && pc.remoteDescription) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) {}
                } else {
                    pendingCandidates.push(data.candidate);
                }
            }
        } catch (e) {
            console.error('Error procesando respuesta:', e);
        }
    };
}

async function initPeerConnection() {
    pc = new RTCPeerConnection(getIceConfig());
    pendingCandidates = [];

    // DataChannel principal
    dataChannel = pc.createDataChannel('control', { ordered: false });

    dataChannel.onopen = () => {
        status.textContent = `EN VUELO: ${nickname}`;
        dataChannel.send(JSON.stringify({
            type: 'join',
            nickname: nickname,
            value: nickname
        }));
    };

    dataChannel.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'game_over') {
                showThanks(data.score || 0);
            } else if (data.type === 'sfx') {
                if (data.sound === 'hit') haptic([60, 40, 80]);
                else if (data.sound === 'gate') haptic(35);
                else if (data.sound === 'crash') haptic(250);
            }
        } catch (e) {}
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
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            status.textContent = 'DESCONECTADO DEL JUEGO';
            status.style.color = 'orange';
        }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.send(JSON.stringify({
        type: 'offer',
        sdp: offer.sdp,
        roomId: currentRoomId
    }));
}

function showThanks(finalScore) {
    container.style.display = 'none';
    roomSelection.style.display = 'none';
    thanksScreen.style.display = 'flex';

    const text = thanksScreen.querySelector('p');
    if (text) {
        text.innerHTML = `¡Gran vuelo, <strong>${nickname}</strong>!<br>Tu puntuación final fue:<br><span style="font-size: 42px; color: #3dff8a; font-weight: bold; display: block; margin: 12px 0;">${finalScore.toString().padStart(4, '0')}</span>`;
    }

    status.textContent = 'MISIÓN CONCLUIDA';
    haptic([100, 50, 150]);

    if (dataChannel) dataChannel.close();
    if (pc) pc.close();
    if (socket) socket.close();
}

// ==============================================================================
// GESTIÓN DEL JOYSTICK ANALÓGICO VIRTUAL 360°
// ==============================================================================

const MAX_RADIUS = 70; // Rango máximo en píxeles
let lastSend = 0;

function sendFlightInput() {
    const now = performance.now();
    if (now - lastSend >= 16) { // ~60fps
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify({
                x: flightState.x,
                y: flightState.y,
                boost: flightState.boost
            }));
            lastSend = now;
        }
    }
}

function handleJoystickTouch(e) {
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const distance = Math.hypot(dx, dy);

    let normX = 0;
    let normY = 0;

    if (distance > 0) {
        const clampedDist = Math.min(distance, MAX_RADIUS);
        const angle = Math.atan2(dy, dx);

        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;

        joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

        normX = knobX / MAX_RADIUS;
        normY = knobY / MAX_RADIUS;
    } else {
        joystickKnob.style.transform = 'translate(0px, 0px)';
    }

    flightState.x = normX;
    flightState.y = normY;
    sendFlightInput();
}

function resetJoystick() {
    flightState.x = 0;
    flightState.y = 0;
    flightState.activePointerId = null;
    joystickKnob.style.transform = 'translate(0px, 0px)';
    sendFlightInput();
}

// Eventos Pointer para el Joystick
joystickBase.addEventListener('pointerdown', (e) => {
    joystickBase.setPointerCapture(e.pointerId);
    flightState.activePointerId = e.pointerId;
    handleJoystickTouch(e);
    haptic(15);
});

joystickBase.addEventListener('pointermove', (e) => {
    if (flightState.activePointerId === e.pointerId) {
        handleJoystickTouch(e);
    }
});

joystickBase.addEventListener('pointerup', (e) => {
    if (flightState.activePointerId === e.pointerId) {
        resetJoystick();
    }
});

joystickBase.addEventListener('pointercancel', (e) => {
    if (flightState.activePointerId === e.pointerId) {
        resetJoystick();
    }
});

// Botón de Turbo Boost
boostBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    flightState.boost = true;
    boostBtn.classList.add('active');
    sendFlightInput();
    haptic(40);
});

const endBoost = (e) => {
    if (flightState.boost) {
        e.preventDefault();
        flightState.boost = false;
        boostBtn.classList.remove('active');
        sendFlightInput();
    }
};

boostBtn.addEventListener('pointerup', endBoost);
boostBtn.addEventListener('pointercancel', endBoost);

// Botón de Inicio
connectBtn.addEventListener('click', connectToHost);
nicknameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connectToHost();
});
