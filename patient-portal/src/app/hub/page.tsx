'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { Patient, FormTask, Appointment } from '@/types';
import { healthieService } from '@/lib/healthie-service';
import { Calendar, FileText, User, LogOut } from 'lucide-react';

export default function HubPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [forms, setForms] = useState<FormTask[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { email, signOut } = useAuth();

  useEffect(() => {
    const loadPatientData = async () => {
      if (!email) {
        router.push('/login');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch patient data
        const patientData = await healthieService.findPatientByEmail(email);
        if (!patientData) {
          router.push('/intake/demographics');
          return;
        }

        setPatient(patientData);

        // Fetch forms and appointments
        const [formsData, appointmentsData] = await Promise.all([
          healthieService.getFormsForPatient(patientData.id),
          healthieService.getUpcomingAppointments(patientData.id),
        ]);

        setForms(formsData);
        setAppointments(appointmentsData);
      } catch (err) {
        console.error('Error loading patient data:', err);
        setError('Failed to load your information. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPatientData();
  }, [email, router]);

  const handleSignOut = () => {
    signOut();
    router.push('/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDOB = (dob: string) => {
    const date = new Date(dob);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const getNextAppointment = () => {
    if (appointments.length === 0) return null;
    
    const now = new Date();
    const upcoming = appointments
      .filter(apt => new Date(apt.startsAt) > now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    
    return upcoming[0] || null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <div className="space-x-4">
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => router.push('/login')}>
                  Back to Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  const nextAppointment = getNextAppointment();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <User className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Patient Portal</h1>
                <p className="text-sm text-gray-600">Welcome back, {patient.firstName}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut} size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Patient Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-lg">{patient.firstName} {patient.lastName}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-lg">{patient.email}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Patient ID</p>
                  <p className="text-lg font-mono text-sm">{patient.id}</p>
                </div>

                {patient.dob && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                    <p className="text-lg">{formatDOB(patient.dob)}</p>
                  </div>
                )}

                {patient.insurance && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Insurance</p>
                    <p className="text-lg">{patient.insurance.provider}</p>
                    <p className="text-sm text-gray-600">ID: {patient.insurance.memberId}</p>
                  </div>
                )}

                {patient.phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-lg">{patient.phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Intake Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Intake Tasks
                </CardTitle>
                <CardDescription>
                  Complete these forms to help us provide better care
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {forms.map((form) => (
                    <div key={form.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{form.title}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={form.status === 'Completed' ? 'default' : 'secondary'}>
                          {form.status}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant={form.status === 'Completed' ? 'outline' : 'default'}
                          onClick={() => router.push('/intake/forms')}
                        >
                          {form.status === 'Completed' ? 'View' : 'Start'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Appointments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Upcoming Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextAppointment ? (
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Next Appointment</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(nextAppointment.startsAt)}
                        </p>
                      </div>
                      <Badge variant="default">Scheduled</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No upcoming appointments</p>
                    <Button onClick={() => router.push('/schedule')}>
                      Schedule Appointment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schedule Telehealth CTA */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Schedule a Telehealth Visit
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Connect with our dermatology specialists from the comfort of your home
                  </p>
                  <Button 
                    size="lg" 
                    onClick={() => router.push('/schedule')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Schedule Telehealth
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
