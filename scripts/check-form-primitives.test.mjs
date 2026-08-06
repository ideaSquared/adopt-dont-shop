import { describe, expect, it } from 'vitest';

import { countInSource, ratchetCeiling } from './check-form-primitives.mjs';

describe('countInSource', () => {
  it('counts raw input, select and textarea elements', () => {
    const source = `
      <input type="text" />
      <select><option>a</option></select>
      <textarea />
    `;
    expect(countInSource(source)).toBe(3);
  });

  it('counts deprecated TextInput usages', () => {
    const source = `<TextInput value={v} onChange={f} />\n<TextInput />`;
    expect(countInSource(source)).toBe(2);
  });

  it('does not flag the shared Input / TextArea / Select components (capitalised)', () => {
    const source = `<Input /> <TextArea /> <SelectInput /> <Select />`;
    expect(countInSource(source)).toBe(0);
  });

  it('counts self-closing and attribute-led tags but not substrings', () => {
    // `<inputmode>` is not a real element and must not match `<input`.
    const source = `<input/> <input value="x"> <selection> <textareaX>`;
    expect(countInSource(source)).toBe(2);
  });

  it('returns zero for source with no form controls', () => {
    expect(countInSource('<div><Button/></div>')).toBe(0);
  });
});

describe('ratchetCeiling', () => {
  it('lowers the ceiling towards a smaller measured count', () => {
    expect(ratchetCeiling(269, 250)).toBe(250);
  });

  it('never raises the ceiling when the count grows', () => {
    expect(ratchetCeiling(269, 300)).toBe(269);
  });

  it('is a no-op when the count is unchanged', () => {
    expect(ratchetCeiling(269, 269)).toBe(269);
  });
});
