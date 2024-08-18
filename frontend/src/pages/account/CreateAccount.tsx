import React, { useState } from 'react'
import { User, UserService } from '@adoptdontshop/libs/users/'
import {
  Button,
  CountrySelectInput,
  FormInput,
  SelectInput,
  TextInput,
} from '@adoptdontshop/components'

const CreateAccount: React.FC = () => {
  const [isRescueForm, setIsRescueForm] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rescueType, setRescueType] = useState('')
  const [rescueName, setRescueName] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [message, setMessage] = useState('')

  const handleUserSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const newUser: Omit<User, 'user_id'> = {
      first_name: firstName,
      last_name: lastName,
      email,
    }
    const user = UserService.createAccount(newUser)
    setMessage(`User registered with ID: ${user.user_id}`)
  }

  const handleRescueSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (rescueType === 'other') {
      setMessage("We don't support other types of rescues.")
      return
    }
    const newUser: Omit<User, 'user_id'> = {
      first_name: firstName,
      last_name: lastName,
      email,
    }
    const user = UserService.createAccount(newUser)
    setMessage(`Rescue registered with ID: ${user.user_id}`)
  }

  return (
    <div>
      <h1>{isRescueForm ? 'Create Rescue Account' : 'Create User Account'}</h1>
      <form onSubmit={isRescueForm ? handleRescueSubmit : handleUserSubmit}>
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
                  setRescueType(e.target.value)
                }
                options={[
                  { value: 'charity', label: 'Charity' },
                  { value: 'company', label: 'Company' },
                  { value: 'individual', label: 'Individual' },
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
                <p>
                  Please enter the reference number as it appears in official
                  records.{' '}
                  {rescueType === 'charity' ? (
                    <a href="https://register-of-charities.charitycommission.gov.uk/charity-search/">
                      Find it on the Charity Register.
                    </a>
                  ) : (
                    <a href="https://find-and-update.company-information.service.gov.uk/">
                      Find it on Company House.
                    </a>
                  )}
                </p>
              </>
            )}
            {rescueType === 'other' && (
              <div>
                <p>
                  I&apos;m afraid we don&apos;t currently support other types of
                  rescues - email us at help@adoptdontshop.app
                </p>
              </div>
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
      </form>
      {message && <p>{message}</p>}
      <p>
        {isRescueForm ? 'Not a rescue?' : 'Are you a rescue?'}{' '}
        <Button onClick={() => setIsRescueForm(!isRescueForm)}>
          {isRescueForm ? 'Create user account' : 'Create rescue account'}
        </Button>
      </p>
    </div>
  )
}

export default CreateAccount
