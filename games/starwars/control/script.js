// ==============================================================================
// STAR WARS: FALCON - Mobile Flight Controller Script
// Mando WebRTC en tiempo real para smartphones
// ==============================================================================

const status = document.getElementById('status');
const roomSelection = document.getElementById('room-selection');
const flightContainer = document.getElementById('flight-container');
const thanksScreen = document.getElementById('thanks-screen');
const nicknameInput = document.getElementById('nickname-input');
const roomInput = document.getElementById('room-input');
const connectBtn = document.getElementById('connect-btn');
const playAgainBtn = document.getElementById('play-again-btn');

// Elementos de la palanca de vuelo y acciones
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const fireBtn = document.getElementById('fire-btn');
const boostBtn = document.getElementById('boost-btn');

let pc = null;
let dataChannel = null;
let socket = null;
let pendingCandidates = [];
let roomId = '';
let nickname = '';

// Leer parámetro ?room=XXXX
const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');
if (roomParam) {
    roomId = roomParam.trim().toUpperCase();
    roomInput.value = roomId;
}

// Configuración ICE STUN/TURN
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:31.97.43.72:3478?transport=udp', username: 'game', credential: 'changeme' },
        { urls: 'turn:31.97.43.72:3478?transport=tcp', username: 'game', credential: 'changeme' },
        { urls: 'turns:31.97.43.72:5349', username: 'game', credential: 'changeme' }
    ]
};

// Iniciar conexión al pulsar "DESPEGAR"
connectBtn.addEventListener('click', () => {
    nickname = (nicknameInput.value.trim() || 'SOLO').substring(0, 10).toUpperCase();
    if (!roomId) {
        roomId = roomInput.value.trim().toUpperCase();
    }

    if (!roomId) {
        alert('Por favor escanea el código QR de la pantalla grande.');
        return;
    }

    status.textContent = 'CONECTANDO AL HALCÓN...';
    connectBtn.disabled = true;
    connectBtn.style.opacity = '0.6';

    initSignaling();
});

function initSignaling() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${CONFIG.SIGNALING_SERVER_URL || 'signaling.myplayad.com'}:443`;

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            status.textContent = 'ENLAZANDO CON LA PANTALLA...';
            socket.send(JSON.stringify({
                type: 'register',
                role: 'controller',
                roomId: roomId
            }));
        };

        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'host_ready') {
                    pendingCandidates = [];
                    setupWebRTC();
                } else if (data.type === 'answer') {
                    if (pc) {
                        const sdp = typeof data.sdp === 'string' ? data.sdp : (data.sdp?.sdp || '');
                        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: sdp }));
                        
                        // Transición visual inmediata (evita atasco en Enlazando)
                        roomSelection.style.display = 'none';
                        flightContainer.style.display = 'flex';
                        status.textContent = `PILOTO: ${nickname}`;

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
                    status.textContent = data.message || 'ERROR DE CONEXIÓN';
                    connectBtn.disabled = false;
                    connectBtn.style.opacity = '1';
                }
            } catch (err) {
                console.error('Error procesando socket controller:', err);
            }
        };

        socket.onerror = () => {
            status.textContent = 'ERROR DE SEÑALIZACIÓN';
            connectBtn.disabled = false;
            connectBtn.style.opacity = '1';
        };

        socket.onclose = () => {
            // Reintentar si se desconectó inesperadamente
        };
    } catch (e) {
        status.textContent = 'NO SE PUDO CONECTAR';
        connectBtn.disabled = false;
        connectBtn.style.opacity = '1';
    }
}

async function setupWebRTC() {
    try {
        pc = new RTCPeerConnection(rtcConfig);

        pc.onicecandidate = (event) => {
            if (event.candidate && socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'candidate',
                    candidate: event.candidate,
                    roomId: roomId
                }));
            }
        };

        // DataChannel fiable sin maxRetransmits: 0
        dataChannel = pc.createDataChannel('control', { ordered: false });

        dataChannel.onopen = () => {
            status.textContent = `HALCÓN LISTO • ${nickname}`;
            roomSelection.style.display = 'none';
            flightContainer.style.display = 'flex';

            if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

            // Enviar handshake de unión inicial
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
                    handleGameOver(data.score);
                }
            } catch (_) {}
        };

        dataChannel.onclose = () => {
            status.textContent = 'CONEXIÓN CERRADA';
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.send(JSON.stringify({
            type: 'offer',
            sdp: offer.sdp,
            roomId: roomId
        }));
    } catch (err) {
        console.error('Error configurando WebRTC:', err);
        status.textContent = 'FALLO AL CREAR OFERTA';
    }
}

function handleGameOver(score) {
    flightContainer.style.display = 'none';
    thanksScreen.style.display = 'flex';
    status.textContent = 'MISIÓN FINALIZADA';
    const thanksMsg = document.getElementById('thanks-message');
    if (thanksMsg) {
        thanksMsg.textContent = `¡Gran combate! Puntos: ${score || 0}`;
    }
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
        window.location.reload();
    });
}

// ==============================================================================
// GESTIÓN DE PALANCA DE VUELO ANALÓGICA (JOYSTICK 360°)
// ==============================================================================

let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };
const maxJoystickRadius = 52;
let lastMoveTime = 0;
let currentVector = { x: 0, y: 0 };

function getBaseCenter() {
    const rect = joystickBase.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

function handleJoystickStart(e) {
    e.preventDefault();
    joystickActive = true;
    joystickCenter = getBaseCenter();
    const touch = e.touches ? e.touches[0] : e;
    handleJoystickMove(e);
}

function handleJoystickMove(e) {
    if (!joystickActive) return;
    e.preventDefault();

    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - joystickCenter.x;
    const dy = touch.clientY - joystickCenter.y;
    const dist = Math.hypot(dx, dy);

    let normX = 0;
    let normY = 0;

    if (dist > 0) {
        const clampedDist = Math.min(dist, maxJoystickRadius);
        const angle = Math.atan2(dy, dx);
        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;

        joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

        normX = knobX / maxJoystickRadius;
        normY = knobY / maxJoystickRadius;
    } else {
        joystickKnob.style.transform = 'translate(0px, 0px)';
    }

    currentVector.x = normX;
    currentVector.y = normY;

    // Throttle a ~60fps (16ms)
    const now = Date.now();
    if (now - lastMoveTime >= 16) {
        sendMove(normX, normY);
        lastMoveTime = now;
    }
}

function handleJoystickEnd(e) {
    if (!joystickActive) return;
    e.preventDefault();
    joystickActive = false;
    joystickKnob.style.transform = 'translate(0px, 0px)';
    currentVector.x = 0;
    currentVector.y = 0;
    sendMove(0, 0);
}

function sendMove(x, y) {
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({
            type: 'move',
            x: Math.round(x * 100) / 100,
            y: Math.round(y * 100) / 100
        }));
    }
}

// Eventos de toque para el Joystick
joystickBase.addEventListener('touchstart', handleJoystickStart, { passive: false });
window.addEventListener('touchmove', handleJoystickMove, { passive: false });
window.addEventListener('touchend', handleJoystickEnd, { passive: false });
window.addEventListener('touchcancel', handleJoystickEnd, { passive: false });

// Compatibilidad con ratón
joystickBase.addEventListener('mousedown', handleJoystickStart);
window.addEventListener('mousemove', handleJoystickMove);
window.addEventListener('mouseup', handleJoystickEnd);

// ==============================================================================
// BOTONES DE DISPARO LÁSER Y HIPERESPACIO
// ==============================================================================

function setFire(active) {
    if (active) {
        fireBtn.classList.add('active');
        if (navigator.vibrate) navigator.vibrate(18);
    } else {
        fireBtn.classList.remove('active');
    }

    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({
            type: 'fire',
            active: active
        }));
    }
}

fireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); setFire(true); }, { passive: false });
fireBtn.addEventListener('touchend', (e) => { e.preventDefault(); setFire(false); }, { passive: false });
fireBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); setFire(false); }, { passive: false });
fireBtn.addEventListener('mousedown', (e) => { e.preventDefault(); setFire(true); });
fireBtn.addEventListener('mouseup', (e) => { e.preventDefault(); setFire(false); });

function triggerBoost() {
    boostBtn.classList.add('active');
    if (navigator.vibrate) navigator.vibrate(45);
    setTimeout(() => boostBtn.classList.remove('active'), 250);

    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({
            type: 'boost'
        }));
    }
}

boostBtn.addEventListener('touchstart', (e) => { e.preventDefault(); triggerBoost(); }, { passive: false });
boostBtn.addEventListener('mousedown', (e) => { e.preventDefault(); triggerBoost(); });
