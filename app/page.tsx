'use client';

import { useState, useEffect, useRef } from 'react';
import TicTacToe from '../components/TicTacToe';
import PrizeSlideshow from '../components/PrizeSlideshow';
import MessageSlideshow from '../components/MessageSlideshow';

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showPrize, setShowPrize] = useState(false);
  
  // Create a reference to hold our background music
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  // 1. Play the MJ song the moment she clicks anywhere (like clicking "Continue" on the slides)
  useEffect(() => {
    if (hasInteracted && !bgMusicRef.current) {
      bgMusicRef.current = new Audio('/sounds/hey-pretty-baby.mp3');
      bgMusicRef.current.loop = true; // Loop it just in case she takes a long time playing Tic-Tac-Toe
      bgMusicRef.current.volume = 0.4; // Keep it slightly quiet so it's background music
      bgMusicRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
  }, [hasInteracted]);

  // 2. Stop the song immediately when she wins and the prize shows up
  useEffect(() => {
    if (showPrize && bgMusicRef.current) {
      bgMusicRef.current.pause();
    }
  }, [showPrize]);

  return (
    <main 
      className="min-h-screen flex flex-col items-center justify-center p-4 relative"
      onClick={() => {
        // Register her first click on the screen so the browser allows audio to play
        if (!hasInteracted) setHasInteracted(true);
      }}
    >
      {/* The Glassy Intro */}
      {showIntro && <MessageSlideshow onComplete={() => setShowIntro(false)} />}
      
      {/* The Game (Only shows after intro is done) */}
      {!showIntro && (
        <div className="max-w-2xl w-full text-center space-y-8 animate-fade-in">
          <h1 className="text-4xl font-bold tracking-tight text-[#F4EEFF]">
            Hey. I made something for you.
          </h1>
          
          <p className="text-lg text-[#DCD6F7]">
            (Make sure your sound is on and click anywhere to start)
          </p>

          <div className="mt-12 p-6 bg-[#A6B1E1]/10 rounded-xl shadow-lg border border-[#A6B1E1]/30 flex flex-col items-center relative z-10">
            <h2 className="text-2xl font-semibold mb-4 text-[#F4EEFF]">Beat me in Tic-Tac-Toe for a surprise</h2>
            <TicTacToe onWin={() => setShowPrize(true)} />
          </div>

          {/* The Final Prize (Video + Poem) */}
          {showPrize && <PrizeSlideshow onClose={() => setShowPrize(false)} />}
        </div>
      )}
    </main>
  );
}