import { Timestamp } from "firebase/firestore";

export type UserRole = 'ADMIN' | 'TUTOR' | 'PARENT' | 'PENDING';

export interface UserProfile {
    uid: string;
    email: string;
    role: UserRole;
    name: string;
    phone?: string;
    adminNotes?: string; // Admin-only private notes
    hourlyPayRate?: number; // Admin-only pay rate
    address?: string;
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
        preferredTime: string;
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
    parentId?: string; // For linking assessments explicitly
    assessmentId?: string;
    cost?: number; // Fixed cost override (e.g. for assessments)
}

export interface InvoiceItem {
    description: string;
    quantity: number; // hours
    rate: number;
    total: number;
    sessionId?: string; // Optional link to specific session
    studentId?: string; // Helpful for grouping
    studentName?: string;
    date?: string;
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
    status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
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
    periodStart: string;
    periodEnd: string;
    issueDate: string;
    totalHours: number;
    totalPay: number;
    items: PayStubItem[];
    status: 'Draft' | 'Paid';
    notes?: string;
}

export interface Assessment {
    id: string;
    studentName: string;
    studentGrade?: string | null;

    parentName: string;
    parentEmail: string;
    parentPhone?: string | null;

    subjects: string[];
    score?: number | null;
    notes?: string | null;

    tutorId: string;
    tutorName?: string;

    assessmentDate: string; // ISO

    convertedToStudent: boolean;
    convertedStudentId?: string;
    convertedParentId?: string;

    createdAt: string;
    updatedAt: string;
}

