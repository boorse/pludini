// ══════ Feedback de récompense — animation + son quand une observation ══════
// rapporte des points. Trois paliers selon le nombre de points gagnés ; les
// seuils sont volontairement isolés ici pour être ajustés en un seul endroit.
import { useEffect } from 'react'

export const REWARD_THRESHOLDS = { small: 100, medium: 200 }

export function tierFor(points) {
  if (points < REWARD_THRESHOLDS.small) return 'small'
  if (points <= REWARD_THRESHOLDS.medium) return 'medium'
  return 'big'
}

// ── Son synthétisé (Web Audio API) — pas de fichier audio à héberger ──
let audioCtx = null
function getCtx() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!audioCtx) audioCtx = new AC()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}
function tone(ctx, freq, startTime, duration, type, gain) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)
  g.gain.setValueAtTime(0, startTime)
  g.gain.linearRampToValueAtTime(gain, startTime + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  osc.connect(g); g.connect(ctx.destination)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.03)
}
// petit gain : simple tintement — gain moyen : deux notes ascendantes —
// gros gain : arpège de quatre notes avec une couche harmonique scintillante
const TIER_NOTES = {
  small:  [[880, 0, 0.12]],
  medium: [[659.25, 0, 0.11], [880, 0.09, 0.16]],
  big:    [[523.25, 0, 0.11], [659.25, 0.08, 0.11], [880, 0.16, 0.13], [1174.66, 0.24, 0.22]],
}
export function playRewardSound(tier) {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const notes = TIER_NOTES[tier] || TIER_NOTES.small
    const now = ctx.currentTime
    notes.forEach(([freq, offset, dur]) => {
      tone(ctx, freq, now + offset, dur, 'sine', tier === 'big' ? 0.16 : 0.14)
      if (tier === 'big') tone(ctx, freq * 2, now + offset + 0.01, dur * 0.6, 'triangle', 0.05)
    })
  } catch {}
}

// ── Animation ──
const TIER_STYLE = {
  small:  { color:'#7A8B5C', particles:6,  duration:1300, size:18, icon:null },
  medium: { color:'#B5602F', particles:10, duration:1600, size:21, icon:'ti-sparkle' },
  big:    { color:'#C9A046', particles:16, duration:2000, size:25, icon:'ti-sparkles' },
}

export function RewardBurst({ points, tier, onDone }) {
  const style = TIER_STYLE[tier] || TIER_STYLE.small

  useEffect(() => {
    playRewardSound(tier)
    const t = setTimeout(onDone, style.duration)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const particles = Array.from({ length: style.particles })

  return (
    <div style={{ position:'fixed', inset:0, zIndex:400, display:'flex', alignItems:'center',
      justifyContent:'center', pointerEvents:'none' }}>
      <div style={{ position:'relative', width:1, height:1 }}>
        {particles.map((_, i) => (
          <span key={i} className="reward-particle" style={{
            '--angle': `${(360 / particles.length) * i}deg`,
            '--reward-color': style.color,
            animationDelay: `${i * 0.014}s`,
          }} />
        ))}
        <div className="reward-badge serif" style={{ '--reward-color': style.color, fontSize: style.size }}>
          {style.icon && <i className={`ti ${style.icon}`} style={{ fontSize: style.size - 4 }} aria-hidden="true" />}
          +{points}
        </div>
      </div>
    </div>
  )
}
