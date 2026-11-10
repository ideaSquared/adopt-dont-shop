import { describe, expect, it } from 'vitest';

import {
  countInSource,
  findViolations,
  ratchetCeilings,
  stripComments,
  stripFallbackVarCalls,
} from './check-design-tokens.mjs';

const count = (source, category) => countInSource(source)[category];

describe('colour', () => {
  it('counts hex colours of 3, 4, 6 and 8 digits', () => {
    const source = [
      "color: '#fff',",
      "color: '#ffff',",
      "color: '#ff00aa',",
      "color: '#ff00aa80',",
    ];
    expect(count(source.join('\n'), 'colour')).toBe(4);
  });

  it('does not count malformed hex or id selectors', () => {
    expect(count("selectors: { '#main': {} }, color: '#12345'", 'colour')).toBe(0);
  });

  it('counts rgb, rgba, hsl and hsla functions', () => {
    const source = [
      "background: 'rgb(0, 0, 0)',",
      "background: 'rgba(0, 0, 0, 0.5)',",
      "background: 'hsl(10, 10%, 10%)',",
      "background: 'hsla(10, 10%, 10%, 0.5)',",
    ];
    expect(count(source.join('\n'), 'colour')).toBe(4);
  });

  it('counts white and black used as values', () => {
    const source = ["color: 'white',", "backgroundColor: 'black',", "border: '1px solid white',"];
    expect(count(source.join('\n'), 'colour')).toBe(3);
  });

  it('counts a keyword that directly follows the colon', () => {
    expect(count('color:white,', 'colour')).toBe(1);
    expect(count("color: 'whitesmoke',", 'colour')).toBe(0);
  });

  it('does not count white or black in identifiers or token references', () => {
    const source = ['export const whiteCard = style({', 'color: vars.text.inverse,'];
    expect(count(source.join('\n'), 'colour')).toBe(0);
  });

  it('counts a line once however many colours it holds', () => {
    expect(count("boxShadow: '0 0 0 #fff, 0 0 0 #000',", 'colour')).toBe(1);
  });
});

describe('fontWeight', () => {
  it('counts numeric literals in camelCase and kebab-case', () => {
    const source = ['fontWeight: 600,', "fontWeight: '700',", 'font-weight: 500;'];
    expect(count(source.join('\n'), 'fontWeight')).toBe(3);
  });

  it('does not count keywords or tokens', () => {
    const source = ["fontWeight: 'bold',", 'fontWeight: vars.typography.weight.bold,'];
    expect(count(source.join('\n'), 'fontWeight')).toBe(0);
  });
});

describe('fontSize', () => {
  it('counts px, rem and em literals', () => {
    const source = ["fontSize: '14px',", "fontSize: '0.875rem',", "fontSize: '1.2em',"];
    expect(count(source.join('\n'), 'fontSize')).toBe(3);
  });

  it('does not count zero, keywords or tokens', () => {
    const source = ["fontSize: '0',", "fontSize: 'inherit',", 'fontSize: vars.typography.size.sm,'];
    expect(count(source.join('\n'), 'fontSize')).toBe(0);
  });
});

describe('spacing', () => {
  it('counts padding, margin and gap with px or rem literals', () => {
    const source = [
      "padding: '16px',",
      "marginTop: '1rem',",
      "gap: '0.5rem',",
      "padding: '0 16px',",
      "columnGap: '8px',",
    ];
    expect(count(source.join('\n'), 'spacing')).toBe(5);
  });

  it('does not count zero, auto or tokens', () => {
    const source = [
      'padding: 0,',
      "margin: '0 auto',",
      "padding: '0px',",
      'gap: vars.spacing["4"],',
      "padding: `${vars.spacing['2']} ${vars.spacing['4']}`,",
    ];
    expect(count(source.join('\n'), 'spacing')).toBe(0);
  });

  it('does not count px values on non-spacing properties', () => {
    expect(count("width: '16px',", 'spacing')).toBe(0);
  });
});

describe('borderRadius', () => {
  it('counts px, rem, em and percentage literals', () => {
    const source = [
      "borderRadius: '8px',",
      "borderRadius: '0.5rem',",
      "borderRadius: '50%',",
      'border-radius: 4px;',
    ];
    expect(count(source.join('\n'), 'borderRadius')).toBe(4);
  });

  it('does not count zero or tokens', () => {
    const source = ["borderRadius: '0',", 'borderRadius: vars.border.radius.lg,'];
    expect(count(source.join('\n'), 'borderRadius')).toBe(0);
  });
});

describe('zIndex', () => {
  it('counts non-zero numeric literals including negatives', () => {
    const source = ['zIndex: 10,', "zIndex: '1000',", 'z-index: 5;', 'zIndex: -1,'];
    expect(count(source.join('\n'), 'zIndex')).toBe(4);
  });

  it('does not count zero or tokens', () => {
    const source = ['zIndex: 0,', 'zIndex: vars.zIndex.modal,'];
    expect(count(source.join('\n'), 'zIndex')).toBe(0);
  });
});

describe('exclusions', () => {
  it('ignores values inside line and block comments', () => {
    const source = [
      "// color: '#fff',",
      '/* fontWeight: 600,',
      '   padding: 16px, */',
      'const a = 1; // zIndex: 10',
    ].join('\n');
    expect(Object.values(countInSource(source)).every(value => value === 0)).toBe(true);
  });

  it('keeps line structure when stripping comments', () => {
    expect(stripComments('a\n/* x\ny */\nb').split('\n')).toHaveLength(4);
  });

  it('ignores vars references', () => {
    const source = 'border: `${vars.border.width.thin} solid ${vars.border.color.muted}`,';
    expect(Object.values(countInSource(source)).every(value => value === 0)).toBe(true);
  });

  it('ignores the fallback argument of fallbackVar', () => {
    const source = "color: fallbackVar(vars.text.primary, '#333'),";
    expect(count(source, 'colour')).toBe(0);
  });

  it('ignores a functional colour fallback inside fallbackVar', () => {
    const source = "color: fallbackVar(vars.text.primary, 'rgba(0, 0, 0, 0.5)'),";
    expect(count(source, 'colour')).toBe(0);
  });

  it('ignores a calc() spacing fallback inside fallbackVar', () => {
    const source = "padding: fallbackVar(vars.spacing['4'], 'calc(1rem + 2px)'),";
    expect(count(source, 'spacing')).toBe(0);
  });

  it('ignores a fallbackVar call that spans lines and keeps later lines aligned', () => {
    const source = [
      'color: fallbackVar(',
      '  vars.text.primary,',
      "  '#333'",
      '),',
      "background: '#fff',",
    ];
    expect(count(source.join('\n'), 'colour')).toBe(1);
    expect(stripFallbackVarCalls(source.join('\n')).split('\n')).toHaveLength(5);
  });

  it('still counts a literal beside a token on the same line', () => {
    expect(count("border: `1px solid #ccc ${vars.spacing['1']}`,", 'colour')).toBe(1);
  });
});

describe('findViolations', () => {
  const measured = {
    colour: 10,
    fontWeight: 5,
    fontSize: 0,
    spacing: 3,
    borderRadius: 2,
    zIndex: 1,
  };

  it('passes when every category is at its ceiling', () => {
    expect(findViolations({ ...measured }, measured)).toEqual([]);
  });

  it('passes when counts are below the ceilings', () => {
    expect(findViolations({ colour: 20, spacing: 9 }, measured)).toEqual([]);
  });

  it('names each category above its ceiling with the delta', () => {
    expect(findViolations({ ...measured, colour: 8, zIndex: 0 }, measured)).toEqual([
      { category: 'colour', count: 10, ceiling: 8, delta: 2 },
      { category: 'zIndex', count: 1, ceiling: 0, delta: 1 },
    ]);
  });

  it('does not gate a category with no ceiling', () => {
    expect(findViolations({}, measured)).toEqual([]);
  });
});

describe('ratchetCeilings', () => {
  const ceilings = {
    colour: 100,
    fontWeight: 50,
    fontSize: 10,
    spacing: 30,
    borderRadius: 20,
    zIndex: 5,
  };

  it('lowers a ceiling towards a smaller count', () => {
    const next = ratchetCeilings(ceilings, { ...ceilings, colour: 80 });
    expect(next.colour).toBe(80);
  });

  it('never raises a ceiling when the count grows', () => {
    const next = ratchetCeilings(ceilings, { ...ceilings, colour: 120, zIndex: 9 });
    expect(next).toEqual(ceilings);
  });

  it('sets a missing ceiling to the measured count', () => {
    const next = ratchetCeilings({}, { ...ceilings, spacing: 7 });
    expect(next.spacing).toBe(7);
  });
});
