import { Router } from 'express';
import { submitContact } from '../controllers/contactController.js';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/requestValidation.js';

export const contactRoutes = Router();

contactRoutes.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('contact_number')
      .optional({ values: 'falsy' })
      .isLength({ min: 7, max: 20 })
      .withMessage('Contact number must be 7-20 characters'),
    validateRequest
  ],
  submitContact
);

