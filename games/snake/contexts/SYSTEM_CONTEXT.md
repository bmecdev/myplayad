# SYSTEM_CONTEXT.md - Snake WebRTC Game & Ad Player

Este documento define el contexto funcional y de negocio del sistema **Snake WebRTC Game & Ad Player**, actuando como la fuente única de verdad para el desarrollo, pruebas y análisis del sistema.

---

## 1. Descripción del Sistema
El sistema es una plataforma interactiva que combina un juego clásico de **Snake** (estilo retro) con un **reproductor de publicidad en video**. La característica principal es su capacidad de ser controlado de forma remota mediante un **mando virtual** en dispositivos móviles a través de tecnología **WebRTC**, permitiendo una experiencia de baja latencia ideal para tótems publicitarios o kioscos digitales.

---

## 2. Dominio del Negocio
El sistema opera en el dominio del **Digital Out-of-Home (DOOH)** interactivo. El objetivo es captar la atención de los transeúntes mediante contenido publicitario y ofrecerles una experiencia lúdica que interactúa con la pantalla pública a través de su propio dispositivo móvil.

---

## 3. Actores del Sistema
- **Jugador:** Persona que escanea el código QR y utiliza su móvil como mando para jugar.
- **Espectador:** Persona que observa la pantalla (tótem) y consume tanto el juego como la publicidad.
- **Administrador de Contenido:** Responsable de cargar los videos publicitarios en la carpeta correspondiente.

---

## 4. Funcionalidades Principales
- **Juego Snake:** Lógica completa del juego (movimiento, crecimiento, puntuación).
- **Control Remoto P2P:** Comunicación directa entre el móvil y el juego mediante WebRTC.
- **Reproducción de Video (Ad Player):** Loop continuo de videos en formato vertical.
- **Gestión de Ranking:** Registro local de los 5 mejores puntajes.
- **Emparejamiento por QR:** Generación dinámica de salas y códigos QR para conectar el mando.
- **Interfaz de Espera:** Pantalla de invitación al juego cuando no hay un jugador activo.

---

## 5. Reglas de Negocio
- **Vidas del Jugador:** Cada jugador comienza con 3 vidas.
- **Puntuación:** Cada "comida" recolectada otorga 10 puntos.
- **Dificultad Progresiva:** La velocidad de la serpiente aumenta gradualmente al comer.
- **Condiciones de Game Over:**
    - La serpiente choca contra la pared del marco.
    - La serpiente choca contra su propio cuerpo.
    - El jugador pierde todas sus vidas.
- **Persistencia de Ranking:** El ranking se almacena localmente y solo guarda los 5 puntajes más altos.
- **Ciclo de Publicidad:** Los videos se reproducen secuencialmente en bucle infinito.
- **Desconexión:** Si el mando se desconecta, el juego vuelve al estado de espera.

---

## 6. Estados del Sistema
- **ESPERA:** Muestra el ranking, un video publicitario y un código QR para nuevos jugadores.
- **CONECTANDO:** El jugador ha escaneado el QR y está ingresando su nickname.
- **LISTO:** El mando está vinculado pero el juego no ha iniciado (espera movimiento del joystick).
- **JUGANDO:** El juego está en curso y la serpiente se mueve.
- **GAME OVER:** Se muestra el puntaje final, se actualiza el ranking y se desconecta la sala.

---

## 7. Integraciones Externas
- **Servidor de Señalización:** WebSocket para el intercambio de metadatos WebRTC (SDP/ICE).
- **QR Code API:** Servicio externo para la generación de la imagen del código QR.
- **Servidores STUN:** Utilizados para el descubrimiento de IPs públicas (Google STUN).

---

## 8. Arquitectura del Sistema
- **Componente Juego (Host):** Aplicación web (HTML/JS) que corre en la pantalla principal.
- **Componente Control (Cliente):** Aplicación web móvil para el usuario final.
- **Componente Servidor:** Node.js (WebSocket) que facilita la conexión inicial.
- **Protocolo de Datos:** WebRTC DataChannel para el envío de coordenadas del joystick.

---

## 9. Flujo Principal del Sistema
1. El sistema inicia en modo **ESPERA**.
2. Un usuario escanea el **QR** y abre la interfaz de **CONTROL**.
3. El usuario ingresa su **Nickname** y se establece la conexión **WebRTC**.
4. El usuario mueve el **Joystick** para iniciar la partida.
5. El usuario juega hasta que pierde sus **Vidas**.
6. Se muestra el **Ranking**, se guarda el puntaje y el sistema vuelve a **ESPERA**.

---

## 10. Restricciones del Sistema
- Los videos deben estar en formato `.mp4`.
- El sistema requiere conectividad entre el host y el cliente (vía servidor de señalización).
- El navegador debe soportar la API de WebRTC.
- El almacenamiento del ranking es local al navegador del Host.

---

## 11. Consideraciones Importantes
- La estética del juego debe ser retro (estilo Nokia 1100).
- La latencia es crítica para la jugabilidad; se prioriza WebRTC sobre WebSockets para el control.
- La pantalla está dividida visualmente: arriba el juego, abajo la publicidad.
