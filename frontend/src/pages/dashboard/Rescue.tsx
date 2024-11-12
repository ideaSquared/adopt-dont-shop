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
  const { rescue, setRescue } = useUser()
  const [rescueId, setRescueId] = useState('')
  const [rescueName, setRescueName] = useState('')
  const [rescueType, setRescueType] = useState<
    'Individual' | 'Charity' | 'Company' | undefined
  >(undefined)
  const [referenceNumber, setReferenceNumber] = useState<string | undefined>()
  const [country, setCountry] = useState('United Kingdom')
  const [isInitialized, setIsInitialized] = useState(false)

  // Fetch the latest rescue data by ID on mount to ensure data persists
  useEffect(() => {
    const fetchRescueData = async () => {
      if (rescue && !isInitialized) {
        const freshRescue = await RescueService.getRescueById(rescue.rescue_id)
        if (freshRescue) {
          setRescue(freshRescue) // Update the context with fresh data
          setRescueName(freshRescue.rescue_name || '')
          setRescueType(freshRescue.rescue_type || '')
          setCountry(freshRescue.country || 'United Kingdom')
          setRescueId(freshRescue.rescue_id)

          // Set reference number if it's an OrganizationRescue
          if ('reference_number' in freshRescue) {
            setReferenceNumber(freshRescue.reference_number)
          }
          setIsInitialized(true) // Prevent further updates to form state
        }
      }
    }
    fetchRescueData()
  }, [rescue, setRescue, isInitialized])

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
      setRescue(updatedRescue ?? null)
    } catch (error) {
      console.error('Error updating rescue:', error)
    }
  }

  return (
    <div>
      <h1>Rescue</h1>

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
