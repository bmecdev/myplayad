# Code Review Report

Ticket: SCRUM-131  
Fecha: 2026-04-11

---

## 📋 Input Artifacts (Trazabilidad)

Esta revisión de código se realizó con base en los siguientes artefactos:

### Historia de Usuario
- **Fuente**: Local
- **Archivo**: `proposals/approved/SCRUM-131-control-webrtc-snake-20260411130632.md`
- **Jira Issue**: SCRUM-131
- **Título**: Sistema Integral de Juego Snake, Publicidad y Control Remoto WebRTC (Game, Control, Server)
- **Criterios de Aceptación**: 4 criterios principales definidos.

### Casos de Prueba
- **Fuente**: Local
- **Archivos**: 
  - `proposals/approved/SCRUM-131-test-cases-20260411131157.md`
- **Total de Test Cases**: 5
- **Escenarios cubiertos**: Registro, Conexión WebRTC, Control Joystick, Ciclo de Vida, Ad Player.

---

## Summary

Quality Score: **82 / 100**

El código implementa correctamente la arquitectura WebRTC P2P solicitada. La lógica del juego es sólida y sigue la estética retro. Se identificaron riesgos menores en seguridad (IPs hardcodeadas) y mantenibilidad (estado global).

---

## Functional Alignment

### Criterios de Aceptación vs Implementación

| Criterio | Implementado | Observaciones |
|----------|--------------|---------------|
| CA-1: Servidor de Señalización | ✅ Completo | Implementado con `ws` en puerto 8080. |
| CA-2: Juego Snake & Ad Player | ✅ Completo | Lógica de juego y videos integrada. |
| CA-3: Mando Virtual Móvil | ✅ Completo | Joystick analógico envía (x, y) vía DataChannel. |
| CA-4: Flujo y Latencia | ✅ Completo | WebRTC asegura baja latencia. |

### Casos de Prueba vs Implementación

| Test Case | Soportado | Observaciones |
|-----------|-----------|---------------|
| TC-001: Registro | ✅ Soportado | El servidor gestiona roles 'host' y 'controller'. |
| TC-002: WebRTC P2P | ✅ Soportado | Implementado flujo Offer/Answer/Candidate. |
| TC-003: Joystick | ✅ Soportado | Envío de coordenadas normalizadas. |
| TC-004: Ciclo de Vida | ✅ Soportado | Vidas, score y Game Over implementados. |
| TC-005: Ad Player | ✅ Soportado | Loop de videos en `video_loop.js`. |

---

## Critical Issues

### CR-001
Archivo: `game/script.js` y `control/script.js`

Problema:
IP del servidor de señalización (`192.168.40.20`) está hardcodeada en el código.

Riesgo:
Falla de conexión en entornos con diferentes configuraciones de red. Dificulta el despliegue.

Recomendación:
Usar `window.location.hostname` o una variable de configuración cargada dinámicamente.

---

## High Priority Issues

### HP-001
Archivo: `server/server.js`

Problema:
Falta de validación de los datos recibidos vía WebSocket (JSON.parse sin try/catch global robusto y validación de esquema).

Riesgo:
Posible DoS o crash del servidor ante mensajes malformados.

Recomendación:
Implementar validación de esquema (ej. Joi o Zod) para los mensajes de señalización.

---

## Medium Issues

### MI-001
Archivo: `game/script.js`

Problema:
Uso extensivo de variables globales para el estado del juego (`snake`, `score`, `lives`, etc.).

Riesgo:
Dificulta la testabilidad unitaria y puede causar efectos secundarios inesperados.

Recomendación:
Encapsular el estado en un objeto o clase `GameState`.

---

## Low Priority Improvements

### LI-001
Archivo: `control/script.js`

Problema:
El joystick utiliza eventos de mouse y touch por separado.

Recomendación:
Usar `PointerEvents` para simplificar el manejo de entrada en dispositivos híbridos.

---

## Positive Observations

- Excelente implementación de la estética retro mediante Canvas.
- Uso correcto de WebRTC DataChannel para control de baja latencia.
- Trazabilidad clara entre el código y los requerimientos de negocio.

---

## Recommendations

1. Externalizar la configuración de red (IP/Puerto).
2. Refactorizar el estado del juego hacia un patrón más modular.
3. Mejorar la robustez del servidor de señalización ante errores de parsing.

---

## Final Verdict

✔ Código aceptable con mejoras recomendadas  
⚠ Requiere correcciones (IP Hardcoded) antes de despliegue final.
