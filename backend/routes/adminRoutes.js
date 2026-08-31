const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, admin } = require('../middleware/authMiddleware');
const {
    createPLO, getPLOs, deletePLO, updatePLO,
    createCLO, getCLOs, deleteCLO, updateCLO,
    createCourse, getCourses, assignFaculty, enrollStudents,
    createStudent, getStudents, updateStudent, deleteStudent,
    bulkImportStudents,
    getDashboardStats,
    getFaculty, createFacultyMember, updateFacultyMember, deleteFacultyMember,
    deleteCourse, updateCourse
} = require('../controllers/adminController');

// Multer: store file in memory for CSV parsing
const upload = multer({ storage: multer.memoryStorage() });

router.route('/plos').post(protect, admin, createPLO).get(protect, admin, getPLOs);
router.put('/plos/:id', protect, admin, updatePLO);
router.delete('/plos/:id', protect, admin, deletePLO);

router.route('/clos').post(protect, admin, createCLO).get(protect, admin, getCLOs);
router.put('/clos/:id', protect, admin, updateCLO);
router.delete('/clos/:id', protect, admin, deleteCLO);

router.route('/courses').post(protect, admin, createCourse).get(protect, admin, getCourses);
router.post('/courses/assign-faculty', protect, admin, assignFaculty);
router.put('/courses/:id', protect, admin, updateCourse);
router.delete('/courses/:id', protect, admin, deleteCourse);
router.put('/courses/:id/enroll', protect, admin, enrollStudents);

router.route('/students').post(protect, admin, createStudent).get(protect, admin, getStudents);
router.post('/students/bulk-import', protect, admin, upload.single('file'), bulkImportStudents);
router.put('/students/:id', protect, admin, updateStudent);
router.delete('/students/:id', protect, admin, deleteStudent);

// Faculty management endpoints (renamed to /staff to avoid routing issues)
router.route('/staff').get(protect, admin, getFaculty).post(protect, admin, createFacultyMember);
router.put('/staff/:id', protect, admin, updateFacultyMember);
router.delete('/staff/:id', protect, admin, deleteFacultyMember);

router.get('/stats', protect, admin, getDashboardStats);

module.exports = router;
