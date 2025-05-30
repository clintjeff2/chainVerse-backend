const Joi = require("joi");

const createNotificationDto = Joi.object({
  userId: Joi.string().required().messages({
    "string.empty": "User ID is required",
    "any.required": "User ID is required",
  }),
  title: Joi.string().trim().max(200).required().messages({
    "string.empty": "Title is required",
    "string.max": "Title cannot exceed 200 characters",
    "any.required": "Title is required",
  }),
  message: Joi.string().trim().max(1000).required().messages({
    "string.empty": "Message is required",
    "string.max": "Message cannot exceed 1000 characters",
    "any.required": "Message is required",
  }),
  type: Joi.string()
    .valid("info", "success", "warning", "error")
    .default("info")
    .messages({
      "any.only": "Type must be one of: info, success, warning, error",
    }),
});

const getNotificationsQueryDto = Joi.object({
  unread: Joi.boolean().default(false),
  archived: Joi.boolean().default(false),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string().valid("info", "success", "warning", "error").optional(),
});

module.exports = {
  createNotificationDto,
  getNotificationsQueryDto,
};
