import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { RARITY, isObserved } from './data'
import { allSpecies, allCats } from './store.js'
import { gradientFor, gradientForCat } from './gradients.js'
import { nameOf, catNameOf, subNameOf } from './i18n.js'
import { CoverBg } from './photoui.jsx'

const CARD_W = 92, CARD_H = 68, GAP_X = 14, LEVEL_Y = 118
// décalage vertical par colonne — évite une map trop horizontale
const STAGGER = [0, 46, 16, 62, 30, 74]

// état du geste au niveau module : ne disparaît pas si le composant se reconstruit
const G = { on:false, sx:0, sy:0, ox:0, oy:0, moved:false, pinch:null }

export default function MindMap({ onSelectSpecies, lang='fr', expanded, setExpanded, tf, setTf, obsOnly, setObsOnly, edit, onAddSpecies }) {
  const wrapRef = useRef(null)
  const [infoNode, setInfoNode] = useState(null)
  // écran tactile (téléphone/tablette) : bibliothèque dédiée (react-zoom-pan-pinch)
  // pour un geste fiable (pan/pincement/double-tap) — souris/trackpad (PC) :
  // comportement Pointer Events fait maison, inchangé
  const [isTouch] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches)

  const toggle = useCallback((id) => {
    setExpanded(prev => {
      const n = new Set(prev)
      if (n.has(id)) { n.delete(id); for (const k of [...n]) if (k.startsWith(id + ':')) n.delete(k) }
      else n.add(id)
      return n
    })
    // un dépli manuel quitte le mode "observées uniquement" de cette branche (et de ses enfants)
    setObsOnly(prev => {
      if (!prev.has(id) && ![...prev].some(k => k.startsWith(id + ':'))) return prev
      const next = new Set(prev)
      for (const k of [...next]) if (k === id || k.startsWith(id + ':')) next.delete(k)
      return next
    })
  }, [])

  // déplie un ordre en ne révélant que les familles (et espèces) observées
  const toggleObserved = useCallback((n) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(n.id)) {
        next.delete(n.id)
        for (const k of [...next]) if (k.startsWith(n.id + ':')) next.delete(k)
      } else {
        next.add(n.id)
        for (const c of n.children || []) {
          if ((c.members || []).some(isObserved)) next.add(c.id)
          else next.delete(c.id)
        }
      }
      return next
    })
    setObsOnly(prev => {
      const next = new Set(prev)
      for (const k of [...next]) if (k === n.id || k.startsWith(n.id + ':')) next.delete(k)
      const willOpen = !expanded.has(n.id)
      if (willOpen) {
        next.add(n.id)
        for (const c of n.children || []) {
          if ((c.members || []).some(isObserved)) next.add(c.id)
        }
      }
      return next
    })
  }, [expanded])

  const SPECIES = allSpecies()
  const CATS = allCats()

  const { nodes, links, width, height } = useMemo(() => {
    const root = {
      id: 'root', kind: 'root', label: lang==='ru' ? 'Заповедник' : 'Conservatoire', e: '🌿',
      children: CATS.map((cat, ci) => {
        const catOnlyObs = obsOnly.has(cat.id)
        const subs = cat.subs.filter(sv => {
          if (!catOnlyObs) return true
          return SPECIES.some(sp => sp.cat === cat.id && sp.sub === sv.id && isObserved(sp))
        })
        return {
          id: cat.id, kind: 'cat', label: cat.n, sub: cat.lat, e: cat.e, cat, stagger: STAGGER[ci % STAGGER.length],
          children: subs.map(sv => {
            const famId = cat.id + ':' + sv.id
            const members = SPECIES.filter(sp => sp.cat === cat.id && sp.sub === sv.id)
            const onlyObs = obsOnly.has(famId)
            const shown = onlyObs ? members.filter(isObserved) : members
            return {
              id: famId, kind: 'fam', label: sv.id, sub: sv.lat, color: sv.c, niche: sv.niche,
              members,
              children: [
                ...shown.map(sp => ({ id: famId + ':' + sp.id, kind: 'sp', sp, children: [] })),
                ...(edit && !onlyObs ? [{ id: famId + ':__add', kind: 'add', cat: cat.id, sub: sv.id, children: [] }] : []),
              ]
            }
          })
        }
      })
    }
    // largeur en unités : les espèces d'une famille sont réparties en colonnes
    const COLS = (n) => n <= 2 ? n : n <= 6 ? 2 : n <= 12 ? 3 : 4

    const measure = (n) => {
      const open = n.kind === 'root' ? true : expanded.has(n.id)
      if (!open || !n.children.length) { n.units = 1; return 1 }
      if (n.kind === 'fam') {
        // grille : largeur = nb de colonnes, hauteur gérée au placement
        n.cols = COLS(n.children.length)
        n.rows = Math.ceil(n.children.length / n.cols)
        n.units = n.cols
        return n.units
      }
      n.units = n.children.reduce((s, c) => s + measure(c), 0)
      return n.units
    }
    measure(root)

    const nodes = [], links = []
    const place = (n, left, depth, offsetY) => {
      const w = n.units * (CARD_W + GAP_X)
      n.x = left + w / 2
      n.y = depth * LEVEL_Y + 56 + offsetY
      nodes.push(n)
      const open = n.kind === 'root' ? true : expanded.has(n.id)
      if (!open || !n.children.length) return

      if (n.kind === 'fam') {
        // disposition en grille sous la famille
        const cols = n.cols, rowH = CARD_H + 26
        n.children.forEach((c, i) => {
          const col = i % cols, row = Math.floor(i / cols)
          const rowCount = Math.min(cols, n.children.length - row * cols)
          const rowW = rowCount * (CARD_W + GAP_X)
          const startX = n.x - rowW / 2
          c.x = startX + col * (CARD_W + GAP_X) + (CARD_W + GAP_X) / 2
          c.y = n.y + CARD_H / 2 + 44 + row * rowH
          c.units = 1
          nodes.push(c)
          links.push({ x1: n.x, y1: n.y + CARD_H / 2, x2: c.x, y2: c.y - CARD_H / 2, depth, leaf: true })
        })
        return
      }

      let cur = left
      n.children.forEach((c, i) => {
        const cw = c.units * (CARD_W + GAP_X)
        const off = offsetY + (c.stagger !== undefined ? c.stagger : (depth === 1 ? STAGGER[i % STAGGER.length] * 0.5 : 0))
        place(c, cur, depth + 1, off)
        links.push({ x1: n.x, y1: n.y + CARD_H / 2, x2: c.x, y2: c.y - CARD_H / 2, depth })
        cur += cw
      })
    }
    place(root, 0, 0, 0)

    const width = root.units * (CARD_W + GAP_X) + 80
    const height = Math.max(...nodes.map(n => n.y)) + CARD_H + 70
    return { nodes, links, width, height }
  }, [expanded, obsOnly, edit, lang, SPECIES.length, CATS.length])

  const stageRef = useRef(null)
  const liveRef = useRef({ ...tf })
  const [view, setView] = useState(null)
  const touchApiRef = useRef(null)   // API impérative de react-zoom-pan-pinch (tactile uniquement)

  const computeView = useCallback(() => {
    const el = wrapRef.current; if (!el) return
    const { x, y, k } = liveRef.current
    const M = 400 / k   // marge : on garde de quoi voir venir
    setView({
      x0: (-x) / k - M, x1: (-x + el.clientWidth) / k + M,
      y0: (-y) / k - M, y1: (-y + el.clientHeight) / k + M,
    })
  }, [])

  const applyLive = () => {
    const el = stageRef.current
    if (el) el.style.transform = `translate3d(${liveRef.current.x}px,${liveRef.current.y}px,0) scale(${liveRef.current.k})`
  }
  useEffect(() => { liveRef.current = { ...tf }; applyLive(); computeView() }, [tf.x, tf.y, tf.k, computeView])

  const fit = useCallback(() => {
    const el = wrapRef.current; if (!el) return
    const vw = el.clientWidth, vh = el.clientHeight
    const k = Math.max(0.3, Math.min(1, Math.min((vw - 40) / width, (vh - 40) / height)))
    const next = { x: (vw - width * k) / 2, y: 14, k }
    liveRef.current = next
    if (isTouch && touchApiRef.current) touchApiRef.current.setTransform(next.x, next.y, next.k, 0)
    else applyLive()
    setTf(next)
  }, [width, height, setTf, isTouch])

  useEffect(() => {
    if (tf.k === 1 && tf.x === 0 && tf.y === 0) fit()
    else computeView()
  }, [fit, width, height])

  // ── Pointer Events (PC/souris) : un seul chemin pour souris et stylet — inchangé ──
  const ptrs = useRef(new Map())
  const gest = useRef(null)

  const onDown = (e) => {
    const el = wrapRef.current; if (!el) return
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    G.moved = false
    if (ptrs.current.size === 1) {
      gest.current = { mode:'pan', sx:e.clientX, sy:e.clientY, ox:liveRef.current.x, oy:liveRef.current.y }
    } else if (ptrs.current.size === 2) {
      try { el.setPointerCapture?.(e.pointerId) } catch {}
      const [a,b] = [...ptrs.current.values()]
      const r = el.getBoundingClientRect()
      gest.current = { mode:'zoom', d:Math.hypot(a.x-b.x, a.y-b.y), k:liveRef.current.k,
        x:liveRef.current.x, y:liveRef.current.y,
        mx:(a.x+b.x)/2 - r.left, my:(a.y+b.y)/2 - r.top }
    }
  }

  const onMove = (e) => {
    if (!ptrs.current.has(e.pointerId)) return
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gest.current; if (!g) return

    if (g.mode === 'pan' && ptrs.current.size === 1) {
      const dx = e.clientX - g.sx, dy = e.clientY - g.sy
      if (!G.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        G.moved = true
        wrapRef.current?.setPointerCapture?.(e.pointerId)   // capture seulement en glissant
      }
      if (!G.moved) return
      liveRef.current = { ...liveRef.current, x: g.ox + dx, y: g.oy + dy }
      applyLive()
    } else if (g.mode === 'zoom' && ptrs.current.size >= 2) {
      const [a,b] = [...ptrs.current.values()]
      const ratio = Math.hypot(a.x-b.x, a.y-b.y) / g.d
      const k2 = Math.min(2.6, Math.max(0.22, g.k * ratio))
      const r = k2 / g.k
      liveRef.current = { k:k2, x: g.mx - (g.mx - g.x) * r, y: g.my - (g.my - g.y) * r }
      applyLive(); G.moved = true
    }
  }

  const onUp = (e) => {
    try { wrapRef.current?.releasePointerCapture?.(e.pointerId) } catch {}
    ptrs.current.delete(e.pointerId)
    if (ptrs.current.size === 0) {
      gest.current = null
      // ne toucher à React que si l'on a vraiment bougé :
      // sinon le re-rendu détruit le bouton avant que le clic n'arrive
      if (G.moved) { setTf({ ...liveRef.current }); computeView() }
      setTimeout(()=>{ G.moved = false }, 0)
    } else if (ptrs.current.size === 1) {
      const [p] = [...ptrs.current.values()]
      gest.current = { mode:'pan', sx:p.x, sy:p.y, ox:liveRef.current.x, oy:liveRef.current.y }
    }
  }

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const el = wrapRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    const mx = e.clientX - r.left, my = e.clientY - r.top
    const cur = liveRef.current
    const k2 = Math.min(2.6, Math.max(0.22, cur.k * (1 - e.deltaY * 0.0014)))
    const ratio = k2 / cur.k
    liveRef.current = { k:k2, x: mx - (mx - cur.x) * ratio, y: my - (my - cur.y) * ratio }
    applyLive()
    clearTimeout(onWheel._t)
    onWheel._t = setTimeout(()=>setTf({ ...liveRef.current }), 140)
  }, [setTf])

  useEffect(() => {
    if (isTouch) return   // pas de molette sur tactile ; le pincement est géré par la bibliothèque
    const el = wrapRef.current; if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel, isTouch])

  // ── Tactile (téléphone) : react-zoom-pan-pinch gère pan + pincement + double-tap ──
  const onTouchTransform = useCallback((_ref, state) => {
    const prev = liveRef.current
    // même garde-fou que côté PC (G.moved) : seul un déplacement réel bloque le
    // tap suivant — onPanningStart seul se déclenche aussi sur un simple tap
    if (Math.abs(state.positionX - prev.x) > 3 || Math.abs(state.positionY - prev.y) > 3 || state.scale !== prev.k) {
      G.moved = true
    }
    liveRef.current = { x: state.positionX, y: state.positionY, k: state.scale }
    computeView()
    clearTimeout(onTouchTransform._t)
    onTouchTransform._t = setTimeout(() => setTf({ ...liveRef.current }), 140)
  }, [computeView, setTf])
  const touchGestureStop = useCallback(() => { setTimeout(() => { G.moved = false }, 0) }, [])

  const gridStep = 34
  const gridBg = {
    backgroundImage:`linear-gradient(rgba(190,178,152,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(190,178,152,.3) 1px, transparent 1px)`,
    backgroundSize:`${gridStep*tf.k}px ${gridStep*tf.k}px`,
    backgroundPosition:`${tf.x}px ${tf.y}px`,
    backgroundColor:'#E3DAC5',
  }

  return (
    <div style={{ position:'relative', height:'100%', display:'flex', flexDirection:'column', background:'#E3DAC5', userSelect:'none', WebkitUserSelect:'none' }}>
      <div style={{ position:'absolute', top:9, right:10, zIndex:5, display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end' }}>
        <button onClick={()=>setExpanded(new Set())} style={btn}>Tout replier</button>
        <button onClick={fit} style={btn}>Recentrer</button>
      </div>
      {isTouch ? (
        <div ref={wrapRef} style={{ flex:1, minHeight:300, overflow:'hidden', position:'relative' }}>
          <TransformWrapper ref={touchApiRef}
            initialScale={tf.k} initialPositionX={tf.x} initialPositionY={tf.y}
            minScale={0.22} maxScale={2.6} limitToBounds={false} centerOnInit={false}
            doubleClick={{ step: 0.7 }}
            onTransform={onTouchTransform}
            onPanningStop={touchGestureStop} onPinchStop={touchGestureStop}>
            <TransformComponent wrapperStyle={{ width:'100%', height:'100%', cursor:'grab', ...gridBg }}>
              <div style={{ width, height, position:'relative' }}>
                <Stage nodes={nodes} links={links} width={width} height={height} lang={lang}
                  view={view}
                  expanded={expanded} onToggle={(id)=>{ if(!G.moved) toggle(id) }}
                  onToggleObserved={(n)=>{ if(!G.moved) toggleObserved(n) }}
                  onSp={(sp)=>{ if(!G.moved) onSelectSpecies(sp.id) }}
                  onAdd={(c,sv)=>{ if(!G.moved) onAddSpecies?.(c,sv) }}
                  onInfo={(n)=>{ if(!G.moved) setInfoNode(n) }} />
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>
      ) : (
        <div ref={wrapRef}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          onPointerCancel={onUp} onPointerLeave={onUp} onLostPointerCapture={onUp}
          onDragStart={e=>e.preventDefault()}
          style={{ flex:1, minHeight:300, overflow:'hidden', position:'relative',
            cursor:'grab', touchAction:'none', userSelect:'none', WebkitUserSelect:'none',
            ...gridBg }}>
          <div ref={stageRef} style={{ position:'absolute', transformOrigin:'0 0',
            transform:`translate3d(${tf.x}px,${tf.y}px,0) scale(${tf.k})`, willChange:'transform' }}>
            <Stage nodes={nodes} links={links} width={width} height={height} lang={lang}
              view={view}
              expanded={expanded} onToggle={(id)=>{ if(!G.moved) toggle(id) }}
              onToggleObserved={(n)=>{ if(!G.moved) toggleObserved(n) }}
              onSp={(sp)=>{ if(!G.moved) onSelectSpecies(sp.id) }}
              onAdd={(c,sv)=>{ if(!G.moved) onAddSpecies?.(c,sv) }}
              onInfo={(n)=>{ if(!G.moved) setInfoNode(n) }} />
          </div>
        </div>
      )}
      {infoNode && <InfoPanel n={infoNode} lang={lang} onClose={()=>setInfoNode(null)} />}
    </div>
  )
}

function InfoPanel({ n, lang, onClose }) {
  const color = n.color || '#9A9081'
  const name = subNameOf(n.label, lang)
  return (
    <div onClick={onClose} style={{ position:'absolute', inset:0, zIndex:20,
      background:'rgba(30,26,20,.42)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ maxWidth:360, width:'100%', background:'#F2EEE2',
        borderRadius:16, padding:'20px 22px', boxShadow:'0 12px 40px rgba(43,38,32,.3)',
        borderTop:`4px solid ${color}` }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:8 }}>
          <div>
            <div className="serif" style={{ fontSize:17, fontWeight:800, color:'#2B2620' }}>{name.main}</div>
            <div style={{ fontSize:11, fontStyle:'italic', color:'#8A8172', marginTop:2 }}>{n.sub}</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(43,38,32,.08)', border:'none', borderRadius:'50%',
            width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', color:'#6B6357', fontSize:13, flexShrink:0 }}>✕</button>
        </div>
        {n.niche && <div style={{ fontSize:13, color:'#4A453B', lineHeight:1.6 }}>{n.niche}</div>}
      </div>
    </div>
  )
}

const Stage = memo(function Stage({ nodes, links, width, height, lang, expanded, onToggle, onToggleObserved, onSp, onAdd, onInfo, view }) {
  // culling : on ne dessine que ce qui est visible, avec une marge généreuse
  const vis = view
    ? nodes.filter(n => n.x > view.x0 && n.x < view.x1 && n.y > view.y0 && n.y < view.y1)
    : nodes
  const visLinks = view
    ? links.filter(l => Math.max(l.x1,l.x2) > view.x0 && Math.min(l.x1,l.x2) < view.x1
                     && Math.max(l.y1,l.y2) > view.y0 && Math.min(l.y1,l.y2) < view.y1)
    : links
  return (
    <>
      <svg width={width} height={height} style={{ position:'absolute', top:0, left:0, pointerEvents:'none' }}>
        {visLinks.map((l,i)=>{
          const my = (l.y1 + l.y2) / 2
          return <path key={i} d={`M${l.x1},${l.y1} C${l.x1},${my} ${l.x2},${my} ${l.x2},${l.y2}`}
            fill="none" stroke={l.depth===0?'#B0A182':'#C6B99E'} strokeWidth={l.depth===0?2:1.4} />
        })}
      </svg>
      {vis.map(n => (
        <Card key={n.id} n={n} lang={lang} expanded={expanded}
          toggle={()=>onToggle(n.id)}
          toggleObserved={()=>onToggleObserved(n)}
          onSp={()=> n.kind==='add' ? onAdd(n.cat, n.sub) : onSp(n.sp)}
          onInfo={()=>onInfo(n)} />
      ))}
      <div style={{ width, height }} />
    </>
  )
})

const btn = { fontSize:10.5, padding:'5px 9px', borderRadius:12, background:'#EDE7D8', color:'#6B6357', border:'1px solid #D3C7AE' }

function Card({ n, lang, expanded, toggle, toggleObserved, onSp, onInfo }) {
  const open = expanded.has(n.id)
  const hasKids = n.children?.length > 0
  const base = {
    position:'absolute', left:n.x - CARD_W/2, top:n.y - CARD_H/2,
    width:CARD_W, height:CARD_H, borderRadius:12, overflow:'hidden',
    display:'flex', flexDirection:'column', justifyContent:'flex-end',
    padding:8, textAlign:'left', border:'none', cursor:'pointer',
    boxShadow: open ? '0 3px 12px rgba(43,38,32,.18)' : '0 1px 4px rgba(43,38,32,.08)',
    transition:'box-shadow .15s, transform .15s', userSelect:'none',
  }

  if (n.kind === 'root') return (
    <button onClick={toggle} style={{ ...base, width:CARD_W+30, left:n.x-(CARD_W+30)/2, background:'linear-gradient(150deg,#22301C,#5A7248)' }}>
      <span style={{ position:'absolute', top:7, left:9, fontSize:19 }}>{n.e}</span>
      <span className="serif" style={{ fontSize:14, fontWeight:900, color:'#F2EEE2' }}>{n.label}</span>
    </button>
  )

  if (n.kind === 'cat') {
    const all = allSpecies().filter(s=>s.cat===n.cat.id)
    const obs = all.filter(isObserved).length
    return (
      <div role="button" tabIndex={0} onClick={toggle}
        onKeyDown={e=>{ if (e.key==='Enter'||e.key===' ') { e.preventDefault(); toggle() } }}
        style={{ ...base, background:gradientForCat(n.cat.id) }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(18,20,14,.62), transparent 58%)' }} />
        <span style={{ position:'absolute', top:6, left:8, fontSize:17 }}>{n.e}</span>
        {hasKids && (
          <button onClick={e=>{ e.stopPropagation(); toggleObserved() }}
            title="N'afficher que les branches observées"
            style={{ position:'absolute', top:6, right:7, width:15, height:15, borderRadius:5,
              background:'rgba(255,255,255,.22)', border:'none', padding:0, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:9, color:'#F2EEE2', transform:open?'rotate(180deg)':'none', transition:'transform .18s', lineHeight:1 }}>▾</span>
          </button>
        )}
        <span style={{ position:'relative', fontSize:10.5, fontWeight:700, color:'#F2EEE2', lineHeight:1.15 }}>{catNameOf(n.cat, lang).main}</span>
        {catNameOf(n.cat, lang).sub && <span style={{ position:'relative', fontSize:7.5, color:'rgba(242,238,226,.5)', lineHeight:1.1 }}>{catNameOf(n.cat, lang).sub}</span>}
        <span style={{ position:'relative', fontSize:8.5, color:'rgba(242,238,226,.75)' }}>{obs}/{all.length}</span>
      </div>
    )
  }

  if (n.kind === 'fam') {
    const m = n.members || []
    const obs = m.filter(isObserved).length
    const color = n.color || '#9A9081'
    return (
      <div role="button" tabIndex={0} onClick={toggle}
        onKeyDown={e=>{ if (e.key==='Enter'||e.key===' ') { e.preventDefault(); toggle() } }}
        style={{ ...base, background:'#D9CDB2', justifyContent:'center', alignItems:'flex-start' }}>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:color }} />
        {hasKids && <Chev open={open} dark />}
        {n.niche && (
          <button onClick={e=>{ e.stopPropagation(); onInfo() }} title="Informations sur l'ordre"
            style={{ position:'absolute', top:6, right: hasKids?26:7, width:15, height:15, borderRadius:'50%',
              background:color, border:'none', padding:0, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:9, fontStyle:'italic', fontWeight:800, color:'#fff', lineHeight:1 }}>i</span>
          </button>
        )}
        <span style={{ fontSize:10, fontWeight:700, color:'#3F382C', lineHeight:1.2, marginLeft:2 }}>{subNameOf(n.label, lang).main}</span>
        <span style={{ fontSize:8, color:'#8A8172', fontStyle:'italic', marginTop:2, marginLeft:2 }}>{n.sub}</span>
        <span style={{ fontSize:8.5, color:'#6B6357', marginTop:3, marginLeft:2 }}>{obs}/{m.length}</span>
      </div>
    )
  }

  if (n.kind === 'add') return (
    <button onClick={onSp} style={{ ...base, background:'transparent', border:'2px dashed #B5602F',
      alignItems:'center', justifyContent:'center', boxShadow:'none' }}>
      <span style={{ fontSize:20, color:'#B5602F', lineHeight:1 }}>+</span>
      <span style={{ fontSize:8, color:'#B5602F', marginTop:3, fontWeight:600 }}>
        {lang==='ru'?'вид':'espèce'}
      </span>
    </button>
  )

  const sp = n.sp, o = isObserved(sp), r = RARITY[sp.r] || RARITY.commun
  const uncertain = (sp.inds || []).some(i => i.uncertain)
  return (
    <button onClick={onSp} style={{ ...base, background:'#DDD3BE', opacity:o?1:.68,
      border: uncertain ? '2px solid #D68C34' : 'none',
      boxShadow: uncertain ? '0 0 0 1px rgba(214,140,52,.3)' : base.boxShadow }}>
      {o
        ? <CoverBg sp={sp} fallback={gradientFor(sp.id)} />
        : <div style={{ position:'absolute', inset:0, background:'#DDD3BE' }} />}
      {o && <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(16,18,12,.66), transparent 55%)' }} />}
      <span style={{ position:'absolute', top:6, left:8, fontSize:17, filter:o?'none':'grayscale(.65)' }}>{sp.e}</span>
      <span style={{ position:'absolute', top:8, right:8, width:8, height:8, borderRadius:2, background:o?r.c:'#BFB39A' }} />
      {uncertain && <span title="Identification à confirmer" style={{ position:'absolute', bottom:6, right:6, width:13, height:13,
        borderRadius:'50%', background:'#D68C34', color:'#fff', fontSize:9, fontWeight:800, display:'flex',
        alignItems:'center', justifyContent:'center', lineHeight:1, zIndex:2 }}>?</span>}
      <span style={{ position:'relative', fontSize:9.5, fontWeight:o?700:500, color:o?'#F2EEE2':'#5A5245', lineHeight:1.12 }}>{nameOf(sp, lang).main}</span>
      {nameOf(sp, lang).sub && <span style={{ position:'relative', fontSize:7.5, color:o?'rgba(242,238,226,.5)':'rgba(90,82,69,.45)', lineHeight:1.1, marginTop:1 }}>{nameOf(sp, lang).sub}</span>}
    </button>
  )
}

function Chev({ open, dark }) {
  return (
    <span style={{ position:'absolute', top:6, right:7, width:15, height:15, borderRadius:5,
      background: dark?'rgba(107,99,87,.16)':'rgba(255,255,255,.22)',
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontSize:9, color: dark?'#5A5245':'#F2EEE2', transform:open?'rotate(180deg)':'none', transition:'transform .18s', lineHeight:1 }}>▾</span>
    </span>
  )
}
