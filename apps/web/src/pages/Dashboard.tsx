import { useUserQuery, useBookQuery, useCheckoutQuery } from "../lib/api-client";
import { useRealtime } from "../contexts/RealtimeContext";

export function Dashboard() {
  const { data: user } = useUserQuery.getCurrentUser();
  const { data: overdueCheckouts } = useCheckoutQuery.getOverdueCheckouts();
  const { data: totalBooks } = useBookQuery.getTotalCount();
  const { data: activeCheckouts } = useCheckoutQuery.getActiveCount();
  const { isConnected } = useRealtime();

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <span className={`w-2 h-2 rounded-full mr-1 ${
                isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}></span>
              {isConnected ? 'Live Updates' : 'Offline'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-900">Total Books</h3>
              {isConnected && (
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              )}
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {totalBooks ?? '-'}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-900">Active Checkouts</h3>
              {isConnected && (
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              )}
            </div>
            <p className="text-3xl font-bold text-green-600">
              {activeCheckouts ?? '-'}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-900">Overdue Items</h3>
              {isConnected && (
                <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
              )}
            </div>
            <p className="text-3xl font-bold text-red-600">
              {overdueCheckouts?.length ?? 0}
            </p>
          </div>
        </div>

        {user && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Welcome back, {user.name}!</h3>
            <p className="text-gray-600">Role: {user.role}</p>
          </div>
        )}
      </div>
    </div>
  );
}