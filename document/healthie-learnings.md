# Healthie API Integration: Best Practices & Design Patterns

## Executive Summary

This document captures proven patterns, best practices, and implementation learnings from the Cara Dermatology Patient Portal POC. Based on analysis of working code in `src/lib/healthie-service.ts`, `src/lib/apollo-client.ts`, and related components, these patterns have been validated against Healthie's staging API and demonstrate production-ready approaches.

## Apollo Client Configuration

### Proven Pattern: Centralized Client with Error Handling

**Evidence from `src/lib/apollo-client.ts`:**

```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_HEALTHIE_API_URL || 'https://staging-api.gethealthie.com/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = process.env.NEXT_PUBLIC_HEALTHIE_API_TOKEN;
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});
```

**Key Learnings:**
- Use `errorPolicy: 'all'` to receive both data and errors in responses
- Environment-based URL configuration supports staging/production deployment
- Bearer token authentication is the standard approach for Healthie API
- Centralized client configuration ensures consistent behavior across the app

### Production Enhancement Pattern

```typescript
import { from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(`GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`);
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError}`);
    // Implement retry logic for network errors
  }
});

const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => !!error && !error.message.includes('401')
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, retryLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { errorPolicy: 'all' },
    query: { errorPolicy: 'all' },
  },
});
```

## Patient Management Patterns

### Proven Pattern: Singleton Service with Validation

**Evidence from `src/lib/healthie-service.ts`:**

```typescript
export class HealthiePatientService {
  private static instance: HealthiePatientService;
  private providerId: string;

  constructor() {
    this.providerId = process.env.NEXT_PUBLIC_HEALTHIE_PROVIDER_ID || '';
    if (!this.providerId) {
      console.warn('HEALTHIE_PROVIDER_ID not set in environment variables');
    }
  }

  static getInstance(): HealthiePatientService {
    if (!HealthiePatientService.instance) {
      HealthiePatientService.instance = new HealthiePatientService();
    }
    return HealthiePatientService.instance;
  }

  validateProviderContext(): boolean {
    if (!this.providerId || this.providerId === 'your_provider_id_here') {
      throw new Error('Provider ID not configured. Please set NEXT_PUBLIC_HEALTHIE_PROVIDER_ID in environment variables.');
    }
    return true;
  }
}
```

**Key Learnings:**
- Singleton pattern ensures consistent provider context across operations
- Environment validation prevents runtime errors with clear messages
- Provider ID is required for all patient operations in Healthie

### Patient Creation Pattern

**Evidence from working implementation:**

```typescript
const SIGN_UP_MUTATION = gql`
  mutation SignUp($input: signUpInput!) {
    signUp(input: $input) {
      user {
        id
        first_name
        last_name
        email
        created_at
        is_patient
      }
      messages {
        field
        message
      }
      token
      nextRequiredStep
    }
  }
`;

async createPatient(data: PatientCreationData): Promise<HealthiePatientResponse> {
  try {
    this.validateProviderContext();

    const input = {
      dietitian_id: this.providerId,  // Critical: assigns patient to provider
      email: data.email,
      password: data.password,
      role: 'patient' as const,
      first_name: data.firstName,
      last_name: data.lastName,
      timezone: data.timezone || 'America/New_York',
      ...(data.phone && { phone_number: data.phone }),
    };

    const result = await apolloClient.mutate({
      mutation: SIGN_UP_MUTATION,
      variables: { input },
    });

    const { user, messages, token, nextRequiredStep } = result.data.signUp;

    // Handle validation errors
    if (messages && messages.length > 0) {
      const errors = parseValidationErrors(messages);
      return { success: false, errors, message: 'Please correct the following errors:' };
    }

    return { success: true, patient: user, token, nextRequiredStep };
  } catch (error: any) {
    return this.handleAPIError(error);
  }
}
```

**Critical Insights:**
- `dietitian_id` field assigns patient to provider - this is mandatory
- `role: 'patient'` ensures correct user type in Healthie
- Validation errors come in `messages` array with field-specific details
- Date of birth cannot be set during signup - requires separate `updateUser` mutation

### Patient Verification Pattern

**Evidence from working verification:**

```typescript
const GET_ORGANIZATION_MEMBERS_QUERY = gql`
  query GetOrganizationMembers($keywords: String) {
    organizationMembers(keywords: $keywords) {
      id
      first_name
      last_name
      email
      created_at
      is_patient
    }
  }
`;

async verifyPatientCreation(email: string): Promise<boolean> {
  try {
    const result = await apolloClient.query({
      query: GET_ORGANIZATION_MEMBERS_QUERY,
      variables: { keywords: email },
      fetchPolicy: 'network-only', // Always fetch fresh data
    });

    const members = result.data.organizationMembers || [];
    const foundPatient = members.find((member: any) => 
      member.email === email && member.is_patient === true
    );

    return !!foundPatient;
  } catch (error) {
    console.error('Error verifying patient creation:', error);
    return false;
  }
}
```

**Key Learnings:**
- `organizationMembers` query with email keyword search is most reliable verification method
- `fetchPolicy: 'network-only'` ensures fresh data, bypassing Apollo cache
- Filter by `is_patient: true` to distinguish patients from providers
- Verification may take 2-3 seconds due to Healthie's indexing delay

## Data Storage Patterns

### Structured Note Storage Pattern

**Evidence from working implementation:**

```typescript
const CREATE_NOTE_MUTATION = gql`
  mutation CreateNote($input: createNoteInput!) {
    createNote(input: $input) {
      note {
        id
        content
        created_at
      }
      messages {
        field
        message
      }
    }
  }
`;

async storeIntakeData(patientId: string, intakeData: CompleteIntakeData): Promise<{success: boolean; message?: string}> {
  try {
    const noteContent = this.formatIntakeDataAsNote(intakeData);

    const result = await apolloClient.mutate({
      mutation: CREATE_NOTE_MUTATION,
      variables: {
        input: {
          user_id: patientId,
          content: noteContent,
          note_type: 'intake_form', // Custom note type for categorization
        }
      },
    });

    const { note, messages } = result.data.createNote;

    if (messages && messages.length > 0) {
      const errors = parseValidationErrors(messages);
      return { success: false, errors, message: 'Failed to store intake data' };
    }

    if (note) {
      // Also update basic user information
      await this.updatePatientBasicInfo(patientId, intakeData.personalInfo);
      return { success: true, message: 'Intake data stored successfully' };
    }

    return { success: false, message: 'Failed to store intake data for unknown reason' };
  } catch (error: any) {
    const apiError = handleAPIError(error);
    return { success: false, message: apiError.message };
  }
}
```

### Markdown Formatting Pattern

**Evidence from working formatter:**

```typescript
private formatIntakeDataAsNote(intakeData: CompleteIntakeData): string {
  const { personalInfo, medicalHistory, lifestyleFactors } = intakeData;

  return `
# Patient Intake Form - Dermatology Portal

**Completed:** ${new Date().toLocaleDateString()}

## Personal Information
- **Name:** ${personalInfo.firstName} ${personalInfo.lastName}
- **Date of Birth:** ${personalInfo.dateOfBirth}
- **Email:** ${personalInfo.email}
- **Phone:** ${personalInfo.phone}

## Medical History

### Past Skin Conditions
${medicalHistory.pastSkinConditions.length > 0 
  ? medicalHistory.pastSkinConditions.map(condition => `- ${condition}`).join('\n') 
  : '- None reported'}

### Current Medications
${medicalHistory.currentMedications.length > 0 
  ? medicalHistory.currentMedications.map(medication => `- ${medication}`).join('\n') 
  : '- None reported'}

---
*This intake form was completed through the dermatology patient portal.*
  `.trim();
}
```

**Key Learnings:**
- Markdown formatting provides readable structure in Healthie's note interface
- Custom `note_type` enables filtering and categorization
- Timestamp and source attribution aid in audit trails
- Handle empty arrays gracefully with "None reported" fallbacks

## Error Handling Patterns

### Comprehensive Error Classification

**Evidence from `src/lib/error-utils.ts`:**

```typescript
export interface APIError {
  type: 'VALIDATION_ERROR' | 'SCHEMA_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  fields?: Record<string, string>;
}

export function handleAPIError(error: any): APIError {
  // GraphQL errors
  if (error.graphQLErrors && error.graphQLErrors.length > 0) {
    const graphQLError = error.graphQLErrors[0];
    
    if (graphQLError.extensions?.code === 'undefinedField') {
      return {
        type: 'SCHEMA_ERROR',
        message: 'Invalid request format. Please check the form data and try again.',
      };
    }

    return {
      type: 'UNKNOWN_ERROR',
      message: graphQLError.message || 'A GraphQL error occurred',
    };
  }

  // Network errors
  if (error.networkError) {
    return {
      type: 'NETWORK_ERROR',
      message: 'Network error. Please check your connection and try again.',
    };
  }

  return {
    type: 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred. Please try again.',
  };
}
```

### Validation Error Parsing

**Evidence from working parser:**

```typescript
export function parseValidationErrors(messages: ValidationError[]): Record<string, string> {
  const errors: Record<string, string> = {};
  
  messages.forEach(({ field, message }) => {
    errors[field] = message;
  });

  return errors;
}
```

**Key Learnings:**
- Healthie returns validation errors in `messages` array with `field` and `message` properties
- GraphQL errors and network errors require different handling approaches
- User-friendly error messages should hide technical details while logging full errors
- Field-specific errors enable precise form validation feedback

## Form State Management Patterns

### React Context with Reducer Pattern

**Evidence from `src/contexts/intake-form-context.tsx`:**

```typescript
interface IntakeFormState {
  currentStep: number;
  personalInfo: Partial<PersonalInfo>;
  medicalHistory: Partial<MedicalHistory>;
  lifestyleFactors: Partial<LifestyleFactors>;
  isSubmitting: boolean;
  errors: Record<string, string>;
  completedSteps: Set<number>;
  patientCreated?: {
    id: string;
    email: string;
    verified: boolean;
  };
}

function intakeFormReducer(state: IntakeFormState, action: IntakeFormAction): IntakeFormState {
  switch (action.type) {
    case 'UPDATE_PERSONAL_INFO':
      return {
        ...state,
        personalInfo: { ...state.personalInfo, ...action.data }
      };
    
    case 'SET_PATIENT_CREATED':
      return {
        ...state,
        patientCreated: {
          id: action.patientId,
          email: action.patientEmail,
          verified: false
        }
      };
    
    default:
      return state;
  }
}
```

**Key Learnings:**
- Reducer pattern provides predictable state updates
- Partial types allow progressive form completion
- Patient creation state tracking enables verification workflows
- Error state management enables field-specific validation display

### Async Operation Patterns

**Evidence from working async handlers:**

```typescript
const createPatient = async (): Promise<boolean> => {
  try {
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    dispatch({ type: 'CLEAR_ERRORS' });

    // Validate required fields
    const { personalInfo } = state;
    if (!personalInfo.firstName || !personalInfo.lastName || !personalInfo.email) {
      setErrors({ general: 'Please complete all required personal information fields' });
      return false;
    }

    const result = await healthieService.createPatient(patientData);

    if (result.success && result.patient) {
      dispatch({ 
        type: 'SET_PATIENT_CREATED', 
        patientId: result.patient.id, 
        patientEmail: result.patient.email 
      });
      
      // Non-blocking verification
      verifyPatientByEmail(result.patient.email).catch(error => {
        console.error('Verification failed but patient was created:', error);
      });
      
      return true;
    } else {
      if (result.errors) {
        setErrors(result.errors);
      } else {
        setErrors({ general: result.message || 'Failed to create patient account' });
      }
      return false;
    }
  } catch (error: any) {
    // Detailed error handling with user-friendly messages
    let errorMessage = 'An unexpected error occurred. Please try again.';
    
    if (error?.message?.includes('Provider ID not configured')) {
      errorMessage = 'System configuration error: Provider ID not set. Please contact support.';
    } else if (error?.message?.includes('Network Error')) {
      errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection and try again.';
    }
    
    setErrors({ general: errorMessage });
    return false;
  } finally {
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
  }
};
```

## Validation Patterns

### Zod Schema Integration

**Evidence from `src/lib/validation-schemas.ts`:**

```typescript
export const personalInfoSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters'),
  
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters'),
  
  phone: z.string()
    .min(1, 'Phone number is required')
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .max(20, 'Phone number must be less than 20 characters'),
  
  insurance: z.object({
    provider: z.string()
      .min(1, 'Insurance provider is required')
      .max(100, 'Insurance provider must be less than 100 characters'),
    
    memberId: z.string()
      .min(1, 'Member ID is required')
      .max(50, 'Member ID must be less than 50 characters'),
  })
});
```

**Key Learnings:**
- Zod provides both TypeScript types and runtime validation
- Field-specific error messages improve user experience
- Regex validation for phone numbers handles international formats
- Nested object validation supports complex form structures

## Performance Optimization Patterns

### Memoization and Optimization

```typescript
import { useMemo, useCallback } from 'react';

const FormComponent = () => {
  const { state, updatePersonalInfo } = useIntakeForm();
  
  // Memoize expensive computations
  const validationErrors = useMemo(() => {
    return personalInfoSchema.safeParse(state.personalInfo);
  }, [state.personalInfo]);
  
  // Memoize event handlers
  const handleFieldChange = useCallback((field: string, value: any) => {
    updatePersonalInfo({ [field]: value });
  }, [updatePersonalInfo]);
  
  return (
    // Component JSX
  );
};
```

### Debounced Validation

```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedValidation = useDebouncedCallback(
  async (formData) => {
    const result = await personalInfoSchema.safeParseAsync(formData);
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
    } else {
      clearErrors();
    }
  },
  300 // 300ms delay
);
```

## Security Best Practices

### Environment Variable Management

**Evidence from configuration:**

```typescript
// ✅ Correct: Environment validation
const validateEnvironment = () => {
  const requiredVars = [
    'NEXT_PUBLIC_HEALTHIE_API_URL',
    'NEXT_PUBLIC_HEALTHIE_API_TOKEN',
    'NEXT_PUBLIC_HEALTHIE_PROVIDER_ID'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// ✅ Correct: Token handling
const getAuthHeaders = () => ({
  authorization: `Bearer ${process.env.NEXT_PUBLIC_HEALTHIE_API_TOKEN}`,
  'content-type': 'application/json'
});
```

### PHI Handling

```typescript
// ✅ Correct: Sanitized logging
const logPatientOperation = (operation: string, patientId: string, success: boolean) => {
  console.log({
    operation,
    patientId: patientId.substring(0, 8) + '***', // Partial ID only
    success,
    timestamp: new Date().toISOString()
  });
};

// ❌ Incorrect: Full PHI in logs
// console.log('Patient data:', { email: patient.email, phone: patient.phone });
```

## Testing Patterns

### API Integration Testing

```typescript
// Mock Apollo Client for testing
const mockApolloClient = {
  mutate: jest.fn(),
  query: jest.fn()
};

describe('HealthiePatientService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create patient successfully', async () => {
    mockApolloClient.mutate.mockResolvedValue({
      data: {
        signUp: {
          user: { id: '123', email: 'test@example.com' },
          messages: [],
          token: 'mock-token'
        }
      }
    });

    const result = await healthieService.createPatient(mockPatientData);
    
    expect(result.success).toBe(true);
    expect(result.patient?.id).toBe('123');
  });
});
```

## Production Deployment Patterns

### Environment Configuration

```typescript
// Production environment validation
const validateProductionConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    // Ensure production API endpoints
    if (process.env.NEXT_PUBLIC_HEALTHIE_API_URL?.includes('staging')) {
      throw new Error('Production deployment cannot use staging API');
    }
    
    // Validate token format
    if (!process.env.NEXT_PUBLIC_HEALTHIE_API_TOKEN?.startsWith('gh_prod_')) {
      console.warn('API token may not be production token');
    }
  }
};
```

### Rate Limiting Considerations

```typescript
// Implement request queuing for rate limit compliance
class RateLimitedHealthieService {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private readonly REQUESTS_PER_MINUTE = 100;
  private readonly MINUTE_IN_MS = 60000;
  
  private async processQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        await request();
        // Wait to respect rate limits
        await new Promise(resolve => setTimeout(resolve, this.MINUTE_IN_MS / this.REQUESTS_PER_MINUTE));
      }
    }
    
    this.isProcessing = false;
  }
}
```

## Summary of Proven Patterns

1. **Apollo Client**: Centralized configuration with error policies and retry logic
2. **Service Layer**: Singleton pattern with environment validation
3. **Patient Creation**: Provider assignment with comprehensive error handling
4. **Data Storage**: Structured notes with markdown formatting
5. **Form Management**: React Context with reducer pattern for complex state
6. **Validation**: Zod schemas for type-safe validation
7. **Error Handling**: Classified error types with user-friendly messages
8. **Security**: Environment validation and PHI sanitization
9. **Performance**: Memoization and debounced validation
10. **Testing**: Mocked Apollo Client for integration tests

These patterns have been validated against Healthie's staging API and demonstrate production-ready approaches for building patient portals with Healthie integration.