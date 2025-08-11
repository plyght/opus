import { useState } from "react";
import { useBookQuery } from "../lib/api-client";
import { useLiveBook, useRealtime } from "../contexts/RealtimeContext";
import { Card, CardContent, Input, Button, Badge, Modal } from "../components/ui";
import { Search, BookOpen, Plus, Edit, Activity, QrCode } from "lucide-react";

function BookItem({ book }: { book: any }) {
  const liveBook = useLiveBook(book);
  const isLive = liveBook !== book;
  const [showDetails, setShowDetails] = useState(false);

  const availabilityStatus = liveBook.availableCopies > 0 ? "available" : "unavailable";
  const statusColor = availabilityStatus === "available" ? "success" : "danger";

  return (
    <>
      <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-900">{liveBook.title}</h3>
                {isLive && (
                  <Badge variant="info" size="sm" className="flex items-center">
                    <Activity className="w-3 h-3 mr-1 animate-pulse" />
                    Live
                  </Badge>
                )}
              </div>
              <p className="text-gray-600">by {liveBook.author}</p>
              <p className="text-sm text-gray-500">ISBN: {liveBook.isbn}</p>
              <div className="flex items-center space-x-4 mt-3">
                <Badge variant={statusColor}>
                  {liveBook.availableCopies} of {liveBook.totalCopies} available
                </Badge>
                <Badge variant="default" size="sm">
                  {liveBook.genre || "General"}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <Button size="sm" variant="outline" onClick={() => setShowDetails(true)}>
                <Edit className="w-4 h-4 mr-1" />
                Details
              </Button>
              <Button size="sm" variant="ghost">
                <QrCode className="w-4 h-4 mr-1" />
                QR Code
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={liveBook.title}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700">Author</h4>
              <p className="text-gray-900">{liveBook.author}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">ISBN</h4>
              <p className="text-gray-900">{liveBook.isbn}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">Total Copies</h4>
              <p className="text-gray-900">{liveBook.totalCopies}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">Available</h4>
              <p className="text-gray-900">{liveBook.availableCopies}</p>
            </div>
          </div>
          {liveBook.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
              <p className="text-gray-600 text-sm">{liveBook.description}</p>
            </div>
          )}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
            <Button variant="primary">Edit Book</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function Books() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const { isConnected } = useRealtime();
  const { data: books, isLoading } = useBookQuery.list({
    query: searchQuery,
    limit: 20,
    offset: 0,
  });

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Books</h1>
          <p className="text-gray-600 mt-1">Manage your library collection</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={isConnected ? "success" : "danger"} className="flex items-center">
            <Activity className={`w-3 h-3 mr-1 ${isConnected ? "animate-pulse" : ""}`} />
            {isConnected ? "Live Updates" : "Offline"}
          </Badge>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Book
          </Button>
        </div>
      </div>

      <div className="mb-6 flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search books by title, author, or ISBN..."
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
          <p className="text-gray-500 mt-4">Loading books...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books?.items.map((book) => <BookItem key={book.id} book={book} />) ?? (
            <div className="col-span-full text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No books found</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowAddModal(true)}>
                Add your first book
              </Button>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Book"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Title" placeholder="Enter book title" />
            <Input label="Author" placeholder="Enter author name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="ISBN" placeholder="Enter ISBN" />
            <Input label="Genre" placeholder="Enter genre" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Total Copies"
              type="number"
              placeholder="Enter number of copies"
              min="1"
            />
            <Input label="Publisher" placeholder="Enter publisher" />
          </div>
          <Input label="Description" placeholder="Enter book description (optional)" />
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary">Add Book</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
