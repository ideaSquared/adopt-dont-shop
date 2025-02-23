import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useErrorHandler } from './useErrorHandler'

interface UseSocketOptions {
  url: string
  token: string
  onConnect?: () => void
  onDisconnect?: () => void
  reconnectionAttempts?: number
  reconnectionDelay?: number
}

export const useSocket = ({
  url,
  token,
  onConnect,
  onDisconnect,
  reconnectionAttempts = 5,
  reconnectionDelay = 1000,
}: UseSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const { handleError } = useErrorHandler()
  const reconnectAttemptsRef = useRef(0)

  const connect = useCallback(() => {
    if (socketRef.current?.connected || isConnecting) return

    setIsConnecting(true)
    try {
      const socket = io(url, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts,
        reconnectionDelay,
      })

      socket.on('connect', () => {
        setIsConnected(true)
        setIsConnecting(false)
        reconnectAttemptsRef.current = 0
        onConnect?.()
      })

      socket.on('connect_error', (error) => {
        handleError('Connection error', error)
        setIsConnecting(false)

        if (reconnectAttemptsRef.current < reconnectionAttempts) {
          reconnectAttemptsRef.current += 1
          setTimeout(() => {
            connect()
          }, reconnectionDelay * reconnectAttemptsRef.current) // Exponential backoff
        }
      })

      socket.on('disconnect', () => {
        setIsConnected(false)
        onDisconnect?.()
      })

      socketRef.current = socket
    } catch (error) {
      handleError('Failed to initialize socket connection', error)
      setIsConnecting(false)
    }
  }, [
    url,
    token,
    reconnectionAttempts,
    reconnectionDelay,
    onConnect,
    onDisconnect,
    handleError,
  ])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setIsConnected(false)
      setIsConnecting(false)
    }
  }, [])

  const emit = useCallback(
    <T>(event: string, data?: T) => {
      if (!socketRef.current?.connected) {
        handleError('Socket not connected')
        return false
      }

      try {
        socketRef.current.emit(event, data)
        return true
      } catch (error) {
        handleError('Failed to emit event', error)
        return false
      }
    },
    [handleError],
  )

  const on = useCallback(<T>(event: string, callback: (data: T) => void) => {
    if (!socketRef.current) return

    socketRef.current.on(event, callback)

    return () => {
      socketRef.current?.off(event, callback)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    emit,
    on,
  }
}
