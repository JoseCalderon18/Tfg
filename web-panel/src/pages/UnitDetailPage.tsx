import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import '../styles/pages.css';

interface Unit {
  id: string;
  name: string;
  type: string;
  vehicle_id: string;
  status: 'DISPONIBLE' | 'EN_VIAJE' | 'EN_MANTENIMIENTO' | 'OFFLINE' | 'CARGANDO';
  fuel_level: number;
  battery_level: number;
  total_mileage: number;
  is_active: boolean;
  driver?: { id: string; first_name: string; last_name: string };
  consumption_alert: string[];
  status_history: any[];
  recent_consumption: any[];
  location_history: any[];
  created_at: string;
  updated_at: string;
}

export default function UnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState<string>('');
  const [changingStatus, setChangingStatus] = useState(false);

  useEffect(() => {
    const fetchUnit = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const response = await apiFetch(`/units/${id}/`);
        const data = await response.json();
        setUnit(data);
        setNewStatus(data.status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar la unidad');
      } finally {
        setLoading(false);
      }
    };

    fetchUnit();
  }, [id]);

  const handleStatusChange = async () => {
    if (!id || !newStatus) return;

    try {
      setChangingStatus(true);
      setError(null);
      const response = await apiFetch(`/units/${id}/change_status/`, {
        method: 'POST',
        body: JSON.stringify({
          status_nuevo: newStatus,
          razon: statusReason,
        }),
      });

      if (!response.ok) throw new Error('No se pudo cambiar el estado');

      // Recargar unidad
      const updatedResponse = await apiFetch(`/units/${id}/`);
      const updatedUnit = await updatedResponse.json();
      setUnit(updatedUnit);
      setStatusReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado');
    } finally {
      setChangingStatus(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: { [key: string]: string } = {
      DISPONIBLE: '#10b981',
      EN_VIAJE: '#3b82f6',
      EN_MANTENIMIENTO: '#f59e0b',
      OFFLINE: '#ef4444',
      CARGANDO: '#3b82f6',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status: string): string => {
    const labels: { [key: string]: string } = {
      DISPONIBLE: 'Disponible',
      EN_VIAJE: 'En viaje',
      EN_MANTENIMIENTO: 'En mantenimiento',
      OFFLINE: 'Offline',
      CARGANDO: 'Cargando',
    };
    return labels[status] || status;
  };

  if (loading) return <div className="page-container"><div className="loading">Cargando...</div></div>;
  if (error) return <div className="page-container"><div className="error-message">{error}</div></div>;
  if (!unit) return <div className="page-container"><div className="error-message">Unidad no encontrada</div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="btn btn-secondary" onClick={() => navigate('/units')}>
          ← Volver
        </button>
        <h1>{unit.name}</h1>
        <button className="btn btn-primary" onClick={() => navigate(`/edit-unit/${unit.id}`)}>
          Editar
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Información básica */}
      <div className="card">
        <h2>Información General</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Nombre</label>
            <p>{unit.name}</p>
          </div>
          <div className="info-item">
            <label>Tipo</label>
            <p>{unit.type}</p>
          </div>
          <div className="info-item">
            <label>Placa</label>
            <p className="monospace">{unit.vehicle_id}</p>
          </div>
          <div className="info-item">
            <label>Estado</label>
            <p>
              <span
                className="status-badge"
                style={{ backgroundColor: getStatusColor(unit.status) }}
              >
                {getStatusLabel(unit.status)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Recursos */}
      <div className="card">
        <h2>Recursos</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Combustible</label>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${unit.fuel_level}%`,
                  backgroundColor: unit.fuel_level > 20 ? '#10b981' : '#ef4444',
                }}
              />
            </div>
            <p>{unit.fuel_level.toFixed(1)}%</p>
          </div>
          <div className="info-item">
            <label>Batería</label>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${unit.battery_level}%`,
                  backgroundColor: unit.battery_level > 15 ? '#10b981' : '#ef4444',
                }}
              />
            </div>
            <p>{unit.battery_level.toFixed(1)}%</p>
          </div>
          <div className="info-item">
            <label>Kilometraje Total</label>
            <p>{unit.total_mileage.toFixed(1)} km</p>
          </div>
        </div>

        {/* Alertas */}
        {unit.consumption_alert && unit.consumption_alert.length > 0 && (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fee2e2', borderRadius: '8px' }}>
            <h3 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>⚠ Alertas</h3>
            {unit.consumption_alert.includes('combustible_bajo') && (
              <p>Combustible bajo - Se recomienda recargar</p>
            )}
            {unit.consumption_alert.includes('bateria_baja') && (
              <p>Batería baja - Se recomienda revisar el dispositivo</p>
            )}
          </div>
        )}
      </div>

      {/* Cambiar estado */}
      <div className="card">
        <h2>Cambiar Estado</h2>
        <div className="form-group">
          <label>Nuevo Estado</label>
          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
            <option value="DISPONIBLE">Disponible</option>
            <option value="EN_VIAJE">En viaje</option>
            <option value="EN_MANTENIMIENTO">En mantenimiento</option>
            <option value="OFFLINE">Offline</option>
            <option value="CARGANDO">Cargando</option>
          </select>
        </div>
        <div className="form-group">
          <label>Razón (opcional)</label>
          <textarea
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            placeholder="Ingrese la razón del cambio..."
            rows={3}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={handleStatusChange}
          disabled={changingStatus || newStatus === unit.status}
        >
          {changingStatus ? 'Cambiando...' : 'Cambiar Estado'}
        </button>
      </div>

      {/* Conductor */}
      {unit.driver && (
        <div className="card">
          <h2>Conductor</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Nombre</label>
              <p>{unit.driver.first_name} {unit.driver.last_name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Historial de consumo */}
      {unit.recent_consumption && unit.recent_consumption.length > 0 && (
        <div className="card">
          <h2>Consumo Reciente</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Combustible</th>
                <th>Batería</th>
                <th>Distancia</th>
                <th>Consumo/km</th>
              </tr>
            </thead>
            <tbody>
              {unit.recent_consumption.map((record: any) => (
                <tr key={record.id}>
                  <td>{new Date(record.created_at).toLocaleString('es-ES')}</td>
                  <td>{record.fuel_level.toFixed(1)}%</td>
                  <td>{record.battery_level.toFixed(1)}%</td>
                  <td>{record.distance_km.toFixed(1)} km</td>
                  <td>{record.fuel_consumption_rate.toFixed(2)}/km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Historial de estados */}
      {unit.status_history && unit.status_history.length > 0 && (
        <div className="card">
          <h2>Historial de Cambios de Estado</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cambio</th>
                <th>Razón</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {unit.status_history.map((record: any) => (
                <tr key={record.id}>
                  <td>{new Date(record.created_at).toLocaleString('es-ES')}</td>
                  <td>
                    {getStatusLabel(record.status_anterior)} → {getStatusLabel(record.status_nuevo)}
                  </td>
                  <td>{record.razon || '-'}</td>
                  <td>
                    {record.created_by
                      ? `${record.created_by.first_name} ${record.created_by.last_name}`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
