const { Course, CLO, PLO } = require('../models/academicModels');
const { Assessment, Result } = require('../models/assessmentModel');

// @desc    Get courses assigned to the logged-in faculty
// @route   GET /api/faculty/courses
const getAssignedCourses = async (req, res) => {
    try {
        const courses = await Course.find({ faculty: req.user._id })
            .populate('clos')
            .populate('students');
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new assessment
// @route   POST /api/faculty/assessments
const createAssessment = async (req, res) => {
    try {
        const { title, type, courseId, totalMarks, questions } = req.body;
        // questions array expects objects with { questionText, maxMarks, clo: cloId }

        const assessment = await Assessment.create({
            title,
            type,
            course: courseId,
            totalMarks,
            questions
        });

        res.status(201).json(assessment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Enter or update marks for a student
// @route   POST /api/faculty/marks
const enterMarks = async (req, res) => {
    try {
        const { studentId, assessmentId, obtainedMarks } = req.body;
        // obtainedMarks: [{ questionIndex: 0, marks: 5 }, ...]

        let result = await Result.findOne({ student: studentId, assessment: assessmentId });

        if (result) {
            result.obtainedMarks = obtainedMarks;
            await result.save();
        } else {
            result = await Result.create({
                student: studentId,
                assessment: assessmentId,
                obtainedMarks
            });
        }

        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get analytics for a specific course (CLO & PLO Achievement)
// @route   GET /api/faculty/analytics/:courseId
const getCourseAnalytics = async (req, res) => {
    const { courseId } = req.params;

    try {
        // 1. Fetch all assessments for this course
        const assessments = await Assessment.find({ course: courseId }).populate('questions.clo');

        // 2. Fetch all results for these assessments
        const assessmentIds = assessments.map(a => a._id);
        const results = await Result.find({ assessment: { $in: assessmentIds } }).populate('assessment');

        // Helper to track CLO totals
        // cloMap = { cloId: { totalMax: 0, totalObtained: 0, code: 'CLO-1', ploId: '...' } }
        let cloMap = {};

        // 3. Aggregate Scores
        results.forEach(result => {
            // For each student result
            const assessment = assessments.find(a => a._id.toString() === result.assessment.toString());
            if (!assessment) return;

            result.obtainedMarks.forEach(om => {
                const question = assessment.questions[om.questionIndex];
                if (question && question.clo) {
                    const cloId = question.clo._id.toString();

                    if (!cloMap[cloId]) {
                        cloMap[cloId] = {
                            code: question.clo.code,
                            totalMax: 0,
                            totalObtained: 0,
                            plo: question.clo.plo
                        };
                    }

                    cloMap[cloId].totalMax += question.maxMarks;
                    cloMap[cloId].totalObtained += om.marks;
                }
            });
        });

        // 4. Calculate % for CLOs
        let cloStats = [];
        let ploMap = {};

        for (const cloId in cloMap) {
            const data = cloMap[cloId];
            const percentage = data.totalMax > 0 ? (data.totalObtained / data.totalMax) * 100 : 0;

            cloStats.push({
                cloCode: data.code,
                percentage: parseFloat(percentage.toFixed(2)),
                plo: data.plo
            });

            // Aggregate for PLO
            if (data.plo) {
                const ploId = data.plo.toString();
                if (!ploMap[ploId]) ploMap[ploId] = { sum: 0, count: 0 };
                ploMap[ploId].sum += percentage; // Simple avg of CLO percentages
                ploMap[ploId].count += 1;
            }
        }

        // 5. Calculate % for PLOs
        let ploStats = [];
        for (const ploId in ploMap) {
            const data = ploMap[ploId];
            const avg = data.count > 0 ? data.sum / data.count : 0;
            // Fetch PLO details if needed, for now just ID
            ploStats.push({
                ploId,
                percentage: parseFloat(avg.toFixed(2))
            });
        }

        res.json({
            cloStats,
            ploStats,
            rawResultsCount: results.length
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

const getCourseAssessments = async (req, res) => {
    try {
        const assessments = await Assessment.find({ course: req.params.courseId });
        res.json(assessments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAssignedCourses,
    createAssessment,
    enterMarks,
    getCourseAnalytics,
    getCourseAssessments
};
