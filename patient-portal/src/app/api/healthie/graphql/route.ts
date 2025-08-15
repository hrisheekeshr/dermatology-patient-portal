import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, variables } = body;

    // TODO: Implement actual Healthie GraphQL API call
    console.log('GraphQL Query:', query);
    console.log('Variables:', variables);

    return NextResponse.json({ 
      data: null,
      message: 'GraphQL endpoint not yet implemented'
    });
  } catch (error) {
    console.error('GraphQL API error:', error);
    return NextResponse.json({ error: 'GraphQL API error' }, { status: 500 });
  }
}
