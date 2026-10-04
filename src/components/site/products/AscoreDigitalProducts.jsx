import './AscoreDigitalProducts.css';

export default function AscoreDigitalProducts({ courseUrl = '/courses/' }) {
  return (
    <section className="asdp-section" data-theme="light" id="digital-products" aria-labelledby="asdp-title">
      <div className="asdp-inner">
        <div className="asdp-copy">
          <p className="asdp-eyebrow">PRACTICAL SKILLS. YOUR NEXT MOVE.</p>
          <h2 id="asdp-title">Explore our<br /><span>digital products.</span></h2>
          <p className="asdp-description">Build your business skills, one clear step at a time. Discover our practical guides to Meta advertising and AI.</p>
          <div className="asdp-topics"><span>Meta Ads Setup</span><span>ChatGPT, Codex & Claude</span></div>
          <div className="asdp-action-row"><a className="asdp-cta" href={courseUrl}>Explore the courses</a><p className="asdp-price">PDF courses<br /><strong>AED 50 each</strong></p></div>
        </div>
        <a className="asdp-art" href={courseUrl} aria-label="Explore Ascore Meta Ads and Practical AI courses">
          <img src="/images/ascore-course-hero.webp" width="1400" height="1100" loading="lazy" alt="Two Ascore course books, Meta Ads and Practical AI, rendered in 3D with the actual PDF covers" />
          <span className="asdp-caption">Read. Try. Build.</span>
        </a>
      </div>
    </section>
  );
}
