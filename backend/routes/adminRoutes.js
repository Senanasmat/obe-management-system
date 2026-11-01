const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, admin } = require('../middleware/authMiddleware');
const {
    createPLO, getPLOs, deletePLO, updatePLO, bulkImportPLOs,
    createCLO, getCLOs, deleteCLO, updateCLO, bulkImportCLOs,
    createCourse, getCourses, assignFaculty, enrollStudents, bulkImportCourses,
    createStudent, getStudents, updateStudent, deleteStudent,
    bulkImportStudents,
    getDashboardStats,
    getBatchPLOAchievements,
    getFaculty, createFacultyMember, updateFacultyMember, deleteFacultyMember, bulkImportFaculty,
    deleteCourse, updateCourse,
    getActivityLogs
} = require('../controllers/adminController');

// Multer: store file in memory for CSV parsing
const upload = multer({ storage: multer.memoryStorage() });

router.post('/plos', protect, admin, createPLO);
router.post('/plos/bulk-import', protect, admin, upload.single('file'), bulkImportPLOs);
router.get('/plos', protect, getPLOs);
router.put('/plos/:id', protect, admin, updatePLO);
router.delete('/plos/:id', protect, admin, deletePLO);

router.route('/clos').post(protect, admin, createCLO).get(protect, admin, getCLOs);
router.post('/clos/bulk-import', protect, admin, upload.single('file'), bulkImportCLOs);
router.put('/clos/:id', protect, admin, updateCLO);
router.delete('/clos/:id', protect, admin, deleteCLO);

router.route('/courses').post(protect, admin, createCourse).get(protect, admin, getCourses);
router.post('/courses/bulk-import', protect, admin, upload.single('file'), bulkImportCourses);
router.post('/courses/assign-faculty', protect, admin, assignFaculty);
router.put('/courses/:id', protect, admin, updateCourse);
router.delete('/courses/:id', protect, admin, deleteCourse);
router.put('/courses/:id/enroll', protect, enrollStudents);

router.route('/students').post(protect, admin, createStudent).get(protect, getStudents);
router.post('/students/bulk-import', protect, admin, upload.single('file'), bulkImportStudents);
router.put('/students/:id', protect, admin, updateStudent);
router.delete('/students/:id', protect, admin, deleteStudent);

// Faculty management endpoints (renamed to /staff to avoid routing issues)
router.route('/staff').get(protect, admin, getFaculty).post(protect, admin, createFacultyMember);
router.post('/staff/bulk-import', protect, admin, upload.single('file'), bulkImportFaculty);
router.put('/staff/:id', protect, admin, updateFacultyMember);
router.delete('/staff/:id', protect, admin, deleteFacultyMember);

router.get('/stats', protect, admin, getDashboardStats);
router.get('/stats/plo-achievements', protect, admin, getBatchPLOAchievements);

router.get('/activity-logs', protect, admin, getActivityLogs);

module.exports = router;
