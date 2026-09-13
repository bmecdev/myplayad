const stick = document.getElementById('stick');
const container = document.getElementById('joystick-container');
const status = document.getElementById('status');
const roomInput = document.getElementById('room-input');
const nicknameInput = document.getElementById('nickname-input');
const connectBtn = document.getElementById('connect-btn');
const roomSelection = document.getElementById('room-selection');
const thanksScreen = document.getElementById('thanks-screen');

// Bloquear gestos del navegador en el joystick
container.style.touchAction = 'none';
stick.style.touchAction = 'none';

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

// Audio Móvil Sintetizado (Web Audio API para Smartphone)
class MobileSnakeAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.enabled = true;
    }

    init() {
        if (!this.enabled) return;
        if (this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            return;
        }
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
        } catch (e) {}
    }

    play(sound) {
        if (!this.ctx || !this.enabled) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;
        try {
            if (sound === 'eat') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523.25, t);
                osc.frequency.linearRampToValueAtTime(783.99, t + 0.08);
                gain.gain.setValueAtTime(0.28, t);
                gain.gain.linearRampToValueAtTime(0.0001, t + 0.08);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.08);
            } else if (sound === 'turn') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(420, t);
                gain.gain.setValueAtTime(0.18, t);
                gain.gain.linearRampToValueAtTime(0.0001, t + 0.03);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.03);
            } else if (sound === 'die') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(260, t);
                osc.frequency.linearRampToValueAtTime(55, t + 0.35);
                gain.gain.setValueAtTime(0.32, t);
                gain.gain.linearRampToValueAtTime(0.0001, t + 0.35);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.35);
            } else if (sound === 'start') {
                [392, 523.25, 659.25].forEach((f, i) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(f, t + i * 0.08);
                    gain.gain.setValueAtTime(0.22, t + i * 0.08);
                    gain.gain.linearRampToValueAtTime(0.0001, t + i * 0.08 + 0.12);
                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start(t + i * 0.08);
                    osc.stop(t + i * 0.08 + 0.13);
                });
            } else if (sound === 'gameover') {
                [392, 329.63, 261.63, 196].forEach((f, i) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(f, t + i * 0.14);
                    gain.gain.setValueAtTime(0.24, t + i * 0.14);
                    gain.gain.linearRampToValueAtTime(0.0001, t + i * 0.14 + 0.18);
                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start(t + i * 0.14);
                    osc.stop(t + i * 0.14 + 0.2);
                });
            }
        } catch (e) {}
    }
}
const mobileAudio = new MobileSnakeAudio();
['touchstart', 'pointerdown', 'click'].forEach(evt => {
    window.addEventListener(evt, () => mobileAudio.init(), { passive: true });
});

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
    status.style.color = '#666'; // Resetear color
    
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
            } else if (data.type === 'sfx') {
                mobileAudio.play(data.sound);
            }
        } catch (err) {}
    };

    dataChannel.onclose = () => {
        console.warn('DataChannel cerrado');
        status.textContent = 'Desconectado del juego';
        status.style.color = 'orange';
        if (thanksScreen.style.display === 'none') {
            container.style.display = 'none';
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

    pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'disconnected' || state === 'failed') {
            console.warn(`Conexión WebRTC: ${state}`);
            status.textContent = 'Desconectado del juego';
            status.style.color = 'orange';
            if (thanksScreen.style.display === 'none') {
                container.style.display = 'none';
                roomSelection.style.display = 'block';
            }
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

// Lógica del Joystick OPTIMIZADA
let isDragging = false;
let startX, startY;
const limit = 50;
let lastSendTime = 0;
const SEND_INTERVAL = 16; // ~60fps

container.addEventListener('pointerdown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    container.setPointerCapture(e.pointerId);
    mobileAudio.play('turn');
});

window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    
    let dx = e.clientX - startX;
    let dy = e.clientY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > limit) {
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * limit;
        dy = Math.sin(angle) * limit;
    }
    
    stick.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    
    const now = Date.now();
    if (now - lastSendTime > SEND_INTERVAL) {
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify({ x: dx / limit, y: dy / limit }));
            lastSendTime = now;
        }
    }
});

window.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    stick.style.transform = `translate3d(0px, 0px, 0)`;
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({ x: 0, y: 0 }));
    }
});
