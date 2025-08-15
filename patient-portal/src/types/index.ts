export type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dob?: string; // YYYY-MM-DD
  sexAtBirth?: 'female' | 'male' | 'intersex' | 'unknown' | 'prefer_not_to_say';
  insurance?: { provider: string; memberId: string };
  phone?: string;
};

export type FormTask = { 
  id: string; 
  title: string; 
  status: 'Pending' | 'Completed' 
};

export type Appointment = { 
  id: string; 
  startsAt: string 
}; // ISO

export type Session = {
  sessionId: string;
  email: string;
  expiresAt: string;
};

export type DemographicsFormData = {
  firstName: string;
  lastName: string;
  dob: string;
  sexAtBirth: 'female' | 'male' | 'intersex' | 'unknown' | 'prefer_not_to_say';
  insuranceProvider: string;
  insuranceMemberId: string;
  phone?: string;
};

export type LoginFormData = {
  email: string;
  password: string;
};
