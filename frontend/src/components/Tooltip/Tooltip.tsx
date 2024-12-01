import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import React from 'react'
import styled from 'styled-components'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  className?: string
}

const StyledContent = styled(TooltipPrimitive.Content)`
  background-color: ${(props) => props.theme.background.contrast};
  color: ${(props) => props.theme.text.info};
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
`

const StyledArrow = styled(TooltipPrimitive.Arrow)`
  fill: ${(props) => props.theme.text.info};
`

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  align = 'center',
  className = '',
}) => (
  <TooltipPrimitive.Provider>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <StyledContent
        side={side}
        align={align}
        sideOffset={5}
        className={className}
      >
        {content}
        <StyledArrow offset={10} />
      </StyledContent>
    </TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
)

export default Tooltip
