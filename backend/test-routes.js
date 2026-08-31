const express = require('express');
const { protect, admin } = require('./middleware/authMiddleware');

// Mock the protect and admin middleware
const mockProtect = (req, res, next) => next();
const mockAdmin = (req, res, next) => next();

// Mock controller
const getFaculty = (req, res) => res.json([{ name: 'Test' }]);
const createFacultyMember = (req, res) => res.json({ name: 'Created' });
const updateFacultyMember = (req, res) => res.json({ name: 'Updated' });
const deleteFacultyMember = (req, res) => res.json({ message: 'Deleted' });

// Create a test router
const router = express.Router();

// Add the faculty routes
router.route('/faculty')
  .get(mockProtect, mockAdmin, getFaculty)
  .post(mockProtect, mockAdmin, createFacultyMember);

router.route('/faculty/:id')
  .put(mockProtect, mockAdmin, updateFacultyMember)
  .delete(mockProtect, mockAdmin, deleteFacultyMember);

// Create the app
const app = express();
app.use('/api/admin', router);

// Test the route
const request = require('http').request;
const server = app.listen(9999, () => {
  const req = require('http').request({
    hostname: 'localhost',
    port: 9999,
    path: '/api/admin/faculty',
    method: 'GET'
  }, (res) => {
    console.log(`Status: ${res.statusCode}`);
    server.close();
  });

  req.end();
});
