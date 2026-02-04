const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        console.error('ERROR: JWT_SECRET is missing from environment variables');
        throw new Error('JWT_SECRET is required');
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

module.exports = generateToken;
