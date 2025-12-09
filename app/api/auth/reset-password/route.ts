import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // 1. Generate Reset Link using Firebase Admin
        // NOTE: This requires FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local
        const link = await adminAuth.generatePasswordResetLink(email);

        // 2. Setup Transporter (Reusing existing config)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // 3. Send Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'AMK Tutors: Password Reset Request',
            text: `
                You requested a password reset for AMK Tutors.

                Click the link below to reset your password:
                ${link}

                If you did not request this, please ignore this email.
            `,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #2563EB;">Password Reset Request</h2>
                    <p>Hello,</p>
                    <p>You requested a password reset for your AMK Tutors account.</p>
                    <p>Click the button below to reset your password:</p>
                    <a href="${link}" style="background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Password</a>
                    <p style="color: #666; font-size: 14px;">If you did not request this, please ignore this email.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Reset Password Error:', error);
        // Specialized error for missing Service Account
        if (error.code === 'app/invalid-credential' || error.message.includes('credential')) {
            return NextResponse.json({ error: 'Server Configuration Error: Missing Firebase Service Account Keys. Please check .env.local' }, { status: 500 });
        }
        return NextResponse.json({ error: error.message || 'Failed to send reset email' }, { status: 500 });
    }
}
