import React from 'react'

// Third-party imports
import styled from 'styled-components'

// Style definitions
const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
`

const Title = styled.h1`
  font-size: 2.5rem;

  margin-bottom: 1.5rem;
  text-align: center;
`

// Types
type HomeProps = {
  // No props needed currently
}

export const Home: React.FC<HomeProps> = () => {
  // Render
  return (
    <HomeContainer>
      <Title>Welcome to the AdoptDontShop</Title>
    </HomeContainer>
  )
}
