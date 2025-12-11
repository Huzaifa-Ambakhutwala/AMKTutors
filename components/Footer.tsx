import Image from "next/image";

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-gray-400 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div className="mb-4 flex justify-center">
                    <div className="bg-white p-3 rounded-xl shadow-lg">
                        <Image src="/logo.png" alt="AMK Tutors Logo" width={60} height={60} className="w-16 h-16 object-contain" />
                    </div>
                </div>
                <p className="mb-8 font-medium">Empowering students to reach their full potential.</p>
                <div className="border-t border-gray-800 pt-8 text-sm">
                    &copy; {new Date().getFullYear()} AMK Tutors. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
