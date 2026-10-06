export const metadata = { title: 'Ștergerea datelor — AddFame' }

export default async function DataDeletionStatus({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams
  return (
    <main style={{ maxWidth: 560, margin: '80px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif', color: '#14123a' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800 }}>Cererea de ștergere a datelor</h1>
      <p style={{ marginTop: 12, lineHeight: 1.6 }}>
        Datele conectate prin Instagram (token de acces, statistici și postări sincronizate) au fost șterse din AddFame.
      </p>
      {code && (
        <p style={{ marginTop: 16, fontSize: 14, color: '#6a6690' }}>
          Cod de confirmare: <b style={{ color: '#14123a' }}>{code}</b>
        </p>
      )}
      <p style={{ marginTop: 24, fontSize: 14, color: '#6a6690' }}>
        Pentru ștergerea completă a contului scrie-ne la privacy@addfame.ro.
      </p>
    </main>
  )
}
