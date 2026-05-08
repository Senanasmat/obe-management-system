const express = require('express');
const router = express.Router();

const { protect, admin } = require('../middleware/authMiddleware');

const {
    createAssignment,
    getAssignments,
    updateAssignment,
    deleteAssignment
} = require('../controllers/courseAssignmentController');

// ADMIN ONLY
router.route('/')
    .post(protect, admin, createAssignment)
    .get(protect, admin, getAssignments);

// Lightweight summary for dashboard (no nested populate — just ID counts)
router.get('/my/summary', protect, async (req, res) => {
    try {
        const CourseAssignment = require('../models/courseAssignmentModel');
        const assignments = await CourseAssignment.find({ faculty: req.user._id })
            .populate('course', 'name code students clos')
            .populate('faculty', 'name department')
            .lean();

        const result = assignments.map(a => ({
            _id: a._id,
            semester: a.semester,
            faculty: a.faculty,
            course: {
                _id: a.course._id,
                name: a.course.name,
                code: a.course.code,
                studentsCount: a.course.students?.length || 0,
                closCount: a.course.clos?.length || 0,
            }
        }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// faculty view their assigned courses (full populate — used by CourseView, MarksEntry, AssessmentCreation)
router.get('/my', protect, async (req, res) => {
    try {
        const CourseAssignment = require('../models/courseAssignmentModel');

        const assignments = await CourseAssignment.find({
            faculty: req.user._id
        })
        .populate({
            path: 'course',
            populate: [
                { path: 'students', select: 'name regNo batch' },
                { path: 'clos', select: 'code description' }
            ]
        })
        .populate('faculty', 'name email department')
        .lean();

        res.json(assignments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.route('/:id')
    .put(protect, admin, updateAssignment)
    .delete(protect, admin, deleteAssignment);

module.exports = router;