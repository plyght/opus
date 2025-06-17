import { trpc } from "../main";

export function Dashboard() {
  const { data: user } = trpc.user.getCurrentUser.useQuery();
  const { data: overdueCheckouts } = trpc.checkout.getOverdueCheckouts.useQuery();

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Total Books</h3>
            <p className="text-3xl font-bold text-blue-600">-</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Active Checkouts</h3>
            <p className="text-3xl font-bold text-green-600">-</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Overdue Items</h3>
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