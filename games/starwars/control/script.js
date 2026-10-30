// ==============================================================================
// STAR WARS: FALCON - Mobile Flight Controller Script
// Mando WebRTC en tiempo real para smartphones
// ==============================================================================

const status = document.getElementById('status');
const roomSelection = document.getElementById('room-selection');
const flightContainer = document.getElementById('flight-container');
const rotateScreen = document.getElementById('rotate-screen');
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
let nickname = 'SOLO';
let hasStarted = false;

// Leer parámetro ?room=XXXX
const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');
if (roomParam) {
    roomId = roomParam.trim().toUpperCase();
    if (roomInput) roomInput.value = roomId;
}

// Configuración ICE STUN/TURN dinámica
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
            if (flightContainer) flightContainer.style.display = 'none';
            if (roomSelection) roomSelection.style.display = 'none';
        } else {
            // El usuario puso el celular en horizontal: ocultar aviso y mostrar mandos
            if (rotateScreen) rotateScreen.style.display = 'none';
            if (roomSelection) roomSelection.style.display = 'none';
            if (flightContainer) flightContainer.style.display = 'flex';
        }
    } else {
        // Pantalla inicial de bienvenida y nickname
        if (rotateScreen) rotateScreen.style.display = 'none';
        if (roomSelection) roomSelection.style.display = 'flex';
        if (flightContainer) flightContainer.style.display = 'none';
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
// 📡 Señalización WebSocket y WebRTC
// ==========================================
function initSignaling() {
    const serverIp = CONFIG.SIGNALING_SERVER_IP || window.location.hostname;
    const serverPort = CONFIG.SIGNALING_SERVER_PORT || '8080';
    const signalingUrl = CONFIG.SIGNALING_SERVER_URL || `${serverIp}:${serverPort}`;
    const wsUrl = signalingUrl.startsWith('ws://') || signalingUrl.startsWith('wss://')
        ? signalingUrl
        : `wss://${signalingUrl}`;

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
                        
                        status.textContent = `⚡ CONECTADO • ${nickname}`;
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
                    status.textContent = data.message || 'ERROR DE CONEXIÓN';
                    if (connectBtn) {
                        connectBtn.disabled = false;
                        connectBtn.style.opacity = '1';
                    }
                }
            } catch (err) {
                console.error('Error procesando socket controller:', err);
            }
        };

        socket.onerror = () => {
            status.textContent = 'ERROR DE SEÑALIZACIÓN';
            if (connectBtn) {
                connectBtn.disabled = false;
                connectBtn.style.opacity = '1';
            }
        };

        socket.onclose = () => {
            status.textContent = 'DESCONECTADO';
        };
    } catch (e) {
        status.textContent = 'NO SE PUDO CONECTAR';
        if (connectBtn) {
            connectBtn.disabled = false;
            connectBtn.style.opacity = '1';
        }
    }
}

async function setupWebRTC() {
    try {
        pc = new RTCPeerConnection(getIceConfig());

        pc.onicecandidate = (event) => {
            if (event.candidate && socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'candidate',
                    candidate: event.candidate,
                    roomId: roomId
                }));
            }
        };

        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            if (state === 'disconnected' || state === 'failed') {
                status.textContent = 'DESCONECTADO';
                if (thanksScreen.style.display === 'none' || thanksScreen.style.display === '') {
                    if (rotateScreen) rotateScreen.style.display = 'none';
                    if (flightContainer) flightContainer.style.display = 'none';
                    if (roomSelection) roomSelection.style.display = 'flex';
                }
            }
        };

        // DataChannel fiable sin maxRetransmits: 0
        dataChannel = pc.createDataChannel('control', { ordered: false });

        dataChannel.onopen = () => {
            status.textContent = `⚡ HALCÓN LISTO • ${nickname}`;
            updateOrientationView();

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
    if (rotateScreen) rotateScreen.style.display = 'none';
    if (flightContainer) flightContainer.style.display = 'none';
    if (roomSelection) roomSelection.style.display = 'none';
    thanksScreen.style.display = 'flex';
    status.textContent = 'MISIÓN FINALIZADA';
    const thanksMsg = document.getElementById('thanks-message');
    if (thanksMsg) {
        thanksMsg.innerHTML = `¡Gran combate, <span style="color: var(--amber);">${nickname.toUpperCase()}</span>!<br>PUNTUACIÓN:<br><span style="font-size: 32px; color: var(--cyan); font-weight: bold; display: block; margin: 12px 0;">${(score || 0).toString().padStart(6, '0')}</span>`;
    }
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
        window.location.reload();
    });
}

// ==============================================================================
// 🕹️ JOYSTICK ANALÓGICO VIRTUAL 360°
// ==============================================================================

function sendMove(x, y) {
    if (dataChannel && dataChannel.readyState === 'open') {
        try {
            dataChannel.send(JSON.stringify({
                type: 'move',
                x: Math.round(x * 100) / 100,
                y: Math.round(y * 100) / 100
            }));
        } catch (_) {}
    }
}

if (joystickBase && joystickKnob) {
    const MAX_RADIUS = 50; // Límite de desplazamiento del pomo en px
    let activePointerId = null;
    let lastMoveTime = 0;

    function handleJoystickMove(clientX, clientY) {
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const dist = Math.hypot(dx, dy);

        let knobX = 0;
        let knobY = 0;

        if (dist > 0) {
            const clampedDist = Math.min(dist, MAX_RADIUS);
            const angle = Math.atan2(dy, dx);
            knobX = Math.cos(angle) * clampedDist;
            knobY = Math.sin(angle) * clampedDist;
        }

        joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

        // Normalizar valores entre -1.0 y +1.0
        let normX = knobX / MAX_RADIUS;
        let normY = knobY / MAX_RADIUS;

        // Deadzone para estabilidad en vuelo recto
        if (Math.abs(normX) < 0.08) normX = 0;
        if (Math.abs(normY) < 0.08) normY = 0;

        const now = Date.now();
        if (now - lastMoveTime >= 16) {
            sendMove(normX, normY);
            lastMoveTime = now;
        }
    }

    function resetJoystick() {
        activePointerId = null;
        joystickBase.classList.remove('active');
        joystickKnob.style.transform = 'translate(0px, 0px)';
        sendMove(0, 0);
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

// ==============================================================================
// 🔫 BOTONES DE DISPARO LÁSER Y HIPERESPACIO
// ==============================================================================

function setFire(active) {
    if (active) {
        fireBtn.classList.add('active');
        if (navigator.vibrate) navigator.vibrate(18);
    } else {
        fireBtn.classList.remove('active');
    }

    if (dataChannel && dataChannel.readyState === 'open') {
        try {
            dataChannel.send(JSON.stringify({
                type: 'fire',
                active: active
            }));
        } catch (_) {}
    }
}

if (fireBtn) {
    fireBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); setFire(true); });
    fireBtn.addEventListener('pointerup', (e) => { e.preventDefault(); setFire(false); });
    fireBtn.addEventListener('pointercancel', (e) => { e.preventDefault(); setFire(false); });
}

function triggerBoost() {
    if (!boostBtn) return;
    boostBtn.classList.add('active');
    if (navigator.vibrate) navigator.vibrate(45);
    setTimeout(() => boostBtn.classList.remove('active'), 250);

    if (dataChannel && dataChannel.readyState === 'open') {
        try {
            dataChannel.send(JSON.stringify({
                type: 'boost'
            }));
        } catch (_) {}
    }
}

if (boostBtn) {
    boostBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); triggerBoost(); });
}

// ==========================================
// 🚀 Inicialización y Validación al Cargar
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
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
                    nicknameInput.style.borderColor = 'var(--red)';
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

            const nick = nicknameInput ? nicknameInput.value.trim() : '';
            if (!nick || nick.length < 2) {
                if (nicknameInput) {
                    nicknameInput.focus();
                    nicknameInput.style.borderColor = 'var(--red)';
                    setTimeout(() => { nicknameInput.style.borderColor = ''; }, 1200);
                }
                return;
            }
            nickname = nick.toUpperCase();

            if (!roomId && roomInput) {
                roomId = roomInput.value.trim().toUpperCase();
            }

            if (!roomId) {
                alert('Por favor escanea el código QR de la pantalla grande.');
                return;
            }

            status.textContent = 'CONECTANDO AL HALCÓN...';
            connectBtn.disabled = true;
            connectBtn.style.opacity = '0.6';

            hasStarted = true;
            roomSelection.style.display = 'none';
            updateOrientationView();

            initSignaling();
        });
    }
});
