import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser, DiagnosisSubmission, SystemNotification, AuditLog} from "../types";
import { mockAdminUser, mockDiagnosisSubmissions, mockNotifications, mockAuditLogs, mockSiteSettings, mockFeedbackEntries } from '../data/mockAdminData';
import { useDog } from './DogContext';

interface AdminContextType {
  adminUser: AdminUser | null;
  submissions: DiagnosisSubmission[];
  notifications: SystemNotification[];
  auditLogs: AuditLog[];
  getAllDogs: () => any[];
  updateSubmissionStatus: (id: string, status: DiagnosisSubmission['status'], notes?: string, finalProtocol?: Protocol) => void;
  assignSubmission: (id: string, adminId: string) => void;
  markNotificationRead: (id: string) => void;
  bulkApproveSubmissions: (ids: string[]) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  addDiagnosisSubmission: (submission: Omit<DiagnosisSubmission, 'id' | 'submittedAt'>) => string;
  assignFeedback: (id: string, adminId: string) => void;
  isLoading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [submissions, setSubmissions] = useState<DiagnosisSubmission[]>(mockDiagnosisSubmissions);
  const [notifications, setNotifications] = useState<SystemNotification[]>(mockNotifications);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(mockAuditLogs);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(mockSiteSettings);
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>(mockFeedbackEntries);
  const [isLoading, setIsLoading] = useState(true);

  // Mock function to get all dogs from all users
  const getAllDogs = () => {
    // In a real app, this would fetch from a backend
    // For now, we'll return mock data that represents dogs from multiple users
    return [
      {
        id: 'dog-1',
        userId: '1',
        userName: 'Sarah Johnson',
        userEmail: 'sarah@example.com',
        name: 'Max',
        breed: 'Golden Retriever',
        age: 4,
        weight: 65,
        phase: 'rebuild',
        lastGutCheckDate: '2024-01-23',
        flags: [],
        symptoms: [],
        improvementTrend: 'improving'
      },
      {
        id: 'dog-2',
        userId: '1',
        userName: 'Sarah Johnson',
        userEmail: 'sarah@example.com',
        name: 'Luna',
        breed: 'Border Collie',
        age: 2,
        weight: 45,
        phase: 'reset',
        lastGutCheckDate: '2024-01-20',
        flags: ['symptoms_worsening', 'overdue_tasks'],
        symptoms: ['loose_stool', 'lethargy'],
        improvementTrend: 'declining'
      },
      {
        id: 'dog-3',
        userId: '2',
        userName: 'Marcus Thompson',
        userEmail: 'marcus.thompson@email.com',
        name: 'Rex',
        breed: 'German Shepherd',
        age: 6,
        weight: 75,
        phase: 'strengthen',
        lastGutCheckDate: '2024-01-22',
        flags: ['overdue_tasks'],
        symptoms: [],
        improvementTrend: 'stable'
      },
      {
        id: 'dog-4',
        userId: '3',
        userName: 'Jennifer Park',
        userEmail: 'jennifer.park@email.com',
        name: 'Milo',
        breed: 'French Bulldog',
        age: 3,
        weight: 28,
        phase: 'maintenance',
        lastGutCheckDate: '2024-01-24',
        flags: [],
        symptoms: [],
        improvementTrend: 'improving'
      },
      {
        id: 'dog-5',
        userId: '4',
        userName: 'David Kim',
        userEmail: 'david.kim@email.com',
        name: 'Storm',
        breed: 'Siberian Husky',
        age: 5,
        weight: 60,
        phase: 'reset',
        lastGutCheckDate: '2024-01-15',
        flags: ['overdue_gut_check', 'symptoms_worsening'],
        symptoms: ['constipation', 'lethargy'],
        improvementTrend: 'declining'
      }
    ];
  };
  useEffect(() => {
    // Simulate checking for admin session
    const savedAdmin = localStorage.getItem('adminUser');
    if (savedAdmin) {
      setAdminUser(JSON.parse(savedAdmin));
    } else {
      // For demo purposes, auto-login as admin
      setAdminUser(mockAdminUser);
      localStorage.setItem('adminUser', JSON.stringify(mockAdminUser));
    }
    setIsLoading(false);
  }, []);

  const updateSubmissionStatus = (id: string, status: DiagnosisSubmission['status'], notes?: string, finalProtocol?: Protocol) => {
    setSubmissions(prev => prev.map(sub => 
      sub.id === id 
        ? { 
            ...sub, 
            status, 
            reviewNotes: notes || sub.reviewNotes,
            finalProtocol: finalProtocol || sub.finalProtocol,
            reviewedAt: new Date().toISOString(),
            assignedTo: adminUser?.id 
          }
        : sub
    ));

    // Add audit log
    addAuditLog({
      userId: submissions.find(s => s.id === id)?.userId || '',
      adminId: adminUser?.id || '',
      adminName: adminUser?.name || '',
      action: 'status_changed',
      details: `Changed status to ${status}${notes ? ` with notes: ${notes}` : ''}`,
      submissionId: id,
      ipAddress: '192.168.1.100',
    });
  };

  const assignSubmission = (id: string, adminId: string) => {
    setSubmissions(prev => prev.map(sub => 
      sub.id === id ? { ...sub, assignedTo: adminId, status: 'under_review' } : sub
    ));

    addAuditLog({
      userId: submissions.find(s => s.id === id)?.userId || '',
      adminId: adminUser?.id || '',
      adminName: adminUser?.name || '',
      action: 'diagnosis_reviewed',
      details: `Assigned submission to ${adminId}`,
      submissionId: id,
      ipAddress: '192.168.1.100',
    });
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, isRead: true } : notif
    ));
  };

  const bulkApproveSubmissions = (ids: string[]) => {
    setSubmissions(prev => prev.map(sub => 
      ids.includes(sub.id) 
        ? { 
            ...sub, 
            status: 'approved', 
            reviewedAt: new Date().toISOString(),
            assignedTo: adminUser?.id 
          }
        : sub
    ));

    addAuditLog({
      userId: 'multiple',
      adminId: adminUser?.id || '',
      adminName: adminUser?.name || '',
      action: 'bulk_approval',
      details: `Bulk approved ${ids.length} submissions`,
      ipAddress: '192.168.1.100',
    });
  };

  const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const newLog: AuditLog = {
      ...log,
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const addDiagnosisSubmission = (submission: Omit<DiagnosisSubmission, 'id' | 'submittedAt'>): string => {
    const newSubmission: DiagnosisSubmission = {
      ...submission,
      id: `sub-${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
    
    setSubmissions(prev => [newSubmission, ...prev]);
    
    // Add notification for new submission
    const newNotification: SystemNotification = {
      id: `notif-${Date.now()}`,
      type: 'new_submission',
      title: `New Case Submission - ${submission.dogData.breed}`,
      message: `${submission.userName} submitted a case for ${submission.dogData.breed} - awaiting review`,
      priority: submission.aiDiagnosis.urgencyLevel === 'urgent' ? 'high' : 
               submission.aiDiagnosis.urgencyLevel === 'high' ? 'medium' : 'low',
      isRead: false,
      createdAt: new Date().toISOString(),
      actionUrl: `/admin/submissions/${newSubmission.id}`,
      relatedSubmissionId: newSubmission.id,
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    return newSubmission.id;
  };

  const updateSiteSettings = (settings: Partial<SiteSettings>) => {
    setSiteSettings(prev => ({
      ...prev,
      ...settings,
      updatedAt: new Date().toISOString()
    }));

    // Add audit log for settings change
    addAuditLog({
      userId: 'system',
      adminId: adminUser?.id || '',
      adminName: adminUser?.name || '',
      action: 'settings_updated',
      details: `Updated site settings: ${Object.keys(settings).join(', ')}`,
      ipAddress: '192.168.1.100',
    });
  };

  const updateFeedbackStatus = (id: string, status: FeedbackEntry['status'], adminNotes?: string) => {
    setFeedbackEntries(prev => prev.map(feedback =>
      feedback.id === id
        ? { ...feedback, status, adminNotes: adminNotes || feedback.adminNotes }
        : feedback
    ));

    // Add audit log for feedback status change
    addAuditLog({
      userId: feedbackEntries.find(f => f.id === id)?.userId || '',
      adminId: adminUser?.id || '',
      adminName: adminUser?.name || '',
      action: 'feedback_updated',
      details: `Updated feedback status to ${status}${adminNotes ? ` with notes: ${adminNotes}` : ''}`,
      ipAddress: '192.168.1.100',
    });
  };

  const assignFeedback = (id: string, adminId: string) => {
    setFeedbackEntries(prev => prev.map(feedback =>
      feedback.id === id
        ? { ...feedback, assignedTo: adminId, status: feedback.status === 'new' ? 'reviewed' : feedback.status }
        : feedback
    ));

    addAuditLog({
      userId: feedbackEntries.find(f => f.id === id)?.userId || '',
      adminId: adminUser?.id || '',
      adminName: adminUser?.name || '',
      action: 'feedback_assigned',
      details: `Assigned feedback to ${adminId}`,
      ipAddress: '192.168.1.100',
    });
  };

  return (
    <AdminContext.Provider value={{
      adminUser,
      submissions,
      notifications,
      auditLogs,
      siteSettings,
      feedbackEntries,
      getAllDogs,
      updateSubmissionStatus,
      assignSubmission,
      markNotificationRead,
      bulkApproveSubmissions,
      addAuditLog,
      addDiagnosisSubmission,
      updateSiteSettings,
      updateFeedbackStatus,
      assignFeedback,
      isLoading,
    }}>
      {children}
    </AdminContext.Provider>
  );
};