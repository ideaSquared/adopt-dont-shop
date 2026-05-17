import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const wrapper = style({
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
});

globalStyle(`${wrapper} picture`, {
  display: 'block',
  width: '100%',
  height: '100%',
});

export const image = recipe({
  base: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'opacity 0.3s ease-in-out, filter 0.3s ease-in-out',
  },
  variants: {
    visible: {
      true: {
        opacity: 1,
        filter: 'blur(0)',
      },
      false: {
        // Blur-up: render at low-res blurred until decoded.
        opacity: 0,
        filter: 'blur(20px)',
      },
    },
  },
  defaultVariants: { visible: false },
});

export const placeholderLayer = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});
