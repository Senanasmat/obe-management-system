const CourseAssignment = require('../models/courseAssignmentModel');
const { Assessment, Result } = require('../models/assessmentModel');

// GET ASSIGNED COURSES
const getAssignedCourses = async (req, res) => {
    try {
        const assignments = await CourseAssignment.find({
            faculty: req.user._id
        })
        .populate('course', 'name code creditHours')
        .populate('faculty', 'name email')
        .sort({ createdAt: -1 });

        res.json(assignments);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// CREATE ASSESSMENT
const createAssessment = async (req, res) => {
    try {
        const { title, type, courseId, totalMarks, questions } = req.body;

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

// ENTER MARKS
const enterMarks = async (req, res) => {
    try {
        const { studentId, assessmentId, obtainedMarks } = req.body;

        let result = await Result.findOne({
            student: studentId,
            assessment: assessmentId
        });

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

// GET ANALYTICS (UNCHANGED - OK)
const getCourseAnalytics = async (req, res) => {
    const { courseId } = req.params;

    try {
        const assessments = await Assessment.find({ course: courseId })
            .populate('questions.clo');

        const assessmentIds = assessments.map(a => a._id);

        const results = await Result.find({
            assessment: { $in: assessmentIds }
        }).populate('assessment');

        let cloMap = {};

        results.forEach(result => {
            const assessment = assessments.find(
                a => a._id.toString() === result.assessment.toString()
            );

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

        let cloStats = [];
        let ploMap = {};

        for (const cloId in cloMap) {
            const data = cloMap[cloId];
            const percentage =
                data.totalMax > 0
                    ? (data.totalObtained / data.totalMax) * 100
                    : 0;

            cloStats.push({
                cloCode: data.code,
                percentage: parseFloat(percentage.toFixed(2)),
                plo: data.plo
            });

            if (data.plo) {
                const ploId = data.plo.toString();

                if (!ploMap[ploId]) {
                    ploMap[ploId] = { sum: 0, count: 0 };
                }

                ploMap[ploId].sum += percentage;
                ploMap[ploId].count += 1;
            }
        }

        let ploStats = [];

        for (const ploId in ploMap) {
            const data = ploMap[ploId];
            const avg = data.count > 0 ? data.sum / data.count : 0;

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
        res.status(500).json({ message: error.message });
    }
};

// GET COURSE ASSESSMENTS
const getCourseAssessments = async (req, res) => {
    try {
        const assessments = await Assessment.find({
            course: req.params.courseId
        });

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