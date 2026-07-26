import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { TransformWrapper, TransformComponent, Virtualize, useControls, useTransformEffect } from 'react-zoom-pan-pinch'
import { RARITY, isObserved } from './data'
import { allSpecies, allCats } from './store.js'
import { gradientFor, gradientForCat } from './gradients.js'
import { nameOf, catNameOf } from './i18n.js'
import { CoverBg } from './photoui.jsx'

const CARD_W = 92, CARD_H = 68, GAP_X = 14, LEVEL_Y = 118
const GRID_STEP = 34
const K_MIN = 0.22, K_MAX = 2.6
// décalage vertical par colonne — évite une map trop horizontale
const STAGGER = [0, 46, 16, 62, 30, 74]

export default function MindMap({ onSelectSpecies, lang='fr', expanded, setExpanded, tf, setTf, edit, onAddSpecies }) {
  const toggle = useCallback((id) => {
    setExpanded(prev => {
      const n = new Set(prev)
      if (n.has(id)) { n.delete(id); for (const k of [...n]) if (k.startsWith(id + ':')) n.delete(k) }
      else n.add(id)
      return n
    })
  }, [])

  const SPECIES = allSpecies()
  const CATS = allCats()

  const { nodes, links, width, height } = useMemo(() => {
    const root = {
      id: 'root', kind: 'root', label: 'Pokédex', e: '🌿',
      children: CATS.map((cat, ci) => ({
        id: cat.id, kind: 'cat', label: cat.n, sub: cat.lat, e: cat.e, cat, stagger: STAGGER[ci % STAGGER.length],
        children: cat.subs.map(sv => ({
          id: cat.id + ':' + sv.id, kind: 'fam', label: sv.id, sub: sv.lat,
          members: SPECIES.filter(sp => sp.cat === cat.id && sp.sub === sv.id),
          children: [
            ...SPECIES.filter(sp => sp.cat === cat.id && sp.sub === sv.id)
              .map(sp => ({ id: cat.id + ':' + sv.id + ':' + sp.id, kind: 'sp', sp, children: [] })),
            ...(edit ? [{ id: cat.id + ':' + sv.id + ':__add', kind: 'add', cat: cat.id, sub: sv.id, children: [] }] : []),
          ]
        }))
      }))
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
          links.push({ x1: n.x, y1: n.y + CARD_H / 2, x2: c.x, y2: c.y - CARD_H / 2 })
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
  }, [expanded, edit, SPECIES.length, CATS.length])

  return (
    <div style={{ position:'relative', height:'100%', display:'flex', flexDirection:'column', background:'#E3DAC5', userSelect:'none', WebkitUserSelect:'none' }}>
      <TransformWrapper
        initialScale={tf.k || 1} initialPositionX={tf.x || 0} initialPositionY={tf.y || 0}
        minScale={K_MIN} maxScale={K_MAX} limitToBounds
        wheel={{ step: 0.15 }} doubleClick={{ disabled: true }}
      >
        <MapView width={width} height={height} nodes={nodes} links={links} lang={lang}
          expanded={expanded} toggle={toggle} onSelectSpecies={onSelectSpecies} onAddSpecies={onAddSpecies}
          setExpanded={setExpanded} tf={tf} setTf={setTf} />
      </TransformWrapper>
    </div>
  )
}

// composant interne : rendu sous <TransformWrapper>, seul endroit où les hooks
// useControls/useTransformEffect de la librairie sont utilisables
function MapView({ width, height, nodes, links, lang, expanded, toggle, onSelectSpecies, onAddSpecies, setExpanded, tf, setTf }) {
  const { zoomIn, zoomOut, setTransform, instance } = useControls()

  useTransformEffect(({ state }) => {
    setTf({ x: state.positionX, y: state.positionY, k: state.scale })
  })

  const fit = useCallback((animationTime = 0) => {
    const el = instance?.wrapperComponent
    if (!el) return
    const vw = el.clientWidth, vh = el.clientHeight
    const k = Math.max(0.3, Math.min(1, Math.min((vw - 40) / width, (vh - 40) / height)))
    setTransform((vw - width * k) / 2, 14, k, animationTime)
  }, [width, height, setTransform, instance])

  // recentre uniquement au tout premier affichage (tf encore à sa valeur par
  // défaut) — un règne qu'on déplie ensuite ne fait plus sauter la vue
  const didInitialFit = useRef(false)
  useEffect(() => {
    if (didInitialFit.current) return
    if (tf.k === 1 && tf.x === 0 && tf.y === 0) { didInitialFit.current = true; fit() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div style={{ position:'absolute', top:9, right:10, zIndex:5, display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end' }}>
        <button onClick={()=>setExpanded(new Set())} style={btn}>Tout replier</button>
        <button onClick={()=>fit(200)} style={btn}>Recentrer</button>
      </div>
      <div style={{ position:'absolute', bottom:52, right:10, zIndex:5, display:'flex', flexDirection:'column', gap:5 }}>
        <button onClick={()=>zoomIn(0.3)} style={{ ...btn, width:34, height:34, padding:0, fontSize:18, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
        <button onClick={()=>zoomOut(0.3)} style={{ ...btn, width:34, height:34, padding:0, fontSize:18, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
      </div>

      <TransformComponent wrapperStyle={{ flex:1, width:'100%', height:'100%' }} contentStyle={{}}>
        <div style={{ width, height, position:'relative', cursor:'grab',
          backgroundImage:`linear-gradient(rgba(190,178,152,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(190,178,152,.3) 1px, transparent 1px)`,
          backgroundSize:`${GRID_STEP}px ${GRID_STEP}px`, backgroundColor:'#E3DAC5' }}>
          <svg width={width} height={height} style={{ position:'absolute', top:0, left:0, pointerEvents:'none' }}>
            {links.map((l,i)=>{
              const my = (l.y1 + l.y2) / 2
              return <path key={i} d={`M${l.x1},${l.y1} C${l.x1},${my} ${l.x2},${my} ${l.x2},${l.y2}`}
                fill="none" stroke={l.depth===0?'#B0A182':'#C6B99E'} strokeWidth={l.depth===0?2:1.4} />
            })}
          </svg>
          {nodes.map(n => (
            <Virtualize key={n.id} x={n.x - CARD_W/2} y={n.y - CARD_H/2} width={CARD_W} height={CARD_H} margin={400}>
              <Card n={n} lang={lang} expanded={expanded}
                toggle={()=>toggle(n.id)}
                onSp={()=> n.kind==='add' ? onAddSpecies?.(n.cat, n.sub) : onSelectSpecies(n.sp.id)} />
            </Virtualize>
          ))}
        </div>
      </TransformComponent>

      <div style={{ display:'flex', gap:12, flexWrap:'wrap', padding:'8px 14px', borderTop:'1px solid #D3C7AE', fontSize:10.5, color:'#6B6357', background:'#E3DAC5', alignItems:'center' }}>
        {Object.entries(RARITY).map(([k,r])=>(
          <span key={k} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:9, height:9, borderRadius:2, background:r.c }} />{r.l}
          </span>
        ))}
        <span style={{ display:'flex', alignItems:'center', gap:4, opacity:.65 }}>
          <span style={{ width:9, height:9, borderRadius:2, background:'#CFC3A8' }} />Non observée
        </span>
        <span style={{ marginLeft:'auto', color:'#9A9081' }}>Clique pour déployer · molette pour zoomer</span>
      </div>
    </>
  )
}

const btn = { fontSize:10.5, padding:'5px 9px', borderRadius:12, background:'#EDE7D8', color:'#6B6357', border:'1px solid #D3C7AE' }

function Card({ n, lang, expanded, toggle, onSp }) {
  const open = expanded.has(n.id)
  const hasKids = n.children?.length > 0
  const base = {
    position:'absolute', left:n.x - CARD_W/2, top:n.y - CARD_H/2,
    width:CARD_W, height:CARD_H, borderRadius:12, overflow:'hidden',
    display:'flex', flexDirection:'column', justifyContent:'flex-end',
    padding:8, textAlign:'left', border:'none', cursor:'pointer',
    // pas d'ombre floutée : coûteuse à recomposer sur mobile pendant un pan/zoom
    // avec beaucoup de cartes visibles (grille dense d'un règne déployé)
    boxShadow: open ? 'inset 0 0 0 1.5px rgba(43,38,32,.3)' : 'none',
    userSelect:'none',
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
      <button onClick={toggle} style={{ ...base, background:gradientForCat(n.cat.id) }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(18,20,14,.62), transparent 58%)' }} />
        <span style={{ position:'absolute', top:6, left:8, fontSize:17 }}>{n.e}</span>
        {hasKids && <Chev open={open} />}
        <span style={{ position:'relative', fontSize:10.5, fontWeight:700, color:'#F2EEE2', lineHeight:1.15 }}>{catNameOf(n.cat, lang).main}</span>
        {catNameOf(n.cat, lang).sub && <span style={{ position:'relative', fontSize:7.5, color:'rgba(242,238,226,.5)', lineHeight:1.1 }}>{catNameOf(n.cat, lang).sub}</span>}
        <span style={{ position:'relative', fontSize:8.5, color:'rgba(242,238,226,.75)' }}>{obs}/{all.length}</span>
      </button>
    )
  }

  if (n.kind === 'fam') {
    const m = n.members || []
    const obs = m.filter(isObserved).length
    return (
      <button onClick={toggle} style={{ ...base, background:'#D9CDB2', justifyContent:'center', alignItems:'flex-start' }}>
        {hasKids && <Chev open={open} dark />}
        <span style={{ fontSize:10, fontWeight:700, color:'#3F382C', lineHeight:1.2 }}>{n.label}</span>
        <span style={{ fontSize:8, color:'#8A8172', fontStyle:'italic', marginTop:2 }}>{n.sub}</span>
        <span style={{ fontSize:8.5, color:'#6B6357', marginTop:3 }}>{obs}/{m.length}</span>
      </button>
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
  return (
    <button onClick={onSp} style={{ ...base, background:'#DDD3BE', opacity:o?1:.68 }}>
      {o
        ? <CoverBg sp={sp} fallback={gradientFor(sp.id)} plain />
        : <div style={{ position:'absolute', inset:0, background:'#DDD3BE' }} />}
      {o && <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(16,18,12,.66), transparent 55%)' }} />}
      <span style={{ position:'absolute', top:6, left:8, fontSize:17, filter:o?'none':'grayscale(.65)' }}>{sp.e}</span>
      <span style={{ position:'absolute', top:8, right:8, width:8, height:8, borderRadius:2, background:o?r.c:'#BFB39A' }} />
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
