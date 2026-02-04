const express = require('express');
const router = express.Router();
const { protect, faculty } = require('../middleware/authMiddleware');
const {
    getAssignedCourses,
    createAssessment,
    enterMarks,
    getCourseAnalytics,
    getCourseAssessments
} = require('../controllers/facultyController');

router.get('/courses', protect, faculty, getAssignedCourses);
router.post('/assessments', protect, faculty, createAssessment);
router.post('/marks', protect, faculty, enterMarks);
router.get('/courses/:courseId/assessments', protect, faculty, getCourseAssessments);
router.get('/analytics/:courseId', protect, faculty, getCourseAnalytics);

module.exports = router;
