"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = searchParams.get('code') || '';
  
  const [code, setCode] = useState(initialCode);
  const [cert, setCert] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrSrc, setQrSrc] = useState('');

  useEffect(() => {
    if (initialCode) {
      verifyCode(initialCode);
    }
  }, [initialCode]);

  const verifyCode = async (searchCode) => {
    if (!searchCode) return;
    setLoading(true);
    setCert(null);
    setError(null);
    
    try {
      const res = await fetch(`/api/certificates/${searchCode}`);
      const data = await res.json();
      
      if (data.success) {
        setCert(data.data);
        const origin = window.location.origin;
        const verifyUrl = `${origin}/verify?code=${data.data.certificate_code}`;
        setQrSrc(`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(verifyUrl)}`);
      } else {
        setError('Invalid Certificate Code. No record found.');
      }
    } catch (err) {
      setError('Error verifying certificate.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    router.push(`/verify?code=${code}`);
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <header className="page-header" style={{ textAlign: 'center' }}>
        <h1 className="page-title">Verify Certificate</h1>
        <p className="page-description">Enter the certificate code below to verify its authenticity.</p>
      </header>

      <div className="card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. WJ2026A1B2C3" 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ maxWidth: '300px', textAlign: 'center', fontWeight: 'bold' }}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </div>

      {error && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', border: '1px solid #fca5a5' }}>
          <h3 style={{ color: '#a00000', marginBottom: '1rem' }}>Verification Failed</h3>
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
          <button className="secondary" style={{ marginTop: '1.5rem' }} onClick={() => { setCode(''); setError(null); }}>Try Again</button>
        </div>
      )}

      {cert && (
        <div className="card" style={{ padding: '3rem', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle decoration */}
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'rgba(160,0,0,0.03)', borderRadius: '50%' }}></div>
          
          <h2 style={{ color: '#16a34a', textAlign: 'center', marginBottom: '2rem' }}>✓ Authentic Certificate</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Awarded To</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{cert.recipient_name}</div>
              <div style={{ color: 'var(--text-muted)' }}>{cert.designation}, {cert.institution}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Publication Details</div>
                <div style={{ fontWeight: '500', fontSize: '1.1rem' }}>{cert.chapter_title}</div>
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                  {cert.book_title ? `in "${cert.book_title}"` : 'in Wisdom Journal'}
                </div>
                <div className="badge">
                  {cert.isbn ? `ISBN: ${cert.isbn}` : `ISSN: ${cert.issn}`}
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                {qrSrc && <img src={qrSrc} alt="QR Code" style={{ width: '100px', height: '100px', border: '1px solid #eee', padding: '0.25rem', background: '#fff' }} />}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Certificate Number</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1.1rem' }}>{cert.certificate_code}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Issue Date</div>
                <div style={{ fontWeight: '500' }}>{new Date(cert.issue_date).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <a href={`/api/certificates/${cert.certificate_code}/pdf`} target="_blank">
              <button style={{ padding: '0.75rem 2rem', fontSize: '1.1rem', width: '100%' }}>Download Original PDF</button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Verify() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
