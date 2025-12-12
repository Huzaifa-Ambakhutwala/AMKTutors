"use client";

import { WebsiteBlock } from "@/lib/types";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface BlockEditorProps {
    block: WebsiteBlock;
    onSave: (block: WebsiteBlock) => void;
    onCancel: () => void;
}

export default function BlockEditor({ block, onSave, onCancel }: BlockEditorProps) {
    const [content, setContent] = useState(block.content || {});
    const [saving, setSaving] = useState(false);

    const handleChange = (field: string, value: any) => {
        setContent({ ...content, [field]: value });
    };

    const handleNestedChange = (index: number, field: string, value: any) => {
        const newItems = [...(content.items || [])];
        if (!newItems[index]) return;
        newItems[index] = { ...newItems[index], [field]: value };
        setContent({ ...content, items: newItems });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        // Simulate/Execute save
        await onSave({ ...block, content });
        setSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {('title' in content) && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title / Headline</label>
                    <input
                        type="text"
                        value={content.title || ""}
                        onChange={(e) => handleChange("title", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="Section Title"
                    />
                </div>
            )}

            {'subtitle' in content && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                    <textarea
                        value={content.subtitle || ""}
                        onChange={(e) => handleChange("subtitle", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg h-20"
                        placeholder="Subtitle text..."
                    />
                </div>
            )}

            {'description' in content && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description / Content</label>
                    <textarea
                        value={content.description || ""}
                        onChange={(e) => handleChange("description", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg h-24"
                        placeholder="Main content..."
                    />
                </div>
            )}

            {/* HERO Specifics */}
            {block.type === 'HERO' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CTA 1 Text</label>
                        <input type="text" value={content.ctaPrimaryText || ""} onChange={e => handleChange("ctaPrimaryText", e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CTA 1 Link</label>
                        <input type="text" value={content.ctaPrimaryLink || ""} onChange={e => handleChange("ctaPrimaryLink", e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                </div>
            )}

            {/* List Editing (Attributes, Testimonials, etc) */}
            {content.items && Array.isArray(content.items) && (
                <div className="space-y-4 border-t pt-4">
                    <h4 className="font-bold text-gray-700">Items</h4>
                    {content.items.map((item: any, i: number) => (
                        <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-1 gap-3">
                                <input
                                    type="text"
                                    value={item.title || item.name || item.author || ""}
                                    onChange={e => handleNestedChange(i, item.title ? "title" : "author", e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-sm font-bold"
                                    placeholder="Item Title/Name"
                                />
                                <textarea
                                    value={item.description || item.quote || item.text || ""}
                                    onChange={e => handleNestedChange(i, item.description ? "description" : "quote", e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-sm h-16"
                                    placeholder="Description/Quote"
                                />
                            </div>
                        </div>
                    ))}
                    <p className="text-xs text-gray-500 italic">Adding new items is not supported in this quick editor yet.</p>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t font-medium">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    {saving && <Loader2 className="animate-spin" size={16} />} Save Changes
                </button>
            </div>
        </form>
    );
}
