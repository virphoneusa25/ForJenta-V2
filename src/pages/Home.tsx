import Navbar from '@/components/layout/Navbar';
import HeroSection from '@/components/features/HeroSection';
import WhatYouCanBuild from '@/components/features/WhatYouCanBuild';
import HowItWorks from '@/components/features/HowItWorks';
import WhyChooseUs from '@/components/features/WhyChooseUs';
import TrialCTA from '@/components/features/TrialCTA';
import Footer from '@/components/layout/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <HeroSection />
      <WhatYouCanBuild />
      <HowItWorks />
      <WhyChooseUs />
      <TrialCTA />
      <Footer />
    </div>
  );
}
