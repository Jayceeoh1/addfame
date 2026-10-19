import { describe, it, expect } from 'vitest'
import { scoreQuiz, QUIZ_QUESTIONS, QUIZ_CHARACTERS } from '../lib/halloween-quiz'

describe('quiz Halloween', () => {
  it('are 8 întrebări cu câte 4 variante și 5 personaje', () => {
    expect(QUIZ_QUESTIONS).toHaveLength(8)
    QUIZ_QUESTIONS.forEach(q => expect(q.options).toHaveLength(4))
    expect(QUIZ_CHARACTERS.map(c => c.id)).toEqual(['vrajitoare', 'vampir', 'dovleac', 'zombie', 'fantoma'])
  })
  it('pragurile de scor dau personajul corect', () => {
    const pick = (total: number) => {
      // 8 răspunsuri care însumează exact `total`
      const a = Array(8).fill(1); let rest = total - 8
      for (let i = 0; i < 8 && rest > 0; i++) { const add = Math.min(3, rest); a[i] += add; rest -= add }
      return scoreQuiz(a)!.character.id
    }
    expect(pick(8)).toBe('vrajitoare'); expect(pick(12)).toBe('vrajitoare')
    expect(pick(13)).toBe('vampir'); expect(pick(17)).toBe('vampir')
    expect(pick(18)).toBe('dovleac'); expect(pick(22)).toBe('dovleac')
    expect(pick(23)).toBe('zombie'); expect(pick(27)).toBe('zombie')
    expect(pick(28)).toBe('fantoma'); expect(pick(32)).toBe('fantoma')
  })
  it('refuză răspunsuri incomplete sau invalide', () => {
    expect(scoreQuiz([1, 2, 3])).toBeNull()
    expect(scoreQuiz([1, 2, 3, 4, 1, 2, 3, 5])).toBeNull()
    expect(scoreQuiz([1, 2, 3, 4, 1, 2, 3, 0])).toBeNull()
    expect(scoreQuiz([1, 2, 3, 4, 1, 2, 3, 2.5])).toBeNull()
    expect(scoreQuiz('12341234')).toBeNull()
    expect(scoreQuiz([1, 2, 3, 4, 1, 2, 3, 4])!.score).toBe(20)
  })
})
