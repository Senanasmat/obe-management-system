const GRADE_SCALE = [
    { min: 85, max: 100, letter: 'A',  gradePoint: 4.00 },
    { min: 80, max: 84,  letter: 'A-', gradePoint: 3.66 },
    { min: 75, max: 79,  letter: 'B+', gradePoint: 3.33 },
    { min: 71, max: 74,  letter: 'B',  gradePoint: 3.00 },
    { min: 68, max: 70,  letter: 'B-', gradePoint: 2.66 },
    { min: 64, max: 67,  letter: 'C+', gradePoint: 2.33 },
    { min: 61, max: 63,  letter: 'C',  gradePoint: 2.00 },
    { min: 58, max: 60,  letter: 'C-', gradePoint: 1.66 },
    { min: 54, max: 57,  letter: 'D+', gradePoint: 1.30 },
    { min: 50, max: 53,  letter: 'D',  gradePoint: 1.00 },
    { min: 0,  max: 49,  letter: 'F',  gradePoint: 0.00 }
];

const SPECIAL_GRADES = {
    I: 'Incomplete',
    W: 'Withdrawal',
    X: 'Exempted',
    IP: 'In Progress',
    WU: 'Short of Attendance'
};

const calculateGrade = (percentage) => {
    if (
        percentage === null ||
        percentage === undefined ||
        percentage === ''
    ) {
        return null;
    }

    const score = Number(percentage);

    if (!Number.isFinite(score) || score < 0 || score > 100) {
        return null;
    }

    // Match the whole-number grading ranges shown in
    // the university grading policy.
    const roundedScore = Math.round(score);

    const grade = GRADE_SCALE.find(
        (item) =>
            roundedScore >= item.min &&
            roundedScore <= item.max
    );

    return grade
        ? {
            letter: grade.letter,
            gradePoint: grade.gradePoint
        }
        : null;
};

module.exports = {
    GRADE_SCALE,
    SPECIAL_GRADES,
    calculateGrade
};