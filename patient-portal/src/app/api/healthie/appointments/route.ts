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
    const appointments = await healthieService.getUpcomingAppointments(patientId);
    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}
