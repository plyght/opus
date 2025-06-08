import { useState, useEffect } from '../utils/jsx';
import { BrowserMultiFormatReader } from '@zxing/library';
import type { ApiService } from '../services/ApiService';
import type { Book } from '../types';

interface BookScannerProps {
    apiService: ApiService;
}

export function BookScanner({ apiService }: BookScannerProps): Element {
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [book, setBook] = useState<Book | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<string>('');

    let codeReader: BrowserMultiFormatReader | null = null;
    let videoElement: HTMLVideoElement | null = null;

    const initializeCamera = async () => {
        try {
            const devices = await navigator.mediaDevices?.enumerateDevices();
            const videoInputs = devices?.filter(device => device.kind === 'videoinput') || [];
            setCameraDevices(videoInputs);
            
            if (videoInputs.length > 0 && !selectedDevice) {
                setSelectedDevice(videoInputs[0]?.deviceId || '');
            }
        } catch (err) {
            setError('Failed to access camera devices');
        }
    };

    const startScanning = async () => {
        if (!selectedDevice) {
            setError('No camera device selected');
            return;
        }

        setIsScanning(true);
        setError(null);
        setScanResult(null);
        setBook(null);

        try {
            codeReader = new BrowserMultiFormatReader();
            videoElement = document.getElementById('scanner-video') as HTMLVideoElement;
            
            if (!videoElement) {
                throw new Error('Video element not found');
            }

            await codeReader.decodeFromVideoDevice(
                selectedDevice,
                videoElement,
                (result, err) => {
                    if (result) {
                        const scannedCode = result.getText();
                        setScanResult(scannedCode);
                        stopScanning();
                        lookupBook(scannedCode);
                    }
                    if (err && !(err instanceof Error)) {
                        // Scanning in progress
                    }
                }
            );
        } catch (err) {
            setError('Failed to start camera');
            setIsScanning(false);
        }
    };

    const stopScanning = () => {
        if (codeReader) {
            codeReader.reset();
        }
        setIsScanning(false);
    };

    const lookupBook = async (isbn: string) => {
        try {
            setError(null);
            const books = await apiService.searchBooks({ q: isbn });
            
            if (books.books.length > 0) {
                setBook(books.books[0] || null);
            } else {
                // Try to create new book from ISBN
                try {
                    const newBook = await apiService.createBookFromISBN(isbn);
                    setBook(newBook);
                } catch (createErr) {
                    setError(`Book not found for ISBN: ${isbn}. You may need to add it manually.`);
                }
            }
        } catch (err) {
            setError('Failed to lookup book');
        }
    };

    const handleManualInput = () => {
        const input = document.getElementById('manual-isbn') as HTMLInputElement;
        const isbn = input?.value.trim();
        
        if (!isbn) {
            setError('Please enter an ISBN');
            return;
        }
        
        setScanResult(isbn);
        lookupBook(isbn);
    };

    useEffect(() => {
        initializeCamera();
        
        return () => {
            if (codeReader) {
                codeReader.reset();
            }
        };
    }, []);

    return (
        <div className="book-scanner">
            <div className="scanner-header">
                <h2>Book Scanner</h2>
                <p>Scan a book's barcode or enter ISBN manually</p>
            </div>

            <div className="scanner-controls">
                {cameraDevices.length > 0 && (
                    <div className="camera-select">
                        <label htmlFor="camera-select">Camera:</label>
                        <select
                            id="camera-select"
                            value={selectedDevice}
                            onChange={(e: any) => setSelectedDevice((e.target as HTMLSelectElement).value)}
                        >
                            {cameraDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="scan-buttons">
                    {!isScanning ? (
                        <button onClick={startScanning} disabled={!selectedDevice}>
                            Start Scanning
                        </button>
                    ) : (
                        <button onClick={stopScanning}>
                            Stop Scanning
                        </button>
                    )}
                </div>
            </div>

            <div className="scanner-content">
                <div className="video-container">
                    <video
                        id="scanner-video"
                        width="640"
                        height="480"
                        style={{ display: isScanning ? 'block' : 'none' }}
                    ></video>
                    {!isScanning && (
                        <div className="video-placeholder">
                            <p>Camera preview will appear here when scanning</p>
                        </div>
                    )}
                </div>

                <div className="manual-input">
                    <h3>Manual ISBN Entry</h3>
                    <div className="input-group">
                        <input
                            type="text"
                            id="manual-isbn"
                            placeholder="Enter ISBN"
                            onKeyPress={(e: any) => e.key === 'Enter' && handleManualInput()}
                        />
                        <button onClick={handleManualInput}>
                            Lookup
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {scanResult && (
                <div className="scan-result">
                    <h3>Scanned Code: {scanResult}</h3>
                </div>
            )}

            {book && (
                <div className="book-result">
                    <h3>Book Found:</h3>
                    <div className="book-details">
                        {book.cover_url && (
                            <img src={book.cover_url} alt={book.title} className="book-cover" />
                        )}
                        <div className="book-info">
                            <h4>{book.title}</h4>
                            <p><strong>Author:</strong> {book.author}</p>
                            {book.publisher && <p><strong>Publisher:</strong> {book.publisher}</p>}
                            {book.isbn && <p><strong>ISBN:</strong> {book.isbn}</p>}
                            <p><strong>Status:</strong> {book.status}</p>
                            {book.location && <p><strong>Location:</strong> {book.location}</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}