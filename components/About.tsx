import Image from "next/image";

export default function About() {
    return (
        <section id="about" className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="relative h-64 lg:h-96 w-full rounded-2xl overflow-hidden shadow-xl">
                        <Image
                            src="/images/about-success-v2.png"
                            alt="Student success"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-6 font-heading">
                            Dedicated to Your <span className="text-primary">Success</span>
                        </h2>
                        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                            At AMK Tutors, we believe that every student has the potential to excel.
                            Our mission is to provide high-quality, personalized tutoring that builds confidence
                            and delivers tangible results.
                        </p>
                        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                            Whether you need help with foundational math, advanced science, or preparing for
                            college entrance exams, our expert team is here to guide you every step of the way.
                        </p>
                        <ul className="space-y-3 mb-8">
                            {["One-on-one attention", "Proven teaching methods", "Supportive environment"].map((item, i) => (
                                <li key={i} className="flex items-center text-gray-700">
                                    <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
