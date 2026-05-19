import { useState } from "react";
import { PageHeader } from "../components/ui";

const FAQS = [
  {
    q: "¿Cómo inicio sesión en el panel web?",
    a: "Accede con el nombre de usuario y contraseña proporcionados por el administrador. Si no recuerdas la contraseña, usa el enlace 'Olvidé mi contraseña' en la pantalla de login.",
  },
  {
    q: "¿Cuántos roles de usuario existen y qué puede hacer cada uno?",
    a: "El sistema tiene tres roles: ADMIN (acceso completo al panel y administración), COMMAND (supervisión operativa, sin gestión de usuarios) y OPERATIVE (solo acceso a la app móvil para trabajo de campo).",
  },
  {
    q: "¿Cómo creo un nuevo incidente?",
    a: "Ve a Operaciones > Incidentes y pulsa 'Nuevo incidente'. Rellena el nombre, tipo y estado inicial. Desde la ficha del incidente puedes asignar áreas de trabajo y consultar las alertas asociadas.",
  },
  {
    q: "¿Qué es una alerta SOS?",
    a: "Una alerta SOS se genera desde la app móvil cuando el operativo mantiene pulsado el botón SOS durante 4 segundos. Aparece inmediatamente en el panel web con severidad CRÍTICA.",
  },
  {
    q: "¿Qué es una alerta GEOFENCE?",
    a: "Se genera automáticamente cuando un operativo sale del área de trabajo que tiene asignada. El sistema detecta la salida por GPS y bloquea la pantalla del operativo hasta que vuelva al área o el supervisor lo libere.",
  },
  {
    q: "¿Cómo asigno un usuario a una organización?",
    a: "Ve a Administración > Usuarios, edita el usuario deseado y selecciona la organización en el campo correspondiente del formulario.",
  },
  {
    q: "¿Para qué sirve el mapa del dashboard?",
    a: "El mapa muestra la posición GPS en tiempo real de todos los operativos con la app activa y la jornada iniciada. Los marcadores se actualizan automáticamente.",
  },
  {
    q: "¿Qué pasa si un operativo no tiene cobertura?",
    a: "La app móvil tiene una cola offline. Las acciones (alertas, puntos de interés, etc.) se guardan localmente y se sincronizan automáticamente cuando recupera la conexión.",
  },
  {
    q: "¿Cómo exporto un informe de incidentes?",
    a: "En la página de Incidentes, pulsa el botón 'Exportar PDF' para descargar un informe con todos los incidentes visibles en ese momento.",
  },
  {
    q: "¿Qué diferencia hay entre área circular y área poligonal?",
    a: "El área circular se define por un punto central y un radio en metros. El polígono permite dibujar formas irregulares sobre el mapa. Ambos tipos generan alertas GEOFENCE si el operativo sale de la zona.",
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="cm-shell min-h-screen">
      <div className="cm-page w-full">
        <PageHeader
          eyebrow="Documentación"
          title="Preguntas frecuentes"
          description="Respuestas a las dudas más habituales sobre el uso del sistema."
        />

        <div className="mt-6 cm-card overflow-hidden divide-y divide-[color:var(--cm-border)]">
          {FAQS.map((faq, index) => (
            <div key={index}>
              <button
                type="button"
                className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-[color:var(--cm-surface-2)]"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
              >
                <span className="font-semibold text-[color:var(--cm-text)]">{faq.q}</span>
                <span
                  className={`mt-0.5 shrink-0 text-sm text-[color:var(--cm-text-muted)] transition-transform duration-200 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>
              {openIndex === index ? (
                <div className="px-5 pb-5 text-sm leading-relaxed text-[color:var(--cm-text-muted)]">
                  {faq.a}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
