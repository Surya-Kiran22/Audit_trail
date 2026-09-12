import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Automatically load .env file from backend root
dotenv.config();

try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch (e) {
  // Ignore if .env is missing or already loaded by dotenv
}

export async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/audit_trail';
  try {
    const conn = await mongoose.connect(mongoUri);
    const isAtlas = mongoUri.includes('mongodb+srv://') || conn.connection.host.includes('mongodb.net');
    console.log(`MongoDB Connected: ${isAtlas ? 'MongoDB Atlas Cloud' : conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB (${mongoUri}): ${error.message}`);
    throw error;
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
