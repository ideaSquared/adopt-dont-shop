import React from 'react'
import styled from 'styled-components'

interface CardProps {
  title: string
  children: React.ReactNode
}

const StyledCard = styled.div`
  border: 1px solid ${(props) => props.theme.border.color.default};
  border-radius: 0.25rem;
  margin-bottom: 1rem;
`

const StyledCardHeader = styled.div`
  background-color: ${(props) => props.theme.background.contrast};
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid ${(props) => props.theme.border.color.default};
`

const StyledCardBody = styled.div`
  padding: 1.25rem;
`

const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <StyledCard>
      <StyledCardHeader>
        <h5 className="card-title">{title}</h5>
      </StyledCardHeader>
      <StyledCardBody>{children}</StyledCardBody>
    </StyledCard>
  )
}

export default Card
