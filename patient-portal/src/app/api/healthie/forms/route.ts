import { NextRequest, NextResponse } from 'next/server';
import { getHealthieServerService } from '@/lib/healthie-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');

  if (!patientId) {
    return NextResponse.json({ error: 'Patient ID parameter is required' }, { status: 400 });
  }

  try {
    const healthieService = getHealthieServerService();
    const forms = await healthieService.getFormsForPatient(patientId);
    return NextResponse.json({ forms });
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 });
  }
}
