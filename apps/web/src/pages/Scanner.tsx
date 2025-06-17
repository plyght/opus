import { useState, useRef, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useUserQuery, useCheckoutMutation } from "../lib/api-client";
import { useRealtime } from "../contexts/RealtimeContext";

export function Scanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string>("");
  const [scanMode, setScanMode] = useState<"checkout" | "add">("checkout");
  const [lastOperation, setLastOperation] = useState<string | null>(null);
  const [operationStatus, setOperationStatus] = useState<"success" | "error" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const checkoutMutation = useCheckoutMutation.checkoutBook();
  const { data: currentUser } = useUserQuery.getCurrentUser();
  const { isConnected } = useRealtime();

  useEffect(() => {
    return () => {
      if (readerRef.current) {
        // Cleanup will be handled by stopping the video stream
        readerRef.current = null;
      }
    };
  }, []);

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      setIsScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });

      videoRef.current.srcObject = stream;
      videoRef.current.play();

      reader.decodeFromVideoDevice(undefined, videoRef.current, (result, _error) => {
        if (result) {
          const code = result.getText();
          setScannedCode(code);
          handleScanResult(code);
          stopScanning();
        }
      });
    } catch (error) {
      console.error("Failed to start scanning:", error);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsScanning(false);
  };

  const handleScanResult = async (isbn: string) => {
    if (scanMode === "checkout") {
      if (!currentUser?.id) {
        setLastOperation("Error: User not authenticated");
        setOperationStatus("error");
        return;
      }
      try {
        setLastOperation(`Checking out book with ISBN: ${isbn}`);
        setOperationStatus(null);
        await checkoutMutation.mutateAsync({ isbn, user_id: currentUser.id });
        setLastOperation(`Book checked out successfully! ISBN: ${isbn}`);
        setOperationStatus("success");
        setTimeout(() => {
          setLastOperation(null);
          setOperationStatus(null);
        }, 5000);
      } catch (error) {
        setLastOperation(`Failed to checkout book: ${error}`);
        setOperationStatus("error");
        setTimeout(() => {
          setLastOperation(null);
          setOperationStatus(null);
        }, 5000);
      }
    } else {
      setScannedCode(isbn);
      setLastOperation(`Scanned ISBN: ${isbn} - Ready to add book`);
      setOperationStatus("success");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scannedCode) {
      handleScanResult(scannedCode);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Barcode Scanner</h1>
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

        {lastOperation && (
          <div className={`mb-6 p-4 rounded-lg ${
            operationStatus === "success" 
              ? "bg-green-50 border border-green-200"
              : operationStatus === "error"
              ? "bg-red-50 border border-red-200"
              : "bg-blue-50 border border-blue-200"
          }`}>
            <div className="flex items-center">
              {operationStatus === "success" && (
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              )}
              {operationStatus === "error" && (
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
              )}
              {!operationStatus && (
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
              )}
              <span className={`text-sm font-medium ${
                operationStatus === "success" 
                  ? "text-green-800"
                  : operationStatus === "error"
                  ? "text-red-800"
                  : "text-blue-800"
              }`}>
                {lastOperation}
              </span>
            </div>
          </div>
        )}

        {currentUser?.role === "ADMIN" && (
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700">Scan Mode</label>
            <div className="mt-2 space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="scanMode"
                  value="checkout"
                  checked={scanMode === "checkout"}
                  onChange={(e) => setScanMode(e.target.value as "checkout" | "add")}
                />
                <span className="ml-2">Checkout Book</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="scanMode"
                  value="add"
                  checked={scanMode === "add"}
                  onChange={(e) => setScanMode(e.target.value as "checkout" | "add")}
                />
                <span className="ml-2">Add New Book</span>
              </label>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-4">
            <video
              ref={videoRef}
              className="w-full max-w-md mx-auto rounded-lg bg-gray-100"
              style={{ display: isScanning ? "block" : "none" }}
            />
          </div>

          <div className="flex justify-center space-x-4 mb-6">
            {!isScanning ? (
              <button
                onClick={startScanning}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Start Scanning
              </button>
            ) : (
              <button
                onClick={stopScanning}
                className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Stop Scanning
              </button>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Manual Entry</h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label htmlFor="isbn" className="block text-sm font-medium text-gray-700">
                  ISBN
                </label>
                <input
                  type="text"
                  id="isbn"
                  value={scannedCode}
                  onChange={(e) => setScannedCode(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter ISBN manually"
                />
              </div>
              <button
                type="submit"
                disabled={!scannedCode}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                {scanMode === "checkout" ? "Checkout Book" : "Add Book"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}