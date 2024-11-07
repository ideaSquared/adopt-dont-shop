import {
  Button,
  Card,
  CountrySelectInput,
  FormInput,
  SelectInput,
  TextInput,
} from '@adoptdontshop/components'
import { useUser } from 'contexts/auth/UserContext'
import React, { useEffect, useState } from 'react'

const Rescue: React.FC = () => {
  const { rescue } = useUser()
  const [rescueName, setRescueName] = useState('')
  const [rescueType, setRescueType] = useState('')
  const [referenceNumber, setReferenceNumber] = useState<string | undefined>()
  const [country, setCountry] = useState('United Kingdom')

  // Populate fields with the rescue data from context
  useEffect(() => {
    if (rescue) {
      setRescueName(rescue.rescue_name || '')
      setRescueType(rescue.rescue_type || '')
      setCountry(rescue.country || 'United Kingdom')

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
    setRescueType(e.target.value)
  }

  const handleReferenceNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setReferenceNumber(e.target.value)
  }

  const handleCountryChange = (selectedCountry: string) => {
    setCountry(selectedCountry)
  }

  const handleSubmit = () => {
    console.log('Submitted for verification:', { rescueName, referenceNumber })
  }

  return (
    <div>
      <h1>Rescue</h1>

      <Card title="Rescue Information">
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
      </Card>

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
          <Button type="button" onClick={handleSubmit}>
            Submit for verification
          </Button>
        </FormInput>
      )}
      <FormInput label="Country">
        <CountrySelectInput
          onCountryChange={handleCountryChange}
          countryValue={country}
        />
      </FormInput>
    </div>
  )
}

export default Rescue
