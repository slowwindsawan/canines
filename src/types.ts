export interface User {
  id: string;
  name: string;
  email: string;
  membershipTier: 'starter' | 'deepdive' | 'custom';
  joinDate: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
  };
  subscription: {
    status: 'active' | 'cancelled' | 'past_due' | 'trialing';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    trialEnd?: string;
  };
  paymentMethod?: {
    type: 'card' | 'paypal';
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
  };
}

export interface Dog {
  id: string;
  userId: string;
  name: string;
  breed: string;
  age: number;
  weight: number;
  stoolType: string;
  symptoms: string[];
  behaviorNotes: string;
  lastProtocolId?: string;
  lastDiagnosisSubmissionId?: string;
}

export interface Protocol {
  id: string;
  dogId: string;
  mealPlan: {
    breakfast: string;
    dinner: string;
    mealsPerDay: number;
  };
  supplements: string[];
  lifestyleTips: string[];
  createdAt: string;
  version: number;
  replacesProtocolId?: string;
}

export interface ProgressEntry {
  id: string;
  dogId: string;
  date: string;
  symptoms: string[];
  notes: string;
  improvementScore: number;
  responseToLastDiet?: string;
  vetFeedback?: string;
}

export interface EducationalArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  featured: boolean;
}

export interface MembershipTier {
  id: string;
  name: string;
  price: string;
  features: string[];
  recommended?: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'veterinarian' | 'moderator';
  permissions: string[];
}

export interface DiagnosisSubmission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  dogId: string;
  dogData: Dog;
  aiDiagnosis: {
    confidence: number;
    primaryConcerns: string[];
    recommendations: string[];
    urgencyLevel: 'low' | 'medium' | 'high' | 'urgent';
    generatedAt: string;
  };
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'needs_revision';
  assignedTo?: string;
  reviewNotes?: string;
  finalProtocol?: Protocol;
  submittedAt: string;
  reviewedAt?: string;
  priority: 'low' | 'medium' | 'high';
  isReevaluation: boolean;
  previousSubmissionId?: string;
}

export interface SystemNotification {
  id: string;
  type: 'new_submission' | 'urgent_case' | 'system_alert' | 'follow_up_needed';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  relatedSubmissionId?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  adminId: string;
  adminName: string;
  action: 'diagnosis_reviewed' | 'protocol_modified' | 'status_changed' | 'manual_override' | 'bulk_approval';
  details: string;
  previousValue?: any;
  newValue?: any;
  submissionId?: string;
  timestamp: string;
  ipAddress?: string;
}

export interface ReevaluationInput {
  dogId: string;
  updatedWeight?: number;
  newSymptoms?: string[];
  responseToLastDiet?: string;
  vetFeedback?: string;
}