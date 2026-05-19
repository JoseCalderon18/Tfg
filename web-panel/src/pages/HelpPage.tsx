import { PageHeader } from "../components/ui";

const SECTIONS = [
  {
    id: "command",
    label: "Centro de mando",
    items: [
      {
        title: "Inicio / Dashboard",
        body: "Muestra los KPIs principales del sistema: incidentes activos, alertas abiertas, unidades operativas y jornadas en curso. El mapa central permite visualizar las posiciones GPS en tiempo real de los operativos.",
      },
      {
        title: "Meteorología",
        body: "Consulta las condiciones meteorológicas actuales y el pronóstico para las zonas de operación. Útil para planificar despliegues y evaluar riesgos ambientales.",
      },
      {
        title: "Rayos",
        body: "Mapa de actividad eléctrica en tiempo real. Muestra la densidad de rayos por zona geográfica para anticipar riesgos en el terreno.",
      },
    ],
  },
  {
    id: "operations",
    label: "Operaciones",
    items: [
      {
        title: "Incidentes",
        body: "Gestión completa del ciclo de vida de los incidentes. Cada incidente puede estar en estado ABIERTO, EN EVALUACIÓN o CERRADO. Puedes asignar áreas de trabajo, ver las alertas asociadas y exportar un PDF con el resumen.",
      },
      {
        title: "Alertas",
        body: "Centro de alertas operativas generadas automáticamente por la app móvil (SOS, salida de área, movimiento anómalo) o manualmente desde el panel. Permite reconocer y cerrar alertas individualmente.",
      },
      {
        title: "Chat",
        body: "Canal de comunicación en tiempo real entre supervisores y operativos. Los mensajes quedan registrados y son visibles desde el panel.",
      },
      {
        title: "Jornadas",
        body: "Seguimiento de las jornadas iniciadas por los operativos desde la app móvil. Muestra duración total, ubicación de inicio y fin, y notas operativas introducidas en campo.",
      },
    ],
  },
  {
    id: "resources",
    label: "Recursos",
    items: [
      {
        title: "Unidades",
        body: "Listado de todas las unidades registradas con su estado y organización asociada. Permite ver el detalle de cada unidad y editar su información.",
      },
      {
        title: "Organizaciones",
        body: "Gestión de las organizaciones (brigadas, cuerpos, unidades de mando). Cada organización agrupa usuarios y unidades bajo una misma entidad.",
      },
    ],
  },
  {
    id: "terrain",
    label: "Terreno",
    items: [
      {
        title: "Áreas de trabajo",
        body: "Definición de zonas geográficas de actuación. Pueden ser circulares (radio en metros) o poligonales (dibujadas en el mapa). Cuando un operativo sale de su área asignada, el sistema genera automáticamente una alerta de tipo GEOFENCE.",
      },
      {
        title: "Puntos de interés",
        body: "Marcadores georreferenciados en el mapa para señalar recursos, peligros u objetivos operativos. Los operativos pueden verlos desde la app móvil durante su jornada.",
      },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    items: [
      {
        title: "Usuarios",
        body: "Alta, edición y baja de usuarios. Cada usuario tiene un rol: ADMIN (acceso completo), COMMAND (supervisión operativa) u OPERATIVE (solo app móvil para trabajo de campo).",
      },
      {
        title: "Auditoría",
        body: "Registro completo de todas las acciones realizadas en el sistema: quién hizo qué y cuándo. Útil para revisiones post-incidente y control de actividad.",
      },
      {
        title: "Reportes de riesgo",
        body: "Generación de reportes basados en la actividad del sistema: incidentes cerrados, alertas generadas y tiempo de respuesta por unidad.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="cm-shell min-h-screen">
      <div className="cm-page w-full">
        <PageHeader
          eyebrow="Documentación"
          title="Ayuda del sistema"
          description="Guía rápida de cada módulo del panel de emergencias."
        />

        <div className="mt-6 space-y-4">
          {SECTIONS.map((section) => (
            <section key={section.id} className="cm-card overflow-hidden">
              <div className="border-b border-[color:var(--cm-border)] px-5 py-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--cm-text-muted)]">
                  {section.label}
                </h2>
              </div>
              <div className="divide-y divide-[color:var(--cm-border)]">
                {section.items.map((item) => (
                  <div key={item.title} className="px-5 py-4">
                    <h3 className="font-semibold text-[color:var(--cm-text)]">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[color:var(--cm-text-muted)]">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
