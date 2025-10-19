import styled from 'styled-components';

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    ${props => props.theme.colors.primary[100]},
    ${props => props.theme.colors.primary[300]}
  );
  color: ${props => props.theme.colors.primary[700]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.15rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-right: 0.4rem;
  border: 2px solid ${props => props.theme.colors.primary[300]};
  user-select: none;
  aria-label: 'Sender initials';
`;

export function AvatarComponent({ initials }: { initials: string }) {
  return <Avatar aria-label={'Sender initials'}>{initials}</Avatar>;
}
