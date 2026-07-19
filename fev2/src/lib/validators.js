// Ported from /frontend/src/App.jsx validity().
export function validateAccount(v) {
  const errs = {};
  if (!v.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errs.email = 'Enter a valid email';
  if (!v.password || v.password.length < 8) errs.password = 'At least 8 characters';
  if (!v.fullName || !v.fullName.trim()) errs.fullName = 'Required';
  return errs;
}

export function validateBasics(v) {
  const errs = {};
  if (!v.displayName || !v.displayName.trim()) errs.displayName = 'Required';
  if (!v.sectors || v.sectors.length === 0) errs.sectors = 'Pick at least one sector';
  return errs;
}

export function validateFounderProduct(v) {
  const errs = {};
  if (!v.stage) errs.stage = 'Required';
  if (!v.productDescription || !v.productDescription.trim()) errs.productDescription = 'Required';
  return errs;
}

export function validateInvestorThesis(v) {
  const errs = {};
  if (!v.investorType) errs.investorType = 'Required';
  if (!v.thesis || !v.thesis.trim()) errs.thesis = 'Required';
  return errs;
}
