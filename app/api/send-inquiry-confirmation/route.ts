import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const { email, studentName, parentName, phone, grade, subjects, message } = await req.json();

        if (!email || !studentName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // 1. Send Confirmation to Parent
        // Simple, clean, reassuring.
        const parentMailOptions = {
            from: `"AMK Tutors" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Thank you for contacting AMK Tutors`,
            text: `Hi ${studentName},\n\nThank you for reaching out to AMK Tutors! We have received your inquiry.\n\nSummary:\n- Subjects: ${subjects.join(', ')}\n- Student: ${studentName}\n\nOur team will get back to you shortly.\n\nBest regards,\nAMK Tutors Team`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                    <h2 style="color: #2563eb;">Thanks for contacting AMK Tutors!</h2>
                    <p>Hi <strong>${studentName}</strong>,</p>
                    <p>We received your inquiry regarding tutoring. Here is a summary of what you submitted:</p>
                    <ul style="background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
                        <li><strong>Subjects:</strong> ${subjects.join(', ')}</li>
                        <li><strong>Grade Level:</strong> ${grade}</li>
                    </ul>
                    <p>Our team will review your details and reach out shortly (usually within 24 hours) to discuss how we can help you achieve your academic goals.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p><strong>The AMK Tutors Team</strong><br/>
                    <a href="https://amktutors.com" style="color: #2563eb;">www.amktutors.com</a></p>
                </div>
            `,
        };

        // 2. Notify Admin (DETAILED FORMAT)
        // This is what the user specifically asked for "all details from the form properly formatted"
        const adminMailOptions = {
            from: `"AMK Website" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: `New Inquiry: ${studentName} (${subjects.length} Subjects)`,
            text: `
New Web Inquiry

STUDENT DETAILS:
Name: ${studentName}
Grade: ${grade}

PARENT/CONTACT:
Name: ${parentName || 'N/A'}
Email: ${email}
Phone: ${phone}

REQUREMENTS:
Subjects: ${subjects.join(', ')}
Message: ${message || 'None'}
            `,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #2563eb; color: white; padding: 20px;">
                        <h2 style="margin: 0;">New Inquiry Received</h2>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">via amktutors.com Contact Form</p>
                    </div>
                    
                    <div style="padding: 24px;">
                        <h3 style="color: #4b5563; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px; margin-top: 0;">Student Information</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; width: 140px;">Student Name:</td>
                                <td style="padding: 8px 0; font-weight: bold;">${studentName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Grade Level:</td>
                                <td style="padding: 8px 0;">${grade}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Subjects:</td>
                                <td style="padding: 8px 0;">
                                    ${subjects.map((s: string) => `<span style="background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 999px; font-size: 14px; margin-right: 4px;">${s}</span>`).join('')}
                                </td>
                            </tr>
                        </table>

                        <h3 style="color: #4b5563; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px; margin-top: 24px;">Contact Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                             <tr>
                                <td style="padding: 8px 0; color: #6b7280; width: 140px;">Parent Name:</td>
                                <td style="padding: 8px 0; font-weight: bold;">${parentName || '<span style="color:#9ca3af; font-style:italic;">Not provided</span>'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                                <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
                                <td style="padding: 8px 0;"><a href="tel:${phone}" style="color: #2563eb; text-decoration: none;">${phone}</a></td>
                            </tr>
                        </table>

                        ${message ? `
                        <h3 style="color: #4b5563; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px; margin-top: 24px;">Message</h3>
                        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; color: #374151; font-style: italic;">
                            "${message}"
                        </div>
                        ` : ''}
                    </div>
                </div>
            `,
        };

        // Send both
        await Promise.all([
            transporter.sendMail(parentMailOptions),
            transporter.sendMail(adminMailOptions)
        ]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error sending confirmation email:', error);
        return NextResponse.json({ success: true, emailError: true });
    }
}
