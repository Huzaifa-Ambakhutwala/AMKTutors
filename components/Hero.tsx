import Link from "next/link";

export default function Hero() {
    return (
        <section className="relative bg-secondary py-20 lg:py-32 overflow-hidden">
            {/* Background blobs for aesthetics */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-50 rounded-full blur-3xl opacity-50"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-6 font-heading">
                        Personalized Tutoring. <br className="hidden md:block" />
                        <span className="text-primary">Trusted Results.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed">
                        Expert tutors dedicated to helping students excel in Math, English, Science, and more.
                        Tailored learning plans for every student's unique needs.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link
                            href="#contact"
                            className="bg-primary text-primary-foreground px-8 py-4 rounded-full text-lg font-semibold hover:bg-accent transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                        >
                            Book a Call Today
                        </Link>
                        <Link
                            href="#about"
                            className="bg-white text-gray-800 border border-gray-200 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
                        >
                            Learn More
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
