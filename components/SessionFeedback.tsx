"use client";

import { useState } from "react";
import { UserProfile, Session } from "@/lib/types"; // Import UserProfile
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"; // Import serverTimestamp
import { db } from "@/lib/firebase";
import { Loader2, Save, Lock, MessageSquare } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser"; // Assume this hook exists and provides the current user

interface SessionFeedbackProps {
    session: Session;
    onUpdate?: (updatedSession: Session) => void;
    userRole: 'ADMIN' | 'TUTOR' | 'PARENT'; // Explicitly pass role for clarity
}

export default function SessionFeedback({ session, onUpdate, userRole }: SessionFeedbackProps) {
    const { user, userProfile } = useCurrentUser(); // Get full profile for name
    const [loading, setLoading] = useState(false);

    // Local state for inputs
    const [internalNotesText, setInternalNotesText] = useState(session.internalNotes?.text || "");
    const [parentFeedbackText, setParentFeedbackText] = useState(session.parentFeedback?.text || "");

    // Attendance state for Tutors (Admins have it in Edit page, but Tutors need it here)
    const [attendance, setAttendance] = useState<any>(session.attendance || 'Present');

    const canEdit = userRole === 'ADMIN' || userRole === 'TUTOR';
    const canViewInternal = userRole === 'ADMIN' || userRole === 'TUTOR';

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const updates: any = {};
            const timestamp = new Date().toISOString();

            // Only update if changed
            if (internalNotesText !== (session.internalNotes?.text || "")) {
                updates.internalNotes = {
                    text: internalNotesText,
                    updatedByUid: user.uid,
                    updatedByName: userProfile?.name || "User",
                    updatedAt: timestamp
                };
            }

            if (parentFeedbackText !== (session.parentFeedback?.text || "")) {
                updates.parentFeedback = {
                    text: parentFeedbackText,
                    updatedByUid: user.uid,
                    updatedByName: userProfile?.name || "User",
                    updatedAt: timestamp
                };
            }

            // For Tutors, also save attendance if changed
            if (userRole === 'TUTOR' && attendance !== session.attendance) {
                updates.attendance = attendance;
            }

            if (Object.keys(updates).length > 0) {
                await updateDoc(doc(db, "sessions", session.id), updates);

                // Construct updated session object for local UI update
                const updatedSession = { ...session, ...updates };
                if (onUpdate) onUpdate(updatedSession);
                alert("Saved changes!");
            }
        } catch (e) {
            console.error(e);
            alert("Error saving feedback");
        } finally {
            setLoading(false);
        }
    };

    if (userRole === 'PARENT') {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-6">
                <div className="flex items-center gap-2 mb-4 text-purple-700">
                    <MessageSquare size={20} />
                    <h3 className="font-bold text-lg">Feedback from Tutor</h3>
                </div>
                {session.parentFeedback ? (
                    <div>
                        <p className="whitespace-pre-wrap text-gray-800">{session.parentFeedback.text}</p>
                        <p className="text-xs text-gray-500 mt-4">
                            Updated by {session.parentFeedback.updatedByName} on {new Date(session.parentFeedback.updatedAt).toLocaleString()}
                        </p>
                    </div>
                ) : (
                    <p className="text-gray-500 italic">No feedback available yet.</p>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-6 space-y-8">

            {/* Attendance for Tutors */}
            {userRole === 'TUTOR' && (
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Attendance</label>
                    <select
                        value={attendance}
                        onChange={(e) => setAttendance(e.target.value)}
                        className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Late">Late</option>
                    </select>
                </div>
            )}

            {/* Internal Notes */}
            {canViewInternal && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                            <Lock size={14} /> Internal Session Notes <span className="text-xs font-normal text-gray-500">(Not visible to parents)</span>
                        </label>
                        {session.internalNotes && (
                            <span className="text-xs text-gray-400">
                                Last: {session.internalNotes.updatedByName} ({new Date(session.internalNotes.updatedAt).toLocaleDateString()})
                            </span>
                        )}
                    </div>
                    {canEdit ? (
                        <textarea
                            value={internalNotesText}
                            onChange={(e) => setInternalNotesText(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm min-h-[100px]"
                            placeholder="Private notes for admins and tutors..."
                        />
                    ) : (
                        <p className="whitespace-pre-wrap text-gray-800 text-sm">{internalNotesText || "No notes."}</p>
                    )}
                </div>
            )}

            {/* Parent Feedback */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <div className="flex justify-between items-start mb-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-purple-900">
                        <MessageSquare size={14} /> Parent Feedback <span className="text-xs font-normal text-purple-600">(Visible to everyone)</span>
                    </label>
                    {session.parentFeedback && (
                        <span className="text-xs text-purple-400">
                            Last: {session.parentFeedback.updatedByName} ({new Date(session.parentFeedback.updatedAt).toLocaleDateString()})
                        </span>
                    )}
                </div>
                {canEdit ? (
                    <textarea
                        value={parentFeedbackText}
                        onChange={(e) => setParentFeedbackText(e.target.value)}
                        className="w-full p-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm min-h-[100px]"
                        placeholder="Feedback visible to parents..."
                    />
                ) : (
                    <p className="whitespace-pre-wrap text-gray-800 text-sm">{parentFeedbackText || "No feedback."}</p>
                )}
            </div>

            {canEdit && (
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            )}
        </div>
    );
}
