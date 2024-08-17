import React from 'react'
import styled from 'styled-components'

const StyledFooter = styled.footer`
  background-color: #f8f9fa;
  padding: 1rem;
  text-align: center;
  border-top: 1px solid #e9ecef;
`

const Footer: React.FC = () => {
  return (
    <StyledFooter>
      © 2024 Adopt Dont Shop & ideaSquared. All rights reserved.
    </StyledFooter>
  )
}

export default Footer
