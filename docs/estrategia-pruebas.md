# Estrategia de Pruebas — Sistema de Gestión de Emergencias

## 1. Objetivos y alcance

### Objetivo
Verificar que el sistema de gestión de emergencias funciona correctamente en sus flujos principales: autenticación, gestión de incidentes, alertas, GPS, jornadas, geofence y funcionamiento offline.

### Qué se prueba
- Autenticación y control de acceso por rol
- Gestión de incidentes (crear, cambiar estado)
- Gestión de alertas (visualizar, tipos SOS/GEOFENCE/MOVEMENT)
- Panel de administración de usuarios y organizaciones
- Workareas y POI
- Jornadas de campo (inicio, descanso, parada)
- Tour guiado interactivo en todas las páginas del panel
- Páginas de ayuda, FAQ y tutoriales
- Cola offline y sincronización en la app móvil
- Corrección estática de tipos TypeScript (web + móvil)

### Qué queda fuera del alcance
- Tests automatizados E2E (Playwright, Cypress, Detox)
- Pruebas de carga o rendimiento
- Pruebas de seguridad (penetration testing)
- Pruebas de expiración de token JWT
- Compatibilidad con iOS

---

## 2. Tipos de prueba

### 2.1 Pruebas estáticas — TypeScript

#### Panel Web

Comando ejecutado:

```bash
cd web-panel
npm run build
```

Salida real obtenida:

```
> emergency-web-panel@1.0.0 build
> tsc && vite build

vite v5.4.21 building for production...
✓ 561 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                          0.46 kB │ gzip:   0.29 kB
dist/assets/index-DEsxqIxE.css          89.62 kB │ gzip:  19.00 kB
dist/assets/purify.es-BgtpMKW3.js       22.77 kB │ gzip:   8.79 kB
dist/assets/index.es-B2gsavBS.js       150.69 kB │ gzip:  51.55 kB
dist/assets/html2canvas.esm-CBrSDip1.js 201.42 kB │ gzip:  48.03 kB
dist/assets/index-D7wyHNHd.js         1,190.83 kB │ gzip: 335.85 kB
✓ built in 3.97s
```

**Resultado: 0 errores TypeScript. Carpeta `dist/` generada correctamente.**

> Nota: la advertencia de chunk > 500 kB es pre-existente y no es un error; se debe al bundle de Leaflet y html2canvas.

---

#### App Móvil

Comando ejecutado:

```bash
cd mobile-app
npx tsc -p tsconfig.json --noEmit
```

Salida real obtenida:

```
(sin salida — exit code 0)
```

**Resultado: 0 errores TypeScript en la app móvil.**

---

### 2.2 Pruebas funcionales manuales — Panel Web

**Entorno**: Chrome 124, Windows 11, backend local en `http://localhost:8000/api`, panel en `http://localhost:5173`.

| ID | Módulo | Caso de prueba | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| PT-W01 | Auth | Login correcto | 1. Abrir `/login`. 2. Introducir email y contraseña válidos. 3. Pulsar Entrar | Redirige al dashboard | Redirige al dashboard | ✅ |
| PT-W02 | Auth | Login incorrecto | 1. Abrir `/login`. 2. Introducir contraseña incorrecta. 3. Pulsar Entrar | Muestra mensaje de error | Muestra "Credenciales incorrectas" | ✅ |
| PT-W03 | Incidentes | Crear incidente | 1. Ir a Incidentes. 2. Pulsar Nuevo incidente. 3. Rellenar título y descripción. 4. Guardar | Incidente aparece en la lista con estado OPEN | Incidente visible en lista | ✅ |
| PT-W04 | Incidentes | Cambiar estado | 1. Abrir un incidente existente. 2. Cambiar estado de OPEN a TRIAGE. 3. Guardar | El estado se actualiza en la lista | Estado actualizado correctamente | ✅ |
| PT-W05 | Alertas | Ver alertas | 1. Ir a Alertas. 2. Verificar que se muestran las alertas existentes | Lista de alertas visible con tipo, severidad y fecha | Lista visible con todos los campos | ✅ |
| PT-W06 | Dashboard | Ver dashboard | 1. Ir al dashboard principal | KPIs de incidentes, alertas y unidades visibles | Dashboard carga correctamente | ✅ |
| PT-W07 | Usuarios | Crear usuario | 1. Ir a Administración → Usuarios. 2. Pulsar Crear Usuario. 3. Rellenar datos y elegir rol OPERATIVE. 4. Guardar | Usuario aparece en la lista | Usuario creado y visible | ✅ |
| PT-W08 | Organizaciones | Crear organización | 1. Ir a Recursos → Organizaciones. 2. Crear nueva organización. 3. Guardar | Organización visible en la lista | Organización creada correctamente | ✅ |
| PT-W09 | Workareas | Crear workarea | 1. Ir a Terreno → Workareas. 2. Crear nueva área de tipo CIRCLE. 3. Guardar | Área visible en la lista y en el mapa | Área creada y visible en mapa | ✅ |
| PT-W10 | POI | Crear POI | 1. Ir a Terreno → POI. 2. Crear nuevo punto de interés con nombre y coordenadas. 3. Guardar | POI visible en la lista | POI creado correctamente | ✅ |
| PT-W11 | Jornadas | Ver jornadas | 1. Ir a Operaciones → Jornadas | Lista de jornadas visible con estadísticas | Jornadas cargadas correctamente | ✅ |
| PT-W12 | Ayuda | Navegar a Ayuda | 1. Expandir sección Ayuda en el menú lateral. 2. Pulsar Ayuda general | Página de ayuda con secciones acordeón | Página carga con todos los módulos | ✅ |
| PT-W13 | Ayuda | Ver FAQ | 1. Pulsar Preguntas frecuentes en el menú | Página FAQ con preguntas desplegables | FAQ carga con 10 preguntas | ✅ |
| PT-W14 | Ayuda | Ver Tutoriales | 1. Pulsar Tutoriales en el menú | Página de tutoriales con tarjetas numeradas | 5 tarjetas de tutorial visibles | ✅ |
| PT-W15 | Tour guiado | Tour en Incidentes | 1. Ir a Incidentes. 2. Pulsar botón ? (esquina inferior izquierda). 3. Avanzar con Continuar | Tour superpone cada elemento con overlay y explicación | Tour con 3 pasos funciona | ✅ |
| PT-W16 | Tour guiado | Tour en Alertas | 1. Ir a Alertas. 2. Pulsar ?. 3. Avanzar pasos | Tour con 4 pasos explicando métricas, leyenda, búsqueda y tabla | Tour funciona correctamente | ✅ |
| PT-W17 | Tour guiado | Tour en Usuarios | 1. Ir a Usuarios. 2. Pulsar ?. 3. Avanzar pasos | Tour con 3 pasos | Tour funciona correctamente | ✅ |
| PT-W18 | Tour guiado | Tour en Workareas | 1. Ir a Workareas. 2. Pulsar ?. 3. Avanzar pasos | Tour con 2 pasos (lista y mapa) | Tour funciona correctamente | ✅ |
| PT-W19 | Tour guiado | Tour en Jornadas | 1. Ir a Jornadas. 2. Pulsar ?. 3. Avanzar pasos | Tour con 2 pasos (estadísticas y lista) | Tour funciona correctamente | ✅ |
| PT-W20 | Auth | Logout | 1. Pulsar el botón de cerrar sesión | Redirige a `/login` y no se puede acceder sin autenticar | Logout funciona correctamente | ✅ |

---

### 2.3 Pruebas funcionales manuales — App Móvil

**Entorno**: Dispositivo Android físico (Android 12), app instalada desde `emergency-mobile-release.apk`, backend local con `adb reverse tcp:8000 tcp:8000`.

| ID | Módulo | Caso de prueba | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| PT-M01 | Auth | Login correcto | 1. Abrir la app. 2. Introducir email y contraseña de usuario OPERATIVE. 3. Pulsar Entrar | Acceso a la pantalla principal del operativo | Acceso correcto a pantalla operativo | ✅ |
| PT-M02 | Auth | Login incorrecto | 1. Introducir contraseña incorrecta. 2. Pulsar Entrar | Mensaje de error | "Credenciales incorrectas" visible | ✅ |
| PT-M03 | GPS | Activar tracking | 1. Abrir menú. 2. Pulsar Ubicación en tiempo real. 3. Conceder permiso de ubicación | App comienza a enviar posición; visible en panel web | Posición aparece en el mapa del panel | ✅ |
| PT-M04 | Jornada | Iniciar jornada | 1. Abrir menú. 2. Ir a Jornada. 3. Pulsar Iniciar jornada | Jornada activa; hora de inicio registrada | Jornada iniciada y visible en panel web | ✅ |
| PT-M05 | Jornada | Iniciar descanso | 1. Con jornada activa. 2. Pulsar Iniciar descanso | Estado cambia a "En descanso"; tracking pausado | Descanso activado correctamente | ✅ |
| PT-M06 | Jornada | Parar jornada | 1. Pulsar Parar jornada | Jornada cerrada con hora de fin; visible en panel | Jornada finalizada y guardada | ✅ |
| PT-M07 | Alertas | Enviar alerta | 1. Abrir menú. 2. Pulsar Alertas. 3. Crear nueva alerta. 4. Enviar | Alerta aparece en el panel web con tipo y ubicación | Alerta recibida en el panel | ✅ |
| PT-M08 | SOS | SOS y cancelar | 1. Abrir menú. 2. Pulsar SOS. 3. Esperar cuenta atrás de 4 segundos | Cuenta atrás visible; al finalizar envía alerta SOS crítica | Countdown de 4s visible; SOS enviado al completar | ✅ |
| PT-M09 | SOS | Cancelar SOS | 1. Activar SOS. 2. Pulsar Cancelar durante la cuenta atrás | SOS cancelado; no se envía ninguna alerta | SOS cancelado correctamente | ✅ |
| PT-M10 | Mapa | Navegar al mapa | 1. Abrir menú. 2. Pulsar Mapa | Mapa con posición actual y compañeros visible | Mapa carga con posición GPS | ✅ |
| PT-M11 | Compañeros | Ver compañeros | 1. Abrir menú. 2. Pulsar Compañeros | Lista de operativos activos en el incidente | Lista de compañeros visible | ✅ |
| PT-M12 | Ayuda | Navegar a Ayuda | 1. Abrir menú. 2. Pulsar Ayuda y tutoriales | Pantalla HelpScreen con 3 secciones desplegables | Pantalla de ayuda carga correctamente | ✅ |
| PT-M13 | Auth | Cerrar sesión | 1. Abrir menú. 2. Pulsar Cerrar sesión | Redirige a la pantalla de login | Logout funciona correctamente | ✅ |

---

### 2.4 Pruebas offline — App Móvil

| ID | Caso de prueba | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| PT-O01 | Cola offline — enviar SOS sin red | 1. Desactivar WiFi y datos móviles. 2. Activar SOS y dejar completar la cuenta atrás | SOS encolado localmente; sin errores fatales | Alerta guardada en cola local; sin crash | ✅ |
| PT-O02 | Sincronización automática | 1. Con cola pendiente. 2. Reactivar la conexión de red | La app detecta la conexión y envía las acciones pendientes automáticamente | Alerta SOS aparece en el panel tras reconectar | ✅ |
| PT-O03 | Contador pendientes | 1. Con acciones en cola. 2. Ir a Configuración | El contador de acciones pendientes muestra el número correcto | Contador visible con el número de acciones en espera | ✅ |

---

## 3. Entorno de pruebas

| Elemento | Valor |
|---|---|
| Sistema operativo (PC) | Windows 11 Home |
| Navegador | Chrome 124, Firefox 126 |
| URL panel web (dev) | `http://localhost:5173` |
| URL backend (dev) | `http://localhost:8000/api` |
| Dispositivo móvil | Android físico (Android 12) |
| Emulador | Android Virtual Device (API 33) |
| Versión Node.js | 20.x LTS |
| Versión Python backend | 3.11 |
| Docker | 24.x |

---

## 4. Resultados

### Resumen

| Categoría | Total | Pasados | Fallidos |
|---|---|---|---|
| TypeScript web-panel | 1 | 1 | 0 |
| TypeScript mobile-app | 1 | 1 | 0 |
| Funcionales web | 20 | 20 | 0 |
| Funcionales móvil | 13 | 13 | 0 |
| Offline móvil | 3 | 3 | 0 |
| **TOTAL** | **38** | **38** | **0** |

### Compilación TypeScript — web-panel

```
✓ 561 modules transformed.
✓ built in 3.97s
```

Salida completa en sección 2.1.

### Compilación TypeScript — mobile-app

```
npx tsc -p tsconfig.json --noEmit → exit 0 (sin errores)
```

---

## 5. Limitaciones conocidas

- **Sin tests automatizados**: todas las pruebas son manuales. No existe suite de tests unitarios ni E2E automatizada. Esto es trabajo futuro.
- **Sin pruebas de carga**: no se ha evaluado el comportamiento del sistema con carga alta de usuarios o alertas concurrentes.
- **Expiración de token no probada**: el comportamiento cuando el JWT expira en mitad de una sesión activa no ha sido probado sistemáticamente.
- **Sin pruebas en iOS**: la app solo ha sido probada en Android.
- **Geofence en emulador**: las pruebas de geofence con posición GPS simulada en emulador pueden diferir del comportamiento real en campo.

---

## 6. Conclusiones

Los 38 casos de prueba definidos (20 funcionales web, 13 móvil, 3 offline y 2 estáticos TypeScript) han pasado en su totalidad. La compilación TypeScript de ambas plataformas produce 0 errores, lo que garantiza la corrección de tipos en tiempo de compilación.

Los flujos principales del sistema (autenticación, incidentes, alertas, GPS, jornadas, tour guiado, ayuda y cola offline) funcionan correctamente según los criterios de aceptación definidos.

Las principales brechas de cobertura identificadas como trabajo futuro son:
1. Suite de tests automatizados E2E con Playwright (web) y Detox (móvil).
2. Tests unitarios para los componentes React y las vistas de Django.
3. Pruebas de carga con herramientas como k6 o Locust.
4. Pruebas de seguridad (OWASP Top 10) en la API REST.
