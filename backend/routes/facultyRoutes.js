const express = require('express');
const router = express.Router();
const { protect, faculty } = require('../middleware/authMiddleware');
const {
    getAssignedCourses,
    createAssessment,
    enterMarks,
    getCourseAnalytics,
    getCourseAssessments,
    getAssessment,
    getAssessmentResults,
    updateAssessment,
    deleteAssessment,
    createCourseCLO,
    removeCourseCLO
} = require('../controllers/facultyController');

router.get('/courses', protect, faculty, getAssignedCourses);
router.post('/assessments', protect, faculty, createAssessment);
router.get('/assessments/:id/results', protect, faculty, getAssessmentResults);
router.put('/assessments/:id', protect, faculty, updateAssessment);
router.delete('/assessments/:id', protect, faculty, deleteAssessment);
router.post('/marks', protect, faculty, enterMarks);
router.get('/courses/:courseId/assessments', protect, faculty, getCourseAssessments);
router.get('/assessments/:id', protect, faculty, getAssessment);
router.get('/analytics/:courseId', protect, faculty, getCourseAnalytics);
router.post('/courses/:courseId/clos', protect, faculty, createCourseCLO);
router.delete('/courses/:courseId/clos/:cloId', protect, faculty, removeCourseCLO);

module.exports = router;
