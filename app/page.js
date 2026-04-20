"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';

export default function Dashboard() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async (searchQuery = '') => {
    setLoading(true);
    try {
      const url = searchQuery ? `/api/certificates?search=${encodeURIComponent(searchQuery)}` : '/api/certificates';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCertificates(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (term) => {
    setSearchTerm(term);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      fetchCertificates(term);
    }, 300); // 300ms debounce
  };

  const handleClear = () => {
    setSearchTerm('');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    fetchCertificates('');
  };

  const handleDelete = async (code) => {
    if (!window.confirm(`Are you sure you want to delete certificate ${code}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/certificates/${code}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setCertificates(prev => prev.filter(c => c.certificate_code !== code));
      } else {
        alert(data.error || 'Failed to delete certificate');
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert('An error occurred while deleting');
    }
  };

  return (
    <AdminLayout>
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Review and manage official Wisdom Journal and Edited Book certificates.</p>
      </header>

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Type to auto-search certificates..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{ width: '100%', paddingRight: '15px' }}
            />
          </div>
          {searchTerm && (
            <button type="button" className="btn btn-secondary" onClick={handleClear}>Clear Search</button>
          )}
          <Link href="/generate">
            <button className="btn btn-primary">+ New Certificate</button>
          </Link>
        </div>

        <div className="table-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
              Retrieving records...
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Identity</th>
                  <th>Recipient Details</th>
                  <th>Publication / Title</th>
                  <th>ID Number</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                      No certificates on record.
                    </td>
                  </tr>
                ) : (
                  certificates.map(cert => (
                    <tr key={cert._id || cert.certificate_code}>
                      <td>
                        <span className="badge badge-info">{cert.certificate_code}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{cert.recipient_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cert.designation}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cert.institution}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{cert.book_title || "Journal Paper"}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '250px' }}>{cert.chapter_title}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          {cert.isbn ? <><span style={{ fontWeight: 700 }}>ISBN:</span> {cert.isbn}</> : <><span style={{ fontWeight: 700 }}>ISSN:</span> {cert.issn}</>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Issued: {cert.issue_date ? new Date(cert.issue_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <a href={`/api/certificates/${cert.certificate_code}/pdf`} target="_blank" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                            PDF
                          </a>
                          <Link href={`/edit/${cert.certificate_code}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                            Edit
                          </Link>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                            onClick={() => handleDelete(cert.certificate_code)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
