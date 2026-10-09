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
    getCourseAwardList,
    getStudentCLOAnalytics,
    generateDMC,
    generateMarksTemplate,
    importMarksFromExcel
} = require('../controllers/facultyController');

// Courses and PLOs
router.get('/courses', protect, faculty, getAssignedCourses);
router.get('/plos', protect, faculty, getPLOsForFaculty);
router.get('/students', protect, faculty, getAllStudents);

// Assessments
router.post('/assessments', protect, faculty, createAssessment);
router.get('/assessments/:id/results', protect, faculty, getAssessmentResults);
router.put('/assessments/:id', protect, faculty, updateAssessment);
router.delete('/assessments/:id', protect, faculty, deleteAssessment);
router.get('/assessments/:id', protect, faculty, getAssessment);
router.get('/courses/:courseId/assessments', protect, faculty, getCourseAssessments);

// Marks
router.post('/marks', protect, faculty, enterMarks);
router.get('/courses/:courseId/marks/template', protect, faculty, generateMarksTemplate);

router.post('/courses/:courseId/marks/import', protect, faculty, (req, res, next) => {
    const multer = require('multer');
    const upload = multer({ storage: multer.memoryStorage() });

    upload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        importMarksFromExcel(req, res);
    });
});

// Analytics and grades
router.get('/analytics/:courseId', protect, faculty, getCourseAnalytics);
router.get('/courses/:courseId/grades', protect, faculty, getStudentGrades);
router.get('/courses/:courseId/award-list', protect, faculty, getCourseAwardList);
router.get(
    '/courses/:courseId/students/:studentId/clo-analytics',
    protect,
    faculty,
    getStudentCLOAnalytics
);

// DMC
router.post('/students/dmc', protect, faculty, generateDMC);

// Course CLOs
router.post('/courses/:courseId/clos', protect, faculty, createCourseCLO);
router.put('/courses/:courseId/clos/:cloId', protect, faculty, updateCourseCLO);
router.delete('/courses/:courseId/clos/:cloId', protect, faculty, removeCourseCLO);

module.exports = router;