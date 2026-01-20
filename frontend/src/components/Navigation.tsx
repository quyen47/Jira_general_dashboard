'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  // Don't show navigation on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <nav style={{
      background: '#0052cc',
      padding: '12px 24px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: '32px'
      }}>
        <Link href="/" style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'white',
          textDecoration: 'none'
        }}>
          📊 Beyond Jira
        </Link>

        <div style={{ display: 'flex', gap: '16px', marginLeft: 'auto' }}>
          <Link
            href="/settings"
            style={{
              padding: '8px 16px',
              borderRadius: 4,
              color: 'white',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
              background: pathname === '/settings' ? 'rgba(255,255,255,0.2)' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            ⚙️ Settings
          </Link>
        </div>
      </div>
    </nav>
  );
}
