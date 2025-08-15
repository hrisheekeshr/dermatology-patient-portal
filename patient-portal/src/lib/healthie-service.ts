import { Patient, FormTask, Appointment } from '@/types';

// Client-side service that only uses API routes
class HealthieService {
  async findPatientByEmail(email: string): Promise<Patient | null> {
    const normalizedEmail = email.toLowerCase().trim();
    
    try {
      const response = await fetch(`/api/healthie/patient?email=${encodeURIComponent(normalizedEmail)}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.patient;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding patient by email:', error);
      return null;
    }
  }

  async createPatient(input: { 
    email: string; 
    password: string; 
    firstName: string; 
    lastName: string; 
    phone?: string;
  }): Promise<{ id: string }> {
    try {
      const response = await fetch('/api/healthie/patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Failed to create patient: ${response.status}`);
      }

      const data = await response.json();
      return { id: data.id };
    } catch (error) {
      console.error('Error creating patient:', error);
      throw error;
    }
  }

  async updatePatientDemographics(
    id: string, 
    data: { 
      dob: string; 
      sexAtBirth: string; 
      insurance: { provider: string; memberId: string };
    }
  ): Promise<void> {
    try {
      const response = await fetch('/api/healthie/patient', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          demographics: data,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update demographics: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating patient demographics:', error);
      throw error;
    }
  }

  async getFormsForPatient(id: string): Promise<FormTask[]> {
    try {
      const response = await fetch(`/api/healthie/forms?patientId=${id}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.forms || [];
      }
      
      // Return empty array if API is not implemented yet
      return [];
    } catch (error) {
      console.error('Error fetching forms:', error);
      // Return empty array for now
      return [];
    }
  }

  async getUpcomingAppointments(id: string): Promise<Appointment[]> {
    try {
      const response = await fetch(`/api/healthie/appointments?patientId=${id}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.appointments || [];
      }
      
      // Return empty array if API is not implemented yet
      return [];
    } catch (error) {
      console.error('Error fetching appointments:', error);
      // Return empty array for now
      return [];
    }
  }
}

// Server-side service that can access environment variables
class HealthieServerService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.HEALTHIE_API_URL || 'https://staging-api.gethealthie.com/graphql';
    this.apiKey = process.env.HEALTHIE_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('HEALTHIE_API_KEY environment variable is required');
    }
  }

  private async makeGraphQLRequest(
    query: string, 
    variables: Record<string, unknown> = {}
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Healthie API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      return result.data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Healthie API request timeout');
      }
      
      throw error;
    }
  }

  async getFormsForPatient(id: string): Promise<FormTask[]> {
    // TODO: Implement real forms fetching with GraphQL
    // This would use the formAnswerGroups query to fetch existing submissions
    return [];
  }

  async getUpcomingAppointments(id: string): Promise<Appointment[]> {
    // TODO: Implement real appointments fetching with GraphQL
    // This would use the appointments query to fetch upcoming appointments
    return [];
  }

  async findPatientByEmail(email: string): Promise<Patient | null> {
    const normalizedEmail = email.toLowerCase().trim();
    
    const query = `
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

    const data = await this.makeGraphQLRequest(query, { email: normalizedEmail });

    if (data?.users && data.users.length > 0) {
      const user = data.users.find((u: any) => u.email.toLowerCase() === normalizedEmail);
      if (user) {
        return {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          dob: user.dob,
          sexAtBirth: user.sex,
          phone: user.phone_number,
        };
      }
    }
    
    return null;
  }
}

// Create instances
export const healthieService = new HealthieService();

// Server-side service (only available on server)
export function getHealthieServerService(): HealthieServerService {
  return new HealthieServerService();
}

