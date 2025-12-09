import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { parentName, contactInfo, grade, subject, schedule } = body;

        // Validation
        if (!parentName || !contactInfo) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Sending to yourself
            subject: `New Tutoring Inquiry from ${parentName}`,
            text: `
                New Inquiry Recieved:

                Parent Name: ${parentName}
                Contact Info: ${contactInfo}
                Student Grade: ${grade}
                Subject: ${subject}
                Schedule Preference: ${schedule}
            `,
            html: `
                <h2>New Tutoring Inquiry</h2>
                <p><strong>Parent Name:</strong> ${parentName}</p>
                <p><strong>Contact Info:</strong> ${contactInfo}</p>
                <p><strong>Student Grade:</strong> ${grade}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Schedule Preference:</strong> ${schedule}</p>
            `,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error sending email:', error);
        return NextResponse.json({ error: error.message || 'Error sending email' }, { status: 500 });
    }
}
