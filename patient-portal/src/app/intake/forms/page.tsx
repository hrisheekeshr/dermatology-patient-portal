'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function FormsPage() {
  const router = useRouter();

  const forms = [
    { id: 'form-1', title: 'Medical History Form', status: 'Completed', description: 'General medical history and current medications' },
    { id: 'form-2', title: 'Insurance Information', status: 'Completed', description: 'Insurance details and coverage information' },
    { id: 'form-3', title: 'Consent Forms', status: 'Pending', description: 'Treatment consent and privacy policy acknowledgment' },
    { id: 'form-4', title: 'Photo Consent', status: 'Pending', description: 'Consent for medical photography and documentation' },
  ];

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
            <h1 className="text-2xl font-bold text-gray-900">Intake Forms</h1>
            <p className="text-gray-600">Complete these forms to help us provide better care</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {forms.map((form) => (
            <Card key={form.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-lg">
                    <FileText className="h-5 w-5 mr-2" />
                    {form.title}
                  </CardTitle>
                  <Badge variant={form.status === 'Completed' ? 'default' : 'secondary'}>
                    {form.status}
                  </Badge>
                </div>
                <CardDescription>{form.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  variant={form.status === 'Completed' ? 'outline' : 'default'}
                  disabled={form.status === 'Completed'}
                >
                  {form.status === 'Completed' ? 'Completed' : 'Start Form'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            This is a placeholder page for the forms functionality.
          </p>
          <Button onClick={() => router.push('/hub')}>
            Return to Patient Hub
          </Button>
        </div>
      </div>
    </div>
  );
}
