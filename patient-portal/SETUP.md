# Environment Setup for Healthie API

To use the Healthie API, create a `.env.local` file in the `patient-portal` directory with the following variables:

```env
HEALTHIE_API_URL=https://staging-api.gethealthie.com/graphql
HEALTHIE_API_KEY=your_api_key_here
HEALTHIE_PROVIDER_ID=your_provider_id_here
```

## How to get these values:

1. **HEALTHIE_API_URL**: Already set to the staging API URL
2. **HEALTHIE_API_KEY**: Your Healthie API key/token
3. **HEALTHIE_PROVIDER_ID**: The provider ID for the logged-in user

## Testing the API:

Once you set up the environment variables:

1. Start the development server: `npm run dev`
2. Try logging in with any email address
3. The system will make a real GraphQL query to check if the patient exists
4. If found, you'll be routed to the Patient Hub
5. If not found, you'll be routed to the demographics form

## Required Environment Variables:

The application requires these environment variables to function:
- **HEALTHIE_API_KEY**: Required for all API calls
- **HEALTHIE_API_URL**: GraphQL endpoint (defaults to staging)
- **HEALTHIE_PROVIDER_ID**: Provider ID for patient creation

## GraphQL Query Used:

```graphql
query FindUserByEmail($email: String!) {
  users(keywords: $email) {
    id
    first_name
    last_name
    email
    dob
    sex
    phone_number
  }
}
```

This will search for patients by email in your Healthie system and return the patient data if found.
