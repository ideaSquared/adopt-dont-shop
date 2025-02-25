import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
} from 'react'
import styled from 'styled-components'
import { Alert } from '../../components'

type AlertType = 'success' | 'error' | 'warning' | 'info'

interface AlertOptions {
  type: AlertType
  message: string
}

type AlertMessage = {
  id: string
  message: string
  type: AlertType
}

type AlertContextType = {
  showAlert: (options: AlertOptions | string, type?: AlertType) => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

const AlertContainer = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 400px;
`

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [alerts, setAlerts] = useState<AlertMessage[]>([])
  const alertIdCounter = useRef(0)

  const generateUniqueId = useCallback(() => {
    alertIdCounter.current += 1
    return `alert-${Date.now()}-${alertIdCounter.current}`
  }, [])

  const showAlert = useCallback(
    (options: AlertOptions | string, type: AlertType = 'info') => {
      const id = generateUniqueId()
      const alertData: AlertMessage =
        typeof options === 'string'
          ? { id, message: options, type }
          : { id, message: options.message, type: options.type }

      setAlerts((prev) => [...prev, alertData])

      // Remove alert after 5 seconds
      setTimeout(() => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id))
      }, 5000)
    },
    [generateUniqueId],
  )

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AlertContainer>
        {alerts.map((alert) => (
          <Alert key={alert.id} variant={alert.type}>
            {alert.message}
          </Alert>
        ))}
      </AlertContainer>
    </AlertContext.Provider>
  )
}

export const useAlert = () => {
  const context = useContext(AlertContext)
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider')
  }
  return context
}
