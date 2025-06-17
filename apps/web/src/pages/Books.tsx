import { useState } from "react";
import { useBookQuery } from "../lib/api-client";
import { useLiveBook, useRealtime } from "../contexts/RealtimeContext";

function BookItem({ book }: { book: any }) {
  const liveBook = useLiveBook(book);
  const isLive = liveBook !== book;

  return (
    <li key={liveBook.id} className="px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900">{liveBook.title}</h3>
          <p className="text-sm text-gray-500">by {liveBook.author}</p>
          <p className="text-sm text-gray-500">ISBN: {liveBook.isbn}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-900">
              {liveBook.availableCopies} of {liveBook.totalCopies} available
            </p>
            {isLive && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-1 animate-pulse"></span>
                Live
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function Books() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isConnected } = useRealtime();
  const { data: books, isLoading } = useBookQuery.list({
    query: searchQuery,
    limit: 20,
    offset: 0,
  });

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Books</h1>
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
              <BookItem key={book.id} book={book} />
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