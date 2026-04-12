import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  legacy_id:           Number,
  name:                { type: String, required: true },
  email:               { type: String, required: true, unique: true },
  password:            { type: String },
  role:                { type: String, default: 'user' },  // 'admin' | 'user'
  email_verified_at:   Date,
  remember_token:      String,
  original_created_at: Date,
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
