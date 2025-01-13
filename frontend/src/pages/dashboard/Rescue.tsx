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
import styled from 'styled-components'

// Style definitions
const Container = styled.div`
  padding: 1rem;
`

const Title = styled.h1`
  margin-bottom: 2rem;
  font-size: 1.8rem;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 600px;
`

const ButtonContainer = styled.div`
  margin-top: 2rem;
`

// Types
type RescueProps = Record<string, never>

// Component
export const Rescue: React.FC<RescueProps> = () => {
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
    <Container>
      <Title>Rescue</Title>

      <Form onSubmit={handleSubmit}>
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
        <ButtonContainer>
          <Button type="submit">Save</Button>
        </ButtonContainer>
      </Form>
    </Container>
  )
}
