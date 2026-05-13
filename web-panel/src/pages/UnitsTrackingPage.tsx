import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  created_at: string;
  updated_at: string;
}

interface UnitStats {
  total_units: number;
  available_units: number;
  units_in_transit: number;
  units_in_maintenance: number;
  offline_units: number;
  units_low_fuel: number;
  units_low_battery: number;
  average_fuel_level: number;
  average_battery_level: number;
}

export default function UnitsTrackingPage() {
  const navigate = useNavigate();
  const [units, setUnits] = useState<Unit[]>([]);
  const [stats, setStats] = useState<UnitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterType) params.append('type', filterType);

      const response = await apiFetch(`/units/?${params.toString()}`);
      const data = await response.json();
      setUnits(data.results || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar unidades');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiFetch('/units/stats/');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
    fetchStats();
  }, [fetchUnits, fetchStats]);

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

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Seguimiento de Unidades</h1>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => navigate('/new-unit')}
          >
            + Nueva Unidad
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Unidades</div>
            <div className="stat-value">{stats.total_units}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Disponibles</div>
            <div className="stat-value">{stats.available_units}</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-label">En Viaje</div>
            <div className="stat-value">{stats.units_in_transit}</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-label">Mantenimiento</div>
            <div className="stat-value">{stats.units_in_maintenance}</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Combustible Bajo</div>
            <div className="stat-value">{stats.units_low_fuel}</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Batería Baja</div>
            <div className="stat-value">{stats.units_low_battery}</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Estado</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="DISPONIBLE">Disponible</option>
            <option value="EN_VIAJE">En viaje</option>
            <option value="EN_MANTENIMIENTO">En mantenimiento</option>
            <option value="OFFLINE">Offline</option>
            <option value="CARGANDO">Cargando</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Tipo</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Todos</option>
            <option value="AMBULANCIA">Ambulancia</option>
            <option value="BOMBEROS">Bomberos</option>
            <option value="POLICIA">Policía</option>
            <option value="RESCATE">Rescate</option>
            <option value="PATRULLA">Patrulla</option>
          </select>
        </div>
      </div>

      {/* Tabla de unidades */}
      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Cargando unidades...</div>
      ) : units.length === 0 ? (
        <div className="empty-state">No hay unidades disponibles</div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Placa</th>
                <th>Estado</th>
                <th>Combustible</th>
                <th>Batería</th>
                <th>Km Totales</th>
                <th>Conductor</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id}>
                  <td className="bold">{unit.name}</td>
                  <td>{unit.type}</td>
                  <td className="monospace">{unit.vehicle_id}</td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(unit.status) }}
                    >
                      {getStatusLabel(unit.status)}
                    </span>
                  </td>
                  <td>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${unit.fuel_level}%`,
                          backgroundColor: unit.fuel_level > 20 ? '#10b981' : '#ef4444',
                        }}
                      />
                    </div>
                    <small>{unit.fuel_level.toFixed(1)}%</small>
                  </td>
                  <td>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${unit.battery_level}%`,
                          backgroundColor: unit.battery_level > 15 ? '#10b981' : '#ef4444',
                        }}
                      />
                    </div>
                    <small>{unit.battery_level.toFixed(1)}%</small>
                  </td>
                  <td>{unit.total_mileage.toFixed(1)} km</td>
                  <td>{unit.driver ? `${unit.driver.first_name} ${unit.driver.last_name}` : '-'}</td>
                  <td>
                    <button
                      className="btn btn-small btn-info"
                      onClick={() => navigate(`/units/${unit.id}`)}
                    >
                      Ver Detalles
                    </button>
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
