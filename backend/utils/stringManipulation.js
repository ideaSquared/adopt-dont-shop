/**
 * Capitalizes the first character of a string and converts the rest of the string to lowercase.
 *
 * This function is useful for normalizing user input, formatting text for display, or ensuring consistency
 * in strings where only the first letter should be capitalized, such as names or titles. The function takes
 * a single string argument and applies two operations: it converts the first character to uppercase and the
 * remainder of the string to lowercase.
 *
 * @param {string} str - The original string to be transformed. If the string is empty, the function will
 * simply return an empty string without throwing an error.
 *
 * @returns {string} - The transformed string with the first character capitalized and the rest in lowercase.
 * If the input string was empty or consisted of only one character, the function handles these cases gracefully
 * by either returning the empty string or the single character in uppercase, respectively.
 *
 * Example usage:
 * - capitalizeFirstChar("hello") returns "Hello"
 * - capitalizeFirstChar("WORLD") returns "World"
 * - capitalizeFirstChar("") returns ""
 * - capitalizeFirstChar("a") returns "A"
 *
 * This function enhances readability and presentation of textual data by enforcing a specific capitalization
 * pattern, making it ideal for processing user-generated content or preparing strings for UI display.
 */

export function capitalizeFirstChar(str) {
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
