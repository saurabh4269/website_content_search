import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';

interface ResultCardProps {
  result: {
    content: string;
    match_score: number;
    html: string;
    path: string;
  };
  index: number;
}

// Helper to format URL path
const formatPath = (path: string): string => {
  try {
    const url = new URL(path);
    return url.pathname || "/";
  } catch {
    return path || "/";
  }
};

const ResultCard: React.FC<ResultCardProps> = ({ result, index }) => {
  const [showHtml, setShowHtml] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const htmlPreviewRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const matchPercentage = Math.round(result.match_score * 100) / 100;

  // Initialize animations
  useEffect(() => {
    if (!cardRef.current || !progressRef.current) return;
    
    // Initial opacity should be 1 to ensure visibility
    gsap.set(cardRef.current, { opacity: 1 });
    
    // Animate the card on mount with a staggered delay based on index
    const cardAnim = gsap.from(cardRef.current, {
      y: 30,
      opacity: 0.5,
      duration: 0.6,
      delay: index * 0.1,
      ease: "power3.out",
      onComplete: () => {
        // Ensure the card is fully visible after animation
        gsap.set(cardRef.current, { opacity: 1, y: 0 });
      }
    });
    
    // Animate progress bar
    const progressAnim = gsap.from(progressRef.current, {
      width: 0,
      duration: 0.8,
      delay: (index * 0.1) + 0.2,
      ease: "power2.out"
    });
    
    return () => {
      // Clean up animations
      cardAnim.kill();
      progressAnim.kill();
    };
  }, [index, matchPercentage]);
  
  // Animation for HTML preview toggle
  useEffect(() => {
    if (!htmlPreviewRef.current) return;
    
    if (showHtml) {
      // Faster animation for showing HTML
      gsap.fromTo(htmlPreviewRef.current, 
        { height: 0, opacity: 0 },
        { 
          height: "auto", 
          opacity: 1, 
          duration: 0.1, 
          ease: "power1.out",
          onComplete: () => {
            gsap.set(htmlPreviewRef.current, { overflow: "auto" });
          }
        }
      );
    } else if (htmlPreviewRef.current.offsetHeight > 0) {
      // Animation for hiding HTML
      gsap.to(htmlPreviewRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.15, // Even faster to hide
        ease: "power1.in"
      });
    }
  }, [showHtml]);
  
  // Handle card hover animation
  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.addEventListener('mouseenter', () => {
        gsap.to(cardRef.current, {
          y: -4,
          boxShadow: "0 10px 25px -5px rgba(124, 58, 237, 0.1), 0 10px 10px -5px rgba(124, 58, 237, 0.05)",
          duration: 0.3,
          ease: "power2.out"
        });
      });
      
      cardRef.current.addEventListener('mouseleave', () => {
        gsap.to(cardRef.current, {
          y: 0,
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          duration: 0.3,
          ease: "power2.out"
        });
      });
    }
  }, []);

  return (
    <div 
      ref={cardRef}
      className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-100 transition-all duration-300 result-card"
    >
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-primary-50 to-white px-4 py-4 border-b border-primary-100 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {/* Result Number Badge */}
          <span className="bg-primary-600 text-white text-sm font-medium rounded-full h-7 w-7 flex items-center justify-center shadow-sm">
            {index}
          </span>

          {/* Match Score */}
          <div>
            <span className="text-sm font-medium text-gray-700">Match Score:</span>
            <div className="flex items-center mt-1">
              {/* Match Score Bar */}
              <div className="bg-gray-200 rounded-full h-2.5 w-32 mr-2 overflow-hidden">
                <div 
                  ref={progressRef}
                  className="bg-primary-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${matchPercentage}%` }}
                ></div>
              </div>
              <span className="text-sm text-primary-700 font-medium">{matchPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Path Display */}
        <div className="text-xs text-gray-500 truncate max-w-xs">
          Path: <span className="font-medium text-primary-600">{formatPath(result.path)}</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 bg-white">
        {/* Text Preview */}
        <div 
          ref={contentRef}
          className="text-gray-700 text-sm whitespace-pre-wrap mb-4 leading-relaxed opacity-100"
          style={{ opacity: 1 }}
        >
          {result.content.length > 300
            ? `${result.content.substring(0, 300)}...`
            : result.content}
        </div>

        {/* Toggle Button */}
        <button
          ref={buttonRef}
          onClick={() => {
            // Button press animation for better feedback
            if (buttonRef.current) {
              gsap.to(buttonRef.current, {
                scale: 0.95,
                duration: 0.1,
                onComplete: () => {
                  gsap.to(buttonRef.current, {
                    scale: 1,
                    duration: 0.2,
                    ease: "back.out(2)"
                  });
                }
              });
            }
            setShowHtml(!showHtml);
          }}
          className="px-4 py-1.5 text-xs font-medium rounded-md bg-primary-50 text-primary-700 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-colors flex items-center"
          aria-expanded={showHtml}
          aria-controls={`html-preview-${index}`}
        >
          {showHtml ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Hide HTML
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              View HTML
            </>
          )}
        </button>

        {/* HTML Preview (Conditional Render with Transition) */}
        {showHtml && (
          <div
            ref={htmlPreviewRef}
            id={`html-preview-${index}`}
            className="mt-4 overflow-hidden transition-all duration-200 ease-in-out"
            style={{ willChange: "height, opacity" }}
          >
            <pre className="text-xs bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto text-primary-800">
              {result.html.length > 500
                ? `${result.html.substring(0, 500)}...`
                : result.html}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultCard;