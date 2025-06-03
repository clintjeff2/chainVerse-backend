const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Tutor = require('../models/Tutor');

// Generate tokens with different roles
const adminToken = jwt.sign({ id: 'adminUserId', role: 'admin' }, process.env.JWT_SECRET);
const studentToken = jwt.sign({ id: 'studentUserId', role: 'student' }, process.env.JWT_SECRET);

describe('GET /api/reports/tutor/:tutorId', () => {
  it('should deny access without token', async () => {
    const res = await request(app).get('/api/reports/tutor/123456789012345678901234');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('should deny access with insufficient role', async () => {
    const res = await request(app)
      .get('/api/reports/tutor/123456789012345678901234')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/Access denied/);
  });

  it('should return 400 for invalid tutorId', async () => {
    const res = await request(app)
      .get('/api/reports/tutor/invalidId')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Invalid tutorId/);
  });

  it('should return 404 if tutor not found', async () => {
    // Ensure tutorId is valid but not in DB
    const fakeTutorId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/reports/tutor/${fakeTutorId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/Tutor not found/);
  });

  it('should return tutor report for valid tutorId and role', async () => {
    // Create a test tutor in DB
    const tutor = await Tutor.create({ name: 'Test Tutor', role: 'tutor' });
    
    const res = await request(app)
      .get(`/api/reports/tutor/${tutor._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.tutor).toBe(tutor.name);
    expect(res.body.metrics).toBeDefined();
    expect(typeof res.body.metrics).toBe('object');

    // Clean up
    await Tutor.findByIdAndDelete(tutor._id);
  });
});

describe('GET /api/reports/tutors', () => {
  it('should deny access without token', async () => {
    const res = await request(app).get('/api/reports/tutors');
    expect(res.statusCode).toBe(401);
  });

  it('should deny access with insufficient role', async () => {
    const res = await request(app)
      .get('/api/reports/tutors')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.statusCode).toBe(403);
  });

  it('should return all tutors report for valid role', async () => {
    // Create a test tutor in DB
    const tutor = await Tutor.create({ name: 'Test Tutor 2', role: 'tutor' });

    const res = await request(app)
      .get('/api/reports/tutors')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(r => r.name === tutor.name)).toBe(true);

    // Clean up
    await Tutor.findByIdAndDelete(tutor._id);
  });
});
