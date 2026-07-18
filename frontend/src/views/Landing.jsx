import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { riseIn, prefersReduced } from '../lib/anim.js';
import './landing.css';

gsap.registerPlugin(ScrollTrigger);

const ACTORS = [
  { dot: 'var(--dot-startup)', title: 'Startups', desc: 'Ideas seeking momentum and the right first partner.' },
  { dot: 'var(--dot-vc)', title: 'Venture capital', desc: 'Capital with a thesis, looking for stage-fit deals.' },
  { dot: 'var(--dot-corp)', title: 'Corporations', desc: 'Scale, distribution, and a pipeline of new technology.' },
  { dot: 'var(--dot-uni)', title: 'Universities', desc: 'Talent, research depth, and licensable IP.' },
  { dot: 'var(--dot-research)', title: 'Research institutes', desc: 'Deep expertise ready to leave the lab.' },
  { dot: 'var(--dot-gov)', title: 'Government', desc: 'Policy, programs, and public-sector demand.' },
];

const GUARANTEES = [
  {
    title: 'Its reasoning',
    body: 'Why this match, why now, and why not the others, in plain language before you spend attention on it.',
  },
  {
    title: 'Its evidence',
    body: 'Every claim carries a source, a confidence, and a date. Where we do not know something, we say so instead of inventing it.',
  },
  {
    title: 'The path to outcome',
    body: 'From a scored match to a bilingual introduction to a human-reviewed handshake, laid out one step at a time.',
  },
];

const REASONS = [
  { k: 'Sector fit', val: 'Agritech thesis overlaps enfarm on soil and yield sensing.' },
  { k: 'Stage fit', val: 'Seed target sits inside the fund’s active check range.' },
  { k: 'Timing', val: 'Fund is deploying this quarter; a tax-credit window is open.' },
];

export default function Landing({ onEnter }) {
  const rootRef = useRef(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      // Hero load-in
      riseIn(root);

      if (prefersReduced()) return;

      // Scroll reveals per section block
      gsap.utils.toArray('.vn-reveal').forEach((el) => {
        gsap.from(el, {
          y: 26,
          autoAlpha: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 82%' },
        });
      });

      // Sticky nav hairline
      ScrollTrigger.create({
        start: 'top -8',
        onUpdate: (self) => {
          const nav = root.querySelector('.vn-nav');
          if (nav) nav.classList.toggle('is-stuck', self.scroll() > 8);
        },
      });

      // Score count-up (motivated: draws the eye to the key fit number)
      gsap.utils.toArray('[data-count]').forEach((el) => {
        const to = Number(el.dataset.count);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: to,
          duration: 1.1,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
          onUpdate: () => {
            el.firstChild.textContent = Math.round(obj.v);
          },
        });
      });

      ScrollTrigger.refresh();
    },
    { scope: rootRef }
  );

  return (
    <div className="vn-landing" id="top" ref={rootRef}>
      <header className="vn-nav">
        <a href="#top" className="vn-nav-brand">
          <img src="/logo.png" alt="VietNexus" />
          <span className="vn-nav-lockup">
            <b>VietNexus</b>
            <small>INNOVATION OS</small>
          </span>
        </a>
        <nav className="vn-nav-links">
          <a href="#ecosystem">Ecosystem</a>
          <a href="#explained">How it works</a>
          <button type="button" className="btn btn-primary" onClick={onEnter}>
            Open the app
          </button>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section className="vn-hero">
          <div className="vn-hero-inner">
            <div>
              <span className="vn-eyebrow vn-hero-eyebrow rise">Innovation OS for Vietnam</span>
              <h1 className="rise">
                Vietnam&rsquo;s innovation ecosystem, matched with{' '}
                <em>the reasoning shown</em>.
              </h1>
              <p className="vn-hero-lede rise">
                VietNexus connects startups with the investors, corporates, and universities that
                fit, and shows why before you commit.
              </p>
              <div className="vn-hero-cta rise">
                <button type="button" className="btn btn-primary btn-lg" onClick={onEnter}>
                  Open the app <span className="btn-arrow">&rarr;</span>
                </button>
                <a href="#explained" className="btn btn-ghost btn-lg">
                  See how a match is explained
                </a>
              </div>
              <div className="vn-hero-meta rise">
                <span>Explainable matches, sources included.</span>
                <span className="vn-hero-flags">
                  <b>VI</b>
                  <b>EN</b>
                </span>
              </div>
            </div>

            {/* Compact match preview — a real VietNexus match, sample organisations */}
            <div className="vn-mc rise">
              <div className="vn-mc-cap">A match, in brief</div>
              <div className="vn-mc-pair">
                <div className="vn-org">
                  <span className="vn-org-mark" style={{ background: '#2f9e78' }}>LV</span>
                  <div>
                    <div className="name">Loopwell</div>
                    <div className="meta">Healthtech seed · Hanoi, 2024</div>
                  </div>
                </div>
                <div className="vn-mc-link">
                  <span>Portfolio overlap with three 2025 seed healthtech rounds.</span>
                </div>
                <div className="vn-org">
                  <span className="vn-org-mark" style={{ background: '#b26f34' }}>MC</span>
                  <div>
                    <div className="name">Mekong Capital Partners</div>
                    <div className="meta">Seed · Healthtech, SaaS</div>
                  </div>
                </div>
              </div>
              <div className="vn-mc-fit">
                <span className="label">Fit score</span>
                <span className="vn-mc-score" data-count="88">
                  <span>88</span>
                  <sub>/100</sub>
                </span>
              </div>
              <p className="vn-mc-why">
                <b>Why now.</b> Average check size lands inside the founder&rsquo;s target range, and
                the fund is actively deploying this quarter.
              </p>
              <div className="vn-mc-foot">
                <span className="vn-chip-draft">Draft intro · VI / EN</span>
                <span className="src">Sample data</span>
              </div>
            </div>
          </div>
        </section>

        {/* ECOSYSTEM */}
        <section id="ecosystem" className="vn-wrap">
          <div className="vn-eco-grid">
            <div className="vn-eco-head vn-reveal">
              <span className="vn-eyebrow">One ecosystem</span>
              <h2 className="vn-serif">Six kinds of players, one flow of knowledge.</h2>
              <p className="vn-lede">
                Startups, capital, corporates, universities, research, and government all move the
                same ideas. VietNexus routes them to each other with intent.
              </p>
            </div>
            <div className="vn-actors vn-reveal">
              {ACTORS.map((a) => (
                <div className="vn-actor" key={a.title}>
                  <div className="vn-actor-top">
                    <span className="dot" style={{ background: a.dot }} />
                    <span className="title">{a.title}</span>
                  </div>
                  <div className="desc">{a.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* EXPLAINED */}
        <section id="explained" className="vn-wrap" style={{ paddingTop: 0 }}>
          <div className="vn-exp-head vn-reveal">
            <h2 className="vn-serif">Not a black box. A recommendation you can question.</h2>
            <p className="vn-lede">
              A fit score is only the start. Every VietNexus match opens with its reasoning, the
              evidence beneath it, and the route from introduction to outcome.
            </p>
          </div>

          <div className="vn-exp-body">
            <div className="vn-guarantees vn-reveal">
              {GUARANTEES.map((g) => (
                <div className="vn-guarantee" key={g.title}>
                  <h3>{g.title}</h3>
                  <p>{g.body}</p>
                </div>
              ))}
            </div>

            {/* Detailed artifact — a real VietNexus match, sample organisations */}
            <div className="vn-detail vn-reveal">
              <div className="vn-detail-head">
                <div>
                  <div className="vn-detail-kicker">Venture capital match</div>
                  <div className="vn-detail-title">enfarm &times; Touchstone Partners</div>
                </div>
                <div className="vn-detail-score" data-count="89">
                  <span>89</span>
                </div>
              </div>

              <div className="vn-reasons">
                {REASONS.map((r) => (
                  <div className="vn-reason" key={r.k}>
                    <div className="k">{r.k}</div>
                    <div className="val">{r.val}</div>
                  </div>
                ))}
              </div>

              <div className="vn-why-now">
                <div className="k">Why now</div>
                <p>
                  Capital is deploying this quarter, and the Q1 R&amp;D tax-credit window makes
                  co-investment materially cheaper.
                </p>
              </div>

              <div className="vn-detail-foot">
                <span className="vn-chip-draft">Draft intro · VI / EN</span>
                <span className="src">Three public sources · sample data</span>
              </div>
            </div>
          </div>
        </section>

        {/* CLOSING CTA */}
        <section className="vn-cta">
          <div className="vn-cta-box vn-reveal">
            <h2>Enter the ecosystem with less guessing and more conviction.</h2>
            <p>
              Build a profile once. Get explainable matches, their sources, and ready-to-send
              introductions in Vietnamese or English.
            </p>
            <button type="button" className="btn btn-on-dark btn-lg" onClick={onEnter}>
              Open the app <span className="btn-arrow">&rarr;</span>
            </button>
          </div>
        </section>
      </main>

      <footer className="vn-footer">
        <div className="vn-footer-inner">
          <div className="vn-footer-brand">
            <img src="/logo.png" alt="VietNexus" />
            <b>VietNexus</b>
          </div>
          <span>Innovation OS for Vietnam</span>
        </div>
      </footer>
    </div>
  );
}
