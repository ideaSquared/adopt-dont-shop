import { useState, useCallback } from 'react'
import { useAlert } from '../contexts/alert/AlertContext'

export const useErrorHandler = () => {
  const [error, setError] = useState<Error | null>(null)
  const { showAlert } = useAlert()

  const handleError = useCallback(
    (message: string, error?: unknown) => {
      const errorObj = error instanceof Error ? error : new Error(message)
      setError(errorObj)
      showAlert({
        type: 'error',
        message: message || 'An unexpected error occurred',
      })

      // Log to error monitoring service in production
      if (process.env.NODE_ENV === 'production') {
        // TODO: Add error monitoring service integration
        // errorMonitoringService.logError(errorObj)
      }
    },
    [showAlert],
  )

  const showError = useCallback(
    (message: string) => {
      showAlert({
        type: 'error',
        message,
      })
    },
    [showAlert],
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    error,
    handleError,
    showError,
    clearError,
  }
}
