'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/auth-context';
import { demographicsSchema, type DemographicsFormData } from '@/lib/validations';
import { healthieService } from '@/lib/healthie-service';

export default function DemographicsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { email } = useAuth();

  const form = useForm<DemographicsFormData>({
    resolver: zodResolver(demographicsSchema),
    mode: 'onBlur',
    defaultValues: {
      firstName: '',
      lastName: '',
      dob: '',
      sexAtBirth: 'prefer_not_to_say',
      insuranceProvider: '',
      insuranceMemberId: '',
      phone: '',
    },
  });

  const onSubmit = async (data: DemographicsFormData) => {
    if (!email) {
      setError('No email found in session. Please sign in again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if patient already exists
      let patient = await healthieService.findPatientByEmail(email);

      if (!patient) {
        // Create new patient
        await healthieService.createPatient({
          email,
          password: 'temp-password', // This would be set during registration
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        });

        // Fetch the created patient
        patient = await healthieService.findPatientByEmail(email);
      }

      if (!patient) {
        throw new Error('Failed to create or find patient');
      }

      // Update demographics
      await healthieService.updatePatientDemographics(patient.id, {
        dob: data.dob,
        sexAtBirth: data.sexAtBirth,
        insurance: {
          provider: data.insuranceProvider,
          memberId: data.insuranceMemberId,
        },
      });

      // Navigate to hub
      router.push('/hub');
    } catch (err) {
      console.error('Demographics submission error:', err);
      setError('An error occurred while saving your information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600">No session found. Please sign in first.</p>
              <Button 
                onClick={() => router.push('/login')}
                className="mt-4"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Patient Demographics</CardTitle>
            <CardDescription>
              Please provide your basic information to complete your registration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your first name" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your last name" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sexAtBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sex Assigned at Birth *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your sex assigned at birth" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="intersex">Intersex</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="insuranceProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance Provider *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Blue Cross, Aetna" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="insuranceMemberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance Member ID *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your member ID" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your phone number" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/login')}
                    disabled={isLoading}
                  >
                    Back to Login
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save and Continue'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
