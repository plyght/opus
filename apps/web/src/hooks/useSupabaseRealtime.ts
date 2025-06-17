import { useEffect, useRef } from 'react'
import { realtimeManager, type BookAvailabilityUpdate, type CheckoutUpdate } from '../lib/supabase-realtime'

export function useBookAvailability(onUpdate: (update: BookAvailabilityUpdate) => void) {
  const callbackRef = useRef(onUpdate)
  callbackRef.current = onUpdate

  useEffect(() => {
    realtimeManager.subscribeToBookAvailability((update) => {
      callbackRef.current(update)
    })

    return () => {
      realtimeManager.unsubscribe('book-availability')
    }
  }, [])
}

export function useCheckouts(onUpdate: (update: CheckoutUpdate) => void) {
  const callbackRef = useRef(onUpdate)
  callbackRef.current = onUpdate

  useEffect(() => {
    realtimeManager.subscribeToCheckouts((update) => {
      callbackRef.current(update)
    })

    return () => {
      realtimeManager.unsubscribe('checkouts')
    }
  }, [])
}

export function useUserCheckouts(userId: string | null, onUpdate: (update: CheckoutUpdate) => void) {
  const callbackRef = useRef(onUpdate)
  callbackRef.current = onUpdate

  useEffect(() => {
    if (!userId) return

    const channelName = `user-checkouts-${userId}`
    realtimeManager.subscribeToUserCheckouts(userId, (update) => {
      callbackRef.current(update)
    })

    return () => {
      realtimeManager.unsubscribe(channelName)
    }
  }, [userId])
}