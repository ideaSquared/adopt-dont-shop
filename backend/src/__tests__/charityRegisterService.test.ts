import { ClientRequest, IncomingMessage, RequestOptions } from 'http'
import { request } from 'https'
import CharityService from '../services/charityRegisterService'

jest.mock('https', () => ({
  request: jest.fn(
    (
      url: string | URL,
      options: RequestOptions,
      callback?: (res: IncomingMessage) => void,
    ): ClientRequest => {
      const res = {
        statusCode: 200,
        on: jest.fn((event: string, listener: (chunk: string) => void) => {
          if (event === 'data') {
            listener(
              JSON.stringify({
                insolvent: false,
                in_administration: false,
                reg_status: 'R',
                date_of_removal: null,
                who_what_where: [
                  {
                    classification_code: '111',
                    classification_type: 'What',
                  },
                ],
              }),
            )
          } else if (event === 'end') {
            listener('')
          }
          return res
        }),
      } as unknown as IncomingMessage

      if (callback) {
        callback(res)
      }

      return {
        on: jest.fn(),
        end: jest.fn(),
        abort: jest.fn(),
        setTimeout: jest.fn(),
        destroy: jest.fn(),
      } as unknown as ClientRequest
    },
  ),
}))

jest.mock('../services/auditLogService', () => ({
  AuditLogger: {
    logAction: jest.fn(),
  },
}))

describe('CharityService', () => {
  describe('fetchAndValidateCharity', () => {
    it('should return true for a valid charity', async () => {
      const result = await CharityService.fetchAndValidateCharity('12345678')
      expect(result).toBe(true)
    })

    it('should log and throw an error when API request fails', async () => {
      jest.mocked(request).mockImplementationOnce((url, options, callback) => {
        const res = {
          statusCode: 500,
          on: jest.fn((event, listener) => {
            if (event === 'end') {
              listener() // If the listener expects an argument, pass a dummy value
            }
          }),
        } as unknown as IncomingMessage
        callback!(res) // Non-null assertion since callback is optional
        return {
          on: jest.fn(),
          end: jest.fn(),
          abort: jest.fn(),
          setTimeout: jest.fn(),
          destroy: jest.fn(),
        } as unknown as ClientRequest
      })

      await expect(
        CharityService.fetchAndValidateCharity('12345678'),
      ).rejects.toThrow('Unexpected response status: 500')
    })
  })
})
