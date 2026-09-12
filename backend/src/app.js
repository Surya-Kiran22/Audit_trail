import express from 'express';
import cors from 'cors';
import commandRouter from './routes/commandRouter.js';
import queryRouter from './routes/queryRouter.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// CQRS Routers
app.use('/api/commands', commandRouter);
app.use('/api/queries', queryRouter);

// Centralized error handling
app.use(errorHandler);

export default app;
