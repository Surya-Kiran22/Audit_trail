import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import commandRouter from './routes/commandRouter.js';
import queryRouter from './routes/queryRouter.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// CQRS Routers
app.use('/api/commands', commandRouter);
app.use('/api/queries', queryRouter);

// Serve static frontend build
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Fallback to index.html for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

// Centralized error handling
app.use(errorHandler);

export default app;
