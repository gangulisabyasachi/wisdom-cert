"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCertificates(search);
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
        // Optimistic UI update
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
    <>
      <header className="page-header">
        <h1 className="page-title">Certificate Dashboard</h1>
        <p className="page-description">Overview and management of all issued certificates.</p>
      </header>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', width: '300px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search code, name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
          
          <Link href="/generate">
            <button>+ Generate New</button>
          </Link>
        </div>

        <div className="table-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading records...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Recipient Name</th>
                  <th>Publication / Title</th>
                  <th>Identifier</th>
                  <th>Issue Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No certificates found.</td>
                  </tr>
                ) : (
                  certificates.map(cert => (
                    <tr key={cert._id || cert.certificate_code}>
                      <td><span className="badge">{cert.certificate_code}</span></td>
                      <td>
                        <strong>{cert.recipient_name}</strong>
                        <br/>
                        <small style={{ color: 'var(--text-muted)' }}>{cert.designation}, {cert.institution}</small>
                      </td>
                      <td>
                        <div>{cert.book_title || "Journal Paper"}</div>
                        <small style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{cert.chapter_title}</small>
                      </td>
                      <td>
                        {cert.isbn ? `ISBN: ${cert.isbn}` : `ISSN: ${cert.issn}`}
                      </td>
                      <td>{cert.issue_date ? new Date(cert.issue_date).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <Link href={`/verify?code=${cert.certificate_code}`}>
                            <button className="secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>View</button>
                          </Link>
                          <a href={`/api/certificates/${cert.certificate_code}/pdf`} target="_blank">
                            <button style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>PDF</button>
                          </a>
                          <button 
                            className="danger" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
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
    </>
  );
}
