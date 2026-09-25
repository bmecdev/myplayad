# MyPlayAd - Interactive Digital Signage & Retro Games

Este repositorio contiene el código fuente completo del sistema MyPlayAd, una plataforma de publicidad interactiva y cartelería digital (Digital Signage) que combina reproducción de videos con minijuegos retro (Snake, Arkanoid, Invaders) controlados en tiempo real desde los teléfonos de los usuarios.

## Arquitectura del Proyecto

El proyecto está dividido en tres componentes principales:

1. **`portal/` (Next.js):** El panel de administración web y la API pública. Maneja la programación de campañas, gestión de pantallas y proporciona los endpoints que consumen las pantallas.
2. **`screen/` (Node.js + HTML/JS):** El servidor local y frontend que corre físicamente en cada pantalla (ej. Raspberry Pi). Sincroniza y almacena en caché los videos localmente para evitar cortes de internet, y reproduce el bucle publicitario.
3. **`games/` (Static HTML/JS):** Los juegos retro interactivos. Tienen dos vistas: la del juego (que carga la pantalla) y el control (que carga el usuario en su móvil escaneando un código QR).

---

## 🚀 Flujo de Ramas y CI/CD (Staging -> Producción)

El repositorio cuenta con un ciclo de despliegue continuo (CI/CD) automatizado con GitHub Actions sobre el VPS de Hostinger, separando estrictamente el entorno de pruebas (**Staging**) del entorno real (**Producción**).

### 🌐 Entornos y Dominios

| Entorno | Rama Git | Desencadenador CI/CD | Directorio VPS | URLs de Acceso |
| :--- | :--- | :--- | :--- | :--- |
| **Staging** (Pruebas) | `game/**`, `staging` | Push a la rama (`deploy-staging.yml`) | `/var/www/myplayad-staging/` | 🖥️ Pantallas: `https://dev.myplayad.com/<slug>/`<br>📱 Controles: `https://dev-controllers.myplayad.com/<slug>/` |
| **Producción** | `main` | Push o Merge a `main` (`deploy.yml`) | `/var/www/myplayad/` (frontend)<br>`/opt/myplayad/` (backend) | 🖥️ Pantallas: `https://myplayad.com`<br>📱 Controles: `https://controllers.myplayad.com/<slug>/` |

### 🔄 Diagrama del Ciclo de Vida

```mermaid
flowchart TD
    A[1. Crear rama game/slug desde main] --> B[2. Desarrollar minijuego o cambios]
    B --> C[3. git push origin game/slug]
    C --> D[4. GitHub Actions: Deploy Staging to VPS]
    D --> E[5. Pruebas reales en móvil via dev-controllers y dev.myplayad.com]
    E --> F{¿Funciona 100% OK?}
    F -- No: Ajustar código --> B
    F -- Sí: Aprobado --> G[6. Crear Pull Request hacia main]
    G --> H[7. Revisión y Merge del PR]
    H --> I[8. GitHub Actions: Deploy to VPS Producción]
    I --> J[9. En vivo para usuarios finales]
```

### 📋 Guía Paso a Paso para Nuevos Juegos

> [!IMPORTANT]
> **PROHIBIDO desarrollar o commitear juegos directamente en `main`.**
> Commitear en `main` dispara el despliegue directo a los kioscos de producción. Sigue siempre este flujo:

1. **Crear y pasarse a la rama aislada del juego**:
   ```bash
   # Opción recomendada (script automatizado):
   ./.agents/skills/game/scripts/start-game-branch.sh <slug>

   # Opción manual:
   git checkout main && git pull origin main
   git checkout -b game/<slug>
   ```

2. **Desarrollar y subir a Staging**:
   ```bash
   git add games/<slug>/
   git commit -m "feat(game): implementar minijuego <slug>"
   git push origin game/<slug>
   ```
   *El workflow `.github/workflows/deploy-staging.yml` desplegará los cambios en ~20 segundos en `/var/www/myplayad-staging/`.*

3. **Probar en Dispositivos Reales**:
   - Abre la pantalla en el navegador: `https://dev.myplayad.com/<slug>/`
   - Escanea el código QR con tu móvil: abrirá `https://dev-controllers.myplayad.com/<slug>/?room=XXXX`
   - Prueba WebRTC, latencia, respuesta táctil, vidas, ranking y reinicio.

4. **Crear Pull Request (PR)**:
   Una vez probado y validado:
   ```bash
   # Opción recomendada:
   ./.agents/skills/game/scripts/promote-to-main.sh <slug>

   # Opción manual:
   gh pr create --base main --head game/<slug> \
       --title "feat(game): agregar minijuego <slug>" \
       --body "Minijuego probado y verificado en Staging."
   ```

5. **Merge y Despliegue en Producción**:
   - Aprueba y mergea el PR (desde la interfaz de GitHub o mediante CLI):
     ```bash
     gh pr merge <PR_URL> --merge --delete-branch
     ```
   - Al mergear en `main`, el workflow `.github/workflows/deploy.yml` lo publicará automáticamente en producción.
   - Sincroniza tu entorno local:
     ```bash
     git checkout main && git pull origin main
     ```

---

## 🛠️ Cómo Correr el Proyecto Localmente (Desarrollo)

Para probar el proyecto en tu computadora, necesitas tener instalado **Node.js** y **Git**. 

### 1. Iniciar el Portal (Backend/Admin)
El portal provee la API necesaria para que las pantallas sepan qué reproducir.

```bash
cd portal
npm install
npm run dev
```
El portal estará corriendo en `http://localhost:3000`.

### 2. Iniciar el Servidor de Pantalla (Screen Server)
Este es el servidor que corre en la máquina física conectada al televisor (o en tu computador para pruebas). Se encarga de descargar los videos y levantar el reproductor.

Abre una **nueva pestaña** en tu terminal:

```bash
cd screen
npm install

# Inicia el servidor pasando el ID de la pantalla y la URL base de los videos
SCREEN_ID=bc502bba-859c-461c-a795-f6e4bf2d4931 REMOTE_VIDEO_SERVER_URL=https://videos.myplayad.com node server.js
```
*Nota: Reemplaza el `SCREEN_ID` por un ID válido de tu base de datos si estás probando una pantalla específica.*

El servidor local de pantalla estará corriendo en `http://localhost:8090`.

### 3. Probar la Pantalla
Abre tu navegador (Chrome recomendado) e ingresa a:
👉 `http://localhost:8090`

Verás la interfaz de la pantalla principal reproduciendo videos y cambiando a juegos según la programación.

---

## 🎮 Pruebas de Juegos y Controladores

Cuando la pantalla muestre un juego (ej. Snake), aparecerá un **Código QR**. 
1. Escanea el código QR con tu teléfono o copia el enlace.
2. El enlace abrirá la vista del controlador (Joystick/Trackpad) del juego en tu navegador web móvil.
3. Ingresa tu Nickname y la comunicación en tiempo real (vía WebSockets/MQTT) conectará tu teléfono con el juego en la pantalla.

---

## 🍓 Configuración para Raspberry Pi (Producción)

Para desplegar este sistema en un televisor real usando una Raspberry Pi, debes configurar el dispositivo en **Modo Kiosco** para que inicie automáticamente el servidor Node y el navegador Chromium a pantalla completa sin intervención humana.

### Requisitos Previos en la Raspberry Pi
1. Instalar Raspberry Pi OS (versión con escritorio ligero).
2. Instalar Node.js (versión 18+).
3. Instalar PM2 para manejar los procesos en segundo plano:
   ```bash
   sudo npm install -g pm2
   ```

### 1. Clonar y Configurar
Clona este repositorio en la Raspberry Pi e instala las dependencias de la carpeta `/screen`.

### 2. Iniciar el Servidor con PM2
Queremos que el `server.js` corra siempre de fondo y se reinicie si falla o si se reinicia la Raspberry.

```bash
cd /ruta/a/myPlayAd/screen

# Crear un archivo de entorno o pasar las variables directamente
pm2 start server.js --name "myplayad-screen" --env SCREEN_ID="TU_SCREEN_ID" --env REMOTE_VIDEO_SERVER_URL="https://videos.myplayad.com"

# Guardar la configuración para que arranque al inicio del sistema
pm2 save
pm2 startup
```

### 3. Configurar Chromium en Modo Kiosco (Autostart)
Necesitamos que Chromium se abra automáticamente en pantalla completa al encender la Raspberry y apunte a `localhost:8090`.

Edita el archivo de autostart de LXDE:
```bash
sudo nano /etc/xdg/lxsession/LXDE-pi/autostart
```

Agrega o reemplaza el contenido por lo siguiente:
```text
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xset s off
@xset -dpms
@xset s noblank
@chromium-browser --noerrdialogs --disable-infobars --kiosk --autoplay-policy=no-user-gesture-required http://localhost:8090
```
* **Explicación de las flags:**
  * `@xset ...`: Desactiva el protector de pantalla y el apagado del monitor.
  * `--kiosk`: Fuerza a Chromium a abrirse en pantalla completa, sin pestañas ni botones.
  * `--autoplay-policy=no-user-gesture-required`: **CRÍTICO**. Permite que Chromium reproduzca los videos automáticamente sin requerir que un usuario haga clic en la pantalla, evitando los bloqueos de seguridad de auto-reproducción.

### 4. Ocultar el cursor del mouse (Opcional pero recomendado)
Instala `unclutter` para ocultar el cursor del mouse cuando no se mueve:
```bash
sudo apt-get install unclutter
```
Añade `@unclutter -idle 0.1 -root` al archivo `autostart` mencionado en el paso anterior.

---

## 🔒 Notas sobre CORS y Seguridad (Mixed Content)
El sistema utiliza una inyección binaria de videos vía `postMessage` para evadir bloqueos de seguridad en navegadores modernos (Chrome Private Network Access y Safari Mixed Content). Esto asegura que los iframes de los juegos que corren bajo `https://` puedan acceder fluidamente a los videos descargados en la red local (`http://localhost`) sin interrupciones. No se requieren configuraciones SSL/TLS en la Raspberry Pi.
