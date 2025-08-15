import { NextRequest, NextResponse } from 'next/server';

// Server-side environment variables
const HEALTHIE_API_URL = process.env.HEALTHIE_API_URL || 'https://api.gethealthie.com/graphql';
const HEALTHIE_API_KEY = process.env.HEALTHIE_API_KEY || '';

async function makeGraphQLRequest(query: string, variables: Record<string, unknown> = {}) {
  if (!HEALTHIE_API_KEY) {
    throw new Error('No API key available');
  }

  console.log('Making GraphQL request to:', HEALTHIE_API_URL);
  console.log('API Key length:', HEALTHIE_API_KEY.length);
  console.log('API Key (first 20 chars):', HEALTHIE_API_KEY.substring(0, 20));
  console.log('Query:', query);
  console.log('Variables:', variables);

  const response = await fetch(HEALTHIE_API_URL, {
    method: 'POST',
    headers: {
      'authorization': `Basic ${HEALTHIE_API_KEY}`,
      'authorizationsource': 'API',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  console.log('Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Response error:', errorText);
    throw new Error(`Healthie API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('Response result:', JSON.stringify(result, null, 2));
  
  if (result.errors) {
    console.error('GraphQL errors:', result.errors);
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Searching for email:', normalizedEmail);
    
    // Query users directly with the API key
    const usersQuery = `
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
    `;

    console.log('Querying users with API key...');
    const usersData = await makeGraphQLRequest(usersQuery, { email: normalizedEmail });
    console.log('Users query response:', JSON.stringify(usersData, null, 2));

    if (usersData?.users && usersData.users.length > 0) {
      const user = usersData.users.find((u: any) => u.email.toLowerCase() === normalizedEmail);
      if (user) {
        console.log('Found user:', user.id);
        const patientData = {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          dob: user.dob,
          sexAtBirth: user.sex,
          phone: user.phone_number,
        };
        return NextResponse.json({ patient: patientData });
      }
    }
    
    return NextResponse.json({ patient: null });
  } catch (error) {
    console.error('Error finding patient:', error);
    return NextResponse.json({ error: 'Failed to find patient' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone } = body;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create patient using createClient mutation
    const createClientMutation = `
      mutation CreateClient($input: createClientInput!) {
        createClient(input: $input) {
          user {
            id
            first_name
            last_name
            email
            phone_number
          }
          messages {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        email: email.toLowerCase().trim(),
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        // Skip welcome email since we're handling the onboarding flow
        dont_send_welcome: true,
        // Skip set password state since we're handling it in our app
        skip_set_password_state: true,
      }
    };

    console.log('Creating client with variables:', JSON.stringify(variables, null, 2));
    
    const data = await makeGraphQLRequest(createClientMutation, variables);
    console.log('Create client response:', JSON.stringify(data, null, 2));

    if (data?.createClient?.messages && data.createClient.messages.length > 0) {
      const errors = data.createClient.messages.map((msg: any) => `${msg.field}: ${msg.message}`).join(', ');
      console.error('GraphQL validation errors:', errors);
      return NextResponse.json({ error: `Validation errors: ${errors}` }, { status: 400 });
    }

    if (!data?.createClient?.user) {
      console.error('No user returned from createClient mutation');
      return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
    }

    const user = data.createClient.user;
    console.log('Successfully created user:', user.id);

    return NextResponse.json({ 
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone_number,
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, demographics } = body;

    if (!id || !demographics) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update patient demographics using updateUser mutation
    const updateUserMutation = `
      mutation UpdateUser($input: updateUserInput!) {
        updateUser(input: $input) {
          user {
            id
            first_name
            last_name
            email
            dob
            sex
            phone_number
          }
          messages {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        id: id,
        dob: demographics.dob,
        sex: demographics.sexAtBirth,
        // Note: Insurance information would need to be handled separately
        // as it's not part of the basic user fields
      }
    };

    console.log('Updating user demographics with variables:', JSON.stringify(variables, null, 2));
    
    const data = await makeGraphQLRequest(updateUserMutation, variables);
    console.log('Update user response:', JSON.stringify(data, null, 2));

    if (data?.updateUser?.messages && data.updateUser.messages.length > 0) {
      const errors = data.updateUser.messages.map((msg: any) => `${msg.field}: ${msg.message}`).join(', ');
      console.error('GraphQL validation errors:', errors);
      return NextResponse.json({ error: `Validation errors: ${errors}` }, { status: 400 });
    }

    if (!data?.updateUser?.user) {
      console.error('No user returned from updateUser mutation');
      return NextResponse.json({ error: 'Failed to update patient demographics' }, { status: 500 });
    }

    const user = data.updateUser.user;
    console.log('Successfully updated user demographics:', user.id);

    return NextResponse.json({ 
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      dob: user.dob,
      sexAtBirth: user.sex,
      phone: user.phone_number,
    });
  } catch (error) {
    console.error('Error updating patient demographics:', error);
    return NextResponse.json({ error: 'Failed to update patient demographics' }, { status: 500 });
  }
}
