import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { realtimeManager, type BookAvailabilityUpdate, type CheckoutUpdate } from '../lib/supabase-realtime'

interface RealtimeState {
  bookUpdates: Map<string, BookAvailabilityUpdate>
  checkoutUpdates: Map<string, CheckoutUpdate>
  isConnected: boolean
}

interface RealtimeContextType extends RealtimeState {
  getBookUpdate: (bookId: string) => BookAvailabilityUpdate | undefined
  getCheckoutUpdate: (checkoutId: string) => CheckoutUpdate | undefined
  invalidateQueries: () => void
}

const RealtimeContext = createContext<RealtimeContextType | null>(null)

interface RealtimeProviderProps {
  children: ReactNode
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [state, setState] = useState<RealtimeState>({
    bookUpdates: new Map(),
    checkoutUpdates: new Map(),
    isConnected: false,
  })

  const [_invalidationTrigger, setInvalidationTrigger] = useState(0)

  useEffect(() => {
    setState(prev => ({ ...prev, isConnected: true }))

    // Subscribe to book availability changes
    realtimeManager.subscribeToBookAvailability((update) => {
      setState(prev => ({
        ...prev,
        bookUpdates: new Map(prev.bookUpdates.set(update.id, update))
      }))
      // Trigger query invalidation for real-time UI updates
      setInvalidationTrigger(prev => prev + 1)
    })

    // Subscribe to checkout changes
    realtimeManager.subscribeToCheckouts((update) => {
      setState(prev => ({
        ...prev,
        checkoutUpdates: new Map(prev.checkoutUpdates.set(update.id, update))
      }))
      // Trigger query invalidation for real-time UI updates
      setInvalidationTrigger(prev => prev + 1)
    })

    return () => {
      realtimeManager.unsubscribeAll()
      setState(prev => ({ ...prev, isConnected: false }))
    }
  }, [])

  const getBookUpdate = (bookId: string) => state.bookUpdates.get(bookId)
  const getCheckoutUpdate = (checkoutId: string) => state.checkoutUpdates.get(checkoutId)
  
  const invalidateQueries = () => {
    setInvalidationTrigger(prev => prev + 1)
  }

  const value: RealtimeContextType = {
    ...state,
    getBookUpdate,
    getCheckoutUpdate,
    invalidateQueries,
  }

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}

// Hook for getting live book data with fallback to original data
export function useLiveBook(originalBook: any) {
  const { getBookUpdate } = useRealtime()
  const update = originalBook ? getBookUpdate(originalBook.id) : undefined
  
  return update ? {
    ...originalBook,
    availableCopies: update.available_copies,
    totalCopies: update.total_copies,
    title: update.title,
  } : originalBook
}

// Hook for getting live checkout data with fallback to original data
export function useLiveCheckout(originalCheckout: any) {
  const { getCheckoutUpdate } = useRealtime()
  const update = originalCheckout ? getCheckoutUpdate(originalCheckout.id) : undefined
  
  return update ? {
    ...originalCheckout,
    status: update.status,
    checkedOutAt: update.checked_out_at,
    dueDate: update.due_date,
  } : originalCheckout
}