"use client";
import { SectionBlock } from "@/lib/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Trash2 } from "lucide-react";

interface Props {
    section: SectionBlock;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}

export function SortableSectionItem({ section, isSelected, onSelect, onToggle, onDelete }: Props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={`flex items-center gap-2 p-3 bg-white border rounded-lg mb-2 shadow-sm ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}>
            <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 touch-none">
                <GripVertical size={20} />
            </div>

            <div className="flex-1 cursor-pointer" onClick={() => onSelect(section.id)}>
                <span className="font-medium text-sm text-gray-900 uppercase tracking-wide block">{section.type}</span>
                <div className="text-xs text-gray-500 truncate max-w-[150px]">
                    {getSectionSummary(section)}
                </div>
            </div>

            <button onClick={(e) => { e.stopPropagation(); onToggle(section.id); }} className="p-1 text-gray-400 hover:text-gray-700">
                {section.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(section.id); }} className="p-1 text-gray-400 hover:text-red-500">
                <Trash2 size={16} />
            </button>
        </div>
    );
}

function getSectionSummary(section: SectionBlock): string {
    // @ts-ignore - props access is safe due to discriminated union but TS might complain without narrow check
    const p = section.props as any;
    if (section.type === 'hero') return p.headline || 'Hero Section';
    if (section.type === 'features') return p.title || 'Features';
    if (section.type === 'testimonials') return p.title || 'Testimonials';
    if (section.type === 'faq') return p.title || 'FAQ';
    if (section.type === 'cta') return p.title || 'Call to Action';
    if (section.type === 'customHtml') return 'HTML Code';
    return '';
}
