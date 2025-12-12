import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { invoiceId, parentId, parentName, invoiceNumber, totalAmount, issueDate } = body;

        // 1. Fetch Parent Email via Admin SDK
        const userDoc = await adminDb.collection("users").doc(parentId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "Parent not found" }, { status: 404 });
        }
        const userData = userDoc.data();
        const parentEmail = userData?.email;

        if (!parentEmail) {
            return NextResponse.json({ error: "Parent has no email" }, { status: 400 });
        }

        // 2. Fetch Template via Admin SDK
        let subject = "New Invoice from AMK Tutors";
        let rawBody = `Dear {{parentName}},

Please find attached your invoice #{{invoiceNumber}} for \${{amount}}.

Issue Date: {{date}}

You can view details at the link below:
{{link}}

Thank you!`;

        try {
            const templateDoc = await adminDb.collection("settings").doc("email_templates").get();
            if (templateDoc.exists) {
                const updatedT = templateDoc.data()?.invoice;
                if (updatedT) {
                    subject = updatedT.subject || subject;
                    rawBody = updatedT.body || rawBody;
                }
            }
        } catch (e) {
            console.warn("Could not fetch template, using default:", e);
        }

        // Detect if body is legacy HTML or new Plain Text
        const isHtml = rawBody.trim().startsWith("<div") || rawBody.trim().startsWith("<p");
        let htmlContent = rawBody;

        if (!isHtml) {
            // Convert newlines to breaks
            htmlContent = rawBody.replace(/\n/g, '<br/>');

            // Wrap in Professional Template
            htmlContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #2563eb; padding: 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">AMK Tutors</h1>
                </div>
                <div style="padding: 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                    ${htmlContent}
                </div>
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
                    &copy; ${new Date().getFullYear()} AMK Tutors. All rights reserved.<br/>
                    123 Education Street, Learning City
                </div>
            </div>
            `;
        }

        // 3. Replace Placeholders
        const linkUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/parent/invoices/${invoiceId}`;

        const replacements: Record<string, string> = {
            "{{parentName}}": parentName,
            "{{invoiceNumber}}": invoiceNumber,
            "{{amount}}": totalAmount.toFixed(2),
            "{{date}}": new Date(issueDate).toLocaleDateString(),
            "{{link}}": `<a href="${linkUrl}" style="color: #2563eb; text-decoration: underline;">${linkUrl}</a>` // Make link clickable
        };

        let finalHtml = htmlContent;
        Object.entries(replacements).forEach(([key, val]) => {
            // Global replace
            finalHtml = finalHtml.split(key).join(val);
        });

        // 4. Configure Transporter
        // Ideally these are in process.env
        const transporter = nodemailer.createTransport({
            service: 'gmail', // or user 'host', 'port' etc.
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // 5. Send
        const mailOptions: any = {
            from: process.env.EMAIL_FROM || '"AMK Tutors" <noreply@amktutors.com>',
            to: parentEmail,
            subject: subject,
            html: finalHtml,
        };

        if (body.pdfAttachment) {
            // pdfAttachment comes as "data:application/pdf;base64,..."
            // We can pass this directly as 'path' or strip it.
            // Nodemailer handles data URIs nicely.
            mailOptions.attachments = [
                {
                    filename: `Invoice-${invoiceNumber}.pdf`,
                    path: body.pdfAttachment
                }
            ];
        }

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Email API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
