import { useState, useRef, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useUserQuery, useCheckoutMutation } from "../lib/api-client";
import { useRealtime } from "../contexts/RealtimeContext";
import { Card, CardContent, CardHeader, Button, Input, Badge } from "../components/ui";
import {
  ScanLine,
  Play,
  Square,
  Activity,
  BookPlus,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";

export function Scanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string>("");
  const [scanMode, setScanMode] = useState<"checkout" | "add">("checkout");
  const [lastOperation, setLastOperation] = useState<string | null>(null);
  const [operationStatus, setOperationStatus] = useState<"success" | "error" | "info" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const checkoutMutation = useCheckoutMutation.checkoutBook();
  const { data: currentUser } = useUserQuery.getCurrentUser();
  const { isConnected } = useRealtime();

  useEffect(() => {
    return () => {
      if (readerRef.current) {
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
        video: { facingMode: "environment" },
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
      setLastOperation("Failed to access camera. Please check permissions.");
      setOperationStatus("error");
    }
  };

  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (readerRef.current) {
      readerRef.current = null;
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
        setOperationStatus("info");
        await checkoutMutation.mutateAsync({ isbn, user_id: currentUser.id.toString() });
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

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4" />;
      case "error":
        return <AlertCircle className="w-4 h-4" />;
      case "info":
        return <Info className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Barcode Scanner</h1>
            <p className="text-gray-600 mt-1">Scan ISBN barcodes to checkout or add books</p>
          </div>
          <Badge variant={isConnected ? "success" : "danger"} className="flex items-center">
            <Activity className={`w-3 h-3 mr-1 ${isConnected ? "animate-pulse" : ""}`} />
            {isConnected ? "Live Updates" : "Offline"}
          </Badge>
        </div>

        {lastOperation && (
          <Card
            className={`mb-6 ${
              operationStatus === "success"
                ? "border-green-200 bg-green-50"
                : operationStatus === "error"
                  ? "border-red-200 bg-red-50"
                  : "border-blue-200 bg-blue-50"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon(operationStatus)}
                <span
                  className={`text-sm font-medium ${
                    operationStatus === "success"
                      ? "text-green-800"
                      : operationStatus === "error"
                        ? "text-red-800"
                        : "text-blue-800"
                  }`}
                >
                  {lastOperation}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {currentUser?.role === "ADMIN" && (
          <Card className="mb-6">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Scan Mode</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="scanMode"
                    value="checkout"
                    checked={scanMode === "checkout"}
                    onChange={(e) => setScanMode(e.target.value as "checkout" | "add")}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="w-5 h-5 text-blue-500" />
                    <span className="text-gray-900">Checkout Book</span>
                  </div>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="scanMode"
                    value="add"
                    checked={scanMode === "add"}
                    onChange={(e) => setScanMode(e.target.value as "checkout" | "add")}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-2">
                    <BookPlus className="w-5 h-5 text-green-500" />
                    <span className="text-gray-900">Add New Book</span>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <ScanLine className="w-6 h-6 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Camera Scanner</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="relative">
                <video
                  ref={videoRef}
                  className={`w-full max-w-md mx-auto rounded-lg bg-gray-100 ${
                    isScanning ? "block" : "hidden"
                  }`}
                />
                {!isScanning && (
                  <div className="w-full max-w-md mx-auto h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <ScanLine className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Camera preview will appear here</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                {!isScanning ? (
                  <Button onClick={startScanning} size="lg">
                    <Play className="w-5 h-5 mr-2" />
                    Start Scanning
                  </Button>
                ) : (
                  <Button onClick={stopScanning} variant="danger" size="lg">
                    <Square className="w-5 h-5 mr-2" />
                    Stop Scanning
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Manual Entry</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Input
                label="ISBN"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                placeholder="Enter ISBN manually (e.g., 9781234567890)"
                helper="Enter the 10 or 13 digit ISBN number"
              />
              <Button type="submit" disabled={!scannedCode} className="w-full" variant="primary">
                {scanMode === "checkout" ? (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Checkout Book
                  </>
                ) : (
                  <>
                    <BookPlus className="w-4 h-4 mr-2" />
                    Add Book
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
