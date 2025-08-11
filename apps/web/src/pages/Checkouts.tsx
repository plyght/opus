import { useState } from "react";
import { useCheckoutQuery, useCheckoutMutation } from "../lib/api-client";
import { useLiveCheckout, useRealtime } from "../contexts/RealtimeContext";
import { Card, CardContent, Button, Badge, Modal, Select } from "../components/ui";
import { Activity, RefreshCw, RotateCcw, Clock, AlertTriangle, CheckCircle } from "lucide-react";

function CheckoutItem({
  checkout,
  onReturn,
  onRenew,
}: {
  checkout: any;
  onReturn: (id: string) => void;
  onRenew: (id: string) => void;
}) {
  const liveCheckout = useLiveCheckout(checkout);
  const isLive = liveCheckout !== checkout;
  const [showDetails, setShowDetails] = useState(false);

  const isOverdue = new Date(liveCheckout.dueDate) < new Date();
  const daysUntilDue = Math.ceil(
    (new Date(liveCheckout.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "OVERDUE":
        return "danger";
      case "RETURNED":
        return "default";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="w-4 h-4" />;
      case "OVERDUE":
        return <AlertTriangle className="w-4 h-4" />;
      case "RETURNED":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900">{liveCheckout.book.title}</h3>
                {isLive && (
                  <Badge variant="info" size="sm" className="flex items-center">
                    <Activity className="w-3 h-3 mr-1 animate-pulse" />
                    Live
                  </Badge>
                )}
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <p>
                  by {liveCheckout.book.author} • ISBN: {liveCheckout.book.isbn}
                </p>
                <p>
                  Checked out by: {liveCheckout.user.name} ({liveCheckout.user.email})
                </p>
                <div className="flex items-center space-x-4">
                  <span
                    className={`flex items-center space-x-1 ${isOverdue ? "text-red-600" : "text-gray-600"}`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Due: {new Date(liveCheckout.dueDate).toLocaleDateString()}</span>
                  </span>
                  {daysUntilDue > 0 && (
                    <span className="text-green-600">({daysUntilDue} days left)</span>
                  )}
                  {daysUntilDue < 0 && (
                    <span className="text-red-600">({Math.abs(daysUntilDue)} days overdue)</span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge
                  variant={getStatusVariant(liveCheckout.status)}
                  className="flex items-center"
                >
                  {getStatusIcon(liveCheckout.status)}
                  <span className="ml-1">{liveCheckout.status}</span>
                </Badge>
                {liveCheckout.renewalCount > 0 && (
                  <Badge variant="default" size="sm">
                    Renewed {liveCheckout.renewalCount}/{liveCheckout.maxRenewals}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <Button size="sm" variant="outline" onClick={() => setShowDetails(true)}>
                Details
              </Button>
              {liveCheckout.status === "ACTIVE" && (
                <>
                  <Button size="sm" variant="primary" onClick={() => onReturn(liveCheckout.id)}>
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Return
                  </Button>
                  {liveCheckout.renewalCount < liveCheckout.maxRenewals && (
                    <Button size="sm" variant="secondary" onClick={() => onRenew(liveCheckout.id)}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Renew
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Checkout Details"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700">Book</h4>
              <p className="text-gray-900">{liveCheckout.book.title}</p>
              <p className="text-sm text-gray-500">by {liveCheckout.book.author}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">Borrower</h4>
              <p className="text-gray-900">{liveCheckout.user.name}</p>
              <p className="text-sm text-gray-500">{liveCheckout.user.email}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">Checkout Date</h4>
              <p className="text-gray-900">
                {new Date(liveCheckout.checkoutDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">Due Date</h4>
              <p className={`${isOverdue ? "text-red-600" : "text-gray-900"}`}>
                {new Date(liveCheckout.dueDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">Status</h4>
              <Badge variant={getStatusVariant(liveCheckout.status)}>{liveCheckout.status}</Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">Renewals</h4>
              <p className="text-gray-900">
                {liveCheckout.renewalCount}/{liveCheckout.maxRenewals}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
            {liveCheckout.status === "ACTIVE" && (
              <Button variant="primary" onClick={() => onReturn(liveCheckout.id)}>
                Return Book
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

export function Checkouts() {
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "RETURNED" | "OVERDUE" | undefined>();
  const { isConnected } = useRealtime();
  const { data: checkouts, isLoading } = useCheckoutQuery.list({
    status: statusFilter,
    limit: 20,
    offset: 0,
  });

  const returnMutation = useCheckoutMutation.returnBook();
  const renewMutation = useCheckoutMutation.renewCheckout();

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

  const statusOptions = [
    { value: "", label: "All statuses" },
    { value: "ACTIVE", label: "Active" },
    { value: "OVERDUE", label: "Overdue" },
    { value: "RETURNED", label: "Returned" },
  ];

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Checkouts</h1>
          <p className="text-gray-600 mt-1">Track and manage book borrowing</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={isConnected ? "success" : "danger"} className="flex items-center">
            <Activity className={`w-3 h-3 mr-1 ${isConnected ? "animate-pulse" : ""}`} />
            {isConnected ? "Live Updates" : "Offline"}
          </Badge>
        </div>
      </div>

      <div className="mb-6">
        <Select
          label="Filter by status"
          value={statusFilter || ""}
          onChange={(e) => setStatusFilter((e.target.value as any) || undefined)}
          options={statusOptions}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading checkouts...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {checkouts?.items.map((checkout) => (
            <CheckoutItem
              key={checkout.id}
              checkout={checkout}
              onReturn={handleReturn}
              onRenew={handleRenew}
            />
          )) ?? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No checkouts found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
