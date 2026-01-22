'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateProjectRecommendations } from '@/actions/n8n';

interface AIRecommendationsProps {
  projectKey: string;
}

export default function AIRecommendations({ projectKey }: AIRecommendationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateProjectRecommendations(projectKey);
      if (result.success && result.data) {
        setContent(result.data);
      } else {
        setError(result.error || 'Unknown error occurred');
      }
    } catch (e) {
      setError('Failed to connect to AI service');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // Gradient for "AI" feel
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease',
          fontSize: '0.9rem'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <span>✨</span> Get AI Recommendations
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 30, 66, 0.54)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            background: 'white',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            borderRadius: '8px',
            boxShadow: '0 8px 16px -4px rgba(9, 30, 66, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #dfe1e6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#172b4d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✨ AI Project Recommendations
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#5e6c84' }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, minHeight: '300px' }}>
              {!content && !isLoading && !error && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#5e6c84' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🤖</div>
                  <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
                    Generate actionable insights for <strong>{projectKey}</strong> based on current metrics.
                  </p>
                  <button
                    onClick={handleGenerate}
                    style={{
                      padding: '12px 24px',
                      background: '#0052cc',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '1rem'
                    }}
                  >
                    Generate Insights
                  </button>
                </div>
              )}

              {isLoading && (
                <div style={{ textAlign: 'center', padding: '60px' }}>
                   <div className="loading-spinner" style={{ 
                     border: '4px solid #f3f3f3', 
                     borderTop: '4px solid #6366f1', 
                     borderRadius: '50%', 
                     width: '40px', 
                     height: '40px', 
                     animation: 'spin 1s linear infinite', 
                     margin: '0 auto 20px'
                   }} />
                   <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                   <p style={{ color: '#5e6c84' }}>Analyzing project data...</p>
                </div>
              )}

              {error && (
                <div style={{ padding: '20px', background: '#FFFAE6', border: '1px solid #FFC400', borderRadius: '4px', color: '#172b4d' }}>
                  <strong>⚠️ Error:</strong> {error}
                  <div style={{ marginTop: '10px' }}>
                    <button onClick={handleGenerate} style={{ cursor: 'pointer', color: '#0052cc', background: 'none', border: 'none', padding: 0, textDecoration: 'underline' }}>
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {content && (
                <div className="markdown-content" style={{ lineHeight: '1.6', color: '#172b4d' }}>
                  <ReactMarkdown 
                    components={{
                      h1: (props: any) => <h3 style={{ marginTop: 0, color: '#172b4d' }} {...props} />,
                      h2: (props: any) => <h4 style={{ marginTop: '1.5em', color: '#172b4d' }} {...props} />,
                      ul: (props: any) => <ul style={{ paddingLeft: '20px' }} {...props} />,
                      li: (props: any) => <li style={{ marginBottom: '8px' }} {...props} />,
                      p: (props: any) => <p style={{ marginBottom: '16px' }} {...props} />,
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            
            {/* Footer */}
            {content && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid #dfe1e6', background: '#f4f5f7', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#dfe1e6',
                    color: '#172b4d',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
