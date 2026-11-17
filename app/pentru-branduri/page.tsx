import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight, Users, Wallet, FileText, Package, BarChart3, PenLine, UserCheck, Truck, Clapperboard,
  BadgeCheck, Receipt, ShieldCheck, History, Scale, Copyright, Check, X, Plus, Mail, Sparkles,
} from 'lucide-react'
import SitePage from '@/components/site/SiteShell'
import RevealOnScroll from '@/components/site/RevealOnScroll'

export const metadata: Metadata = {
  title: 'Pentru Branduri — AddFame | Influencer Marketing România',
  description: 'Campanii cu micro-influenceri români, de la brief la raport, într-un singur loc. Preț fix per influencer, fără abonamente.',
}

const LEAD = 'Găsești creatorii potriviți, le trimiți produsul, aprobi conținutul și primești raportul — totul dintr-un singur loc, fără abonamente și fără mesaje pierdute prin DM.'

const STEPS = [
  { Icon: PenLine, title: 'Scrii brieful', desc: 'Produsul, ce trebuie să arate creatorii și ce livrează. Poți da același brief tuturor sau câte un script diferit fiecărui creator.' },
  { Icon: UserCheck, title: 'Alegi creatorii', desc: 'Micro-influencerii din nișa ta aplică singuri. Le vezi profilul, audiența și dacă au mai lucrat cu tine, apoi alegi.' },
  { Icon: Truck, title: 'Trimiți produsul', desc: 'Exporți adresele de livrare dintr-un click. Creatorul confirmă primirea coletului, iar termenul de postare pornește de atunci.' },
  { Icon: Clapperboard, title: 'Aprobi draftul', desc: 'Vezi videoclipul înainte să fie publicat și ceri modificări unde e nevoie. Nimic nu apare pe contul creatorului fără acordul tău.' },
  { Icon: BadgeCheck, title: 'Creatorul postează', desc: 'Postarea apare pe contul lui, cu linkul verificat de echipa AddFame. Știi exact cine a livrat și cine nu.' },
  { Icon: Receipt, title: 'Raport și factură', desc: 'Vizualizări, interacțiuni și engagement pentru fiecare creator, într-un raport gata de trimis, plus factura campaniei.' },
]

const CONTROL = [
  { Icon: Copyright, title: 'Conținut pentru reclame', desc: 'Drepturile de folosire a materialelor sunt stabilite din start, ca să le poți rula în reclame plătite pe Meta sau TikTok.' },
  { Icon: History, title: 'Istoricul fiecărui creator', desc: 'La fiecare aplicant vezi la ce campanii ale tale a mai participat și cum a livrat.' },
  { Icon: Scale, title: 'Termene și litigii', desc: 'Fiecare livrare are un termen. Dacă ceva nu merge, termenul se poate prelungi sau se deschide un litigiu, cu echipa AddFame la mijloc.' },
  { Icon: ShieldCheck, title: 'Profiluri reale', desc: 'Creatorii au conturi verificate și statistici reale. Nu plătești pentru urmăritori cumpărați.' },
]

const FAQ = [
  { q: 'Cât durează să lansez prima campanie?', a: 'Contul îl faci în câteva minute, iar campania o descrii în același timp. Creatorii încep să aplice imediat ce campania e publicată; ritmul îl stabilești tu, prin cât de repede alegi creatorii.' },
  { q: 'Pierd controlul asupra conținutului?', a: 'Nu. Scrii brieful (sau câte un brief pentru fiecare creator), vezi draftul înainte de publicare și poți cere modificări. Creatorul confirmă că a citit brieful înainte să posteze.' },
  { q: 'Ce se întâmplă dacă un creator nu livrează?', a: 'Fiecare colaborare are un termen clar. Dacă e nevoie, termenul se poate prelungi; dacă tot nu livrează, se deschide un litigiu și echipa AddFame intervine.' },
  { q: 'Cât costă?', a: 'Înregistrarea e gratuită și nu există abonament. Plătești o taxă fixă pentru fiecare influencer inclus în campanie, pe care o vezi înainte să publici. Pentru campanii mari îți facem o ofertă personalizată.' },
  { q: 'Pot folosi materialele în reclame?', a: 'Da. Drepturile de utilizare se stabilesc în campanie, iar creatorii le acceptă înainte să trimită postarea, așa că poți refolosi videoclipurile în reclame plătite.' },
]

const BEFORE = ['Cauți creatori pe Instagram, unul câte unul', 'Negociezi prin DM, fără nimic scris', 'Adrese de livrare în zeci de conversații', 'Nu știi cine a postat și când', 'Statistici adunate de mână din capturi']
const AFTER = ['Creatorii potriviți aplică singuri', 'Brief, termene și drepturi clare din start', 'Adresele exportate dintr-un click', 'Fiecare livrare are stare și termen', 'Raport cu cifrele fiecărui creator']

const CSS = `
.pb{--bg0:#0d0a22;--bg1:#151033;--card:#1b1540;--card2:#221a4f;--ln:rgba(255,255,255,.09);--tx:#f4f2ff;--tx2:#b9b4dc;--tx3:#8a84b3;--gr:linear-gradient(120deg,#3ab4ff 0%,#6f6bff 45%,#a36bff 100%);background:var(--bg0);color:var(--tx)}
.pb section{position:relative}
.pb h1,.pb h2,.pb h3{color:var(--tx);margin:0}
.pb p{margin:0}
.pb .acc{background:var(--gr);-webkit-background-clip:text;background-clip:text;color:transparent}
.pb-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--tx2);padding:6px 12px;border:1px solid var(--ln);border-radius:999px;background:rgba(255,255,255,.03);align-self:flex-start}
.pb-h2{font-size:clamp(32px,4.6vw,56px);line-height:1.04;letter-spacing:-.035em;font-weight:800;text-wrap:balance}
.pb-sub{color:var(--tx2);font-size:clamp(16px,1.5vw,18px);line-height:1.6;max-width:40em}
.pb-sec{padding-block:clamp(72px,10vw,128px)}
.pb-head{display:flex;flex-direction:column;gap:16px;margin-bottom:clamp(36px,5vw,56px);max-width:760px}
.pb-hero{padding-block:clamp(64px,9vw,120px) clamp(72px,9vw,112px);overflow:hidden;background:radial-gradient(900px 500px at 85% 10%,rgba(111,107,255,.22),transparent 60%),radial-gradient(700px 420px at 0% 100%,rgba(58,160,255,.14),transparent 60%),var(--bg0)}
.pb-hero-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(32px,5vw,72px);align-items:center}
.pb-h1{font-size:clamp(40px,6.4vw,78px);line-height:1;letter-spacing:-.045em;font-weight:800;margin-top:20px!important;text-wrap:balance}
.pb-lead{margin-top:24px!important;font-size:clamp(17px,1.6vw,20px);line-height:1.6;color:var(--tx2);max-width:34em}
.pb-lead .w{display:inline-block;opacity:0;transform:translateY(8px);filter:blur(4px);animation:pbWord .6s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes pbWord{to{opacity:1;transform:none;filter:none}}
.pb-ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.pb-btn{display:inline-flex;align-items:center;gap:8px;min-height:50px;padding:0 22px;border-radius:14px;font-weight:700;font-size:15px;text-decoration:none;transition:transform .2s,box-shadow .2s,background .2s}
.pb-btn-p{background:var(--gr);color:#fff;box-shadow:0 10px 30px -10px rgba(111,107,255,.7)}
.pb-btn-p:hover{transform:translateY(-2px);box-shadow:0 16px 40px -12px rgba(111,107,255,.85)}
.pb-btn-g{color:var(--tx);border:1px solid var(--ln);background:rgba(255,255,255,.04)}
.pb-btn-g:hover{background:rgba(255,255,255,.08)}
.pb-btn svg{transition:transform .2s}.pb-btn:hover svg{transform:translateX(3px)}
.pb-trust{display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:28px;color:var(--tx3);font-size:14px}
.pb-trust span{display:inline-flex;align-items:center;gap:6px}.pb-trust svg{color:#5ee0a8}
.pb-mock{position:relative;border:1px solid var(--ln);border-radius:24px;background:linear-gradient(180deg,var(--card2),var(--card));padding:22px;box-shadow:0 40px 80px -30px rgba(0,0,0,.6);animation:pbFloat 7s ease-in-out infinite}
@keyframes pbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
.pb-mock-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
.pb-chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:5px 10px;border-radius:999px;background:rgba(94,224,168,.12);color:#5ee0a8}
.pb-chip i{width:7px;height:7px;border-radius:50%;background:#5ee0a8;animation:pbPulse 1.6s infinite}
@keyframes pbPulse{0%{box-shadow:0 0 0 0 rgba(94,224,168,.6)}100%{box-shadow:0 0 0 8px rgba(94,224,168,0)}}
.pb-mock h3{font-size:19px;margin-top:14px!important;letter-spacing:-.01em}
.pb-mock-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px}
.pb-mock-stats div{background:rgba(255,255,255,.04);border:1px solid var(--ln);border-radius:14px;padding:12px}
.pb-mock-stats b{display:block;font-size:24px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.pb-mock-stats span{font-size:12px;color:var(--tx3)}
.pb-apps{display:flex;flex-direction:column;gap:8px;margin-top:14px}
.pb-app{display:grid;grid-template-columns:36px 1fr auto;gap:10px;align-items:center;padding:10px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--ln);opacity:0;transform:translateX(16px);animation:pbIn .6s cubic-bezier(.2,.7,.2,1) forwards}
.pb-app:nth-child(1){animation-delay:.9s}.pb-app:nth-child(2){animation-delay:1.3s}.pb-app:nth-child(3){animation-delay:1.7s}
@keyframes pbIn{to{opacity:1;transform:none}}
.pb-av{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;color:#fff}
.pb-app b{font-size:14px;display:block}.pb-app small{font-size:12px;color:var(--tx3)}
.pb-sel{font-size:11.5px;font-weight:800;padding:5px 10px;border-radius:999px;background:rgba(139,108,255,.16);color:#c3b4ff}
.pb-prog{margin-top:16px}
.pb-prog-row{display:flex;justify-content:space-between;font-size:13px;color:var(--tx2)}
.pb-bar{height:8px;border-radius:9px;background:rgba(255,255,255,.07);margin-top:8px;overflow:hidden}
.pb-bar i{display:block;height:100%;width:0;border-radius:9px;background:var(--gr);animation:pbGrow 2.2s 1s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes pbGrow{to{width:70%}}
.pb-toast{position:absolute;left:-28px;bottom:-22px;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;background:#fff;color:#14123a;font-size:13px;font-weight:700;box-shadow:0 20px 40px -16px rgba(0,0,0,.5);opacity:0;transform:translateY(10px);animation:pbIn .6s 2.6s forwards}
.pb-toast span{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:var(--gr);color:#fff}
.pb-bento{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px}
.pb-card{position:relative;border:1px solid var(--ln);border-radius:24px;background:linear-gradient(180deg,var(--card),var(--bg1));padding:26px;overflow:hidden;display:flex;flex-direction:column;gap:10px;transition:border-color .3s,transform .3s}
.pb-card:hover{border-color:rgba(139,108,255,.45);transform:translateY(-3px)}
.pb-card h3{font-size:21px;letter-spacing:-.015em}
.pb-card p{color:var(--tx2);font-size:15px;line-height:1.55}
.pb-ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(139,108,255,.14);color:#c3b4ff;flex:none}
.c-a{grid-column:span 4}.c-b{grid-column:span 2}.c-c{grid-column:span 2}.c-d{grid-column:span 2}.c-e{grid-column:span 2}
.pb-art{flex:1;min-height:150px;display:grid;place-items:center;margin-bottom:6px}
.art-match{display:flex;flex-direction:column;gap:8px;width:min(360px,100%)}
.art-match div{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid var(--ln);font-size:13px}
.art-match b{font-size:13px;color:#5ee0a8;font-variant-numeric:tabular-nums;width:36px;text-align:right}
.art-match em{width:26px;height:26px;border-radius:50%;flex:none}
.art-match .lb{width:96px;flex:none}
.art-match .ln{flex:1;height:7px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden}
.art-match .ln i{display:block;height:100%;background:var(--gr);border-radius:9px;transform-origin:left;transform:scaleX(var(--w))}
.rv-on .art-match .ln i{transform:scaleX(0);transition:transform 1.2s .2s cubic-bezier(.2,.7,.2,1)}
.rv-on .in .art-match .ln i{transform:scaleX(var(--w))}
.art-price{text-align:center}
.art-price b{display:block;font-size:52px;font-weight:800;letter-spacing:-.03em;background:var(--gr);-webkit-background-clip:text;background-clip:text;color:transparent}
.art-price span{color:var(--tx3);font-size:13px}
.art-doc{width:150px;padding:14px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid var(--ln);display:flex;flex-direction:column;gap:9px}
.art-doc div{display:flex;align-items:center;gap:8px}
.art-doc i{flex:1;height:7px;border-radius:9px;background:rgba(255,255,255,.1)}
.art-doc svg{color:#5ee0a8}
.rv-on .art-doc svg{opacity:0;transform:scale(.4);transition:.4s}
.rv-on .in .art-doc svg{opacity:1;transform:none}
.rv-on .in .art-doc div:nth-child(2) svg{transition-delay:.3s}.rv-on .in .art-doc div:nth-child(3) svg{transition-delay:.6s}.rv-on .in .art-doc div:nth-child(4) svg{transition-delay:.9s}
.art-ship{width:min(260px,100%)}
.art-track{position:relative;height:6px;border-radius:9px;background:rgba(255,255,255,.08);margin:30px 0 14px}
.art-track i{position:absolute;inset:0 auto 0 0;width:100%;border-radius:9px;background:var(--gr)}
.art-box{position:absolute;top:-34px;left:calc(100% - 32px);width:32px;height:32px;border-radius:10px;background:#fff;color:#5a35e6;display:grid;place-items:center}
.rv-on .art-track i{width:0;transition:width 1.6s .2s cubic-bezier(.2,.7,.2,1)}
.rv-on .art-box{left:0;transition:left 1.6s .2s cubic-bezier(.2,.7,.2,1)}
.rv-on .in .art-track i{width:100%}.rv-on .in .art-box{left:calc(100% - 32px)}
.art-ship ul{display:flex;justify-content:space-between;list-style:none;margin:0;padding:0;font-size:12px;color:var(--tx3)}
.art-bars{display:flex;align-items:flex-end;gap:10px;height:120px}
.art-bars i{width:22px;border-radius:8px 8px 4px 4px;background:var(--gr);height:var(--h)}
.rv-on .art-bars i{height:8%;transition:height 1.2s cubic-bezier(.2,.7,.2,1)}
.rv-on .in .art-bars i{height:var(--h)}
.rv-on .in .art-bars i:nth-child(2){transition-delay:.1s}.rv-on .in .art-bars i:nth-child(3){transition-delay:.2s}.rv-on .in .art-bars i:nth-child(4){transition-delay:.3s}.rv-on .in .art-bars i:nth-child(5){transition-delay:.4s}.rv-on .in .art-bars i:nth-child(6){transition-delay:.5s}
.pb-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.pb-step{position:relative;border:1px solid var(--ln);border-radius:22px;padding:24px;background:rgba(255,255,255,.02);display:flex;flex-direction:column;gap:12px;overflow:hidden}
.pb-step-top{display:flex;justify-content:space-between;align-items:center}
.pb-step-n{font-size:13px;font-weight:800;color:var(--tx3);font-variant-numeric:tabular-nums;letter-spacing:.06em}
.pb-step h3{font-size:19px}
.pb-step p{color:var(--tx2);font-size:15px;line-height:1.55}
.pb-step::before{content:'';position:absolute;left:0;right:0;top:0;height:2px;background:var(--gr)}
.rv-on .pb-step::before{transform:scaleX(0);transform-origin:left;transition:transform .9s .3s cubic-bezier(.2,.7,.2,1)}
.rv-on .pb-step.in::before{transform:scaleX(1)}
.pb-cmp{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.pb-cmp-col{border-radius:24px;padding:28px;border:1px solid var(--ln)}
.pb-cmp-col h3{font-size:18px;margin-bottom:16px!important;display:flex;align-items:center;gap:10px}
.pb-cmp-col ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.pb-cmp-col li{display:flex;gap:10px;align-items:flex-start;font-size:15.5px;line-height:1.45}
.pb-cmp-col li svg{flex:none;margin-top:2px}
.pb-bad{background:rgba(255,255,255,.02)}.pb-bad li{color:var(--tx3)}.pb-bad li svg{color:#ff7a90}
.pb-good{background:linear-gradient(160deg,rgba(111,107,255,.18),rgba(58,160,255,.06));border-color:rgba(139,108,255,.4)}.pb-good li svg{color:#5ee0a8}
.pb-ctrl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.pb-ctrl .pb-card{padding:22px}
.pb-ctrl h3{font-size:17px}
.pb-faq-grid{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(24px,5vw,64px);align-items:start}
.pb-faq{display:flex;flex-direction:column;gap:10px}
.pb-faq details{border:1px solid var(--ln);border-radius:18px;background:rgba(255,255,255,.02);transition:background .2s,border-color .2s}
.pb-faq details[open]{background:rgba(139,108,255,.08);border-color:rgba(139,108,255,.35)}
.pb-faq summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:14px;padding:18px 20px;font-weight:700;font-size:16px}
.pb-faq summary::-webkit-details-marker{display:none}
.pb-faq summary small{font-size:12px;color:var(--tx3);font-weight:800;font-variant-numeric:tabular-nums}
.pb-faq summary svg{margin-left:auto;flex:none;transition:transform .25s;color:var(--tx2)}
.pb-faq details[open] summary svg{transform:rotate(45deg)}
.pb-faq details p{padding:0 20px 18px 52px;color:var(--tx2);font-size:15px;line-height:1.6}
.pb-ask{border:1px solid var(--ln);border-radius:22px;padding:24px;background:rgba(255,255,255,.03);display:flex;flex-direction:column;gap:12px;margin-top:24px}
.pb-ask a{color:#c3b4ff;font-weight:700;text-decoration:none;display:inline-flex;gap:8px;align-items:center}
.pb-cta{position:relative;overflow:hidden;border-radius:32px;padding:clamp(40px,6vw,72px) clamp(20px,5vw,72px);text-align:center;background:radial-gradient(600px 300px at 50% 0%,rgba(163,107,255,.45),transparent 70%),linear-gradient(180deg,var(--card2),var(--bg1));border:1px solid rgba(139,108,255,.35)}
.pb-cta .pb-ctas{justify-content:center}
.pb-cta .pb-sub{margin-inline:auto;margin-top:16px!important}
.rv-on .rv{opacity:0;transform:translateY(24px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}
.rv-on .rv.in{opacity:1;transform:none}
.rv-on .rv.d1{transition-delay:.08s}.rv-on .rv.d2{transition-delay:.16s}.rv-on .rv.d3{transition-delay:.24s}
@media (max-width:980px){
  .pb-hero-grid,.pb-faq-grid{grid-template-columns:minmax(0,1fr)}
  .pb-mock{max-width:520px}
  .pb-bento{grid-template-columns:repeat(2,minmax(0,1fr))}
  .c-b,.c-c,.c-d,.c-e{grid-column:span 1}.c-a{grid-column:span 2}
  .pb-steps,.pb-ctrl{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:640px){
  .pb-bento,.pb-steps,.pb-ctrl,.pb-cmp{grid-template-columns:minmax(0,1fr)}
  .c-a{grid-column:span 1}
  .pb-toast{left:12px}
  .art-match .lb{width:72px}
}
@media (prefers-reduced-motion:reduce){
  .pb *,.pb *::before{animation:none!important;transition:none!important}
  .pb-lead .w,.pb-app,.pb-toast{opacity:1!important;transform:none!important;filter:none!important}
  .pb-bar i{width:70%!important}
}
`

const AV = [['AM', '#ff8a65'], ['RV', '#4fc3f7'], ['IC', '#ba68c8']]

export default function PentruBranduri() {
  const words = LEAD.split(' ')
  return (
    <SitePage>
      <style>{CSS}</style>
      <RevealOnScroll />
      <div className="pb">

        {/* HERO */}
        <section className="pb-hero">
          <div className="af-wrap pb-hero-grid">
            <div>
              <span className="pb-eyebrow"><Sparkles size={14} aria-hidden="true" /> Pentru branduri</span>
              <h1 className="pb-h1">Campanii cu influenceri care <span className="acc">se văd în rezultate</span></h1>
              <p className="pb-lead">
                <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{LEAD}</span>
                {words.map((w, i) => <span key={i} className="w" aria-hidden="true" style={{ animationDelay: `${0.25 + i * 0.035}s` }}>{w}&nbsp;</span>)}
              </p>
              <div className="pb-ctas">
                <Link href="/auth/register?type=brand" className="pb-btn pb-btn-p">Începe gratuit <ArrowRight size={18} aria-hidden="true" /></Link>
                <Link href="/demo-campanie" className="pb-btn pb-btn-g">Vezi o campanie demo</Link>
              </div>
              <div className="pb-trust">
                <span><Check size={16} aria-hidden="true" /> Fără abonament</span>
                <span><Check size={16} aria-hidden="true" /> Preț fix per influencer</span>
                <span><Check size={16} aria-hidden="true" /> Fără card de credit</span>
              </div>
            </div>

            <div style={{ position: 'relative' }} aria-hidden="true">
              <div className="pb-mock">
                <div className="pb-mock-top">
                  <span className="pb-chip"><i /> Campanie activă</span>
                  <span style={{ fontSize: 12, color: 'var(--tx3)' }}>Exemplu</span>
                </div>
                <h3>Lansare colecție de toamnă</h3>
                <div className="pb-mock-stats">
                  <div><b data-count="10">10</b><span>locuri</span></div>
                  <div><b data-count="34">34</b><span>aplicări</span></div>
                  <div><b data-count="10">10</b><span>selectați</span></div>
                </div>
                <div className="pb-apps">
                  {[['Andreea M.', 'Beauty · Instagram · 18K'], ['Radu V.', 'Fitness · TikTok · 9K'], ['Ioana C.', 'Lifestyle · Instagram · 24K']].map(([n, s], i) => (
                    <div key={n} className="pb-app">
                      <span className="pb-av" style={{ background: AV[i][1] }}>{AV[i][0]}</span>
                      <span><b>{n}</b><small>{s}</small></span>
                      <span className="pb-sel">Selectat</span>
                    </div>
                  ))}
                </div>
                <div className="pb-prog">
                  <div className="pb-prog-row"><span>Postări aprobate</span><b style={{ color: 'var(--tx)' }}>7 din 10</b></div>
                  <div className="pb-bar"><i /></div>
                </div>
              </div>
              <div className="pb-toast"><span><Check size={16} /></span> Ioana C. a postat — draft aprobat</div>
            </div>
          </div>
        </section>

        {/* BENTO */}
        <section className="pb-sec" style={{ background: 'var(--bg1)' }}>
          <div className="af-wrap">
            <div className="pb-head rv">
              <span className="pb-eyebrow">De ce AddFame</span>
              <h2 className="pb-h2">Toată colaborarea, <span className="acc">într-un singur loc</span></h2>
            </div>
            <div className="pb-bento">
              <div className="pb-card c-a rv">
                <div className="pb-art">
                  <div className="art-match">
                    {([['#ff8a65', 'Beauty', 92], ['#4fc3f7', 'Mame & copii', 87], ['#ba68c8', 'Lifestyle', 78]] as const).map(([c, l, w]) => (
                      <div key={l}><em style={{ background: c }} /><span className="lb">{l}</span><span className="ln"><i style={{ ['--w' as string]: String(w / 100) } as React.CSSProperties} /></span><b>{w}%</b></div>
                    ))}
                  </div>
                </div>
                <span className="pb-ic"><Users size={20} aria-hidden="true" /></span>
                <h3>Creatorii potriviți vin la tine</h3>
                <p>Micro-influencerii din nișa și orașul tău văd campania și aplică singuri. Tu vezi profilul, audiența și istoricul fiecăruia, apoi alegi.</p>
              </div>
              <div className="pb-card c-b rv d1">
                <div className="pb-art"><div className="art-price"><b>0 lei</b><span>abonament lunar</span></div></div>
                <span className="pb-ic"><Wallet size={20} aria-hidden="true" /></span>
                <h3>Preț fix, fără surprize</h3>
                <p>Plătești o taxă fixă pentru fiecare influencer și vezi costul total înainte să publici.</p>
              </div>
              <div className="pb-card c-c rv">
                <div className="pb-art">
                  <div className="art-doc">
                    <div><i style={{ maxWidth: '70%' }} /></div>
                    <div><i /><Check size={14} /></div>
                    <div><i /><Check size={14} /></div>
                    <div><i /><Check size={14} /></div>
                  </div>
                </div>
                <span className="pb-ic"><FileText size={20} aria-hidden="true" /></span>
                <h3>Briefuri pe care le citesc</h3>
                <p>Același brief pentru toți sau un script diferit pentru fiecare. Creatorul confirmă că l-a citit înainte să posteze.</p>
              </div>
              <div className="pb-card c-d rv d1">
                <div className="pb-art">
                  <div className="art-ship">
                    <div className="art-track"><i /><span className="art-box"><Package size={17} /></span></div>
                    <ul><li>Adresă</li><li>Trimis</li><li>Primit</li></ul>
                  </div>
                </div>
                <span className="pb-ic"><Package size={20} aria-hidden="true" /></span>
                <h3>Colete fără haos</h3>
                <p>Adresele de livrare exportate dintr-un click, iar creatorul confirmă primirea.</p>
              </div>
              <div className="pb-card c-e rv d2">
                <div className="pb-art">
                  <div className="art-bars">
                    {[38, 62, 48, 80, 66, 95].map((h, i) => <i key={i} style={{ ['--h' as string]: `${h}%` } as React.CSSProperties} />)}
                  </div>
                </div>
                <span className="pb-ic"><BarChart3 size={20} aria-hidden="true" /></span>
                <h3>Rapoarte gata de trimis</h3>
                <p>Vizualizări, interacțiuni și engagement pentru fiecare creator, într-un raport PDF.</p>
              </div>
            </div>
          </div>
        </section>

        {/* PAȘI */}
        <section className="pb-sec">
          <div className="af-wrap">
            <div className="pb-head rv">
              <span className="pb-eyebrow">Cum funcționează</span>
              <h2 className="pb-h2">De la brief <span className="acc">la raport.</span></h2>
              <p className="pb-sub">Fiecare etapă are loc în platformă. Nimic nu se pierde într-un tabel sau într-o conversație de pe Instagram.</p>
            </div>
            <div className="pb-steps">
              {STEPS.map(({ Icon, title, desc }, i) => (
                <div key={title} className={`pb-step rv d${i % 3}`}>
                  <div className="pb-step-top">
                    <span className="pb-ic"><Icon size={20} aria-hidden="true" /></span>
                    <span className="pb-step-n">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMPARAȚIE */}
        <section className="pb-sec" style={{ background: 'var(--bg1)' }}>
          <div className="af-wrap">
            <div className="pb-head rv">
              <span className="pb-eyebrow">Fără bătăi de cap</span>
              <h2 className="pb-h2">Influencer marketing, <span className="acc">fără haos</span></h2>
              <p className="pb-sub">Căutatul creatorilor, negocierile prin mesaje și statisticile adunate de mână consumă zile întregi. AddFame le pune pe toate într-un singur proces.</p>
            </div>
            <div className="pb-cmp">
              <div className="pb-cmp-col pb-bad rv">
                <h3><X size={18} color="#ff7a90" aria-hidden="true" /> Fără AddFame</h3>
                <ul>{BEFORE.map(t => <li key={t}><X size={17} aria-hidden="true" />{t}</li>)}</ul>
              </div>
              <div className="pb-cmp-col pb-good rv d1">
                <h3><Check size={18} color="#5ee0a8" aria-hidden="true" /> Cu AddFame</h3>
                <ul>{AFTER.map(t => <li key={t}><Check size={17} aria-hidden="true" />{t}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        {/* CONTROL */}
        <section className="pb-sec">
          <div className="af-wrap">
            <div className="pb-head rv">
              <span className="pb-eyebrow">Control</span>
              <h2 className="pb-h2">Tu decizi, <span className="acc">noi organizăm.</span></h2>
            </div>
            <div className="pb-ctrl">
              {CONTROL.map(({ Icon, title, desc }, i) => (
                <div key={title} className={`pb-card rv d${i}`}>
                  <span className="pb-ic"><Icon size={20} aria-hidden="true" /></span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="pb-sec" style={{ background: 'var(--bg1)' }}>
          <div className="af-wrap pb-faq-grid">
            <div className="rv">
              <span className="pb-eyebrow">Întrebări</span>
              <h2 className="pb-h2" style={{ marginTop: 16 }}>Ce ne întreabă <span className="acc">brandurile</span></h2>
              <div className="pb-ask">
                <b>Nu ai găsit răspunsul?</b>
                <p className="pb-sub" style={{ fontSize: 15 }}>Scrie-ne și îți răspunde un om din echipă.</p>
                <a href="mailto:contact@addfame.ro"><Mail size={16} aria-hidden="true" /> contact@addfame.ro</a>
              </div>
            </div>
            <div className="pb-faq rv d1">
              {FAQ.map(({ q, a }, i) => (
                <details key={q} open={i === 0}>
                  <summary><small>{String(i + 1).padStart(2, '0')}</small>{q}<Plus size={18} aria-hidden="true" /></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-sec">
          <div className="af-wrap">
            <div className="pb-cta rv">
              <h2 className="pb-h2">Găsește creatorii pentru <span className="acc">următoarea ta campanie</span></h2>
              <p className="pb-sub">Înregistrarea e gratuită. Plătești doar pentru influencerii din campanie.</p>
              <div className="pb-ctas">
                <Link href="/auth/register?type=brand" className="pb-btn pb-btn-p">Înregistrează-te gratuit <ArrowRight size={18} aria-hidden="true" /></Link>
                <Link href="/contact" className="pb-btn pb-btn-g">Cere o ofertă</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SitePage>
  )
}
