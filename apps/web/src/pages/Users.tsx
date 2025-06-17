import { useState } from "react";
import { useUserQuery } from "../lib/api-client";

export function Users() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: users, isLoading } = useUserQuery.list({
    query: searchQuery,
    limit: 20,
    offset: 0,
  });

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full max-w-md border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading users...</div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {users?.items.map((user) => (
              <li key={user.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === "ADMIN" 
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {user.role}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      Max checkouts: {user.maxCheckouts}
                    </p>
                  </div>
                </div>
              </li>
            )) ?? (
              <li className="px-6 py-4 text-center text-gray-500">
                No users found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}