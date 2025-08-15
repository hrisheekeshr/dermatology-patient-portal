import { NextResponse } from 'next/server';

const HEALTHIE_API_URL = process.env.HEALTHIE_API_URL || 'https://staging-api.gethealthie.com/graphql';
const HEALTHIE_API_KEY = process.env.HEALTHIE_API_KEY || '';

export async function GET() {
  try {
    console.log('Testing GraphQL connection...');
    console.log('API URL:', HEALTHIE_API_URL);
    console.log('API Key exists:', !!HEALTHIE_API_KEY);

    if (!HEALTHIE_API_KEY) {
      return NextResponse.json({ error: 'No API key available' }, { status: 500 });
    }

    const query = `
      query TestQuery {
        currentUser {
          id
          first_name
          last_name
          email
        }
      }
    `;

    const response = await fetch(HEALTHIE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HEALTHIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
      }),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error:', errorText);
      return NextResponse.json({ error: `API error: ${response.status} - ${errorText}` }, { status: 500 });
    }

    const result = await response.json();
    console.log('Response result:', JSON.stringify(result, null, 2));

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return NextResponse.json({ error: `GraphQL errors: ${JSON.stringify(result.errors)}` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: result.data,
      userCount: result.data?.users?.length || 0
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({ error: `Test failed: ${error}` }, { status: 500 });
  }
}
