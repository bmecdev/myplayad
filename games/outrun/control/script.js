// Controlador Web Móvil para OutRun Retro Arcade
const status = document.getElementById('status');
const roomInput = document.getElementById('room-input');
const nicknameInput = document.getElementById('nickname-input');
const connectBtn = document.getElementById('connect-btn');
const roomSelection = document.getElementById('room-selection');
const thanksScreen = document.getElementById('thanks-screen');
const controllerContainer = document.getElementById('controller-container');
const displayDriver = document.getElementById('display-driver');
const thanksResultText = document.getElementById('thanks-result-text');

// Elementos de Control Táctil
const steerTrackpad = document.getElementById('steer-trackpad');
const steerIndicator = document.getElementById('steer-indicator');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnTurbo = document.getElementById('btn-turbo');
const btnGas = document.getElementById('btn-gas');
const btnBrake = document.getElementById('btn-brake');

let pc;
let dataChannel;
let socket;
let currentRoomId = null;
let nickname = 'DRIVER';

const currentInput = {
    steer: 0,
    gas: false,
    brake: false,
    turbo: false
};

let lastSendTime = 0;
const SEND_INTERVAL = 16; // ~60 fps

// Vibración háptica segura para teléfonos móviles
function vibrate(ms = 20) {
    if (navigator && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(ms); } catch (e) {}
    }
}

// Configuración ICE con TURN
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

window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
        roomInput.value = roomFromUrl.toUpperCase();
        nicknameInput.focus();
    }
    const turnIp = urlParams.get('turn_ip');
    const turnUser = urlParams.get('turn_user');
    const turnPass = urlParams.get('turn_pass');
    if (turnIp) localStorage.setItem('TURN_PUBLIC_IP', turnIp);
    if (turnUser) localStorage.setItem('TURN_USER', turnUser);
    if (turnPass) localStorage.setItem('TURN_PASS', turnPass);
});

connectBtn.addEventListener('click', () => {
    const roomId = roomInput.value.trim().toUpperCase();
    nickname = (nicknameInput.value.trim() || 'DRIVER').toUpperCase().substring(0, 10);
    if (roomId) {
        currentRoomId = roomId;
        connectSignaling(roomId);
    } else {
        alert('Por favor, ingresa el código de sala');
    }
});

nicknameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connectBtn.click();
});

function connectSignaling(roomId) {
    if (typeof CONFIG === 'undefined') {
        console.error('config.js no cargado');
        return;
    }

    const serverIp = CONFIG.SIGNALING_SERVER_IP || window.location.hostname;
    const serverPort = CONFIG.SIGNALING_SERVER_PORT || '8080';
    const serverUrl = CONFIG.SIGNALING_SERVER_URL || `${serverIp}:${serverPort}`;
    const wsUrl = serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://')
        ? serverUrl
        : `wss://${serverUrl}`;

    status.textContent = 'CONECTANDO...';
    status.style.color = '#ffb703';

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            socket.send(JSON.stringify({
                type: 'register',
                role: 'controller',
                roomId: roomId
            }));
        };

        socket.onmessage = async (message) => {
            try {
                const data = JSON.parse(message.data);
                if (data.type === 'error') {
                    if (data.message === 'SALA_OCUPADA') {
                        status.textContent = 'SALA OCUPADA';
                        status.style.color = 'orange';
                        alert('Esta carrera ya tiene un piloto al volante.');
                    }
                    return;
                }

                if (data.type === 'host_ready') {
                    startWebRTC();
                } else if (data.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                    status.textContent = 'CONECTADO';
                    status.style.color = '#3dff8a';
                } else if (data.type === 'candidate') {
                    if (pc) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            } catch (e) {
                console.error('Error JSON señalización:', e);
            }
        };

        socket.onerror = () => {
            status.textContent = 'ERROR DE RED';
            status.style.color = 'red';
        };

        socket.onclose = () => {
            if (thanksScreen.style.display === 'none') {
                roomSelection.style.display = 'block';
                controllerContainer.style.display = 'none';
            }
        };
    } catch (e) {
        console.error('Error conectando WS:', e);
    }
}

async function startWebRTC() {
    pc = new RTCPeerConnection(getIceConfig());

    dataChannel = pc.createDataChannel('control', { ordered: false });

    dataChannel.onopen = () => {
        status.textContent = 'EN PISTA';
        status.style.color = '#3dff8a';
        roomSelection.style.display = 'none';
        controllerContainer.style.display = 'flex';
        thanksScreen.style.display = 'none';
        if (displayDriver) displayDriver.textContent = `PILOTO: ${nickname}`;
        dataChannel.send(JSON.stringify({ type: 'nickname', value: nickname }));
        vibrate(40);
    };

    dataChannel.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'game_over') {
                showThanks(data.score, data.checkpoints);
            }
        } catch (err) {}
    };

    dataChannel.onclose = () => {
        status.textContent = 'DESCONECTADO';
        status.style.color = 'orange';
        if (thanksScreen.style.display === 'none') {
            controllerContainer.style.display = 'none';
            roomSelection.style.display = 'block';
        }
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

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.send(JSON.stringify({ ...offer, roomId: currentRoomId }));
}

function sendInputData(immediate = false) {
    const now = Date.now();
    if (immediate || (now - lastSendTime > SEND_INTERVAL)) {
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify({
                steer: currentInput.steer,
                gas: currentInput.gas,
                brake: currentInput.brake,
                turbo: currentInput.turbo
            }));
            lastSendTime = now;
        }
    }
}

function showThanks(finalScore = 0, checkpoints = 0) {
    controllerContainer.style.display = 'none';
    roomSelection.style.display = 'none';
    thanksScreen.style.display = 'block';

    if (thanksResultText) {
        thanksResultText.innerHTML = `
            ¡Gran carrera, <span style="color: var(--primary);">${nickname}</span>!<br><br>
            PUNTAJE FINAL:<br>
            <span style="font-size: 38px; color: white; font-weight: 900; display: block; margin: 10px 0; font-family: 'Press Start 2P', monospace;">${finalScore.toString().padStart(5, '0')}</span>
            CHECKPOINTS SUPERADOS: <strong style="color: var(--accent);">${checkpoints}</strong>
        `;
    }

    status.textContent = 'CARRERA COMPLETADA';
    vibrate([40, 60, 40]);

    if (dataChannel) dataChannel.close();
    if (pc) pc.close();
    if (socket) socket.close();
}

// Control del Volante / Trackpad de Dirección
let trackpadRect = null;
let activeTrackpadPointer = null;

function updateTrackpadRect() {
    if (steerTrackpad) trackpadRect = steerTrackpad.getBoundingClientRect();
}
window.addEventListener('resize', updateTrackpadRect);
setTimeout(updateTrackpadRect, 200);

if (steerTrackpad) {
    steerTrackpad.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        activeTrackpadPointer = e.pointerId;
        try { steerTrackpad.setPointerCapture(e.pointerId); } catch (err) {}
        updateTrackpadRect();
        handleTrackpadMove(e.clientX);
    });

    steerTrackpad.addEventListener('pointermove', (e) => {
        if (activeTrackpadPointer === e.pointerId) {
            handleTrackpadMove(e.clientX);
        }
    });

    const resetSteer = (e) => {
        if (activeTrackpadPointer === e.pointerId) {
            activeTrackpadPointer = null;
            currentInput.steer = 0;
            if (steerIndicator) steerIndicator.style.left = '50%';
            sendInputData(true);
        }
    };

    steerTrackpad.addEventListener('pointerup', resetSteer);
    steerTrackpad.addEventListener('pointercancel', resetSteer);
}

function handleTrackpadMove(clientX) {
    if (!trackpadRect) return;
    const relX = clientX - trackpadRect.left;
    const norm = Math.max(0, Math.min(1, relX / trackpadRect.width));
    let steerVal = (norm - 0.5) * 2; // -1 a +1

    // Zona muerta central
    if (Math.abs(steerVal) < 0.08) steerVal = 0;

    currentInput.steer = steerVal;
    if (steerIndicator) {
        steerIndicator.style.left = `${norm * 100}%`;
    }
    sendInputData();
}

// Botones Digitales con Captura de Puntero (evita soltado accidental)
function bindButton(element, onDown, onUp, vibrateMs = 15) {
    if (!element) return;
    let isDown = false;

    const start = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isDown) return;
        isDown = true;
        try { element.setPointerCapture(e.pointerId); } catch (err) {}
        element.classList.add('active');
        vibrate(vibrateMs);
        onDown();
        sendInputData(true);
    };

    const stop = (e) => {
        if (!isDown) return;
        isDown = false;
        element.classList.remove('active');
        onUp();
        sendInputData(true);
    };

    element.addEventListener('pointerdown', start);
    element.addEventListener('pointerup', stop);
    element.addEventListener('pointercancel', stop);
}

// Flecha Izquierda
bindButton(btnLeft, () => {
    currentInput.steer = -1.0;
    if (steerIndicator) steerIndicator.style.left = '15%';
}, () => {
    if (currentInput.steer < 0) {
        currentInput.steer = 0;
        if (steerIndicator) steerIndicator.style.left = '50%';
    }
}, 20);

// Flecha Derecha
bindButton(btnRight, () => {
    currentInput.steer = 1.0;
    if (steerIndicator) steerIndicator.style.left = '85%';
}, () => {
    if (currentInput.steer > 0) {
        currentInput.steer = 0;
        if (steerIndicator) steerIndicator.style.left = '50%';
    }
}, 20);

// Turbo
bindButton(btnTurbo, () => {
    currentInput.turbo = true;
}, () => {
    currentInput.turbo = false;
}, 30);

// Pedal de Gas (Acelerador) - Con captura permanente mientras se presiona
bindButton(btnGas, () => {
    currentInput.gas = true;
}, () => {
    currentInput.gas = false;
}, 25);

// Pedal de Freno
bindButton(btnBrake, () => {
    currentInput.brake = true;
}, () => {
    currentInput.brake = false;
}, 25);

// Bucle de Envío Continuo (~60fps)
setInterval(() => {
    if (dataChannel && dataChannel.readyState === 'open') {
        sendInputData();
    }
}, SEND_INTERVAL);
