import { PageHeader } from "../components/ui";

const TUTORIALS = [
  {
    id: 1,
    eyebrow: "Administración",
    title: "Dar de alta un nuevo operativo",
    description: "Crea un usuario con rol OPERATIVE y asígnalo a una organización.",
    steps: [
      "Ve a Administración > Usuarios.",
      "Pulsa el botón 'Crear Usuario'.",
      "Rellena el nombre de usuario, correo y contraseña temporal.",
      "Selecciona el rol OPERATIVE en el desplegable.",
      "Asigna una organización.",
      "Guarda. El operativo ya puede iniciar sesión en la app móvil.",
    ],
  },
  {
    id: 2,
    eyebrow: "Operaciones",
    title: "Crear y gestionar un incidente",
    description: "Abre un incidente, asígnale un área de trabajo y sigue sus alertas.",
    steps: [
      "Ve a Operaciones > Incidentes.",
      "Pulsa 'Nuevo incidente'.",
      "Introduce el nombre, tipo y deja el estado en ABIERTO.",
      "Desde Terreno > Áreas de trabajo, crea un área y asóciala al incidente.",
      "Supervisa las alertas desde Operaciones > Alertas.",
      "Cuando termine, edita el incidente y cambia el estado a CERRADO.",
    ],
  },
  {
    id: 3,
    eyebrow: "App móvil",
    title: "Iniciar jornada desde la app",
    description: "Pasos que sigue el operativo para activar su turno desde el móvil.",
    steps: [
      "El operativo abre la app móvil e inicia sesión.",
      "En la pantalla principal, activa la localización GPS cuando se solicite.",
      "Abre el menú (☰) y pulsa 'Iniciar jornada'.",
      "Confirma la jornada (puede añadir notas opcionales).",
      "El supervisor verá la jornada activa en el panel web bajo Jornadas.",
      "Para finalizar, abre el menú y pulsa 'Parar jornada'.",
    ],
  },
  {
    id: 4,
    eyebrow: "App móvil",
    title: "Enviar alerta SOS",
    description: "Cómo el operativo activa una alerta de emergencia crítica.",
    steps: [
      "En la pantalla principal del Operativo está visible el botón rojo SOS.",
      "Mantener pulsado durante 4 segundos (la barra de progreso avanza).",
      "Si se suelta antes de completar, la alerta se cancela.",
      "Al completarse, la alerta aparece en el panel web con severidad CRÍTICA.",
      "El supervisor puede reconocerla o cerrarla desde Operaciones > Alertas.",
    ],
  },
  {
    id: 5,
    eyebrow: "Centro de mando",
    title: "Leer el dashboard de mando",
    description: "Interpreta los KPIs y el mapa del panel principal.",
    steps: [
      "Accede a Inicio en el menú lateral.",
      "Las tarjetas superiores muestran: incidentes activos, alertas abiertas, unidades y jornadas en curso.",
      "El mapa central muestra las posiciones GPS de los operativos en tiempo real.",
      "Haz clic en un marcador para ver el detalle de esa unidad.",
      "Usa los filtros disponibles para segmentar por incidente o estado.",
    ],
  },
];

export default function TutorialsPage() {
  return (
    <div className="cm-shell min-h-screen">
      <div className="cm-page w-full">
        <PageHeader
          eyebrow="Documentación"
          title="Tutoriales"
          description="Guías paso a paso para las funciones más importantes del sistema."
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {TUTORIALS.map((tutorial) => (
            <article key={tutorial.id} className="cm-card p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--cm-info)] text-sm font-bold text-white">
                  {tutorial.id}
                </span>
                <div className="min-w-0">
                  <p className="cm-eyebrow">{tutorial.eyebrow}</p>
                  <h2 className="mt-1 font-bold text-[color:var(--cm-text)]">{tutorial.title}</h2>
                  <p className="mt-0.5 text-sm text-[color:var(--cm-text-muted)]">{tutorial.description}</p>
                </div>
              </div>

              <ol className="mt-4 space-y-2 border-t border-[color:var(--cm-border)] pt-4">
                {tutorial.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[color:var(--cm-border)] text-[11px] text-[color:var(--cm-text-muted)]">
                      {i + 1}
                    </span>
                    <span className="leading-snug text-[color:var(--cm-text-muted)]">{step}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
