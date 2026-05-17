import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

type MapaMiniUnidadProps = {
  latitud: number | null;
  longitud: number | null;
  etiqueta?: string;
};

export default function MapaMiniUnidad({
  latitud,
  longitud,
  etiqueta = "Ubicación actual de la unidad",
}: MapaMiniUnidadProps) {
  if (latitud == null || longitud == null) {
    return (
      <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-8 text-center text-sm text-[color:var(--cm-text-muted)]">
        La unidad aún no tiene ubicación registrada.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--cm-border)]">
      <MapContainer
        center={[latitud, longitud]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "220px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitud, longitud]}>
          <Popup>{etiqueta}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
