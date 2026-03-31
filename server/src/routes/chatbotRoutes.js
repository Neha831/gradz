import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import {
  listChatbotResponses,
  appendChatbotResponse,
  appendStudentChatMessage
} from '../controllers/chatbotController.js';

export const chatbotRoutes = Router();

chatbotRoutes.get('/responses', requireAuth, requireRole(['admin']), listChatbotResponses);
chatbotRoutes.post('/responses', requireAuth, requireRole(['admin']), appendChatbotResponse);

/** Same JSON store as legacy fetch_chatbot_responses.php — students and admins may read. */
chatbotRoutes.get('/history', requireAuth, requireRole(['admin', 'student']), listChatbotResponses);
chatbotRoutes.post('/message', requireAuth, requireRole(['student']), appendStudentChatMessage);
