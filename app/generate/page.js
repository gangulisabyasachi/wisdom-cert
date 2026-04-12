"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Generate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    recipient_name: '',
    designation: '',
    institution: '',
    type: 'journal', // 'journal' or 'book'
    book_title: '',
    isbn: '',
    issn: '2395-0218',
    chapter_title: '',
    issue_date: new Date().toISOString().split('T')[0]
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Clean up dependent fields based on type
    const payload = { ...formData };
    if (payload.type === 'journal') {
      payload.book_title = '';
      payload.isbn = '';
    } else {
      payload.issn = '';
    }
    delete payload.type;

    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        router.push(`/verify?code=${data.data.certificate_code}`);
      } else {
        setError(data.error || 'Failed to generate certificate');
      }
    } catch (err) {
      setError('An error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header className="page-header">
        <h1 className="page-title">Generate Certificate</h1>
        <p className="page-description">Create a new publication certificate.</p>
      </header>

      <div className="card">
        {error && <div style={{ color: '#a00000', marginBottom: '1rem', padding: '1rem', background: 'rgba(160,0,0,0.1)', borderRadius: '8px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Recipient Information */}
            <div style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Recipient Information</h3>
            </div>
            
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Recipient Name</label>
              <input required type="text" name="recipient_name" className="form-input" value={formData.recipient_name} onChange={handleChange} placeholder="Dr./Prof./Mr./Ms. Name" />
            </div>

            <div className="form-group">
              <label className="form-label">Designation</label>
              <input required type="text" name="designation" className="form-input" value={formData.designation} onChange={handleChange} placeholder="e.g. Assistant Professor" />
            </div>

            <div className="form-group">
              <label className="form-label">Institution</label>
              <input required type="text" name="institution" className="form-input" value={formData.institution} onChange={handleChange} placeholder="University/College Name" />
            </div>

            {/* Publication Details */}
            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Publication Details</h3>
            </div>
            
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Paper / Chapter Title</label>
              <input required type="text" name="chapter_title" className="form-input" value={formData.chapter_title} onChange={handleChange} placeholder="Title of the contribution" />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Publication Type</label>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="type" value="journal" checked={formData.type === 'journal'} onChange={handleChange} />
                  Wisdom Journal
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="type" value="book" checked={formData.type === 'book'} onChange={handleChange} />
                  Edited Book
                </label>
              </div>
            </div>

            {formData.type === 'book' ? (
              <>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Book Title</label>
                  <input required type="text" name="book_title" className="form-input" value={formData.book_title} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">ISBN</label>
                  <input required type="text" name="isbn" className="form-input" value={formData.isbn} onChange={handleChange} />
                </div>
              </>
            ) : (
              <div className="form-group">
                <label className="form-label">ISSN (P)</label>
                <input required type="text" name="issn" className="form-input" value={formData.issn} onChange={handleChange} />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Issue Date</label>
              <input required type="date" name="issue_date" className="form-input" value={formData.issue_date} onChange={handleChange} />
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="secondary" onClick={() => router.back()}>Cancel</button>
            <button type="submit" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Certificate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
