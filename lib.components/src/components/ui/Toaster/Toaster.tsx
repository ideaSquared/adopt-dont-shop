// ADS-125: thin wrapper around sonner's Toaster so apps mount a single,
// consistently-configured toast provider. We rely on sonner's built-in
// aria-live region for accessibility — no extra wiring required.
import { Toaster as SonnerToaster, type ToasterProps as SonnerToasterProps } from 'sonner';

export type ToasterProps = SonnerToasterProps;

export const Toaster = ({
  position = 'top-right',
  richColors = true,
  closeButton = true,
  visibleToasts = 3,
  ...rest
}: ToasterProps) => (
  <SonnerToaster
    position={position}
    richColors={richColors}
    closeButton={closeButton}
    visibleToasts={visibleToasts}
    {...rest}
  />
);
