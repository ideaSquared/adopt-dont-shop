import dotenv from 'dotenv'
import { ClientRequest, IncomingMessage, RequestOptions } from 'http'
import { request } from 'https'
import CompanyHouseService from '../services/companyHouseService'
dotenv.config()

jest.mock('https', () => ({
  request: jest.fn(
    (
      url: string | URL,
      options: RequestOptions,
      callback?: (res: IncomingMessage) => void,
    ): ClientRequest => {
      const res = {
        statusCode: 200,
        on: jest.fn((event: string, listener: (chunk: any) => void) => {
          if (event === 'data') {
            listener(
              JSON.stringify({
                company_status: 'active',
                status: 'active',
                date_of_cessation: null,
              }),
            )
          } else if (event === 'end') {
            listener(null) // Ensure the 'end' event is triggered
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
        // Other ClientRequest methods and properties can be added here if needed
      } as unknown as ClientRequest
    },
  ),
}))

jest.mock('../services/auditLogService', () => ({
  AuditLogger: {
    logAction: jest.fn(),
  },
}))

describe('CompanyHouseService', () => {
  describe('verifyCompanyIsValid', () => {
    it('should return true for valid company data', () => {
      const companyData = {
        company_status: 'active',
        status: 'active',
        date_of_cessation: null,
      }
      const result = CompanyHouseService.verifyCompanyIsValid(companyData)
      expect(result).toBe(true)
    })

    it('should return false for invalid company data', () => {
      const companyData = {
        company_status: 'dissolved',
        status: 'dissolved',
        date_of_cessation: '2023-01-01',
      }
      const result = CompanyHouseService.verifyCompanyIsValid(companyData)
      expect(result).toBe(false)
    })
  })

  describe('fetchAndValidateCompany', () => {
    it('should return true for a valid company', async () => {
      const result = await CompanyHouseService.fetchAndValidateCompany(
        '12345678',
      )
      expect(result).toBe(true)
    })

    it('should log and throw an error when API request fails', async () => {
      jest.mocked(request).mockImplementationOnce((url, options, callback) => {
        const res = {
          statusCode: 500,
          on: jest.fn((event, listener) => {
            if (event === 'end') {
              listener(null) // Pass `null` or an empty string to satisfy TypeScript
            }
          }),
        } as unknown as IncomingMessage
        callback!(res) // Non-null assertion to ensure callback is invoked
        return {
          on: jest.fn(),
          end: jest.fn(),
          abort: jest.fn(),
          setTimeout: jest.fn(),
          destroy: jest.fn(),
        } as unknown as ClientRequest
      })

      await expect(
        CompanyHouseService.fetchAndValidateCompany('12345678'),
      ).rejects.toThrow('Unexpected response status: 500')
    })
  })
})
