// src/config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Student } = require('../../models/student');
require('dotenv').config();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL || 'http://localhost:3000/student/google-auth/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let student = await Student.findOne({ googleId: profile.id });
    if (!student) {
      // Create new student if not exists
      student = await Student.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: `${profile.name.givenName} ${profile.name.familyName}`,
        verified: true, // Google accounts are pre-verified
      });
    } else if (!student.verified) {
      // Update verification status if not verified
      student.verified = true;
      await student.save();
    }
    return done(null, student);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((student, done) => done(null, student._id));
passport.deserializeUser(async (id, done) => {
  const student = await Student.findById(id);
  done(null, student);
});

module.exports = passport;