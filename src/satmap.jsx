import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

// ── Carte satellite à tuiles — aucune interface tierce ──
// Tuiles Esri World Imagery (libres d'accès, sans clé)
const TILE = (z,x,y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
const TS = 256

const lon2x = (lon, z) => ((lon + 180) / 360) * Math.pow(2, z)
const lat2y = (lat, z) => {
  const r = lat * Math.PI / 180
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z)
}
const x2lon = (x, z) => (x / Math.pow(2, z)) * 360 - 180
const y2lat = (y, z) => {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z)
  return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

export default function SatMap({ center, pins = [], zones = [], draftPts = [], draftKind = null, selected, onSelect, onMapClick, height = 520, addMode = false, lineMode = false }) {
  // écran tactile (téléphone/tablette) : bibliothèque dédiée (react-zoom-pan-pinch),
  // comme pour la mindmap — bien plus robuste sur mobile que le pan/pincement
  // maison ci-dessous, qui reste utilisé tel quel sur PC (souris/trackpad)
  const [isTouch] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches)
  const [z, setZ] = useState(16)
  const [c, setC] = useState(center)          // {lat, lon} au centre
  const wrapRef = useRef(null)
  const stageRef = useRef(null)
  const [size, setSize] = useState({ w: 800, h: typeof height === 'number' ? height : 520 })
  const ptrs = useRef(new Map())
  const gest = useRef(null)
  const drag = useRef({ moved: false })
  const liveRef = useRef({ x: 0, y: 0, k: 1 })   // geste tactile en cours (relatif, remis à zéro après commit)
  const touchApiRef = useRef(null)

  useEffect(() => {
    const el = wrapRef.current; if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  useEffect(() => { setC(center) }, [center.lat, center.lon])

  // pixel du centre dans la grille mondiale
  const cx = lon2x(c.lon, z) * TS
  const cy = lat2y(c.lat, z) * TS
  const originX = cx - size.w / 2
  const originY = cy - size.h / 2

  const tiles = useMemo(() => {
    const out = []
    const n = Math.pow(2, z)
    const x0 = Math.floor(originX / TS) - 1, x1 = Math.floor((originX + size.w) / TS) + 1
    const y0 = Math.floor(originY / TS) - 1, y1 = Math.floor((originY + size.h) / TS) + 1
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      if (y < 0 || y >= n) continue
      const wx = ((x % n) + n) % n
      out.push({ key: `${z}/${x}/${y}`, url: TILE(z, wx, y), left: x * TS - originX, top: y * TS - originY })
    }
    return out
  }, [z, originX, originY, size.w, size.h])

  const toScreen = useCallback((lat, lon) => ({
    left: lon2x(lon, z) * TS - originX,
    top: lat2y(lat, z) * TS - originY,
  }), [z, originX, originY])

  const clearStageTransform = () => { if (stageRef.current) stageRef.current.style.transform = '' }

  const down = (e) => {
    const el = wrapRef.current; if (!el) return
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    drag.current.moved = false
    if (ptrs.current.size === 1) {
      gest.current = { mode:'pan', sx:e.clientX, sy:e.clientY, clat:c.lat, clon:c.lon }
    } else if (ptrs.current.size === 2) {
      try { el.setPointerCapture?.(e.pointerId) } catch {}
      const [a,b] = [...ptrs.current.values()]
      const r = el.getBoundingClientRect()
      gest.current = { mode:'zoom', d:Math.hypot(a.x-b.x, a.y-b.y), z0:z,
        mx:(a.x+b.x)/2 - r.left, my:(a.y+b.y)/2 - r.top, scale:1 }
    }
  }
  const move = (e) => {
    if (!ptrs.current.has(e.pointerId)) return
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gest.current; if (!g) return

    if (g.mode === 'pan' && ptrs.current.size === 1) {
      const dx = e.clientX - g.sx, dy = e.clientY - g.sy
      if (!drag.current.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        drag.current.moved = true
        wrapRef.current?.setPointerCapture?.(e.pointerId)   // capture seulement en glissant
      }
      const px = lon2x(g.clon, z) * TS - dx
      const py = lat2y(g.clat, z) * TS - dy
      setC({ lon: x2lon(px / TS, z), lat: y2lat(py / TS, z) })
    } else if (g.mode === 'zoom' && ptrs.current.size >= 2) {
      const [a,b] = [...ptrs.current.values()]
      const ratio = Math.hypot(a.x-b.x, a.y-b.y) / g.d
      g.scale = Math.min(4, Math.max(0.25, ratio))
      drag.current.moved = true
      if (stageRef.current) {
        stageRef.current.style.transform =
          `translate(${g.mx}px,${g.my}px) scale(${g.scale}) translate(${-g.mx}px,${-g.my}px)`
      }
    }
  }
  const up = (e) => {
    try { wrapRef.current?.releasePointerCapture?.(e.pointerId) } catch {}
    ptrs.current.delete(e.pointerId)
    const g = gest.current
    if (ptrs.current.size === 0) {
      if (g?.mode === 'zoom' && g.scale !== 1) {
        const dz = Math.round(Math.log2(g.scale))
        const nz = Math.max(3, Math.min(19, g.z0 + dz))
        if (nz !== z) {
          const lon = x2lon((originX + g.mx) / TS, z)
          const lat = y2lat((originY + g.my) / TS, z)
          const nx = lon2x(lon, nz) * TS, ny = lat2y(lat, nz) * TS
          setZ(nz)
          setC({ lon: x2lon((nx - g.mx + size.w / 2) / TS, nz), lat: y2lat((ny - g.my + size.h / 2) / TS, nz) })
        }
        clearStageTransform()
      }
      gest.current = null
      setTimeout(() => { drag.current.moved = false }, 0)
    } else if (ptrs.current.size === 1) {
      clearStageTransform()
      const [p] = [...ptrs.current.values()]
      gest.current = { mode:'pan', sx:p.x, sy:p.y, clat:c.lat, clon:c.lon }
    }
  }

  const wheel = useCallback((e) => {
    e.preventDefault()
    const el = wrapRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    const mx = e.clientX - r.left, my = e.clientY - r.top
    const dz = e.deltaY < 0 ? 1 : -1
    const nz = Math.max(3, Math.min(19, z + dz))
    if (nz === z) return
    // garder le point sous le curseur
    const lon = x2lon((originX + mx) / TS, z)
    const lat = y2lat((originY + my) / TS, z)
    const nx = lon2x(lon, nz) * TS, ny = lat2y(lat, nz) * TS
    setZ(nz)
    setC({ lon: x2lon((nx - mx + size.w / 2) / TS, nz), lat: y2lat((ny - my + size.h / 2) / TS, nz) })
  }, [z, originX, originY, size.w, size.h])

  useEffect(() => {
    if (isTouch) return   // pas de molette sur tactile
    const el = wrapRef.current; if (!el) return
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [wheel, isTouch])

  const click = (e) => {
    if (drag.current.moved || (!addMode && !lineMode) || !onMapClick) return
    const r = wrapRef.current.getBoundingClientRect()
    const mx = e.clientX - r.left, my = e.clientY - r.top
    onMapClick({ lat: y2lat((originY + my) / TS, z), lon: x2lon((originX + mx) / TS, z) })
  }

  // ── Tactile : la bibliothèque pilote pan + pincement, on ne fait que "committer"
  // le geste terminé en un nouveau centre lat/lon + niveau de zoom discret (les
  // tuiles doivent être rechargées, on ne peut pas juste zoomer en CSS indéfiniment) ──
  const onTouchTransform = useCallback((_ref, state) => {
    liveRef.current = { x: state.positionX, y: state.positionY, k: state.scale }
    if (Math.abs(state.positionX) > 3 || Math.abs(state.positionY) > 3 || Math.abs(state.scale - 1) > 0.02) {
      drag.current.moved = true
    }
  }, [])
  const commitTouchTransform = useCallback(() => {
    const { x: tx, y: ty, k } = liveRef.current
    if (tx === 0 && ty === 0 && k === 1) return
    const screenCx = size.w / 2, screenCy = size.h / 2
    const worldX = (screenCx - tx) / k + originX
    const worldY = (screenCy - ty) / k + originY
    const lon = x2lon(worldX / TS, z)
    const lat = y2lat(worldY / TS, z)
    const dz = Math.round(Math.log2(k))
    const nz = Math.max(3, Math.min(19, z + dz))
    setC({ lat, lon })
    if (nz !== z) setZ(nz)
    liveRef.current = { x: 0, y: 0, k: 1 }
    touchApiRef.current?.resetTransform(0)
    setTimeout(() => { drag.current.moved = false }, 0)
  }, [z, originX, originY, size.w, size.h])

  const content = (
    <>
      {tiles.map(t => (
        <img key={t.key} src={t.url} alt="" draggable={false}
          style={{ position:'absolute', left:t.left, top:t.top, width:TS, height:TS, display:'block', pointerEvents:'none' }} />
      ))}

      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:2 }}>
        {zones.map(zn => {
          const pts = zn.pts.map(([la,lo]) => { const sp = toScreen(la,lo); return `${sp.left},${sp.top}` }).join(' ')
          if (zn.kind === 'zone') return <polygon key={zn.id} points={pts} fill={zn.color+'40'} stroke={zn.color} strokeWidth="2" />
          return <polyline key={zn.id} points={pts} fill="none" stroke={zn.color} strokeWidth="2.5" strokeDasharray="7 5" />
        })}
        {draftPts.length>0 && (() => {
          const pts = draftPts.map(([la,lo]) => { const sp = toScreen(la,lo); return `${sp.left},${sp.top}` }).join(' ')
          return <>
            {draftKind==='zone'
              ? <polygon points={pts} fill="rgba(122,139,92,.28)" stroke="#7A8B5C" strokeWidth="2" />
              : <polyline points={pts} fill="none" stroke="#B5602F" strokeWidth="2.5" strokeDasharray="7 5" />}
            {draftPts.map(([la,lo],i)=>{ const sp = toScreen(la,lo)
              return <circle key={i} cx={sp.left} cy={sp.top} r="5" fill="#fff" stroke="#B5602F" strokeWidth="2" /> })}
          </>
        })()}
      </svg>

      {pins.map(p => {
        const s = toScreen(p.lat, p.lon)
        if (s.left < -60 || s.top < -60 || s.left > size.w + 60 || s.top > size.h + 60) return null
        const on = selected?.id === p.id
        return (
          <button key={p.id} onClick={(e)=>{ e.stopPropagation(); if(!drag.current.moved) onSelect?.(on ? null : p) }}
            style={{ position:'absolute', left:s.left, top:s.top, transform:'translate(-50%,-100%)',
              display:'flex', flexDirection:'column', alignItems:'center', zIndex:on?5:3, padding:0 }}>
            <span style={{ width:on?30:24, height:on?30:24, borderRadius:'50%', background:p.color,
              border:`2px solid ${on?'#fff':'rgba(255,255,255,.8)'}`, display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:on?14:11.5, boxShadow:'0 2px 9px rgba(0,0,0,.45)',
              transition:'all .16s' }}>{p.emoji}</span>
            <span style={{ width:2, height:8, background:p.color, boxShadow:'0 1px 3px rgba(0,0,0,.4)' }} />
            {on && <span style={{ marginTop:2, fontSize:10, background:'rgba(20,22,14,.88)', color:'#F2EEE2',
              padding:'2px 7px', borderRadius:8, whiteSpace:'nowrap' }}>{p.label}</span>}
          </button>
        )
      })}
    </>
  )

  return (
    <div ref={wrapRef}
      onDragStart={e=>e.preventDefault()}
      style={{ position:'relative', width:'100%', height, overflow:'hidden', background:'#1E2418',
        cursor: (addMode||lineMode) ? 'crosshair' : 'grab', userSelect:'none' }}>
      {isTouch ? (
        <TransformWrapper ref={touchApiRef}
          initialScale={1} initialPositionX={0} initialPositionY={0}
          minScale={0.4} maxScale={4} limitToBounds={false} centerOnInit={false}
          doubleClick={{ disabled: true }}
          onTransform={onTouchTransform}
          onPanningStop={commitTouchTransform} onPinchStop={commitTouchTransform}>
          <TransformComponent wrapperStyle={{ width:'100%', height:'100%' }} contentStyle={{ width:size.w, height:size.h }}>
            <div style={{ position:'relative', width:size.w, height:size.h }} onClick={click}>{content}</div>
          </TransformComponent>
        </TransformWrapper>
      ) : (
        <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          onPointerLeave={up} onLostPointerCapture={up} onClick={click}
          style={{ position:'absolute', inset:0, touchAction:'none' }}>
          <div ref={stageRef} style={{ position:'absolute', inset:0, transformOrigin:'0 0' }}>
            {content}
          </div>
        </div>
      )}

      {/* contrôles minimalistes */}
      <div style={{ position:'absolute', right:10, bottom:10, display:'flex', flexDirection:'column', gap:5, zIndex:6 }}>
        {[['+',1],['−',-1]].map(([l,d])=>(
          <button key={l} onClick={(e)=>{ e.stopPropagation(); setZ(v=>Math.max(3,Math.min(19,v+d))) }}
            style={{ width:30, height:30, borderRadius:8, background:'rgba(20,22,14,.72)', color:'#F2EEE2',
              fontSize:16, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center' }}>{l}</button>
        ))}
      </div>
      <div style={{ position:'absolute', left:9, bottom:8, fontSize:8.5, color:'rgba(242,238,226,.4)', zIndex:6, pointerEvents:'none' }}>
        Esri World Imagery
      </div>
    </div>
  )
}
