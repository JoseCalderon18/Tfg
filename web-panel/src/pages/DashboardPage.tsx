import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await apiFetch("/auth/panel/me/");
      if (!res.ok) {
        window.location.href = "/login";
        return;
      }

      const data = await res.json();

      if (data.role !== "SUPERVISOR") {
        window.location.href = "/login";
        return;
      }

      setLoading(false);
    })();
  }, []);

  if (loading) return <div>Cargando...</div>;

  return <div>Panel Supervisor</div>;
}