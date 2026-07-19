import mongoose, { Schema } from 'mongoose';

export interface IUser {
  // DEMO AUTH: No email/password — simplified select-user login for testing.
  // A real production system would use email+bcrypt or an OAuth provider.
  username: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    displayName: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation of model in dev
export const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
