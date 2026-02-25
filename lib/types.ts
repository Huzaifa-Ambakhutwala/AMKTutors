import { Timestamp } from "firebase/firestore";

export type UserRole = 'ADMIN' | 'TUTOR' | 'PARENT' | 'PENDING';

export interface UserProfile {
    uid: string;
    email: string;
    role: UserRole;
    name: string;
    phone?: string | null;
    adminNotes?: string | null; // Admin-only private notes
    hourlyPayRate?: number; // Admin-only pay rate
    address?: string | null;
    subjects?: string[]; // For Tutors
    isActive?: boolean;
    students?: string[]; // For Parents (studentIds)

    // Invite Flow
    status?: 'invited' | 'registered';
    authUid?: string | null;
    inviteToken?: string | null;
    inviteExpiresAt?: string | null; // ISO String
    registeredAt?: string | null; // ISO String
    isShadow?: boolean;

    // Google Calendar / Calendar color
    calendarColorId?: string | null;   // Google Calendar event colorId (e.g. "1".."11")
    calendarColorBg?: string | null;   // Hex background for AMK + Google parity
    calendarColorFg?: string | null;   // Hex foreground (usually #1d1d1d)

    createdAt: string;
}

/** Recurring weekly availability slot. dayOfWeek: 0 = Sunday, 6 = Saturday. */
export interface RecurringAvailabilitySlot {
  dayOfWeek: number;
  startTime: string; // "HH:mm"
  endTime: string;
}

/** One-off block (e.g. vacation, appointment). */
export interface AvailabilityBlock {
  start: string; // ISO
  end: string;
  note?: string;
}

export interface TutorAvailability {
  tutorId: string;
  recurring: RecurringAvailabilitySlot[];
  blocks: AvailabilityBlock[];
  updatedAt: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames?: Record<string, string>;
  lastMessage?: string;
  lastAt: string;
}

export interface ChatMessage {
  id?: string;
  from: string;
  text: string;
  createdAt: string;
}

// ============================
// Notifications
// ============================

export interface UserNotificationSettings {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  /** Reserved for future SMS support. */
  smsEnabled: boolean;
  updatedAt: string;
}

export interface PushSubscriptionDoc {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
  createdAt: string;
  lastUsedAt?: string;
}

export type NotificationEventType =
  | "SESSION_SCHEDULED"
  | "SESSION_CANCELLED"
  | "SESSION_REMINDER_24H"
  | "SESSION_REMINDER_1H"
  | "SESSION_AFTER"
  | "INVOICE_CREATED"
  | "TUTOR_ASSIGNED";

export type NotificationAudienceType =
  | "PARENT_OF_STUDENT"
  | "TUTOR_ASSIGNED"
  | "ADMIN_ALL"
  | "CUSTOM_BY_ROLE";

export interface NotificationRuleChannels {
  push: boolean;
  email: boolean;
  sms: boolean; // exists but not actually sent yet
}

export interface NotificationRuleTemplate {
  title: string;
  body: string;
  emailSubject: string;
  emailHtml: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  eventType: NotificationEventType;
  audienceType: NotificationAudienceType;
  /** For CUSTOM_BY_ROLE audience, which roles should receive it. */
  roles?: UserRole[];
  channels: NotificationRuleChannels;
  template: NotificationRuleTemplate;
  createdAt: string;
  updatedAt: string;
}

export type NotificationLogStatus = "SENT" | "FAILED" | "SKIPPED";

export interface NotificationLog {
  id: string;
  eventType: NotificationEventType;
  ruleId: string;
  recipientUserId: string;
  channelsAttempted: {
    push?: boolean;
    email?: boolean;
    sms?: boolean;
  };
  status: NotificationLogStatus;
  error?: string | null;
  createdAt: string;
}

export interface Student {
    id: string; // Firestore Doc ID
    name: string;
    grade: string;

    parentIds: string[];
    tutorIds: string[];
    subjects: string[];
    subjectRates?: Record<string, number>; // Hourly rate per subject
    plannedSessions?: {
        sessionsPerWeek: number;
        daysOfWeek: string[];
        preferredTime: string | Record<string, string>; // Can be string (legacy) or Record<day, time> (new format)
    };
    notes?: string;
    status: 'Active' | 'Inactive';
    createdAt: string;
}

export interface Session {
    id: string;
    tutorId: string;
    tutorName: string;
    studentId: string;
    studentName: string;
    subject: string;
    startTime: string; // ISO String for easier serialization
    endTime: string;
    durationMinutes: number;
    status: 'Scheduled' | 'Completed' | 'Cancelled' | 'NoShow';
    attendance?: 'Present' | 'Absent' | 'Late';
    minutesLate?: number;
    internalNotes?: {
        text: string;
        updatedByUid: string;
        updatedByName?: string;
        updatedAt: string;
    } | null;
    parentFeedback?: {
        text: string;
        updatedByUid: string;
        updatedByName?: string;
        updatedAt: string;
    } | null;
    notes?: string;
    homework?: string;
    location?: string;

    // Billing Fields
    parentBilled?: boolean;
    tutorPaid?: boolean;
    invoiceId?: string | null;
    payStubId?: string | null;

    // Assessment / One-off Billing extensions
    parentId?: string | null; // For linking assessments explicitly
    evaluationId?: string;
    cost?: number; // Fixed cost override (e.g. for assessments)

    // Google Calendar sync
    googleCalendarEventId?: string | null;

    // Recurring: optional link to group instances created from one "recurring" creation
    recurringSeriesId?: string | null;

    // Optional cached tutor calendar color (used when enriching for calendar/events)
    tutorCalendarColorId?: string | null;
    tutorCalendarColorBg?: string | null;
    tutorCalendarColorFg?: string | null;
}

export interface InvoiceItem {
    description: string;
    quantity: number; // hours (use 1 for adjustment line items)
    rate: number;
    total: number;
    sessionId?: string; // Optional link to specific session
    studentId?: string; // Helpful for grouping
    studentName?: string;
    date?: string;
    /** For non-session line items: discount (deduct), travel (add), custom */
    lineItemType?: 'session' | 'discount' | 'travel' | 'custom';
}

export interface Invoice {
    id: string;
    parentId: string;
    parentName: string;
    studentIds: string[];
    invoiceNumber: string;
    periodStart: string;
    periodEnd: string;
    issueDate: string;
    dueDate: string;
    status: 'Draft' | 'Pending' | 'Sent' | 'Paid' | 'Overdue';
    items: InvoiceItem[];
    totalAmount: number;
    notes?: string;
}

export interface PayStubItem {
    sessionId: string;
    studentId: string;
    studentName: string;
    subject: string;
    date: string;
    durationHours: number;
    hourlyRate: number;
    total: number;
}

export interface PayStub {
    id: string;
    tutorId: string;
    tutorName: string;
    payStubNumber?: string;
    periodStart: string;
    periodEnd: string;
    issueDate: string;
    totalHours: number;
    totalPay: number;
    items: PayStubItem[];
    status: 'Draft' | 'Paid';
    notes?: string;
}

/** Progress tracking: goal, milestone, or assessment score. */
export type ProgressEntryType = "goal" | "milestone" | "assessment";

export interface ProgressGoal {
  id?: string;
  studentId: string;
  subject: string;
  title: string;
  targetDate?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface ProgressMilestone {
  id?: string;
  studentId: string;
  subject: string;
  title: string;
  achievedAt: string;
  note?: string;
  createdAt: string;
}

export interface AssessmentScore {
  id?: string;
  studentId: string;
  subject: string;
  assessmentName: string;
  score: number;
  maxScore?: number;
  date: string;
  createdAt: string;
}

export type ProgressEntry = ProgressGoal | ProgressMilestone | AssessmentScore;

export interface Evaluation {
    id: string;
    studentName: string;
    studentGrade?: string | null;

    parentName: string;
    parentEmail: string;
    parentPhone?: string | null;

    subjects: string[];
    notes?: string | null;

    tutorId: string;
    tutorName?: string;

    date: string; // ISO date of evaluation

    convertedToStudent: boolean;
    convertedStudentId?: string;
    convertedParentId?: string;

    updatedAt: string;
    createdAt: string;
}



