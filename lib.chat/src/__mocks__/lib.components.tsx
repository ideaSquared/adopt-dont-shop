/**
 * Jest mock for @adopt-dont-shop/lib.components. The real package is
 * shipped as a Vite-bundled ESM .js that ts-jest can't process, and the
 * chat component tests only need the primitives to be renderable — not
 * style-accurate. These stubs render plain semantic elements that forward
 * the common props the chat components pass.
 */
import type { ReactNode } from 'react';

type Common = {
  children?: ReactNode;
  className?: string;
  onClick?: (e: unknown) => void;
  disabled?: boolean;
};

export const Button = ({
  children,
  onClick,
  disabled,
  className,
  ...rest
}: Common & Record<string, unknown>) => (
  <button type="button" onClick={onClick} disabled={disabled} className={className} {...rest}>
    {children}
  </button>
);

export const Spinner = ({ className }: { className?: string }) => (
  <span role="status" aria-label="Loading" className={className} />
);

export const TextArea = ({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) => (
  <textarea
    value={value ?? ''}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    className={className}
  />
);
