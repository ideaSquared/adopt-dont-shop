import { useCallback, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAlert } from '../contexts/alert/AlertContext'
import { useErrorHandler } from './useErrorHandler'

const INITIAL_TIMEOUT = 15000 // 15 seconds initial timeout
const MAX_RECONNECTION_ATTEMPTS = 5
const BASE_RECONNECTION_DELAY = 2000 // 2 seconds base delay
const ERROR_DISPLAY_DELAY = 3000 // Wait 3 seconds before showing error

// Global singleton socket instance
let globalSocket: Socket | null = null
let globalSocketOptions: { url: string; token: string } | null = null
let isConnecting = false
let connectionPromise: Promise<Socket> | null = null
const connectedCallbacks: Array<() => void> = []
const disconnectedCallbacks: Array<() => void> = []
const errorCallbacks: Array<(error: Error) => void> = []

interface UseSocketOptions {
  url: string
  token: string
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
}

// Define a return type for the useSocket hook
interface UseSocketReturn {
  socket: Socket | null
  isConnected: boolean
  isConnecting: boolean
  connect: () => void
  disconnect: () => void
  on: <T = any>(
    event: string,
    callback: (data: T) => void,
  ) => (() => void) | undefined
  emit: (event: string, data: any) => boolean
}

/**
 * Creates or returns a singleton socket instance
 */
const getSocket = async (url: string, token: string): Promise<Socket> => {
  // If we already have a socket with the same options, return it
  if (
    globalSocket &&
    globalSocket.connected &&
    globalSocketOptions?.url === url &&
    globalSocketOptions?.token === token
  ) {
    return globalSocket
  }

  // If we're already connecting, return the promise
  if (isConnecting && connectionPromise) {
    return connectionPromise
  }

  // Clean up any existing socket before creating a new one
  if (globalSocket) {
    try {
      globalSocket.removeAllListeners()
      globalSocket.disconnect()
      globalSocket.close()
    } catch (err) {
      console.error('Error cleaning up global socket:', err)
    }
    globalSocket = null
  }

  isConnecting = true

  // Create a new promise for the connection
  connectionPromise = new Promise<Socket>((resolve, reject) => {
    try {
      const socket = io(url, {
        auth: { token },
        transports: ['websocket'],
        upgrade: false,
        reconnection: true, // Enable built-in reconnection
        reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
        reconnectionDelay: BASE_RECONNECTION_DELAY,
        timeout: INITIAL_TIMEOUT,
        forceNew: true, // Force a new connection
      })

      socket.on('connect', () => {
        console.log('Global socket connected successfully')
        isConnecting = false
        globalSocket = socket
        globalSocketOptions = { url, token }

        // Notify all listeners
        connectedCallbacks.forEach((callback) => callback())

        resolve(socket)
      })

      socket.on('connect_error', (err) => {
        console.error('Global socket connection error:', err)

        // Only reject if we're in the connection process
        if (isConnecting) {
          isConnecting = false
          reject(err)
        }

        // Notify error listeners
        errorCallbacks.forEach((callback) => callback(err))
      })

      socket.on('disconnect', (reason) => {
        console.log('Global socket disconnected:', reason)

        // Notify disconnect listeners
        disconnectedCallbacks.forEach((callback) => callback())
      })

      // Start connection
      socket.connect()
    } catch (err) {
      console.error('Failed to initialize global socket:', err)
      isConnecting = false
      reject(err)
    }
  })

  return connectionPromise
}

export const useSocket = ({
  url,
  token,
  onConnect,
  onDisconnect,
  onError,
}: UseSocketOptions): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState<boolean>(
    globalSocket?.connected || false,
  )
  const [isSocketConnecting, setIsSocketConnecting] =
    useState<boolean>(isConnecting)
  const { showAlert } = useAlert()
  const { handleError } = useErrorHandler()

  // Connect to the socket
  const connect = useCallback(() => {
    if (!url || !token) return

    setIsSocketConnecting(true)

    getSocket(url, token)
      .then((socket) => {
        setIsConnected(socket.connected)
        setIsSocketConnecting(false)
        if (socket.connected && onConnect) {
          onConnect()
        }
      })
      .catch((err) => {
        setIsSocketConnecting(false)
        handleError('Failed to connect to chat server', err)
        if (onError) onError(err)

        showAlert({
          type: 'warning',
          message: 'Connection to chat server failed. Please try again.',
        })
      })
  }, [url, token, onConnect, onError, handleError, showAlert])

  // Disconnect handler - note this doesn't actually disconnect the global socket
  // It just removes this component's listeners
  const disconnect = useCallback(() => {
    // We don't actually disconnect the global socket, just remove this component's listeners
    if (globalSocket) {
      if (onConnect) {
        const index = connectedCallbacks.indexOf(onConnect)
        if (index !== -1) connectedCallbacks.splice(index, 1)
      }

      if (onDisconnect) {
        const index = disconnectedCallbacks.indexOf(onDisconnect)
        if (index !== -1) disconnectedCallbacks.splice(index, 1)
      }

      if (onError) {
        const index = errorCallbacks.indexOf(onError)
        if (index !== -1) errorCallbacks.splice(index, 1)
      }
    }
  }, [onConnect, onDisconnect, onError])

  // Event listener registration
  const on = useCallback(
    <T = any>(event: string, callback: (data: T) => void) => {
      if (!globalSocket) return undefined

      globalSocket.on(event, callback)
      return () => {
        globalSocket?.off(event, callback)
      }
    },
    [],
  )

  // Event emission
  const emit = useCallback((event: string, data: any): boolean => {
    if (!globalSocket || !globalSocket.connected) {
      console.warn(`Cannot emit ${event}: Socket not connected`)
      return false
    }
    globalSocket.emit(event, data)
    return true
  }, [])

  // Setup connection state listeners
  useEffect(() => {
    if (onConnect) connectedCallbacks.push(onConnect)
    if (onDisconnect) disconnectedCallbacks.push(onDisconnect)
    if (onError) errorCallbacks.push(onError)

    // Update local state when global socket state changes
    const handleConnect = () => {
      setIsConnected(true)
      setIsSocketConnecting(false)
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    const handleConnecting = () => {
      setIsSocketConnecting(true)
    }

    if (globalSocket) {
      globalSocket.on('connect', handleConnect)
      globalSocket.on('disconnect', handleDisconnect)
      globalSocket.on('connecting', handleConnecting)

      // Initialize state based on current socket status
      setIsConnected(globalSocket.connected)
      setIsSocketConnecting(isConnecting)

      // If socket is connected, call onConnect immediately
      if (globalSocket.connected && onConnect) {
        onConnect()
      }
    }

    // If no connection exists, initiate one
    if (!globalSocket && !isConnecting && url && token) {
      connect()
    }

    return () => {
      if (globalSocket) {
        globalSocket.off('connect', handleConnect)
        globalSocket.off('disconnect', handleDisconnect)
        globalSocket.off('connecting', handleConnecting)
      }

      // Clean up callbacks when component unmounts
      disconnect()
    }
  }, [connect, disconnect, onConnect, onDisconnect, onError, url, token])

  return {
    socket: globalSocket,
    isConnected,
    isConnecting: isSocketConnecting,
    connect,
    disconnect,
    on,
    emit,
  }
}
