# User Story Proposal

Status: DRAFT

## Title
Sistema Integral de Juego Snake, Publicidad y Control Remoto WebRTC (Game, Control, Server)

## User Story

Como Operador de Publicidad Interactiva  
quiero una plataforma web que integre un **Servidor de Señalización**, un **Juego Snake con Ad Player (Host)** y un **Mando Virtual (Cliente)**  
para permitir que los usuarios controlen un juego retro y visualicen publicidad en tótems públicos usando sus dispositivos móviles a través de WebRTC.

## Acceptance Criteria

### Componente 1: Servidor de Señalización (Node.js)
Dado que el servidor está en ejecución (puerto 8080)  
Cuando el Host (Juego) y el Cliente (Mando) se registran con el mismo `roomId`  
Entonces el servidor debe facilitar el intercambio de ofertas/respuestas SDP e ICE Candidates para habilitar la conexión P2P.

### Componente 2: Juego Snake & Ad Player (Host)
Dado que el Host está conectado al servidor de señalización  
Cuando recibe comandos del mando vía WebRTC DataChannel  
Entonces debe actualizar la dirección de la serpiente instantáneamente, gestionar las vidas (3), el puntaje (+10 por comida) y reproducir videos publicitarios en bucle en la sección inferior.

### Componente 3: Mando Virtual Móvil (Cliente)
Dado que el Jugador escanea el código QR generado por el Host  
Cuando ingresa su Nickname y establece la conexión WebRTC  
Entonces el mando debe mostrar un joystick analógico que envíe coordenadas normalizadas (x, y) al juego y recibir una señal de "Game Over" para finalizar la sesión.

### Escenario 4: Flujo Completo y Latencia
Dado que los tres componentes están operativos  
Cuando el jugador mueve el joystick  
Entonces la serpiente debe responder con una latencia mínima (<50ms) y el sistema debe permitir una nueva partida tras el Game Over reiniciando la sala.

## Notes
- **Arquitectura:** Cliente-Servidor para señalización, P2P para datos de control.
- **Tecnologías:** Node.js (ws), HTML5 Canvas, WebRTC (DataChannel).
- **Estética:** Juego retro Nokia 1100 combinado con publicidad vertical.

## Approval

[x] Approved
