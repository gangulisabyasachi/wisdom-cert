import mongoose from 'mongoose';

const CertificateSchema = new mongoose.Schema({
  recipient_name: { type: String, required: true },
  designation: { type: String },
  institution: { type: String },
  book_title: { type: String },
  isbn: { type: String },
  issn: { type: String },
  chapter_title: { type: String },
  issue_date: { type: Date, default: Date.now },
  certificate_code: { type: String, required: true, unique: true }
}, { 
  collection: 'publicationcertificates',
  timestamps: true 
});

const Certificate = mongoose.models.Certificate || mongoose.model('Certificate', CertificateSchema);
export default Certificate;
