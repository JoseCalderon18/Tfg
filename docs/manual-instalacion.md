# Manual de Instalación, Configuración y Administración

## 1. Requisitos previos

### Software requerido

| Componente | Versión mínima | Uso |
|---|---|---|
| Node.js | 18 LTS | Panel web y app móvil |
| npm | 9+ | Gestión de dependencias JS |
| Python | 3.11+ | Backend Django |
| Docker | 24+ | Despliegue contenerizado del backend |
| Docker Compose | 2.x (plugin) | Orquestación de contenedores |
| PostgreSQL | 14+ (con PostGIS) | Base de datos (incluida en Docker) |
| Android SDK / ADB | Cualquier versión reciente | Instalar y depurar app móvil |
| Expo CLI | 0.18+ | Desarrollo y compilación de la app |

> Para desarrollo de la app móvil se recomienda usar un dispositivo Android físico o un emulador con Android 8.0+.

---

## 2. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd Tfg
```

La estructura del proyecto es:

```
Tfg/
├── backend/          # API Django
├── web-panel/        # React + Vite
├── mobile-app/       # React Native + Expo
├── docs/             # Documentación
└── emergency-mobile-release.apk
```

---

## 3. Backend Django

### 3.1 Configuración de variables de entorno

```bash
cd backend
cp .env.example .env
```

Edita el fichero `.env` con tus valores reales:

```env
DB_HOST=localhost           # o el host de tu PostgreSQL/Supabase
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=tu-contraseña
DB_PORT=5432
DB_SSLMODE=require          # "disable" para bases de datos locales sin SSL
DJANGO_SECRET_KEY=cambia-esta-clave-en-produccion
DJANGO_DEBUG=True           # False en producción
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
```

### 3.2 Levantar con Docker (recomendado)

```bash
cd backend
docker compose up --build
```

Esto construye la imagen, aplica las migraciones automáticamente y levanta el servidor en `http://localhost:8000`.

Para ejecutarlo en segundo plano:

```bash
docker compose up --build -d
```

Para detenerlo:

```bash
docker compose down
```

### 3.3 Instalación manual (sin Docker)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### 3.4 Crear superusuario

```bash
python manage.py createsuperuser
```

Introduce username, email y contraseña cuando se solicite. Este usuario tendrá acceso a `/admin/` (Django Admin) y al panel web como ADMIN.

---

## 4. Panel Web

### 4.1 Instalar dependencias

```bash
cd web-panel
npm install
```

### 4.2 Configurar variables de entorno

Crea el fichero `.env` en `web-panel/`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

En producción (Vercel), configura esta variable en el dashboard de Vercel (ver manual de distribución).

### 4.3 Desarrollo

```bash
npm run dev
```

El panel se abre en `http://localhost:5173`.

### 4.4 Compilar para producción

```bash
npm run build
```

Genera la carpeta `dist/` con los ficheros estáticos listos para desplegar.

---

## 5. App Móvil

### 5.1 Instalar dependencias

```bash
cd mobile-app
npm install
```

### 5.2 Configurar variables de entorno

Crea el fichero `.env` en `mobile-app/`:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api
```

> `10.0.2.2` es la dirección que los emuladores Android usan para referirse al `localhost` del host. En un dispositivo físico, usa la IP local del PC (p. ej. `192.168.1.x`).

### 5.3 Ejecutar en emulador / dispositivo

```bash
npm run android
```

Si usas dispositivo físico conectado por USB, redirige el puerto del backend:

```bash
adb reverse tcp:8000 tcp:8000
```

### 5.4 Instalar el APK precompilado

Si no quieres compilar la app, puedes instalar directamente el APK precompilado:

```bash
adb install emergency-mobile-release.apk
```

O cópialo al dispositivo por cable / Bluetooth y ábrelo con el explorador de archivos. Deberás tener habilitada la instalación de fuentes desconocidas (ver manual de distribución).

---

## 6. Tabla de variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_NAME` | Nombre de la base de datos | `postgres` |
| `DB_USER` | Usuario de la base de datos | `postgres` |
| `DB_PASSWORD` | Contraseña de la base de datos | `mi-contraseña-segura` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_SSLMODE` | SSL para la conexión | `require` / `disable` |
| `DJANGO_SECRET_KEY` | Clave secreta de Django (cambiar en prod) | `clave-aleatoria-larga` |
| `DJANGO_DEBUG` | Modo debug | `True` / `False` |
| `DJANGO_ALLOWED_HOSTS` | Hosts permitidos | `localhost,mi-dominio.com` |

### Panel Web (`web-panel/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_BASE_URL` | URL base de la API REST | `http://localhost:8000/api` |

### App Móvil (`mobile-app/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | URL base de la API REST | `http://10.0.2.2:8000/api` |

---

## 7. Administración del sistema

### 7.1 Crear organización

1. Accede al panel web con una cuenta ADMIN.
2. Ve a **Recursos → Organizaciones**.
3. Pulsa **Nueva organización**, rellena el nombre y guarda.

### 7.2 Crear usuario

1. Ve a **Administración → Usuarios**.
2. Pulsa **Crear Usuario**.
3. Rellena username, email, contraseña y selecciona el rol (ADMIN / COMMAND / OPERATIVE).
4. Asigna una organización si es necesario.
5. Guarda.

### 7.3 Asignar o cambiar rol

1. Ve a **Administración → Usuarios**.
2. Busca el usuario y pulsa **Editar**.
3. Cambia el campo **Rol** y guarda.

### 7.4 Activar / desactivar cuenta

Desde **Editar usuario**, cambia el estado **Activo** y guarda. Las cuentas inactivas no pueden iniciar sesión.

### 7.5 Gestión de contraseñas

El administrador puede establecer una nueva contraseña para cualquier usuario desde **Editar usuario → Cambiar contraseña**. Los usuarios también pueden cambiar su propia contraseña desde el perfil en la app móvil.

### 7.6 Panel de administración de Django

Disponible en `http://localhost:8000/admin/` para el superusuario. Permite gestionar directamente todos los modelos de la base de datos.
