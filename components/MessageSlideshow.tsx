'use client';
import { useState } from 'react';

const SLIDES = [
  "I know making this website is crossing a line since you blocked me.",
  "And I know last time this happened, I sent that email saying it was 'the last time' I'd reach out.",
  "But honestly? I don't care. Not being with you is torture.",
  "I hate the guilt you are carrying, and I hate that this broken system made you feel like you had to choose.",
  "But I just want you back. I want to be with you.",
  "We can figure this out. I will fight for us so you don't have to do it alone."
];

export default function MessageSlideshow({ onComplete }: { onComplete: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onComplete(); // Moves to the main game
    }
  };

  return (
    // The glassy full-screen overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#424874]/60 backdrop-blur-xl animate-fade-in">
      
      {/* The frosted glass card */}
      <div className="bg-[#A6B1E1]/10 backdrop-blur-md border border-[#A6B1E1]/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] rounded-3xl max-w-3xl w-full p-10 md:p-16 flex flex-col items-center text-center transition-all">
        
        <div key={currentSlide} className="animate-fade-in-up w-full min-h-[160px] flex items-center justify-center">
          <p className="text-3xl md:text-4xl text-[#F4EEFF] leading-relaxed font-medium">
            {SLIDES[currentSlide]}
          </p>
        </div>

        <button
          onClick={handleNext}
          className="mt-12 px-8 py-3 bg-[#A6B1E1]/20 border border-[#A6B1E1]/50 text-[#F4EEFF] hover:bg-[#A6B1E1]/40 rounded-full font-semibold transition-all hover:scale-105 shadow-lg"
        >
          {currentSlide === SLIDES.length - 1 ? "Enter" : "Continue"}
        </button>
        
      </div>
    </div>
  );
}