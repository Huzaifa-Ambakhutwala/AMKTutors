import { CheckCircle } from "lucide-react";
import Image from "next/image";

export default function Curriculum() {
    return (
        <section id="curriculum" className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-6 font-heading">
                            Our Curriculum Approach
                        </h2>
                        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                            We align our tutoring with state and national standards to ensure that students
                            are not only improving their grades but also mastering the core concepts required for long-term success.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-start">
                                <CheckCircle className="text-primary mt-1 mr-3 flex-shrink-0" size={24} />
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">TEKS & Common Core Aligned</h3>
                                    <p className="text-gray-600">Our materials cover all essential standards for Texas and national curricula.</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <CheckCircle className="text-primary mt-1 mr-3 flex-shrink-0" size={24} />
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Personalized Learning Plans</h3>
                                    <p className="text-gray-600">Every student gets a customized roadmap based on their initial evaluation.</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <CheckCircle className="text-primary mt-1 mr-3 flex-shrink-0" size={24} />
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Progress Tracking</h3>
                                    <p className="text-gray-600">Regular updates and reports to keep parents informed of improvements.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="relative h-80 w-full rounded-2xl overflow-hidden shadow-lg bg-white border border-gray-100 flex items-center justify-center">
                        <Image
                            src="/images/curriculum.png"
                            alt="Curriculum Approach"
                            fill
                            className="object-cover"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
