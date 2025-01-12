import React from 'react'
import styled from 'styled-components'

const StyledFooter = styled.footer`
  background-color: ${({ theme }) => theme.background.contrast};
  padding: ${({ theme }) => theme.spacing.md};
  text-align: center;
  border-top: ${({ theme }) => theme.border.width.thin} solid
    ${({ theme }) => theme.border.color.default};
`

const Footer: React.FC = () => {
  return (
    <StyledFooter>
      © 2024 Adopt Dont Shop & ideaSquared. All rights reserved.
    </StyledFooter>
  )
}

export default Footer
