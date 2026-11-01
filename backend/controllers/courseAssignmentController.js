const CourseAssignment = require('../models/courseAssignmentModel');

// CREATE ASSIGNMENT
// `faculty` may be a single id or an array of ids. An array creates one
// assignment per faculty member, so the course is shared between them.
const createAssignment = async (req, res) => {
    try {
        const { faculty, course, academicTerm } = req.body;
        const facultyIds = [...new Set((Array.isArray(faculty) ? faculty : [faculty]).filter(Boolean).map(String))];

        if (!facultyIds.length || !course || !academicTerm) {
            return res.status(400).json({
                message: 'Faculty, course and academic term are required'
            });
        }

        const existing = await CourseAssignment.find({
            faculty: { $in: facultyIds },
            course,
            academicTerm
        }).populate('faculty', 'name');

        if (existing.length) {
            const names = existing.map(a => a.faculty?.name).filter(Boolean).join(', ');
            return res.status(400).json({
                message: `This course is already assigned for this academic term to: ${names || 'the selected faculty'}`
            });
        }

        const assignments = await CourseAssignment.insertMany(
            facultyIds.map(id => ({ faculty: id, course, academicTerm }))
        );

        const populated = await CourseAssignment.populate(assignments, [
            { path: 'faculty', select: 'name email' },
            { path: 'course', select: 'name code' },
            { path: 'academicTerm', select: 'name season year' }
        ]);

        res.status(201).json(Array.isArray(faculty) ? populated : populated[0]);

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
            .populate('academicTerm', 'name season year')
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
        const { faculty, course, academicTerm } = req.body;

        const assignment = await CourseAssignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({
                message: 'Assignment not found'
            });
        }

        const exists = await CourseAssignment.findOne({
            faculty,
            course,
            academicTerm,
            _id: { $ne: req.params.id }
        });

        if (exists) {
            return res.status(400).json({
                message: 'This course is already assigned to this faculty for this academic term'
            });
        }

        assignment.faculty = faculty;
        assignment.course = course;
        assignment.academicTerm = academicTerm;

        const updated = await assignment.save();

        const populated = await updated.populate([
            { path: 'faculty', select: 'name email' },
            { path: 'course', select: 'name code' },
            { path: 'academicTerm', select: 'name season year' }
        ]);

        res.json(populated);

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'Duplicate assignment not allowed'
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