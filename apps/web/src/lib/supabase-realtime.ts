import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface BookAvailabilityUpdate {
  id: string
  title: string
  available_copies: number
  total_copies: number
}

export interface CheckoutUpdate {
  id: string
  user_id: string
  book_id: string
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE'
  checked_out_at: string
  due_date: string
}

export class LibraryRealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map()

  subscribeToBookAvailability(callback: (update: BookAvailabilityUpdate) => void) {
    const channel = supabase
      .channel('book-availability')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'books',
          filter: 'available_copies=neq.old.available_copies',
        },
        (payload) => {
          const book = payload.new as BookAvailabilityUpdate
          callback(book)
        }
      )
      .subscribe()

    this.channels.set('book-availability', channel)
    return channel
  }

  subscribeToCheckouts(callback: (update: CheckoutUpdate) => void) {
    const channel = supabase
      .channel('checkouts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkouts',
        },
        (payload) => {
          const checkout = payload.new as CheckoutUpdate
          callback(checkout)
        }
      )
      .subscribe()

    this.channels.set('checkouts', channel)
    return channel
  }

  subscribeToUserCheckouts(userId: string, callback: (update: CheckoutUpdate) => void) {
    const channel = supabase
      .channel(`user-checkouts-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkouts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const checkout = payload.new as CheckoutUpdate
          callback(checkout)
        }
      )
      .subscribe()

    this.channels.set(`user-checkouts-${userId}`, channel)
    return channel
  }

  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName)
    if (channel) {
      supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  unsubscribeAll() {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    this.channels.clear()
  }
}

export const realtimeManager = new LibraryRealtimeManager()