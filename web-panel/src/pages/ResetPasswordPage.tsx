import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

const ENDPOINT_SOLICITAR_CODIGO = "/auth/password-reset/request/";
const ENDPOINT_CONFIRMAR_PASSWORD = "/auth/password-reset/confirm/";

function obtenerMensajeError(data: unknown, mensajePorDefecto: string) {
  if (!data || typeof data !== "object") {
    return mensajePorDefecto;
  }

  const posibleDetalle = (data as Record<string, unknown>).detail;
  if (typeof posibleDetalle === "string" && posibleDetalle.trim()) {
    return posibleDetalle;
  }

  const primeraClave = Object.keys(data)[0];
  if (!primeraClave) {
    return mensajePorDefecto;
  }

  const valor = (data as Record<string, unknown>)[primeraClave];
  if (Array.isArray(valor) && typeof valor[0] === "string") {
    return `${primeraClave}: ${valor[0]}`;
  }
  if (typeof valor === "string") {
    return `${primeraClave}: ${valor}`;
  }

  return mensajePorDefecto;
}

type ModalProps = {
  children: React.ReactNode;
  titulo: string;
  descripcion: string;
};

function ModalBase({ children, titulo, descripcion }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4">
      <div className="w-full max-w-md rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6 shadow-2xl">
        <div>
          <h2 className="text-xl font-bold text-[color:var(--cm-text)]">{titulo}</h2>
          <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">{descripcion}</p>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [correoElectronico, setCorreoElectronico] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmacionPassword, setConfirmacionPassword] = useState("");
  const [tokenReseteoVerificado, setTokenReseteoVerificado] = useState("");

  const [modalNuevaPasswordAbierto, setModalNuevaPasswordAbierto] = useState(false);

  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [reseteandoPassword, setReseteandoPassword] = useState(false);

  const [errorPagina, setErrorPagina] = useState("");
  const [errorNuevaPassword, setErrorNuevaPassword] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  async function continuarAlCambioPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorPagina("");
    setMensajeExito("");

    if (!correoElectronico.trim()) {
      setErrorPagina("Introduce un correo electrónico válido.");
      return;
    }

    setEnviandoCodigo(true);

    try {
      const respuesta = await apiFetch(ENDPOINT_SOLICITAR_CODIGO, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: correoElectronico.trim(),
        }),
      });

      if (!respuesta.ok) {
        let mensaje = "No se pudo preparar el cambio de password.";
        try {
          const data = (await respuesta.json()) as unknown;
          mensaje = obtenerMensajeError(data, mensaje);
        } catch {
          // Si no viene JSON, dejamos el mensaje por defecto.
        }
        setErrorPagina(mensaje);
        return;
      }

      const data = (await respuesta.json()) as { reset_token_debug?: string; detail?: string };
      setTokenReseteoVerificado(data.reset_token_debug ?? "");
      setNuevaPassword("");
      setConfirmacionPassword("");
      setErrorNuevaPassword("");
      setModalNuevaPasswordAbierto(true);
      setMensajeExito(data.detail ?? "Continua con el cambio de password.");
    } finally {
      setEnviandoCodigo(false);
    }
  }

  async function resetearPassword() {
    setErrorNuevaPassword("");
    setMensajeExito("");

    if (nuevaPassword.length < 8) {
      setErrorNuevaPassword("La nueva password debe tener al menos 8 caracteres.");
      return;
    }

    if (nuevaPassword.includes(" ")) {
      setErrorNuevaPassword("La nueva password no puede contener espacios.");
      return;
    }

    if (nuevaPassword !== confirmacionPassword) {
      setErrorNuevaPassword("La confirmacion de la password no coincide.");
      return;
    }

    setReseteandoPassword(true);

    try {
      const respuesta = await apiFetch(ENDPOINT_CONFIRMAR_PASSWORD, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: correoElectronico.trim(),
          reset_token: tokenReseteoVerificado,
          new_password: nuevaPassword,
        }),
      });

      if (!respuesta.ok) {
        let mensaje = "No se pudo actualizar la password.";
        try {
          const data = (await respuesta.json()) as unknown;
          mensaje = obtenerMensajeError(data, mensaje);
        } catch {
          // Si no viene JSON, dejamos el mensaje por defecto.
        }
        setErrorNuevaPassword(mensaje);
        return;
      }

      setModalNuevaPasswordAbierto(false);
      setMensajeExito("La contraseña se ha actualizado correctamente. Ya puedes iniciar sesión.");
      setTokenReseteoVerificado("");
      setNuevaPassword("");
      setConfirmacionPassword("");
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1200);
    } finally {
      setReseteandoPassword(false);
    }
  }

  return (
    <div className="cm-shell relative flex min-h-screen items-center justify-center px-3">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute left-[10%] top-[12%] h-56 w-56 rounded-full bg-[color:var(--cm-danger)] blur-3xl" />
        <div className="absolute bottom-[12%] right-[8%] h-56 w-56 rounded-full bg-[color:var(--cm-info)] blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6 shadow-2xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[color:var(--cm-text)]">Resetear password</h1>
          <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
            Introduce el correo y continua directamente al cambio de password.
          </p>
        </div>

        <form onSubmit={continuarAlCambioPassword} className="mt-6 space-y-4">
          <div>
            <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-[color:var(--cm-text-muted)]">
              Correo electrónico
            </label>
            <input
              id="reset-email"
              type="email"
              value={correoElectronico}
              onChange={(e) => setCorreoElectronico(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)] focus:ring-2 focus:ring-[color:var(--cm-info)]"
              placeholder="usuario@emergency.com"
            />
          </div>

          <div className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)]/60 p-3 text-sm text-[color:var(--cm-text-muted)]">
            Coloque la direccion de correo electronico asociada a su cuenta y le enviaremos un enlace con un codigo de verificacion. Luego podra usar ese codigo para establecer una nueva password.
          </div>

          {errorPagina ? <div className="cm-badge-danger rounded-lg p-3 text-sm">{errorPagina}</div> : null}
          {mensajeExito ? <div className="cm-badge-success rounded-lg p-3 text-sm">{mensajeExito}</div> : null}

          <button
            type="submit"
            disabled={enviandoCodigo}
            className="cm-button-primary w-full rounded-lg py-2.5 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviandoCodigo ? "Preparando cambio..." : "Continuar"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-[color:var(--cm-text-muted)]">
          <p>Si ya recuerdas tu acceso, vuelve al login.</p>
          <Link to="/" className="text-[color:var(--cm-info)] hover:underline">
          Ir a iniciar sesión
          </Link>
        </div>
      </div>

      {modalNuevaPasswordAbierto ? (
        <ModalBase
          titulo="Nueva password"
          descripcion="Introduce la nueva password y confirmala para completar el cambio."
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="nueva-password"
                className="mb-1 block text-sm font-medium text-[color:var(--cm-text-muted)]"
              >
                Nueva password
              </label>
              <input
                id="nueva-password"
                type="password"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)] focus:ring-2 focus:ring-[color:var(--cm-info)]"
                placeholder="Minimo 8 caracteres"
              />
            </div>

            <div>
              <label
                htmlFor="confirmacion-password"
                className="mb-1 block text-sm font-medium text-[color:var(--cm-text-muted)]"
              >
                Confirmar password
              </label>
              <input
                id="confirmacion-password"
                type="password"
                value={confirmacionPassword}
                onChange={(e) => setConfirmacionPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)] focus:ring-2 focus:ring-[color:var(--cm-info)]"
                placeholder="Repite la nueva password"
              />
            </div>

            {errorNuevaPassword ? (
              <div className="cm-badge-danger rounded-lg p-3 text-sm">{errorNuevaPassword}</div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setModalNuevaPasswordAbierto(false);
                  setErrorNuevaPassword("");
                  setNuevaPassword("");
                  setConfirmacionPassword("");
                }}
                className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-2.5 text-sm font-semibold text-[color:var(--cm-text)] transition hover:border-[color:var(--cm-info)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void resetearPassword()}
                disabled={reseteandoPassword || !tokenReseteoVerificado}
                className="cm-button-primary rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reseteandoPassword ? "Reseteando..." : "Resetear password"}
              </button>
            </div>
          </div>
        </ModalBase>
      ) : null}
    </div>
  );
}
