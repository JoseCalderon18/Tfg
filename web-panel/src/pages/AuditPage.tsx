import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../utils/api";
import { DataTable, EmptyState, ErrorBanner, LoadingState, MetricCard, PageHeader, Pagination, SearchBar } from "../components/ui";

type FilaAuditoria = {
  id: number;
  created_at?: string | null;
  description?: string | null;
  created_id?: string | null;
  created_username?: string | null;
};

const FILAS_POR_PAGINA = 12;

function normalizarFilas(payload: unknown): FilaAuditoria[] {
  if (Array.isArray(payload)) {
    return payload as FilaAuditoria[];
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown[] }).results)) {
    return ((payload as { results?: FilaAuditoria[] }).results ?? []) as FilaAuditoria[];
  }

  return [];
}

function tieneSiguiente(payload: unknown) {
  return Boolean(payload && typeof payload === "object" && (payload as { next?: unknown }).next);
}

function conPagina(path: string, page: number) {
  return `${path}${path.includes("?") ? "&" : "?"}page=${page}`;
}

async function cargarAuditoriaCompleta() {
  const filas: FilaAuditoria[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const response = await apiFetch(conPagina("/auditoria/", page));
    if (!response.ok) {
      throw new Error(`No se pudo cargar la auditoria (HTTP ${response.status}).`);
    }

    const payload = (await response.json()) as unknown;
    filas.push(...normalizarFilas(payload));
    hasNext = tieneSiguiente(payload) && !Array.isArray(payload);
    page += 1;
  }

  return filas;
}

function formatearFecha(value?: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function esHoy(value?: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export default function AuditPage() {
  const [filas, setFilas] = useState<FilaAuditoria[]>([]);
  const [consulta, setConsulta] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [errorMensaje, setErrorMensaje] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargar() {
      setCargando(true);
      setErrorMensaje("");

      try {
        const datos = await cargarAuditoriaCompleta();
        if (activo) {
          setFilas(datos);
        }
      } catch (error) {
        if (activo) {
          setErrorMensaje(error instanceof Error ? error.message : "No se pudo cargar la auditoria.");
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargar();

    return () => {
      activo = false;
    };
  }, []);

  const filasFiltradas = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    if (!q) {
      return filas;
    }

    return filas.filter((fila) =>
      `${fila.id} ${fila.description ?? ""} ${fila.created_username ?? ""} ${fila.created_id ?? ""} ${fila.created_at ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [consulta, filas]);

  const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / FILAS_POR_PAGINA));
  const filasPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * FILAS_POR_PAGINA;
    return filasFiltradas.slice(inicio, inicio + FILAS_POR_PAGINA);
  }, [filasFiltradas, paginaActual]);

  const metricas = useMemo(() => {
    const hoy = filas.filter((fila) => esHoy(fila.created_at)).length;
    const conUsuario = filas.filter((fila) => fila.created_id).length;
    const sinUsuario = filas.length - conUsuario;
    return { total: filas.length, hoy, conUsuario, sinUsuario };
  }, [filas]);

  useEffect(() => {
    setPaginaActual(1);
  }, [consulta]);

  useEffect(() => {
    setPaginaActual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);

  if (cargando) {
    return <LoadingState label="Cargando auditoria..." />;
  }

  return (
    <div className="cm-shell cm-page">
      <div className="w-full">
        <PageHeader
          eyebrow="Administracion"
          title="Auditoria"
          description="Registro cronologico de creaciones, modificaciones y acciones relevantes realizadas en el sistema."
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Registros" value={metricas.total} tone="info" />
          <MetricCard label="Hoy" value={metricas.hoy} tone="success" />
          <MetricCard label="Con usuario" value={metricas.conUsuario} />
          <MetricCard label="Sistema" value={metricas.sinUsuario} tone="warning" />
        </div>

        <SearchBar
          value={consulta}
          onChange={(event) => setConsulta(event.target.value)}
          onClear={() => setConsulta("")}
          placeholder="Buscar por descripcion, usuario, UUID o fecha..."
          resultLabel={`${filasFiltradas.length} de ${filas.length} registros`}
        />

        {errorMensaje ? <ErrorBanner message={errorMensaje} className="mt-4" /> : null}

        {filasFiltradas.length === 0 ? (
          <EmptyState
            title="No hay registros de auditoria"
            description={consulta ? "Prueba con otra busqueda o limpia el filtro." : "Cuando se realicen acciones auditadas apareceran aqui."}
          />
        ) : (
          <>
            <DataTable minWidth="980px">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Descripcion</th>
                </tr>
              </thead>
              <tbody>
                {filasPaginadas.map((fila) => (
                  <tr key={fila.id}>
                    <td className="font-mono text-xs">#{fila.id}</td>
                    <td>{formatearFecha(fila.created_at)}</td>
                    <td>
                      <span className="cm-badge-info rounded-full px-2 py-1">
                        {fila.created_username || "Sistema"}
                      </span>
                    </td>
                    <td className="max-w-xl">
                      <p className="whitespace-normal text-sm leading-6 text-[color:var(--cm-text)]">
                        {fila.description || "Sin descripcion"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination
              page={paginaActual}
              totalPages={totalPaginas}
              visibleCount={filasPaginadas.length}
              totalCount={filasFiltradas.length}
              itemLabel="registros"
              onPrevious={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
              onNext={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
            />
          </>
        )}
      </div>
    </div>
  );
}
