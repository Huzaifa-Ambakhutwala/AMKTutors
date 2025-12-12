"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function FaqSection({ props }: { props: any }) {
    return (
        <section className="py-20 bg-white">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {props.title && (
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold font-heading text-gray-900">{props.title}</h2>
                    </div>
                )}

                <div className="space-y-4">
                    {props.items?.map((item: any, idx: number) => (
                        <FaqItem key={idx} q={item.q} a={item.a} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function FaqItem({ q, a }: { q: string, a: string }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
                <span className="font-semibold text-gray-900">{q}</span>
                {isOpen ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
            </button>
            {isOpen && (
                <div className="p-4 bg-white text-gray-600 border-t border-gray-200 whitespace-pre-wrap">
                    {a}
                </div>
            )}
        </div>
    )
}
