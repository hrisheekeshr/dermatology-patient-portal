'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SchedulePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button variant="outline" size="sm" onClick={() => router.push('/hub')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Hub
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Telehealth</h1>
            <p className="text-gray-600">Book your virtual dermatology consultation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Coming Soon Card */}
          <Card className="lg:col-span-2">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Video className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Coming Soon</CardTitle>
              <CardDescription className="text-lg">
                Telehealth scheduling functionality will be available in Phase 2
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                We&apos;re working hard to bring you a seamless telehealth scheduling experience. 
                This feature will allow you to:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="text-center">
                  <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Book Appointments</h3>
                  <p className="text-sm text-gray-600">Choose from available time slots</p>
                </div>
                <div className="text-center">
                  <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Manage Schedule</h3>
                  <p className="text-sm text-gray-600">Reschedule or cancel appointments</p>
                </div>
                <div className="text-center">
                  <Video className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Virtual Consultations</h3>
                  <p className="text-sm text-gray-600">Connect with specialists remotely</p>
                </div>
              </div>

              <div className="space-x-4">
                <Button onClick={() => router.push('/hub')}>
                  Return to Patient Hub
                </Button>
                <Button variant="outline" onClick={() => router.push('/login')}>
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
