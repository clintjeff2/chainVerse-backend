const { body, validationResult } = require('express-validator');

// Validation for creating a course update
exports.validateCourseUpdateCreation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 3, max: 1000 }).withMessage('Message must be between 3 and 1000 characters'),
  
  body('attachments')
    .optional()
    .isArray().withMessage('Attachments must be an array')
    .custom((value) => {
      if (value && !value.every(item => typeof item === 'string')) {
        throw new Error('Each attachment must be a string');
      }
      return true;
    })
];

// Middleware to check validation results
exports.validateResults = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg
      }))
    });
  }
  next();
}; 