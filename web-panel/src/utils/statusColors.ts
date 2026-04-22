export const STATUS_COLOR = {
  abierto: "#16A34A",
  alerta: "#F97316",
  evaluacion: "#EAB308",
  cerrado: "#94A3B8",
  critico: "#DC2626",
} as const;

export function getIncidentStatusBadge(status?: string | null) {
  if (status === "OPEN") return "cm-badge-success";
  if (status === "TRIAGE") return "cm-badge-warning";
  if (status === "CLOSED") return "cm-badge-neutral";
  return "cm-badge-info";
}

export function getAlertStatusBadge(status?: string | null) {
  if (status === "OPEN") return "cm-badge-success";
  if (status === "ACK") return "cm-badge-warning";
  if (status === "CLOSED") return "cm-badge-neutral";
  return "cm-badge-info";
}

export function getAlertSeverityBadge(severity?: number | null) {
  if ((severity ?? 5) <= 2) return "cm-badge-danger";
  if ((severity ?? 5) === 3) return "cm-badge-alert";
  if ((severity ?? 5) === 4) return "cm-badge-warning";
  return "cm-badge-info";
}

export function getIncidentMarkerColor(status?: string | null) {
  if (status === "OPEN") return STATUS_COLOR.abierto;
  if (status === "TRIAGE") return STATUS_COLOR.evaluacion;
  if (status === "CLOSED") return STATUS_COLOR.cerrado;
  return STATUS_COLOR.alerta;
}
