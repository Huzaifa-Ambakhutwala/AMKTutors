"use client";
import { SectionBlock } from "@/lib/types";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableSectionItem } from "./SortableSectionItem";

interface Props {
    sections: SectionBlock[];
    onReorder: (sections: SectionBlock[]) => void;
    onSelect: (id: string) => void;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    selectedId: string | null;
}

export default function SectionList({ sections, onReorder, onSelect, onToggle, onDelete, selectedId }: Props) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = sections.findIndex((s) => s.id === active.id);
            const newIndex = sections.findIndex((s) => s.id === over.id);
            onReorder(arrayMove(sections, oldIndex, newIndex));
        }
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                    {sections.map(section => (
                        <SortableSectionItem
                            key={section.id}
                            section={section}
                            isSelected={section.id === selectedId}
                            onSelect={onSelect}
                            onToggle={onToggle}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
