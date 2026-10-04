const express = require('express');

const {
    createAcademicTerm,
    getAcademicTerms,
    updateAcademicTerm,
    deleteAcademicTerm
} = require('../controllers/academicTermController');

const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();


// GET ALL + CREATE
router.route('/')
    .get(protect, getAcademicTerms)
    .post(protect, admin, createAcademicTerm);


// UPDATE + DELETE
router.route('/:id')
    .put(protect, admin, updateAcademicTerm)
    .delete(protect, admin, deleteAcademicTerm);


module.exports = router;