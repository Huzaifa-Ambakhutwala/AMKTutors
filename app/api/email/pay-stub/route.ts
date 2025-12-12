import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const { to, tutorName, periodStart, periodEnd, totalPay, pdfBase64, filename } = await req.json();

        // 1. Verify Authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Fetch user from Firestore to confirm role (more robust than checking token claims which might be outdated/missing)
        const userDoc = await adminAuth.app.firestore().collection('users').doc(decodedToken.uid).get();
        const userData = userDoc.data();

        if (!userData || userData.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // 2. Configure Transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // 3. Send Email
        const mailOptions = {
            from: `"AMK Tutors" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: `Pay Stub: ${periodStart} - ${periodEnd}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Pay Stub Available</h2>
                    <p>Dear ${tutorName},</p>
                    <p>Please find attached your pay stub for the period <strong>${periodStart}</strong> to <strong>${periodEnd}</strong>.</p>
                    <p><strong>Net Pay:</strong> $${Number(totalPay).toFixed(2)}</p>
                    <p>Thank you for your hard work!</p>
                    <br/>
                    <p>Best regards,<br/>AMK Tutors Admin</p>
                </div>
            `,
            attachments: [
                {
                    filename: filename || 'PayStub.pdf',
                    content: pdfBase64.split('base64,')[1],
                    encoding: 'base64',
                    contentType: 'application/pdf'
                }
            ]
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error sending email:', error);
        return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
    }
}
