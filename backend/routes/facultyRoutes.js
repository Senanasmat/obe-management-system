const express = require('express');
const router = express.Router();
const { protect, faculty } = require('../middleware/authMiddleware');
const {
    getAssignedCourses,
    getPLOsForFaculty,
    createAssessment,
    enterMarks,
    getCourseAnalytics,
    getCourseAssessments,
    getAssessment,
    getAssessmentResults,
    updateAssessment,
    deleteAssessment,
    createCourseCLO,
    updateCourseCLO,
    removeCourseCLO,
    getAllStudents,
    getStudentGrades,
    generateDMC,
    generateMarksTemplate,
    importMarksFromExcel
} = require('../controllers/facultyController');

router.get('/courses', protect, faculty, getAssignedCourses);
router.get('/plos', protect, faculty, getPLOsForFaculty);
router.get('/students', protect, faculty, getAllStudents);
router.post('/assessments', protect, faculty, createAssessment);
router.get('/assessments/:id/results', protect, faculty, getAssessmentResults);
router.put('/assessments/:id', protect, faculty, updateAssessment);
router.delete('/assessments/:id', protect, faculty, deleteAssessment);
router.post('/marks', protect, faculty, enterMarks);
router.get('/courses/:courseId/assessments', protect, faculty, getCourseAssessments);
router.get('/assessments/:id', protect, faculty, getAssessment);
router.get('/analytics/:courseId', protect, faculty, getCourseAnalytics);
router.get('/courses/:courseId/grades', protect, faculty, getStudentGrades);
router.post('/students/dmc', protect, faculty, generateDMC);
router.post('/courses/:courseId/clos', protect, faculty, createCourseCLO);
router.put('/courses/:courseId/clos/:cloId', protect, faculty, updateCourseCLO);
router.delete('/courses/:courseId/clos/:cloId', protect, faculty, removeCourseCLO);
router.get('/courses/:courseId/marks/template', protect, faculty, generateMarksTemplate);
router.post('/courses/:courseId/marks/import', protect, faculty, (req, res, next) => {
    const multer = require('multer');
    const upload = multer({ storage: multer.memoryStorage() });
    upload.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        importMarksFromExcel(req, res);
    });
});

module.exports = router;
