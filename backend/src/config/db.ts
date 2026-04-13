import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
  const mongoURI = process.env.MONGODB_URI?.trim();

  if (!mongoURI) {
    console.error(
      'MONGODB_URI is not set. Create backend/.env (see backend/.env.example).'
    );
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return;
  }

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10_000,
    });
    console.log('MongoDB Connected...');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('MongoDB Connection Error:', message);
    console.error(
      'If the backend runs on your machine and Mongo runs in Docker, start Mongo with ' +
        '`docker compose up -d mongodb` and use 127.0.0.1:27017 in MONGODB_URI (not hostname "mongodb").'
    );
    console.log('Continuing without MongoDB connection...');
  }
};

export default connectDB;