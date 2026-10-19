// Quiz „Ce influencer de Halloween ești?”: întrebările, personajele și scorul. Funcții pure, testate în tests/halloween-quiz.test.ts.
// Scorul se calculează pe server din răspunsuri (A=1 … D=4); jucătorul nu vede punctajul variantelor.

export const QUIZ_POINTS = 25

export const QUIZ_QUESTIONS: { q: string; options: [string, string, string, string] }[] = [
  { q: 'Primești un colet PR. Ce faci?', options: ['Filmez imediat unboxing-ul', 'Aștept momentul perfect', 'Îl pun lângă celelalte colete', 'Îl uit într-un dulap'] },
  { q: 'Deadline-ul e mâine. Tu…', options: ['Am postat deja', 'Mai am câteva detalii', 'Abia încep să filmez', 'Ce deadline?'] },
  { q: 'Brandul cere modificări. Tu…', options: ['Le fac imediat', 'Cer câteva clarificări', 'Mă supăr puțin, apoi le fac', 'Dispar în ceață'] },
  { q: 'Câte poze faci pentru un Story?', options: ['Una și gata', '5–10', 'Minimum 50', 'Nu mai postez, că nu-mi place niciuna'] },
  { q: 'Reel-ul are puține vizualizări. Tu…', options: ['Analizez rezultatele', 'Mai aștept puțin', 'Verific statisticile obsesiv', 'Declar algoritmul blestemat'] },
  { q: 'Ce te sperie cel mai tare?', options: ['Să nu respect brieful', 'Să pierd o colaborare', 'Să scadă reach-ul', 'Mesajul „Ai postat?”'] },
  { q: 'La petrecerea de Halloween…', options: ['Fac content pentru comunitate', 'Filmez câteva Stories', 'Fac 300 de poze', 'Uit complet să postez'] },
  { q: 'Ai fost selectat într-o campanie AddFame. Tu…', options: ['Confirm și citesc brieful', 'Pregătesc idei creative', 'Mă gândesc cum să fac Reel-ul viral', 'Uit să verific mesajele'] },
]

export type QuizCharacter = { id: string; name: string; max: number; text: string; img: string }

export const QUIZ_CHARACTERS: QuizCharacter[] = [
  { id: 'vrajitoare', max: 12, name: 'Vrăjitoarea Virală', text: 'Citești briefurile, respecți deadline-urile și faci magie cu fiecare campanie. Ești visul oricărui brand!', img: '/halloween/chars/vrajitoare.webp' },
  { id: 'vampir', max: 17, name: 'Vampirul de Reach', text: 'Te hrănești cu like-uri și vizualizări. Verifici statisticile mai des decât mesajele de la iubit.', img: '/halloween/chars/vampir.webp' },
  { id: 'dovleac', max: 22, name: 'Dovleacul Influencer', text: 'Ai idei bune și energie de creator, dar uneori pierzi mai mult timp alegând un cover decât filmând Reel-ul.', img: '/halloween/chars/dovleac.webp' },
  { id: 'zombie', max: 27, name: 'Zombie-ul Deadline-urilor', text: 'Filmezi noaptea, editezi dimineața și supraviețuiești din cafea. Deadline-ul te urmărește peste tot.', img: '/halloween/chars/zombie.webp' },
  { id: 'fantoma', max: 32, name: 'Fantoma Campaniilor', text: 'Ai primit coletul, ai spus „postez mâine” și ai dispărut misterios. AddFame te caută și în lumea de dincolo!', img: '/halloween/chars/fantoma.webp' },
]

export const characterById = (id: string | null | undefined) => QUIZ_CHARACTERS.find(c => c.id === id) || null

/** 8 răspunsuri, fiecare 1–4 → scor 8–32 și personajul. Orice altceva → null. */
export function scoreQuiz(answers: unknown): { score: number; character: QuizCharacter } | null {
  if (!Array.isArray(answers) || answers.length !== QUIZ_QUESTIONS.length) return null
  if (!answers.every(a => Number.isInteger(a) && a >= 1 && a <= 4)) return null
  const score = (answers as number[]).reduce((s, a) => s + a, 0)
  const character = QUIZ_CHARACTERS.find(c => score <= c.max) || QUIZ_CHARACTERS[QUIZ_CHARACTERS.length - 1]
  return { score, character }
}
