"use client";

import { useEffect, useState, use } from "react";
import RoleGuard from "@/components/RoleGuard";
import { PageData, SectionBlock, SectionType } from "@/lib/types";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp, getDocs, orderBy, query } from "firebase/firestore";
import { Loader2, Save, Globe, History, Plus, ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import SectionList from "@/components/cms/SectionList";
import SectionEditor from "@/components/cms/SectionEditor";
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from "next/navigation";

export default function PageBuilderEditor({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);

    // Data State
    const [pageData, setPageData] = useState<PageData | null>(null);
    const [sections, setSections] = useState<SectionBlock[]>([]);

    // UI State
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    // Load Data
    useEffect(() => {
        const loadPage = async () => {
            try {
                const docRef = doc(db, "sitePages", slug);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    const data = snap.data() as PageData;
                    setPageData(data);
                    setSections(data.draftSections || []);
                } else {
                    // Create Initial Draft if not exists
                    const initialData: PageData = {
                        slug,
                        title: slug.charAt(0).toUpperCase() + slug.slice(1) + " Page",
                        status: 'draft',
                        publishedVersionId: null,
                        updatedAt: serverTimestamp(),
                        draftSections: []
                    };
                    await setDoc(docRef, initialData);
                    setPageData(initialData);
                    setSections([]);
                }
            } catch (e) {
                console.error("Error loading page:", e);
                alert("Error loading page data");
            } finally {
                setLoading(false);
            }
        };
        loadPage();
    }, [slug]);

    // Save Draft
    const handleSaveDraft = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, "sitePages", slug), {
                draftSections: sections,
                updatedAt: serverTimestamp()
            });
            // Update local state is implicit
        } catch (e) {
            console.error("Error saving draft:", e);
            alert("Failed to save draft");
        } finally {
            setSaving(false);
        }
    };

    // Publish
    const handlePublish = async () => {
        if (!confirm("Are you sure you want to publish these changes live?")) return;
        setPublishing(true);
        try {
            const user = auth.currentUser;

            // 1. Create Version Doc
            const versionData = {
                versionId: uuidv4(),
                createdAt: serverTimestamp(),
                createdByUid: user?.uid || 'unknown',
                createdByName: user?.displayName || 'Admin',
                note: `Published via Builder`,
                sections: sections
            };

            const contentRef = collection(db, "sitePages", slug, "versions");
            const vDoc = await addDoc(contentRef, versionData);

            // 2. Update Main Doc
            await updateDoc(doc(db, "sitePages", slug), {
                status: 'published',
                publishedVersionId: vDoc.id,
                publishedSections: sections, // Optimization for public read
                draftSections: sections, // Sync draft
                updatedAt: serverTimestamp()
            });

            setPageData(prev => prev ? { ...prev, status: 'published', publishedVersionId: vDoc.id } : null);
            alert("Page published successfully!");
        } catch (e) {
            console.error("Error publishing:", e);
            alert("Failed to publish");
        } finally {
            setPublishing(false);
        }
    };

    // Add Section
    const handleAddSection = (type: SectionType) => {
        const newSection: SectionBlock = {
            id: uuidv4(),
            type,
            enabled: true,
            props: getDefaultProps(type)
        };
        const newSections = [...sections, newSection];
        setSections(newSections);
        setSelectedSectionId(newSection.id);
    };

    // Update Section
    const handleUpdateSection = (updated: SectionBlock) => {
        setSections(sections.map(s => s.id === updated.id ? updated : s));
    };

    const handleDeleteSection = (id: string) => {
        if (!confirm("Delete this section?")) return;
        setSections(sections.filter(s => s.id !== id));
        if (selectedSectionId === id) setSelectedSectionId(null);
    };

    const handleToggleSection = (id: string) => {
        setSections(sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    };

    // History Component
    function HistoryPanel() {
        const [versions, setVersions] = useState<any[]>([]);
        const [loadingH, setLoadingH] = useState(true);

        useEffect(() => {
            const fetchVersions = async () => {
                try {
                    const vRef = collection(db, "sitePages", slug, "versions");
                    const q = query(vRef, orderBy("createdAt", "desc"));
                    const snap = await getDocs(q);
                    setVersions(snap.docs.map(d => ({ ...d.data(), id: d.id })));
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoadingH(false);
                }
            };
            fetchVersions();
        }, []);

        return (
            <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-700">Version History</h3>
                    <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-900">Close</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loadingH ? <Loader2 className="animate-spin mx-auto text-gray-400" /> : (
                        versions.map(v => (
                            <div key={v.id} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold text-gray-600">
                                        {v.createdAt?.seconds ? new Date(v.createdAt.seconds * 1000).toLocaleString() : 'Unknown Date'}
                                    </span>
                                    <span className="text-xs text-gray-400">{v.createdByName}</span>
                                </div>
                                <p className="text-xs text-gray-500 mb-2 truncate">{v.note}</p>
                                <button
                                    onClick={() => {
                                        if (confirm("Restore this version? This will overwrite your current draft.")) {
                                            setSections(v.sections || []);
                                            setShowHistory(false);
                                        }
                                    }}
                                    className="w-full py-1 bg-gray-100 hover:bg-blue-50 text-blue-600 text-xs font-medium rounded transition-colors"
                                >
                                    Restore
                                </button>
                            </div>
                        ))
                    )}
                    {!loadingH && versions.length === 0 && <p className="text-center text-gray-400 text-sm">No versions found.</p>}
                </div>
            </div>
        );
    }

    // Get default props
    const getDefaultProps = (type: SectionType): any => {
        switch (type) {
            case 'hero': return { headline: "Welcome", subheadline: "Subtitle here", ctaText: "Learn More", ctaHref: "#" };
            case 'features': return { title: "Our Features", items: [{ title: 'Feature 1', description: 'Desc' }] };
            case 'testimonials': return { title: "Testimonials", items: [{ name: 'John Doe', quote: 'Great!', rating: 5 }] };
            case 'faq': return { title: "FAQ", items: [{ q: 'Question?', a: 'Answer' }] };
            case 'cta': return { title: "Ready to Start?", buttonText: "Get Started", buttonHref: "/register" };
            case 'customHtml': return { html: "<div>Custom Content</div>" };
            default: return {};
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    const selectedSection = sections.find(s => s.id === selectedSectionId);

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="flex h-screen flex-col bg-gray-100 overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/website" className="text-gray-500 hover:text-gray-900"><ArrowLeft size={20} /></Link>
                        <h1 className="font-bold text-lg">{pageData?.title}</h1>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${pageData?.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {pageData?.status?.toUpperCase()}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={`/preview/${slug}`} target="_blank" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
                            <Eye size={16} /> Preview
                        </Link>
                        <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
                            <History size={16} /> History
                        </button>
                        <button onClick={handleSaveDraft} disabled={saving} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Save Draft
                        </button>
                        <button onClick={handlePublish} disabled={publishing} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 rounded-lg shadow-sm">
                            {publishing ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                            Publish
                        </button>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar: Section List */}
                    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col z-0">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sections</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <SectionList
                                sections={sections}
                                onReorder={setSections}
                                onSelect={setSelectedSectionId}
                                onToggle={handleToggleSection}
                                onDelete={handleDeleteSection}
                                selectedId={selectedSectionId}
                            />

                            {/* Add Section */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-xs font-medium text-gray-500 mb-2">Add New Section</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {['hero', 'features', 'testimonials', 'faq', 'cta', 'customHtml'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => handleAddSection(t as SectionType)}
                                            className="text-xs p-2 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 rounded text-center capitalize transition-colors"
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Area: Editor */}
                    <main className="flex-1 overflow-y-auto bg-gray-50 p-8 flex justify-center">
                        <div className="w-full max-w-2xl">
                            {selectedSection ? (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <SectionEditor
                                        section={selectedSection}
                                        onChange={handleUpdateSection}
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 mt-20">
                                    <div className="p-4 bg-gray-100 rounded-full mb-4">
                                        <Edit size={32} />
                                    </div>
                                    <p>Select a section from the left sidebar to edit</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
                {showHistory && <HistoryPanel />}
            </div>
        </RoleGuard>
    );
}

// Helper icon component for empty state
function Edit({ size, ...props }: any) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    )
}
