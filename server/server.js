const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 58080 });

console.log('Servidor de señalización iniciado en el puerto 58080');

const rooms = new Map();

function noop() {}

function heartbeat() {
    this.isAlive = true;
}

wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    let currentRoomId = null;
    let currentRole = null;
    let currentPlayerId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (!data || typeof data !== 'object') return;

            switch (data.type) {
                case 'register':
                    const { roomId, role, maxPlayers } = data;
                    if (!roomId || !role) return;

                    if (!rooms.has(roomId)) {
                        rooms.set(roomId, { 
                            host: null, 
                            controllers: new Map(),
                            maxPlayers: maxPlayers || 1,
                            nextPlayerId: 1
                        });
                    }

                    const room = rooms.get(roomId);

                    if (role === 'host') {
                        if (room.host && room.host !== ws) {
                            ws.send(JSON.stringify({ type: 'error', message: 'SALA_YA_TIENE_HOST' }));
                            return;
                        }
                        room.host = ws;
                        room.maxPlayers = maxPlayers || room.maxPlayers;
                        currentRoomId = roomId;
                        currentRole = 'host';
                        console.log(`Host registrado en sala: ${roomId} (Capacidad: ${room.maxPlayers})`);
                        
                        const connectedPlayers = Array.from(room.controllers.keys());
                        ws.send(JSON.stringify({ 
                            type: 'room_status', 
                            players: connectedPlayers,
                            maxPlayers: room.maxPlayers
                        }));
                    } else if (role === 'controller') {
                        if (room.controllers.size >= room.maxPlayers && !room.controllers.has(currentPlayerId)) {
                            console.log(`Conexión rechazada: Sala ${roomId} llena.`);
                            ws.send(JSON.stringify({ type: 'error', message: 'SALA_LLENA' }));
                            ws.close();
                            return;
                        }

                        if (!currentPlayerId) {
                            currentPlayerId = room.nextPlayerId++;
                        }
                        
                        room.controllers.set(currentPlayerId, ws);
                        currentRoomId = roomId;
                        currentRole = 'controller';
                        
                        console.log(`Controlador ${currentPlayerId} registrado en sala: ${roomId}`);
                        
                        ws.send(JSON.stringify({ type: 'player_assigned', playerId: currentPlayerId }));
                        
                        if (room.host) {
                            room.host.send(JSON.stringify({ 
                                type: 'controller_connected', 
                                playerId: currentPlayerId 
                            }));
                            ws.send(JSON.stringify({ type: 'host_ready' }));
                        }
                    }
                    break;

                case 'offer':
                case 'answer':
                case 'candidate':
                    if (!currentRoomId || !rooms.has(currentRoomId)) return;
                    const targetRoom = rooms.get(currentRoomId);
                    
                    if (currentRole === 'host') {
                        const targetId = data.playerId;
                        const targetController = targetRoom.controllers.get(targetId);
                        if (targetController) {
                            targetController.send(JSON.stringify(data));
                        }
                    } else if (currentRole === 'controller') {
                        if (targetRoom.host) {
                            targetRoom.host.send(JSON.stringify({
                                ...data,
                                playerId: currentPlayerId
                            }));
                        }
                    }
                    break;
            }
        } catch (e) {
            console.error('Error procesando mensaje:', e.message);
        }
    });

    ws.on('close', () => {
        if (currentRoomId && rooms.has(currentRoomId)) {
            const room = rooms.get(currentRoomId);
            if (currentRole === 'host') {
                room.host = null;
                console.log(`Host salió de la sala ${currentRoomId}`);
            } else if (currentRole === 'controller') {
                room.controllers.delete(currentPlayerId);
                console.log(`Controlador ${currentPlayerId} salió de la sala ${currentRoomId}`);
                if (room.host) {
                    room.host.send(JSON.stringify({ 
                        type: 'controller_disconnected', 
                        playerId: currentPlayerId 
                    }));
                }
            }
            
            if (!room.host && room.controllers.size === 0) {
                rooms.delete(currentRoomId);
                console.log(`Sala ${currentRoomId} eliminada.`);
            }
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket error en conexión:', err.message);
    });
});

const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping(noop);
    });
}, 20000);

wss.on('close', () => {
    clearInterval(interval);
});
