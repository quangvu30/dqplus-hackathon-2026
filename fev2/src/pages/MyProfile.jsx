import { useEffect, useRef, useState } from 'react';
import { profiles as profilesApi, documents as documentsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApi, useMutation } from '../hooks/useApi';
import { EmptyState, useToast, Toast } from '../components/ui';
import { riseIn } from '../lib/anim';
import StepBasics from '../components/wizard/StepBasics';
import StepFounderProduct from '../components/wizard/StepFounderProduct';
import StepFounderInside from '../components/wizard/StepFounderInside';
import StepInvestorThesis from '../components/wizard/StepInvestorThesis';

function fromProfile(p) {
  return {
    displayName: p.displayName || '', headline: p.headline || '', country: p.country || '',
    sectors: p.sectors || [], regions: p.regions || [], bio: p.details?.bio || '', experience: p.details?.experience || '',
    stage: p.stage || '', teamSize: p.teamSize ?? '', arrUsd: p.arrUsd ?? '', fundingAskUsd: p.fundingAskUsd ?? '',
    businessModel: p.businessModel || '', productDescription: p.details?.productDescription || '',
    traction: p.details?.traction || '', lookingFor: p.details?.lookingFor || [],
    insideInfo: p.insideInfo || {}, insideInfoVisibility: p.insideInfoVisibility || 'members',
    investorType: p.investorType || '', stages: p.stages || [],
    checkSizeMinUsd: p.checkSizeMinUsd ?? '', checkSizeMaxUsd: p.checkSizeMaxUsd ?? '',
    thesis: p.details?.thesis || '', portfolioHighlights: p.details?.portfolioHighlights || [],
    portfolioHighlightsText: (p.details?.portfolioHighlights || []).join(', '),
  };
}

export default function MyProfile() {
  const { role } = useAuth();
  const scope = useRef(null);
  const [toast, showToast] = useToast();
  const { status, data: profile, error, retry } = useApi(() => profilesApi.me(), []);
  const [values, setValues] = useState(null);
  const saveMutation = useMutation(profilesApi.updateMe);
  const uploadMutation = useMutation(documentsApi.uploadFinancialReport);
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (profile) setValues(fromProfile(profile));
  }, [profile]);

  useEffect(() => {
    if (status === 'ready') riseIn(scope.current);
  }, [status]);

  if (status === 'loading' || !values) return <div className="vn-page vn-page-narrow" style={{ color: 'var(--muted)' }}>Loading…</div>;
  if (status === 'error') return <div className="vn-page vn-page-narrow"><EmptyState title="Couldn't load your profile" body={error.message} onRetry={retry} /></div>;

  const save = async (e) => {
    e.preventDefault();
    try {
      await saveMutation.run({
        displayName: values.displayName, headline: values.headline || undefined, country: values.country || undefined,
        sectors: values.sectors, regions: values.regions, bio: values.bio || undefined, experience: values.experience || undefined,
        ...(role === 'founder'
          ? {
              stage: values.stage, teamSize: values.teamSize === '' ? undefined : values.teamSize,
              arrUsd: values.arrUsd === '' ? undefined : values.arrUsd,
              fundingAskUsd: values.fundingAskUsd === '' ? undefined : values.fundingAskUsd,
              businessModel: values.businessModel || undefined, productDescription: values.productDescription,
              traction: values.traction || undefined, lookingFor: values.lookingFor,
              insideInfo: values.insideInfo, insideInfoVisibility: values.insideInfoVisibility,
            }
          : {
              investorType: values.investorType, stages: values.stages,
              checkSizeMinUsd: values.checkSizeMinUsd === '' ? undefined : values.checkSizeMinUsd,
              checkSizeMaxUsd: values.checkSizeMaxUsd === '' ? undefined : values.checkSizeMaxUsd,
              thesis: values.thesis, portfolioHighlights: values.portfolioHighlights,
            }),
      });
      showToast('Profile saved — re-running AI matching');
    } catch {
      /* error surfaced via saveMutation.error */
    }
  };

  const uploadReport = async (e) => {
    e.preventDefault();
    if (!file) return;
    try {
      await uploadMutation.run(file);
      showToast('Report uploaded — assessment will appear on your profile shortly');
      setFile(null);
    } catch {
      /* error surfaced via uploadMutation.error */
    }
  };

  return (
    <div className="vn-page vn-page-narrow" ref={scope}>
      <div className="eyebrow rise">Your profile</div>
      <h1 className="serif-h1 rise" style={{ marginTop: 10 }}>Edit profile</h1>
      <form onSubmit={save} style={{ marginTop: 24 }}>
        <StepBasics role={role} values={values} setValues={setValues} errors={{}} />
        {role === 'founder' && <StepFounderProduct values={values} setValues={setValues} errors={{}} />}
        {role === 'founder' && <StepFounderInside values={values} setValues={setValues} />}
        {role === 'investor' && <StepInvestorThesis values={values} setValues={setValues} errors={{}} />}
        {saveMutation.error && <div className="field-error" style={{ marginBottom: 12 }}>{saveMutation.error.message}</div>}
        <button className="btn btn-primary" disabled={saveMutation.busy}>
          {saveMutation.busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {role === 'founder' && (
        <div className="card rise" style={{ marginTop: 24 }}>
          <div className="card-label">Financial report</div>
          <form onSubmit={uploadReport} style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button className="btn btn-ghost" disabled={!file || uploadMutation.busy}>
              {uploadMutation.busy ? 'Uploading…' : 'Upload'}
            </button>
          </form>
          {uploadMutation.error && <div className="field-error" style={{ marginTop: 10 }}>{uploadMutation.error.message}</div>}
        </div>
      )}
      <Toast message={toast} />
    </div>
  );
}
