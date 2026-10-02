'use client'

function loadScript(src: string, globalKey: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any)[globalKey]) return resolve((window as any)[globalKey])
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any)[globalKey]))
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve((window as any)[globalKey])
    s.onerror = reject
    document.head.appendChild(s)
  })
}

export async function downloadReportPDF(_props: any, filename: string) {
  await Promise.all([
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf'),
    loadScript('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js', 'htmlToImage'),
  ])

  const htmlToImage = (window as any).htmlToImage
  const jsPDFClass = (window as any).jspdf?.jsPDF || (window as any).jsPDF

  const container = document.getElementById('report-content')
  if (!container) { alert('Nu s-a găsit conținutul raportului.'); return }

  try { await (document as any).fonts?.ready } catch (_) {}
  await new Promise(r => setTimeout(r, 800))

  const pages = Array.from(
    container.querySelectorAll<HTMLElement>('.report-page-cover, .report-page')
  )
  if (pages.length === 0) { alert('Nicio pagină găsită în raport.'); return }

  const PDF_W_MM = 210
  const doc = new jsPDFClass({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  // Salvăm scroll-ul original
  const origScrollX = window.scrollX
  const origScrollY = window.scrollY

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const isCover = page.classList.contains('report-page-cover')

    // Scroll la pagina curentă
    page.scrollIntoView()
    await new Promise(r => setTimeout(r, 100))

    const w = page.offsetWidth
    const h = page.offsetHeight
    const pixelRatio = 2

    const dataUrl = await htmlToImage.toJpeg(page, {
      quality: 0.95,
      pixelRatio,
      backgroundColor: isCover ? '#0f0f1a' : '#ffffff',
      width: w,
      height: h,
      canvasWidth: w * pixelRatio,
      canvasHeight: h * pixelRatio,
      skipFonts: false,
      cacheBust: true,
      style: {
        margin: '0',
        transform: 'none',
        left: '0',
        right: 'auto',
        top: '0',
      },
    })

    const img = new Image()
    await new Promise<void>(res => { img.onload = () => res(); img.src = dataUrl })

    const ratio = img.naturalHeight / img.naturalWidth
    const pageH_mm = PDF_W_MM * ratio

    if (i === 0) {
      doc.deletePage(1)
      doc.addPage([PDF_W_MM, pageH_mm])
    } else {
      doc.addPage([PDF_W_MM, pageH_mm])
    }

    doc.addImage(dataUrl, 'JPEG', 0, 0, PDF_W_MM, pageH_mm)
  }

  // Resetăm scroll-ul
  window.scrollTo(origScrollX, origScrollY)

  doc.save(filename)
}
