type LogLevel = 'info' | 'warn' | 'error' | 'debug'

type LogArgs = string | number | boolean | null | undefined | object

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private log(level: LogLevel, message: string, ...args: LogArgs[]) {
    if (this.isDevelopment) {
      switch (level) {
        case 'info':
          console.info(message, ...args)
          break
        case 'warn':
          console.warn(message, ...args)
          break
        case 'error':
          console.error(message, ...args)
          break
        case 'debug':
          console.debug(message, ...args)
          break
        default:
          console.log(message, ...args)
      }
    }
  }

  info(message: string, ...args: LogArgs[]) {
    this.log('info', message, ...args)
  }

  warn(message: string, ...args: LogArgs[]) {
    this.log('warn', message, ...args)
  }

  error(message: string, ...args: LogArgs[]) {
    this.log('error', message, ...args)
  }

  debug(message: string, ...args: LogArgs[]) {
    this.log('debug', message, ...args)
  }
}

export const logger = new Logger()
