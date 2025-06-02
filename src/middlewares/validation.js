const { body, param, validationResult } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');

// --- Sanitization helper ---
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return DOMPurify.sanitize(str.trim());
};

// --- Middleware: Sanitization (recursive for nested objects) ---
const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };
  if (req.body) {
    sanitizeObject(req.body);
  }
  next();
};

// --- Quiz Creation Validation ---
const validateQuizCreation = [
  body('courseId')
    .isUUID().withMessage('Course ID must be a valid UUID'),
  body('moduleId')
    .isUUID().withMessage('Module ID must be a valid UUID'),
  body('title')
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters')
    .trim(),
  body('questions')
    .isArray({ min: 5 }).withMessage('Quiz must have at least 5 questions'),
  body('questions.*.text')
    .isLength({ min: 1, max: 500 }).withMessage('Question text must be between 1 and 500 characters')
    .trim(),
  body('questions.*.options')
    .isArray({ min: 2, max: 5 }).withMessage('Each question must have between 2 and 5 options'),
  body('questions.*.options.*.text')
    .isLength({ min: 1, max: 200 }).withMessage('Option text must be between 1 and 200 characters')
    .trim(),
  body('questions.*.options.*.isCorrect')
    .isBoolean().withMessage('isCorrect must be a boolean value'),
  body('questions.*.explanation')
    .optional()
    .isLength({ max: 1000 }).withMessage('Explanation must not exceed 1000 characters')
    .trim(),
];

// --- Quiz Update Validation (Partial) ---
const validateQuizUpdate = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters')
    .trim(),
  body('moduleId')
    .optional()
    .isUUID().withMessage('Module ID must be a valid UUID'),
  body('questions')
    .optional()
    .isArray({ min: 5 }).withMessage('Quiz must have at least 5 questions'),
  body('questions.*.text')
    .optional()
    .isLength({ min: 1, max: 500 }).withMessage('Question text must be between 1 and 500 characters')
    .trim(),
  body('questions.*.options')
    .optional()
    .isArray({ min: 2, max: 5 }).withMessage('Each question must have between 2 and 5 options'),
  body('questions.*.options.*.text')
    .optional()
    .isLength({ min: 1, max: 200 }).withMessage('Option text must be between 1 and 200 characters')
    .trim(),
  body('questions.*.options.*.isCorrect')
    .optional()
    .isBoolean().withMessage('isCorrect must be a boolean value'),
  body('questions.*.explanation')
    .optional()
    .isLength({ max: 1000 }).withMessage('Explanation must not exceed 1000 characters')
    .trim(),
];

// --- Quiz ID param validation ---
const validateQuizId = [
  param('quizId')
    .isUUID().withMessage('Quiz ID must be a valid UUID')
];

// --- Question ID param validation ---
const validateQuestionId = [
  param('questionId')
    .isUUID().withMessage('Question ID must be a valid UUID')
];

// --- Aggregate Validation Error Handler ---
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: formattedErrors
    });
  }
  next();
};

// --- Custom Business Rules Validator ---
const validateQuizBusinessRules = (req, res, next) => {
  const { questions } = req.body;
  if (questions) {
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const correctOptions = question.options?.filter(option => option.isCorrect) || [];
      if (correctOptions.length === 0) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'BUSINESS_RULE_VIOLATION',
          details: [{
            field: `questions[${i}].options`,
            message: 'Each question must have at least one correct option'
          }]
        });
      }
      const optionTexts = question.options?.map(option => option.text.toLowerCase().trim()) || [];
      const uniqueTexts = new Set(optionTexts);
      if (optionTexts.length !== uniqueTexts.size) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'BUSINESS_RULE_VIOLATION',
          details: [{
            field: `questions[${i}].options`,
            message: 'Options within a question must be unique'
          }]
        });
      }
    }
  }
  next();
};

module.exports = {
  sanitizeInput,
  validateQuizCreation,
  validateQuizUpdate,
  validateQuizId,
  validateQuestionId,
  validateRequest,
  validateQuizBusinessRules
};