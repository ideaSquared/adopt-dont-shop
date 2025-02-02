import React, { createContext, useCallback, useContext, useState } from 'react'
import styled from 'styled-components'
import { Alert } from '../../components'

type AlertType = 'success' | 'error' | 'warning' | 'info'

type AlertMessage = {
  id: number
  message: string
  type: AlertType
}

type AlertContextType = {
  showAlert: (message: string, type: AlertType) => void
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

  const showAlert = useCallback((message: string, type: AlertType) => {
    const id = Date.now()
    setAlerts((prev) => [...prev, { id, message, type }])

    // Remove alert after 5 seconds
    setTimeout(() => {
      setAlerts((prev) => prev.filter((alert) => alert.id !== id))
    }, 5000)
  }, [])

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
