const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    createPLO, getPLOs, deletePLO,
    createCLO, getCLOs, deleteCLO,
    createCourse, getCourses, assignFaculty,
    createStudent, getStudents, getDashboardStats
} = require('../controllers/adminController');

router.route('/plos').post(protect, admin, createPLO).get(protect, admin, getPLOs);
router.route('/plos/:id').delete(protect, admin, deletePLO);

router.route('/clos').post(protect, admin, createCLO).get(protect, admin, getCLOs);
router.route('/clos/:id').delete(protect, admin, deleteCLO);

router.route('/courses').post(protect, admin, createCourse).get(protect, admin, getCourses);
router.route('/courses/assign-faculty').post(protect, admin, assignFaculty);

router.route('/students').post(protect, admin, createStudent).get(protect, admin, getStudents);

router.get('/stats', protect, admin, getDashboardStats);

module.exports = router;
