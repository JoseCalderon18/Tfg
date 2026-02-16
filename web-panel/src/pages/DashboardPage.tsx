import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';

export default function DashboardPage() {
  const center: LatLngExpression = [40.4168, -3.7038]; // Madrid

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <div className="lg:col-span-3 grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Active Incidents</h3>
            <p className="text-2xl font-bold">3</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Open Alerts</h3>
            <p className="text-2xl font-bold">5</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Active Operatives</h3>
            <p className="text-2xl font-bold">12</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Pending ACK</h3>
            <p className="text-2xl font-bold">2</p>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Live Map</h2>
          <div className="h-96">
            <MapContainer center={center} zoom={12} className="h-full w-full rounded">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <Marker position={center}>
                <Popup>Central Location</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Recent Alerts</h2>
          <div className="space-y-3">
            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="font-medium">SOS Alert</p>
              <p className="text-sm text-gray-600">2 minutes ago</p>
            </div>
            <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
              <p className="font-medium">Man Down</p>
              <p className="text-sm text-gray-600">5 minutes ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
