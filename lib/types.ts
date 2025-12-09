import { Timestamp } from "firebase/firestore";

export type UserRole = 'ADMIN' | 'TUTOR' | 'PARENT' | 'PENDING';

export interface UserProfile {
    uid: string;
    email: string;
    role: UserRole;
    name: string;
    phone?: string;
    address?: string;
    subjects?: string[]; // For Tutors
    isActive?: boolean;
    students?: string[]; // For Parents (studentIds)
    createdAt: string;
}

export interface Student {
    id: string; // Firestore Doc ID
    name: string;
    grade: string;
    school?: string;
    parentIds: string[];
    tutorIds: string[];
    subjects: string[];
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
    notes?: string;
    homework?: string;
    location?: string;
}

export interface InvoiceItem {
    description: string;
    quantity: number; // hours
    rate: number;
    total: number;
    sessionId?: string; // Optional link to specific session
}

export interface Invoice {
    id: string;
    parentId: string;
    parentName: string;
    invoiceNumber: string;
    periodStart: string;
    periodEnd: string;
    issueDate: string;
    dueDate: string;
    status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
    items: InvoiceItem[];
    totalAmount: number;
}
