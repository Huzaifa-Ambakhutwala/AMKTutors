import { Star } from "lucide-react";

const testimonials = [
    {
        quote: "AMK Tutors has been a game-changer for my son. His math grades went from a C to an A in just one semester!",
        author: "Sarah J.",
        role: "Parent",
    },
    {
        quote: "The personalized attention my daughter receives is amazing. She actually looks forward to her tutoring sessions now.",
        author: "Michael T.",
        role: "Parent",
    },
    {
        quote: "Professional, reliable, and effective. We saw immediate improvements in study habits and confidence.",
        author: "Emily R.",
        role: "Parent",
    },
];

export default function Testimonials() {
    return (
        <section id="testimonials" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4 font-heading">Parent Testimonials</h2>
                    <p className="text-lg text-gray-600">See what families are saying about AMK Tutors.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <div key={index} className="bg-gray-50 p-8 rounded-xl relative">
                            <div className="text-yellow-400 flex mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={20} fill="currentColor" />
                                ))}
                            </div>
                            <p className="text-gray-700 italic mb-6">"{testimonial.quote}"</p>
                            <div>
                                <p className="font-bold text-gray-900">{testimonial.author}</p>
                                <p className="text-sm text-gray-500">{testimonial.role}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
