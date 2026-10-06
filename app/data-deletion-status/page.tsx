export const metadata = { title: 'Ștergerea datelor — AddFame' }

export default async function DataDeletionStatus({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams
  const box = { maxWidth: 620, margin: '80px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif', color: '#14123a', lineHeight: 1.6 } as const
  const h1 = { fontSize: 26, fontWeight: 800 } as const
  const muted = { fontSize: 14, color: '#6a6690' } as const

  if (code) {
    return (
      <main style={box}>
        <h1 style={h1}>Cererea de ștergere a datelor</h1>
        <p style={{ marginTop: 12 }}>
          Datele conectate prin Instagram (token de acces, statistici și postări sincronizate) au fost șterse din AddFame.
        </p>
        <p style={{ ...muted, marginTop: 16 }}>Cod de confirmare: <b style={{ color: '#14123a' }}>{code}</b></p>
        <p style={{ ...muted, marginTop: 24 }}>Pentru ștergerea completă a contului scrie-ne la privacy@addfame.ro.</p>
      </main>
    )
  }

  return (
    <main style={box}>
      <h1 style={h1}>Cum îți ștergi datele din AddFame</h1>
      <p style={{ marginTop: 12 }}>
        Dacă ți-ai conectat contul Instagram la AddFame, poți șterge datele primite de la Instagram în oricare dintre aceste moduri:
      </p>
      <ol style={{ marginTop: 12, paddingLeft: 20 }}>
        <li><b>Din AddFame:</b> intră în cont → Profil (creator) sau Setări (brand) → Instagram → <b>Deconectează</b>. Ștergem imediat tokenul de acces, statisticile și postările sincronizate.</li>
        <li><b>Din Instagram:</b> Setări → Aplicații și site-uri → găsește AddFame → <b>Elimină</b>. Ștergem automat datele Instagram asociate contului tău.</li>
        <li><b>Prin email:</b> scrie-ne la <a href="mailto:privacy@addfame.ro">privacy@addfame.ro</a> de pe adresa contului și ștergem datele (sau întregul cont) în maximum 30 de zile.</li>
      </ol>
      <p style={{ ...muted, marginTop: 20 }}>
        Detalii despre datele pe care le folosim: <a href="/politica-de-confidentialitate">Politica de confidențialitate</a>.
      </p>
    </main>
  )
}
