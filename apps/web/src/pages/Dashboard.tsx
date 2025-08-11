import { useUserQuery, useBookQuery, useCheckoutQuery } from "../lib/api-client";
import { useRealtime } from "../contexts/RealtimeContext";
import { StatCard, Card, CardHeader, CardContent, Badge } from "../components/ui";
import { Book, AlertTriangle, CheckCircle, Clock, TrendingUp, Activity } from "lucide-react";

export function Dashboard() {
  const { data: user } = useUserQuery.getCurrentUser();
  const { data: overdueCheckouts } = useCheckoutQuery.getOverdueCheckouts();
  const { data: totalBooks } = useBookQuery.getTotalCount();
  const { data: activeCheckouts } = useCheckoutQuery.getActiveCount();
  const { isConnected } = useRealtime();

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back to your library management system</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={isConnected ? "success" : "danger"} className="flex items-center">
              <Activity className={`w-3 h-3 mr-1 ${isConnected ? "animate-pulse" : ""}`} />
              {isConnected ? "Live Updates" : "Offline"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Books"
            value={totalBooks ?? "-"}
            subtitle="Books in collection"
            icon={<Book className="w-6 h-6 text-blue-600" />}
            trend={{ value: 12, isPositive: true }}
          />

          <StatCard
            title="Active Checkouts"
            value={activeCheckouts ?? "-"}
            subtitle="Currently borrowed"
            icon={<CheckCircle className="w-6 h-6 text-green-600" />}
            trend={{ value: 8, isPositive: true }}
          />

          <StatCard
            title="Overdue Items"
            value={overdueCheckouts?.length ?? 0}
            subtitle="Need attention"
            icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
            trend={{ value: 3, isPositive: false }}
          />
        </div>

        {user && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">
                    {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Welcome back, {user.name}!
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-gray-600">Role:</span>
                    <Badge variant={user.role === "ADMIN" ? "info" : "default"}>{user.role}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Book returned</p>
                    <p className="text-xs text-gray-500">The Great Gatsby by F. Scott Fitzgerald</p>
                  </div>
                  <Badge variant="success" size="sm">
                    Completed
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">New checkout</p>
                    <p className="text-xs text-gray-500">To Kill a Mockingbird by Harper Lee</p>
                  </div>
                  <Badge variant="info" size="sm">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Overdue reminder</p>
                    <p className="text-xs text-gray-500">1984 by George Orwell</p>
                  </div>
                  <Badge variant="warning" size="sm">
                    Overdue
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900">Quick Stats</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Circulation Rate</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: "78%" }}></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">78%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Return Rate</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: "92%" }}></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">92%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">User Satisfaction</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: "95%" }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">95%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
