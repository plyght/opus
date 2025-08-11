import { useState } from "react";
import { useUserQuery } from "../lib/api-client";
import { Card, CardContent, Input, Button, Badge, Modal } from "../components/ui";
import { Search, Users as UsersIcon, Plus, Edit, UserCheck, Mail } from "lucide-react";

function UserItem({ user }: { user: any }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                  <Badge variant={user.role === "ADMIN" ? "info" : "default"} size="sm">
                    {user.role}
                  </Badge>
                </div>
                <div className="flex items-center space-x-1 text-gray-500">
                  <Mail className="w-4 h-4" />
                  <p className="text-sm">{user.email}</p>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Max checkouts: {user.maxCheckouts}</span>
                  <span>•</span>
                  <span>Active: {user.activeCheckouts || 0}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <Button size="sm" variant="outline" onClick={() => setShowDetails(true)}>
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button size="sm" variant="ghost">
                <UserCheck className="w-4 h-4 mr-1" />
                History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="User Details"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-2xl">
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
              <p className="text-gray-600">{user.email}</p>
              <Badge variant={user.role === "ADMIN" ? "info" : "default"}>{user.role}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700">Max Checkouts</h4>
              <p className="text-gray-900">{user.maxCheckouts}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">Active Checkouts</h4>
              <p className="text-gray-900">{user.activeCheckouts || 0}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">Total Checkouts</h4>
              <p className="text-gray-900">{user.totalCheckouts || 0}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">Member Since</h4>
              <p className="text-gray-900">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
            <Button variant="primary">Edit User</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function Users() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: users, isLoading } = useUserQuery.list({
    query: searchQuery,
    limit: 20,
    offset: 0,
  });

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">Manage library members and staff</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <div className="mb-6 flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button variant="outline">
          <Search className="w-4 h-4 mr-2" />
          Advanced Search
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading users...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users?.items.map((user) => <UserItem key={user.id} user={user} />) ?? (
            <div className="text-center py-12">
              <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowAddModal(true)}>
                Add your first user
              </Button>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New User"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" placeholder="Enter full name" />
            <Input label="Email" type="email" placeholder="Enter email address" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <Input
              label="Max Checkouts"
              type="number"
              placeholder="Enter max checkouts"
              min="1"
              defaultValue="5"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary">Add User</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
