const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// Mock models and utility function correctly
jest.mock('../../models/student');
jest.mock('../../models/course');
// Explicitly mock createStudent as a jest.fn
jest.mock('../../utils/createStudent', () => jest.fn());

const Student = require('../../models/student');
const Course = require('../../models/course');
const createStudent = require('../../utils/createStudent');

const cartController = require('../../controllers/studentCartController');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  req.user = { _id: 'user12345678901234567890', email: 'test@example.com' };
  next();
});

app.get('/cart', cartController.getCartItems);
app.post('/cart/:courseId', cartController.addCartItem);
app.put('/cart', cartController.updateCartItem);
app.delete('/cart/:courseId', cartController.deleteCartItem);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Cart Controller', () => {
  const userId = 'user12345678901234567890';
  const validCourseId1 = new mongoose.Types.ObjectId().toString();
  const validCourseId2 = new mongoose.Types.ObjectId().toString();
  
  describe('getCartItems', () => {
    it('returns cart if student found', async () => {
      Student.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ cart: [{ _id: validCourseId1 }] }),
      });
      
      const res = await request(app).get('/cart');
      expect(res.status).toBe(200);
      expect(res.body.cart).toHaveLength(1);
    });
    
    it('creates student and returns empty cart if not found', async () => {
      Student.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });
      createStudent.mockResolvedValue({ _id: userId, cart: [] });
      
      const res = await request(app).get('/cart');
      expect(createStudent).toHaveBeenCalledWith(userId, 'test@example.com');
      expect(res.status).toBe(200);
      expect(res.body.cart).toEqual([]);
      expect(res.body.message).toBe('Cart is empty');
    });
  });
  
  
  describe('addCartItem', () => {
    // Mock middleware to inject req.user with _id and email for all tests in this suite
    beforeAll(() => {
      app.use((req, res, next) => {
        req.user = { _id: userId, email: 'test@example.com' };
        next();
      });
    });
    
    it('adds a valid course to the cart', async () => {
      Course.findById.mockResolvedValue({ _id: validCourseId1 });
      Student.findById.mockResolvedValue({ _id: userId });
      Student.updateOne.mockResolvedValue({ acknowledged: true });
      Student.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ cart: [{ _id: validCourseId1 }] }),
      });
      
      const res = await request(app).post(`/cart/${validCourseId1}`);
      expect(res.status).toBe(201);
      expect(res.body.cart).toHaveLength(1);
    });
    
    it('returns 400 for invalid course ID', async () => {
      const res = await request(app).post('/cart/invalid-id');
      expect(res.status).toBe(400);
    });
    
    it('returns 404 if course not found', async () => {
      Course.findById.mockResolvedValue(null);
      const res = await request(app).post(`/cart/${validCourseId1}`);
      expect(res.status).toBe(404);
    });
    
    it('creates student if not found and adds course', async () => {
      Course.findById.mockResolvedValue({ _id: validCourseId1 });
      Student.findById.mockResolvedValue(null);
      createStudent.mockResolvedValue({ _id: userId });
      Student.updateOne.mockResolvedValue({ acknowledged: true });
      Student.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ cart: [{ _id: validCourseId1 }] }),
      });
      
      const res = await request(app).post(`/cart/${validCourseId1}`);
      expect(createStudent).toHaveBeenCalledWith(userId, 'test@example.com');
      expect(res.status).toBe(201);
      expect(res.body.cart).toHaveLength(1);
    });
  });
  
  
  describe('updateCartItem', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
      
      // Mock Course.find to always return a chainable object with select()
      Course.find = jest.fn(() => ({
        select: jest.fn().mockResolvedValue(courseIds.map(id => ({ _id: id }))),
      }));
      
      // Mock Student methods consistently
      Student.findById = jest.fn(() => ({
        populate: jest.fn().mockResolvedValue({ cart: courseIds.map(id => ({ _id: id })) }),
      }));
      Student.updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
    });
    
    it('adds multiple courses to the cart', async () => {
      const res = await request(app)
        .put('/cart')
        .send({ courseIds, action: 'add' });
      
      expect(res.status).toBe(200);
      expect(res.body.cart).toHaveLength(courseIds.length);
    });
    
    it('removes multiple courses from the cart', async () => {
      // Override populate to return empty cart after removal
      Student.findById = jest.fn(() => ({
        populate: jest.fn().mockResolvedValue({ cart: [] }),
      }));
      
      const res = await request(app)
        .put('/cart')
        .send({ courseIds, action: 'remove' });
      
      expect(res.status).toBe(200);
      expect(res.body.cart).toHaveLength(0);
    });
    
    it('returns 400 for invalid input', async () => {
      const res = await request(app).put('/cart').send({ courseIds: 'not-an-array', action: 'add' });
      expect(res.status).toBe(400);
    });
  });
  
  
  describe('deleteCartItem', () => {
    it('removes a course from the cart', async () => {
      Student.findById.mockResolvedValue({ _id: userId });
      Student.updateOne.mockResolvedValue({ acknowledged: true });
      Student.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ cart: [] }),
      });
      
      const res = await request(app).delete(`/cart/${validCourseId1}`);
      
      expect(res.status).toBe(200);
      expect(res.body.cart).toHaveLength(0);
    });
    
    it('returns 400 for invalid course ID', async () => {
      const res = await request(app).delete('/cart/invalid-id');
      expect(res.status).toBe(400);
    });
    
    it('returns 404 if student not found', async () => {
      Student.findById.mockResolvedValue(null);
      
      const res = await request(app).delete(`/cart/${validCourseId1}`);
      
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Student not found');
    });
  });
});
