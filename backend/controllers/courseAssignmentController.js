const CourseAssignment = require('../models/courseAssignmentModel');

// CREATE ASSIGNMENT
const createAssignment = async (req, res) => {
    try {
        const { faculty, course, semester } = req.body;

        // Extra safety check (frontend + backend protection)
        const exists = await CourseAssignment.findOne({
            faculty,
            course,
            semester
        });

        if (exists) {
            return res.status(400).json({
                message: 'This course is already assigned to this faculty for this semester'
            });
        }

        const assignment = await CourseAssignment.create({
            faculty,
            course,
            semester
        });

        const populated = await assignment.populate([
            { path: 'faculty', select: 'name email' },
            { path: 'course', select: 'name code' }
        ]);

        res.status(201).json(populated);

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// GET ALL ASSIGNMENTS
const getAssignments = async (req, res) => {
    try {
        const assignments = await CourseAssignment.find({})
            .populate('faculty', 'name email')
            .populate('course', 'name code')
            .sort({ createdAt: -1 });

        res.json(assignments);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

// DELETE ASSIGNMENT
const deleteAssignment = async (req, res) => {
    try {
        const assignment = await CourseAssignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        await assignment.deleteOne();

        res.json({ message: 'Assignment deleted successfully' });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

// UPDATE ASSIGNMENT
const updateAssignment = async (req, res) => {
    try {
        const { faculty, course, semester } = req.body;

        const assignment = await CourseAssignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // IMPORTANT: exclude current record
        const exists = await CourseAssignment.findOne({
            faculty,
            course,
            semester,
            _id: { $ne: req.params.id }
        });

        if (exists) {
            return res.status(400).json({
                message: 'This course is already assigned to this faculty for this semester'
            });
        }

        assignment.faculty = faculty;
        assignment.course = course;
        assignment.semester = semester;

        const updated = await assignment.save();

        const populated = await updated.populate([
            { path: 'faculty', select: 'name email' },
            { path: 'course', select: 'name code' }
        ]);

        res.json(populated);

    } catch (error) {

        // HANDLE DUPLICATE KEY ERROR
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'Duplicate assignment not allowed (same faculty, course, semester)'
            });
        }

        res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    createAssignment,
    getAssignments,
    updateAssignment,
    deleteAssignment
};