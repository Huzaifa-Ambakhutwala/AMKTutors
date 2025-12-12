"use client";
import { SectionBlock } from "@/lib/types";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface Props {
    section: SectionBlock;
    onChange: (s: SectionBlock) => void;
}

export default function SectionEditor({ section, onChange }: Props) {
    const updateProps = (newProps: any) => {
        onChange({ ...section, props: { ...section.props, ...newProps } });
    };

    // --- HERO ---
    if (section.type === 'hero') {
        const p = section.props;
        return (
            <div className="space-y-4 animate-in fade-in">
                <h3 className="font-bold text-lg border-b pb-2">Edit Hero Section</h3>
                <div>
                    <label className="block text-sm font-medium mb-1">Headline</label>
                    <input type="text" value={p.headline} onChange={e => updateProps({ headline: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Subheadline</label>
                    <textarea value={p.subheadline || ''} onChange={e => updateProps({ subheadline: e.target.value })} className="w-full p-2 border rounded" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">CTA Text</label>
                        <input type="text" value={p.ctaText || ''} onChange={e => updateProps({ ctaText: e.target.value })} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">CTA Link</label>
                        <input type="text" value={p.ctaHref || ''} onChange={e => updateProps({ ctaHref: e.target.value })} className="w-full p-2 border rounded" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Image URL</label>
                    <input type="text" value={p.imageUrl || ''} onChange={e => updateProps({ imageUrl: e.target.value })} className="w-full p-2 border rounded" placeholder="https://..." />
                    <p className="text-xs text-gray-500 mt-1">Provide a direct link to an image.</p>
                </div>
            </div>
        );
    }

    // --- FEATURES ---
    if (section.type === 'features') {
        const p = section.props;
        const addItem = () => updateProps({ items: [...(p.items || []), { title: 'New Feature', description: 'Description' }] });
        const updateItem = (idx: number, patch: any) => {
            const newItems = [...p.items];
            newItems[idx] = { ...newItems[idx], ...patch };
            updateProps({ items: newItems });
        };
        const removeItem = (idx: number) => {
            updateProps({ items: p.items.filter((_, i) => i !== idx) });
        };

        return (
            <div className="space-y-4 animate-in fade-in">
                <h3 className="font-bold text-lg border-b pb-2">Edit Features Section</h3>
                <div>
                    <label className="block text-sm font-medium mb-1">Section Title</label>
                    <input type="text" value={p.title || ''} onChange={e => updateProps({ title: e.target.value })} className="w-full p-2 border rounded" />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium">Features List</label>
                    {p.items?.map((item, idx) => (
                        <div key={idx} className="border p-3 rounded-lg bg-gray-50 space-y-2">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-gray-500">Feature #{idx + 1}</span>
                                <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                            </div>
                            <input type="text" value={item.title} onChange={e => updateItem(idx, { title: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="Title" />
                            <textarea value={item.description} onChange={e => updateItem(idx, { description: e.target.value })} className="w-full p-2 border rounded text-sm" rows={2} placeholder="Description" />
                        </div>
                    ))}
                    <button onClick={addItem} className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><Plus size={16} /> Add Feature</button>
                </div>
            </div>
        );
    }

    // --- TESTIMONIALS ---
    if (section.type === 'testimonials') {
        const p = section.props;
        const addItem = () => updateProps({ items: [...(p.items || []), { name: 'Parent Name', quote: 'Great service!', rating: 5 }] });
        const updateItem = (idx: number, patch: any) => {
            const newItems = [...p.items];
            newItems[idx] = { ...newItems[idx], ...patch };
            updateProps({ items: newItems });
        };
        const removeItem = (idx: number) => {
            updateProps({ items: p.items.filter((_, i) => i !== idx) });
        };

        return (
            <div className="space-y-4 animate-in fade-in">
                <h3 className="font-bold text-lg border-b pb-2">Edit Testimonials</h3>
                <div>
                    <label className="block text-sm font-medium mb-1">Section Title</label>
                    <input type="text" value={p.title || ''} onChange={e => updateProps({ title: e.target.value })} className="w-full p-2 border rounded" />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium">Testimonials</label>
                    {p.items?.map((item, idx) => (
                        <div key={idx} className="border p-3 rounded-lg bg-gray-50 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                                <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                            </div>
                            <input type="text" value={item.name} onChange={e => updateItem(idx, { name: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="Name" />
                            <textarea value={item.quote} onChange={e => updateItem(idx, { quote: e.target.value })} className="w-full p-2 border rounded text-sm" rows={2} placeholder="Quote" />
                            <div className="flex items-center gap-2">
                                <label className="text-xs">Rating:</label>
                                <input type="number" min="1" max="5" value={item.rating || 5} onChange={e => updateItem(idx, { rating: parseInt(e.target.value) })} className="w-16 p-1 border rounded text-sm" />
                            </div>
                        </div>
                    ))}
                    <button onClick={addItem} className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><Plus size={16} /> Add Testimonial</button>
                </div>
            </div>
        );
    }

    // --- FAQ ---
    if (section.type === 'faq') {
        const p = section.props;
        const addItem = () => updateProps({ items: [...(p.items || []), { q: 'Question?', a: 'Answer.' }] });
        const updateItem = (idx: number, patch: any) => {
            const newItems = [...p.items];
            newItems[idx] = { ...newItems[idx], ...patch };
            updateProps({ items: newItems });
        };
        const removeItem = (idx: number) => {
            updateProps({ items: p.items.filter((_, i) => i !== idx) });
        };

        return (
            <div className="space-y-4 animate-in fade-in">
                <h3 className="font-bold text-lg border-b pb-2">Edit FAQ</h3>
                <div>
                    <label className="block text-sm font-medium mb-1">Section Title</label>
                    <input type="text" value={p.title || ''} onChange={e => updateProps({ title: e.target.value })} className="w-full p-2 border rounded" />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium">Questions</label>
                    {p.items?.map((item, idx) => (
                        <div key={idx} className="border p-3 rounded-lg bg-gray-50 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                                <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                            </div>
                            <input type="text" value={item.q} onChange={e => updateItem(idx, { q: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="Question" />
                            <textarea value={item.a} onChange={e => updateItem(idx, { a: e.target.value })} className="w-full p-2 border rounded text-sm" rows={2} placeholder="Answer" />
                        </div>
                    ))}
                    <button onClick={addItem} className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><Plus size={16} /> Add Question</button>
                </div>
            </div>
        );
    }

    // --- CTA ---
    if (section.type === 'cta') {
        const p = section.props;
        return (
            <div className="space-y-4 animate-in fade-in">
                <h3 className="font-bold text-lg border-b pb-2">Edit CTA Section</h3>
                <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input type="text" value={p.title} onChange={e => updateProps({ title: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea value={p.description || ''} onChange={e => updateProps({ description: e.target.value })} className="w-full p-2 border rounded" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Button Text</label>
                        <input type="text" value={p.buttonText || ''} onChange={e => updateProps({ buttonText: e.target.value })} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Button Link</label>
                        <input type="text" value={p.buttonHref || ''} onChange={e => updateProps({ buttonHref: e.target.value })} className="w-full p-2 border rounded" />
                    </div>
                </div>
            </div>
        );
    }

    // --- CUSTOM HTML ---
    if (section.type === 'customHtml') {
        const p = section.props;
        return (
            <div className="space-y-4 animate-in fade-in">
                <h3 className="font-bold text-lg border-b pb-2">Edit Custom HTML</h3>
                <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200 mb-2">
                    Warning: HTML is rendered as-is. Be careful with scripts and styles.
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">HTML Code</label>
                    <textarea
                        value={p.html}
                        onChange={e => updateProps({ html: e.target.value })}
                        className="w-full p-2 border rounded font-mono text-sm bg-gray-50"
                        rows={10}
                    />
                </div>
            </div>
        );
    }

    return <div>Unknown Section Type</div>;
}
