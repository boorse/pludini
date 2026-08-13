import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { flushSync } from 'react-dom'
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

// ── Pan/zoom/pincement : entièrement délégués à react-zoom-pan-pinch (déjà
// utilisée pour la mindmap sur tactile) plutôt qu'à du pan/pincement maison —
// le glisser souris fait maison perdait la main en cours de geste (capture de
// pointeur fragile), et la molette ne distinguait pas trackpad/souris. La
// bibliothèque gère nativement souris, trackpad (glissement à deux doigts via
// trackPadPanning) et tactile, de façon éprouvée — on ne fait plus que
// "committer" le geste terminé en un nouveau centre lat/lon + niveau de zoom
// discret (les tuiles doivent être rechargées, on ne peut pas zoomer en CSS
// indéfiniment) ──
export default function SatMap({ center, pins = [], zones = [], draftPts = [], draftKind = null, selected, onSelect, onMapClick,
  obsPins = [], onObsSelect, height = 520, addMode = false, lineMode = false }) {
  const [z, setZ] = useState(16)
  const [c, setC] = useState(center)          // {lat, lon} au centre
  const [hoveredObs, setHoveredObs] = useState(null)
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 800, h: typeof height === 'number' ? height : 520 })
  const drag = useRef({ moved: false })
  const liveRef = useRef({ x: 0, y: 0, k: 1 })   // geste en cours (relatif, remis à zéro après commit)
  const apiRef = useRef(null)
  const settleElRef = useRef(null)   // calque décoratif de transition (jamais mesuré par la bibliothèque)

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

  // calque de transition, purement décoratif (pointer-events:none, jamais lu
  // par la bibliothèque de pan/zoom) : montre les tuiles TELLES QU'AFFICHÉES
  // juste avant ce commit, puis glisse en douceur vers leur position alignée
  // sur la nouvelle vue — pendant que le vrai contenu, lui, saute
  // instantanément à la bonne place sans jamais être manipulé à la main (la
  // bibliothèque mesure sa position réelle en direct pour le prochain geste ;
  // la moindre divergence entre son état interne et le DOM faussait ses
  // calculs, ce qui provoquait de grands sauts si un geste reprenait pendant
  // l'ancienne transition — molette à crans, zooms rapprochés). Sert aussi de
  // filet anti-flash noir quand le niveau de zoom change (tuiles à charger) :
  // on le garde alors affiché plus longtemps, déjà aligné, le temps que les
  // nouvelles tuiles arrivent.
  const [settle, setSettle] = useState(null)
  useEffect(() => {
    if (!settle) return
    const el = settleElRef.current
    if (el) {
      el.style.transition = 'none'
      el.style.transform = `translate(${settle.fromX}px, ${settle.fromY}px) scale(${settle.fromScale})`
      el.offsetHeight   // force le navigateur à peindre ce point de départ
      el.style.transition = 'transform 180ms ease-out'
      el.style.transform = `translate(${settle.toX}px, ${settle.toY}px) scale(1)`
    }
    const id = settle.id
    const t = setTimeout(() => setSettle(s => (s?.id === id ? null : s)), settle.crossesZoomLevel ? 700 : 220)
    return () => clearTimeout(t)
  }, [settle])

  const toScreen = useCallback((lat, lon) => ({
    left: lon2x(lon, z) * TS - originX,
    top: lat2y(lat, z) * TS - originY,
  }), [z, originX, originY])

  // pendant le geste (glisser souris/trackpad/doigt, molette, pincement) : on
  // ne fait que suivre le transform que la bibliothèque applique déjà elle-même
  // en CSS — aucun re-rendu React tant que le geste n'est pas terminé
  const onTransform = useCallback((_ref, state) => {
    liveRef.current = { x: state.positionX, y: state.positionY, k: state.scale }
    if (Math.abs(state.positionX) > 3 || Math.abs(state.positionY) > 3 || Math.abs(state.scale - 1) > 0.02) {
      drag.current.moved = true
    }
  }, [])

  // flushSync : la bibliothèque appelle ce commit hors du cycle React habituel —
  // sans forcer le re-rendu (nouvelles tuiles) à se produire avant resetTransform,
  // un frame intermédiaire pouvait s'afficher à l'ancienne position
  const commit = useCallback(() => {
    const { x: tx, y: ty, k } = liveRef.current
    if (tx === 0 && ty === 0 && k === 1) return
    const screenCx = size.w / 2, screenCy = size.h / 2
    const worldX = (screenCx - tx) / k + originX
    const worldY = (screenCy - ty) / k + originY
    const lon = x2lon(worldX / TS, z)
    const lat = y2lat(worldY / TS, z)
    const dz = Math.round(Math.log2(k))
    const nz = Math.max(3, Math.min(19, z + dz))
    // origine (coin haut-gauche, en pixels monde) qu'auront les tuiles UNE
    // FOIS le nouveau centre/zoom appliqués — calculée à la main avec les
    // mêmes formules que le composant, avant que le re-rendu n'ait lieu
    const newOriginX = lon2x(lon, nz) * TS - screenCx
    const newOriginY = lat2y(lat, nz) * TS - screenCy
    // point d'arrivée du calque de transition (voir plus haut) : la position
    // à laquelle les tuiles ACTUELLES (pas encore recentrées) doivent glisser
    // pour rester alignées avec la vue une fois le recentrage effectué —
    // sans cette correction (rejouer tx,ty,k tel quel), le point d'arrivée
    // ne correspondait à rien de réel dès qu'un zoom impliquait un
    // recentrage (systématique), d'où le "zoom puis dézoom" signalé. Pour un
    // pan pur (k=1), cette correction s'annule exactement : le calque
    // termine à l'identique de ce qu'il montrait déjà, donc rien ne "bouge".
    const adjX = tx + k * (newOriginX - originX)
    const adjY = ty + k * (newOriginY - originY)
    setSettle({ id: Date.now() + Math.random(), tiles, fromX: tx, fromY: ty, fromScale: k, toX: adjX, toY: adjY, crossesZoomLevel: nz !== z })
    flushSync(() => {
      setC({ lat, lon })
      if (nz !== z) setZ(nz)
    })
    liveRef.current = { x: 0, y: 0, k: 1 }
    // reset TOUJOURS instantané (durée 0, appliqué de façon synchrone par la
    // bibliothèque) — jamais animé : le vrai contenu (mesuré en direct par
    // la bibliothèque pour calculer tout geste suivant, molette y compris)
    // doit refléter EXACTEMENT son état interne à tout instant, sans jamais
    // être retouché à la main. On a longtemps animé ce retour directement
    // sur cet élément (en le "rejouant" depuis tx,ty,k avant de le laisser
    // glisser vers l'identité) : ça fonctionnait tant que rien n'interrompait
    // la transition, mais dès qu'un geste reprenait pendant ses 180ms — une
    // molette à crans, très courant — la bibliothèque mesurait alors un DOM
    // en cours d'animation pendant que son propre état interne disait déjà
    // autre chose, et calculait une position n'importe où (constaté : un
    // bond de plusieurs centaines de milliers de pixels, carte entièrement
    // noire). L'habillage visuel se fait maintenant exclusivement sur le
    // calque décoratif ci-dessus, jamais lu par la bibliothèque.
    apiRef.current?.setTransform(0, 0, 1, 0)
    setTimeout(() => { drag.current.moved = false }, 0)
  }, [z, originX, originY, size.w, size.h, tiles])

  const click = (e) => {
    if (drag.current.moved || (!addMode && !lineMode) || !onMapClick) return
    const r = wrapRef.current.getBoundingClientRect()
    const mx = e.clientX - r.left, my = e.clientY - r.top
    onMapClick({ lat: y2lat((originY + my) / TS, z), lon: x2lon((originX + mx) / TS, z) })
  }

  const content = (
    <>
      {/* calque de transition (voir le commentaire au niveau de son état) :
          tuiles telles qu'affichées juste avant ce commit, glissant en
          douceur vers leur position alignée — purement décoratif, jamais lu
          par la bibliothèque de pan/zoom */}
      {settle && (
        <div ref={settleElRef} style={{ position:'absolute', inset:0, transformOrigin:'0 0', pointerEvents:'none' }}>
          {settle.tiles.map(t => (
            <img key={t.key} src={t.url} alt="" draggable={false}
              style={{ position:'absolute', left:t.left, top:t.top, width:TS, height:TS, display:'block' }} />
          ))}
        </div>
      )}
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

      {/* spots d'observation (couleur du joueur + initiale, ou pastille sombre avec
          un nombre quand plusieurs observations sont regroupées) — aperçu photo au
          survol (souris), fiche/liste au clic, géré par le parent via onObsSelect */}
      {obsPins.map(p => {
        const s = toScreen(p.lat, p.lon)
        if (s.left < -40 || s.top < -40 || s.left > size.w + 40 || s.top > size.h + 40) return null
        const hovered = hoveredObs === p.id
        return (
          <div key={p.id}
            onMouseEnter={()=>setHoveredObs(p.id)} onMouseLeave={()=>setHoveredObs(h=>h===p.id?null:h)}
            style={{ position:'absolute', left:s.left, top:s.top, transform:'translate(-50%,-50%)',
              zIndex: hovered?9:4 }}>
            {hovered && p.thumbUrl && (
              <div style={{ position:'absolute', bottom:'130%', left:'50%', transform:'translateX(-50%)',
                width:64, height:64, borderRadius:10, overflow:'hidden', border:'2px solid #fff',
                boxShadow:'0 5px 16px rgba(0,0,0,.45)', pointerEvents:'none' }}>
                <img src={p.thumbUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              </div>
            )}
            <button onClick={(e)=>{ e.stopPropagation(); if(!drag.current.moved) onObsSelect?.(p) }}
              style={{ width: hovered?26:21, height: hovered?26:21, borderRadius:'50%', background:p.color,
                border:'2px solid #fff', color:'#fff', fontSize: hovered?11:9.5, fontWeight:800,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 2px 8px rgba(0,0,0,.45)', transition:'all .12s' }}>
              {p.label}
            </button>
          </div>
        )
      })}
    </>
  )

  return (
    <div ref={wrapRef}
      onDragStart={e=>e.preventDefault()}
      style={{ position:'relative', width:'100%', height, overflow:'hidden', background:'#1E2418',
        cursor: (addMode||lineMode) ? 'crosshair' : 'grab', userSelect:'none', touchAction:'none' }}>
      <TransformWrapper ref={apiRef}
        initialScale={1} initialPositionX={0} initialPositionY={0}
        minScale={0.25} maxScale={4} limitToBounds={false} centerOnInit={false}
        doubleClick={{ disabled: true }}
        panning={{ velocityDisabled: true }}
        trackPadPanning={{ velocityDisabled: true }}
        wheel={{ step: 0.04 }}
        // "autoAlignment" (snap-back aux limites) est activé par défaut
        // indépendamment de limitToBounds, et se déclenche à chaque fin de
        // geste dès que la vélocité est désactivée : ça ajoutait un second
        // déplacement, incontrôlé, par-dessus celui qu'on vient de committer
        // nous-mêmes (la carte "faisait deux fois la distance")
        autoAlignment={{ disabled: true }}
        onTransform={onTransform}
        onPanningStop={commit} onPinchStop={commit} onWheelStop={commit}>
        <TransformComponent wrapperStyle={{ width:'100%', height:'100%', touchAction:'none' }} contentStyle={{ width:size.w, height:size.h }}>
          <div style={{ position:'relative', width:size.w, height:size.h }} onClick={click}>{content}</div>
        </TransformComponent>
      </TransformWrapper>

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
