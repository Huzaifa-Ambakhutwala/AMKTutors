"use client";

import { useState } from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function CalendarSyncTestPage() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setTesting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/calendar/test");
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || "Test failed");
        setResult(data); // Show available calendars even on error
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Google Calendar Sync Test</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Connection Test</h2>
        <button
          onClick={testConnection}
          disabled={testing}
          className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 min-h-[48px]"
        >
          {testing && <Loader2 className="animate-spin" size={20} />}
          Test Calendar Connection
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <XCircle size={20} />
            <h3 className="font-semibold">Error</h3>
          </div>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {result.success ? (
            <div className="flex items-center gap-2 text-green-700 mb-4">
              <CheckCircle size={20} />
              <h3 className="font-semibold text-lg">Connection Successful!</h3>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-700 mb-4">
              <XCircle size={20} />
              <h3 className="font-semibold text-lg">Connection Failed</h3>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Service Account Email:</h4>
              <code className="bg-gray-100 px-3 py-2 rounded text-sm block">
                {result.serviceAccountEmail || "N/A"}
              </code>
            </div>

            {result.targetCalendar && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Target Calendar:</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div>
                    <span className="font-medium">ID:</span>{" "}
                    <code className="text-sm">{result.targetCalendar.id}</code>
                  </div>
                  <div>
                    <span className="font-medium">Name:</span> {result.targetCalendar.summary}
                  </div>
                  <div>
                    <span className="font-medium">Time Zone:</span> {result.targetCalendar.timeZone}
                  </div>
                  <div>
                    <span className="font-medium">Access Role:</span>{" "}
                    <span className="font-mono text-sm">{result.targetCalendar.accessRole}</span>
                  </div>
                </div>
              </div>
            )}

            {result.availableCalendars && result.availableCalendars.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Available Calendars:</h4>
                <div className="space-y-2">
                  {result.availableCalendars.map((cal: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                    >
                      <div className="font-medium">{cal.summary || cal.id}</div>
                      <div className="text-sm text-gray-600">
                        <code>{cal.id}</code> • {cal.accessRole}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  💡 If your target calendar isn't listed, make sure you've shared it with the
                  service account email above with "Make changes to events" permission.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Troubleshooting Steps:</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
          <li>
            Check your <code className="bg-blue-100 px-1 rounded">.env.local</code> has{" "}
            <code className="bg-blue-100 px-1 rounded">GOOGLE_CALENDAR_ID</code> set correctly
          </li>
          <li>
            Verify the calendar is shared with{" "}
            <code className="bg-blue-100 px-1 rounded">
              {result?.serviceAccountEmail || "firebase-adminsdk-..."}
            </code>{" "}
            with "Make changes to events" permission
          </li>
          <li>
            Check your <strong>server terminal</strong> (where <code>npm run dev</code> runs) for
            calendar sync logs when creating a session
          </li>
          <li>
            Open browser console (F12) and look for{" "}
            <code className="bg-blue-100 px-1 rounded">[Calendar Sync]</code> messages
          </li>
        </ol>
      </div>
    </div>
  );
}
