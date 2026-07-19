// zod request-body validator: validate(schema) -> middleware. Parsed value replaces req.body.
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      return res.status(400).json({ error: 'Validation failed', details });
    }
    req.body = result.data;
    next();
  };
}

module.exports = validate;
