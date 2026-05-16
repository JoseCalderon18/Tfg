import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as unitsService from '../services/units';
import type { Unit, UnitDetail, UnitStats } from '../services/units';
import { useAuth } from './AuthContext';

interface UnitsContextType {
  units: Unit[];
  selectedUnit: UnitDetail | null;
  stats: UnitStats | null;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;

  // Acciones
  fetchUnits: (filters?: any) => Promise<void>;
  fetchUnitDetail: (unitId: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  changeUnitStatus: (unitId: string, newStatus: string, reason?: string) => Promise<void>;
  recordConsumption: (unitId: string, consumption: any) => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<UnitDetail | null>(null);
  const [stats, setStats] = useState<UnitStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchUnits = useCallback(
    async (filters?: any) => {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);
        const response = await unitsService.getUnits(token, filters);
        setUnits(response.results);
        setLastUpdate(new Date());
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al obtener unidades';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const fetchUnitDetail = useCallback(
    async (unitId: string) => {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);
        const unit = await unitsService.getUnitDetail(token, unitId);
        setSelectedUnit(unit);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al obtener detalles de la unidad';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const fetchStats = useCallback(
    async () => {
      if (!token) return;
      try {
        const unitStats = await unitsService.getUnitsStats(token);
        setStats(unitStats);
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    },
    [token]
  );

  const changeUnitStatus = useCallback(
    async (unitId: string, newStatus: string, reason?: string) => {
      if (!token) return;
      try {
        setError(null);
        await unitsService.changeUnitStatus(token, unitId, {
          status_nuevo: newStatus,
          razon: reason,
        });

        // Actualizar lista
        await fetchUnits();
        if (selectedUnit?.id === unitId) {
          await fetchUnitDetail(unitId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cambiar estado';
        setError(message);
        throw err;
      }
    },
    [token, selectedUnit, fetchUnits, fetchUnitDetail]
  );

  const recordConsumption = useCallback(
    async (unitId: string, consumption: any) => {
      if (!token) return;
      try {
        setError(null);
        const updated = await unitsService.recordConsumption(token, unitId, consumption);
        setSelectedUnit(updated);

        // Actualizar en lista si existe
        setUnits((prevUnits) =>
          prevUnits.map((u) => (u.id === unitId ? { ...u, ...updated } : u))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrar consumo';
        setError(message);
        throw err;
      }
    },
    [token]
  );

  const refreshAllData = useCallback(
    async () => {
      if (!token) return;
      try {
        setLoading(true);
        await Promise.all([fetchUnits(), fetchStats()]);
      } finally {
        setLoading(false);
      }
    },
    [token, fetchUnits, fetchStats]
  );

  return (
    <UnitsContext.Provider
      value={{
        units,
        selectedUnit,
        stats,
        loading,
        error,
        lastUpdate,
        fetchUnits,
        fetchUnitDetail,
        fetchStats,
        changeUnitStatus,
        recordConsumption,
        refreshAllData,
      }}
    >
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits() {
  const context = useContext(UnitsContext);
  if (context === undefined) {
    throw new Error('useUnits must be used within a UnitsProvider');
  }
  return context;
}
