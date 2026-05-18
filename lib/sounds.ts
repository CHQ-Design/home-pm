// Pleasant chord: C5, E5, G5, A5, D5
const TONES = [523, 659, 784, 880, 587]
const FALLBACK_TONE = 440 // A4 — unassigned tasks

export function playCompletionTone(personIndex: number | null): void {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.value = personIndex !== null
      ? TONES[personIndex % TONES.length]
      : FALLBACK_TONE
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => ctx.close()
  } catch {
    // AudioContext not supported or blocked — fail silently
  }
}
