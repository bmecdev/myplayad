// ==============================================================================
// DUCK HUNT - Mobile Controller Script (NES Zapper WebRTC)
// ==============================================================================

const statusEl = document.getElementById('status');
const roomSelection = document.getElementById('room-selection');
const gameContainer = document.getElementById('game-container');
const thanksScreen = document.getElementById('thanks-screen');
const nicknameInput = document.getElementById('nickname-input');
const connectBtn = document.getElementById('connect-btn');
const hudNick = document.getElementById('hud-nick');
const hudAmmo = document.getElementById('hud-ammo');
const aimPad = document.getElementById('aim-pad');
const reticle = document.getElementById('reticle');
const fireBtn = document.getElementById('fire-btn');
const finalScoreText = document.getElementById('final-score-text');

let socket = null;
let pc = null;
let dataChannel = null;
let pendingCandidates = [];
let targetRoomId = '';
let playerNickname = '';

// Leer parámetro ?room=XXXX y credenciales TURN
const urlParams = new URLSearchParams(window.location.search);
targetRoomId = (urlParams.get('room') || '').toUpperCase().trim();
const roomInput = document.getElementById('room-input');

if (targetRoomId) {
    if (roomInput) {
        roomInput.value = targetRoomId;
        roomInput.style.display = 'none';
    }
} else {
    if (roomInput) {
        roomInput.style.display = 'block';
        roomInput.placeholder = 'CÓDIGO DE SALA';
    }
}

const turnIp = urlParams.get('turn_ip');
const turnUser = urlParams.get('turn_user');
const turnPass = urlParams.get('turn_pass');
if (turnIp) localStorage.setItem('TURN_PUBLIC_IP', turnIp);
if (turnUser) localStorage.setItem('TURN_USER', turnUser);
if (turnPass) localStorage.setItem('TURN_PASS', turnPass);

function checkValidForm() {
    const nickVal = nicknameInput.value.trim();
    const effectiveRoom = targetRoomId || (roomInput ? roomInput.value.trim() : '');
    connectBtn.disabled = nickVal.length < 2 || !effectiveRoom;
}

// Validación obligatoria de Nickname (mínimo 2 caracteres) y Sala
nicknameInput.addEventListener('input', checkValidForm);
if (roomInput) roomInput.addEventListener('input', checkValidForm);

nicknameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !connectBtn.disabled) {
        connectBtn.click();
    }
});

connectBtn.addEventListener('click', () => {
    const val = nicknameInput.value.trim().toUpperCase();
    if (val.length < 2) return;
    if (!targetRoomId && roomInput) {
        targetRoomId = roomInput.value.trim().toUpperCase();
    }
    if (!targetRoomId) {
        alert('Por favor, ingresa o escanea el código de sala.');
        return;
    }
    playerNickname = val.substring(0, 10);
    hudNick.textContent = playerNickname;

    connectBtn.disabled = true;
    statusEl.textContent = 'CONECTANDO AL SERVIDOR...';
    initSignaling();
});

function initSignaling() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${CONFIG.SIGNALING_SERVER_URL || 'signaling.myplayad.com'}:443`;

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            statusEl.textContent = 'BUSCANDO SALA...';
            socket.send(JSON.stringify({
                type: 'register',
                role: 'controller',
                roomId: targetRoomId
            }));
        };

        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'host_ready') {
                    statusEl.textContent = 'CONECTANDO CON PANTALLA...';
                    pendingCandidates = [];
                    setupWebRTC();
                } else if (data.type === 'answer') {
                    if (pc) {
                        const sdp = typeof data.sdp === 'string' ? data.sdp : (data.sdp?.sdp || '');
                        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));

                        // Transición inmediata a los controles al recibir answer
                        roomSelection.style.display = 'none';
                        gameContainer.style.display = 'flex';
                        statusEl.textContent = 'ZAPPER CONECTADO';

                        while (pendingCandidates.length > 0) {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(pendingCandidates.shift()));
                            } catch (_) {}
                        }
                    }
                } else if (data.type === 'candidate') {
                    if (pc && data.candidate) {
                        if (pc.remoteDescription) {
                            try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (_) {}
                        } else {
                            pendingCandidates.push(data.candidate);
                        }
                    }
                } else if (data.type === 'error') {
                    statusEl.textContent = data.message || 'ERROR DE CONEXIÓN';
                    connectBtn.disabled = false;
                }
            } catch (err) {
                console.error('Error en socket controller:', err);
            }
        };

        socket.onclose = () => {
            if (gameContainer.style.display !== 'flex') {
                statusEl.textContent = 'CONEXIÓN CERRADA. REINTENTANDO...';
            }
        };
    } catch (e) {
        console.warn('Fallo WebSocket signaling:', e);
        statusEl.textContent = 'ERROR DE RED';
        connectBtn.disabled = false;
    }
}

async function setupWebRTC() {
    const turnPublicIp = localStorage.getItem('TURN_PUBLIC_IP') || '31.97.43.72';
    const turnUser = localStorage.getItem('TURN_USER') || 'game';
    const turnPass = localStorage.getItem('TURN_PASS') || 'changeme';

    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: `turn:${turnPublicIp}:3478?transport=udp`, username: turnUser, credential: turnPass },
            { urls: `turn:${turnPublicIp}:3478?transport=tcp`, username: turnUser, credential: turnPass },
            { urls: `turns:${turnPublicIp}:5349`, username: turnUser, credential: turnPass }
        ]
    };

    pc = new RTCPeerConnection(rtcConfig);

    pc.onicecandidate = (e) => {
        if (e.candidate && socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'candidate',
                candidate: e.candidate,
                roomId: targetRoomId
            }));
        }
    };

    // Crear DataChannel principal (SIN maxRetransmits: 0 para evitar pérdida de join)
    dataChannel = pc.createDataChannel('control', { ordered: false });

    dataChannel.onopen = () => {
        statusEl.textContent = 'ZAPPER LISTO';
        roomSelection.style.display = 'none';
        gameContainer.style.display = 'flex';

        // Enviar identificación del jugador
        dataChannel.send(JSON.stringify({
            type: 'join',
            nickname: playerNickname,
            value: playerNickname
        }));
    };

    dataChannel.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'ammo') {
                updateAmmoHUD(msg.count);
            } else if (msg.type === 'game_over') {
                gameContainer.style.display = 'none';
                thanksScreen.style.display = 'flex';
                statusEl.textContent = 'PARTIDA FINALIZADA';
                if (finalScoreText) {
                    finalScoreText.textContent = `PUNTUACIÓN FINAL: ${msg.score || 0}`;
                }
            }
        } catch (_) {}
    };

    dataChannel.onclose = () => {
        statusEl.textContent = 'DESCONECTADO';
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.send(JSON.stringify({
        type: 'offer',
        sdp: offer.sdp,
        roomId: targetRoomId
    }));
}

function updateAmmoHUD(count) {
    if (!hudAmmo) return;
    let bullets = '';
    for (let i = 0; i < count; i++) {
        bullets += '● ';
    }
    for (let i = count; i < 3; i++) {
        bullets += '○ ';
    }
    hudAmmo.textContent = bullets.trim();
}

// ==============================================================================
// GESTIÓN DEL VISOR DE PUNTERÍA (AIM TRACKPAD) Y DISPARO
// ==============================================================================

let lastAimSend = 0;
let currentNormX = 0.5;
let currentNormY = 0.5;

function updateAim(clientX, clientY, shouldSend = true) {
    const rect = aimPad.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

    currentNormX = x / rect.width;
    currentNormY = y / rect.height;

    // Actualizar retícula en pantalla móvil
    reticle.style.left = `${currentNormX * 100}%`;
    reticle.style.top = `${currentNormY * 100}%`;

    // Enviar a la pantalla arcade a 60fps
    const now = performance.now();
    if (shouldSend && dataChannel && dataChannel.readyState === 'open' && (now - lastAimSend > 16)) {
        lastAimSend = now;
        dataChannel.send(JSON.stringify({
            type: 'aim',
            x: currentNormX,
            y: currentNormY
        }));
    }
}

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isDragging = false;

// Touch / Pointer en Aim Pad
aimPad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    aimPad.setPointerCapture(e.pointerId);
    touchStartX = e.clientX;
    touchStartY = e.clientY;
    touchStartTime = performance.now();
    isDragging = false;
    updateAim(e.clientX, e.clientY, true);
});

aimPad.addEventListener('pointermove', (e) => {
    e.preventDefault();
    if (e.buttons > 0 || e.pointerType === 'touch') {
        const dist = Math.hypot(e.clientX - touchStartX, e.clientY - touchStartY);
        if (dist > 8) isDragging = true;
        updateAim(e.clientX, e.clientY, true);
    }
});

aimPad.addEventListener('pointerup', (e) => {
    e.preventDefault();
    try { aimPad.releasePointerCapture(e.pointerId); } catch (_) {}
    const duration = performance.now() - touchStartTime;
    // Si fue un toque rápido sin arrastrar mucho, disparar en la posición tocada
    if (!isDragging && duration < 240) {
        triggerFire();
    }
});

// Botón de Disparo / Gatillo Zapper
function triggerFire() {
    if (navigator.vibrate) {
        try { navigator.vibrate(35); } catch (_) {}
    }

    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({
            type: 'fire',
            x: currentNormX,
            y: currentNormY
        }));
    }
}

fireBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    triggerFire();
});

// Inicializar retícula centrada
reticle.style.left = '50%';
reticle.style.top = '50%';

