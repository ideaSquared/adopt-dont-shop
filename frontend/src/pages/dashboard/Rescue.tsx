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
  max-width: 600px;
  margin: 0 auto;
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

const VerificationBadge = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: ${(props) => props.theme.typography.size.sm};
  white-space: nowrap;
`

const VerifyButton = styled.button`
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: ${(props) => props.theme.typography.size.sm};
  color: inherit;

  &:hover {
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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
  const [referenceNumberVerified, setReferenceNumberVerified] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  )
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
            setReferenceNumberVerified(
              freshRescue.reference_number_verified || false,
            )
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

  const handleVerifyReference = async () => {
    if (!rescue || !referenceNumber) return

    try {
      setVerificationError(null)
      const response = await RescueService.verifyReferenceNumber(
        rescue.rescue_id,
        referenceNumber,
      )

      setReferenceNumberVerified(response.isVerified)

      // Update the rescue context if needed
      if (rescue && 'reference_number' in rescue) {
        setRescue({
          ...rescue,
          reference_number: referenceNumber,
          reference_number_verified: response.isVerified,
        })
      }

      if (!response.isVerified) {
        setVerificationError(response.message)
      }
    } catch (error) {
      console.error('Error verifying reference number:', error)
      setVerificationError('Failed to verify reference number')
      setReferenceNumberVerified(false)
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

        <FormInput
          label="Rescue type"
          description={'To change this please contact help@adoptdontshop.app'}
        >
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

        {rescue && rescue.rescue_type !== 'Individual' && (
          <FormInput
            label="Reference number"
            description={verificationError || undefined}
          >
            <TextInput
              type="text"
              value={referenceNumber || ''}
              onChange={handleReferenceNumberChange}
              placeholder="Enter reference number"
              endAddons={[
                {
                  content: (
                    <VerificationBadge>
                      {referenceNumberVerified
                        ? 'Verified ✅'
                        : 'Not verified ❌'}
                    </VerificationBadge>
                  ),
                  variant: referenceNumberVerified ? 'success' : 'error',
                },
                {
                  content: (
                    <VerifyButton
                      onClick={handleVerifyReference}
                      disabled={!referenceNumber}
                      type="button"
                    >
                      Verify
                    </VerifyButton>
                  ),
                  variant: 'content',
                },
              ]}
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
      </Form>
    </Container>
  )
}
