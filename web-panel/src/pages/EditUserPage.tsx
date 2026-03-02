import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../utils/api";

type MeResponse = {
  authenticated: boolean;
  role?: string;
};

type UserDetailResponse = {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: "SUPERVISOR" | "OPERATIVE";
  is_active: boolean;
  created_at?: string;
};

const ROLES: Array<UserDetailResponse["role"]> = ["SUPERVISOR", "OPERATIVE"];

export default function EditUserPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserDetailResponse["role"]>("OPERATIVE");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) {
        setError("Usuario no valido.");
        setLoading(false);
        return;
      }


      const meRes = await apiFetch("/auth/panel/me/");
      if (!meRes.ok) {
        navigate("/login", { replace: true });
        return;
      }

      const meData = (await meRes.json()) as MeResponse;
      if (meData.role !== "SUPERVISOR") {
        navigate("/login", { replace: true });
        return;
      }

      const userRes = await apiFetch(`/auth/panel/users/${id}/`);
      if (!userRes.ok) {
        setError("No se pudo cargar el usuario.");
        setLoading(false);
        return;
      }

      const user = (await userRes.json()) as UserDetailResponse;
      setUsername(user.username ?? "");
      setEmail(user.email ?? "");
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
      setPhone(user.phone ?? "");
      setRole(user.role ?? "OPERATIVE");
      setIsActive(Boolean(user.is_active));
      setLoading(false);
    })();
  }, [id, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;

    setError("");
    setSuccess("");

    if (!username.trim()) {
      setError("El username es obligatorio.");
      return;
    }

    if (!email.trim()) {
      setError("El email es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/auth/panel/users/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          role,
          is_active: isActive,
        }),
      });

      if (!res.ok) {
        let detail = "No se pudo actualizar el usuario.";
        try {
          const data = await res.json();
          if (data?.detail) detail = String(data.detail);
          else if (typeof data === "object") {
            const firstKey = Object.keys(data)[0];
            if (firstKey) {
              const v = (data as Record<string, unknown>)[firstKey];
              detail = Array.isArray(v) ? `${firstKey}: ${String(v[0])}` : `${firstKey}: ${String(v)}`;
            }
          }
        } catch (e) {
            console.error("Error procesando la respuesta del servidor:", e);
            alert("Ocurrió un error inesperado al procesar la respuesta del servidor.");
        }
        setError(detail);
        return;
      }

      const updated = (await res.json()) as UserDetailResponse;
      setUsername(updated.username ?? "");
      setEmail(updated.email ?? "");
      setFirstName(updated.first_name ?? "");
      setLastName(updated.last_name ?? "");
      setPhone(updated.phone ?? "");
      setRole(updated.role ?? "OPERATIVE");
      setIsActive(Boolean(updated.is_active));
      setSuccess("Usuario actualizado correctamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
        <p className="text-slate-300">Cargando usuario...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">Administracion</p>
            <h1 className="text-2xl font-bold">Editar usuario</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate("/viewusers")}
            className="rounded-xl bg-slate-900/60 px-4 py-2 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
          >
            Volver
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-900/60 p-6 ring-1 ring-slate-800">
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Nombre</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Apellido</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Telefono</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Rol</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserDetailResponse["role"])}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950/40"
              />
              Usuario activo
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/viewusers")}
                className="rounded-xl bg-slate-900/60 px-5 py-2.5 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-500 disabled:opacity-60 transition"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
