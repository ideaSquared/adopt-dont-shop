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

/**
 * VE theme vars proxy — returns '' for any nested property access so that
 * .css.ts files can be evaluated in the Jest jsdom environment without
 * errors, even though VE build-time compilation doesn't run.
 *
 * Special symbols (toPrimitive, toStringTag) and toString/valueOf return ''
 * so template-literal interpolation like `${vars.colors.neutral['300']}`
 * produces '' rather than trying to call a Proxy as a function.
 */
const makeVarsProxy = (): Record<string, unknown> => {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get: (_target, prop) => {
      if (
        prop === Symbol.toPrimitive ||
        prop === Symbol.toStringTag ||
        prop === 'toString' ||
        prop === 'valueOf'
      ) {
        return () => '';
      }
      return new Proxy({} as Record<string, unknown>, handler);
    },
  };
  return new Proxy({} as Record<string, unknown>, handler);
};

export const vars = makeVarsProxy();
export const lightThemeClass = '';
export const darkThemeClass = '';
