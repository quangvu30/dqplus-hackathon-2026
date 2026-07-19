import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { onboarding as onboardingApi, documents as documentsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useWizardDraft } from '../hooks/useWizardDraft';
import {
  validateAccount, validateBasics, validateFounderProduct, validateInvestorThesis,
} from '../lib/validators';
import StepAccount from '../components/wizard/StepAccount';
import StepBasics from '../components/wizard/StepBasics';
import StepFounderProduct from '../components/wizard/StepFounderProduct';
import StepFounderInside from '../components/wizard/StepFounderInside';
import StepFounderFinancials from '../components/wizard/StepFounderFinancials';
import StepInvestorThesis from '../components/wizard/StepInvestorThesis';
import StepReview from '../components/wizard/StepReview';

const INITIAL_VALUES = {
  email: '', password: '', fullName: '',
  displayName: '', headline: '', country: '', sectors: [], regions: [], bio: '', experience: '',
  // founder
  stage: '', teamSize: '', arrUsd: '', fundingAskUsd: '', businessModel: '',
  productDescription: '', traction: '', lookingFor: [],
  insideInfo: {}, insideInfoVisibility: 'members',
  financialReport: null, financialReportName: null,
  // investor
  investorType: '', stages: [], checkSizeMinUsd: '', checkSizeMaxUsd: '',
  thesis: '', portfolioHighlights: [], portfolioHighlightsText: '',
};

function buildSteps(role) {
  const common = [
    { id: 'account', title: 'Account', Component: StepAccount, validate: validateAccount },
    { id: 'basics', title: role === 'founder' ? 'Company' : 'Firm', Component: StepBasics, validate: validateBasics },
  ];
  const roleSteps = role === 'founder'
    ? [
        { id: 'product', title: 'Product', Component: StepFounderProduct, validate: validateFounderProduct },
        { id: 'inside', title: 'Inside info', Component: StepFounderInside },
        { id: 'financials', title: 'Financials', Component: StepFounderFinancials },
      ]
    : [
        { id: 'thesis', title: 'Thesis', Component: StepInvestorThesis, validate: validateInvestorThesis },
      ];
  return [...common, ...roleSteps, { id: 'review', title: 'Review', Component: StepReview }];
}

function toProfilePayload(role, v) {
  const base = {
    displayName: v.displayName.trim(),
    headline: v.headline || undefined,
    country: v.country || undefined,
    sectors: v.sectors,
    regions: v.regions,
    bio: v.bio || undefined,
    experience: v.experience || undefined,
  };
  if (role === 'founder') {
    return {
      ...base,
      stage: v.stage,
      teamSize: v.teamSize === '' ? undefined : v.teamSize,
      arrUsd: v.arrUsd === '' ? undefined : v.arrUsd,
      fundingAskUsd: v.fundingAskUsd === '' ? undefined : v.fundingAskUsd,
      businessModel: v.businessModel || undefined,
      productDescription: v.productDescription,
      traction: v.traction || undefined,
      lookingFor: v.lookingFor,
      insideInfo: v.insideInfo,
      insideInfoVisibility: v.insideInfoVisibility,
    };
  }
  return {
    ...base,
    investorType: v.investorType,
    stages: v.stages,
    checkSizeMinUsd: v.checkSizeMinUsd === '' ? undefined : v.checkSizeMinUsd,
    checkSizeMaxUsd: v.checkSizeMaxUsd === '' ? undefined : v.checkSizeMaxUsd,
    thesis: v.thesis,
    portfolioHighlights: v.portfolioHighlights,
  };
}

export default function Onboarding() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const steps = useMemo(() => buildSteps(role), [role]);
  const { values, setValues, stepIndex, setStepIndex, hasDraft, clearDraft } = useWizardDraft(role, INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitStage, setSubmitStage] = useState('');

  if (!['founder', 'investor'].includes(role)) {
    navigate('/join', { replace: true });
    return null;
  }

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const goNext = () => {
    const errs = step.validate ? step.validate(values) : {};
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      setSubmitStage('Creating your account…');
      const { token, user } = await onboardingApi.submit({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        fullName: values.fullName.trim(),
        role,
        profile: toProfilePayload(role, values),
      });
      login({ token, user });

      if (role === 'founder' && values.financialReport) {
        setSubmitStage('Uploading financial report…');
        try {
          await documentsApi.uploadFinancialReport(values.financialReport);
        } catch {
          // Non-fatal: account already exists, report can be added later from profile.
        }
      }
      clearDraft();
      navigate('/join/analyzing', { replace: true });
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="vn-wizard">
      {hasDraft && stepIndex === 0 && (
        <div className="card" style={{ marginBottom: 18, fontSize: 13, color: 'var(--muted)' }}>
          Resumed where you left off.
        </div>
      )}
      <div className="eyebrow">Join as {role === 'founder' ? 'a founder' : 'an investor'} · Step {stepIndex + 1} of {steps.length}</div>
      <div className="vn-wizard-progress">
        {steps.map((s, i) => <span key={s.id} className={i <= stepIndex ? 'done' : ''} />)}
      </div>

      <step.Component role={role} values={values} setValues={setValues} errors={errors} submitError={submitError} />

      <div className="vn-wizard-nav">
        <button className="btn btn-ghost" onClick={goBack} disabled={stepIndex === 0 || submitting}>
          Back
        </button>
        {isLast ? (
          <button className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? submitStage || 'Submitting…' : 'Create account'}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={goNext}>Continue</button>
        )}
      </div>
    </div>
  );
}
