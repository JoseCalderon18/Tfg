export default function IncidentsPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Incidents</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          New Incident
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4">Forest Fire - Zone A</td>
              <td className="px-6 py-4">Wildfire</td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Open</span>
              </td>
              <td className="px-6 py-4">2024-01-15 14:30</td>
              <td className="px-6 py-4">
                <button className="text-blue-600 hover:text-blue-900 mr-2">View</button>
                <button className="text-red-600 hover:text-red-900">Close</button>
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4">Missing Person Search</td>
              <td className="px-6 py-4">Search</td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Open</span>
              </td>
              <td className="px-6 py-4">2024-01-15 10:00</td>
              <td className="px-6 py-4">
                <button className="text-blue-600 hover:text-blue-900 mr-2">View</button>
                <button className="text-red-600 hover:text-red-900">Close</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
