import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../lib/api';
import { popIn } from '../lib/anim';
import { FALLBACK_FEATURED } from '../data/ecosystem';
import { cap, INVESTOR_TYPES } from '../lib/format';

function FeaturedCard({ item }) {
  return (
    <div className="card rise">
      <div className="vn-detail-type">
        <span className="dot" style={{ background: item.role === 'founder' ? '#3f8f6b' : '#b08636' }} />
        {item.role === 'founder'
          ? 'Startup' + (item.stage ? ' · ' + cap(item.stage) : '')
          : INVESTOR_TYPES[item.investorType] || 'Investor'}
      </div>
      <h3 className="vn-match-name" style={{ marginTop: 10 }}>{item.displayName}</h3>
      <p className="vn-match-rationale">{item.headline}</p>
      <div className="vn-detail-sectors" style={{ marginTop: 12 }}>
        {(item.sectors || []).slice(0, 3).map((s) => (
          <span key={s} className="chip vn-detail-sector-chip" style={{ padding: '5px 10px', fontSize: 12 }}>
            {cap(s)}
          </span>
        ))}
      </div>
    </div>
  );
}

const HOW = [
  { n: 1, title: 'Create your profile', body: 'Founders share their product, traction and inside metrics. Investors share thesis, stages and check size.' },
  { n: 2, title: 'AI builds your match signals', body: 'A language model extracts your key criteria and embeds your profile for semantic matching, with explainable reasons.' },
  { n: 3, title: 'Meet the right people', body: 'Browse, get ranked recommendations, request meetings and schedule — feedback after each meeting sharpens future matches.' },
];

export default function Landing() {
  const scope = useRef(null);
  const [featured, setFeatured] = useState(null);

  useEffect(() => {
    let alive = true;
    publicApi
      .featured(undefined, 6)
      .then((d) => alive && setFeatured(d.items?.length ? d.items : FALLBACK_FEATURED))
      .catch(() => alive && setFeatured(FALLBACK_FEATURED));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (featured) popIn(scope.current);
  }, [featured]);

  const investors = (featured || []).filter((f) => f.role === 'investor').slice(0, 3);
  const founders = (featured || []).filter((f) => f.role === 'founder').slice(0, 3);

  return (
    <div ref={scope}>
      <section className="vn-hero">
        <div className="eyebrow rise">VietNexus — Innovation OS</div>
        <h1 className="serif-h1 rise">Where Vietnamese startups and investors <em>find each other</em>.</h1>
        <p className="lede rise">
          AI-powered matchmaking that reads your profile, understands what you're looking
          for, and ranks the people worth meeting — with honest, bilingual reasoning.
        </p>
        <div className="vn-hero-cta rise">
          <Link to="/join" className="btn btn-primary" style={{ textDecoration: 'none', padding: '14px 26px' }}>
            Join now
          </Link>
          <Link to="/login" className="btn btn-ghost" style={{ textDecoration: 'none', padding: '14px 26px' }}>
            Sign in
          </Link>
        </div>
      </section>

      {investors.length > 0 && (
        <section className="vn-section">
          <div className="eyebrow rise">Featured investors</div>
          <h2 className="serif-h2 rise" style={{ marginTop: 10 }}>Capital partners already on the network.</h2>
          <div className="vn-featured-grid">
            {investors.map((i) => <FeaturedCard key={i.profileId} item={i} />)}
          </div>
        </section>
      )}

      {founders.length > 0 && (
        <section className="vn-section">
          <div className="eyebrow rise">Featured startups</div>
          <h2 className="serif-h2 rise" style={{ marginTop: 10 }}>Founders raising right now.</h2>
          <div className="vn-featured-grid">
            {founders.map((f) => <FeaturedCard key={f.profileId} item={f} />)}
          </div>
        </section>
      )}

      <section className="vn-section">
        <div className="eyebrow rise">How it works</div>
        <div className="vn-how-grid">
          {HOW.map((h) => (
            <div className="card rise" key={h.n}>
              <div className="vn-step-num">{h.n}</div>
              <div style={{ fontWeight: 600, color: 'var(--label)', marginBottom: 6 }}>{h.title}</div>
              <p className="vn-match-rationale">{h.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="vn-section" style={{ paddingBottom: 100 }}>
        <div className="vn-cta-band rise" style={{ textAlign: 'center', padding: '56px 32px' }}>
          <h2 className="serif-h2">Ready to meet your next partner?</h2>
          <div className="vn-hero-cta" style={{ justifyContent: 'center' }}>
            <Link to="/join" className="btn btn-primary" style={{ textDecoration: 'none', padding: '14px 26px' }}>
              Join now — it takes 5 minutes
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
