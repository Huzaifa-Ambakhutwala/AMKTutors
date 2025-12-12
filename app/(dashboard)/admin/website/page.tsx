"use client";
import RoleGuard from "@/components/RoleGuard";
import Link from "next/link";
import { FileText } from "lucide-react";

export default function WebsiteBuilderDashboard() {
    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="p-8">
                <h1 className="text-3xl font-bold font-heading mb-8">Website Builder</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link href="/admin/website/home" className="block bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <FileText size={24} />
                            </div>
                            {/* In future, fetch status dynamically */}
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-bold">Manage</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Home Page</h2>
                        <p className="text-gray-500 text-sm">Main landing page content.</p>
                    </Link>

                    {/* Placeholder for other pages */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 border-dashed flex flex-col items-center justify-center text-center opacity-70">
                        <p className="font-bold text-gray-400">More pages coming soon</p>
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}
