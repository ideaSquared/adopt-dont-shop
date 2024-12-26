import { render } from '@testing-library/react'
import Spinner from './Spinner'

describe('Spinner Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<Spinner />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it.skip('has the correct styles', () => {
    const { getByTestId } = render(<Spinner />)
    const spinner = getByTestId('spinner')
    expect(spinner).toHaveStyle(`
    border: 5px solid rgba(0, 0, 0, 0.1);
    border-top: 5px solid #007bff;
    border-radius: 50%;
  `)
  })

  it.skip('applies animation', () => {
    const { container } = render(<Spinner />)
    expect(container.firstChild).toHaveStyle(`
        animation: spin 1s linear infinite;
    `)
  })
})
