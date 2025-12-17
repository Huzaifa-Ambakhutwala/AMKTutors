"use client";

import { useState } from "react";
import { doc, updateDoc, Timestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Session } from "@/lib/types";
import { Loader2, X, CheckCircle, Save, Lock, MessageSquare, BookOpen, Clock } from "lucide-react";
import { FormFeedback } from "@/components/FormFeedback";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface ManageSessionModalProps {
    session: Session;
    onClose: () => void;
    onUpdate: (updatedSession: Session) => void;
}

export default function ManageSessionModal({ session, onClose, onUpdate }: ManageSessionModalProps) {
    const { user, userProfile } = useCurrentUser();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State
    const [attendance, setAttendance] = useState<'Present' | 'Absent' | 'Late'>(session.attendance || 'Present');
    const [minutesLate, setMinutesLate] = useState(session.minutesLate || 0);
    const [notes, setNotes] = useState(session.notes || ""); // Public Summary
    const [homework, setHomework] = useState(session.homework || "");
    const [internalNote, setInternalNote] = useState(session.internalNotes?.text || "");

    const isCompleted = session.status === 'Completed';

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const sessionRef = doc(db, "sessions", session.id);
            const timestamp = new Date().toISOString();

            const updates: any = {
                attendance,
                minutesLate: attendance === 'Late' ? minutesLate : 0,
                notes,
                homework,
            };

            // Only update status if explicitly completing now
            if (!isCompleted) {
                updates.status = 'Completed';
            }

            // Internal Notes (Preserve metadata structure)
            if (internalNote !== (session.internalNotes?.text || "")) {
                updates.internalNotes = {
                    text: internalNote,
                    updatedByUid: user.uid,
                    updatedByName: userProfile?.name || "Tutor",
                    updatedAt: timestamp
                };
            }

            await updateDoc(sessionRef, updates);

            // Optimistic Update
            onUpdate({
                ...session,
                ...updates,
                internalNotes: updates.internalNotes ? updates.internalNotes : session.internalNotes
            } as Session);

            onClose();
            alert(isCompleted ? "Session updated!" : "Session marked as completed!");

        } catch (e) {
            console.error(e);
            setError("Failed to save session details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">
                            {isCompleted ? "Manage Session Details" : "Complete Session Report"}
                        </h3>
                        <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                            {session.studentName} • {session.subject} • {new Date(session.startTime).toLocaleString()}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {error && <FormFeedback type="error" message={error} />}

                    {/* 1. Attendance */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                            <Clock size={16} /> Attendance
                        </label>
                        <div className="flex gap-2">
                            {['Present', 'Late', 'Absent'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setAttendance(status as any)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${attendance === status
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>

                        {attendance === 'Late' && (
                            <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                <label className="text-sm font-medium text-gray-700 block mb-1">
                                    Minutes Late
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        value={minutesLate}
                                        onChange={e => setMinutesLate(parseInt(e.target.value) || 0)}
                                        className="w-full p-2 pl-3 border border-yellow-300 rounded-lg bg-yellow-50 focus:ring-2 focus:ring-yellow-500 outline-none"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">mins</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 2. Public Report */}
                        <div className="space-y-4">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-purple-700 mb-1">
                                    <MessageSquare size={16} /> Session Summary
                                    <span className="text-xs font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Visible to Parent</span>
                                </label>
                                <textarea
                                    className="w-full p-3 border border-purple-100 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none min-h-[120px]"
                                    placeholder="Summary of what was covered..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                                    <BookOpen size={16} /> Homework Assigned
                                </label>
                                <textarea
                                    className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Pages, exercises, etc..."
                                    value={homework}
                                    onChange={e => setHomework(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* 3. Internal Notes */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 h-full">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                <Lock size={14} /> Internal Notes
                                <span className="text-xs font-normal text-gray-500">(Private)</span>
                            </label>
                            <textarea
                                className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 outline-none h-[calc(100%-30px)] min-h-[150px]"
                                placeholder="Private notes for admins/tutors..."
                                value={internalNote}
                                onChange={e => setInternalNote(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`px-6 py-2 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 ${isCompleted ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                            }`}
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : (isCompleted ? <Save size={18} /> : <CheckCircle size={18} />)}
                        {isCompleted ? "Save Changes" : "Complete Session"}
                    </button>
                </div>
            </div>
        </div>
    );
}
