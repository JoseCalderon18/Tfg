# Manual de distribución y despliegue del proyecto

**Proyecto:** Plataforma de Gestión Operativa para Emergencias  
**Módulos incluidos:** panel web, aplicación móvil, backend y base de datos  
**Integrantes:** José Calderón, Adrián Poyatos y Gonzalo Cuenca  
**Curso:** 2.º Desarrollo de Aplicaciones Multiplataforma  
**Asignatura:** Desarrollo de interfaces  
**Unidad:** UT 7 - Distribución de aplicaciones

## 1. Introducción

En este documento explicamos cómo hemos preparado la distribución y el despliegue de nuestro proyecto. La aplicación está formada por varios módulos que trabajan juntos: un panel web para supervisión, una aplicación móvil para los operativos, un backend que centraliza la lógica del sistema y una base de datos donde se guardan los datos.

Para la distribución hemos usado servicios reales de despliegue:

- **Vercel**, para publicar el panel web.
- **Render**, para desplegar el backend desarrollado con Django.
- **Supabase**, para alojar la base de datos PostgreSQL.
- **APK de Android**, para distribuir la aplicación móvil.

La idea es que el proyecto no se quede solo funcionando en local, sino que pueda ejecutarse desde un entorno preparado para su uso real.

## 2. Arquitectura de distribución

El sistema se distribuye en cuatro partes principales:

| Parte del proyecto | Tecnología | Servicio o formato de distribución |
|---|---|---|
| Panel web | React, TypeScript y Vite | Vercel |
| Backend | Django y Django REST Framework | Render |
| Base de datos | PostgreSQL | Supabase |
| Aplicación móvil | React Native y Expo | APK Android |

El flujo general es el siguiente:

1. El usuario accede al panel web desde la URL pública de Vercel.
2. El panel web se comunica con el backend desplegado en Render.
3. El backend lee y escribe información en la base de datos de Supabase.
4. La aplicación móvil instalada mediante APK también se comunica con el mismo backend.

De esta manera, el panel web y la app móvil comparten la misma información y trabajan sobre los mismos datos.

**Captura 1 pendiente:** colocar una captura o esquema de la arquitectura general. Debe señalar claramente: Vercel como panel web, Render como backend, Supabase como base de datos y APK como distribución móvil.

## 3. Distribución del panel web en Vercel

El panel web se encuentra en la carpeta `web-panel`. Está desarrollado con React, TypeScript y Vite, por lo que el resultado final del despliegue es una aplicación web estática generada en la carpeta `dist`.

Antes de desplegarlo, comprobamos que el proyecto compila correctamente ejecutando:

```bash
cd web-panel
npm install
npm run build
```

El comando `npm run build` ejecuta TypeScript y genera la versión final del panel. Si el comando termina sin errores, Vite crea la carpeta `dist`, que es la que se publica en producción.

Para desplegarlo en Vercel, configuramos el proyecto con estos valores:

| Campo de Vercel | Valor utilizado | Dónde se comprueba en el proyecto |
|---|---|---|
| Framework Preset | Vite | `web-panel/package.json`, por las dependencias `vite` y `@vitejs/plugin-react` |
| Root Directory | `web-panel` | Carpeta donde está el panel web |
| Build Command | `npm run build` | `web-panel/package.json`, dentro de `scripts.build` |
| Output Directory | `dist` | Se genera al ejecutar `npm run build` desde `web-panel` |

Además, el panel necesita saber dónde está el backend. Para ello se configura la variable de entorno:

```bash
VITE_API_BASE_URL=https://URL-DEL-BACKEND-EN-RENDER/api
```

En local, esta variable aparece como ejemplo en el archivo:

```text
web-panel/.env.example
```

En producción, el valor definitivo se configura en Vercel, dentro de **Settings > Environment Variables**. Es decir, el archivo del repositorio sirve como referencia, pero el valor real de producción se guarda en Vercel para que el panel apunte al backend desplegado en Render.

En el proyecto también se incluye el archivo `web-panel/vercel.json`, que permite que las rutas internas del panel funcionen correctamente aunque se recargue la página desde una ruta como `/incidents`, `/alerts` o `/chats`.

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

Esta configuración es importante porque el panel usa React Router. Sin este archivo, algunas rutas podrían fallar al recargar la página directamente desde el navegador.

**Captura 2 pendiente:** colocar una captura del panel de Vercel donde se vea el proyecto desplegado correctamente. Señalar el estado del despliegue, la URL pública y la rama usada.

**Captura 3 pendiente:** colocar una captura de las variables de entorno de Vercel. Señalar la variable `VITE_API_BASE_URL`. No mostrar contraseñas ni claves privadas.

**Captura 4 pendiente:** colocar una captura del panel web abierto en producción, preferiblemente en la pantalla de login o en el dashboard.

## 4. Despliegue del backend en Render

El backend se encuentra en la carpeta `backend`. Está desarrollado con Django y Django REST Framework, y es el encargado de exponer la API que usan tanto el panel web como la aplicación móvil.

Para desplegarlo en Render, el servicio se configura como aplicación web. El backend necesita instalar sus dependencias, aplicar la configuración de producción y arrancar el servidor.

La configuración general del despliegue es:

| Campo de Render | Valor utilizado | Dónde se comprueba en el proyecto |
|---|---|---|
| Tipo de servicio | Web Service | Configuración del servicio en Render |
| Carpeta raíz | `backend` | Carpeta donde está el backend |
| Entorno | Python | `backend/requirements.txt` |
| Comando de instalación | `pip install -r requirements.txt` | `backend/requirements.txt` |
| Comando de arranque | Comando de arranque del servidor Django en producción | `backend/manage.py` y configuración del servicio en Render |

En Render se configuran también las variables de entorno necesarias para que Django funcione correctamente. Las más importantes son:

```bash
DJANGO_SECRET_KEY=clave-secreta-de-produccion
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=dominio-de-render
DB_HOST=host-de-supabase
DB_NAME=postgres
DB_USER=usuario-de-supabase
DB_PASSWORD=contraseña-de-supabase
DB_PORT=5432
DB_SSLMODE=require
```

La referencia de estas variables está en:

```text
backend/.env.example
```

En ese archivo se ve que la base de datos está preparada para conectarse a Supabase mediante el pooler de PostgreSQL. En Render no se sube el archivo `.env` real con contraseñas, sino que se copian esas variables en el apartado **Environment** del servicio.

En producción es importante que `DJANGO_DEBUG` esté en `False`, porque si se deja activado se podrían mostrar datos internos del servidor cuando ocurre un error.

Después del despliegue, comprobamos que el backend responde accediendo a una ruta de la API. Aunque algunas rutas devuelvan `401 Unauthorized` si no hay sesión iniciada, eso significa que el servidor está vivo y que la API está respondiendo.

**Captura 5 pendiente:** colocar una captura del servicio de Render desplegado correctamente. Señalar el estado del servicio, la URL pública y el último despliegue correcto.

**Captura 6 pendiente:** colocar una captura de las variables de entorno de Render. Señalar `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS` y las variables de conexión a Supabase. Ocultar contraseñas y claves secretas.

**Captura 7 pendiente:** colocar una captura del navegador o de una herramienta como Postman mostrando una respuesta de la API desplegada.

## 5. Base de datos en Supabase

Para la base de datos usamos Supabase, que ofrece PostgreSQL como servicio gestionado. Esto nos permite tener la base de datos separada del backend y disponible desde Render mediante las variables de conexión.

La conexión se realiza con los datos proporcionados por Supabase:

| Variable | Uso |
|---|---|
| `DB_HOST` | Host de conexión a Supabase |
| `DB_NAME` | Nombre de la base de datos |
| `DB_USER` | Usuario de conexión |
| `DB_PASSWORD` | Contraseña de la base de datos |
| `DB_PORT` | Puerto de PostgreSQL |
| `DB_SSLMODE` | Modo SSL, normalmente `require` |

Estas variables aparecen referenciadas en:

```text
backend/.env.example
```

La estructura de la base de datos también queda documentada en:

```text
schema.sql
```

El backend utiliza estas variables para conectarse a Supabase. De esta forma, los datos de usuarios, incidentes, alertas, jornadas, puntos de interés y chats quedan centralizados en una base de datos externa.

Para preparar la base de datos se deben aplicar las migraciones de Django. También puede usarse el archivo `schema.sql` como referencia de la estructura de datos del proyecto.

**Captura 8 pendiente:** colocar una captura del panel de Supabase donde se vea la base de datos del proyecto. Señalar las tablas principales o la zona de conexión. No mostrar contraseñas.

## 6. Distribución de la aplicación móvil

La aplicación móvil está en la carpeta `mobile-app`. Está desarrollada con React Native y Expo. Para distribuirla se ha generado un archivo APK instalable en Android.

El archivo de distribución está en la raíz del proyecto:

```text
emergency-mobile-release.apk
```

La configuración de nombre, versión, paquete y permisos de Android se encuentra en:

```text
mobile-app/app.json
```

Las variables de conexión que puede usar la app móvil están documentadas en:

```text
mobile-app/.env.example
```

Este archivo permite instalar la app en un dispositivo Android sin necesidad de ejecutar el proyecto desde el ordenador. Es la forma más sencilla de entregar y probar la aplicación móvil.

Para instalarlo en un dispositivo Android se puede usar una de estas opciones:

**Opción 1: instalación manual**

1. Copiar el archivo `emergency-mobile-release.apk` al móvil.
2. Abrir el archivo desde el explorador de archivos del dispositivo.
3. Permitir la instalación desde fuentes desconocidas si Android lo solicita.
4. Pulsar en instalar.
5. Abrir la aplicación desde el menú de aplicaciones.

**Opción 2: instalación con ADB**

```bash
adb install emergency-mobile-release.apk
```

La aplicación móvil necesita permisos de ubicación para poder enviar la posición del operativo y detectar si sale de una zona de trabajo. También puede solicitar permisos de notificaciones, dependiendo de la versión de Android.

Antes de distribuir una nueva versión del APK, verificamos que el proyecto no tenga errores de TypeScript:

```bash
cd mobile-app
.\node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit
```

El comando anterior utiliza la configuración TypeScript de:

```text
mobile-app/tsconfig.json
```

**Captura 9 pendiente:** colocar una captura del archivo `emergency-mobile-release.apk` en la carpeta del proyecto. Señalar el nombre del archivo.

**Captura 10 pendiente:** colocar una captura de la aplicación instalada en Android, por ejemplo la pantalla de login o el menú principal.

**Captura 11 pendiente:** colocar una captura de Android pidiendo o mostrando permisos de ubicación, si es posible.

## 7. Configuración entre servicios

Para que todo funcione correctamente, los servicios tienen que apuntarse entre sí:

- Vercel debe apuntar al backend de Render mediante `VITE_API_BASE_URL`; la referencia está en `web-panel/.env.example` y el valor real se guarda en Vercel.
- Render debe apuntar a Supabase mediante `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` y `DB_SSLMODE`; la referencia está en `backend/.env.example` y el valor real se guarda en Render.
- La app móvil debe apuntar al mismo backend que usa el panel web; la referencia está en `mobile-app/.env.example`.

La configuración correcta de estas URLs es fundamental. Si el panel web o la app móvil apuntan a una URL incorrecta, la interfaz puede cargar, pero no se podrán iniciar sesión ni consultar datos.

## 8. Comprobaciones después del despliegue

Después de desplegar el proyecto, seguimos esta lista de comprobación:

| Prueba | Resultado esperado |
|---|---|
| Abrir la URL del panel en Vercel | Se muestra la pantalla de login |
| Iniciar sesión desde el panel | Se accede al dashboard |
| Entrar a incidentes desde el panel | Se cargan los datos desde el backend |
| Entrar a alertas desde el panel | Se muestran las alertas registradas |
| Abrir la URL del backend en Render | La API responde |
| Comprobar conexión con Supabase | El backend puede consultar y guardar datos |
| Instalar el APK en Android | La app se instala sin errores |
| Iniciar sesión desde la app móvil | Se accede a la pantalla operativa |
| Activar GPS desde la app | Se solicita permiso y se inicia el seguimiento |
| Consultar datos compartidos | Web y móvil usan la misma información |

**Captura 12 pendiente:** colocar una captura del panel web mostrando datos reales cargados desde la API.

**Captura 13 pendiente:** colocar una captura de la app móvil conectada al backend, por ejemplo mostrando incidentes, mapa, jornada o alertas.

## 9. Problemas posibles y soluciones

Durante el despliegue pueden aparecer algunos problemas habituales:

| Problema | Causa probable | Solución |
|---|---|---|
| El panel carga, pero el login falla | La variable `VITE_API_BASE_URL` no apunta al backend correcto | Revisar la variable en Vercel y volver a desplegar |
| Una ruta del panel da error al recargar | Falta el rewrite de React Router | Revisar `web-panel/vercel.json` |
| El backend no conecta con la base de datos | Variables de Supabase incorrectas | Revisar host, usuario, contraseña y SSL |
| Render muestra error de arranque | Comando de inicio incorrecto o variable faltante | Revisar logs de Render |
| La app móvil no inicia sesión | El APK apunta a una URL de backend incorrecta | Recompilar el APK con la URL correcta |
| Android no deja instalar el APK | Fuentes desconocidas desactivadas | Activar el permiso para instalar APKs |
| El GPS no funciona | Permisos de ubicación denegados | Conceder permisos desde ajustes del dispositivo |

## 10. Conclusión

Con este despliegue hemos conseguido que el proyecto pueda usarse fuera del entorno local. El panel web queda publicado en Vercel, el backend se ejecuta en Render, la base de datos está alojada en Supabase y la aplicación móvil se distribuye mediante un APK instalable.

Esta distribución permite probar el funcionamiento completo del sistema: el supervisor trabaja desde el panel web, el operativo usa la app móvil y ambos módulos se comunican con el mismo backend y la misma base de datos. Por tanto, el proyecto queda preparado para una demostración real y para una entrega evaluable de distribución.
