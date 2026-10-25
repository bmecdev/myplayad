# Manual de Usuario y Administración del Portal Web — MyPlayAd

---

## 1. Introducción al Portal Administrativo

El **Portal Web de MyPlayAd** es el centro de control unificado desde donde administradores (`SUPER_ADMIN`) y clientes anunciantes (`CLIENT`) gestionan toda su red de pantallas digitales, asignación de spots de video publicitario, planes de suscripción, control de energía masivo y catálogo de minijuegos arcade.

* **URL de Staging (Entorno de Pruebas):** `https://dev-portal.myplayad.com`
* **URL de Producción:** `https://portal.myplayad.com`

---

## 2. Acceso y Autenticación

El acceso al portal está protegido mediante sesiones cifradas con tokens HMAC-SHA256 (`myplayad_session`).

![Pantalla de Login del Portal MyPlayAd](img/01-login.png)

### Pasos para Iniciar Sesión:
1. Ingresa a la URL del portal en cualquier navegador moderno.
2. Escribe tu **Nombre de usuario** y **Contraseña**.
3. Haz clic en **Ingresar al Panel**.
4. El sistema validará tus credenciales y te redirigirá automáticamente a la vista correspondiente según tu rol:
   * **Super Admin:** Acceso completo a pantallas globales, clientes, planes, biblioteca de videos y métricas de red.
   * **Cliente Anunciante:** Acceso enfocado a sus pantallas asignadas, carga de sus videos publicitarios y consulta del estado de rotación de su plan contratado.

---

## 3. Módulo de Pantallas (`/screens`)

El módulo de pantallas es el corazón operativo del sistema, permitiendo monitorear y controlar en tiempo real el parque de dispositivos físicos desplegados en puntos de venta.

![Dashboard de Gestión de Pantallas](img/02-dashboard-screens.png)

### Funcionalidades Principales:
* **Métricas Globales:** Visualiza de un vistazo el total de pantallas registradas, pantallas encendidas, pantallas apagadas y tasa de disponibilidad.
* **Control Remoto Masivo HDMI-CEC:**
  * **Encender Todas:** Envía una orden MQTT `POWER_ON` a todas las pantallas activas, encendiendo físicamente los televisores comerciales conectados vía cable HDMI.
  * **Apagar Todas:** Envía una orden MQTT `POWER_OFF` para apagar masivamente los monitores al cierre comercial, ahorrando energía sin desconectar el sistema operativo.
* **Estado de Conexión en Tiempo Real:** Cada tarjeta de pantalla indica si el reproductor está online u offline, su dirección IP local, resolución actual y última hora de sincronización.
* **Indicador de Cuota de Videos en Rotación:** Muestra el cumplimiento de la cuota publicitaria (ej. `2 / 5 videos en rotación`), alertando si una pantalla no tiene videos asignados o si ya alcanzó su límite máximo permitido por su plan.
* **Vinculación de Consola Hardware (Raspberry Pi):** Badge interactivo con el usuario/ID de la Raspberry Pi física (ej. `consola1`, `consola2`). El Super Admin puede hacer clic en el botón de edición para vincular o actualizar la consola física asignada.
* **Copiado Rápido de SCREEN_ID:** Botón de un solo clic junto al ID de la pantalla que copia el UUID directamente al portapapeles con confirmación visual, facilitando pegarlo en `/boot/firmware/config.txt` al configurar una nueva consola.

---

## 4. Filtrado Avanzado de Pantallas por Cliente

Para redes con múltiples clientes o franquicias, el Super Administrador puede segmentar la vista para supervisar clientes específicos.

![Filtro de Pantallas por Cliente](img/03-screens-filter-client.png)

* **Todos los clientes:** Muestra el parque completo de pantallas del sistema.
* **Cliente Específico:** Filtra inmediatamente las pantallas asociadas a una cuenta comercial determinada.
* **Sin Asignar:** Identifica pantallas nuevas o en inventario que aún no han sido vinculadas a ningún cliente comercial.

---

## 5. Actualizaciones OTA y Mantenimiento Remoto

Desde el botón **Actualizaciones OTA** en la sección de pantallas, el administrador puede desplegar actualizaciones de software sin tener que trasladarse físicamente a los locales.

![Modal de Actualizaciones OTA](img/04-screens-ota-modal.png)

### Opciones de Mantenimiento:
* **Actualizar Software (Git Pull):** Descarga la última versión estable del reproductor desde GitHub y reinicia el servicio automáticamente.
* **Forzar Sincronización de Videos:** Obliga a las pantallas seleccionadas a revisar de inmediato si hay nuevos videos pendientes en el servidor central.
* **Reinicio de Sistema (Reboot):** Reinicia el hardware de la Raspberry Pi de forma segura.

---

## 6. Módulo de Videos Publicitarios (`/videos`)

En este módulo se gestiona el inventario de piezas publicitarias que se exhibirán en la zona de video del Kiosco Dual.

![Biblioteca de Videos Publicitarios](img/05-videos-library.png)

### Características de la Biblioteca:
* **Filtro por Cliente Anunciante:** Permite auditar el contenido por empresa o anunciante.
* **Previsualización de Videos:** Reproductor integrado para verificar que el spot cuente con la relación de aspecto adecuada (vertical 9:16 o 1080x1920) y buena calidad visual.
* **Badges de Asignación:** Indica en cuántas pantallas está rotando actualmente cada spot publicitario.

---

## 7. Carga y Asignación de Videos con Validación de Cuotas

Al hacer clic en **Subir Video**, se despliega el modal inteligente de carga:

![Modal de Subida y Asignación de Videos](img/06-videos-upload-modal.png)

### Proceso de Carga:
1. **Archivo de Video:** Arrastra o selecciona un archivo en formato `.mp4` o `.webm`.
2. **Cliente Propietario (Super Admin):** Selecciona el cliente al que pertenecerá el video publicitario.
3. **Asignación de Pantallas:** Selecciona a qué pantalla o pantallas se asignará el nuevo spot.
4. **Control de Cuotas en Tiempo Real:** El sistema valida contra el plan contratado por el cliente cuántos videos tiene permitidos por pantalla. Si una pantalla ya tiene su cupo lleno (ej. `5 / 5 videos usados`), el sistema bloquea la asignación para evitar sobrepasar los límites comerciales acordados.

---

## 8. Módulo de Planes y Cuotas (`/plans`)

El módulo de planes define las condiciones comerciales y técnicas del servicio publicitario.

![Catálogo de Planes de Suscripción](img/07-plans-catalog.png)

### Elementos de cada Plan:
* **Nombre y Slug:** Identificador comercial (ej. *Plan Básico*, *Plan Pro*, *Plan Enterprise*).
* **Badge de Videos por Pantalla (`maxVideosPerScreen`):** Límite estricto de videos que cada pantalla asignada a este plan puede reproducir simultáneamente en su bucle (ej. `3 videos por pantalla` o `10 videos por pantalla`).
* **Precio Mensual:** Tarifa de suscripción periódica.
* **Juegos Incluidos:** Catálogo de minijuegos retro habilitados para los clientes suscritos a este plan.

---

## 9. Creación y Edición de Planes

Al pulsar en **Nuevo Plan** o en el botón de edición de un plan existente:

![Modal de Creación y Edición de Planes](img/08-plans-new-modal.png)

### Campos a Configurar:
1. **Nombre del Plan:** Nombre descriptivo visible para los clientes.
2. **Máximo de Videos por Pantalla:** Parámetro numérico clave que regula la cuota de rotación en el reproductor.
3. **Precio ($):** Valor en moneda local o USD.
4. **Minijuegos Permitidos:** Selección múltiple de los juegos arcade que se desbloquearán en las pantallas vinculadas a este plan.

---

## 10. Gestión de Usuarios y Clientes (`/users`)

En esta sección el Super Administrador gestiona el directorio de clientes, sus planes de suscripción, fechas de vigencia, pantallas asignadas y estados de actividad.

![Gestión de Usuarios y Clientes](img/09-users-management.png)

### 10.1. Tipos de Cuentas:
* **Super Admin:** Control total sobre todos los módulos, gestión de planes y acceso irrestricto a todas las pantallas y videos.
* **Cliente:** Acceso restringido únicamente a sus propias pantallas físicas y a la subida de sus propios anuncios, limitado por la cuota de videos de su plan asignado.

### 10.2. Antigüedad y Datos del Cliente:
* Cada cliente muestra su nombre comercial, usuario (`@usuario`), correo de contacto y su tiempo acumulado como cliente de la plataforma (ej. *Cliente: Hace 1 año y 3m*, *Cliente: Hace 15 días* o *Cliente: Hoy*).

### 10.3. Control de Estado (Activo / Inactivo):
* **Interruptor Rápido en la Tabla:** El Super Admin puede activar o suspender a un cliente directamente con un solo clic mediante el botón de encendido/apagado.
* **Efecto Inmediato en Pantallas Físicas:** Al marcar a un cliente como **Inactivo**, todas las pantallas asignadas a su cuenta se suspenden de inmediato vía MQTT y entran en modo **Standby / Reposo**. Mientras el cliente esté suspendido, las pantallas **no reproducirán videos publicitarios ni minijuegos arcade**.
* **Reactivación:** Al volver a activar al cliente, las pantallas se sincronizan automáticamente y retoman su rotación comercial normal.

### 10.4. Planes, Vigencia y Atajos de Duración:
* Cada cliente puede tener asignado un plan de suscripción con su rango de vigencia:
  * **Fecha de Inicio:** Momento en que comienza a regir la suscripción (a las 00:00:00).
  * **Fecha de Terminación:** Día límite de la suscripción. La cobertura es válida durante todo el día indicado hasta las **23:59:59.999**.
* **Atajos de Cálculo Rápido de Duración:** Al crear o editar un cliente, se dispone de botones de cálculo instantáneo basados en aritmética de calendario pura:
  * `+1 Mes`, `+3 Meses`, `+6 Meses`, `+1 Año`, `+2 Años` y `Sin Límite`.
* **Insignias de Estado de Vigencia:**
  * `PROGRAMADO`: Si la fecha de inicio del plan es posterior a la fecha actual.
  * `VENCIDO`: Si la fecha de terminación del plan ya ha pasado.

### 10.5. Desactivación Automática por Vencimiento y Reactivación Automática:
* **Detección Automática de Vencimiento:** Cuando la fecha de terminación del plan expira (`planEndsAt < hoy`), el sistema detecta el vencimiento de manera automática y cambia el estado del cliente a `isActive: false` en la base de datos.
* **Etiqueta en la Tabla:** La interfaz muestra el distintivo **`🔴 INACTIVO (VENCIDO)`**.
* **Protección contra Activaciones Accidentales:** No se permite activar manualmente a un cliente cuyo plan esté vencido. Si el administrador intenta activarlo, el sistema emitirá una alerta solicitando ampliar primero la fecha de vigencia en el modal de edición.
* **Reactivación Automática al Renovar la Vigencia:** Si se cambia la fecha de terminación por una válida dentro del rango futuro (o se usa cualquiera de los atajos `+1 Mes`, `+3 Meses`, `+6 Meses`, `+1 Año`, `+2 Años` o `Sin Límite`), el sistema **reactiva automáticamente al cliente (`isActive: true`)**.
* **Reanudación Inmediata de Pantallas:** Al guardar la renovación, el sistema envía un evento MQTT en tiempo real a todas sus pantallas físicas para que salgan del modo reposo y reanuden la emisión de anuncios y minijuegos sin necesidad de intervención manual en el local.

### 10.6. Modal de Pantallas Asignadas:
Al pulsar sobre el botón de pantallas de un cliente se abre un modal de doble propósito:
1. **Pestaña "Pantallas Asignadas":** Muestra la lista visual de todas las pantallas asignadas a ese cliente, su estado de conectividad en tiempo real (**Online / Offline**), si la pantalla está en reproducción o reposo, el identificador de la consola física (ej. `consola1`) y un botón para desvincularla con un solo clic.
2. **Pestaña "Asignar / Gestionar":** Buscador de pantallas disponibles con opciones de selección masiva (*"Seleccionar visibles"* / *"Deseleccionar visibles"*) y checkboxes para vincular o transferir pantallas entre clientes.

---

## 11. Catálogo de Minijuegos Arcade (`/games`)

El catálogo de juegos interactivos muestra la biblioteca de experiencias lúdicas disponibles en la plataforma MyPlayAd.

![Catálogo de Minijuegos Arcade](img/10-games-catalog.png)

* **Juegos Clásicos y Nuevos:** Arkanoid, Snake Retro, Space Invaders, Cyber Canyon, etc.
* **Compatibilidad Móvil:** Cada juego cuenta con sus controladores web optimizados (joystick analógico, pad direccional de 4 vías o botones de acción hápticos) y su respectiva integración WebRTC de latencia cero.

