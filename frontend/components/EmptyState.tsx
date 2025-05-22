'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface EmptyStateProps {
  message?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  message = 'No results found. Try a different search query.' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (containerRef.current && iconRef.current) {
      // Set initial opacity to ensure visibility
      gsap.set(containerRef.current, { opacity: 1 });
      gsap.set(iconRef.current, { opacity: 1 });
      
      // Subtle animation for the container
      const containerAnim = gsap.from(containerRef.current, {
        y: 20,
        opacity: 0.8,
        duration: 0.5,
        ease: "power3.out",
        onComplete: () => {
          gsap.set(containerRef.current, { clearProps: "transform,opacity" });
        }
      });
      
      // Animate the icon
      const iconAnim = gsap.from(iconRef.current, {
        scale: 0.9,
        duration: 0.6,
        ease: "elastic.out(1, 0.3)"
      });
      
      // Create a floating animation for the icon
      const floatAnim = gsap.to(iconRef.current, {
        y: -6,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
      
      return () => {
        containerAnim.kill();
        iconAnim.kill();
        floatAnim.kill();
      };
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className="text-center py-12 bg-white rounded-xl shadow-sm border border-primary-100"
      style={{ opacity: 1 }}
    >
      <svg 
        ref={iconRef}
        xmlns="http://www.w3.org/2000/svg" 
        className="h-20 w-20 mx-auto text-primary-300 mb-6" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        style={{ opacity: 1 }}
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={1.5} 
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      <p className="text-gray-500 text-lg">{message}</p>
      <button className="mt-6 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors">
        Try another search
      </button>
    </div>
  );
};

export default EmptyState;
