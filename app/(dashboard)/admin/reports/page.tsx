"use client";

import RoleGuard from "@/components/RoleGuard";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Download, FileText, Calendar } from "lucide-react";
import { Invoice, PayStub, Session, Student } from "@/lib/types";
import { toast } from "sonner";

type ReportType = "sessions" | "invoices" | "paystubs" | "students";

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("sessions");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payStubs, setPayStubs] = useState<PayStub[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [sessSnap, invSnap, paySnap, studSnap] = await Promise.all([
          getDocs(collection(db, "sessions")),
          getDocs(collection(db, "invoices")),
          getDocs(collection(db, "payStubs")),
          getDocs(collection(db, "students")),
        ]);
        setSessions(sessSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Session)));
        setInvoices(invSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice)));
        setPayStubs(paySnap.docs.map((d) => ({ id: d.id, ...d.data() } as PayStub)));
        setStudents(studSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Student)));
      } catch (e) {
        console.error(e);
        toast.error("Failed to load report data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    if (reportType === "sessions") {
      return sessions.filter((s) => {
        const d = new Date(s.startTime);
        return d >= from && d <= to;
      });
    }
    if (reportType === "invoices") {
      return invoices.filter((inv) => {
        const d = new Date(inv.issueDate);
        return d >= from && d <= to;
      });
    }
    if (reportType === "paystubs") {
      return payStubs.filter((ps) => {
        const d = new Date(ps.issueDate);
        return d >= from && d <= to;
      });
    }
    return students;
  }, [reportType, dateFrom, dateTo, sessions, invoices, payStubs, students]);

  const exportCSV = () => {
    let csv = "";
    if (reportType === "sessions") {
      const rows = [
        ["Date", "Tutor", "Student", "Subject", "Status", "Duration (min)", "Start", "End"],
        ...(filtered as Session[]).map((s) => [
          new Date(s.startTime).toLocaleDateString(),
          s.tutorName,
          s.studentName,
          s.subject,
          s.status,
          String(s.durationMinutes),
          s.startTime,
          s.endTime,
        ]),
      ];
      csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    } else if (reportType === "invoices") {
      const rows = [
        ["Invoice #", "Parent", "Period", "Issue Date", "Due Date", "Status", "Total"],
        ...(filtered as Invoice[]).map((inv) => [
          inv.invoiceNumber,
          inv.parentName,
          `${inv.periodStart} - ${inv.periodEnd}`,
          inv.issueDate,
          inv.dueDate,
          inv.status,
          String(inv.totalAmount),
        ]),
      ];
      csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    } else if (reportType === "paystubs") {
      const rows = [
        ["Tutor", "Period", "Issue Date", "Total Hours", "Total Pay", "Status"],
        ...(filtered as PayStub[]).map((ps) => [
          ps.tutorName,
          `${ps.periodStart} - ${ps.periodEnd}`,
          ps.issueDate,
          String(ps.totalHours),
          String(ps.totalPay),
          ps.status,
        ]),
      ];
      csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    } else {
      const rows = [
        ["Name", "Grade", "Status", "Subjects", "Parents", "Tutors", "Created"],
        ...(filtered as Student[]).map((s) => [
          s.name,
          s.grade,
          s.status,
          (s.subjects || []).join("; "),
          (s.parentIds || []).length.toString(),
          (s.tutorIds || []).length.toString(),
          s.createdAt || "",
        ]),
      ];
      csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${reportType}-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const exportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`AMK Tutors - ${reportType} report`, 14, 20);
      doc.setFontSize(10);
      doc.text(`Period: ${dateFrom} to ${dateTo}`, 14, 28);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);
      let y = 44;
      const lineHeight = 6;
      const maxRows = Math.floor((doc.internal.pageSize.height - 50) / lineHeight);
      const slice = (filtered as unknown[]).slice(0, 80);
      if (reportType === "sessions") {
        (slice as Session[]).forEach((s, i) => {
          if (i > 0 && i % maxRows === 0) {
            doc.addPage();
            y = 20;
          }
          doc.text(
            `${new Date(s.startTime).toLocaleDateString()} | ${s.tutorName} | ${s.studentName} | ${s.subject} | ${s.status}`,
            14,
            y
          );
          y += lineHeight;
        });
      } else if (reportType === "invoices") {
        (slice as Invoice[]).forEach((inv, i) => {
          if (i > 0 && i % maxRows === 0) {
            doc.addPage();
            y = 20;
          }
          doc.text(
            `${inv.invoiceNumber} | ${inv.parentName} | $${inv.totalAmount} | ${inv.status}`,
            14,
            y
          );
          y += lineHeight;
        });
      } else if (reportType === "paystubs") {
        (slice as PayStub[]).forEach((ps, i) => {
          if (i > 0 && i % maxRows === 0) {
            doc.addPage();
            y = 20;
          }
          doc.text(
            `${ps.tutorName} | ${ps.periodStart}-${ps.periodEnd} | $${ps.totalPay} | ${ps.status}`,
            14,
            y
          );
          y += lineHeight;
        });
      } else {
        (slice as Student[]).forEach((s, i) => {
          if (i > 0 && i % maxRows === 0) {
            doc.addPage();
            y = 20;
          }
          doc.text(`${s.name} | ${s.grade} | ${s.status} | ${(s.subjects || []).join(", ")}`, 14, y);
          y += lineHeight;
        });
      }
      doc.save(`report-${reportType}-${dateFrom}-${dateTo}.pdf`);
      toast.success("PDF downloaded");
    } catch (e) {
      console.error(e);
      toast.error("PDF export failed");
    }
  };

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="max-w-full">
        <h1 className="text-2xl md:text-3xl font-bold font-heading mb-6">Reports</h1>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold mb-4">Generate report</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[140px]"
              >
                <option value="sessions">Sessions</option>
                <option value="invoices">Invoices</option>
                <option value="paystubs">Pay stubs</option>
                <option value="students">Students</option>
              </select>
            </div>
            {reportType !== "students" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <div className="flex gap-2">
              <button
                onClick={exportCSV}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                <Download size={18} />
                Export CSV
              </button>
              <button
                onClick={exportPDF}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                <FileText size={18} />
                Export PDF
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {reportType === "students"
              ? `Showing all students (${filtered.length})`
              : `${filtered.length} record(s) in selected date range`}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">Preview</h2>
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              {reportType === "sessions" && (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-left text-gray-600 border-b">
                      <th className="pb-2 pr-2">Date</th>
                      <th className="pb-2 pr-2">Tutor</th>
                      <th className="pb-2 pr-2">Student</th>
                      <th className="pb-2 pr-2">Subject</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filtered as Session[]).slice(0, 50).map((s) => (
                      <tr key={s.id} className="border-b border-gray-100">
                        <td className="py-2 pr-2">{new Date(s.startTime).toLocaleString()}</td>
                        <td className="py-2 pr-2">{s.tutorName}</td>
                        <td className="py-2 pr-2">{s.studentName}</td>
                        <td className="py-2 pr-2">{s.subject}</td>
                        <td className="py-2">{s.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {reportType === "invoices" && (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-left text-gray-600 border-b">
                      <th className="pb-2 pr-2">#</th>
                      <th className="pb-2 pr-2">Parent</th>
                      <th className="pb-2 pr-2">Total</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filtered as Invoice[]).slice(0, 50).map((inv) => (
                      <tr key={inv.id} className="border-b border-gray-100">
                        <td className="py-2 pr-2">{inv.invoiceNumber}</td>
                        <td className="py-2 pr-2">{inv.parentName}</td>
                        <td className="py-2 pr-2">${inv.totalAmount.toFixed(2)}</td>
                        <td className="py-2">{inv.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {reportType === "paystubs" && (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-left text-gray-600 border-b">
                      <th className="pb-2 pr-2">Tutor</th>
                      <th className="pb-2 pr-2">Period</th>
                      <th className="pb-2 pr-2">Pay</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filtered as PayStub[]).slice(0, 50).map((ps) => (
                      <tr key={ps.id} className="border-b border-gray-100">
                        <td className="py-2 pr-2">{ps.tutorName}</td>
                        <td className="py-2 pr-2">{ps.periodStart} - {ps.periodEnd}</td>
                        <td className="py-2 pr-2">${ps.totalPay.toFixed(2)}</td>
                        <td className="py-2">{ps.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {reportType === "students" && (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-left text-gray-600 border-b">
                      <th className="pb-2 pr-2">Name</th>
                      <th className="pb-2 pr-2">Grade</th>
                      <th className="pb-2 pr-2">Subjects</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filtered as Student[]).slice(0, 50).map((s) => (
                      <tr key={s.id} className="border-b border-gray-100">
                        <td className="py-2 pr-2">{s.name}</td>
                        <td className="py-2 pr-2">{s.grade}</td>
                        <td className="py-2 pr-2">{(s.subjects || []).join(", ")}</td>
                        <td className="py-2">{s.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {(filtered as unknown[]).length === 0 && (
                <p className="py-8 text-center text-gray-500">No records match the filters.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
