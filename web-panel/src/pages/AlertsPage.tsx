export default function AlertsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Alertas</h1>

      <div className="mb-4 flex gap-2">
        <button className="px-4 py-2 bg-red-100 text-red-700 rounded">Open</button>
        <button className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded">Acknowledged</button>
        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded">Closed</button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4">
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold">SOS</span>
              </td>
              <td className="px-6 py-4">Emergency Help Needed</td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Critical</span>
              </td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Open</span>
              </td>
              <td className="px-6 py-4">2 min ago</td>
              <td className="px-6 py-4">
                <button className="text-yellow-600 hover:text-yellow-900 mr-2">ACK</button>
                <button className="text-blue-600 hover:text-blue-900">View</button>
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4">
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-bold">MAN_DOWN</span>
              </td>
              <td className="px-6 py-4">Operative Down</td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Critical</span>
              </td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">ACK</span>
              </td>
              <td className="px-6 py-4">5 min ago</td>
              <td className="px-6 py-4">
                <button className="text-green-600 hover:text-green-900 mr-2">Close</button>
                <button className="text-blue-600 hover:text-blue-900">View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
