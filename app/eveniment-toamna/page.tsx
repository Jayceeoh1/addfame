import EventSignupForm from '@/components/events/EventSignupForm'

// Formularul vechi „AddFame Fall Event” (fără eveniment anume). Evenimentele noi au formularul lor:
// /evenimente/<adresa>/inscriere — înscrierile apar în Admin → Înscrieri evenimente, pe eveniment.
export default function EvenimentToamna() {
  return (
    <EventSignupForm
      eyebrow="Eveniment exclusiv · Toamnă 2026"
      title="Înscrie-te la"
      accent="AddFame Fall Event"
      lead="Un eveniment exclusiv pentru influencerii AddFame. Locurile sunt limitate — înscrie-te acum și te contactăm cu detalii."
      doneText="Înscrierea ta a fost înregistrată cu succes. Te vom contacta în curând cu toate detaliile despre evenimentul din toamnă."
    />
  )
}
