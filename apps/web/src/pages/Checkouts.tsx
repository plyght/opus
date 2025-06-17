import { useState } from "react";
import { trpc } from "../main";

export function Checkouts() {
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "RETURNED" | "OVERDUE" | undefined>();
  const { data: checkouts, isLoading } = trpc.checkout.list.useQuery({
    status: statusFilter,
    limit: 20,
    offset: 0,
  });

  const returnMutation = trpc.checkout.returnBook.useMutation();
  const renewMutation = trpc.checkout.renewCheckout.useMutation();

  const handleReturn = async (checkoutId: string) => {
    try {
      await returnMutation.mutateAsync({ checkoutId });
      alert("Book returned successfully!");
    } catch (error) {
      alert(`Failed to return book: ${error}`);
    }
  };

  const handleRenew = async (checkoutId: string) => {
    try {
      await renewMutation.mutateAsync({ checkoutId });
      alert("Checkout renewed successfully!");
    } catch (error) {
      alert(`Failed to renew checkout: ${error}`);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Checkouts</h1>
      </div>

      <div className="mb-6">
        <select
          value={statusFilter || ""}
          onChange={(e) => setStatusFilter(e.target.value as any || undefined)}
          className="block w-full max-w-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="OVERDUE">Overdue</option>
          <option value="RETURNED">Returned</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading checkouts...</div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {checkouts?.items.map((checkout) => (
              <li key={checkout.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {checkout.book.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      by {checkout.book.author} • ISBN: {checkout.book.isbn}
                    </p>
                    <p className="text-sm text-gray-500">
                      Checked out by: {checkout.user.name} ({checkout.user.email})
                    </p>
                    <p className="text-sm text-gray-500">
                      Due: {new Date(checkout.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      checkout.status === "ACTIVE" 
                        ? "bg-green-100 text-green-800"
                        : checkout.status === "OVERDUE"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {checkout.status}
                    </span>
                    {checkout.status === "ACTIVE" && (
                      <div className="space-x-2">
                        <button
                          onClick={() => handleReturn(checkout.id)}
                          className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        >
                          Return
                        </button>
                        {checkout.renewalCount < checkout.maxRenewals && (
                          <button
                            onClick={() => handleRenew(checkout.id)}
                            className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                          >
                            Renew
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )) ?? (
              <li className="px-6 py-4 text-center text-gray-500">
                No checkouts found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}