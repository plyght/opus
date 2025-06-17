import { useState } from "react";
import { trpc } from "../main";
import { useLiveCheckout, useRealtime } from "../contexts/RealtimeContext";

function CheckoutItem({ 
  checkout, 
  onReturn, 
  onRenew 
}: { 
  checkout: any;
  onReturn: (id: string) => void;
  onRenew: (id: string) => void;
}) {
  const liveCheckout = useLiveCheckout(checkout);
  const isLive = liveCheckout !== checkout;

  return (
    <li key={liveCheckout.id} className="px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-medium text-gray-900">
              {liveCheckout.book.title}
            </h3>
            {isLive && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-1 animate-pulse"></span>
                Live
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            by {liveCheckout.book.author} • ISBN: {liveCheckout.book.isbn}
          </p>
          <p className="text-sm text-gray-500">
            Checked out by: {liveCheckout.user.name} ({liveCheckout.user.email})
          </p>
          <p className="text-sm text-gray-500">
            Due: {new Date(liveCheckout.dueDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            liveCheckout.status === "ACTIVE" 
              ? "bg-green-100 text-green-800"
              : liveCheckout.status === "OVERDUE"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}>
            {liveCheckout.status}
          </span>
          {liveCheckout.status === "ACTIVE" && (
            <div className="space-x-2">
              <button
                onClick={() => onReturn(liveCheckout.id)}
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                Return
              </button>
              {liveCheckout.renewalCount < liveCheckout.maxRenewals && (
                <button
                  onClick={() => onRenew(liveCheckout.id)}
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
  );
}

export function Checkouts() {
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "RETURNED" | "OVERDUE" | undefined>();
  const { isConnected } = useRealtime();
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Checkouts</h1>
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
              <CheckoutItem 
                key={checkout.id} 
                checkout={checkout} 
                onReturn={handleReturn}
                onRenew={handleRenew}
              />
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