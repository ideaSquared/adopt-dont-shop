/**
 * Ambient module augmentation so chat UI components can consume theme
 * properties (colors, background, text, border, typography, etc.) from
 * styled-components. The concrete Theme shape is owned by lib.components,
 * which is the canonical design-system package. Apps that consume lib.chat
 * must wrap their tree in lib.components' ThemeProvider.
 */
import 'styled-components';
import type { Theme } from '@adopt-dont-shop/lib.components';

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends Theme {}
}
