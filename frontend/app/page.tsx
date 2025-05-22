'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import SearchForm from '../components/SearchForm';
import ResultCard from '../components/ResultCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

interface SearchResult {
  content: string;
  match_score: number;
  html: string;
  path: string;
}

export default function Home() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const searchFormRef = useRef(null);
  const resultsRef = useRef(null);

  // GSAP animations
  useEffect(() => {
    if (!titleRef.current || !subtitleRef.current || !searchFormRef.current) return;
    
    // Set initial visibility
    gsap.set([titleRef.current, subtitleRef.current, searchFormRef.current], { opacity: 1 });
    
    // Initial animations
    const tl = gsap.timeline();
    
    tl.from(titleRef.current, {
      y: -30,
      opacity: 0.5,
      duration: 0.7,
      ease: "power3.out",
      onComplete: () => {
        gsap.set(titleRef.current, { clearProps: "all" });
      }
    })
    .from(subtitleRef.current, {
      y: -20,
      opacity: 0.5,
      duration: 0.5,
      ease: "power3.out",
      onComplete: () => {
        gsap.set(subtitleRef.current, { clearProps: "all" });
      }
    }, "-=0.3")
    .from(searchFormRef.current, {
      y: 20,
      opacity: 0.5,
      duration: 0.6,
      ease: "power3.out",
      onComplete: () => {
        gsap.set(searchFormRef.current, { clearProps: "all" });
      }
    }, "-=0.2");
    
    // Optional background animation
    const bgAnim = gsap.to('.animated-bg', {
      backgroundPosition: '100% 100%',
      duration: 15,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
    
    return () => {
      tl.kill();
      bgAnim.kill();
    };
  }, []);

  // Animation for results
  useEffect(() => {
    if (searchPerformed && resultsRef.current) {
      // First ensure the container is visible
      gsap.set(resultsRef.current, { opacity: 1 });
      
      // Then add a subtle animation
      const resultsAnim = gsap.from(resultsRef.current, {
        y: 30,
        opacity: 0.7,
        duration: 0.5,
        ease: "power2.out",
        onComplete: () => {
          // Ensure visibility after animation completes
          gsap.set(resultsRef.current, { clearProps: "all" });
        }
      });
      
      return () => {
        resultsAnim.kill();
      };
    }
  }, [searchPerformed, results]);

  const handleSearch = async (url: string, query: string) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('url', url);
      formData.append('query', query);

      // Use environment variable for backend URL
      const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

      const response = await axios.post(`${API_URL}/search`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Deduplicate by content
      const seen = new Set();
      const uniqueResults = response.data.filter((r: any) => {
        if (!r || !r.content) return false;
        const duplicate = seen.has(r.content);
        seen.add(r.content);
        return !duplicate;
      });

      console.log('Search results:', uniqueResults.length);
      setResults(uniqueResults);
      setSearchPerformed(true);
    } catch (err) {
      console.error('Error searching:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-10 px-4 md:px-8 animated-bg" 
          style={{ backgroundImage: 'linear-gradient(135deg, rgba(241, 233, 254, 0.4) 0%, rgba(255, 255, 255, 0.8) 100%)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 ref={titleRef} className="text-4xl md:text-5xl font-bold mb-3 text-primary-800 relative inline-block glow-effect">
            <span className="text-primary-600">Justn</span>app
          </h1>
          <p ref={subtitleRef} className="text-gray-600 text-lg">Search through website content with precision and elegance</p>
        </div>

        <div ref={searchFormRef} className="mb-12">
          <SearchForm onSearch={handleSearch} isLoading={loading} />
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 my-6 rounded-lg animate-fadeIn">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {searchPerformed && (
          <div ref={resultsRef} className="mt-8" style={{ opacity: 1 }}>
            <h2 className="text-2xl font-semibold mb-6 text-primary-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Search Results
            </h2>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : results.length === 0 && !error ? (
              <EmptyState />
            ) : (
              <div className="space-y-6" style={{ opacity: 1 }}>
                {results.map((result, index) => (
                  <ResultCard key={`result-${index}`} result={result} index={index + 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
