
import { ClipboardList, Users, TrendingUp, ArrowRight } from "lucide-react";

export default function HowItWorks() {
    return (
        <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-heading">How AMK Tutors Works</h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Our proven process to help your child succeed.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Step 1 */}
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group border border-gray-100">
                        <div className="bg-primary h-2 w-full relative">
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-primary">
                                <svg width="20" height="12" viewBox="0 0 20 12" fill="currentColor">
                                    <path d="M0 0L10 12L20 0H0Z" />
                                </svg>
                            </div>
                        </div>
                        <div className="p-8 pt-12 text-center">
                            <div className="mx-auto bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ClipboardList className="text-primary w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
                                Complete Assessment <ArrowRight size={20} className="text-green-500" />
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                Our comprehensive assessment shows where your child stands academically, so we know exactly how to help him or her improve.
                            </p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group border border-gray-100">
                        <div className="bg-primary h-2 w-full relative">
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-primary">
                                <svg width="20" height="12" viewBox="0 0 20 12" fill="currentColor">
                                    <path d="M0 0L10 12L20 0H0Z" />
                                </svg>
                            </div>
                        </div>
                        <div className="p-8 pt-12 text-center">
                            <div className="mx-auto bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Users className="text-primary w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
                                Get 1:1 personalized tutoring <ArrowRight size={20} className="text-green-500" />
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                We have expert tutors who understand your school’s curriculum and create personalized learning plans for your child.
                            </p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group border border-gray-100">
                        <div className="bg-primary h-2 w-full relative">
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-primary">
                                <svg width="20" height="12" viewBox="0 0 20 12" fill="currentColor">
                                    <path d="M0 0L10 12L20 0H0Z" />
                                </svg>
                            </div>
                        </div>
                        <div className="p-8 pt-12 text-center">
                            <div className="mx-auto bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <TrendingUp className="text-primary w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
                                See noticeable results <ArrowRight size={20} className="text-green-500" />
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                Watch your child's confidence soar as they master difficult concepts, achieve higher grades, and develop a lifelong love for learning.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
