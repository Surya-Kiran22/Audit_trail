import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Automatically load .env file from backend root
dotenv.config();

try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch (e) {
  // Ignore if .env is missing or already loaded by dotenv
}

let mongoServer = null;

export async function connectDB(uri) {
  let mongoUri = uri || process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      const conn = await mongoose.connect(mongoUri);
      const isAtlas = mongoUri.includes('mongodb+srv://') || conn.connection.host.includes('mongodb.net');
      console.log(`MongoDB Connected: ${isAtlas ? 'MongoDB Atlas Cloud' : conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`Error connecting to MONGODB_URI (${mongoUri}): ${error.message}`);
      throw error;
    }
  }

  // If no MONGODB_URI provided, attempt local MongoDB with a short timeout, then fall back to in-memory server
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/audit_trail', {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`MongoDB Connected: Localhost (${conn.connection.host})`);
    return conn;
  } catch (err) {
    console.warn(`Local MongoDB not available (${err.message}). Falling back to In-Memory MongoDB...`);
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: In-Memory Database (${mongoUri})`);
    return conn;
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}
