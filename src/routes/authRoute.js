const express = require("express");
const auth = require('./../middleware/auth')
const {
    signUp,
    signIn,
    deleteAccount,
    verifyEmail,
    forgotPassword,
    resetPassword,
    refreshToken,
    resendVerificationCode
} = require("./../controllers/authController");

const { 
  authRateLimitMiddleware 
} = require('../middlewares/rateLimitMiddleware');

const studentRoute = new express.Router();

studentRoute.post("/create", signUp);
studentRoute.post("/login", signIn);
studentRoute.post("/resend-verification-code", resendVerificationCode);
studentRoute.post("/verify-email", verifyEmail);
studentRoute.post("/refresh-token", auth, refreshToken);
studentRoute.post("/forgot-password", forgotPassword);
studentRoute.post("/reset-password", resetPassword);
studentRoute.delete("/delete/:id", deleteAccount);
router.post('/login', authRateLimitMiddleware, authController.login);
router.post('/register', authRateLimitMiddleware, authController.register);

module.exports = studentRoute;
