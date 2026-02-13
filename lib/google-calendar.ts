import { google } from "googleapis";
import type { Session } from "./types";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

function getAuth() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  // Use email address as calendar ID when sharing with service account
  // "primary" only works for the service account's own calendar
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "tutoring.amk@gmail.com";

  if (!clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY for Google Calendar");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: [CALENDAR_SCOPE],
  });

  return { auth, calendarId };
}

function sessionToEvent(session: Session & { id: string }) {
  const title = `${session.subject}: ${session.studentName} with ${session.tutorName}`;
  const description = [
    `Student: ${session.studentName}`,
    `Tutor: ${session.tutorName}`,
    session.location ? `Location: ${session.location}` : null,
    session.status ? `Status: ${session.status}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    summary: title,
    description,
    start: {
      dateTime: session.startTime,
      timeZone: "America/New_York",
    },
    end: {
      dateTime: session.endTime,
      timeZone: "America/New_York",
    },
  };
}

export async function createCalendarEvent(
  session: Session & { id: string }
): Promise<string> {
  const { auth, calendarId } = getAuth();
  const calendar = google.calendar({ version: "v3", auth });
  const event = sessionToEvent(session);

  console.log(`[Calendar] Creating event in calendar: ${calendarId}`);
  console.log(`[Calendar] Event data:`, JSON.stringify(event, null, 2));

  try {
    const res = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    const eventId = res.data.id;
    if (!eventId) throw new Error("Google Calendar did not return event id");
    console.log(`[Calendar] Event created successfully: ${eventId}`);
    return eventId;
  } catch (error: any) {
    console.error(`[Calendar] Error creating event:`, error);
    if (error.response?.data) {
      console.error(`[Calendar] API Error details:`, JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`Failed to create calendar event: ${error.message || "Unknown error"}`);
  }
}

export async function updateCalendarEvent(
  eventId: string,
  session: Session & { id: string }
): Promise<void> {
  const { auth, calendarId } = getAuth();
  const calendar = google.calendar({ version: "v3", auth });
  const event = sessionToEvent(session);

  await calendar.events.update({
    calendarId,
    eventId,
    requestBody: event,
  });
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const { auth, calendarId } = getAuth();
  const calendar = google.calendar({ version: "v3", auth });

  console.log(`[Calendar] Deleting event ${eventId} from calendar ${calendarId}`);
  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });
    console.log(`[Calendar] Event deleted successfully`);
  } catch (error: any) {
    console.error(`[Calendar] Error deleting event:`, error);
    if (error.response?.data) {
      console.error(`[Calendar] API Error details:`, JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}
