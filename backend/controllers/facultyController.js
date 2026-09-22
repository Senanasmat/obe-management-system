const CourseAssignment = require('../models/courseAssignmentModel');
const { Result, ALL_MODELS, getModelByType, findAssessmentById } = require('../models/assessmentModel');
const { PLO, CLO, Course, Student } = require('../models/academicModels');

// Grade Scale constant
const GRADE_SCALE = [
    { min: 90, max: 100, gpa: 4.0, grade: 'A+' },
    { min: 85, max: 89.99, gpa: 3.9, grade: 'A' },
    { min: 80, max: 84.99, gpa: 3.7, grade: 'A-' },
    { min: 75, max: 79.99, gpa: 3.5, grade: 'B+' },
    { min: 70, max: 74.99, gpa: 3.0, grade: 'B' },
    { min: 65, max: 69.99, gpa: 2.7, grade: 'B-' },
    { min: 60, max: 64.99, gpa: 2.5, grade: 'C+' },
    { min: 55, max: 59.99, gpa: 2.0, grade: 'C' },
    { min: 50, max: 54.99, gpa: 1.5, grade: 'D' },
    { min: 0, max: 49.99, gpa: 0.0, grade: 'F' }
];

// Helper to get grade info
const getGradeInfo = (percentage) => {
    const gradeInfo = GRADE_SCALE.find(g => percentage >= g.min && percentage <= g.max);
    return gradeInfo ? { gpa: gradeInfo.gpa, grade: gradeInfo.grade } : { gpa: null, grade: 'N/A' };
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
                        populate: {
                            path: 'plo'
                        }
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
        const { code, description, plo } = req.body;
        const { courseId } = req.params;

        if (!code || !description || !plo) {
            return res.status(400).json({
                message: 'CLO code, description and PLO are required'
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

        // Check that selected PLO exists
        const ploExists = await PLO.findById(plo);

        if (!ploExists) {
            return res.status(404).json({
                message: 'Selected PLO not found'
            });
        }

        const clo = await CLO.create({
            code: code.trim(),
            description: description.trim(),
            plo
        });

        await Course.findByIdAndUpdate(
            courseId,
            { $push: { clos: clo._id } }
        );

        await clo.populate('plo');

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
        const { code, description, plo } = req.body;

        if (!code || !description || !plo) {
            return res.status(400).json({
                message: 'CLO code, description and PLO are required'
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

        // Check PLO exists
        const ploExists = await PLO.findById(plo);

        if (!ploExists) {
            return res.status(404).json({
                message: 'Selected PLO not found'
            });
        }

        const updatedClo = await CLO.findByIdAndUpdate(
            cloId,
            {
                code: code.trim(),
                description: description.trim(),
                plo
            },
            {
                new: true,
                runValidators: true
            }
        ).populate('plo');

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
        await Course.findByIdAndUpdate(courseId, { $pull: { clos: cloId } });
        res.json({ message: 'CLO removed from course' });
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        const course = await Course.findById(courseId).populate('students');
        if (!course) return res.status(404).json({ message: 'Course not found' });

        console.log(`Getting grades for course ${courseId}`);
        console.log(`Students enrolled: ${course.students?.length || 0}`);

        // Get all assessments for this course
        const assessments = await Promise.all(
            ALL_MODELS.map(Model => Model.find({ course: courseId }))
        );
        const allAssessments = assessments.flat().sort((a, b) => new Date(a.date) - new Date(b.date));

        console.log(`Total assessments: ${allAssessments.length}`);

        // Get all results for this course
        const results = await Result.find({
            assessment: { $in: allAssessments.map(a => a._id) }
        }).populate('student', 'name regNo');

        console.log(`Total results found: ${results.length}`);
        console.log(`Results:`, JSON.stringify(results.map(r => ({ student: r.student?.name, assessment: r.assessment, marksCount: r.obtainedMarks?.length })), null, 2));

        // Group results by student
        const studentResults = {};
        course.students?.forEach(student => {
            studentResults[student._id] = {
                student: student,
                assessments: [],
                totalObtained: 0,
                totalMaxMarks: 0,
                percentage: 0,
                gpa: 0,
                grade: 'N/A'
            };
        });

        // Aggregate marks by student
        results.forEach(result => {
            const studentId = result.student?._id?.toString() || result.student?.toString();
            const assessment = allAssessments.find(a => a._id.toString() === result.assessment.toString());

            if (studentResults[studentId] && assessment) {
                const totalMarksInAssessment = assessment.questions.reduce((sum, q) => sum + (q.maxMarks || 0), 0);
                const obtainedMarks = result.obtainedMarks.reduce((sum, om) => sum + (om.marks || 0), 0);

                studentResults[studentId].assessments.push({
                    assessmentTitle: assessment.title,
                    type: assessment.type,
                    totalMarks: totalMarksInAssessment,
                    obtained: obtainedMarks,
                    percentage: totalMarksInAssessment > 0 ? (obtainedMarks / totalMarksInAssessment) * 100 : 0
                });

                studentResults[studentId].totalObtained += obtainedMarks;
                studentResults[studentId].totalMaxMarks += totalMarksInAssessment;
            }
        });

        // Calculate overall percentage and convert to GPA (4.0 scale) and letter grade
        Object.keys(studentResults).forEach(studentId => {
            const data = studentResults[studentId];
            if (data.totalMaxMarks > 0) {
                data.percentage = (data.totalObtained / data.totalMaxMarks) * 100;
                const gradeInfo = getGradeInfo(data.percentage);
                data.gpa = gradeInfo.gpa;
                data.grade = gradeInfo.grade;
            }
        });

        const studentGradesList = Object.values(studentResults).sort((a, b) =>
            (b.percentage || 0) - (a.percentage || 0)
        );

        console.log(`Returning grades for ${studentGradesList.length} students`);
        console.log(`Sample data:`, JSON.stringify(studentGradesList.slice(0, 2), null, 2));

        res.json({
            course: {
                id: course._id,
                name: course.name,
                code: course.code
            },
            studentGrades: studentGradesList
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GENERATE DMC (DETAILED MARKS CERTIFICATE) FOR STUDENTS
const generateDMC = async (req, res) => {
    try {
        const { studentIds } = req.body;
        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ message: 'No students selected' });
        }

        const studentsData = [];

        for (const studentId of studentIds) {
            // Get all courses this student is enrolled in
            const enrolledCourses = await Course.find({ students: studentId })
                .select('_id name code creditHours');

            if (enrolledCourses.length === 0) {
                // Student enrolled in no courses, still add entry
                const student = await Student.findById(studentId);
                studentsData.push({
                    student: student,
                    courses: [],
                    totalCreditHours: 0,
                    overallGPA: 0
                });
                continue;
            }

            const studentCourseData = [];
            let totalCreditHours = 0;
            let totalGPAPoints = 0;
            let gradeableCoursesCount = 0;

            for (const course of enrolledCourses) {
                // Get semester info for this course
                const assignment = await CourseAssignment.findOne({ course: course._id });
                const semester = assignment?.semester || 'N/A';

                // Get assessments for this course
                const assessments = await Promise.all(
                    ALL_MODELS.map(Model => Model.find({ course: course._id }))
                );
                const allAssessments = assessments.flat();

                // Get results for this student in this course
                const results = await Result.find({
                    assessment: { $in: allAssessments.map(a => a._id) },
                    student: studentId
                });

                let totalObtained = 0;
                let totalMaxMarks = 0;

                results.forEach(result => {
                    const assessment = allAssessments.find(a => a._id.toString() === result.assessment.toString());
                    if (assessment) {
                        const maxInAssessment = assessment.questions.reduce((sum, q) => sum + (q.maxMarks || 0), 0);
                        const obtainedInAssessment = result.obtainedMarks.reduce((sum, om) => sum + (om.marks || 0), 0);
                        totalObtained += obtainedInAssessment;
                        totalMaxMarks += maxInAssessment;
                    }
                });

                let percentage = 0, gpa = null, grade = 'N/A';
                if (totalMaxMarks > 0) {
                    percentage = (totalObtained / totalMaxMarks) * 100;
                    const gradeInfo = getGradeInfo(percentage);
                    gpa = gradeInfo.gpa;
                    grade = gradeInfo.grade;
                    totalGPAPoints += gpa * (course.creditHours || 0);
                    gradeableCoursesCount += 1;
                }

                totalCreditHours += course.creditHours || 0;

                studentCourseData.push({
                    courseId: course._id,
                    code: course.code,
                    name: course.name,
                    creditHours: course.creditHours || 0,
                    semester: semester,
                    totalObtained: totalObtained,
                    totalMaxMarks: totalMaxMarks,
                    percentage: percentage.toFixed(2),
                    gpa: gpa,
                    grade: grade
                });
            }

            const overallGPA = gradeableCoursesCount > 0
                ? (totalGPAPoints / totalCreditHours).toFixed(2)
                : 0;

            const student = await Student.findById(studentId);
            studentsData.push({
                student: student,
                courses: studentCourseData,
                totalCreditHours: totalCreditHours,
                overallGPA: parseFloat(overallGPA)
            });
        }

        res.json({ students: studentsData });
    } catch (error) {
        console.error('Error generating DMC:', error);
        res.status(500).json({ message: error.message });
    }
};

// GENERATE MARKS TEMPLATE EXCEL
const generateMarksTemplate = async (req, res) => {
    try {
        const xlsx = require('xlsx');
        const { courseId } = req.params;

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Get course assignment to access assessments
        const assignment = await CourseAssignment.findOne({ course: courseId }).populate('course');
        if (!assignment) return res.status(404).json({ message: 'Course assignment not found' });

        // Fetch all assessments for this course
        const assessmentIds = assignment.course.assessments || [];
        const assessments = [];

        for (const assessmentId of assessmentIds) {
            const found = await findAssessmentById(assessmentId);
            if (found) {
                assessments.push({ _id: found.doc._id, name: found.doc.name, totalMarks: found.doc.totalMarks });
            }
        }

        // Get students enrolled in this course
        const students = course.students && course.students.length > 0
            ? await Student.find({ _id: { $in: course.students } })
            : [];

        // Create Excel data
        const headers = ['Student Reg No', 'Student Name', ...assessments.map(a => a.name)];
        const data = students.map(student => [
            student.regNo,
            student.name,
            ...assessments.map(() => '')
        ]);

        // Handle empty data
        if (data.length === 0) {
            data.push(['', '', ...assessments.map(() => '')]);
        }

        const ws = xlsx.utils.aoa_to_sheet([headers, ...data]);
        ws['!cols'] = [{ wch: 15 }, { wch: 25 }, ...assessments.map(() => ({ wch: 12 }))];

        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Marks');

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="marks-template-${courseId}.xlsx"`);

        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.end(buffer);
    } catch (error) {
        console.error('Error generating template:', error.message, error.stack);
        res.status(500).json({ message: `Error: ${error.message}` });
    }
};

// IMPORT MARKS FROM EXCEL
const importMarksFromExcel = async (req, res) => {
    try {
        const xlsx = require('xlsx');
        const { courseId } = req.params;

        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Get course assignment to access assessments
        const assignment = await CourseAssignment.findOne({ course: courseId }).populate('course');
        if (!assignment) return res.status(404).json({ message: 'Course assignment not found' });

        // Fetch all assessments for this course
        const assessmentIds = assignment.course.assessments || [];
        const assessments = [];

        for (const assessmentId of assessmentIds) {
            const found = await findAssessmentById(assessmentId);
            if (found) {
                assessments.push({ _id: found.doc._id, name: found.doc.name, totalMarks: found.doc.totalMarks });
            }
        }

        // Get students enrolled in this course
        const students = course.students && course.students.length > 0
            ? await Student.find({ _id: { $in: course.students } })
            : [];

        const studentMap = Object.fromEntries(
            students.map(s => [s.regNo.toLowerCase(), s])
        );

        const wb = xlsx.read(req.file.buffer);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length < 2) return res.status(400).json({ message: 'Excel file is empty' });

        const headers = rows[0];
        const regNoIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('reg'));
        const marksData = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const regNo = row[regNoIndex]?.toString().trim();
            if (!regNo) continue;

            const student = studentMap[regNo.toLowerCase()];
            if (!student) {
                return res.status(400).json({ message: `Student with Reg No ${regNo} not found` });
            }

            for (let j = 2; j < headers.length && j - 2 < assessments.length; j++) {
                const marks = parseFloat(row[j]);
                if (!isNaN(marks) && marks > 0) {
                    const assessment = assessments[j - 2];
                    marksData.push({
                        studentId: student._id,
                        assessmentId: assessment._id,
                        marks: marks
                    });
                }
            }
        }

        for (const { studentId, assessmentId, marks } of marksData) {
            const found = await findAssessmentById(assessmentId);
            if (found) {
                const Model = found.Model;
                const assessment = found.doc;
                const questions = assessment.questions || [];

                if (questions.length > 0) {
                    const totalMaxMarks = questions.reduce((sum, q) => sum + (q.maxMarks || 0), 0);
                    const marksPerQuestion = totalMaxMarks > 0 ? marks / totalMaxMarks : 0;

                    const resultData = {
                        student: studentId,
                        assessment: assessmentId,
                        questionAnswers: questions.map(q => ({
                            question: q._id,
                            obtainedMarks: Math.min(marksPerQuestion * (q.maxMarks || 0), q.maxMarks || 0)
                        }))
                    };

                    await Result.findOneAndUpdate(
                        { student: studentId, assessment: assessmentId },
                        resultData,
                        { upsert: true, new: true }
                    );
                }
            }
        }

        res.json({ message: `Successfully imported marks for ${marksData.length} entries`, count: marksData.length });
    } catch (error) {
        console.error('Error importing marks:', error);
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
    updateCourseCLO,
    removeCourseCLO,
    getAllStudents,
    getStudentGrades,
    generateDMC,
    generateMarksTemplate,
    importMarksFromExcel
};