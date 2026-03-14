# Cmabios aplciados

- Se corrigio `web-panel/src/pages/ViewUnidadesPage.tsx` para soportar respuestas paginadas de Django REST (`results`) y evitar el error `map is not a function`.
- Se anadio normalizacion de datos en `web-panel/src/pages/ViewUnidadesPage.tsx` para aceptar array directo o payload paginado.
- Se aplico el tema visual "Centro de control de emergencias" en `web-panel/src/index.css` con la paleta solicitada: base azul marino oscuro, paneles gris pizarra y colores de incidencia mas claros por prioridad.
- Se mejoro el diseno de `web-panel/src/pages/ViewUnidadesPage.tsx` con menos margenes, tarjetas resumen, tabla mas ancha para pantallas grandes y columnas con mejor lectura.
- Se compactaron margenes y el grid de `web-panel/src/pages/DashboardPage.tsx` para que el panel se vea mas denso, mas ancho y mas util en monitores grandes.
- Se ajusto `web-panel/src/components/Layout.tsx` para una barra lateral mas limpia, compacta y consistente con el nuevo tema de emergencias.
- Se actualizo `web-panel/src/pages/LoginPage.tsx` para alinear el acceso con el mismo tema de color y menos espacio muerto.
- Se amplio el tema a `web-panel/src/pages/IncidentsPage.tsx` con una tabla mas ancha, mejores colores por estado y mejor uso del espacio en pantallas grandes.
- Se rediseño `web-panel/src/pages/AlertsPage.tsx` para convertirla en una vista mas acorde al centro de control de emergencias, con tarjetas resumen y tabla operativa.
- Se actualizo `web-panel/src/pages/ViewUsersPage.tsx` con menos margenes, tabla mas ancha y mejor consistencia visual.
- Se dejaron algunos margenes de respiracion, pero menos extremos que antes, para equilibrar densidad y legibilidad.
- Se verifico el panel con `npm run build` en `web-panel/` y compila correctamente.
