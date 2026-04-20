'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--wisdom-red)' }}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
          WISDOM
        </div>
        
        <nav className="sidebar-nav">
          <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
            Dashboard
          </Link>
          <Link href="/generate" className={`nav-item ${pathname === '/generate' ? 'active' : ''}`}>
            Issue Certificate
          </Link>
          <Link href="/verify" className={`nav-item ${pathname.startsWith('/verify') ? 'active' : ''}`}>
            Public Verifier
          </Link>
          <a href="https://wisdominstitution.org/admin" target="_blank" rel="noopener noreferrer" className="nav-item" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-on-dark)', paddingTop: '1.5rem' }}>
            Main Admin Portal ↗
          </a>
        </nav>

        <div className="sidebar-footer">
          <button 
            onClick={handleLogout}
            className="nav-item" 
            style={{ background: 'transparent', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
