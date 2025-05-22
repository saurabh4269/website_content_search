'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = '#8b5cf6' 
}) => {
  const spinnerRef = useRef<HTMLDivElement>(null);
  
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };
  
  useEffect(() => {
    if (spinnerRef.current) {
      // Ensure spinner is visible
      gsap.set(spinnerRef.current, { opacity: 1 });
      
      // Create a rotating animation
      const rotateAnim = gsap.to(spinnerRef.current, {
        rotation: 360,
        duration: 1.5,
        ease: "none",
        repeat: -1
      });
      
      // Create a pulsing animation for the dots
      const dots = spinnerRef.current.querySelectorAll('.spinner-dot');
      const dotAnims: gsap.core.Tween[] = [];
      
      dots.forEach((dot, index) => {
        // Ensure dots are visible
        gsap.set(dot, { opacity: 1 });
        
        const anim = gsap.to(dot, {
          scale: 0.7,
          opacity: 0.7,
          duration: 0.8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: index * 0.15
        });
        
        dotAnims.push(anim);
      });
      
      return () => {
        rotateAnim.kill();
        dotAnims.forEach(anim => anim.kill());
      };
    }
  }, []);

  return (
    <div className="flex justify-center items-center">
      <div 
        ref={spinnerRef}
        className={`relative ${sizeMap[size]}`}
        style={{ opacity: 1 }}
      >
        {[...Array(4)].map((_, index) => (
          <div 
            key={index}
            className="spinner-dot absolute w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: color,
              top: index === 0 || index === 1 ? '0' : 'auto',
              bottom: index === 2 || index === 3 ? '0' : 'auto',
              left: index === 0 || index === 3 ? '0' : 'auto',
              right: index === 1 || index === 2 ? '0' : 'auto',
              opacity: 1
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default LoadingSpinner;
