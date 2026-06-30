import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json()

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API key lipsă' }, { status: 500 })
    }

    let systemPrompt = ''
    let userMessage = ''

    if (type === 'brief') {
      systemPrompt = `Ești un expert în influencer marketing din România. Ajuți brandurile să creeze brief-uri clare și atrăgătoare pentru campanii cu micro-influenceri. Răspunzi DOAR în română. Ești concis și practic.`
      userMessage = `Generează un brief complet pentru o campanie de influencer marketing cu următoarele detalii:
- Produs/Ofertă: ${data.offer_name}
- Valoare: ${data.offer_value} RON
- Descriere: ${data.offer_description || 'nicio descriere'}
- Tip campanie: ${data.campaign_type === 'BARTER' ? 'Barter (produs gratuit)' : 'Plătită'}
- Platforme: ${data.platforms?.join(', ') || 'Instagram, TikTok'}

Generează în format JSON cu exact aceste câmpuri (fără text în afara JSON-ului):
{
  "story_instructions": "instrucțiuni clare pentru ce trebuie să includă în postare (2-4 propoziții)",
  "required_hashtags": "#hashtag1 #hashtag2 #hashtag3 #hashtag4",
  "required_caption": "un caption model pe care influencerul îl poate folosi sau adapta",
  "key_messages": ["mesaj cheie 1", "mesaj cheie 2", "mesaj cheie 3"],
  "forbidden_content": "ce să evite în postare",
  "content_tone": ["autentic", "energic"]
}`

    } else if (type === 'chat') {
      systemPrompt = `Ești asistentul AI al platformei AddFame.ro — platforma #1 de influencer marketing din România. 
Ajuți brandurile să înțeleagă cum funcționează platforma, să lanseze campanii de succes și să colaboreze cu micro-influenceri.
Răspunzi în română, ești prietenos, profesionist și concis (max 3-4 propoziții).
Cunoștințe cheie:
- AddFame conectează branduri cu micro-influenceri din România
- Există campanii Barter (produs gratuit) și Plătite (cash per post)
- Comision platformă: 15% din valoarea colaborării
- Plata se face prin escrow — brandul plătește doar după aprobare
- Influencerii au un Creator Score (Starter/Rising/Pro/Elite)
- WhatsApp reminders automate pentru influenceri
- Contracte digitale incluse`
      userMessage = data.message

    } else if (type === 'recommend') {
      systemPrompt = `Ești un expert în influencer marketing din România. Analizezi campanii și profiluri de influenceri și faci recomandări precise și argumentate. Răspunzi DOAR în română, DOAR JSON valid.`
      const influencersList = (data.influencers || []).slice(0, 50).map((inf: any, i: number) =>
        `${i+1}. ${inf.name} | Nișe: ${inf.niches?.join(', ')} | Oraș: ${inf.city || 'N/A'} | IG: ${inf.ig_followers || 0} followeri | ER: ${inf.ig_engagement_rate || 0}% | TikTok: ${inf.tt_followers || 0} | Verificat: ${inf.is_verified ? 'Da' : 'Nu'}`
      ).join('\n')
      userMessage = `Campania brandului:
- Produs/Brand: ${data.campaign.title}
- Tip: ${data.campaign.type === 'BARTER' ? 'Barter' : 'Plătită'}
- Nișă target: ${data.campaign.niche || 'General'}
- Platforme: ${data.campaign.platforms?.join(', ') || 'Instagram, TikTok'}
- Followeri minimi: ${data.campaign.min_followers || 0}
- Descriere: ${data.campaign.description || 'N/A'}

Lista influenceri disponibili (top 50):
${influencersList}

Alege TOP 5 cei mai potriviți influenceri pentru această campanie și explică de ce fiecare e potrivit.
Răspunde DOAR JSON:
{
  "recommendations": [
    {
      "index": 1,
      "name": "Numele influencerului",
      "reason": "De ce e potrivit pentru această campanie (2 fraze specifice)",
      "score": 95
    }
  ],
  "summary": "O frază despre de ce acești influenceri sunt cei mai buni pentru campanie"
}`

    } else if (type === 'analyze_proof') {
      // ── Funcția 3: Analiză dovezi influencer ──────────────────────────
      systemPrompt = `Ești un expert în influencer marketing care verifică dacă postările respectă brief-ul campaniei. Ești obiectiv, concis și răspunzi DOAR în română, DOAR JSON valid.`
      userMessage = `Analizează această dovadă de postare și verifică dacă respectă cerințele campaniei.

Brief campanie:
- Hashtag-uri obligatorii: ${data.required_hashtags || 'niciun hashtag specificat'}
- Brand de menționat: ${data.brand_name || 'necunoscut'}
- Caption obligatoriu: ${data.required_caption || 'niciun caption specificat'}
- Instrucțiuni: ${data.story_instructions || 'nicio instrucțiune'}

Dovada trimisă de influencer:
- Link post: ${data.proof_link}
- Caption/descriere furnizată: ${data.proof_caption || 'nicio descriere furnizată'}

Verifică și răspunde DOAR JSON:
{
  "approved": true/false,
  "score": 0-100,
  "checks": {
    "hashtags": { "ok": true/false, "detail": "ce hashtag-uri lipsesc sau sunt prezente" },
    "brand_mention": { "ok": true/false, "detail": "menționează sau nu brandul" },
    "caption": { "ok": true/false, "detail": "caption-ul respectă sau nu cerințele" }
  },
  "summary": "rezumat scurt al analizei în 1-2 propoziții",
  "recommendation": "APROBĂ / RESPINGE / VERIFICĂ MANUAL"
}`

    } else if (type === 'campaign_report') {
      // ── Raport campanie AI ────────────────────────────────────────────
      systemPrompt = `Ești un expert în influencer marketing din România. Analizezi rezultatele campaniilor și oferi insights clare și recomandări practice. Răspunzi DOAR în română, DOAR JSON valid, fără text în afara JSON-ului.`

      const infList = (data.influencers || []).map((inf: any, i: number) =>
        `${i+1}. ${inf.name} — ${inf.posts} postări, reach ${inf.reach?.toLocaleString()}, ER mediu ${inf.avg_er}%`
      ).join('\n')

      userMessage = `Analizează rezultatele acestei campanii de influencer marketing:

Campanie: "${data.campaign_title}" — ${data.brand_name}
Tip: ${data.campaign_type === 'BARTER' ? 'Barter' : 'Plătită'}
Platforme: ${data.platforms?.join(', ')}

Rezultate:
- Reach total: ${data.total_reach?.toLocaleString()} persoane
- Engagement total: ${data.total_engagement?.toLocaleString()} interacțiuni
- ER mediu: ${data.avg_er}%
- Total postări: ${data.total_posts}
- Influenceri: ${data.num_influencers}
- Cost campanie: ${data.platform_cost?.toLocaleString()} RON
- Cost tradițional echivalent: ${data.traditional_cost?.toLocaleString()} RON
- Economii: ${data.savings?.toLocaleString()} RON
- Tipuri postări: ${data.post_types}
- Sentiment: ${data.sentiment}

Performanță per influencer:
${infList}

Generează o analiză completă în JSON:
{
  "summary": "rezumat executiv al campaniei în 2-3 propoziții",
  "top_performers": [
    { "name": "Nume influencer", "reason": "de ce a performat cel mai bine (1 frază)" }
  ],
  "insights": [
    "insight 1 specific despre performanța campaniei",
    "insight 2",
    "insight 3"
  ],
  "recommendations": [
    "recomandare 1 pentru campania următoare",
    "recomandare 2",
    "recomandare 3"
  ]
}`

    } else if (type === 'campaign_qa') {
      // ── Funcția 4: Auto-răspuns întrebări influenceri ─────────────────
      systemPrompt = `Ești un asistent care răspunde întrebărilor influencerilor despre o campanie specifică, pe baza brief-ului. Răspunzi în română, ești prietenos, concis (2-3 propoziții max). Dacă nu știi răspunsul din brief, spui că trebuie să contacteze brandul direct.`
      userMessage = `Brief campanie "${data.campaign_title}":
- Brand: ${data.brand_name}
- Tip: ${data.campaign_type === 'BARTER' ? 'Barter (primești produsul gratuit)' : 'Plătită'}
- Instrucțiuni postare: ${data.story_instructions || 'nespecificate'}
- Hashtag-uri: ${data.required_hashtags || 'nespecificate'}
- Caption: ${data.required_caption || 'nespecificat'}
- Mesaje cheie: ${data.key_messages || 'nespecificate'}
- De evitat: ${data.forbidden_content || 'nespecificat'}
- Ton: ${data.content_tone || 'nespecificat'}
- Deadline: ${data.deadline || 'nespecificat'}

Întrebarea influencerului: "${data.question}"

Răspunde direct și util pe baza brief-ului de mai sus.`
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[AI API Error]', err)
      return NextResponse.json({ error: 'Eroare AI' }, { status: 500 })
    }

    const result = await response.json()
    const text = result.content?.[0]?.text || ''

    if (type === 'brief' || type === 'recommend' || type === 'analyze_proof' || type === 'campaign_report') {
      try {
        const clean = text.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)
        if (type === 'brief') return NextResponse.json({ success: true, brief: parsed })
        if (type === 'analyze_proof') return NextResponse.json({ success: true, analysis: parsed })
        if (type === 'campaign_report') return NextResponse.json({ success: true, analysis: parsed })
        return NextResponse.json({ success: true, ...parsed })
      } catch {
        return NextResponse.json({ error: 'Nu am putut parsa răspunsul AI' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: text })
  } catch (e: any) {
    console.error('[AI Route Error]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
