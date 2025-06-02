# Quiz Management API Documentation

## Overview
This API provides comprehensive quiz management functionality for educational platforms, supporting CRUD operations with role-based access control.

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Base URL
\`\`\`
http://localhost:3000/api/quizzes
\`\`\`

## Endpoints

### 1. Create Quiz
**POST** `/api/quizzes`

**Access:** Tutors and Admins only

**Request Body:**
```json
{
  "courseId": "123e4567-e89b-12d3-a456-426614174000",
  "moduleId": "123e4567-e89b-12d3-a456-426614174001",
  "title": "JavaScript Fundamentals Quiz",
  "description": "Test your knowledge of JavaScript basics",
  "questions": [
    {
      "text": "What is the correct way to declare a variable in JavaScript?",
      "options": [
        {
          "text": "var myVar = 'value';",
          "isCorrect": true
        },
        {
          "text": "variable myVar = 'value';",
          "isCorrect": false
        },
        {
          "text": "v myVar = 'value';",
          "isCorrect": false
        }
      ],
      "explanation": "The 'var' keyword is used to declare variables in JavaScript."
    }
  ]
}