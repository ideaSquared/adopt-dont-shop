export function generateUUID(): string {
  // Generate a random 4-digit hex number
  function randomHexDigit() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  }

  // Return the UUID formatted string
  return (
    randomHexDigit() +
    randomHexDigit() +
    '-' +
    randomHexDigit() +
    '-' +
    randomHexDigit() +
    '-' +
    randomHexDigit() +
    '-' +
    randomHexDigit() +
    randomHexDigit() +
    randomHexDigit()
  )
}
