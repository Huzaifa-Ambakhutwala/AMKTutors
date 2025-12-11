import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Attributes from "@/components/Attributes";
import About from "@/components/About";
import Subjects from "@/components/Subjects";
import HowItWorks from "@/components/HowItWorks";
import Curriculum from "@/components/Curriculum";
import Testimonials from "@/components/Testimonials";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Attributes />
      <About />
      <Subjects />
      <HowItWorks />
      <Curriculum />
      <Testimonials />
      <ContactForm />
      <Footer />
    </main>
  );
}
