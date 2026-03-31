import { Router } from 'express';
import { submitFeedback } from '../controllers/feedbackController.js';

export const feedbackRoutes = Router();
// Accept JSON body from React (express.json middleware)
feedbackRoutes.post('/submit', submitFeedback);

