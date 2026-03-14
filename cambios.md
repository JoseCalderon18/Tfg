# Cambios implementados

## Backend

- Se corrigio `backend/entrypoint.sh` para que el arranque sea estable:
  - aplica migraciones
  - ejecuta `collectstatic`
  - arranca el proceso principal
- Se elimino del entrypoint la espera con `nc` y el `docker exec` interno para seeds, porque eran fragiles y rompian el contenedor.
- Se actualizo `backend/docker-compose.yml` con defaults utiles para trabajo en equipo:
  - `DB_HOST=db`
  - `DB_NAME`, `DB_USER`, `DB_PASSWORD`
  - `DB_PORT=5432`
  - `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`
- Se dejo `seed.sql` como carga manual y se documento en `backend/README.md`.

## Web Panel

- Se definio un tema visual base tipo "Centro de Mando" en `web-panel/src/index.css` con variables CSS para Tailwind.
- Se actualizo `web-panel/src/components/Layout.tsx` para usar la nueva identidad visual y ampliar la navegacion lateral.
- Se actualizo `web-panel/src/pages/LoginPage.tsx` con el nuevo tema y comentarios en espanol por bloques.
- Se rehizo `web-panel/src/pages/DashboardPage.tsx` con una vista mas consistente para pruebas de interfaz.
- Se redefinio `web-panel/src/pages/ViewUnidadesPage.tsx` para que ya no sea placeholder y consuma datos reales desde `/api/users/` como unidades operativas.
- Se agregaron comentarios en espanol por bloques en archivos clave del panel:
  - `web-panel/src/components/Layout.tsx`
  - `web-panel/src/pages/LoginPage.tsx`
  - `web-panel/src/pages/DashboardPage.tsx`
  - `web-panel/src/store/authStore.ts`
  - `web-panel/src/utils/api.ts`
- Se corrigio un error de TypeScript por estado no usado en `web-panel/src/pages/EditIncidentPage.tsx`.

## Validaciones realizadas

- `npm install` en `web-panel/`
- `npm run build` en `web-panel/` -> OK
- `docker compose config` en `backend/` -> OK

## Nota

- No pude validar el arranque final de Docker en esta ultima pasada porque el daemon de Docker no estaba disponible en el entorno (`dockerDesktopLinuxEngine` no accesible en ese momento).
