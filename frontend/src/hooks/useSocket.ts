import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAlert } from '../contexts/alert/AlertContext'
import { useErrorHandler } from './useErrorHandler'

const INITIAL_TIMEOUT = 15000 // 15 seconds initial timeout
const MAX_RECONNECTION_ATTEMPTS = 5
const BASE_RECONNECTION_DELAY = 2000 // 2 seconds base delay
const ERROR_DISPLAY_DELAY = 3000 // Wait 3 seconds before showing error

interface UseSocketOptions {
  url: string
  token: string
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
}

export const useSocket = ({
  url,
  token,
  onConnect,
  onDisconnect,
  onError,
}: UseSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const timersRef = useRef<{
    connection?: NodeJS.Timeout
    reconnection?: NodeJS.Timeout
    error?: NodeJS.Timeout
  }>({})
  const isActiveRef = useRef(true)
  const { showAlert } = useAlert()
  const { handleError } = useErrorHandler()

  const clearTimers = useCallback(() => {
    Object.values(timersRef.current).forEach((timer) => {
      if (timer) clearTimeout(timer)
    })
    timersRef.current = {}
  }, [])

  const cleanupSocket = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
        socketRef.current.close()
      } catch (err) {
        console.error('Error cleaning up socket:', err)
      }
      socketRef.current = null
    }
  }, [])

  const getReconnectionDelay = useCallback(() => {
    return Math.min(
      BASE_RECONNECTION_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      32000,
    )
  }, [])

  const connect = useCallback(() => {
    if (!isActiveRef.current || isConnecting || socketRef.current?.connected) {
      return
    }

    try {
      setIsConnecting(true)
      clearTimers()
      cleanupSocket()

      const socket = io(url, {
        auth: { token },
        transports: ['websocket'],
        upgrade: false,
        reconnection: false,
        timeout: INITIAL_TIMEOUT,
        forceNew: true,
        autoConnect: false,
      })

      socketRef.current = socket

      // Set connection timeout
      timersRef.current.connection = setTimeout(() => {
        if (!isActiveRef.current || socket.connected) return

        console.log('Connection timeout reached')
        cleanupSocket()
        setIsConnecting(false)

        if (reconnectAttemptsRef.current < MAX_RECONNECTION_ATTEMPTS) {
          reconnectAttemptsRef.current++
          const delay = getReconnectionDelay()

          if (reconnectAttemptsRef.current > 1) {
            showAlert({
              type: 'warning',
              message: `Connection attempt failed. Retrying in ${delay / 1000} seconds...`,
            })
          }

          timersRef.current.reconnection = setTimeout(connect, delay)
        } else {
          handleError('Connection timeout. Please refresh the page.')
          onError?.(new Error('Connection timeout'))
        }
      }, INITIAL_TIMEOUT)

      socket.on('connect', () => {
        if (!isActiveRef.current) return
        console.log('Socket connected successfully')
        clearTimers()
        reconnectAttemptsRef.current = 0
        setIsConnecting(false)
        setIsConnected(true)
        onConnect?.()
      })

      socket.on('connect_error', (err) => {
        if (!isActiveRef.current) return
        console.error('Socket connection error:', err)
        clearTimers()
        cleanupSocket()
        setIsConnecting(false)
        setIsConnected(false)

        if (reconnectAttemptsRef.current < MAX_RECONNECTION_ATTEMPTS) {
          reconnectAttemptsRef.current++
          const delay = getReconnectionDelay()

          if (reconnectAttemptsRef.current > 1) {
            timersRef.current.error = setTimeout(() => {
              showAlert({
                type: 'warning',
                message: `Connection attempt failed. Retrying in ${delay / 1000} seconds...`,
              })
            }, ERROR_DISPLAY_DELAY)
          }

          timersRef.current.reconnection = setTimeout(connect, delay)
        } else {
          handleError(
            'Unable to establish connection after multiple attempts. Please refresh the page.',
            err,
          )
          onError?.(err)
        }
      })

      socket.on('disconnect', (reason) => {
        if (!isActiveRef.current) return
        console.log('Socket disconnected:', reason)
        setIsConnecting(false)
        setIsConnected(false)
        cleanupSocket()
        onDisconnect?.()

        if (
          reason === 'io client disconnect' ||
          reason === 'io server disconnect'
        ) {
          return
        }

        if (reconnectAttemptsRef.current < MAX_RECONNECTION_ATTEMPTS) {
          const delay = getReconnectionDelay()
          timersRef.current.error = setTimeout(() => {
            showAlert({
              type: 'warning',
              message: `Connection lost. Attempting to reconnect in ${delay / 1000} seconds...`,
            })
          }, ERROR_DISPLAY_DELAY)
          timersRef.current.reconnection = setTimeout(connect, delay)
        }
      })

      socket.connect()
    } catch (err) {
      console.error('Failed to initialize socket:', err)
      cleanupSocket()
      setIsConnecting(false)
      setIsConnected(false)
      handleError('Failed to initialize chat connection', err)
      onError?.(err as Error)
    }
  }, [
    url,
    token,
    isConnecting,
    clearTimers,
    cleanupSocket,
    getReconnectionDelay,
    handleError,
    onConnect,
    onDisconnect,
    onError,
    showAlert,
  ])

  const disconnect = useCallback(() => {
    clearTimers()
    if (socketRef.current) {
      socketRef.current.disconnect()
      cleanupSocket()
    }
    setIsConnected(false)
    setIsConnecting(false)
  }, [clearTimers, cleanupSocket])

  useEffect(() => {
    isActiveRef.current = true
    connect()

    return () => {
      isActiveRef.current = false
      clearTimers()
      disconnect()
    }
  }, [connect, disconnect, clearTimers])

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    connect,
    disconnect,
  }
}
