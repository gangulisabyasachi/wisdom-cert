'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="card login-card">
        <div className="login-logo">
          WISDOM
        </div>
        <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: '3rem', marginTop: '0.5rem' }}>
          Administrative Portal
        </h2>

        {error && (
          <div style={{ backgroundColor: '#fff5f5', color: '#c53030', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '2rem', border: '1px solid #feb2b2' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@wisdomj.in"
              required
            />
          </div>

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1.25rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: '2.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          Authorized Access Only. All activities are logged.
        </p>
      </div>
    </div>
  );
}
