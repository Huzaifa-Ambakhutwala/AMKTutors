import { CheckCircle } from "lucide-react";

export default function FeaturesSection({ props }: { props: any }) {
    return (
        <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {props.title && (
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold font-heading text-gray-900">{props.title}</h2>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {props.items?.map((item: any, idx: number) => (
                        <div key={idx} className="p-6 rounded-xl border border-gray-100 bg-gray-50 hover:shadow-lg transition-shadow">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                                <CheckCircle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                            <p className="text-gray-600">{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
