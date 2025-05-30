const { Student, RevokedToken } = require("../models/student");
const {
  signUpSchema,
  signInSchema,
  emailverifySchema,
  resetPasswordSchema,
  emailValidateSchema,
  tokenValidationSchema
} = require("../validators/authValidator");
const { doHash, doCompare, doHmac, compareHmac } = require("../utils/hashing");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../utils/sendMail");
const passport = require("../config/database/passport");
const LoginLog = require("../models/loginsLog");

const VERIFICATION_CODE_EXPIRY = 5 * 60 * 1000; // 5m
const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15m
const REFRESH_TOKEN_EXPIRY = 1 * 24 * 60 * 60 * 1000; // 1d
const SALT_VALUE = 12;

exports.signUp = async (req, res) => {
  // [Existing signUp logic remains unchanged]
  const { firstName, lastName, email, password } = req.body;
  try {
    await signUpSchema.validateAsync({ firstName, lastName, email, password });
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({
        status: "fail",
        message: "student already exist",
      });
    }
    const hashedPassword = await doHash(password, SALT_VALUE);
    const newStudent = await Student({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });
    const verificationCode = Math.floor(Math.random() * 1e6).toString();
    const info = await sendEmail(newStudent.email, verificationCode, "Account verification");
    if (!info) {
      return res.status(500).json({
        status: "error",
        message: "student registered successfully, failed to send verification code to email",
      });
    }
    const hashedVerificationCode = doHmac(verificationCode, process.env.CRYPTO_KEY);
    newStudent.verificationCode = hashedVerificationCode;
    newStudent.verificationCodeValidation = Date.now();
    await newStudent.save();
    return res.status(201).json({
      status: "success",
      message: "student registered successfully, please verify your email",
    });
  } catch (error) {
    const statusCode = error.details ? 400 : 500;
    const message = error.details ? error.details[0].message : "Something is wrong, we are working on it";
    return res.status(statusCode).json({ status: "fail", message });
  }
};

exports.signIn = async (req, res) => {
  // [Existing signIn logic remains unchanged]
  const { email, password } = req.body;
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;   
  const userAgent = req.get('User-Agent'); 
  try {
    await signInSchema.validateAsync({ email, password });
    const existingStudent = await Student.findOne({ email }).select("+password");
    if (!existingStudent) {
      return res.status(401).json({
        status: "fail",
        message: "Student not found",
      });
    }
    const correctPassword = await doCompare(password, existingStudent.password);
    if (!correctPassword) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid password",
      });
    }
    if (!existingStudent.verified) {
      return res.status(403).json({
        status: "fail",
        message: "account not verified",
      });
    }
    const accessToken = jwt.sign({ sub: existingStudent._id }, process.env.JWT_ACCESS_TOKEN, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign({ sub: existingStudent._id }, process.env.JWT_REFRESH_TOKEN, {
      expiresIn: "24h",
    });
    const hashedRefreshToken = doHmac(refreshToken, process.env.CRYPTO_KEY);
    existingStudent.refreshToken = hashedRefreshToken;
    await existingStudent.save();
    await LoginLog.create({
      userId: user._id, 
      ipAddress,
      device: parseDevice(userAgent),
      browser: parseBrowser(userAgent),
      status: loginSuccess ? 'success' : 'failure',
    });
    res.cookie("accessToken", accessToken, {
      maxAge: ACCESS_TOKEN_EXPIRY,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    res.cookie("refreshToken", refreshToken, {
      maxAge: REFRESH_TOKEN_EXPIRY,
      sameSite: "strict",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/refresh-token",
    });
    return res.status(200).json({
      status: "success",
      message: "Logged in",
      accessToken,
    });
  } catch (error) {
    const statusCode = error.details ? 400 : 500;
    const message = error.details ? error.details[0].message : "Something is wrong, we are fixing it";
    return res.status(statusCode).json({ status: "fail", message });
  }
};

exports.signOut = async (req, res) => {
   const { refreshToken } = req.body || req.cookie;
   try {
      await tokenValidationSchema.validateAsync({refreshToken})
      // verify jwt
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN);
      const student = await Student.findById(decoded.sub).select("+refreshToken");
      const hashedRefreshToken = doHmac(refreshToken, process.env.CRYPTO_KEY);
      if (student && student.refreshToken === hashedRefreshToken) {
         await RevokedToken.create({
            token: hashedRefreshToken,
            studentId: student._id,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY),
         });
         // Nullify student refresh token in the DB
         student.refreshToken = null;
         await student.save();
      }
      // clear cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken", { path: "/refresh-token" });
   } catch (error) {
      console.error(`error:${error.message}`);
      return res.status(500).json({
         status: "fail",
         message: "something is wrong",
      });
   }
};

exports.deleteAccount = async (req, res) => {
   const { id } = req.params;

   try {
      const deletedStudent = await Student.findByIdAndDelete(id);

      if (!deletedStudent) {
         return res.status(405).json({
            status: "fail",
            message: "Student not found",
         });
      }

      return res.status(200).json({
         status: "success",
         message: "Student account deleted successfully",
      });
   } catch (error) {
      const statusCode = error.details ? 400 : 500; // 400 for validation, 500 for server errors
      const message = error.details ? error.details[0].message : error.message;
      return res.status(statusCode).json({ status: "fail", message });
   }
};

exports.verifyEmail = async (req, res) => {
   const { email, code } = req.body;

   try {
      await emailverifySchema.validateAsync({ email, code });

      // fetch student to see if student exist
      const student = await Student.findOne({ email }).select(
         "+verificationCode +verificationCodeValidation"
      );
      if (!student) {
         return res.status(404).json({
            status: "fail",
            message: "student not found",
         });
      }

      // check if student is already verified
      if (student.verified) {
         return res.status(409).json({
            status: "fail",
            message: "account already verified",
         });
      }

      // check and compare code to verify
      const isCodeValid = compareHmac(code, process.env.CRYPTO_KEY, student.verificationCode);
      if (!isCodeValid) {
         return res.status(400).json({
            status: "fail",
            message: "Invalid verification code",
         });
      }
      // check if reset password code is expired (valid for 5mins)
      if (Date.now() - student.verificationCodeValidation > VERIFICATION_CODE_EXPIRY) {
         return res.status(400).json({
            status: "fail",
            message: "verification code expired",
         });
      }

      //   mark student as verified
      student.verified = true;
      student.verificationCode = undefined;
      student.verificationCodeValidation = undefined;
      await student.save();

      return res.status(200).json({
         status: "success",
         message: "Email verified successfully",
      });
   } catch (error) {
      const statusCode = error.details ? 400 : 500; // 400 for validation, 500 for server errors
      const message = error.details
         ? error.details[0].message
         : "Something is wrong, we are working on it";
      return res.status(statusCode).json({ status: "fail", message });
   }
};

exports.forgotPassword = async (req, res) => {
   const { email } = req.body;
   try {
      await emailValidateSchema.validateAsync({ email });

      // check if student exist
      const student = await Student.findOne({ email }).select(
         "+forgotPasswordCode +forgotPasswordCodeValidation"
      );
      if (!student) {
         return res.status(404).json({
            status: "fail",
            message: "student not found",
         });
      }

      // check if student account is already verified
      if (!student.verified) {
         return res.status(409).json({
            status: "fail",
            message: "account not yet verifed",
         });
      }

      // generate password reset code and send email
      const resetPasswordCode = Math.floor(Math.random() * 1e6).toString();
      const info = await sendEmail(email, resetPasswordCode, "Password Reset");
      if (!info) {
         return res.status(500).json({
            status: "fail",
            message: "server fail to send email, we are working on it",
         });
      }

      // hash the reset the password code
      const hashedPasswordCode = doHmac(resetPasswordCode, process.env.CRYPTO_KEY);

      // store and save the hashed password reset code
      student.forgotPasswordCode = hashedPasswordCode;
      student.forgotPasswordCodeValidation = Date.now();
      await student.save();
      console.log(student);

      return res.status(200).json({
         status: "success",
         message: "email sent successfully with password reset code",
      });
   } catch (error) {
      const statusCode = error.details ? 400 : 500; // 400 for validation, 500 for server errors
      const message = error.details
         ? error.details[0].message
         : "Something is wrong, we are working on it";
      return res.status(statusCode).json({ status: "fail", message });
   }
};

exports.resetPassword = async (req, res) => {
   const { email, password, code } = req.body;

   try {
      // input validation
      await resetPasswordSchema.validateAsync({ email, password, code });

      // check if student exist
      const student = await Student.findOne({ email }).select(
         "+forgotPasswordCode +password +forgotPasswordCodeValidation"
      );
      console.log(`student:${student}`);
      if (!student) {
         return res.status(404).json({
            status: "fail",
            message: "student not found",
         });
      }

      // check if student account is verified
      if (!student.verified) {
         console.log(`email:${student.email}, verified:${student.verified}`);
         return res.status(409).json({
            status: "fail",
            message: "account not yet verified",
         });
      }

      // check if reset password code is valid
      const isValidCode = compareHmac(code, process.env.CRYPTO_KEY, student.forgotPasswordCode);
      if (!isValidCode) {
         return res.status(409).json({
            status: "fail",
            message: "password reset code is invalid",
         });
      }

      // check if reset password code is expired (valid for 5mins)
      const expireTime = 5 * 60 * 1000; //5mins in milliseconds
      if (Date.now() - student.forgotPasswordCodeValidation > expireTime) {
         return res.status(400).json({
            status: "fail",
            message: "password reset code has expired",
         });
      }

      // hash the new password and update and save student
      const hashedPassword = await doHash(password, 12);
      student.password = hashedPassword;
      student.forgotPasswordCode = undefined;
      student.forgotPasswordCodeValidation = undefined;
      await student.save();

      return res.status(200).json({
         status: "success",
         message: "password updated successfully",
      });
   } catch (error) {
      const statusCode = error.details ? 400 : 500; // 400 for validation, 500 for server errors
      const message = error.details ? error.details[0].message : error.message;
      return res.status(statusCode).json({ status: "fail", message });
   }
};

exports.refreshToken = async (req, res) => {
   const { refreshToken } = req.body || req.cookie.refreshToken;
   if (!refreshToken) {
      return res.status(401).json({
         status: "fail",
         message: "refresh token not provided",
      });
   }
   try {
      await tokenValidationSchema.validateAsync({refreshToken})
      // verify jwt and check for complete jwt token
      try {
         var decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN);
      } catch (error) {
         if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({
               status: 'fail',
               message: 'Invalid or incomplete refresh token'
            })
         }
      }
      const student = await Student.findById(decoded.sub).select("+refreshToken");
      if (!student || !student.refreshToken) {
         return res.status(401).json({
            status: "fail",
            message: "invalid or expired refresh token",
         });
      }
      // check if token is revoked
      const hashedRefreshToken = doHmac(refreshToken, process.env.CRYPTO_KEY);
      const isRevoked = await RevokedToken.findOne({
         token: hashedRefreshToken,
         studentId: student._id,
      });
      if (isRevoked) {
         return res.status(401).json({
            status: "fail",
            message: "refresh token revoked",
         });
      }
      // verify active token matches
      if (hashedRefreshToken !== student.refreshToken) {
         return res.status(401).json({
            status: "fail",
            message: "invalid or tampered refresh token",
         });
      }
      // generate new access and refresh token
      const newAccessToken = jwt.sign({ sub: student._id }, process.env.JWT_ACCESS_TOKEN, {
         expiresIn: "24h",
      });
      const newRefreshToken = jwt.sign({ sub: student._id }, process.env.JWT_REFRESH_TOKEN, {
         expiresIn: "24h",
      });
      // Blacklist old refresh token
      await RevokedToken.create({
         token: hashedRefreshToken,
         studentId: student._id,
         expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY),
      });
      // update active token
      const hashedNewRefreshToken = doHmac(newRefreshToken, process.env.CRYPTO_KEY);
      student.refreshToken = hashedNewRefreshToken;
      await student.save();
      // set cookies
      res.cookie("accessToken", newAccessToken, {
         maxAge: ACCESS_TOKEN_EXPIRY,
         httpOnly: true,
         sameSite: "lax",
         secure: process.env.NODE_ENV === "production",
      });
      res.cookie("refreshToken", newRefreshToken, {
         maxAge: REFRESH_TOKEN_EXPIRY,
         httpOnly: true,
         sameSite: "strict",
         secure: process.env.NODE_ENV === "production",
         path: "/refresh-token",
      });
      return res.status(200).json({
         status: "success",
         message: "token refreshed successfully",
      });
   } catch (error) {
      const statusCode = error.details ? 400 : 500; // 400 for validation, 500 for server errors
      const message = error.details
         ? error.details[0].message
         : "Something is wrong, we are working on it";
      return res.status(statusCode).json({ status: "fail", message });
   }
};

exports.resendVerificationCode = async (req, res) => {
   const { email } = req.body;
   try {
      await emailValidateSchema.validateAsync({ email });
      // find student
      const student = await Student.findOne({ email }).select(
         "+verificationCode +verificationCodeValidation"
      );
      if (!student) {
         return res.status(401).json({
            status: "fail",
            message: "Student not found",
         });
      }
      // check if student is verified
      if (student.verified) {
         return res.status(401).json({
            status: "fail",
            message: "account already verified",
         });
      }
      // generate verfication code
      const verificationCode = Math.floor(Math.random() * 1e6).toString();
      // send verification to student email
      const info = await sendEmail(student.email, verificationCode, "Account verification");
      if (!info) {
         return res.status(500).json({
            status: "error",
            message: "student registered successfully, failed to send verification code to email",
         });
      }
      // hash the verification code using Hmac
      const hashedVerificationCode = doHmac(verificationCode, process.env.CRYPTO_KEY);
      // Save the hashed verification code and timestamp to the student
      student.verificationCode = hashedVerificationCode;
      student.verificationCodeValidation = Date.now();
      await student.save();
      // return response back to client
      return res.status(201).json({
         status: "success",
         message: "Verification sent to email",
      });
   } catch (error) {
      const statusCode = error.details ? 400 : 500; // 400 for validation, 500 for server errors
      const message = error.details
         ? error.details[0].message
         : "Something is wrong, we are working on it";
      return res.status(statusCode).json({ status: "fail", message });
   }
};

exports.googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

exports.googleCallback = [
   passport.authenticate('google', { failureRedirect: '/login' }),
   async (req, res) => {
     try {
       const student = req.user;
       if (!student) {
         return res.status(401).json({ status: "fail", message: "Authentication failed" });
       }
 
       // Generate JWT tokens
       const accessToken = jwt.sign({ sub: student._id }, process.env.JWT_ACCESS_TOKEN, {
         expiresIn: "15m",
       });
       const refreshToken = jwt.sign({ sub: student._id }, process.env.JWT_REFRESH_TOKEN, {
         expiresIn: "24h",
       });
       const hashedRefreshToken = doHmac(refreshToken, process.env.CRYPTO_KEY);
       student.refreshToken = hashedRefreshToken;
       await student.save();
 
       // Set cookies
       res.cookie("accessToken", accessToken, {
         maxAge: ACCESS_TOKEN_EXPIRY,
         sameSite: "lax",
         httpOnly: true,
         secure: process.env.NODE_ENV === "production",
       });
       res.cookie("refreshToken", refreshToken, {
         maxAge: REFRESH_TOKEN_EXPIRY,
         sameSite: "strict",
         httpOnly: true,
         secure: process.env.NODE_ENV === "production",
         path: "/refresh-token",
       });
 
       return res.status(200).json({
         status: "success",
         message: "Logged in via Google",
         accessToken,
       });
     } catch (error) {
       console.error(error);
       return res.status(500).json({ status: "fail", message: "Something went wrong during Google authentication" });
     }
   }
 ];
