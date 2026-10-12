const CourseAssignment = require('../models/courseAssignmentModel');
const { Result, ALL_MODELS, getModelByType, findAssessmentById } = require('../models/assessmentModel');
const { PLO, CLO, Course, Student } = require('../models/academicModels');
const CLOMapping = require('../models/cloMappingModel');
const AcademicTerm = require('../models/academicTermModel');
const mongoose = require('mongoose');

const ASSESSMENT_WEIGHTS = {
    Quiz: 10,
    Assignment: 10,
    Midterm: 30,
    Final: 50
};

// Grade Scale constant
const { calculateGrade } = require('../utils/gradingScale');

// Keep the existing controller response format
const getGradeInfo = (percentage) => {
    const result = calculateGrade(percentage);

    if (!result) {
        return {
            grade: 'N/A',
            gpa: null
        };
    }

    return {
        grade: result.letter,
        gpa: result.gradePoint
    };
};


const calculateAssessmentMarks = (result, assessment) => {
    const questions = assessment.questions || [];
    const marks = result?.obtainedMarks || [];

    const validMarks = marks.filter(item =>
        Number.isInteger(item.questionIndex) &&
        item.questionIndex >= 0 &&
        item.questionIndex < questions.length &&
        typeof item.marks === 'number' &&
        Number.isFinite(item.marks) &&
        item.marks >= 0 &&
        item.marks <= Number(questions[item.questionIndex].maxMarks)
    );

    const uniqueIndexes = new Set(validMarks.map(item => item.questionIndex));

    const max = questions.reduce(
        (sum, question) => sum + Number(question.maxMarks || 0), 0
    );

    const obtained = validMarks.reduce(
        (sum, item) => sum + item.marks, 0
    );

    return {
        obtained,
        max,
        complete: Boolean(result) &&
            questions.length > 0 &&
            validMarks.length === questions.length &&
            uniqueIndexes.size === questions.length
    };
};

const calculateCourseStudentGrade = (student, assessments, results) => {
    const categories = {};

    Object.keys(ASSESSMENT_WEIGHTS).forEach(type => {
        categories[type] = {
            expected: 0,
            completed: 0,
            obtained: 0,
            max: 0
        };
    });

    const studentAssessments = [];
    let totalObtained = 0;
    let totalMaxMarks = 0;

    for (const assessment of assessments) {
        const result = results.find(r =>
            String(r.student?._id || r.student) === String(student._id) &&
            String(r.assessment) === String(assessment._id)
        );

        const marks = calculateAssessmentMarks(result, assessment);

        studentAssessments.push({
            assessmentId: assessment._id,
            assessmentTitle: assessment.title,
            type: assessment.type,
            totalMarks: marks.max,
            obtained: result ? marks.obtained : null,
            percentage: marks.complete && marks.max > 0
                ? (marks.obtained / marks.max) * 100
                : null
        });

        if (result) {
            totalObtained += marks.obtained;
            totalMaxMarks += marks.max;
        }

        if (
            categories[assessment.type] &&
            assessment.includeForGPA !== false
        ) {
            const category = categories[assessment.type];
            category.expected++;

            if (marks.complete) {
                category.completed++;
                category.obtained += marks.obtained;
                category.max += marks.max;
            }
        }
    }

    const weightedMarks = {};
    let totalPercentage = 0;
    let isComplete = true;

    for (const [type, weight] of Object.entries(ASSESSMENT_WEIGHTS)) {
        const category = categories[type];

        if (
            category.expected === 0 ||
            category.completed !== category.expected ||
            category.max <= 0
        ) {
            isComplete = false;
        }

        const score = category.max > 0
            ? (category.obtained / category.max) * weight
            : 0;

        weightedMarks[type] = Number(score.toFixed(2));
        totalPercentage += score;
    }

    const percentage = isComplete
        ? Number(totalPercentage.toFixed(2))
        : null;

    const gradeInfo = getGradeInfo(percentage);

    return {
        student,
        assessments: studentAssessments,
        totalObtained,
        totalMaxMarks,
        percentage,
        gpa: gradeInfo.gpa,
        grade: gradeInfo.grade,
        weightedMarks,
        isComplete
    };
};


// GET ASSIGNED COURSES
const getAssignedCourses = async (req, res) => {
    try {
        const assignments = await CourseAssignment.find({
            faculty: req.user._id
        })
            .populate({
                path: 'course',
                select: 'name code creditHours faculty clos students',
                populate: [
                    {
                        path: 'clos',
                    },
                    {
                        path: 'students',
                        select: 'name regNo batch'
                    }
                ]
            })
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
        const {
            title,
            type,
            courseId,
            totalMarks,
            gpaWeight,
            activityNature,
            includeForGPA,
            date,
            questions
        } = req.body;

        // 1. Validate assessment type
        const Model = getModelByType(type);

        if (!Model) {
            return res.status(400).json({
                message: `Unknown assessment type: ${type}`
            });
        }

        // 2. Validate course ID
        if (
            !courseId ||
            !mongoose.Types.ObjectId.isValid(courseId)
        ) {
            return res.status(400).json({
                message: 'A valid course ID is required.'
            });
        }

        // 3. Verify faculty assignment
        const assignment = await CourseAssignment.findOne({
            faculty: req.user._id,
            course: courseId
        });

        if (!assignment) {
            return res.status(403).json({
                message: 'This course is not assigned to you.'
            });
        }

        // 4. Load course
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({
                message: 'Course not found.'
            });
        }

        // 5. Validate title
        if (
            typeof title !== 'string' ||
            !title.trim()
        ) {
            return res.status(400).json({
                message: 'Assessment title is required.'
            });
        }

        // 6. Validate questions
        if (
            !Array.isArray(questions) ||
            questions.length === 0
        ) {
            return res.status(400).json({
                message: 'At least one question is required.'
            });
        }

        // 7. Validate total marks
        const numericTotalMarks = Number(totalMarks);

        if (
            totalMarks === '' ||
            totalMarks === null ||
            totalMarks === undefined ||
            !Number.isFinite(numericTotalMarks) ||
            numericTotalMarks <= 0
        ) {
            return res.status(400).json({
                message: 'Total marks must be greater than zero.'
            });
        }

        // 8. Validate GPA weight
        const numericGpaWeight =
            gpaWeight === undefined ||
            gpaWeight === null ||
            gpaWeight === ''
                ? 0
                : Number(gpaWeight);

        if (
            !Number.isFinite(numericGpaWeight) ||
            numericGpaWeight < 0 ||
            numericGpaWeight > 100
        ) {
            return res.status(400).json({
                message: 'GPA weight must be between 0 and 100.'
            });
        }

        // 9. Validate question details and CLO mappings
        const courseCloIds = new Set(
            (course.clos || []).map(clo =>
                String(clo._id || clo)
            )
        );

        const validatedQuestions = [];
        let questionMarksTotal = 0;

        for (let index = 0; index < questions.length; index++) {
            const question = questions[index];

            if (
                !question ||
                typeof question !== 'object' ||
                Array.isArray(question)
            ) {
                return res.status(400).json({
                    message: `Question ${index + 1} is invalid.`
                });
            }

            const maxMarks = Number(question.maxMarks);

            if (
                question.maxMarks === '' ||
                question.maxMarks === null ||
                question.maxMarks === undefined ||
                !Number.isFinite(maxMarks) ||
                maxMarks <= 0
            ) {
                return res.status(400).json({
                    message: `Question ${index + 1} must have maximum marks greater than zero.`
                });
            }

            const obeWeight =
                question.obeWeight === undefined ||
                question.obeWeight === null ||
                question.obeWeight === ''
                    ? 0
                    : Number(question.obeWeight);

            if (
                !Number.isFinite(obeWeight) ||
                obeWeight < 0 ||
                obeWeight > 100
            ) {
                return res.status(400).json({
                    message: `Question ${index + 1} has an invalid OBE weight.`
                });
            }

            const clos = question.clos || [];

            if (!Array.isArray(clos)) {
                return res.status(400).json({
                    message: `Question ${index + 1} must contain a valid CLO array.`
                });
            }

            const cloIds = clos.map(clo =>
                String(clo?._id || clo)
            );

            if (new Set(cloIds).size !== cloIds.length) {
                return res.status(400).json({
                    message: `Question ${index + 1} contains duplicate CLOs.`
                });
            }

            for (const cloId of cloIds) {
                if (
                    !mongoose.Types.ObjectId.isValid(cloId) ||
                    !courseCloIds.has(cloId)
                ) {
                    return res.status(400).json({
                        message: `Question ${index + 1} contains a CLO that does not belong to this course.`
                    });
                }
            }

            questionMarksTotal += maxMarks;

            validatedQuestions.push({
                ...question,
                maxMarks,
                obeWeight,
                clos: cloIds
            });
        }

        // 10. Verify question marks match assessment total
        if (
            Math.abs(
                questionMarksTotal - numericTotalMarks
            ) > 0.000001
        ) {
            return res.status(400).json({
                message:
                    `Question marks total (${questionMarksTotal}) must equal assessment total marks (${numericTotalMarks}).`
            });
        }

        // 11. Validate date if supplied
        const assessmentDate = date
            ? new Date(date)
            : new Date();

        if (Number.isNaN(assessmentDate.getTime())) {
            return res.status(400).json({
                message: 'Invalid assessment date.'
            });
        }

        // 12. Create assessment in the correct collection
        const assessment = await Model.create({
            title: title.trim(),
            type,
            course: courseId,
            totalMarks: numericTotalMarks,
            gpaWeight: numericGpaWeight,
            activityNature: activityNature || 'None',
            includeForGPA:
                includeForGPA !== undefined
                    ? includeForGPA
                    : true,
            date: assessmentDate,
            questions: validatedQuestions
        });

        return res.status(201).json(assessment);

    } catch (error) {
        console.error('Create assessment error:', error);

        return res.status(400).json({
            message: error.message
        });
    }
};


// ENTER MARKS
const enterMarks = async (req, res) => {
    try {
        const { studentId, assessmentId, obtainedMarks } = req.body;

        // 1. Validate required fields
        if (!studentId || !assessmentId || !Array.isArray(obtainedMarks)) {
            return res.status(400).json({
                message: 'Student, assessment, and obtainedMarks array are required.'
            });
        }

        // 2. Validate MongoDB IDs
        if (
            !mongoose.Types.ObjectId.isValid(studentId) ||
            !mongoose.Types.ObjectId.isValid(assessmentId)
        ) {
            return res.status(400).json({
                message: 'Invalid student or assessment ID.'
            });
        }

        // 3. Find assessment in its collection
        const found = await findAssessmentById(assessmentId);

        if (!found) {
            return res.status(404).json({
                message: 'Assessment not found.'
            });
        }

        const assessment = found.doc;

        // 4. Verify faculty assignment
        const assignment = await CourseAssignment.findOne({
            faculty: req.user._id,
            course: assessment.course
        });

        if (!assignment) {
            return res.status(403).json({
                message: 'This course is not assigned to you.'
            });
        }

        // 5. Verify student is enrolled in the course
        const course = await Course.findById(assessment.course);

        if (!course) {
            return res.status(404).json({
                message: 'Course not found.'
            });
        }

        const isEnrolled = (course.students || []).some(
            id => String(id) === String(studentId)
        );

        if (!isEnrolled) {
            return res.status(400).json({
                message: 'Student is not enrolled in this course.'
            });
        }

        // 6. Validate every question's marks
        const questions = assessment.questions || [];
        const seenIndexes = new Set();
        const validatedMarks = [];

        for (const entry of obtainedMarks) {
            const questionIndex = entry?.questionIndex;
            const marks = entry?.marks;

            if (
                !Number.isInteger(questionIndex) ||
                questionIndex < 0 ||
                questionIndex >= questions.length
            ) {
                return res.status(400).json({
                    message: 'Invalid question index.'
                });
            }

            if (seenIndexes.has(questionIndex)) {
                return res.status(400).json({
                    message: `Question ${questionIndex + 1} has duplicate marks.`
                });
            }

            seenIndexes.add(questionIndex);

            const maxMarks = Number(questions[questionIndex].maxMarks);

            if (
                typeof marks !== 'number' ||
                !Number.isFinite(marks) ||
                marks < 0 ||
                marks > maxMarks
            ) {
                return res.status(400).json({
                    message: `Marks for question ${questionIndex + 1} must be between 0 and ${maxMarks}.`
                });
            }

            validatedMarks.push({
                questionIndex,
                marks
            });
        }

        
        // 7. Merge new marks with previously saved marks
        const existingResult = await Result.findOne({
            student: studentId,
            assessment: assessmentId
        });

        const mergedMarks = new Map();

        // Preserve previously saved question marks
        if (existingResult) {
            for (const entry of existingResult.obtainedMarks) {
                if (
                    Number.isInteger(entry.questionIndex) &&
                    entry.questionIndex >= 0 &&
                    entry.questionIndex < questions.length
                ) {
                    mergedMarks.set(entry.questionIndex, entry.marks);
                }
            }
        }

        // Update only the questions submitted in this request
        for (const entry of validatedMarks) {
            mergedMarks.set(entry.questionIndex, entry.marks);
        }

        // Convert merged marks into the required schema format
        const finalMarks = Array.from(
            mergedMarks,
            ([questionIndex, marks]) => ({
                questionIndex,
                marks
            })
        ).sort((a, b) => a.questionIndex - b.questionIndex);

        // Avoid creating an empty result
        if (!existingResult && finalMarks.length === 0) {
            return res.status(400).json({
                message: 'At least one question mark is required.'
            });
        }

        // Save or update student result
        let result;

        if (existingResult) {
            existingResult.obtainedMarks = finalMarks;
            result = await existingResult.save();
        } else {
            result = await Result.create({
                student: studentId,
                assessment: assessmentId,
                obtainedMarks: finalMarks
            });
        }

        return res.json(result);

    } catch (error) {
        console.error('Error entering marks:', error);

        return res.status(500).json({
            message: error.message
        });
    }
};

// GET ANALYTICS

const getCourseAnalytics = async (req, res) => {
    const { courseId } = req.params;
    const { academicTermId, batch } = req.query;

    try {
        // 1. Validate course ID
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({
                message: 'Invalid course ID.'
            });
        }

        if (
            academicTermId &&
            !mongoose.Types.ObjectId.isValid(academicTermId)
        ) {
            return res.status(400).json({
                message: 'Invalid academic term ID.'
            });
        }

        // 2. Verify faculty assignment
        const assignmentFilter = {
            faculty: req.user._id,
            course: courseId
        };

        if (academicTermId) {
            assignmentFilter.academicTerm = academicTermId;
        }

        const assignments = await CourseAssignment.find(
            assignmentFilter
        );

        if (!assignments.length) {
            return res.status(403).json({
                message: 'This course is not assigned to you.'
            });
        }

        // Require an explicit term if multiple terms exist
        if (!academicTermId && assignments.length > 1) {
            return res.status(400).json({
                message:
                    'This course has multiple academic terms. Please provide academicTermId.'
            });
        }

        const selectedTermId = academicTermId ||
            assignments[0].academicTerm.toString();

        // 3. Verify course exists
        const course = await Course.findById(courseId)
            .populate('students', 'batch');

        if (!course) {
            return res.status(404).json({
                message: 'Course not found.'
            });
        }

        // 4. Load assessments
        const allResults = await Promise.all(
            ALL_MODELS.map(Model =>
                Model.find({ course: courseId })
                    .populate('questions.clos')
            )
        );

        const assessments = allResults.flat();

        const assessmentById = new Map(
            assessments.map(assessment => [
                String(assessment._id),
                assessment
            ])
        );

        // 5. Load CLO-to-PLO mappings
        const mappingFilter = {
            course: courseId,
            academicTerm: selectedTermId
        };

        if (batch) {
            mappingFilter.batch = String(batch).trim();
        }

        const mappings = await CLOMapping.find(mappingFilter)
            .populate('plo', 'code title description');

        // 6. Group mappings by CLO and batch
        const mappingsByClo = new Map();

        mappings.forEach(mapping => {
            const cloId = String(mapping.clo);

            if (!mappingsByClo.has(cloId)) {
                mappingsByClo.set(cloId, []);
            }

            mappingsByClo.get(cloId).push(mapping);
        });

        // 7. Load assessment results
        const assessmentIds = assessments.map(
            assessment => assessment._id
        );

        const results = await Result.find({
            assessment: { $in: assessmentIds }
        }).populate('student', 'batch');

        const enrolledStudentIds = new Set(
            (course.students || []).map(
                student => String(student._id)
            )
        );

        const cloMap = new Map();

        // 8. Calculate CLO attainment
        results.forEach(result => {
            const student = result.student;

            if (!student) return;

            if (
                !enrolledStudentIds.has(String(student._id))
            ) {
                return;
            }

            if (
                batch &&
                String(student.batch || '').trim() !==
                    String(batch).trim()
            ) {
                return;
            }

            const assessment = assessmentById.get(
                String(result.assessment)
            );

            if (!assessment) return;

            (result.obtainedMarks || []).forEach(entry => {
                const question =
                    assessment.questions?.[entry.questionIndex];

                if (!question?.clos?.length) return;

                const maxMarks = Number(question.maxMarks);
                const obtained = Number(entry.marks);

                if (
                    !Number.isFinite(maxMarks) ||
                    maxMarks <= 0 ||
                    !Number.isFinite(obtained)
                ) {
                    return;
                }

                question.clos.forEach(clo => {
                    const cloId = String(clo._id || clo);

                    if (!cloMap.has(cloId)) {
                        cloMap.set(cloId, {
                            cloId,
                            cloCode: clo.code || '',
                            totalMax: 0,
                            totalObtained: 0
                        });
                    }

                    const data = cloMap.get(cloId);

                    data.totalMax += maxMarks;
                    data.totalObtained += obtained;
                });
            });
        });

        // 9. Build CLO statistics
        const cloStats = Array.from(cloMap.values()).map(
            data => ({
                cloId: data.cloId,
                cloCode: data.cloCode,
                percentage: Number(
                    (
                        (data.totalObtained / data.totalMax) *
                        100
                    ).toFixed(2)
                )
            })
        );

        // 10. Calculate PLO attainment using mappings
        const ploMap = new Map();

        cloStats.forEach(clo => {
            const cloMappings =
                mappingsByClo.get(clo.cloId) || [];

            cloMappings.forEach(mapping => {
                const ploId = String(
                    mapping.plo?._id || mapping.plo
                );

                if (!ploMap.has(ploId)) {
                    ploMap.set(ploId, {
                        ploId,
                        ploCode: mapping.plo?.code || '',
                        sum: 0,
                        count: 0
                    });
                }

                const data = ploMap.get(ploId);

                data.sum += clo.percentage;
                data.count += 1;
            });
        });

        const ploStats = Array.from(ploMap.values()).map(
            data => ({
                ploId: data.ploId,
                ploCode: data.ploCode,
                percentage: Number(
                    (data.sum / data.count).toFixed(2)
                )
            })
        );

        return res.json({
            courseId,
            academicTermId: selectedTermId,
            batch: batch || null,
            cloStats,
            ploStats,
            rawResultsCount: results.length
        });

    } catch (error) {
        console.error('Course analytics error:', error);

        return res.status(500).json({
            message: error.message
        });
    }
};


const getStudentCLOAnalytics = async (req, res) => {
    try {
        const { courseId, studentId } = req.params;
        const mode = req.query.weightMode || 'actual';

        if (
            !mongoose.Types.ObjectId.isValid(courseId) ||
            !mongoose.Types.ObjectId.isValid(studentId)
        ) {
            return res.status(400).json({
                message: 'Invalid course or student ID.'
            });
        }

        if (!['actual', 'normalized'].includes(mode)) {
            return res.status(400).json({
                message: 'Invalid weight mode.'
            });
        }

        const assignment = await CourseAssignment.findOne({
            faculty: req.user._id,
            course: courseId
        });

        if (!assignment) {
            return res.status(403).json({
                message: 'Course not assigned to you.'
            });
        }

        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({
                message: 'Course not found.'
            });
        }

        if (
            !(course.students || []).some(
                id => String(id._id || id) === studentId
            )
        ) {
            return res.status(403).json({
                message: 'Student is not enrolled in this course.'
            });
        }

        const groups = await Promise.all(
            ALL_MODELS.map(Model => Model.find({ course: courseId }))
        );

        const assessments = groups.flat();

        const assessmentMap = new Map(
            assessments.map(a => [String(a._id), a])
        );

        const results = await Result.find({
            student: studentId,
            assessment: {
                $in: assessments.map(a => a._id)
            }
        });

        const cloMap = new Map();

        for (const result of results) {
            const assessment = assessmentMap.get(
                String(result.assessment)
            );

            if (!assessment) continue;

            for (const entry of result.obtainedMarks || []) {
                const question =
                    assessment.questions?.[entry.questionIndex];

                if (
                    !question ||
                    question.notForOBE === true ||
                    !question.clos?.length
                ) {
                    continue;
                }

                const maxMarks = Number(question.maxMarks);
                const obtained = Number(entry.marks);

                if (
                    !Number.isFinite(maxMarks) ||
                    maxMarks <= 0 ||
                    !Number.isFinite(obtained)
                ) {
                    continue;
                }

                // Use OBE weight; fall back to mark proportion.
                const storedWeight = Number(question.obeWeight);

                const weight =
                    Number.isFinite(storedWeight) &&
                    storedWeight > 0
                        ? storedWeight
                        : (maxMarks / Number(assessment.totalMarks)) * 100;

                if (!Number.isFinite(weight) || weight <= 0) {
                    continue;
                }

                const contribution =
                    (obtained / maxMarks) * weight;

                for (const clo of question.clos) {
                    const cloId = String(clo._id || clo);

                    if (!cloMap.has(cloId)) {
                        cloMap.set(cloId, {
                            cloId,
                            obtainedMarks: 0,
                            totalMarks: 0,
                            weightedObtained: 0,
                            totalWeight: 0
                        });
                    }

                    const item = cloMap.get(cloId);

                    item.obtainedMarks += obtained;
                    item.totalMarks += maxMarks;
                    item.weightedObtained += contribution;
                    item.totalWeight += weight;
                }
            }
        }

        const cloCodes = new Map(
            (await CLO.find({
                _id: { $in: [...cloMap.keys()] }
            })).map(clo => [String(clo._id), clo.code])
        );

        const cloStats = [...cloMap.values()].map(item => {
            const normalized =
                item.totalWeight > 0
                    ? (item.weightedObtained / item.totalWeight) * 100
                    : 0;

            const actual = item.weightedObtained;

            const percentage =
                mode === 'normalized' ? normalized : actual;

            const achieved =
                item.totalWeight > 0 &&
                item.weightedObtained >= item.totalWeight * 0.5;

            return {
                cloId: item.cloId,
                cloCode: cloCodes.get(item.cloId) || '',
                obtainedMarks: Number(item.obtainedMarks.toFixed(2)),
                totalMarks: Number(item.totalMarks.toFixed(2)),
                percentage: Number(percentage.toFixed(2)),
                achieved,
                actualWeight: Number(actual.toFixed(2)),
                normalizedWeight: Number(normalized.toFixed(2)),
                totalWeight: Number(item.totalWeight.toFixed(2))
            };
        });

        return res.json({
            studentId,
            weightMode: mode,
            cloStats
        });

    } catch (error) {
        console.error('Student CLO analytics error:', error);

        return res.status(500).json({
            message: 'Failed to calculate student CLO attainment.'
        });
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
        const assessmentId = req.params.id;

        // 1. Validate assessment ID
        if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
            return res.status(400).json({
                message: 'Invalid assessment ID.'
            });
        }

        // 2. Find assessment in its correct collection
        const found = await findAssessmentById(assessmentId);

        if (!found) {
            return res.status(404).json({
                message: 'Assessment not found.'
            });
        }

        const { doc } = found;

        // 3. Verify faculty assignment
        const assignment = await CourseAssignment.findOne({
            faculty: req.user._id,
            course: doc.course
        });

        if (!assignment) {
            return res.status(403).json({
                message: 'This course is not assigned to you.'
            });
        }

        // 4. Prevent changing assessment collection/type
        if (
            req.body.type !== undefined &&
            req.body.type !== doc.type
        ) {
            return res.status(400).json({
                message:
                    'Assessment type cannot be changed. Create a new assessment instead.'
            });
        }

        // Prevent moving assessment to another course
        if (
            req.body.courseId !== undefined &&
            String(req.body.courseId) !== String(doc.course)
        ) {
            return res.status(400).json({
                message: 'Assessment course cannot be changed.'
            });
        }

        const {
            title,
            totalMarks,
            gpaWeight,
            activityNature,
            includeForGPA,
            date,
            questions
        } = req.body;

        // 5. Validate title if supplied
        if (title !== undefined) {
            if (
                typeof title !== 'string' ||
                !title.trim()
            ) {
                return res.status(400).json({
                    message: 'Assessment title cannot be empty.'
                });
            }

            doc.title = title.trim();
        }

        // 6. Check whether student marks exist
        const existingResults = await Result.exists({
            assessment: assessmentId
        });

        // 7. Validate and update questions if supplied
        if (questions !== undefined) {
            if (
                !Array.isArray(questions) ||
                questions.length === 0
            ) {
                return res.status(400).json({
                    message: 'At least one question is required.'
                });
            }

            // Do not allow question changes after marks exist
            if (existingResults) {
                const currentQuestions = doc.questions.map(q => ({
                    questionName: q.questionName || '',
                    questionText: q.questionText || '',
                    maxMarks: Number(q.maxMarks),
                    obeWeight: Number(q.obeWeight || 0),
                    complexity: q.complexity || '',
                    notForOBE: Boolean(q.notForOBE),
                    clos: (q.clos || [])
                        .map(id => String(id._id || id))
                        .sort()
                }));

                const incomingQuestions = questions.map(q => ({
                    questionName: q.questionName || '',
                    questionText: q.questionText || '',
                    maxMarks: Number(q.maxMarks),
                    obeWeight: Number(q.obeWeight || 0),
                    complexity: q.complexity || '',
                    notForOBE: Boolean(q.notForOBE),
                    clos: (Array.isArray(q.clos) ? q.clos : [])
                        .map(id => String(id?._id || id))
                        .sort()
                }));

                if (
                    JSON.stringify(currentQuestions) !==
                    JSON.stringify(incomingQuestions)
                ) {
                    return res.status(409).json({
                        message:
                            'Questions cannot be modified because student marks have already been entered for this assessment.'
                    });
                }
            } else {
                // Validate CLOs against the course
                const course = await Course.findById(doc.course);

                if (!course) {
                    return res.status(404).json({
                        message: 'Course not found.'
                    });
                }

                const courseCloIds = new Set(
                    (course.clos || []).map(
                        clo => String(clo._id || clo)
                    )
                );

                const validatedQuestions = [];

                for (let index = 0; index < questions.length; index++) {
                    const question = questions[index];

                    if (
                        !question ||
                        typeof question !== 'object' ||
                        Array.isArray(question)
                    ) {
                        return res.status(400).json({
                            message: `Question ${index + 1} is invalid.`
                        });
                    }

                    const maxMarks = Number(question.maxMarks);

                    if (
                        question.maxMarks === '' ||
                        question.maxMarks === null ||
                        question.maxMarks === undefined ||
                        !Number.isFinite(maxMarks) ||
                        maxMarks <= 0
                    ) {
                        return res.status(400).json({
                            message:
                                `Question ${index + 1} must have maximum marks greater than zero.`
                        });
                    }

                    const obeWeight =
                        question.obeWeight === undefined ||
                        question.obeWeight === null ||
                        question.obeWeight === ''
                            ? 0
                            : Number(question.obeWeight);

                    if (
                        !Number.isFinite(obeWeight) ||
                        obeWeight < 0 ||
                        obeWeight > 100
                    ) {
                        return res.status(400).json({
                            message:
                                `Question ${index + 1} has an invalid OBE weight.`
                        });
                    }

                    const clos = question.clos || [];

                    if (!Array.isArray(clos)) {
                        return res.status(400).json({
                            message:
                                `Question ${index + 1} must have a valid CLO array.`
                        });
                    }

                    const cloIds = clos.map(
                        clo => String(clo?._id || clo)
                    );

                    if (
                        new Set(cloIds).size !== cloIds.length
                    ) {
                        return res.status(400).json({
                            message:
                                `Question ${index + 1} contains duplicate CLOs.`
                        });
                    }

                    for (const cloId of cloIds) {
                        if (
                            !mongoose.Types.ObjectId.isValid(cloId) ||
                            !courseCloIds.has(cloId)
                        ) {
                            return res.status(400).json({
                                message:
                                    `Question ${index + 1} contains a CLO that does not belong to this course.`
                            });
                        }
                    }

                    validatedQuestions.push({
                        ...question,
                        maxMarks,
                        obeWeight,
                        clos: cloIds
                    });
                }

                doc.questions = validatedQuestions;
            }
        }

        // 8. Validate total marks
        const finalTotalMarks =
            totalMarks !== undefined
                ? Number(totalMarks)
                : Number(doc.totalMarks);

        if (
            (totalMarks !== undefined &&
                (totalMarks === '' || totalMarks === null)) ||
            !Number.isFinite(finalTotalMarks) ||
            finalTotalMarks <= 0
        ) {
            return res.status(400).json({
                message: 'Total marks must be greater than zero.'
            });
        }

        // Prevent changing total marks after results exist
        if (
            existingResults &&
            finalTotalMarks !== Number(doc.totalMarks)
        ) {
            return res.status(409).json({
                message:
                    'Total marks cannot be changed after student marks have been entered.'
            });
        }

        const questionMarksTotal = doc.questions.reduce(
            (sum, q) => sum + Number(q.maxMarks),
            0
        );

        if (
            Math.abs(questionMarksTotal - finalTotalMarks) >
            0.000001
        ) {
            return res.status(400).json({
                message:
                    `Question marks total (${questionMarksTotal}) must equal assessment total marks (${finalTotalMarks}).`
            });
        }

        doc.totalMarks = finalTotalMarks;

        // 9. Validate GPA weight
        if (gpaWeight !== undefined) {
            const numericWeight = Number(gpaWeight);

            if (
                gpaWeight === '' ||
                gpaWeight === null ||
                !Number.isFinite(numericWeight) ||
                numericWeight < 0 ||
                numericWeight > 100
            ) {
                return res.status(400).json({
                    message: 'GPA weight must be between 0 and 100.'
                });
            }

            doc.gpaWeight = numericWeight;
        }

        // 10. Update other assessment settings
        if (activityNature !== undefined) {
            doc.activityNature = activityNature;
        }

        if (includeForGPA !== undefined) {
            if (typeof includeForGPA !== 'boolean') {
                return res.status(400).json({
                    message: 'includeForGPA must be true or false.'
                });
            }

            doc.includeForGPA = includeForGPA;
        }

        if (date !== undefined) {
            const parsedDate = new Date(date);

            if (Number.isNaN(parsedDate.getTime())) {
                return res.status(400).json({
                    message: 'Invalid assessment date.'
                });
            }

            doc.date = parsedDate;
        }

        // 11. Save assessment
        await doc.save();

        return res.json(doc);

    } catch (error) {
        console.error('Update assessment error:', error);

        return res.status(400).json({
            message: error.message
        });
    }
};

// DELETE ASSESSMENT — finds and deletes from the right collection

const deleteAssessment = async (req, res) => {
    try {
        const assessmentId = req.params.id;

        // 1. Validate assessment ID
        if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
            return res.status(400).json({
                message: 'Invalid assessment ID.'
            });
        }

        // 2. Find assessment in the correct collection
        const found = await findAssessmentById(assessmentId);

        if (!found) {
            return res.status(404).json({
                message: 'Assessment not found.'
            });
        }

        const { doc, Model } = found;

        // 3. Verify faculty assignment
        const assignment = await CourseAssignment.findOne({
            faculty: req.user._id,
            course: doc.course
        });

        if (!assignment) {
            return res.status(403).json({
                message: 'This course is not assigned to you.'
            });
        }

        // 4. Check whether student marks exist
        const resultCount = await Result.countDocuments({
            assessment: assessmentId
        });

        // 5. Prevent accidental deletion of graded assessments
        if (resultCount > 0) {
            return res.status(409).json({
                message:
                    `This assessment has ${resultCount} student result(s). ` +
                    'Remove the associated results through an authorized workflow before deleting the assessment.'
            });
        }

        // 6. Delete assessment
        await Model.findByIdAndDelete(assessmentId);

        return res.json({
            message: 'Assessment deleted successfully.'
        });

    } catch (error) {
        console.error('Delete assessment error:', error);

        return res.status(500).json({
            message: 'Failed to delete assessment.'
        });
    }
};


// GET ALL PLOs FOR FACULTY
const getPLOsForFaculty = async (req, res) => {
    try {
        const plos = await PLO.find({}).sort({ code: 1 });
        res.json(plos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// CREATE CLO FOR COURSE
const createCourseCLO = async (req, res) => {
    try {
        const { code, description } = req.body;
        const { courseId } = req.params;

        if (!code?.trim() || !description?.trim()) {
            return res.status(400).json({
                message: 'CLO code and description are required.'
            });
        }

        // Check whether this CLO code already exists in this course
        const course = await Course.findById(courseId).populate('clos');

        if (!course) {
            return res.status(404).json({
                message: 'Course not found'
            });
        }

        const duplicateClo = course.clos.find(
            clo => clo.code.trim().toLowerCase() === code.trim().toLowerCase()
        );

        if (duplicateClo) {
            return res.status(409).json({
                message: `${duplicateClo.code} is already created`
            });
        }


        const clo = await CLO.create({
            code: code.trim(),
            description: description.trim()
        });

        await Course.findByIdAndUpdate(courseId, {
            $push: { clos: clo._id }
        });

        res.status(201).json(clo);

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// UPDATE COURSE CLO
const updateCourseCLO = async (req, res) => {
    try {
        const { courseId, cloId } = req.params;
        const { code, description } = req.body;

        if (
            typeof code !== 'string' ||
            typeof description !== 'string' ||
            !code.trim() ||
            !description.trim()
        ) {
            return res.status(400).json({
                message: 'CLO code and description are required'
            });
        }

        const course = await Course.findById(courseId).populate('clos');

        if (!course) {
            return res.status(404).json({
                message: 'Course not found'
            });
        }

        // Make sure CLO belongs to this course
        const currentClo = course.clos.find(
            clo => clo._id.toString() === cloId
        );

        if (!currentClo) {
            return res.status(404).json({
                message: 'CLO not found in this course'
            });
        }

        // Check duplicate code, excluding the CLO currently being edited
        const duplicateClo = course.clos.find(
            clo =>
                clo._id.toString() !== cloId &&
                clo.code.trim().toLowerCase() === code.trim().toLowerCase()
        );

        if (duplicateClo) {
            return res.status(409).json({
                message: `${duplicateClo.code} is already created`
            });
        }


        const updatedClo = await CLO.findByIdAndUpdate(
            cloId,
            {
                code: code.trim(),
                description: description.trim()
            },
            {
                new: true,
                runValidators: true
            }
        );

        res.json(updatedClo);

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// REMOVE CLO FROM COURSE

const removeCourseCLO = async (req, res) => {
    try {
        const { courseId, cloId } = req.params;

        // 1. Validate IDs
        if (
            !mongoose.Types.ObjectId.isValid(courseId) ||
            !mongoose.Types.ObjectId.isValid(cloId)
        ) {
            return res.status(400).json({
                message: 'Invalid course or CLO ID.'
            });
        }

        // 2. Verify faculty assignment
        const assignment = await CourseAssignment.findOne({
            faculty: req.user._id,
            course: courseId
        });

        if (!assignment) {
            return res.status(403).json({
                message: 'This course is not assigned to you.'
            });
        }

        // 3. Find course
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({
                message: 'Course not found.'
            });
        }

        // 4. Verify CLO belongs to this course
        const belongsToCourse = (course.clos || []).some(
            id => String(id) === String(cloId)
        );

        if (!belongsToCourse) {
            return res.status(400).json({
                message: 'This CLO does not belong to the course.'
            });
        }

        // 5. Check whether assessment questions use this CLO
        const assessmentChecks = await Promise.all(
            ALL_MODELS.map(Model =>
                Model.exists({
                    course: courseId,
                    'questions.clos': cloId
                })
            )
        );

        const isUsedInAssessment = assessmentChecks.some(
            result => Boolean(result)
        );

        if (isUsedInAssessment) {
            return res.status(409).json({
                message:
                    'This CLO is used in assessment questions. ' +
                    'Remove those question mappings before removing the CLO.'
            });
        }

        // 6. Remove CLO from the course
        await Course.updateOne(
            {
                _id: courseId,
                clos: cloId
            },
            {
                $pull: {
                    clos: cloId
                }
            }
        );

        // 7. Delete course-specific CLO-to-PLO mappings
        await CLOMapping.deleteMany({
            course: courseId,
            clo: cloId
        });

        return res.json({
            message:
                'CLO removed from course and associated mappings deleted successfully.'
        });

    } catch (error) {
        console.error('Remove course CLO error:', error);

        return res.status(500).json({
            message: 'Failed to remove CLO from course.'
        });
    }
};

// GET ALL STUDENTS (for batch copy functionality)
const getAllStudents = async (req, res) => {
    try {
        const { Student } = require('../models/academicModels');
        const students = await Student.find({}).sort({ batch: 1, name: 1 });
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// CALCULATE STUDENT GRADES AND GPA FOR A COURSE
const getStudentGrades = async (req, res) => {
    try {
        const { courseId } = req.params;

        const assignment = await CourseAssignment.findOne({
            faculty: req.user._id,
            course: courseId
        });

        if (!assignment) {
            return res.status(403).json({
                message: 'This course is not assigned to you.'
            });
        }

        const course = await Course.findById(courseId)
            .populate('students', 'name regNo batch');

        if (!course) {
            return res.status(404).json({
                message: 'Course not found'
            });
        }

        const assessmentGroups = await Promise.all(
            ALL_MODELS.map(Model => Model.find({ course: courseId }))
        );

        const assessments = assessmentGroups.flat();

        const results = await Result.find({
            assessment: {
                $in: assessments.map(a => a._id)
            }
        });

        const studentGrades = (course.students || []).map(student =>
            calculateCourseStudentGrade(student, assessments, results)
        );

        studentGrades.sort(
            (a, b) => (b.percentage ?? -1) - (a.percentage ?? -1)
        );

        return res.json({
            course: {
                id: course._id,
                name: course.name,
                code: course.code
            },
            studentGrades
        });

    } catch (error) {
        console.error('Error getting student grades:', error);
        return res.status(500).json({
            message: error.message
        });
    }
};

// GET AWARD LIST FOR A COURSE
const getCourseAwardList = async (req, res) => {
    try {
        const { courseId } = req.params;

        const assignment = await CourseAssignment.findOne({
            faculty: req.user._id,
            course: courseId
        }).populate('academicTerm', 'name season year');

        if (!assignment) {
            return res.status(403).json({
                message: 'This course is not assigned to you.'
            });
        }

        const course = await Course.findById(courseId)
            .populate('students', 'name regNo batch');

        if (!course) {
            return res.status(404).json({
                message: 'Course not found'
            });
        }

        const assessmentGroups = await Promise.all(
            ALL_MODELS.map(Model => Model.find({ course: courseId }))
        );

        const assessments = assessmentGroups.flat();

        const results = await Result.find({
            assessment: {
                $in: assessments.map(a => a._id)
            }
        });

        const awardList = (course.students || []).map(student => {
            const summary = calculateCourseStudentGrade(
                student,
                assessments,
                results
            );

            const weights = summary.weightedMarks;

            return {
                studentId: student._id,
                name: student.name,
                regNo: student.regNo,
                batch: student.batch,

                assignment: Number((weights.Assignment ?? 0).toFixed(2)),
                quiz: Number((weights.Quiz ?? 0).toFixed(2)),
                midterm: Number((weights.Midterm ?? 0).toFixed(2)),
                final: Number((weights.Final ?? 0).toFixed(2)),
                sessional: Number(
                    ((weights.Quiz ?? 0) + (weights.Assignment ?? 0)).toFixed(2)
                ),

                total: summary.percentage,
                grade: summary.grade,
                gpa: summary.gpa,
                isComplete: summary.isComplete
            };
        });

        return res.json({
            course: {
                id: course._id,
                name: course.name,
                code: course.code,
                teacher: req.user.name,
                academicTerm: assignment.academicTerm?.name ||
                    (
                        assignment.academicTerm?.season && assignment.academicTerm?.year
                            ? `${assignment.academicTerm.season}-${assignment.academicTerm.year}`
                            : 'N/A'
                    )
            },

            weights: {
                assignment: 10,
                quiz: 10,
                midterm: 30,
                final: 50,
                sessional: 20
            },

            awardList
        });

    } catch (error) {
        console.error('Error generating award list:', error);
        return res.status(500).json({
            message: error.message
        });
    }
};


// GENERATE MARKS TEMPLATE EXCEL
const generateMarksTemplate = async (req, res) => {
    try {
        const xlsx = require('xlsx');
        const { courseId } = req.params;

        const assignment = await CourseAssignment.findOne({
            faculty: req.user._id,
            course: courseId
        });

        if (!assignment) {
            return res.status(403).json({
                message: 'This course is not assigned to you.'
            });
        }

        const course = await Course.findById(courseId)
            .populate('students', 'name regNo');

        if (!course) {
            return res.status(404).json({
                message: 'Course not found.'
            });
        }

        const groups = await Promise.all(
            ALL_MODELS.map(Model => Model.find({ course: courseId }))
        );

        const assessments = groups.flat().sort(
            (a, b) => new Date(a.date) - new Date(b.date)
        );

        const columns = [
            'Student Reg No',
            'Student Name'
        ];

        const descriptions = ['', ''];

        for (const assessment of assessments) {
            assessment.questions.forEach((question, index) => {
                columns.push(`${assessment._id}::Q${index + 1}`);
                descriptions.push(
                    `${assessment.title} | ${assessment.type} | Q${index + 1} | Max: ${question.maxMarks}`
                );
            });
        }

        const rows = [columns, descriptions];

        for (const student of course.students || []) {
            rows.push([
                student.regNo,
                student.name,
                ...Array(columns.length - 2).fill('')
            ]);
        }

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.aoa_to_sheet(rows);

        worksheet['!cols'] = columns.map((_, index) => ({
            wch: index === 1 ? 28 : index === 0 ? 20 : 35
        }));

        xlsx.utils.book_append_sheet(
            workbook,
            worksheet,
            'Marks Template'
        );

        const infoRows = [
            ['Assessment', 'Type', 'Questions', 'Total Marks'],
            ...assessments.map(a => [
                a.title,
                a.type,
                a.questions.length,
                a.totalMarks
            ])
        ];

        const infoSheet = xlsx.utils.aoa_to_sheet(infoRows);

        xlsx.utils.book_append_sheet(
            workbook,
            infoSheet,
            'Assessment Info'
        );

        const buffer = xlsx.write(workbook, {
            type: 'buffer',
            bookType: 'xlsx'
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="marks-template-${courseId}.xlsx"`
        );

        return res.end(buffer);

    } catch (error) {
        console.error('Excel template error:', error);
        return res.status(500).json({
            message: error.message
        });
    }
};

// IMPORT MARKS FROM EXCEL

const importMarksFromExcel = async (req, res) => {
    try {
        const xlsx = require('xlsx');
        const { courseId } = req.params;

        if (!req.file?.buffer) {
            return res.status(400).json({
                message: 'No Excel file uploaded.'
            });
        }

        const assignment = await CourseAssignment.findOne({
            faculty: req.user._id,
            course: courseId
        });

        if (!assignment) {
            return res.status(403).json({
                message: 'This course is not assigned to you.'
            });
        }

        const course = await Course.findById(courseId)
            .populate('students', 'name regNo');

        if (!course) {
            return res.status(404).json({
                message: 'Course not found.'
            });
        }

        const groups = await Promise.all(
            ALL_MODELS.map(Model => Model.find({ course: courseId }))
        );

        const assessments = groups.flat();
        const assessmentMap = new Map(
            assessments.map(a => [String(a._id), a])
        );

        const workbook = xlsx.read(req.file.buffer, {
            type: 'buffer'
        });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = xlsx.utils.sheet_to_json(sheet, {
            header: 1,
            defval: ''
        });

        if (rows.length < 2) {
            return res.status(400).json({
                message: 'Invalid Excel template.'
            });
        }

        const headers = rows[0];

        if (
            headers[0] !== 'Student Reg No' ||
            headers[1] !== 'Student Name'
        ) {
            return res.status(400).json({
                message: 'Invalid template headers.'
            });
        }

        const columnMap = new Map();

        for (let col = 2; col < headers.length; col++) {
            const match = String(headers[col]).match(
                /^([a-fA-F0-9]{24})::Q([1-9]\d*)$/
            );

            if (!match) {
                return res.status(400).json({
                    message: `Invalid assessment column ${col + 1}.`
                });
            }

            const assessment = assessmentMap.get(match[1]);
            const questionIndex = Number(match[2]) - 1;

            if (
                !assessment ||
                questionIndex >= assessment.questions.length
            ) {
                return res.status(400).json({
                    message: `Unknown assessment or question in column ${col + 1}.`
                });
            }

            columnMap.set(col, {
                assessment,
                questionIndex
            });
        }

        const studentMap = new Map(
            (course.students || []).map(s => [
                String(s.regNo).trim().toLowerCase(),
                s
            ])
        );

        const pending = new Map();

        for (let rowIndex = 2; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const regNo = String(row[0] || '').trim();

            if (!regNo) continue;

            const student = studentMap.get(regNo.toLowerCase());

            if (!student) {
                return res.status(400).json({
                    message: `Student ${regNo} is not enrolled in this course (row ${rowIndex + 1}).`
                });
            }

            for (const [col, mapping] of columnMap) {
                const raw = row[col];

                if (raw === '' || raw === null || raw === undefined) {
                    continue;
                }

                const marks = Number(raw);
                const maxMarks = Number(
                    mapping.assessment.questions[mapping.questionIndex].maxMarks
                );

                if (
                    !Number.isFinite(marks) ||
                    marks < 0 ||
                    marks > maxMarks
                ) {
                    return res.status(400).json({
                        message: `Invalid marks at row ${rowIndex + 1}, column ${col + 1}. Maximum is ${maxMarks}.`
                    });
                }

                const key = `${student._id}:${mapping.assessment._id}`;

                if (!pending.has(key)) {
                    pending.set(key, {
                        studentId: student._id,
                        assessmentId: mapping.assessment._id,
                        marks: new Map()
                    });
                }

                pending.get(key).marks.set(
                    mapping.questionIndex,
                    marks
                );
            }
        }

        const operations = [];

        for (const item of pending.values()) {
            const existing = await Result.findOne({
                student: item.studentId,
                assessment: item.assessmentId
            });

            const merged = new Map(
                (existing?.obtainedMarks || []).map(m => [
                    m.questionIndex,
                    m.marks
                ])
            );

            for (const [index, marks] of item.marks) {
                merged.set(index, marks);
            }

            operations.push({
                updateOne: {
                    filter: {
                        student: item.studentId,
                        assessment: item.assessmentId
                    },
                    update: {
                        $set: {
                            obtainedMarks: [...merged].map(
                                ([questionIndex, marks]) => ({
                                    questionIndex,
                                    marks
                                })
                            )
                        },
                        $setOnInsert: {
                            student: item.studentId,
                            assessment: item.assessmentId
                        }
                    },
                    upsert: true
                }
            });
        }

        if (operations.length > 0) {
            await Result.bulkWrite(operations);
        }

        return res.json({
            message: 'Marks imported successfully.',
            count: operations.length
        });

    } catch (error) {
        console.error('Excel import error:', error);
        return res.status(500).json({
            message: error.message
        });
    }
};


const getCourseCLOMappings = async (req, res) => {
    try {
        const { courseId } = req.params;

        const assignment = await CourseAssignment.findOne({
            faculty: req.user._id,
            course: courseId
        });

        if (!assignment) {
            return res.status(403).json({
                message: 'This course is not assigned to you.'
            });
        }

        const mappings = await CLOMapping.find({ course: courseId })
            .populate('clo', 'code description')
            .populate('plo', 'code title description')
            .populate('academicTerm', 'name season year')
            .sort({ createdAt: 1 });

        res.json(mappings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createCourseCLOMapping = async (req, res) => {
    try {
        const { courseId } = req.params;
        const {
            cloId,
            ploId,
            academicTermId,
            batch,
            learningType,
            level,
            emphasisLevel
        } = req.body;

        if (!cloId || !ploId || !academicTermId || !batch?.trim()) {
            return res.status(400).json({
                message: 'CLO, PLO, academic term, and batch are required.'
            });
        }

        // Verify that the faculty member is assigned to this course.
        const assignment = await CourseAssignment.findOne({
            faculty: req.user._id,
            course: courseId
        });

        if (!assignment) {
            return res.status(403).json({
                message: 'This course is not assigned to you.'
            });
        }

        // Verify the CLO belongs to this course.
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({
                message: 'Course not found.'
            });
        }

        const belongsToCourse = course.clos.some(
            id => id.toString() === cloId
        );

        if (!belongsToCourse) {
            return res.status(400).json({
                message: 'The selected CLO does not belong to this course.'
            });
        }

        const [plo, academicTerm, studentExists] = await Promise.all([
            PLO.findById(ploId),
            AcademicTerm.findById(academicTermId),
            Student.exists({ batch: batch.trim() })
        ]);

        if (!plo) {
            return res.status(404).json({ message: 'PLO not found.' });
        }

        if (!academicTerm) {
            return res.status(404).json({
                message: 'Academic term not found.'
            });
        }

        if (!studentExists) {
            return res.status(400).json({
                message: 'No students were found in this batch.'
            });
        }

        const mapping = await CLOMapping.create({
            course: courseId,
            clo: cloId,
            plo: ploId,
            academicTerm: academicTermId,
            batch: batch.trim(),
            learningType,
            level,
            emphasisLevel
        });

        const populatedMapping = await CLOMapping.findById(mapping._id)
            .populate('clo', 'code description')
            .populate('plo', 'code title description')
            .populate('academicTerm', 'name season year');

        res.status(201).json(populatedMapping);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'This CLO is already mapped to that PLO for this batch and academic term.'
            });
        }

        res.status(400).json({ message: error.message });
    }
};

const getAcademicTermsForFaculty = async (req, res) => {
    try {
        const terms = await AcademicTerm.find({})
            .sort({ year: -1, season: 1 });

        res.json(terms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


module.exports = {
    getAssignedCourses,
    getPLOsForFaculty,
    createAssessment,
    enterMarks,
    getCourseAnalytics,
    getCourseAssessments,
    getAssessment,
    getAssessmentResults,
    updateAssessment,
    deleteAssessment,
    createCourseCLO,
    removeCourseCLO,
    updateCourseCLO,
    getAllStudents,
    getStudentGrades,
    getCourseAwardList,
    getStudentCLOAnalytics,
    getCourseCLOMappings,
    createCourseCLOMapping,
    getAcademicTermsForFaculty,
    generateMarksTemplate,
    importMarksFromExcel
};
