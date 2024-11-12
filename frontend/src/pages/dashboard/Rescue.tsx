import {
  Button,
  CountrySelectInput,
  FormInput,
  SelectInput,
  TextInput,
} from '@adoptdontshop/components'
import { RescueService, RescueType } from '@adoptdontshop/libs/rescues'
import { useUser } from 'contexts/auth/UserContext'
import React, { useEffect, useState } from 'react'

const Rescue: React.FC = () => {
  const { rescue } = useUser()
  const [rescueId, setRescueId] = useState('')
  const [rescueName, setRescueName] = useState('')
  const [rescueType, setRescueType] = useState<
    'Individual' | 'Charity' | 'Company' | undefined
  >(undefined)
  const [referenceNumber, setReferenceNumber] = useState<string | undefined>()
  const [country, setCountry] = useState('United Kingdom')

  // Populate fields with the rescue data from context
  useEffect(() => {
    if (rescue) {
      setRescueName(rescue.rescue_name || '')
      setRescueType(rescue.rescue_type || '')
      setCountry(rescue.country || 'United Kingdom')
      setRescueId(rescue.rescue_id)

      // Check if the rescue is of type OrganizationRescue to set the reference number
      if ('reference_number' in rescue) {
        setReferenceNumber(rescue.reference_number)
      }
    }
  }, [rescue])

  const handleRescueNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRescueName(e.target.value)
  }

  const handleRescueTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRescueType(e.target.value as RescueType)
  }

  const handleReferenceNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setReferenceNumber(e.target.value)
  }

  const handleCountryChange = (selectedCountry: string) => {
    setCountry(selectedCountry)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!rescue) return

    try {
      const updatedRescue = await RescueService.updateRescue(rescue.rescue_id, {
        rescue_name: rescueName,
        rescue_type: rescueType,
        country,
        reference_number: referenceNumber,
      })
    } catch (error) {
      console.error('Error updating rescue:', error)
    }
  }

  return (
    <div>
      <h1>Rescue</h1>

      {/* TODO: Turn this into a little info card showing the data we hold already */}
      {/* <Card title="Rescue Information">
        <p>
          <strong>Rescue ID:</strong> {rescueId}
        </p>
        <p>
          <strong>Rescue Name:</strong> {rescueName}
        </p>
        <p>
          <strong>Rescue Type:</strong> {rescueType}
        </p>
        <p>
          <strong>Country:</strong> {country}
        </p>
        {referenceNumber && (
          <p>
            <strong>Reference Number:</strong> {referenceNumber}
          </p>
        )}
      </Card> */}

      <form onSubmit={handleSubmit}>
        <FormInput label="Rescue name">
          <TextInput
            type="text"
            value={rescueName}
            onChange={handleRescueNameChange}
            placeholder="Enter rescue name"
          />
        </FormInput>
        <FormInput label="Rescue type">
          <SelectInput
            value={rescueType}
            onChange={handleRescueTypeChange}
            options={[
              { value: 'individual', label: 'Individual' },
              { value: 'charity', label: 'Charity' },
              { value: 'company', label: 'Company' },
            ]}
            disabled
          />
        </FormInput>
        {rescue && rescue.rescue_type != 'Individual' && (
          <FormInput label="Reference number">
            <TextInput
              type="text"
              value={referenceNumber || ''}
              onChange={handleReferenceNumberChange}
              placeholder="Enter reference number"
            />
            {/* <Button type="button" onClick={handleSubmit}>
              Submit for verification
            </Button> */}
          </FormInput>
        )}
        <FormInput label="Country">
          <CountrySelectInput
            onCountryChange={handleCountryChange}
            countryValue={country}
          />
        </FormInput>
        <Button type="submit">Save</Button>
      </form>
    </div>
  )
}

export default Rescue
