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

// faculty view their assigned courses
router.get('/my', protect, async (req, res) => {
    try {
        const CourseAssignment = require('../models/courseAssignmentModel');

        const assignments = await CourseAssignment.find({
            faculty: req.user._id
        })
        .populate({
            path: 'course',
            populate: { path: 'students' }
        })
        .populate('faculty', 'name email');

        res.json(assignments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.route('/:id')
    .put(protect, admin, updateAssignment)
    .delete(protect, admin, deleteAssignment);

module.exports = router;