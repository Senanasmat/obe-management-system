const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, admin } = require('../middleware/authMiddleware');
const {
    createPLO, getPLOs, deletePLO, updatePLO,
    createCLO, getCLOs, deleteCLO, updateCLO,
    createCourse, getCourses, assignFaculty,
    createStudent, getStudents, updateStudent, deleteStudent,
    bulkImportStudents,
    getDashboardStats,
    getFaculty, createFacultyMember, updateFacultyMember, deleteFacultyMember,
    deleteCourse, updateCourse
} = require('../controllers/adminController');

// Multer: store file in memory for CSV parsing
const upload = multer({ storage: multer.memoryStorage() });

router.route('/plos').post(protect, admin, createPLO).get(protect, admin, getPLOs);
router.route('/plos/:id').put(protect, admin, updatePLO).delete(protect, admin, deletePLO);

router.route('/clos').post(protect, admin, createCLO).get(protect, admin, getCLOs);
router.route('/clos/:id').put(protect, admin, updateCLO).delete(protect, admin, deleteCLO);

router.route('/courses').post(protect, admin, createCourse).get(protect, admin, getCourses);
router.route('/courses/assign-faculty').post(protect, admin, assignFaculty);
router.route('/courses/:id').put(protect, admin, updateCourse).delete(protect, admin, deleteCourse);

router.route('/students').post(protect, admin, createStudent).get(protect, admin, getStudents);
router.post('/students/bulk-import', protect, admin, upload.single('file'), bulkImportStudents);
router.route('/students/:id').put(protect, admin, updateStudent).delete(protect, admin, deleteStudent);

router.route('/faculty').get(protect, admin, getFaculty).post(protect, admin, createFacultyMember);
router.route('/faculty/:id').put(protect, admin, updateFacultyMember).delete(protect, admin, deleteFacultyMember);

router.get('/stats', protect, admin, getDashboardStats);

module.exports = router;
