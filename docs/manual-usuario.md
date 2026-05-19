# Manual de Usuario — Sistema de Gestión de Emergencias

## 1. Introducción

El Sistema de Gestión de Emergencias es una plataforma multicomponente diseñada para coordinar operaciones de emergencia en tiempo real. Está compuesto por:

- **Panel Web** (`web-panel`): interfaz de supervisión y administración accesible desde el navegador.
- **App Móvil** (`mobile-app`): aplicación para operativos de campo instalada en dispositivos Android.
- **Backend** (`backend`): API REST Django que centraliza datos, usuarios, incidentes y comunicaciones.

El sistema está pensado para dos perfiles de usuario:

| Perfil | Dónde trabaja | Qué hace |
|---|---|---|
| **Supervisión / mando** | Panel web | Gestiona incidentes, alertas, jornadas, workareas y usuarios |
| **Operativo de campo** | App móvil | Recibe órdenes, reporta alertas, activa SOS, envía posición GPS |

---

## 2. Roles del sistema

| Rol | Nivel de acceso |
|---|---|
| **ADMIN** | Acceso completo al panel web y a la administración de usuarios, organizaciones y configuración del sistema |
| **COMMAND** | Acceso operativo completo: incidentes, alertas, jornadas, workareas, POI, chat y reportes. Sin acceso a gestión de usuarios ni auditoría |
| **OPERATIVE** | Solo app móvil. Puede iniciar jornada, enviar alertas, activar SOS, ver el mapa, gestionar POI y usar el chat |

---

## 3. Panel Web

Accede al panel desde la URL desplegada (p. ej. `https://emergency-panel.vercel.app`) o localmente en `http://localhost:5173`.

### 3.1 Login

Introduce tu email y contraseña. Si tu cuenta tiene acceso al panel (`has_panel_full_access = true`), entrarás al dashboard principal. En caso contrario, el sistema rechazará el acceso.

### 3.2 Centro de mando

#### Dashboard
Vista general del sistema: número de incidentes activos, alertas recientes y unidades operativas. Punto de entrada principal para el turno.

#### Meteorología
Consulta el tiempo actual y la previsión para la zona de operaciones. Los datos se obtienen de una API meteorológica externa.

#### Rayos
Mapa en tiempo real con la actividad de rayos detectada. Útil para valorar riesgos en operaciones exteriores.

### 3.3 Operaciones

#### Incidentes
Lista de todos los incidentes del sistema con filtros por estado. Los estados posibles son:

| Estado | Descripción |
|---|---|
| **OPEN** | Incidente activo, en atención |
| **TRIAGE** | En evaluación, pendiente de clasificar |
| **CLOSED** | Incidente cerrado y archivado |

Para crear un incidente: pulsa **Nuevo incidente**, rellena el formulario (título, descripción, tipo y ubicación) y guarda. Para modificar el estado, abre el incidente y selecciona el nuevo estado.

#### Chat
Canal de comunicación en tiempo real entre el personal del panel y los operativos de campo. Los mensajes se agrupan por incidente o como canal general.

#### Jornadas
Seguimiento de los turnos de trabajo de las unidades de campo. Cada jornada registra:
- Hora de inicio y fin
- Ubicaciones GPS de inicio y parada
- Descansos intermedios
- Notas operativas

Haz clic en una jornada para ver el recorrido GPS en el mapa.

#### Alertas
Lista de todas las alertas generadas en el sistema. Los tipos de alerta son:

| Tipo | Origen |
|---|---|
| **SOS** | Activado manualmente por el operativo desde la app |
| **GEOFENCE** | El operativo ha salido del área de trabajo asignada |
| **MOVEMENT** | Alerta de movimiento detectada automáticamente |

Las alertas tienen severidades: **LOW**, **MEDIUM**, **HIGH**, **CRITICAL**.

### 3.4 Recursos

#### Unidades
Gestión del personal operativo: listado de usuarios con rol OPERATIVE, su organización y estado de actividad.

#### Organizaciones
Gestión de las organizaciones (cuerpos o equipos) a las que pertenece el personal.

### 3.5 Terreno

#### Workareas (Áreas de trabajo)
Define zonas geográficas de actuación. Dos tipos:

| Tipo | Descripción |
|---|---|
| **CIRCLE** | Zona circular: un punto central y un radio en metros |
| **POLYGON** | Zona poligonal de forma libre dibujada sobre el mapa |

Cuando un operativo sale del área asignada, el sistema genera automáticamente una alerta **GEOFENCE** y bloquea la app hasta que el supervisor intervenga.

#### Puntos de Interés (POI)
Marcadores geolocalizados en el mapa con información relevante para las operaciones (recursos, peligros, puntos de reunión).

### 3.6 Administración

#### Usuarios
Gestión de cuentas de usuario: crear, editar, asignar rol y activar/desactivar.

#### Auditoría
Registro cronológico de las acciones realizadas en el sistema: quién hizo qué y cuándo.

#### Reportes
Generación de informes exportables (PDF) con resúmenes de incidentes, alertas y actividad operativa.

### 3.7 Ayuda

Accesible desde el menú lateral bajo la sección **Ayuda**:

- **Ayuda general**: descripción de cada módulo del panel.
- **Preguntas frecuentes**: respuestas a las dudas más comunes.
- **Tutoriales**: guías paso a paso para las tareas principales.

En cada página del panel hay un botón flotante **?** (esquina inferior izquierda) que lanza un tour guiado interactivo con explicaciones de todos los elementos de la pantalla actual.

---

## 4. App Móvil

Instala la app desde el fichero `emergency-mobile-release.apk` (ver manual de instalación). Requiere Android 8.0 o superior.

### 4.1 Login

Introduce el email y contraseña de tu cuenta OPERATIVE. Si las credenciales son correctas, la app accede a la pantalla principal del operativo.

### 4.2 Pantalla principal (Operativo)

Hub central con acceso a todas las funciones. Se abre pulsando el icono de menú (☰). Opciones disponibles:

- Ubicación en tiempo real
- Alertas
- SOS
- Mapa
- Puntos de interés
- Jornada
- Compañeros
- Chat
- Perfil
- Configuración
- Ayuda y tutoriales
- Cerrar sesión

### 4.3 GPS / Tracking

Activa el seguimiento de posición GPS. La app envía la ubicación al servidor cada pocos segundos. El mando puede ver la posición en tiempo real desde el panel web.

### 4.4 Alertas

Envía una alerta al panel de mando con tipo (MOVEMENT, GEOFENCE) y descripción. El supervisor la verá en la sección de Alertas del panel.

### 4.5 SOS

Activa una cuenta atrás de 4 segundos antes de enviar la señal de socorro. Durante ese tiempo puedes cancelar pulsando el botón. Si no cancelas, se envía una alerta SOS con tu posición GPS al panel con prioridad CRITICAL.

### 4.6 Mapa

Visualiza tu posición actual y la de los compañeros de equipo en tiempo real. Muestra también las workareas asignadas a tu incidente.

### 4.7 Puntos de Interés (POI)

Crea, edita y visualiza marcadores geolocalizados relevantes para la operación actual.

### 4.8 Jornada

Ciclo de trabajo del operativo:

1. **Iniciar jornada** — registra hora de inicio y posición GPS de partida.
2. **Iniciar descanso** — pausa el registro; el contador de tiempo se detiene.
3. **Reanudar** — sale del descanso y continúa el registro.
4. **Parar jornada** — cierra el turno, registra posición GPS final y guarda el resumen.

### 4.9 Compañeros

Lista de los demás operativos activos en el incidente actual con su posición en el mapa.

### 4.10 Chat

Mensajería en tiempo real con el mando y el resto de compañeros del incidente.

### 4.11 Perfil

Consulta y edición de los datos de tu cuenta: nombre, email y contraseña.

### 4.12 Configuración

Ajustes de la app: intervalo de envío GPS, notificaciones push, modo oscuro/claro y preferencias offline.

### 4.13 Ayuda y tutoriales

Pantalla con tres secciones desplegables:
- **Funciones principales**: descripción de cada función de la app.
- **Preguntas frecuentes**: dudas habituales de los operativos.
- **Tutoriales rápidos**: guías paso a paso para las tareas más comunes.

---

## 5. Flujo operativo completo

1. El **ADMIN** crea la organización y los usuarios (COMMAND + OPERATIVE).
2. El **COMMAND** abre un nuevo **incidente** desde el panel y asigna un área de trabajo (workarea).
3. Los **OPERATIVE** inician sesión en la app móvil y **activan su jornada**.
4. La app comienza a enviar **posición GPS** al servidor; el mando la ve en el mapa del panel.
5. Si un operativo detecta una situación, envía una **alerta** o activa el **SOS**.
6. El mando ve la alerta en tiempo real en el panel y coordina la respuesta por el **chat**.
7. Al finalizar el turno, el operativo **para su jornada** desde la app.
8. El mando puede exportar un **reporte** del incidente desde el panel.

---

## 6. Cola offline

Si el dispositivo pierde conectividad de red, la app continúa funcionando:

- Las acciones pendientes (alertas, posición GPS, SOS) se almacenan en una **cola local**.
- El contador de acciones pendientes es visible en la pantalla de Configuración.
- En cuanto se recupera la conexión, la app **sincroniza automáticamente** toda la cola con el servidor.
- El panel mostrará las acciones con la marca de tiempo original del dispositivo.

---

## 7. Geofence y bloqueo

Cuando el área de trabajo tiene geofence activado:

1. El servidor monitoriza continuamente la posición GPS del operativo.
2. Si el operativo **sale del perímetro**, se genera una alerta automática de tipo **GEOFENCE**.
3. La **app móvil se bloquea** mostrando un aviso hasta que el supervisor desbloquee la situación desde el panel.
4. El supervisor puede revisar la alerta, confirmar la situación y reanudar la operación.
