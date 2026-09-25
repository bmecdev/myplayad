// Galaga Mobile Controller - WebRTC P2P DataChannel & Haptics

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
let nickname = 'Pilot';

// Configuración ICE dinámica con TURN
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

// ==========================================
// 🔊 Audio Móvil Sintetizado (Web Audio API)
// ==========================================
class MobileGalagaAudio {
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
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();
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
            if (sound === 'laser') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(1400, t);
                osc.frequency.exponentialRampToValueAtTime(260, t + 0.08);
                gain.gain.setValueAtTime(0.24, t);
                gain.gain.linearRampToValueAtTime(0.0001, t + 0.08);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.08);
            } else if (sound === 'alienKilled') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, t);
                osc.frequency.linearRampToValueAtTime(30, t + 0.2);
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.linearRampToValueAtTime(0.0001, t + 0.2);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.2);
            } else if (sound === 'playerExplode') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(140, t);
                osc.frequency.linearRampToValueAtTime(20, t + 0.4);
                gain.gain.setValueAtTime(0.35, t);
                gain.gain.linearRampToValueAtTime(0.0001, t + 0.4);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.4);
            } else if (sound === 'waveClear') {
                [440, 554.37, 659.25, 880].forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(freq, t + idx * 0.08);
                    gain.gain.setValueAtTime(0.22, t + idx * 0.08);
                    gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.08 + 0.12);
                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start(t + idx * 0.08);
                    osc.stop(t + idx * 0.08 + 0.13);
                });
            } else if (sound === 'gameover') {
                [440, 392, 349.23, 293.66].forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, t + idx * 0.14);
                    gain.gain.setValueAtTime(0.25, t + idx * 0.14);
                    gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.14 + 0.18);
                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start(t + idx * 0.14);
                    osc.stop(t + idx * 0.14 + 0.2);
                });
            }
        } catch (e) {}
    }
}
const mobileAudio = new MobileGalagaAudio();
['touchstart', 'pointerdown', 'click'].forEach(evt => {
    window.addEventListener(evt, () => mobileAudio.init(), { passive: true });
});

let lastSendTime = 0;
const SEND_INTERVAL = 16; // ~60fps

// ==========================================
// 🔗 Inicialización y Parámetros URL
// ==========================================
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
        roomInput.value = roomFromUrl.toUpperCase();
        nicknameInput.focus();
        status.textContent = 'INGRESA TU NICKNAME';
        status.style.color = '#ffb703';
    } else {
        status.textContent = 'ESCANEA EL CÓDIGO QR';
        status.style.color = '#ff4d6d';
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
    nickname = nicknameInput.value.trim() || 'Pilot';
    if (roomId) {
        currentRoomId = roomId;
        connectSignaling(roomId);
    } else {
        alert('Por favor, escanea el código QR de la pantalla.');
    }
});

nicknameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connectBtn.click();
});

// ==========================================
// 📡 Señalización WebRTC
// ==========================================
function connectSignaling(roomId) {
    if (typeof CONFIG === 'undefined') {
        console.error('ERR: config.js no cargó');
        return;
    }

    const serverIp = CONFIG.SIGNALING_SERVER_IP || window.location.hostname;
    const serverPort = CONFIG.SIGNALING_SERVER_PORT || '8080';
    const signalingUrl = CONFIG.SIGNALING_SERVER_URL || `${serverIp}:${serverPort}`;
    const wsUrl = `wss://${signalingUrl}`;

    status.textContent = `Conectando...`;
    status.style.color = '#7fae94';

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
                        status.style.color = '#ffb703';
                        alert('Esta partida ya tiene un piloto activo.');
                    }
                    return;
                }

                if (data.type === 'host_ready') {
                    startWebRTC();
                } else if (data.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                    status.textContent = 'CONECTADO AL JUEGO';
                    status.style.color = '#3dff8a';
                    roomSelection.style.display = 'none';
                    container.style.display = 'flex';
                } else if (data.type === 'candidate') {
                    if (pc) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                        } catch (err) {
                            console.warn('Error candidate:', err);
                        }
                    }
                }
            } catch (e) {
                console.error('Error JSON en socket:', e);
            }
        };

        socket.onerror = () => {
            status.textContent = 'ERROR DE CONEXIÓN';
            status.style.color = '#ff4d6d';
        };

        socket.onclose = () => {
            if (thanksScreen.style.display === 'none') {
                roomSelection.style.display = 'block';
                container.style.display = 'none';
            }
        };
    } catch (e) {
        console.error('Error en WebSocket:', e);
    }
}

async function startWebRTC() {
    const rtcConfig = getIceConfig();
    pc = new RTCPeerConnection(rtcConfig);

    // Crear DataChannel bidireccional
    dataChannel = pc.createDataChannel('control', { ordered: false });

    dataChannel.onopen = () => {
        status.textContent = 'LISTO PARA DESPEGAR';
        status.style.color = '#3dff8a';
        roomSelection.style.display = 'none';
        container.style.display = 'flex';

        // Enviar Join con nickname
        dataChannel.send(JSON.stringify({ type: 'join', nickname: nickname, value: nickname }));
    };

    dataChannel.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'game_over') {
                mobileAudio.play('gameover');
                if (navigator.vibrate) navigator.vibrate([100, 50, 150]);
                showThanks(data.score || 0);
            } else if (data.type === 'sfx') {
                mobileAudio.play(data.sound);
                if (data.sound === 'playerExplode' && navigator.vibrate) {
                    navigator.vibrate([40, 30, 40]);
                }
            }
        } catch (err) {}
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
        const state = pc.connectionState;
        if (state === 'disconnected' || state === 'failed') {
            status.textContent = 'DESCONECTADO DE LA PANTALLA';
            status.style.color = '#ffb703';
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

    if (thanksTitle) thanksTitle.textContent = '¡FIN DE LA MISIÓN!';
    if (thanksText) {
        thanksText.innerHTML = `¡Buen vuelo, Piloto <span style="color: var(--primary);">${nickname.toUpperCase()}</span>!<br>Puntuación Galáctica:<br><span style="font-size: 46px; color: var(--accent); font-weight: 900; display: block; margin: 10px 0;">${finalScore.toString().padStart(3, '0')}</span>`;
    }

    if (thanksSmall) {
        thanksSmall.style.display = 'block';
        thanksSmall.style.marginTop = '20px';
        thanksSmall.style.padding = '12px';
        thanksSmall.style.borderTop = '1px solid #333';
        thanksSmall.innerHTML = `<span style="font-size: 13px; color: #aaa; line-height: 1.5; font-style: italic;">Para una revancha,<br>vuelve a <strong>escanear el código QR</strong><br>en la pantalla arcade.</span>`;
    }

    status.textContent = 'Misión concluida';

    if (dataChannel) dataChannel.close();
    if (pc) pc.close();
    if (socket) socket.close();
}

// ==========================================
// 🕹️ Trackpad & Botón de Disparo
// ==========================================
const trackpadContainer = document.getElementById('trackpad-container');
const trackpadIndicator = document.getElementById('trackpad-indicator');

let trackpadRect = null;
let activePointers = new Map();
let currentMovement = { x: 0, y: 0 };

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

trackpadContainer.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    activePointers.set(e.pointerId, { type: 'trackpad' });
    updateTrackpadDimensions();
});

trackpadContainer.addEventListener('pointermove', (e) => {
    if (!activePointers.has(e.pointerId) || !trackpadRect) return;

    const touchX = e.clientX - trackpadRect.left;
    let normalizedPosition = touchX / trackpadRect.width;
    normalizedPosition = Math.max(0, Math.min(1, normalizedPosition));

    let normalizedX = (normalizedPosition - 0.5) * 2;
    const deadZone = 0.08;
    if (Math.abs(normalizedX) < deadZone) normalizedX = 0;

    currentMovement.x = normalizedX;

    const indicatorPct = normalizedPosition * 100;
    trackpadIndicator.style.left = indicatorPct + '%';

    const intensity = Math.abs(normalizedX);
    trackpadIndicator.style.boxShadow = `0 6px ${16 + intensity * 8}px rgba(61, 255, 138, ${0.4 + intensity * 0.4})`;

    sendMovementData();
});

trackpadContainer.addEventListener('pointerup', (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.delete(e.pointerId);

    if (activePointers.size === 0) {
        currentMovement.x = 0;
        trackpadIndicator.style.left = '50%';
        trackpadIndicator.style.boxShadow = '0 6px 16px rgba(61, 255, 138, 0.4)';
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify({ x: 0, y: 0 }));
        }
    }
});

trackpadContainer.addEventListener('pointercancel', (e) => {
    activePointers.delete(e.pointerId);
});

// Botón de Disparo
if (fireBtn) {
    fireBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        mobileAudio.play('laser');
        if (navigator.vibrate) navigator.vibrate(15);
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify({ fire: true }));
        }
    });
}
