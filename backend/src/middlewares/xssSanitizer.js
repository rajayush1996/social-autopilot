import xss from 'xss';

const sanitizeValue = (val) => {
  if (typeof val === 'string') {
    return xss(val);
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val && typeof val === 'object') {
    Object.keys(val).forEach((key) => {
      val[key] = sanitizeValue(val[key]);
    });
  }
  return val;
};

/**
 * Express 5 compatible XSS Input Sanitization Middleware.
 * Mutates object properties in-place without trying to reassign read-only req.query getter.
 */
export const xssSanitizer = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    sanitizeValue(req.params);
  }
  next();
};
