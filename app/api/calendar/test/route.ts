import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  try {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!clientEmail || !privateKey) {
      return NextResponse.json(
        { error: "Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY" },
        { status: 500 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    // List calendars to see what's available
    const calendarsRes = await calendar.calendarList.list();
    const calendars = calendarsRes.data.items || [];

    // Try to access the target calendar
    const targetCalendarId = process.env.GOOGLE_CALENDAR_ID || "tutoring.amk@gmail.com";
    let calendarInfo = null;
    try {
      const calendarRes = await calendar.calendars.get({
        calendarId: targetCalendarId,
      });
      calendarInfo = {
        id: calendarRes.data.id,
        summary: calendarRes.data.summary,
        timeZone: calendarRes.data.timeZone,
        accessRole: calendarRes.data.accessRole,
      };
    } catch (err: any) {
      return NextResponse.json(
        {
          error: `Cannot access calendar "${targetCalendarId}"`,
          details: err.message,
          availableCalendars: calendars.map((c) => ({
            id: c.id,
            summary: c.summary,
            accessRole: c.accessRole,
          })),
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      serviceAccountEmail: clientEmail,
      targetCalendar: calendarInfo,
      availableCalendars: calendars.map((c) => ({
        id: c.id,
        summary: c.summary,
        accessRole: c.accessRole,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message, stack: err instanceof Error ? err.stack : undefined },
      { status: 500 }
    );
  }
}
