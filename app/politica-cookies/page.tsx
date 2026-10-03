import { redirect } from 'next/navigation'

// Această pagină era o copie a paginii de Contact, cu un formular care nu trimitea nimic.
// Informațiile despre cookie-uri sunt în Politica de confidențialitate, secțiunea 7.
export default function PoliticaCookiesPage() {
  redirect('/politica-de-confidentialitate#s-7')
}
