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

// CMS Imports
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { PageData } from "@/lib/types";
import SectionRenderer from "@/components/sections/SectionRenderer";

async function getHomePageData() {
  try {
    const ref = doc(db, "sitePages", "home");
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data() as PageData;
  } catch (e) {
    console.error("Error fetching home page data:", e);
  }
  return null;
}

export default async function Home() {
  const pageData = await getHomePageData();
  const publishedSections = pageData?.publishedSections;
  const isPublished = pageData?.status === 'published' && publishedSections && publishedSections.length > 0;

  return (
    <main className="min-h-screen">
      <Navbar />

      {isPublished ? (
        // Dynamic CMS Content
        <div>
          {publishedSections.map(s => (
            <SectionRenderer key={s.id} section={s} />
          ))}
        </div>
      ) : (
        // Fallback Default Content
        <>
          <Hero />
          <Attributes />
          <About />
          <Subjects />
          <HowItWorks />
          <Curriculum />
          <Testimonials />
          <ContactForm />
        </>
      )}

      <Footer />
    </main>
  );
}
