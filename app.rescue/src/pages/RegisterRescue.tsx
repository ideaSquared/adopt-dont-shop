import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Heading, Text } from '@adopt-dont-shop/lib.components';
import { apiService } from '@adopt-dont-shop/lib.api';
import * as styles from './RegisterRescue.css';

const TOTAL_STEPS = 5;

type FormData = {
  // Step 1: Owner
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Step 2: Organisation
  name: string;
  rescueEmail: string;
  phone: string;
  // Step 3: Address
  address: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  // Step 4: Registration numbers
  companiesHouseNumber: string;
  charityRegistrationNumber: string;
};

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
  rescueEmail: '',
  phone: '',
  address: '',
  city: '',
  county: '',
  postcode: '',
  country: 'GB',
  companiesHouseNumber: '',
  charityRegistrationNumber: '',
};

type FieldErrors = Partial<Record<keyof FormData, string>>;

const validateStep = (step: number, data: FormData): FieldErrors => {
  const errors: FieldErrors = {};

  if (step === 1) {
    if (!data.firstName.trim()) errors.firstName = 'First name is required';
    if (!data.lastName.trim()) errors.lastName = 'Last name is required';
    if (!data.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(data.email)) errors.email = 'Invalid email format';
    if (!data.password) errors.password = 'Password is required';
    else if (data.password.length < 8) errors.password = 'Must be at least 8 characters';
    else if (!/[a-z]/.test(data.password)) errors.password = 'Must contain a lowercase letter';
    else if (!/[A-Z]/.test(data.password)) errors.password = 'Must contain an uppercase letter';
    else if (!/\d/.test(data.password)) errors.password = 'Must contain a digit';
    else if (!/[^a-zA-Z0-9]/.test(data.password))
      errors.password = 'Must contain a special character';
    if (data.password && data.confirmPassword && data.password !== data.confirmPassword)
      errors.confirmPassword = 'Passwords do not match';
    if (!data.confirmPassword) errors.confirmPassword = 'Please confirm your password';
  }

  if (step === 2) {
    if (!data.name.trim()) errors.name = 'Organisation name is required';
    if (!data.rescueEmail.trim()) errors.rescueEmail = 'Contact email is required';
    else if (!/\S+@\S+\.\S+/.test(data.rescueEmail)) errors.rescueEmail = 'Invalid email format';
  }

  if (step === 3) {
    if (!data.address.trim()) errors.address = 'Address is required';
    if (!data.city.trim()) errors.city = 'City is required';
    if (!data.postcode.trim()) errors.postcode = 'Postcode is required';
    if (!data.country.trim()) errors.country = 'Country is required';
  }

  // Step 4: optional fields, no required validation
  return errors;
};

type RegistrationResponse = {
  success: boolean;
  message: string;
  data: { rescueId: string; userId: string };
};

const RegisterRescue = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const goNext = () => {
    const stepErrors = validateStep(step, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep(prev => Math.min(prev + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    setErrors({});
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        name: formData.name,
        rescueEmail: formData.rescueEmail,
        address: formData.address,
        city: formData.city,
        postcode: formData.postcode,
        country: formData.country,
      };

      if (formData.phone) payload.phone = formData.phone;
      if (formData.county) payload.county = formData.county;
      if (formData.companiesHouseNumber)
        payload.companiesHouseNumber = formData.companiesHouseNumber;
      if (formData.charityRegistrationNumber)
        payload.charityRegistrationNumber = formData.charityRegistrationNumber;

      await apiService.post<RegistrationResponse>('/api/v1/rescues/register', payload);
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (
    field: keyof FormData,
    labelText: string,
    type = 'text',
    placeholder = ''
  ) => (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={field}>
        {labelText}
      </label>
      <input
        className={styles.input}
        id={field}
        name={field}
        type={type}
        placeholder={placeholder}
        value={formData[field]}
        onChange={e => updateField(field, e.target.value)}
        aria-invalid={!!errors[field]}
        aria-describedby={errors[field] ? `${field}-error` : undefined}
      />
      {errors[field] && (
        <span className={styles.fieldError} id={`${field}-error`} role="alert">
          {errors[field]}
        </span>
      )}
    </div>
  );

  if (submitted) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.card}>
          <div className={styles.successContainer}>
            <Heading level="h2" className={styles.successTitle}>
              Registration Successful
            </Heading>
            <Text className={styles.successMessage}>
              Thank you for registering <strong>{formData.name}</strong>. We have sent a
              verification email to <strong>{formData.email}</strong>. Please check your inbox and
              click the verification link to activate your account.
            </Text>
            <div
              className={styles.buttonRow}
              style={{ justifyContent: 'center', marginTop: '2rem' }}
            >
              <Button variant="primary" onClick={() => navigate('/login')}>
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.card}>
        {/* Step indicator */}
        <div
          className={styles.stepIndicator}
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
        >
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const stepNum = i + 1;
            let dotClass = styles.stepDot;
            if (stepNum === step) dotClass += ` ${styles.stepDotActive}`;
            else if (stepNum < step) dotClass += ` ${styles.stepDotCompleted}`;
            return <div key={stepNum} className={dotClass} />;
          })}
        </div>

        {submitError && (
          <div className={styles.errorAlert} role="alert">
            {submitError}
          </div>
        )}

        {/* Step 1: Owner Account */}
        {step === 1 && (
          <>
            <h2 className={styles.stepTitle}>Your Account</h2>
            <p className={styles.stepDescription}>
              Create your personal account to manage the rescue organisation.
            </p>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldRow}>
                {renderField('firstName', 'First Name')}
                {renderField('lastName', 'Last Name')}
              </div>
              {renderField('email', 'Email', 'email', 'you@example.com')}
              {renderField('password', 'Password', 'password')}
              {renderField('confirmPassword', 'Confirm Password', 'password')}
            </div>
          </>
        )}

        {/* Step 2: Organisation Details */}
        {step === 2 && (
          <>
            <h2 className={styles.stepTitle}>Organisation Details</h2>
            <p className={styles.stepDescription}>Tell us about your rescue organisation.</p>
            <div className={styles.fieldGroup}>
              {renderField('name', 'Organisation Name', 'text', 'Happy Tails Rescue')}
              {renderField('rescueEmail', 'Contact Email', 'email', 'contact@yourrescue.org')}
              {renderField('phone', 'Phone (optional)', 'tel', '+44 20 7946 0958')}
            </div>
          </>
        )}

        {/* Step 3: Address */}
        {step === 3 && (
          <>
            <h2 className={styles.stepTitle}>Address</h2>
            <p className={styles.stepDescription}>Where is your rescue organisation based?</p>
            <div className={styles.fieldGroup}>
              {renderField('address', 'Address', 'text', '123 Rescue Lane')}
              <div className={styles.fieldRow}>
                {renderField('city', 'City', 'text', 'London')}
                {renderField('county', 'County (optional)', 'text', 'Greater London')}
              </div>
              <div className={styles.fieldRow}>
                {renderField('postcode', 'Postcode', 'text', 'SW1A 1AA')}
                {renderField('country', 'Country Code', 'text', 'GB')}
              </div>
            </div>
          </>
        )}

        {/* Step 4: Charity/Company Registration */}
        {step === 4 && (
          <>
            <h2 className={styles.stepTitle}>Verification Numbers</h2>
            <p className={styles.stepDescription}>
              If your organisation is registered with Companies House or the Charity Commission,
              providing these numbers allows automatic verification. This is optional — you can
              complete registration without them and be verified manually by our team.
            </p>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                {renderField(
                  'companiesHouseNumber',
                  'Companies House Number (optional)',
                  'text',
                  'e.g. 12345678'
                )}
                <span className={styles.optionalHint}>
                  8 alphanumeric characters (e.g. 00123456, SC123456)
                </span>
              </div>
              <div className={styles.field}>
                {renderField(
                  'charityRegistrationNumber',
                  'Charity Registration Number (optional)',
                  'text',
                  'e.g. 1234567'
                )}
                <span className={styles.optionalHint}>
                  7 digits, optionally followed by -N for sub-charities
                </span>
              </div>
            </div>
          </>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <>
            <h2 className={styles.stepTitle}>Review & Submit</h2>
            <p className={styles.stepDescription}>Please review your details before submitting.</p>

            <div className={styles.reviewSection}>
              <span className={styles.reviewLabel}>Owner: </span>
              <span className={styles.reviewValue}>
                {formData.firstName} {formData.lastName} ({formData.email})
              </span>
            </div>

            <div className={styles.reviewSection}>
              <span className={styles.reviewLabel}>Organisation: </span>
              <span className={styles.reviewValue}>{formData.name}</span>
            </div>

            <div className={styles.reviewSection}>
              <span className={styles.reviewLabel}>Contact Email: </span>
              <span className={styles.reviewValue}>{formData.rescueEmail}</span>
            </div>

            {formData.phone && (
              <div className={styles.reviewSection}>
                <span className={styles.reviewLabel}>Phone: </span>
                <span className={styles.reviewValue}>{formData.phone}</span>
              </div>
            )}

            <div className={styles.reviewSection}>
              <span className={styles.reviewLabel}>Address: </span>
              <span className={styles.reviewValue}>
                {formData.address}, {formData.city}
                {formData.county ? `, ${formData.county}` : ''}, {formData.postcode},{' '}
                {formData.country}
              </span>
            </div>

            {formData.companiesHouseNumber && (
              <div className={styles.reviewSection}>
                <span className={styles.reviewLabel}>Companies House: </span>
                <span className={styles.reviewValue}>{formData.companiesHouseNumber}</span>
              </div>
            )}

            {formData.charityRegistrationNumber && (
              <div className={styles.reviewSection}>
                <span className={styles.reviewLabel}>Charity Commission: </span>
                <span className={styles.reviewValue}>{formData.charityRegistrationNumber}</span>
              </div>
            )}
          </>
        )}

        {/* Navigation buttons */}
        <div className={styles.buttonRow}>
          {step > 1 ? (
            <Button variant="outline" onClick={goBack}>
              Back
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate('/login')}>
              Cancel
            </Button>
          )}

          {step < TOTAL_STEPS ? (
            <Button variant="primary" onClick={goNext}>
              Next
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Registering...' : 'Submit Registration'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterRescue;
