import React, { useState, useEffect } from 'react';

interface Unidad {
    id: string;
    nombre: string;
    descripcion: string;
    estado: 'activo' | 'inactivo';
    fechaCreacion: string;
}

export const ViewUnidadesPage: React.FC = () => {
    const [unidades, setUnidades] = useState<Unidad[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch units data
        const fetchUnidades = async () => {
            try {
                // Replace with your API endpoint
                // const response = await fetch('/api/unidades');
                // const data = await response.json();
                // setUnidades(data);
                setUnidades([]); // Placeholder
            } catch (error) {
                console.error('Error fetching units:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUnidades();
    }, []);

    if (loading) return <div className="p-4">Cargando...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Unidades</h1>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full border-collapse">
                    <thead className="bg-blue-600 text-white">
                        <tr>
                            <th className="px-6 py-3 text-left">ID</th>
                            <th className="px-6 py-3 text-left">Nombre</th>
                            <th className="px-6 py-3 text-left">Descripción</th>
                            <th className="px-6 py-3 text-left">Estado</th>
                            <th className="px-6 py-3 text-left">Fecha Creación</th>
                        </tr>
                    </thead>
                    <tbody>
                        {unidades.length > 0 ? (
                            unidades.map((unidad) => (
                                <tr key={unidad.id} className="border-b hover:bg-gray-100">
                                    <td className="px-6 py-4 text-sm text-gray-700">{unidad.id}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{unidad.nombre}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{unidad.descripcion}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                unidad.estado === 'activo'
                                                    ? 'bg-green-200 text-green-800'
                                                    : 'bg-red-200 text-red-800'
                                            }`}
                                        >
                                            {unidad.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{unidad.fechaCreacion}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No hay unidades disponibles
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};