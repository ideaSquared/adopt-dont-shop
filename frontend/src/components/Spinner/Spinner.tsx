import React from 'react'
import styled, { keyframes } from 'styled-components'

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`

const SpinnerContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
`

const SpinnerCircle = styled.div`
  width: 50px;
  height: 50px;
  border: 5px solid rgba(0, 0, 0, 0.1);
  border-top: 5px solid #007bff;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`

const Spinner: React.FC = () => {
  return (
    <SpinnerContainer>
      <SpinnerCircle />
    </SpinnerContainer>
  )
}

export default Spinner
