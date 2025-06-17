import { useState } from "react";
import { trpc } from "../main";

export function Books() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: books, isLoading } = trpc.book.list.useQuery({
    query: searchQuery,
    limit: 20,
    offset: 0,
  });

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Books</h1>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search books..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full max-w-md border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading books...</div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {books?.items.map((book) => (
              <li key={book.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{book.title}</h3>
                    <p className="text-sm text-gray-500">by {book.author}</p>
                    <p className="text-sm text-gray-500">ISBN: {book.isbn}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">
                      {book.availableCopies} of {book.totalCopies} available
                    </p>
                  </div>
                </div>
              </li>
            )) ?? (
              <li className="px-6 py-4 text-center text-gray-500">
                No books found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}