const AcademicTerm = require('../models/academicTermModel');
const CourseAssignment = require('../models/courseAssignmentModel');

// CREATE ACADEMIC TERM
const createAcademicTerm = async (req, res) => {
    try {
        const { season, year } = req.body;

        if (!season || !year) {
            return res.status(400).json({
                message: 'Season and year are required'
            });
        }

        if (!['Fall', 'Spring'].includes(season)) {
            return res.status(400).json({
                message: 'Season must be Fall or Spring'
            });
        }

        const term = await AcademicTerm.create({
            season,
            year: Number(year),
            name: `${season} ${year}`
        });

        res.status(201).json(term);

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'This academic term already exists'
            });
        }

        res.status(400).json({
            message: error.message
        });
    }
};


// GET ALL ACADEMIC TERMS
const getAcademicTerms = async (req, res) => {
    try {
        const terms = await AcademicTerm.find({})
            .sort({ year: -1, season: 1 });

        res.status(200).json(terms);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


// UPDATE ACADEMIC TERM
const updateAcademicTerm = async (req, res) => {
    try {
        const { season, year } = req.body;

        if (!season || !year) {
            return res.status(400).json({
                message: 'Season and year are required'
            });
        }

        if (!['Fall', 'Spring'].includes(season)) {
            return res.status(400).json({
                message: 'Season must be Fall or Spring'
            });
        }

        const term = await AcademicTerm.findById(req.params.id);

        if (!term) {
            return res.status(404).json({
                message: 'Academic term not found'
            });
        }

        const updatedTerm = await AcademicTerm.findByIdAndUpdate(
            req.params.id,
            {
                season,
                year: Number(year),
                name: `${season} ${year}`
            },
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json(updatedTerm);

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'This academic term already exists'
            });
        }

        res.status(400).json({
            message: error.message
        });
    }
};


// DELETE ACADEMIC TERM
const deleteAcademicTerm = async (req, res) => {
    try {
        const term = await AcademicTerm.findById(req.params.id);

        if (!term) {
            return res.status(404).json({
                message: 'Academic term not found'
            });
        }

        const assignmentExists = await CourseAssignment.findOne({
            academicTerm: req.params.id
        });

        if (assignmentExists) {
            return res.status(400).json({
                message:
                    'This academic term cannot be deleted because it is being used in a course assignment.'
            });
        }

        await term.deleteOne();

        res.status(200).json({
            message: 'Academic term deleted successfully'
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


module.exports = {
    createAcademicTerm,
    getAcademicTerms,
    updateAcademicTerm,
    deleteAcademicTerm
};