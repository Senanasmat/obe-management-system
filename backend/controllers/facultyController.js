const CourseAssignment = require('../models/courseAssignmentModel');
const { Result, ALL_MODELS, getModelByType, findAssessmentById } = require('../models/assessmentModel');
const { CLO, Course } = require('../models/academicModels');

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

// CREATE ASSESSMENT — routes to the correct collection by type
const createAssessment = async (req, res) => {
    try {
        const { title, type, courseId, totalMarks, gpaWeight, activityNature, includeForGPA, date, questions } = req.body;

        const Model = getModelByType(type);
        if (!Model) return res.status(400).json({ message: `Unknown assessment type: ${type}` });

        const assessment = await Model.create({
            title,
            type,
            course: courseId,
            totalMarks,
            gpaWeight: gpaWeight || 0,
            activityNature: activityNature || 'None',
            includeForGPA: includeForGPA !== undefined ? includeForGPA : true,
            date: date || new Date(),
            questions: questions.map(q => ({
                ...q,
                maxMarks: Number(q.maxMarks),
                obeWeight: Number(q.obeWeight) || 0,
                clo: q.clo || undefined
            }))
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

// GET ANALYTICS
const getCourseAnalytics = async (req, res) => {
    const { courseId } = req.params;

    try {
        const allResults = await Promise.all(
            ALL_MODELS.map(Model => Model.find({ course: courseId }).populate('questions.clo'))
        );
        const assessments = allResults.flat();

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

// GET COURSE ASSESSMENTS — queries all collections and merges
const getCourseAssessments = async (req, res) => {
    try {
        const results = await Promise.all(
            ALL_MODELS.map(Model => Model.find({ course: req.params.courseId }))
        );
        const all = results.flat().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        res.json(all);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET RESULTS FOR AN ASSESSMENT
const getAssessmentResults = async (req, res) => {
    try {
        const results = await Result.find({ assessment: req.params.id });
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET SINGLE ASSESSMENT — searches all collections
const getAssessment = async (req, res) => {
    try {
        const found = await findAssessmentById(req.params.id);
        if (!found) return res.status(404).json({ message: 'Assessment not found' });
        res.json(found.doc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// UPDATE ASSESSMENT — finds in the right collection, updates in place
const updateAssessment = async (req, res) => {
    try {
        const { title, type, totalMarks, gpaWeight, activityNature, includeForGPA, date, questions } = req.body;
        const found = await findAssessmentById(req.params.id);
        if (!found) return res.status(404).json({ message: 'Assessment not found' });

        const { doc } = found;
        doc.title = title;
        doc.type = type;
        doc.totalMarks = totalMarks;
        doc.gpaWeight = gpaWeight || 0;
        doc.activityNature = activityNature || 'None';
        doc.includeForGPA = includeForGPA !== undefined ? includeForGPA : true;
        doc.date = date || doc.date;
        doc.questions = questions.map(q => ({
            ...q,
            maxMarks: Number(q.maxMarks),
            obeWeight: Number(q.obeWeight) || 0,
            clo: q.clo || undefined
        }));

        await doc.save();
        res.json(doc);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// DELETE ASSESSMENT — finds and deletes from the right collection
const deleteAssessment = async (req, res) => {
    try {
        const found = await findAssessmentById(req.params.id);
        if (!found) return res.status(404).json({ message: 'Assessment not found' });
        await found.Model.findByIdAndDelete(req.params.id);
        res.json({ message: 'Assessment deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// CREATE CLO FOR COURSE
const createCourseCLO = async (req, res) => {
    try {
        const { code, description } = req.body;
        const { courseId } = req.params;

        const clo = await CLO.create({ code, description });

        await Course.findByIdAndUpdate(courseId, { $push: { clos: clo._id } });

        res.status(201).json(clo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// REMOVE CLO FROM COURSE
const removeCourseCLO = async (req, res) => {
    try {
        const { courseId, cloId } = req.params;
        await Course.findByIdAndUpdate(courseId, { $pull: { clos: cloId } });
        res.json({ message: 'CLO removed from course' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAssignedCourses,
    createAssessment,
    enterMarks,
    getCourseAnalytics,
    getCourseAssessments,
    getAssessment,
    getAssessmentResults,
    updateAssessment,
    deleteAssessment,
    createCourseCLO,
    removeCourseCLO
};