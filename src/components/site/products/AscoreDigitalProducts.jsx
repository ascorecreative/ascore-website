import './AscoreDigitalProducts.css';

export default function AscoreDigitalProducts({ courseUrl = '/courses/' }) {
  return (
    <section className="asdp-section" data-theme="light" id="digital-products" aria-labelledby="asdp-title">
      <div className="asdp-inner">
        <div className="asdp-copy">
          <p className="asdp-eyebrow">PRACTICAL SKILLS. YOUR NEXT MOVE.</p>
          <h2 id="asdp-title">Explore our<br /><span>digital products.</span></h2>
          <p className="asdp-description">Build your business skills, one clear step at a time. Discover our practical guides to Meta advertising and AI.</p>
          <div className="asdp-topics"><span>Mastering Facebook Ads</span><span>ChatGPT, Codex & Claude</span></div>
          <div className="asdp-action-row"><a className="asdp-cta" href={courseUrl}>Explore the courses</a><p className="asdp-price">PDF courses<br /><strong>AED 49.99 each</strong></p></div>
        </div>
        <a className="asdp-art" href={courseUrl} aria-label="Explore Ascore Meta Ads and Practical AI courses">
          <div className="asdp-books">
            <img className="asdp-meta-cover" src="/courses/assets/meta-cover-20261006-whatsapp.webp" width="800" height="1132" loading="lazy" alt="Cover of Mastering Facebook Ads: Meta Ads — Beginner to Expert" />
            <img className="asdp-ai-cover" src="/courses/assets/ai-book.webp" width="850" height="1000" loading="lazy" alt="Practical AI course book" />
          </div>
          <span className="asdp-caption">Read. Try. Build.</span>
        </a>
      </div>
    </section>
  );
}
