"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';

export default function EditCertificate({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { code } = resolvedParams;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    recipient_name: '',
    designation: '',
    institution: '',
    type: 'journal',
    book_title: '',
    isbn: '',
    issn: '',
    chapter_title: '',
    issue_date: ''
  });

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        const res = await fetch(`/api/certificates/${code}`);
        const data = await res.json();
        
        if (data.success) {
          const cert = data.data;
          setFormData({
            recipient_name: cert.recipient_name,
            designation: cert.designation,
            institution: cert.institution,
            type: cert.isbn ? 'book' : 'journal',
            book_title: cert.book_title || '',
            isbn: cert.isbn || '',
            issn: cert.issn || '',
            chapter_title: cert.chapter_title,
            issue_date: new Date(cert.issue_date).toISOString().split('T')[0]
          });
        } else {
          setError('Certificate not found.');
        }
      } catch (err) {
        setError('Failed to load certificate data.');
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchCertificate();
    }
  }, [code]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = { ...formData };
    if (payload.type === 'journal') {
      payload.isbn = '';
    } else {
      payload.issn = '';
    }
    delete payload.type;

    try {
      const res = await fetch(`/api/certificates/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Failed to update certificate');
      }
    } catch (err) {
      setError('An error occurred during submission.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
        Retrieving certificate data...
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <header className="page-header">
        <h1 className="page-title">Edit Record</h1>
        <p className="page-description">Modifying authentication details for certificate <span className="badge badge-info">{code}</span></p>
      </header>

      <div className="card" style={{ maxWidth: '900px' }}>
        {error && (
          <div style={{ backgroundColor: '#fff5f5', color: '#c53030', padding: '1.25rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', marginBottom: '2.5rem', border: '1px solid #feb2b2' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Section 1: Recipient */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ 
              fontSize: '1.25rem', 
              color: 'var(--wisdom-red)', 
              marginBottom: '1.5rem', 
              borderBottom: '1px solid var(--border-subtle)', 
              paddingBottom: '0.75rem' 
            }}>
              Scholarly Recipient
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Full Name of Recipient</label>
                <input required type="text" name="recipient_name" className="form-input" value={formData.recipient_name} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label className="form-label">Academic Designation</label>
                <input required type="text" name="designation" className="form-input" value={formData.designation} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label className="form-label">Institutional Affiliation</label>
                <input required type="text" name="institution" className="form-input" value={formData.institution} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Section 2: Publication Details */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ 
              fontSize: '1.25rem', 
              color: 'var(--wisdom-red)', 
              marginBottom: '2rem', 
              borderBottom: '1px solid var(--border-subtle)', 
              paddingBottom: '0.75rem' 
            }}>
              Publication Information
            </h3>
            
            <div className="form-group">
              <label className="form-label">Paper / Chapter Title</label>
              <input required type="text" name="chapter_title" className="form-input" value={formData.chapter_title} onChange={handleChange} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Category</label>
                <div style={{ display: 'flex', gap: '3rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 500 }}>
                    <input type="radio" name="type" value="journal" checked={formData.type === 'journal'} onChange={handleChange} style={{ accentColor: 'var(--wisdom-red)', width: '18px', height: '18px' }} />
                    Wisdom Journal
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 500 }}>
                    <input type="radio" name="type" value="book" checked={formData.type === 'book'} onChange={handleChange} style={{ accentColor: 'var(--wisdom-red)', width: '18px', height: '18px' }} />
                    Edited Book
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Official Title of Publication</label>
                <input required type="text" name="book_title" className="form-input" value={formData.book_title} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label className="form-label">{formData.type === 'book' ? 'ISBN Number' : 'ISSN (Print)'}</label>
                <input 
                  required 
                  type="text" 
                  name={formData.type === 'book' ? 'isbn' : 'issn'} 
                  className="form-input" 
                  value={formData.type === 'book' ? formData.isbn : formData.issn} 
                  onChange={handleChange} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Official Issue Date</label>
                <input required type="date" name="issue_date" className="form-input" value={formData.issue_date} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div style={{ 
            marginTop: '4rem', 
            paddingTop: '2rem', 
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '1.5rem' 
          }}>
            <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '0.9rem 2.5rem' }}>
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
