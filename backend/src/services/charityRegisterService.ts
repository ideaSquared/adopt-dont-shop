import { IncomingMessage } from 'http'
import { request } from 'https'
import { AuditLogger } from './auditLogService'

// Define the types for the charity data
interface Classification {
  classification_code: string
  classification_type: string
}

interface CharityData {
  insolvent: boolean
  in_administration: boolean
  reg_status: string
  date_of_removal: string | null
  who_what_where: Classification[]
}

class CharityService {
  /**
   * Evaluates the validity of charity data based on a set of predefined conditions.
   *
   * @param {CharityData} charityData - An object containing data about a charity.
   * @returns {boolean} - Returns true if the charity data meets all the predefined conditions, otherwise false.
   */
  public static verifyCharityIsValid(charityData: CharityData): boolean {
    // Ensure who_what_where exists and is an array
    const hasValidClassification =
      Array.isArray(charityData.who_what_where) &&
      charityData.who_what_where.some(
        (item) =>
          item.classification_code === '111' &&
          item.classification_type === 'What',
      )

    // Check the base conditions
    return (
      charityData.insolvent === false &&
      charityData.in_administration === false &&
      charityData.reg_status === 'R' &&
      charityData.date_of_removal === null &&
      hasValidClassification
    )
  }

  /**
   * Utility function to fetch and validate charity information from the UK's Charity Commission API.
   *
   * @param {string} registeredNumber - The charity registration number.
   * @returns {Promise<boolean>} - True if the charity information is valid, false otherwise.
   * @throws {Error} - Throws an error if the API request fails or if an unexpected status is received.
   */
  public static async fetchAndValidateCharity(
    registeredNumber: string,
  ): Promise<boolean> {
    const apiSuffix = '0'
    const baseUrl =
      'https://api.charitycommission.gov.uk/register/api/allcharitydetailsV2'
    const fullURL = `${baseUrl}/${registeredNumber}/${apiSuffix}`

    try {
      await AuditLogger.logAction(
        'CharityRegisterService',
        `Fetching charity details for registration number: ${registeredNumber}`,
        'INFO',
        registeredNumber,
      )

      const responseData: CharityData = await new Promise((resolve, reject) => {
        const req = request(
          fullURL,
          {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache',
              'Ocp-Apim-Subscription-Key': process.env
                .CHARITY_COMMISSION_API_KEY as string,
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

      const isValid = this.verifyCharityIsValid(responseData)
      await AuditLogger.logAction(
        'CharityRegisterService',
        `Charity validation result for ${registeredNumber}: ${isValid}`,
        'INFO',
        registeredNumber,
      )
      return isValid
    } catch (error: any) {
      const errorMessage = `Error in fetching/validating charity for registration number ${registeredNumber}: ${error.message}`
      await AuditLogger.logAction(
        'CharityRegisterService',
        errorMessage,
        'ERROR',
        registeredNumber,
      )
      throw error
    }
  }
}

export default CharityService
