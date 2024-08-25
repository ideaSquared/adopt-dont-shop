import { IncomingMessage } from 'http'
import { request } from 'https'
import { AuditLogger } from './auditLogService'

// Define the types for the company data
interface CompanyData {
  company_status: string
  status: string
  date_of_cessation: string | null
}

class CompanyHouseService {
  /**
   * Validates company data by checking its operational status and the absence of a cessation date.
   *
   * @param {CompanyData} companyData - An object containing information about a company.
   * @returns {boolean} - Returns true if the company is marked as 'active' or 'open' and does not have a 'date_of_cessation'.
   */
  public static verifyCompanyIsValid(companyData: CompanyData): boolean {
    return (
      (companyData.company_status === 'active' ||
        companyData.company_status === 'open') &&
      companyData.date_of_cessation === null
    )
  }

  /**
   * Fetches and validates company information from the UK's Companies House API.
   *
   * @param {string} companyNumber - The company registration number to query.
   * @returns {Promise<boolean>} - Returns true if the company information is valid, false otherwise.
   * @throws {Error} - Throws an error if the API request fails or if an unexpected status is received.
   */
  public static async fetchAndValidateCompany(
    companyNumber: string,
  ): Promise<boolean> {
    const baseUrl = 'https://api.company-information.service.gov.uk/company'
    const fullURL = `${baseUrl}/${companyNumber}`
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY

    if (!apiKey) {
      const errorMessage =
        'COMPANIES_HOUSE_API_KEY is not defined in environment variables.'
      await AuditLogger.logAction(
        'CompanyRegisterService',
        errorMessage,
        'ERROR',
        companyNumber,
      )
      throw new Error(errorMessage)
    }

    const encodedApiKey = Buffer.from(`${apiKey}:`).toString('base64')
    const authHeader = `Basic ${encodedApiKey}`

    try {
      await AuditLogger.logAction(
        'CompanyRegisterService',
        `Fetching company details for company number: ${companyNumber}`,
        'INFO',
        companyNumber,
      )

      const responseData: CompanyData = await new Promise((resolve, reject) => {
        const req = request(
          fullURL,
          {
            method: 'GET',
            headers: {
              Authorization: authHeader,
            },
          },
          (res: IncomingMessage) => {
            let data = ''

            // Accumulate data chunks
            res.on('data', (chunk) => {
              data += chunk
            })

            // Resolve the promise once the response has ended
            res.on('end', () => {
              if (res.statusCode === 200) {
                try {
                  const parsedData = JSON.parse(data)
                  resolve(parsedData)
                } catch (error) {
                  reject(new Error('Failed to parse response data'))
                }
              } else {
                reject(
                  new Error(`Unexpected response status: ${res.statusCode}`),
                )
              }
            })
          },
        )

        req.on('error', (error) => {
          reject(error)
        })

        req.end()
      })

      const isValid = this.verifyCompanyIsValid(responseData)
      await AuditLogger.logAction(
        'CompanyRegisterService',
        `Company validation result for ${companyNumber}: ${isValid}`,
        'INFO',
        companyNumber,
      )
      return isValid
    } catch (error: any) {
      const errorMessage = `Error in fetching/validating company for company number ${companyNumber}: ${error.message}`
      await AuditLogger.logAction(
        'CompanyRegisterService',
        errorMessage,
        'ERROR',
        companyNumber,
      )
      throw error
    }
  }
}

export default CompanyHouseService
