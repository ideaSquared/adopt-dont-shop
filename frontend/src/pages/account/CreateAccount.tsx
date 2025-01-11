import React, { useState } from 'react'

// Third-party imports
import styled from 'styled-components'

// Internal imports
import {
  Button,
  CountrySelectInput,
  FormInput,
  SelectInput,
  TextInput,
} from '@adoptdontshop/components'
import { CreateUserPayload, UserService } from '@adoptdontshop/libs/users/'

// Style definitions
const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
`

const Title = styled.h1`
  font-size: 2rem;
  color: #333;
  margin-bottom: 2rem;
`

const Message = styled.p<{ isError?: boolean }>`
  color: ${({ isError }) => (isError ? '#dc3545' : '#28a745')};
  margin: 1rem 0;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: ${({ isError }) => (isError ? '#f8d7da' : '#d4edda')};
`

const Form = styled.form`
  margin-bottom: 2rem;
`

const HelpText = styled.p`
  color: #666;
  font-size: 0.9rem;
  margin: 0.5rem 0;
`

const Link = styled.a`
  color: #007bff;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const ToggleContainer = styled.p`
  margin-top: 2rem;
  text-align: center;
`

// Types
type CreateAccountProps = {
  // No props needed currently
}

type RescueType = 'individual' | 'charity' | 'company' | 'other'

export const CreateAccount: React.FC<CreateAccountProps> = () => {
  // State
  const [isRescueForm, setIsRescueForm] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rescueType, setRescueType] = useState<RescueType>('individual')
  const [rescueName, setRescueName] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [message, setMessage] = useState('')

  // Event handlers
  const handleUserSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      return
    }

    const newUser: CreateUserPayload = {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
    }

    try {
      await UserService.createAccount(newUser)
      setMessage(
        'Account created! Please check your email to verify your account.',
      )
    } catch (error) {
      setMessage('Failed to create user account')
    }
  }

  const handleRescueSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      return
    }
    if (rescueType === 'other') {
      setMessage("We don't support other types of rescues.")
      return
    }

    const newUser: CreateUserPayload = {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
    }

    const rescueDetails = {
      rescue_type: rescueType,
      rescue_name: rescueName,
      city,
      country,
      reference_number: referenceNumber,
    }

    try {
      await UserService.createRescueAccount(newUser, rescueDetails)
      setMessage(
        'Rescue account created! Please check your email to verify your account.',
      )
    } catch (error) {
      setMessage('Failed to create rescue account')
    }
  }

  // Render
  return (
    <Container>
      <Title>
        {isRescueForm ? 'Create Rescue Account' : 'Create User Account'}
      </Title>
      <Form onSubmit={isRescueForm ? handleRescueSubmit : handleUserSubmit}>
        <FormInput label="First name">
          <TextInput
            type="text"
            value={firstName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFirstName(e.target.value)
            }
            required
          />
        </FormInput>
        <FormInput label="Last name">
          <TextInput
            type="text"
            value={lastName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setLastName(e.target.value)
            }
            required
          />
        </FormInput>
        <FormInput label="Email">
          <TextInput
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            type="email"
            required
          />
        </FormInput>
        <FormInput label="Password">
          <TextInput
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            type="password"
            required
          />
        </FormInput>
        <FormInput label="Confirm password">
          <TextInput
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setConfirmPassword(e.target.value)
            }
            type="password"
            required
          />
        </FormInput>

        {isRescueForm && (
          <>
            <FormInput label="Rescue type">
              <SelectInput
                value={rescueType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setRescueType(e.target.value as RescueType)
                }
                options={[
                  { value: 'individual', label: 'Individual' },
                  { value: 'charity', label: 'Charity' },
                  { value: 'company', label: 'Company' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </FormInput>

            {(rescueType === 'charity' || rescueType === 'company') && (
              <>
                <FormInput label="Rescue name">
                  <TextInput
                    type="text"
                    value={rescueName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRescueName(e.target.value)
                    }
                  />
                </FormInput>
                <FormInput
                  label={
                    rescueType === 'charity'
                      ? 'Charity number'
                      : 'Company number'
                  }
                >
                  <TextInput
                    type="text"
                    value={referenceNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setReferenceNumber(e.target.value)
                    }
                  />
                </FormInput>
                <HelpText>
                  Please enter the reference number as it appears in official
                  records.{' '}
                  {rescueType === 'charity' ? (
                    <Link href="https://register-of-charities.charitycommission.gov.uk/charity-search/">
                      Find it on the Charity Register.
                    </Link>
                  ) : (
                    <Link href="https://find-and-update.company-information.service.gov.uk/">
                      Find it on Company House.
                    </Link>
                  )}
                </HelpText>
              </>
            )}
            {rescueType === 'other' && (
              <HelpText>
                I&apos;m afraid we don&apos;t currently support other types of
                rescues - email us at help@adoptdontshop.app
              </HelpText>
            )}
            <FormInput label="City">
              <TextInput
                type="text"
                value={city}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCity(e.target.value)
                }
              />
            </FormInput>
            <FormInput label="Country">
              <CountrySelectInput
                countryValue={country}
                onCountryChange={(value: string) => setCountry(value)}
              />
            </FormInput>
          </>
        )}
        <Button type="submit">
          {isRescueForm ? 'Create rescue account' : 'Create user account'}
        </Button>
      </Form>
      {message && (
        <Message isError={message.includes('Failed')}>{message}</Message>
      )}
      <ToggleContainer>
        {isRescueForm ? 'Not a rescue?' : 'Are you a rescue?'}{' '}
        <Button onClick={() => setIsRescueForm(!isRescueForm)}>
          {isRescueForm ? 'Create user account' : 'Create rescue account'}
        </Button>
      </ToggleContainer>
    </Container>
  )
}
