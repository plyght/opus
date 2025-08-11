import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import {
  realtimeManager,
  type BookAvailabilityUpdate,
  type CheckoutUpdate,
} from "../lib/supabase-realtime";
import { supabase } from "../lib/supabase";

interface RealtimeState {
  bookUpdates: Map<string, BookAvailabilityUpdate>;
  checkoutUpdates: Map<string, CheckoutUpdate>;
  isConnected: boolean;
  connectionError: string | null;
}

interface RealtimeContextType extends RealtimeState {
  getBookUpdate: (bookId: string) => BookAvailabilityUpdate | undefined;
  getCheckoutUpdate: (checkoutId: string) => CheckoutUpdate | undefined;
  invalidateQueries: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [state, setState] = useState<RealtimeState>({
    bookUpdates: new Map(),
    checkoutUpdates: new Map(),
    isConnected: false,
    connectionError: null,
  });

  const [, setInvalidationTrigger] = useState(0);
  const isInitializedRef = useRef(false);
  const isCleaningUpRef = useRef(false);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Prevent multiple initializations (React StrictMode protection)
    if (isInitializedRef.current || isCleaningUpRef.current) {
      console.log("RealtimeProvider: Skipping initialization (already initialized or cleaning up)");
      return;
    }

    // Add a small delay to prevent race conditions in StrictMode
    initTimeoutRef.current = setTimeout(() => {
      if (isInitializedRef.current || isCleaningUpRef.current) {
        return;
      }

      console.log("RealtimeProvider: Starting connection attempt to Supabase...");
      isInitializedRef.current = true;

      // Test basic Supabase connectivity first
      const testConnection = async () => {
        try {
          const { data, error } = await supabase.from("books").select("count").limit(1);
          if (error) {
            console.error("Supabase connection test failed:", error);
            setState((prev) => ({ ...prev, connectionError: error.message }));
            return false;
          }
          console.log("Supabase connection test successful:", data);
          return true;
        } catch (err) {
          console.error("Supabase connection test error:", err);
          setState((prev) => ({ ...prev, connectionError: "Failed to connect to Supabase" }));
          return false;
        }
      };

      const initializeRealtime = async () => {
        const isConnected = await testConnection();
        if (!isConnected) {
          console.log("Skipping realtime setup due to connection issues");
          return;
        }

        console.log("Setting up realtime subscriptions...");
        setState((prev) => ({ ...prev, isConnected: true, connectionError: null }));

        // Subscribe to book availability changes
        realtimeManager.subscribeToBookAvailability((update) => {
          console.log("Book update received:", update);
          setState((prev) => ({
            ...prev,
            bookUpdates: new Map(prev.bookUpdates.set(update.id, update)),
          }));
          setInvalidationTrigger((prev) => prev + 1);
        });

        // Subscribe to checkout changes
        realtimeManager.subscribeToCheckouts((update) => {
          console.log("Checkout update received:", update);
          setState((prev) => ({
            ...prev,
            checkoutUpdates: new Map(prev.checkoutUpdates.set(update.id, update)),
          }));
          setInvalidationTrigger((prev) => prev + 1);
        });
      };

      initializeRealtime();
    }, 50); // Small delay to handle StrictMode

    return () => {
      console.log("RealtimeProvider: Cleaning up subscriptions...");
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      isCleaningUpRef.current = true;
      realtimeManager.unsubscribeAll();
      setState((prev) => ({ ...prev, isConnected: false }));
      // Reset flags after a brief delay to allow for re-initialization if needed
      setTimeout(() => {
        isInitializedRef.current = false;
        isCleaningUpRef.current = false;
      }, 100);
    };
  }, []);

  const getBookUpdate = (bookId: string) => state.bookUpdates.get(bookId);
  const getCheckoutUpdate = (checkoutId: string) => state.checkoutUpdates.get(checkoutId);

  const invalidateQueries = () => {
    setInvalidationTrigger((prev) => prev + 1);
  };

  const value: RealtimeContextType = {
    ...state,
    getBookUpdate,
    getCheckoutUpdate,
    invalidateQueries,
  };

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
}

// Hook for getting live book data with fallback to original data
export function useLiveBook(originalBook: any) {
  const { getBookUpdate } = useRealtime();
  const update = originalBook ? getBookUpdate(originalBook.id) : undefined;

  return update
    ? {
        ...originalBook,
        availableCopies: update.available_copies,
        totalCopies: update.total_copies,
        title: update.title,
      }
    : originalBook;
}

// Hook for getting live checkout data with fallback to original data
export function useLiveCheckout(originalCheckout: any) {
  const { getCheckoutUpdate } = useRealtime();
  const update = originalCheckout ? getCheckoutUpdate(originalCheckout.id) : undefined;

  return update
    ? {
        ...originalCheckout,
        status: update.status,
        checkedOutAt: update.checked_out_at,
        dueDate: update.due_date,
      }
    : originalCheckout;
}
