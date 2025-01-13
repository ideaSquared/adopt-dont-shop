interface CookieOptions {
  expires?: Date
  secure?: boolean
  httpOnly?: boolean
}

export const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

export const setCookie = (
  name: string,
  value: string,
  options: CookieOptions = {},
) => {
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/;`

  if (options.expires) {
    cookieString += `Expires=${options.expires.toUTCString()};`
  }

  if (options.secure) {
    cookieString += 'Secure;'
  }

  if (options.httpOnly) {
    cookieString += 'HttpOnly;'
  }

  document.cookie = cookieString
}

export const deleteCookie = (name: string) => {
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`
}
