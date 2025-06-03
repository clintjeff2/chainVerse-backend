const express = require('express');
const router = express.Router();
const { isAuthenticated, hasRole } = require('../middleware/auth');
const StudentModel = require('../models/Student');
const CourseModel = require('../models/course');
const CertificateModel = require('../models/Certificate');
const StudyGroupModel = require('../models/StudyGroup');

/**
 * @route GET /reports/student/:studentId
 * @desc Get detailed report for a single student
 * @access Private (Admin, Academic Advisors)
 */
router.get(
  '/student/:studentId',
  isAuthenticated,
  hasRole(['admin', 'academic_advisor']),
  async (req, res) => {
    try {
      const { studentId } = req.params;
      
      // Fetch student data
      const student = await StudentModel.findById(studentId)
        .select('name email enrolledCourses completedCourses financialAid')
        .lean();
      
      if (!student) {
        return res.status(404).json({ 
          success: false, 
          message: 'Student not found' 
        });
      }

      // Fetch certificates
      const certificates = await CertificateModel.find({ 
        studentId: studentId 
      }).lean();
      
      // Calculate average score across quizzes
      const completedCourseIds = student.completedCourses || [];
      const courseDetails = await CourseModel.find({
        _id: { $in: [...student.enrolledCourses, ...completedCourseIds] }
      }).lean();
      
      // Get quizzes performance (assuming we have a QuizResult model or embedded data)
      const quizScores = [];
      courseDetails.forEach(course => {
        if (course.quizResults && course.quizResults[studentId]) {
          quizScores.push(...Object.values(course.quizResults[studentId]));
        }
      });
      
      const averageScore = quizScores.length 
        ? quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length 
        : 0;
      
      const studyGroups = await StudyGroupModel.find({
        members: studentId
      }).select('name courseId').lean();

      const studentReport = {
        studentInfo: {
          id: studentId,
          name: student.name,
          email: student.email
        },
        academicProgress: {
          enrolledCourses: student.enrolledCourses.length,
          completedCourses: student.completedCourses.length,
          enrolledCourseDetails: courseDetails
            .filter(course => student.enrolledCourses.includes(course._id.toString()))
            .map(course => ({
              id: course._id,
              title: course.title,
              progress: course.studentProgress?.[studentId] || 0
            })),
          completedCourseDetails: courseDetails
            .filter(course => student.completedCourses.includes(course._id.toString()))
            .map(course => ({
              id: course._id,
              title: course.title,
              completionDate: course.completionDates?.[studentId] || null
            }))
        },
        performance: {
          averageScore,
          certificates: certificates.map(cert => ({
            id: cert._id,
            courseId: cert.courseId,
            courseName: cert.courseName,
            issueDate: cert.issueDate,
            shared: cert.shared || false
          }))
        },
        engagement: {
          studyGroups: studyGroups.map(group => ({
            id: group._id,
            name: group.name,
            courseId: group.courseId
          }))
        },
        support: {
          financialAid: student.financialAid || {
            status: 'none',
            details: null
          }
        }
      };

      res.json({
        success: true,
        data: studentReport
      });
    } catch (error) {
      console.error('Error generating student report:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while generating student report',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route GET /reports/students
 * @desc Get batch reports for students with filters
 * @access Private (Admin, Academic Advisors)
 */
router.get(
  '/students',
  isAuthenticated,
  hasRole(['admin', 'academic_advisor']),
  async (req, res) => {
    try {
      const { 
        courseId, 
        completionStatus, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 20 
      } = req.query;
      
      let query = {};
      
      if (courseId) {
        query.$or = [
          { enrolledCourses: courseId },
          { completedCourses: courseId }
        ];
      }
      
      if (completionStatus === 'completed' && courseId) {
        query = { completedCourses: courseId };
      } else if (completionStatus === 'enrolled' && courseId) {
        query = { 
          enrolledCourses: courseId,
          completedCourses: { $ne: courseId }
        };
      } else if (completionStatus === 'completed') {
        query = { completedCourses: { $exists: true, $ne: [] } };
      }
      
      if (startDate || endDate) {
      }
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const students = await StudentModel.find(query)
        .select('name email enrolledCourses completedCourses financialAid')
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
      
      const totalStudents = await StudentModel.countDocuments(query);
      
      const studentReports = await Promise.all(students.map(async (student) => {
        const certificatesCount = await CertificateModel.countDocuments({
          studentId: student._id
        });
        
        const studyGroupsCount = await StudyGroupModel.countDocuments({
          members: student._id
        });
        
        const averageScore = 0;
        
        return {
          id: student._id,
          name: student.name,
          email: student.email,
          summary: {
            enrolledCourses: student.enrolledCourses.length,
            completedCourses: student.completedCourses.length,
            certificatesEarned: certificatesCount,
            averageScore,
            studyGroupParticipation: studyGroupsCount,
            financialAidStatus: student.financialAid ? student.financialAid.status : 'none'
          }
        };
      }));
      
      res.json({
        success: true,
        pagination: {
          total: totalStudents,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalStudents / parseInt(limit))
        },
        data: studentReports
      });
      
    } catch (error) {
      console.error('Error generating batch student reports:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while generating batch student reports',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;