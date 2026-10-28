const { validationResult } = require('express-validator');
const { sendError } = require('../utils/apiResponse');

/**
 * Middleware: Request Validator
 * Run after express-validator chains to return validation errors in a clean format.
 * Usage: Place after your express-validator array in the route definition.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => `${e.path}: ${e.msg}`);
    return sendError(res, 'Validation failed', 400, messages);
  }
  next();
};

module.exports = validateRequest;
