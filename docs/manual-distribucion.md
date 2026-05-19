# Manual de Distribución

## 1. Estrategia de distribución

El sistema está compuesto por tres artefactos distribuibles:

| Artefacto | Tecnología | Método de distribución |
|---|---|---|
| **Panel Web** | React + Vite (SPA) | Vercel (CDN global, despliegue automático) |
| **App Móvil** | React Native + Expo | APK sideload en Android |
| **Backend** | Django + PostgreSQL | Docker Compose (servidor o VPS) |

---

## 2. Panel Web — Despliegue en Vercel

### 2.1 Configuración de Vercel (`vercel.json`)

El fichero `web-panel/vercel.json` configura el rewrite de SPA necesario para que React Router funcione correctamente en Vercel:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Este rewrite redirige todas las rutas al `index.html`, permitiendo que React Router gestione la navegación en cliente.

### 2.2 Pasos para desplegar en Vercel

1. Crea una cuenta en [vercel.com](https://vercel.com) si no la tienes.
2. Pulsa **Add New → Project** e importa el repositorio Git.
3. Configura el proyecto:
   - **Framework Preset**: Vite
   - **Root Directory**: `web-panel`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Añade la variable de entorno en **Settings → Environment Variables**:
   - `VITE_API_BASE_URL` = URL pública del backend (p. ej. `https://mi-backend.com/api`)
5. Pulsa **Deploy**.

Vercel construye automáticamente la app y la sirve desde su CDN global con HTTPS.

### 2.3 Despliegues posteriores

Cada vez que se hace `git push` a la rama principal, Vercel lanza un nuevo despliegue automáticamente.

Para despliegues manuales:

```bash
cd web-panel
npm run build
# Subir la carpeta dist/ a Vercel via CLI:
npx vercel --prod
```

### 2.4 Verificación

- URL del panel desplegado: configura y accede a la URL asignada por Vercel.
- Comprueba que la ruta `/login` carga correctamente (valida el SPA rewrite).
- Comprueba que el login con credenciales correctas accede al dashboard.

---

## 3. App Móvil — Distribución APK

### 3.1 Fichero APK

El APK precompilado está disponible en la raíz del proyecto:

```
emergency-mobile-release.apk
Tamaño: 62 MB
Versión: 1.0.0
Paquete: com.emergency.mobile
```

### 3.2 Permisos requeridos

La app solicita los siguientes permisos en Android:

| Permiso | Motivo |
|---|---|
| `ACCESS_FINE_LOCATION` | Seguimiento GPS en tiempo real |
| `ACCESS_COARSE_LOCATION` | Localización aproximada de respaldo |
| `ACCESS_BACKGROUND_LOCATION` | Envío de posición con la app en segundo plano |
| `FOREGROUND_SERVICE` | Servicio de tracking continuo |
| `POST_NOTIFICATIONS` | Notificaciones push de alertas y mensajes |

### 3.3 Instalación en dispositivo Android

**Opción A — ADB (cable USB)**:

```bash
adb install emergency-mobile-release.apk
```

**Opción B — Instalación manual en el dispositivo**:

1. Copia el fichero `emergency-mobile-release.apk` al dispositivo (USB, email, Drive, etc.).
2. En el dispositivo: **Ajustes → Aplicaciones → Instalar aplicaciones desconocidas**.
3. Selecciona el navegador de archivos o la app desde la que vas a abrir el APK y activa el permiso.
4. Abre el APK con el explorador de archivos y pulsa **Instalar**.
5. Una vez instalada, abre la app **Emergency Mobile** desde el launcher.

> En Android 8.0+ el permiso de "instalar fuentes desconocidas" se concede por app (no de forma global).

### 3.4 Configuración del endpoint tras instalar

La URL del backend está configurada en tiempo de compilación mediante `EXPO_PUBLIC_API_BASE_URL`. El APK precompilado apunta al backend de producción. Si necesitas apuntar a un backend diferente, recompila la app (ver manual de instalación).

---

## 4. Backend — Despliegue con Docker

### 4.1 Despliegue estándar

```bash
cd backend
docker compose up --build -d
```

El backend estará disponible en `http://localhost:8000` (o en el dominio/IP del servidor).

### 4.2 Variables de producción

Para producción edita el fichero `backend/.env` con valores seguros:

```env
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=clave-secreta-aleatoria-larga-y-segura
DJANGO_ALLOWED_HOSTS=mi-dominio.com,www.mi-dominio.com
DB_HOST=host-de-postgresql
DB_PASSWORD=contraseña-segura
DB_SSLMODE=require
```

> **Nunca** uses `DJANGO_DEBUG=True` en producción. Expone información sensible.

### 4.3 Persistencia de datos

El `docker-compose.yml` define un volumen para PostgreSQL, por lo que los datos persisten entre reinicios del contenedor.

### 4.4 HTTPS y proxy inverso

Para producción, coloca un proxy inverso (Nginx o Caddy) delante de Django para terminar SSL:

```
Internet → Nginx (HTTPS 443) → Django (HTTP 8000)
```

---

## 5. Verificación del despliegue completo

| Check | Cómo verificarlo | Estado esperado |
|---|---|---|
| Backend activo | `curl http://localhost:8000/api/auth/panel/me/` | Respuesta JSON (aunque sea 401/403) |
| Panel web cargado | Abrir la URL de Vercel en el navegador | Página de login visible |
| Login funciona | Introducir credenciales válidas | Acceso al dashboard |
| APK instalado | Abrir la app en el dispositivo Android | Pantalla de login visible |
| App conecta con backend | Iniciar sesión desde la app | Acceso a la pantalla del operativo |
| GPS activo | Activar tracking desde la app | Posición visible en el mapa del panel |

---

## 6. Evidencias de distribución real

### Panel Web
- El fichero `web-panel/vercel.json` está presente y contiene el rewrite SPA.
- La app está preparada para despliegue en Vercel: `npm run build` genera `dist/` sin errores.

### APK
- Fichero disponible: `emergency-mobile-release.apk` (62 MB, versión 1.0.0).
- Instalable en cualquier dispositivo Android 8.0+ habilitando fuentes desconocidas.

### Backend
- `backend/docker-compose.yml` y `backend/Dockerfile` presentes.
- `docker compose up --build` levanta el servidor en `http://localhost:8000`.
