"use client";
import React, { useEffect, useState, use } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PageData, SectionBlock } from "@/lib/types";
import SectionRenderer from "@/components/sections/SectionRenderer";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2 } from "lucide-react";

export default function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [sections, setSections] = useState<SectionBlock[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDraft = async () => {
            try {
                const snap = await getDoc(doc(db, "sitePages", slug));
                if (snap.exists()) {
                    const data = snap.data() as PageData;
                    // Use draftSections for preview
                    setSections(data.draftSections || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadDraft();
    }, [slug]);

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <main className="min-h-screen bg-white">
            <div className="bg-yellow-100 text-yellow-800 text-center py-2 px-4 font-bold text-sm sticky top-0 z-50">
                PREVIEW MODE - DISPLAYING DRAFT CONTENT
            </div>
            <Navbar />
            <div className="min-h-[50vh]">
                {sections && sections.length > 0 ? (
                    sections.map(s => <SectionRenderer key={s.id} section={s} />)
                ) : (
                    <div className="py-20 text-center text-gray-500">
                        <p>No content in this draft.</p>
                    </div>
                )}
            </div>
            <Footer />
        </main>
    );
}
