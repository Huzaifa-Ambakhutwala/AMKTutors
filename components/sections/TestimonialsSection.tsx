import { Star } from "lucide-react";

export default function TestimonialsSection({ props }: { props: any }) {
    return (
        <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {props.title && (
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold font-heading text-gray-900">{props.title}</h2>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {props.items?.map((item: any, idx: number) => (
                        <div key={idx} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex gap-1 mb-4">
                                {[...Array(item.rating || 5)].map((_, i) => (
                                    <Star key={i} size={18} className="fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>
                            <blockquote className="text-gray-600 mb-6 italic">"{item.quote}"</blockquote>
                            <div className="font-bold text-gray-900">{item.name}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
