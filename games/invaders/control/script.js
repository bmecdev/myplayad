const container = document.getElementById('joystick-container');
const fireBtn = document.getElementById('fire-btn');
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
let nickname = 'Player';

// Función para obtener configuración ICE dinámica con TURN
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

const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

let tapStartTime = 0;
let lastSendTime = 0;
const SEND_INTERVAL = 16;

window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
        roomInput.value = roomFromUrl.toUpperCase();
        nicknameInput.focus();
    }
    // Soporte rápido para pasar TURN por query params: ?turn_ip=1.2.3.4&turn_pass=abc
    const turnIp = urlParams.get('turn_ip');
    const turnUser = urlParams.get('turn_user');
    const turnPass = urlParams.get('turn_pass');
    if (turnIp) localStorage.setItem('TURN_PUBLIC_IP', turnIp);
    if (turnUser) localStorage.setItem('TURN_USER', turnUser);
    if (turnPass) localStorage.setItem('TURN_PASS', turnPass);
});

connectBtn.addEventListener('click', () => {
    const roomId = roomInput.value.trim().toUpperCase();
    nickname = nicknameInput.value.trim() || 'Player';
    if (roomId) {
        currentRoomId = roomId;
        connectSignaling(roomId);
    } else {
        alert('Por favor, ingresa un código de sala');
    }
});

nicknameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connectBtn.click();
});

function connectSignaling(roomId) {
    if (typeof CONFIG === 'undefined') {
        console.error('ERR: config.js no cargó');
        return;
    }

    const serverIp = CONFIG.SIGNALING_SERVER_IP || window.location.hostname;
    const serverPort = CONFIG.SIGNALING_SERVER_PORT || '8080';
    const signalingUrl = CONFIG.SIGNALING_SERVER_URL || `${serverIp}:${serverPort}`;
    const wsUrl = `wss://${signalingUrl}`;

    status.textContent = `Conectando a ${wsUrl}...`;
    status.style.color = '#666';

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
                        status.textContent = 'SALA OCUPADA - INTENTA MÁS TARDE';
                        status.style.color = 'orange';
                        alert('Esta sala ya tiene un jugador activo.');
                    }
                    return;
                }

                if (data.type === 'host_ready') {
                    startWebRTC();
                } else if (data.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                    status.textContent = 'Conectado';
                    roomSelection.style.display = 'none';
                    container.style.display = 'flex';
                } else if (data.type === 'candidate') {
                    if (pc) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            } catch (e) {
                console.error('Err JSON:', e.message);
            }
        };

        socket.onerror = () => {
            status.textContent = 'ERROR: No se pudo conectar';
            status.style.color = 'red';
        };

        socket.onclose = () => {
            if (thanksScreen.style.display === 'none') {
                roomSelection.style.display = 'block';
                container.style.display = 'none';
            }
        };
    } catch (e) {
        console.error('Excep WS:', e.message);
    }
}

async function startWebRTC() {
    const rtcConfig = (window.GAME_CONFIG && window.GAME_CONFIG.getIceConfig) ? window.GAME_CONFIG.getIceConfig() : getIceConfig();
    pc = new RTCPeerConnection(rtcConfig);

    // Attach PC diagnostics when possible
    if (window.GAME_CONFIG && window.GAME_CONFIG.attachPCDiagnostics) {
        try { window.GAME_CONFIG.attachPCDiagnostics(pc, 'controller-pc'); } catch (e) { console.warn('attachPCDiagnostics failed', e); }
    }

    dataChannel = pc.createDataChannel('control', { ordered: false });
    if (window.GAME_CONFIG && window.GAME_CONFIG.attachDataChannelDiagnostics) {
        try { window.GAME_CONFIG.attachDataChannelDiagnostics(dataChannel, 'controller-dc'); } catch (e) { console.warn('attachDataChannelDiagnostics failed', e); }
    }
    dataChannel.onopen = () => {
        status.textContent = '¡Listo!';
        roomSelection.style.display = 'none';
        container.style.display = 'flex';
        thanksScreen.style.display = 'none';
        dataChannel.send(JSON.stringify({ type: 'nickname', value: nickname }));
    };

    dataChannel.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'game_over') {
                showThanks(data.score);
            }
        } catch (err) {}
    };

    dataChannel.onclose = () => {
        console.warn('DataChannel cerrado');
        status.textContent = 'Desconectado del juego';
        status.style.color = 'orange';
        container.style.display = 'none';
        roomSelection.style.display = 'block';
    };

    pc.onicecandidate = (event) => {
        if (event.candidate) {
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
            console.warn(`Conexión WebRTC: ${state}`);
            status.textContent = 'Desconectado del juego';
            status.style.color = 'orange';
            container.style.display = 'none';
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

    const thanksTitle = thanksScreen.querySelector('h1');
    const thanksText = thanksScreen.querySelector('p');
    const thanksSmall = thanksScreen.querySelector('.small');

    if (thanksTitle) thanksTitle.textContent = '¡FIN DE LA PARTIDA!';
    if (thanksText) {
        thanksText.innerHTML = `¡Felicidades <span style="color: var(--primary);">${nickname.toUpperCase()}</span>!<br>Tu puntaje final fue:<br><span style="font-size: 48px; color: white; font-weight: 900; display: block; margin: 10px 0;">${finalScore.toString().padStart(3, '0')}</span>`;
    }

    if (thanksSmall) {
        thanksSmall.style.display = 'block';
        thanksSmall.style.marginTop = '25px';
        thanksSmall.style.padding = '15px';
        thanksSmall.style.borderTop = '1px solid #444';
        thanksSmall.innerHTML = `<span style="font-size: 14px; color: #aaa; line-height: 1.5; font-style: italic;">Para volver a participar,<br>por favor <strong>escanea el código QR</strong><br>que aparece en la pantalla principal.</span>`;
    }

    status.textContent = 'Sesión finalizada';

    if (dataChannel) dataChannel.close();
    if (pc) pc.close();
    if (socket) socket.close();
}

const trackpadContainer = document.getElementById('trackpad-container');
const trackpadIndicator = document.getElementById('trackpad-indicator');
const trackpadTrack = trackpadContainer.querySelector('.trackpad-track');

let trackpadRect = null;
let activePointers = new Map(); // Mapear pointerID -> { type, data }
let currentMovement = { x: 0, y: 0 };
let fireActive = false;

function updateTrackpadDimensions() {
    trackpadRect = trackpadContainer.getBoundingClientRect();
}

function sendMovementData() {
    const now = Date.now();
    if (now - lastSendTime > SEND_INTERVAL) {
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify({ x: currentMovement.x, y: currentMovement.y }));
            lastSendTime = now;
        }
    }
}

window.addEventListener('resize', updateTrackpadDimensions);
setTimeout(updateTrackpadDimensions, 100);

// EVENTOS DEL TRACKPAD
trackpadContainer.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    activePointers.set(e.pointerId, { type: 'trackpad' });
    updateTrackpadDimensions();
});

trackpadContainer.addEventListener('pointermove', (e) => {
    if (!activePointers.has(e.pointerId) || !trackpadRect) return;

    // Calcular la posición del dedo dentro del trackpad
    const touchX = e.clientX - trackpadRect.left;
    const trackpadWidth = trackpadRect.width;
    
    // Normalizar a rango de 0 a 1
    let normalizedPosition = touchX / trackpadWidth;
    normalizedPosition = Math.max(0, Math.min(1, normalizedPosition));
    
    // Convertir a rango de -1 a 1
    let normalizedX = (normalizedPosition - 0.5) * 2;
    
    // Aplicar zona muerta en el centro
    const deadZone = 0.1;
    if (Math.abs(normalizedX) < deadZone) {
        normalizedX = 0;
    }
    
    // Actualizar movimiento actual
    currentMovement.x = normalizedX;
    
    // Actualizar posición visual del indicador
    const indicatorPercentage = normalizedPosition * 100;
    trackpadIndicator.style.left = indicatorPercentage + '%';
    
    // Efecto visual de intensidad
    const intensity = Math.abs(normalizedX);
    trackpadIndicator.style.boxShadow = `0 6px ${16 + intensity * 8}px rgba(76, 175, 80, ${0.5 + intensity * 0.3})`;

    // Enviar datos continuamente
    sendMovementData();
});

trackpadContainer.addEventListener('pointerup', (e) => {
    if (!activePointers.has(e.pointerId)) return;
    
    activePointers.delete(e.pointerId);
    
    // Si no hay más pointers en el trackpad, detener movimiento
    if (activePointers.size === 0) {
        currentMovement.x = 0;
        currentMovement.y = 0;
        trackpadIndicator.style.left = '50%';
        trackpadIndicator.style.boxShadow = '0 6px 16px rgba(76, 175, 80, 0.5)';
        
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify({ x: 0, y: 0 }));
        }
    }
});

trackpadContainer.addEventListener('pointercancel', (e) => {
    activePointers.delete(e.pointerId);
});

// EVENTOS DEL BOTÓN DE FUEGO (INDEPENDIENTES)
if (fireBtn) {
    fireBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        fireActive = true;
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify({ fire: true }));
        }
    });
    
    fireBtn.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        fireActive = false;
    });
    
    fireBtn.addEventListener('pointercancel', (e) => {
        e.stopPropagation();
        fireActive = false;
    });
}
