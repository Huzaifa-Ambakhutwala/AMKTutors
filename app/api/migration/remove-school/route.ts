import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function GET() {
    try {
        const studentsRef = adminDb.collection('students');
        const snapshot = await studentsRef.get();

        if (snapshot.empty) {
            return NextResponse.json({ message: 'No students found' });
        }

        const batch = adminDb.batch();
        let count = 0;

        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            // Check if field exists to avoid unnecessary writes, though generic update is also fine
            // checking data.school != undefined catches non-existent fields too if strict
            batch.update(doc.ref, {
                school: admin.firestore.FieldValue.delete()
            });
            count++;
        });

        if (count > 0) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${count} students. Removed school field where present.`
        });

    } catch (error: any) {
        console.error('Migration Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
