# Code Review Report - Gameplay & UX Deep Dive

Ticket: SCRUM-131  
Fecha: 2026-04-11  
Foco: Jugabilidad, Movimiento y Robustez

---

## 📋 Resumen de Jugabilidad

Quality Score: **90 / 100**

La implementación actual es funcional y fluida, pero se han detectado comportamientos inesperados ("edge cases") al interactuar de forma agresiva con el mando o al perder vidas.

---

## 🕹️ Análisis de Movimiento y Joystick

### 1. El Joystick "Loco" (Movimiento Frenético)
**Hallazgo:** Se ha detectado un riesgo de colisión de 180 grados (suicidio instantáneo) si se cambia de dirección muy rápido.
- **Problema:** `handleJoystickInput` actualiza `GameState.dx/dy` inmediatamente cada vez que llega un mensaje del móvil. Si un jugador mueve el joystick rápidamente (ej. de Izquierda a Arriba y luego a Derecha) en un intervalo menor a 100ms (un "tick" del juego), la serpiente puede terminar con una dirección opuesta a la que tenía en el frame anterior antes de que se ejecute el siguiente movimiento.
- **Impacto:** La serpiente colisiona consigo misma accidentalmente.
- **Recomendación:** Implementar una "dirección pendiente" que solo se aplique una vez por cada tick de movimiento en `moveSnake`.

### 2. Joystick Presionado hacia un Borde
**Hallazgo:** El comportamiento ante colisiones es correcto según las reglas, pero puede ser frustrante.
- **Comportamiento:** Si el jugador mantiene el joystick hacia una pared, la serpiente choca, pierde una vida, y tras 1 segundo de "respawn", vuelve a aparecer en el centro.
- **Vidas y Reinicio:** Pierde una vida (de 3). Si tiene vidas restantes, **reinicia su posición en el centro**, pero mantiene el puntaje actual. Si llega a 0 vidas, se ejecuta `gameOver` y vuelve a la pantalla de QR.
- **Recomendación:** Añadir una pequeña inmunidad o parpadeo visual tras el respawn para que el jugador tenga tiempo de soltar el joystick si estaba "pegado" al borde.

---

## 🚨 Manejo de Fallos y Errores

### 1. Interrupción de la Lógica de "Respawn"
**Hallazgo CRÍTICO:** Se puede reiniciar el juego completo accidentalmente al perder una vida.
- **Problema:** En `loseLife()`, el juego se detiene (`gameRunning = false`) durante 1 segundo. Si el jugador mueve el joystick durante ese segundo, `handleJoystickInput` detecta que el juego no está corriendo y llama a `startGame()`.
- **Efecto:** `startGame()` resetea las vidas a 3 y el score a 0, **invalidando la partida actual** antes de que termine el segundo de espera.
- **Recomendación:** Validar la bandera `isRespawning` en `handleJoystickInput` para ignorar entradas de inicio de juego durante la transición de pérdida de vida.

### 2. Desconexión en plena partida
- **Comportamiento:** Si el socket se cierra, `handleControllerStatus` pone `gameRunning = false` y muestra el overlay de espera. Esto es correcto y previene que la serpiente muera sola.

---

## 📋 Tabla de Alineación Funcional (Escenarios Específicos)

| Escenario | Comportamiento Actual | ¿Es correcto? | Observación |
|-----------|-----------------------|---------------|-------------|
| Movimiento Rápido (180°) | Puede girar sobre sí misma | ❌ No | Riesgo de suicidio por latencia de entrada. |
| Choque con borde | Pierde 1 vida y reaparece | ✅ Sí | Sigue las reglas de negocio. |
| Mantener Joystick | Sigue moviéndose tras respawn | ⚠️ Parcial | Puede causar muertes sucesivas si no se reacciona rápido. |
| Mover joystick en pausa | Reinicia todo el juego | ❌ No | **Bug detectado.** |

---

## Final Verdict

⚠ **Requiere correcciones lógicas en el manejo de estados.**  
Aunque visualmente está perfecto, la lógica de control de flujo tiene vulnerabilidades que afectan la experiencia del usuario (UX) en situaciones de estrés o tras perder una vida.
