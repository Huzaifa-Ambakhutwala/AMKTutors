import { BookOpen, Calculator, FlaskConical, Globe } from "lucide-react";

const subjects = [
    {
        icon: Calculator,
        title: "Math",
        description: "From Algebra to Calculus, we help students master complex concepts with ease.",
    },
    {
        icon: BookOpen,
        title: "English",
        description: "Improving reading comprehension, writing skills, and grammar for all grade levels.",
    },
    {
        icon: FlaskConical,
        title: "Science",
        description: "Comprehensive support for Biology, Chemistry, Physics, and General Science.",
    },
    {
        icon: Globe,
        title: "Social Studies",
        description: "Exploring History, Geography, and Civics to build a strong understanding of the world.",
    },
];

export default function Subjects() {
    return (
        <section id="subjects" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-heading">Subjects We Offer</h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Comprehensive tutoring across core subjects to support your academic journey.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {subjects.map((subject, index) => (
                        <div key={index} className="bg-white border border-gray-100 p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 group">
                            <div className="bg-[#1A2742]/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary transition-colors">
                                <subject.icon className="text-primary w-7 h-7 group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">{subject.title}</h3>
                            <p className="text-gray-600 leading-relaxed">
                                {subject.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
