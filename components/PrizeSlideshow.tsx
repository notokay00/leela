'use client';
import { useState, useEffect, useRef } from 'react';

const EXCITING_MESSAGES = [
  "OH MY GOD", "YES YES YES YES YES", "LETS GOOOOOO", "I knew it!", 
  "You're the best", "I'm literally smiling so hard right now",
  "Wait, let me calm down.", "Nope, can't calm down.", "This is the best day ever.",
  "I am doing a literal happy dance.", "My heart is beating so fast.",
  "AHHHHHHHHHHHHHHHHHHHHHH",
  "I'm shaking a little bit.", "Okay, deep breaths.", 
  "I missed you so much.", "You have no idea.", "Thank you.",
  "Okay, I'm opening Instagram.", "Wait, just a few more seconds of celebrating.",
  "YAYYYYYYYY", "Okay, seriously, opening it now.", "I promise.",
  "Redirecting in 3...", "2...", "1..."
];

export default function PrizeSlideshow({ onClose }: { onClose: () => void }) {
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [noCount, setNoCount] = useState(0);
  const [showGracefulExit, setShowGracefulExit] = useState(false);
  const [isDestroyed, setIsDestroyed] = useState(false);
  
  const [isExcited, setIsExcited] = useState(false);
  const [visibleMessages, setVisibleMessages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const playHeeHee = () => {
    const audio = new Audio('/sounds/hee-hee.mp3');
    audio.play().catch(e => console.error("Audio play failed:", e));
  };

  const handleNoClick = () => {
    if (noCount === 0) {
      setNoCount(1);
    } else {
      setShowGracefulExit(true);
      const readTimer = setTimeout(() => {
        playHeeHee();
        const destroyTimer = setTimeout(() => {
          setIsDestroyed(true);
        }, 500); 
      }, 8000); 
    }
  };

  const handleYesClick = () => {
    playHeeHee();
    setIsExcited(true);
  };

  useEffect(() => {
    if (isExcited && visibleMessages.length < EXCITING_MESSAGES.length) {
      const timer = setTimeout(() => {
        setVisibleMessages(prev => [...prev, EXCITING_MESSAGES[prev.length]]);
      }, 300); 
      return () => clearTimeout(timer);
    } else if (isExcited && visibleMessages.length === EXCITING_MESSAGES.length) {
      const preRedirectTimer = setTimeout(() => playHeeHee(), 500);
      const finalTimer = setTimeout(() => {
        window.location.href = 'https://instagram.com';
      }, 1200);
      
      return () => {
        clearTimeout(preRedirectTimer);
        clearTimeout(finalTimer);
      };
    }
  }, [isExcited, visibleMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages]);

  if (isDestroyed) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center"></div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#424874]/95 flex items-center justify-center z-50 p-4 animate-fade-in">
      {/* 
        UPDATED CONTAINER: 
        Uses h-[95vh] on mobile so it doesn't get squished by the phone's browser address bar,
        and switches to max-h-[90vh] on desktop. 
      */}
      <div className="bg-[#424874] border border-[#A6B1E1] rounded-2xl max-w-4xl w-full h-[95vh] md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl">
        
        {/* Left Side: The VN Video */}
        {/* UPDATED: Takes up roughly 40% height on mobile, full side on desktop */}
        <div className="w-full md:w-1/2 h-[40%] md:h-auto relative bg-black/50 flex flex-shrink-0 items-center justify-center border-b md:border-b-0 md:border-r border-[#A6B1E1]/30">
          <video 
            src="/leela_poem.mp4" 
            autoPlay 
            playsInline
            controls 
            onEnded={() => setIsVideoEnded(true)} 
            className="w-full h-full object-cover"
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Right Side: The Poem & Controls */}
        {/* UPDATED: Allows vertical scrolling on mobile if the text is long */}
        <div className="w-full md:w-1/2 p-5 md:p-8 flex flex-col relative overflow-y-auto h-[60%] md:h-auto text-center justify-center">
          {!isExcited && !showGracefulExit && (
            <button 
              onClick={onClose}
              className="absolute top-2 right-4 md:top-4 md:right-4 text-[#A6B1E1] hover:text-[#F4EEFF] transition-colors text-2xl md:text-xl font-bold z-10"
            >
              &times;
            </button>
          )}
          
          {/* STATE 1: Playing Video (Shows Poem) */}
          {!isVideoEnded && (
            <div className="animate-fade-in flex flex-col h-full mt-4 md:mt-0">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-[#A6B1E1]">For You</h2>
              {/* UPDATED: Added px-2 to prevent text from touching screen edges */}
              <div className="whitespace-pre-line text-[#F4EEFF] leading-relaxed text-[1rem] md:text-[1.05rem] flex-grow px-2">
                {`तेरी आखों में जो देखा, वहाँ ठहरा है वक़्त,
                ख़ुद को खोकर तुझमें मिल जाने की है चाहत।

                बाहों की वो एक पनाह जो मुझको मिल गई,
                उम्र भर का घर वहीं, मंज़िल वहीं ठहर गई।

                जीना हो तेरे साथ तो हर साँस इबादत,
                मरना भी तेरे साथ हो तो मौत भ राहत।

                दो रूहें जब मिलें, बने इक जिस्म की सूरत,
                मिट जाए फिर जीने-मरने की हर हद, हर सूरत।

                तेरी नज़र का इक सुकून जो एक बार मिला,
                उसके आगे जन्नत का ख़याल भी फीका लगा।

                बस इतनी सी दआ है, इतनी सी है आरज़ू,
                तेरे साथ जीना हो, तेरे साथ ही फ़ना हो जाना हो।`}
              </div>
            </div>
          )}

          {/* STATE 2: Video Ended, Asked to Unblock */}
          {isVideoEnded && !showGracefulExit && !isExcited && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 animate-fade-in py-8">
              <h2 className="text-3xl font-bold text-[#A6B1E1] mb-2">So...</h2>
              <p className="text-[#DCD6F7] text-lg">
                Any chance you're ready to unblock me?
              </p>
              <div className="flex flex-col space-y-3 w-full max-w-xs">
                <button 
                  onClick={handleYesClick}
                  className="w-full px-6 py-3 bg-[#A6B1E1] hover:bg-[#DCD6F7] text-[#424874] rounded-lg font-bold transition-colors shadow-lg"
                >
                  Unblock Now
                </button>
                <button 
                  onClick={handleNoClick}
                  className="w-full px-6 py-3 bg-transparent hover:bg-[#A6B1E1]/20 text-[#DCD6F7] border border-[#A6B1E1] rounded-lg font-semibold transition-colors"
                >
                  {noCount === 0 ? "Not right now" : "Are you absolutely sure?"}
                </button>
              </div>
            </div>
          )}

          {/* STATE 3: The Excitement Spam */}
          {isExcited && (
            <div className="flex flex-col h-full overflow-hidden text-left bg-black/20 p-4 rounded-xl border border-[#A6B1E1]/30 shadow-inner my-4">
              <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[#A6B1E1]">
                {visibleMessages.map((msg, idx) => (
                  <div key={idx} className="animate-fade-in-up text-[#A6B1E1] font-bold text-lg">
                    {msg}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* STATE 4: The Final Exit */}
          {showGracefulExit && !isDestroyed && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 animate-fade-in px-4 py-8 text-center">
              <h2 className="text-2xl font-bold text-[#A6B1E1] mb-2">Alright. I hear you.</h2>
              
              <p className="text-[#F4EEFF] text-lg leading-relaxed max-w-md">
                I shot my shot, and I won't keep pushing if this is really what you want. I love you, and I am always here for you.
              </p>
              
              <p className="text-[#DCD6F7] text-lg font-medium italic mt-4 p-4 bg-[#A6B1E1]/10 rounded-lg border border-[#A6B1E1]/20">
                (And hey... if the guy/girl you eventually settle for ever cheats on you(i know impossible) or they turn out to be gay, you know exactly who to come running back to.)
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}