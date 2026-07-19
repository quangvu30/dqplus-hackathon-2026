import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { discover } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { riseIn } from '../lib/anim';
import { EmptyState } from '../components/ui';
import { SECTORS, STAGES, REGIONS } from '../data/ecosystem';
import { cap, money, INVESTOR_TYPES } from '../lib/format';

function Card({ item, rank, score, rationale, to }) {
  return (
    <Link to={to} className="vn-match-card rise">
      {rank != null ? <span className="vn-match-rank">#{rank}</span> : <span />}
      {score != null ? (
        <span className="vn-match-score">{score}</span>
      ) : (
        <span
          className="dot"
          style={{ width: 40, height: 40, borderRadius: 12, background: item.role === 'founder' ? '#3f8f6b22' : '#b0863622' }}
        />
      )}
      <div>
        <div className="vn-match-type">
          <span className="dot" style={{ background: item.role === 'founder' ? '#3f8f6b' : '#b08636' }} />
          {item.role === 'founder'
            ? 'Startup' + (item.stage ? ' · ' + cap(item.stage) : '')
            : INVESTOR_TYPES[item.investorType] || 'Investor'}
        </div>
        <h3 className="vn-match-name">{item.displayName}</h3>
        <p className="vn-match-rationale">
          {rationale || item.headline || (item.sectors || []).map(cap).join(', ')}
        </p>
      </div>
      <span className="vn-match-analysis">View →</span>
    </Link>
  );
}

function MatchSkeletonList({ count = 4 }) {
  return (
    <div className="vn-match-list" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="vn-match-skeleton" key={i}>
          <span className="vn-match-skeleton-block" />
          <span className="vn-match-skeleton-block vn-match-skeleton-score" />
          <span className="vn-match-skeleton-lines">
            <span className="vn-match-skeleton-block" />
            <span className="vn-match-skeleton-block" />
            <span className="vn-match-skeleton-block" />
          </span>
        </div>
      ))}
    </div>
  );
}

function FilterPanel({ filters, setFilters, targetRole }) {
  const toggleSector = (id) => setFilters((f) => ({ ...f, sector: f.sector === id ? '' : id }));
  return (
    <div className="card vn-filter-panel">
      <div className="vn-filter-group">
        <div className="card-label">Search</div>
        <input
          className="input"
          placeholder="Name or headline…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
      </div>
      <div className="vn-filter-group">
        <div className="card-label">Sector</div>
        <div className="vn-filter-chips">
          {SECTORS.map((s) => (
            <button
              key={s.id}
              className={'chip' + (filters.sector === s.id ? ' on' : '')}
              onClick={() => toggleSector(s.id)}
              type="button"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="vn-filter-group">
        <div className="card-label">Stage</div>
        <select className="select" value={filters.stage} onChange={(e) => setFilters((f) => ({ ...f, stage: e.target.value }))}>
          <option value="">Any stage</option>
          {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div className="vn-filter-group">
        <div className="card-label">Region</div>
        <select className="select" value={filters.region} onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}>
          <option value="">Anywhere</option>
          {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div className="vn-filter-group">
        <div className="card-label">{targetRole === 'investor' ? 'Funding ask (USD)' : 'Check size (USD)'}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Min" type="number" value={filters.check_min}
            onChange={(e) => setFilters((f) => ({ ...f, check_min: e.target.value }))} />
          <input className="input" placeholder="Max" type="number" value={filters.check_max}
            onChange={(e) => setFilters((f) => ({ ...f, check_max: e.target.value }))} />
        </div>
      </div>
    </div>
  );
}

export default function Browse() {
  const { role } = useAuth();
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') || 'recommended';
  const targetRole = role === 'founder' ? 'investor' : 'founder';
  const scope = useRef(null);

  const [filters, setFilters] = useState({
    q: '', sector: params.get('sector') || '', stage: '', region: '', check_min: '', check_max: '',
  });
  const [browseItems, setBrowseItems] = useState(null);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browsePage, setBrowsePage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recItems, setRecItems] = useState(null);
  const [recMode, setRecMode] = useState('hybrid');
  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const setMode = (m) => setParams((p) => { p.set('mode', m); return p; }, { replace: true });

  useEffect(() => {
    let alive = true;
    if (mode === 'ai') return;
    setLoading(true);
    setError(null);
    setBrowsePage(1);
    const task = mode === 'recommended'
      ? discover.recommended({ limit: 10, rerank: true }).then((d) => {
          if (!alive) return;
          setRecItems(d.matches);
          setRecMode(d.mode);
        })
      : discover.browse({
          sector: filters.sector, stage: filters.stage, region: filters.region,
          check_min: filters.check_min, check_max: filters.check_max, q: filters.q, page: 1,
        }).then((d) => {
          if (!alive) return;
          setBrowseItems(d.items);
          setBrowseTotal(d.total);
        });
    task.catch((err) => alive && setError(err)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [mode, filters.sector, filters.stage, filters.region, filters.check_min, filters.check_max, filters.q]);

  const loadMoreBrowse = async () => {
    setLoadingMore(true);
    try {
      const nextPage = browsePage + 1;
      const d = await discover.browse({
        sector: filters.sector, stage: filters.stage, region: filters.region,
        check_min: filters.check_min, check_max: filters.check_max, q: filters.q, page: nextPage,
      });
      setBrowseItems((prev) => [...(prev || []), ...d.items]);
      setBrowseTotal(d.total);
      setBrowsePage(nextPage);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!loading) riseIn(scope.current);
  }, [loading, mode]);

  const runAiFilter = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiBusy(true);
    setError(null);
    try {
      const result = await discover.nlFilter(aiQuery.trim());
      setAiResult(result);
    } catch (err) {
      setError(err);
    } finally {
      setAiBusy(false);
    }
  };

  const interpreted = aiResult?.interpretedFilters;
  const chips = useMemo(() => {
    if (!interpreted) return [];
    const out = [];
    interpreted.sectors?.forEach((s) => out.push(cap(s)));
    interpreted.stages?.forEach((s) => out.push(cap(s)));
    interpreted.regions?.forEach((r) => out.push(cap(r)));
    if (interpreted.checkSizeMinUsd || interpreted.checkSizeMaxUsd) {
      out.push(`${money(interpreted.checkSizeMinUsd) || '$0'}–${money(interpreted.checkSizeMaxUsd) || '∞'}`);
    }
    return out;
  }, [interpreted]);

  return (
    <div className="vn-page">
      <div className="eyebrow rise">Discover</div>
      <h1 className="serif-h1 rise" style={{ marginTop: 10 }}>
        {targetRole === 'investor' ? 'Investors for your raise' : 'Startups to back'}
      </h1>
      <div className="seg vn-match-tabs rise" style={{ marginTop: 20 }}>
        {[
          { id: 'recommended', label: 'Recommended' },
          { id: 'all', label: 'All' },
          { id: 'ai', label: 'AI Filter' },
        ].map((t) => (
          <button key={t.id} className={'seg-btn' + (mode === t.id ? ' active' : '')} onClick={() => setMode(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {mode === 'ai' && (
        <div className="card rise" style={{ marginTop: 20 }}>
          <form onSubmit={runAiFilter} style={{ display: 'flex', gap: 10 }}>
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder='e.g. "Fintech founders in HCMC raising seed under $500k"'
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
            />
            <button className="btn btn-primary" disabled={aiBusy}>{aiBusy ? 'Thinking…' : 'Search'}</button>
          </form>
          {chips.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="card-label" style={{ marginBottom: 8 }}>How the AI interpreted your query</div>
              <div className="vn-filter-chips">
                {chips.map((c) => <span key={c} className="chip on" style={{ padding: '5px 10px', fontSize: 12 }}>{c}</span>)}
                {!interpreted.usedLlm && (
                  <span className="chip" style={{ padding: '5px 10px', fontSize: 12 }}>semantic search only</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {mode !== 'ai' ? (
        <div className="vn-browse">
          <FilterPanel filters={filters} setFilters={setFilters} targetRole={targetRole} />
          <div ref={scope}>
            {loading && <MatchSkeletonList count={mode === 'recommended' ? 3 : 6} />}
            {!loading && error && (
              <EmptyState title="Couldn't load results" body={error.message} onRetry={() => setFilters((f) => ({ ...f }))} />
            )}
            {!loading && !error && mode === 'recommended' && (
              <>
                {recItems?.length === 0 && (
                  <EmptyState
                    title="No recommendations yet"
                    body="Complete your profile so we can build your match signals, or try Browse instead."
                  />
                )}
                <div className="vn-match-list">
                  {(recItems || []).map((m, i) => (
                    <Card
                      key={m.userId}
                      item={m}
                      rank={i + 1}
                      score={m.composite != null ? m.composite : Math.round((m.score || 0) * 100)}
                      rationale={recMode === 'llm-rerank' ? m.rationaleEn : (m.reasons || []).join(' · ')}
                      to={`/app/p/${m.profileId}`}
                    />
                  ))}
                </div>
              </>
            )}
            {!loading && !error && mode === 'all' && (
              <>
                {browseItems?.length === 0 && <EmptyState title="No matches for these filters" body="Try widening your search." />}
                {browseItems?.length > 0 && (
                  <div className="card-label" style={{ marginBottom: 10 }}>
                    Showing {browseItems.length} of {browseTotal}
                  </div>
                )}
                <div className="vn-match-list">
                  {(browseItems || []).map((it) => (
                    <Card key={it.userId} item={it} to={`/app/p/${it.profileId}`} />
                  ))}
                </div>
                {browseItems && browseItems.length < browseTotal && (
                  <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <button className="btn btn-ghost" onClick={loadMoreBrowse} disabled={loadingMore}>
                      {loadingMore ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div ref={scope} style={{ marginTop: 20 }}>
          {error && <EmptyState title="AI filter failed" body={error.message} />}
          {aiResult && (
            <div className="vn-match-list">
              {aiResult.items.length === 0 && <EmptyState title="No matches" body="Try a broader description." />}
              {aiResult.items.map((it) => (
                <Card key={it.userId} item={it} to={`/app/p/${it.profileId}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
