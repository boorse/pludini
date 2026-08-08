import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { sb } from './supabase.js'
import { photosFor, addPhotoRec, removePhoto, setPhotoPos, flushPhotoPos, setPhotoZoom, flushPhotoZoom, replacePhotoImage,
         subscribe, allPlayers, getMe, coverPhoto, speciesPhotos, coverIdFor, setPhotoCover, clearPhotoCover } from './store.js'

// pas de sepia/hue-rotate : ça écrasait le bleu du ciel et virait tout au
// brun (l'effet "vieux filtre Instagram" signalé) — juste un peu de
// saturation/contraste/lumière pour faire ressortir le ciel, le vert et
// les fleurs sans dénaturer les couleurs
export const LUT = 'saturate(1.15) contrast(1.06) brightness(1.02)'

const T = { bg:'#EDE7D8', card:'#E6DDC8', ink:'#2B2620', soft:'#6B6357',
  mute:'#9A9081', line:'#D3C7AE', clay:'#B5602F', sageDark:'#4A5D32' }

// chemin de la miniature déduit du chemin principal
export const thumbOf = (path) => path ? path.replace(/\.jpg$/, '_t.jpg') : path

// cadrage choisi pour une photo : un scale() centré sur le même point focal que
// object-position, donc se compose avec object-fit:cover sans le casser — utilisé
// sur les vignettes ET les bannières (jamais sur le Lightbox plein écran, qui
// montre volontairement la photo d'origine non recadrée)
export function thumbZoomStyle(photo) {
  const zoom = photo?.zoom || 1
  if (zoom <= 1.001) return {}
  return { transform:`scale(${zoom})`, transformOrigin: photo?.pos || '50% 50%' }
}

export function compress(file, maxSide = 1600, quality = 0.82) {
  return new Promise((res, rej) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width:w, height:h } = img
      if (Math.max(w,h) > maxSide) { const r = maxSide/Math.max(w,h); w = Math.round(w*r); h = Math.round(h*r) }
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d').drawImage(img, 0, 0, w, h)
      c.toBlob(b => b ? res(b) : rej(new Error('compression échouée')), 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image illisible')) }
    img.src = url
  })
}

// lecture depuis le cache central — aucune requête réseau
const EMPTY = []
export function usePhotos(target) {
  const photos = useSyncExternalStore(
    subscribe,
    () => photosFor(target),
    () => EMPTY
  )
  return { photos }
}

// ── Fond photo : jamais de superposition, pas de clignotement ──
export function PhotoBg({ target, fallback, rounded = 0, thumb = true }) {
  const { photos } = usePhotos(target)
  const cover = photos[0]
  const src = cover ? (thumb && cover.thumbUrl ? cover.thumbUrl : cover.url) : null
  return (
    <div style={{ position:'absolute', inset:0, borderRadius:rounded, overflow:'hidden',
      background: cover ? '#1E2418' : fallback }}>
      {src && (
        <img src={src} alt="" loading="lazy" decoding="async" draggable={false}
          style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:cover.pos||'50% 50%', filter:LUT, display:'block',
            ...(thumb ? thumbZoomStyle(cover) : {}) }} />
      )}
    </div>
  )
}

// import + compression + upload d'une seule photo — réutilisé par PhotoManager et par le formulaire d'observation
export async function uploadPhotoFile(target, file, caption = '', by = '') {
  const isHero = String(target) === 'site:hero'
  const [blob, thumb] = await Promise.all([
    compress(file, isHero ? 2560 : 1600, isHero ? 0.9 : 0.82),
    compress(file, 260, 0.72),
  ])
  const base = `${String(target).replace(/[^a-zA-Z0-9_-]/g,'_')}/${Date.now()}_${Math.random().toString(36).slice(2,7)}`
  const path = base + '.jpg'
  const up = await sb.storage.from('photos').upload(path, blob, { contentType:'image/jpeg' })
  if (up.error) throw new Error(up.error.message)
  await sb.storage.from('photos').upload(base + '_t.jpg', thumb, { contentType:'image/jpeg' })
  return addPhotoRec({ target, path, caption, by })
}

// remplace le fichier d'une photo existante (même id, même position, mêmes
// réglages de cadrage) — supprime l'ancien fichier de stockage après coup
export async function replacePhotoFile(target, photo, file) {
  const isHero = String(target) === 'site:hero'
  const [blob, thumb] = await Promise.all([
    compress(file, isHero ? 2560 : 1600, isHero ? 0.9 : 0.82),
    compress(file, 260, 0.72),
  ])
  const base = `${String(target).replace(/[^a-zA-Z0-9_-]/g,'_')}/${Date.now()}_${Math.random().toString(36).slice(2,7)}`
  const path = base + '.jpg'
  const up = await sb.storage.from('photos').upload(path, blob, { contentType:'image/jpeg' })
  if (up.error) throw new Error(up.error.message)
  await sb.storage.from('photos').upload(base + '_t.jpg', thumb, { contentType:'image/jpeg' })
  await replacePhotoImage(target, photo.id, path)
  if (photo.path) await sb.storage.from('photos').remove([photo.path, thumbOf(photo.path)]).catch(()=>{})
}

// import d'un fichier audio (cri/chant importé plutôt qu'un simple lien) —
// pas de compression/miniature ici, juste un dépôt brut dans le même bucket ;
// renvoie l'URL publique directement utilisable comme sp.audio
export async function uploadAudioFile(file) {
  const ext = (file.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g,'') || 'mp3'
  const path = `audio/${Date.now()}_${Math.random().toString(36).slice(2,7)}.${ext}`
  const up = await sb.storage.from('photos').upload(path, file, { contentType: file.type || 'audio/mpeg' })
  if (up.error) throw new Error(up.error.message)
  return sb.storage.from('photos').getPublicUrl(path).data.publicUrl
}

// re-rendu forcé quand le magasin change — utilisé par les vignettes dérivées (pas de snapshot figé possible)
function useStoreTick() {
  const [, tick] = useState(0)
  useEffect(() => subscribe(() => tick(x => x + 1)), [])
}

// ── Fond vignette d'espèce : reprend la photo choisie en réglages (ou la 1ère dispo) ──
// plain=true : saute le filtre colorimétrique (coûteux à composer sur mobile
// quand beaucoup de vignettes sont visibles en même temps, ex. Mindmap dense)
export function CoverBg({ sp, fallback, rounded = 0, thumb = true, plain = false }) {
  useStoreTick()
  const cover = coverPhoto(sp)
  const src = cover ? (thumb && cover.thumbUrl ? cover.thumbUrl : cover.url) : null
  return (
    <div style={{ position:'absolute', inset:0, borderRadius:rounded, overflow:'hidden',
      background: cover ? '#1E2418' : fallback }}>
      {src && (
        <img src={src} alt="" loading="lazy" decoding="async" draggable={false}
          style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:cover.pos||'50% 50%', filter:plain?'none':LUT, display:'block', WebkitTouchCallout:'none',
            ...(thumb ? thumbZoomStyle(cover) : {}) }} />
      )}
    </div>
  )
}

const navBtn = (side) => ({
  position:'absolute', top:'50%', [side]:8, transform:'translateY(-50%)', zIndex:2,
  width:30, height:30, borderRadius:'50%', background:'rgba(0,0,0,.4)', color:'#fff',
  display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, lineHeight:1, padding:0,
})

// ── Bannière photo avec carrousel (flèches, points) + clic pour agrandir ──
// indicateur de position dans un carrousel : des points si peu nombreux, sinon
// un compteur texte "3/35" — pour ne jamais déborder de la largeur de l'écran
function CarouselDots({ count, idx }) {
  if (count <= 8) {
    return (
      <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', display:'flex', gap:4, zIndex:2 }}>
        {Array.from({ length:count }).map((_,i)=>(
          <span key={i} style={{ width:i===idx?14:5, height:5, borderRadius:3,
            background: i===idx?'#F2EEE2':'rgba(242,238,226,.45)', transition:'width .15s' }} />
        ))}
      </div>
    )
  }
  return (
    <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', zIndex:2,
      background:'rgba(0,0,0,.4)', color:'#F2EEE2', fontSize:10.5, fontWeight:600, padding:'3px 9px', borderRadius:10 }}>
      {idx+1} / {count}
    </div>
  )
}

export function PhotoHero({ target, fallback }) {
  const { photos } = usePhotos(target)
  const [idx, setIdx] = useState(0)
  const [open, setOpen] = useState(false)
  useEffect(() => { if (idx >= photos.length) setIdx(0) }, [photos.length, idx])
  const cover = photos[idx]
  const many = photos.length > 1
  return (
    <>
      <div onClick={()=>cover && setOpen(true)} style={{ position:'absolute', inset:0, overflow:'hidden',
        background: cover ? '#1E2418' : fallback, cursor: cover ? 'zoom-in' : 'default' }}>
        {cover && (
          <img src={cover.url} alt="" loading="lazy" decoding="async" draggable={false}
            style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:cover.pos||'50% 50%', filter:LUT, display:'block',
              ...thumbZoomStyle(cover) }} />
        )}
      </div>
      {many && <>
        <button onClick={(e)=>{ e.stopPropagation(); setIdx(i=>(i-1+photos.length)%photos.length) }} style={navBtn('left')}>‹</button>
        <button onClick={(e)=>{ e.stopPropagation(); setIdx(i=>(i+1)%photos.length) }} style={navBtn('right')}>›</button>
        <CarouselDots count={photos.length} idx={idx} />
      </>}
      {open && cover && <Lightbox photos={photos} index={idx} onIndex={setIdx} onClose={()=>setOpen(false)} />}
    </>
  )
}

// ── Bannière de fiche espèce : toutes les photos de tous les individus, parcourues aux flèches ──
export function PhotoHeroSpecies({ sp, fallback }) {
  useStoreTick()
  const shots = speciesPhotos(sp)
  const [idx, setIdx] = useState(0)
  const [open, setOpen] = useState(false)
  useEffect(() => { if (idx >= shots.length) setIdx(0) }, [shots.length, idx])
  const current = shots[idx]
  const many = shots.length > 1
  const photos = shots.map(s => s.photo)
  return (
    <>
      <div onClick={()=>current && setOpen(true)} style={{ position:'absolute', inset:0, overflow:'hidden',
        background: current ? '#1E2418' : fallback, cursor: current ? 'zoom-in' : 'default' }}>
        {current && (
          <img src={current.photo.url} alt="" loading="lazy" decoding="async" draggable={false}
            style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:current.photo.pos||'50% 50%', filter:LUT, display:'block',
              ...thumbZoomStyle(current.photo) }} />
        )}
      </div>
      {current && (
        <div style={{ position:'absolute', bottom:8, right:10, zIndex:2, background:'rgba(0,0,0,.4)', color:'#F2EEE2',
          fontSize:10.5, fontWeight:600, padding:'3px 9px', borderRadius:10, maxWidth:'46%', textAlign:'right',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{current.displayName}</div>
      )}
      {many && <>
        <button onClick={(e)=>{ e.stopPropagation(); setIdx(i=>(i-1+shots.length)%shots.length) }} style={navBtn('left')}>‹</button>
        <button onClick={(e)=>{ e.stopPropagation(); setIdx(i=>(i+1)%shots.length) }} style={navBtn('right')}>›</button>
        <CarouselDots count={shots.length} idx={idx} />
      </>}
      {open && current && <Lightbox photos={photos} index={idx} onIndex={setIdx} onClose={()=>setOpen(false)} />}
    </>
  )
}

const bigNavBtn = (side) => ({
  position:'absolute', top:'50%', [side]:16, transform:'translateY(-50%)',
  width:42, height:42, borderRadius:'50%', background:'rgba(255,255,255,.12)', color:'#fff',
  display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, lineHeight:1, padding:0,
})

// ── Visionneuse plein écran, résolution maximale ──
// zoom : molette (PC), pincement (mobile), double-clic/double-tap (reset ou zoom ×2.5)
export function Lightbox({ photos, index, onIndex, onClose }) {
  const p = photos[index]
  const many = photos.length > 1
  const [tf, setTf] = useState({ k:1, x:0, y:0 })
  const imgRef = useRef(null)
  const ptrs = useRef(new Map())
  const gest = useRef(null)
  const movedRef = useRef(false)
  const lastTapRef = useRef(0)

  useEffect(() => { setTf({ k:1, x:0, y:0 }) }, [index])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && many) onIndex(i=>(i-1+photos.length)%photos.length)
      else if (e.key === 'ArrowRight' && many) onIndex(i=>(i+1)%photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photos.length, many, onClose, onIndex])

  const clampK = (k) => Math.min(5, Math.max(1, k))
  const centerOf = (clientX, clientY) => {
    const r = imgRef.current.getBoundingClientRect()
    return { mx: clientX - r.left - r.width/2, my: clientY - r.top - r.height/2 }
  }
  const zoomAt = (clientX, clientY, factor) => {
    const { mx, my } = centerOf(clientX, clientY)
    setTf(cur => {
      const k2 = clampK(cur.k * factor)
      const ratio = k2 / cur.k
      return { k:k2, x: mx - (mx - cur.x)*ratio, y: my - (my - cur.y)*ratio }
    })
  }
  const toggleZoomAt = (clientX, clientY) => {
    setTf(cur => {
      if (cur.k > 1.05) return { k:1, x:0, y:0 }
      const { mx, my } = centerOf(clientX, clientY)
      const k2 = 2.5
      return { k:k2, x: mx - mx*k2, y: my - my*k2 }
    })
  }

  const onWheel = (e) => {
    e.preventDefault()
    zoomAt(e.clientX, e.clientY, 1 - e.deltaY * 0.0016)
  }
  const onDoubleClick = (e) => { e.stopPropagation(); toggleZoomAt(e.clientX, e.clientY) }

  const onPointerDown = (e) => {
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    ptrs.current.set(e.pointerId, { x:e.clientX, y:e.clientY })
    movedRef.current = false
    if (ptrs.current.size === 1) {
      gest.current = { mode:'pan', sx:e.clientX, sy:e.clientY, ox:tf.x, oy:tf.y }
    } else if (ptrs.current.size === 2) {
      const [a,b] = [...ptrs.current.values()]
      const { mx, my } = centerOf((a.x+b.x)/2, (a.y+b.y)/2)
      gest.current = { mode:'pinch', d:Math.hypot(a.x-b.x, a.y-b.y), k:tf.k, x:tf.x, y:tf.y, mx, my }
    }
  }
  const onPointerMove = (e) => {
    if (!ptrs.current.has(e.pointerId)) return
    ptrs.current.set(e.pointerId, { x:e.clientX, y:e.clientY })
    const g = gest.current; if (!g) return
    if (g.mode === 'pan' && ptrs.current.size === 1) {
      const dx = e.clientX - g.sx, dy = e.clientY - g.sy
      if (!movedRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) movedRef.current = true
      if (tf.k <= 1.001) return // rien à déplacer sans zoom — laisse le tap simple fermer/naviguer
      setTf({ k:tf.k, x: g.ox + dx, y: g.oy + dy })
    } else if (g.mode === 'pinch' && ptrs.current.size >= 2) {
      const [a,b] = [...ptrs.current.values()]
      const ratio = Math.hypot(a.x-b.x, a.y-b.y) / g.d
      const k2 = clampK(g.k * ratio)
      const r = k2 / g.k
      movedRef.current = true
      setTf({ k:k2, x: g.mx - (g.mx - g.x)*r, y: g.my - (g.my - g.y)*r })
    }
  }
  const onPointerUp = (e) => {
    ptrs.current.delete(e.pointerId)
    if (ptrs.current.size === 0) {
      gest.current = null
      // double-tap tactile : deux relâchements rapprochés dans le temps
      const now = Date.now()
      if (!movedRef.current && now - lastTapRef.current < 300) { toggleZoomAt(e.clientX, e.clientY); lastTapRef.current = 0 }
      else lastTapRef.current = now
      setTimeout(() => { movedRef.current = false }, 0)
    } else if (ptrs.current.size === 1) {
      const [pt] = [...ptrs.current.values()]
      gest.current = { mode:'pan', sx:pt.x, sy:pt.y, ox:tf.x, oy:tf.y }
    }
  }

  if (!p) return null
  return (
    <div onClick={()=>{ if (!movedRef.current) onClose() }} style={{ position:'fixed', inset:0, background:'rgba(10,11,7,.92)', zIndex:200,
      display:'flex', alignItems:'center', justifyContent:'center', padding:28, overflow:'hidden' }}>
      <img ref={imgRef} src={p.url} alt="" draggable={false}
        onClick={e=>e.stopPropagation()} onDoubleClick={onDoubleClick}
        onPointerDown={e=>{ e.stopPropagation(); onPointerDown(e) }}
        onPointerMove={e=>{ e.stopPropagation(); onPointerMove(e) }}
        onPointerUp={e=>{ e.stopPropagation(); onPointerUp(e) }}
        onPointerCancel={e=>{ e.stopPropagation(); onPointerUp(e) }}
        onWheel={onWheel}
        style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', filter:LUT, borderRadius:4,
          touchAction:'none', cursor: tf.k>1?'grab':'zoom-in',
          transform:`translate(${tf.x}px,${tf.y}px) scale(${tf.k})`, transformOrigin:'center center',
          transition: gest.current ? 'none' : 'transform .12s ease-out' }} />
      <button onClick={onClose} style={{ position:'absolute', top:16, right:16, width:36, height:36,
        borderRadius:'50%', background:'rgba(255,255,255,.12)', color:'#fff', fontSize:16, zIndex:2 }}>✕</button>
      {many && <>
        <button onClick={(e)=>{ e.stopPropagation(); onIndex(i=>(i-1+photos.length)%photos.length) }} style={bigNavBtn('left')}>‹</button>
        <button onClick={(e)=>{ e.stopPropagation(); onIndex(i=>(i+1)%photos.length) }} style={bigNavBtn('right')}>›</button>
        <div style={{ position:'absolute', bottom:18, left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,.65)', fontSize:12 }}>
          {index+1} / {photos.length}
        </div>
      </>}
      {(p.caption || p.by) && (
        <div style={{ position:'absolute', bottom: many?46:18, left:'50%', transform:'translateX(-50%)',
          color:'#F2EEE2', fontSize:12.5, textAlign:'center', maxWidth:'80%' }}>
          {p.caption}{p.caption && p.by ? ' — ' : ''}{p.by}
        </div>
      )}
    </div>
  )
}


export function PhotoManager({ target, label, lang, onClose }) {
  useStoreTick() // pour que l'étoile de vignette choisie se mette à jour tout de suite
  const { photos } = usePhotos(target)
  const coverId = coverIdFor(target)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [caption, setCaption] = useState('')
  const [by, setBy] = useState(getMe() || allPlayers()[0]?.name || '')
  const [cropPhoto, setCropPhoto] = useState(null)
  const inputRef = useRef(null)

  const handle = async (files) => {
    if (!files?.length) return
    setBusy(true); setErr(null)
    try {
      for (const f of files) {
        if (!f.type.startsWith('image/')) continue
        await uploadPhotoFile(target, f, caption, by)
      }
      setCaption('')
    } catch (e) { setErr(e.message || 'Import impossible') }
    setBusy(false)
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.6)', zIndex:120,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:18, width:'100%',
        maxWidth:620, maxHeight:'88vh', overflow:'auto', border:`1px solid ${T.line}` }}>
        <div style={{ position:'sticky', top:0, background:T.bg, borderBottom:`1px solid ${T.line}`,
          padding:'14px 18px', display:'flex', alignItems:'center', gap:10, zIndex:2 }}>
          <i className="ti ti-photo" style={{ fontSize:19, color:T.clay }} aria-hidden="true" />
          <div style={{ flex:1 }}>
            <div className="serif" style={{ fontSize:17, fontWeight:900, color:T.ink }}>Photos</div>
            <div style={{ fontSize:11.5, color:T.mute }}>{label}</div>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%',
            border:`1px solid ${T.line}`, color:T.soft }}>✕</button>
        </div>
        <div style={{ padding:'14px 18px 20px' }}>
          <div onDrop={(e)=>{ e.preventDefault(); handle([...e.dataTransfer.files]) }}
            onDragOver={e=>e.preventDefault()} onClick={()=>inputRef.current?.click()}
            style={{ border:`2px dashed ${T.line}`, borderRadius:14, padding:'26px 18px', textAlign:'center',
              cursor:'pointer', background:T.card, marginBottom:12 }}>
            <i className="ti ti-cloud-upload" style={{ fontSize:28, color:T.clay }} aria-hidden="true" />
            <div className="serif" style={{ fontSize:15, fontWeight:700, color:T.ink, marginTop:7 }}>
              {busy ? (lang==='ru'?'Загрузка…':'Import en cours…') : (lang==='ru'?'Перетащите фото':'Glisse tes photos ici')}
            </div>
            <div style={{ fontSize:11.5, color:T.mute, marginTop:3 }}>
              {lang==='ru'?'или нажмите':'ou clique pour choisir'}
            </div>
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={e=>handle([...e.target.files])} />
          </div>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:14 }}>
            <input value={caption} onChange={e=>setCaption(e.target.value)}
              placeholder={lang==='ru'?'Подпись':'Légende (facultatif)'}
              style={{ flex:1, minWidth:170, padding:'9px 11px', borderRadius:10,
                border:`1px solid ${T.line}`, background:T.card, fontSize:12.5, color:T.ink }} />
            <select value={by} onChange={e=>setBy(e.target.value)}
              style={{ padding:'9px 10px', borderRadius:10, border:`1px solid ${T.line}`,
                background:T.card, fontSize:12.5, color:T.soft }}>
              {allPlayers().map(p=><option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          {err && <div style={{ fontSize:12, color:'#B91C1C', background:'#FEF2F2', border:'1px solid #FCA5A5',
            borderRadius:9, padding:'8px 11px', marginBottom:12 }}>{err}</div>}
          {photos.length===0
            ? <div style={{ fontSize:12.5, color:T.mute, textAlign:'center', padding:'12px 0' }}>
                {lang==='ru'?'Пока нет фотографий.':'Aucune photo pour l\u2019instant.'}
              </div>
            : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:9 }}>
                {photos.map((p,i)=>{
                  const isCover = coverId ? coverId===p.id : i===0
                  return (
                  <div key={p.id} style={{ position:'relative', borderRadius:11, overflow:'hidden',
                    border:`1px solid ${isCover?T.clay:T.line}`, aspectRatio:'4/5' }}>
                    <img src={p.thumbUrl||p.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover',
                      objectPosition:p.pos||'50% 50%', filter:LUT, display:'block', ...thumbZoomStyle(p) }} />
                    <button onClick={()=>setCropPhoto(p)}
                      style={{ position:'absolute', top:6, left:6, width:24, height:24, borderRadius:'50%',
                        background:'rgba(0,0,0,.55)', color:'#fff', fontSize:12, display:'flex',
                        alignItems:'center', justifyContent:'center' }} title={lang==='ru'?'Кадрирование':'Cadrage'}>
                      <i className="ti ti-crop" style={{ fontSize:13 }} aria-hidden="true" />
                    </button>
                    <button onClick={()=>removePhoto(target, p.id, p.path)}
                      style={{ position:'absolute', top:6, right:6, width:24, height:24, borderRadius:'50%',
                        background:'rgba(0,0,0,.55)', color:'#fff', fontSize:12 }}>✕</button>
                    <button onClick={()=>isCover ? clearPhotoCover(target) : setPhotoCover(target, p.id)}
                      style={{ position:'absolute', bottom:6, right:6, width:24, height:24, borderRadius:'50%',
                        background: isCover ? T.clay : 'rgba(0,0,0,.55)', color:'#fff', fontSize:12, display:'flex',
                        alignItems:'center', justifyContent:'center', zIndex:2 }}
                      title={isCover ? (lang==='ru'?'Обложка (нажмите, чтобы сбросить)':'Vignette actuelle (clique pour réinitialiser)')
                                     : (lang==='ru'?'Сделать обложкой':'Choisir comme vignette')}>
                      <i className="ti ti-star" style={{ fontSize:13 }} aria-hidden="true" />
                    </button>
                    {(p.caption || p.by) && (
                      <div style={{ position:'absolute', left:0, right:0, bottom:0,
                        background:'linear-gradient(to top, rgba(14,16,10,.88), transparent)', padding:'14px 8px 7px' }}>
                        {p.caption && <div style={{ fontSize:10, color:'#F2EEE2' }}>{p.caption}</div>}
                        {p.by && <div style={{ fontSize:9, color:'rgba(242,238,226,.65)' }}>{p.by}</div>}
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>}
        </div>
      </div>
      {cropPhoto && <PhotoCropPicker target={target} photo={cropPhoto} lang={lang} onClose={()=>setCropPhoto(null)} />}
    </div>
  )
}

// ── Cadrage vignette : point focal + zoom, avec remplacement de la photo ──
// le point focal (comme avant) garde le sujet visible quel que soit le cadrage ;
// le zoom ne recadre QUE les vignettes (Conservatoire, matrice, galerie) — la
// bannière et le plein écran affichent toujours la photo entière, inchangée
export function PhotoCropPicker({ target, photo, lang, onClose }) {
  const [pos, setPos] = useState(photo.pos || '50% 50%')
  const [zoom, setZoom] = useState(photo.zoom || 1)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const boxRef = useRef(null)
  const [px, py] = pos.replace(/%/g,'').split(' ').map(Number)

  useEffect(() => () => { flushPhotoPos(photo.id); flushPhotoZoom(photo.id) }, [photo.id])

  const pick = (e) => {
    const box = boxRef.current, img = box?.querySelector('img')
    if (!box || !img || !img.naturalWidth) return
    const cr = box.getBoundingClientRect()
    const ir = img.naturalWidth / img.naturalHeight, cRatio = cr.width / cr.height
    let dispW = cr.width, dispH = cr.height, offX = 0, offY = 0
    if (ir > cRatio) { dispH = cr.width / ir; offY = (cr.height - dispH) / 2 }
    else { dispW = cr.height * ir; offX = (cr.width - dispW) / 2 }
    const fx = (e.clientX - cr.left - offX) / dispW, fy = (e.clientY - cr.top - offY) / dispH
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return
    const next = `${Math.round(fx*100)}% ${Math.round(fy*100)}%`
    setPos(next)
    setPhotoPos(target, photo.id, next)
  }

  const onZoom = (e) => {
    const z = parseFloat(e.target.value)
    setZoom(z)
    setPhotoZoom(target, photo.id, z)
  }

  const replace = async (file) => {
    if (!file) return
    setBusy(true); setErr(null)
    try { await replacePhotoFile(target, photo, file) }
    catch (e) { setErr(e?.message || (lang==='ru'?'Не удалось заменить фото.':'Échec du remplacement de la photo.')) }
    setBusy(false)
  }

  // taille du cadre affiché = inverse du zoom (zoom 1× = cadre plein cadre)
  const frameSize = 100 / zoom

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.7)', zIndex:150,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:18, padding:22,
        maxWidth:860, width:'100%', maxHeight:'92vh', overflowY:'auto', border:`1px solid ${T.line}` }}>
        <div className="serif" style={{ fontSize:19, fontWeight:700, color:T.ink, marginBottom:6 }}>
          {lang==='ru'?'Кадрирование фото':'Cadrage de la photo'}
        </div>
        <div style={{ fontSize:13, color:T.soft, marginBottom:14, lineHeight:1.5, maxWidth:560 }}>
          {lang==='ru'
            ? 'Нажмите на животное, затем настройте масштаб рамки. Применяется к миниатюрам и к баннеру в шапке страницы — оригинал фото (при полном просмотре) не меняется.'
            : 'Touche l’animal sur la photo, puis ajuste le cadre transparent : ce cadrage s’applique aux vignettes et à la bannière en haut de la fiche. La photo d’origine (en plein écran) ne change jamais.'}
        </div>
        <div ref={boxRef} onClick={pick} style={{ position:'relative', width:'100%', aspectRatio:'16/10',
          maxHeight:'56vh', margin:'0 auto', borderRadius:12, overflow:'hidden', cursor:'crosshair', background:'#1E2418' }}>
          <img src={photo.url} alt="" draggable={false}
            style={{ width:'100%', height:'100%', objectFit:'contain', filter:LUT, display:'block' }} />
          <div style={{ position:'absolute', left:`${px}%`, top:`${py}%`, transform:'translate(-50%,-50%)',
            width:`${frameSize}%`, height:`${frameSize}%`, border:'2.5px solid #fff', borderRadius:4,
            boxShadow:'0 0 0 1.5px rgba(0,0,0,.45), 0 0 0 2000px rgba(14,16,10,.55)',
            pointerEvents:'none', transition:'width .12s, height .12s' }} />
        </div>
        <label style={{ display:'flex', alignItems:'center', gap:12, marginTop:18, maxWidth:520 }}>
          <i className="ti ti-zoom-in" style={{ fontSize:19, color:T.mute, flexShrink:0 }} aria-hidden="true" />
          <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={onZoom} style={{ flex:1, height:22 }} />
          <span style={{ fontSize:13, color:T.soft, width:38, textAlign:'right', flexShrink:0, fontWeight:600 }}>×{zoom.toFixed(1)}</span>
        </label>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginTop:16 }}>
          <div style={{ width:88, height:88, borderRadius:12, overflow:'hidden', border:`1px solid ${T.line}`, flexShrink:0 }}>
            <img src={photo.thumbUrl||photo.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover',
              objectPosition:pos, transform: zoom>1.001?`scale(${zoom})`:undefined, transformOrigin:pos, display:'block' }} />
          </div>
          <div style={{ fontSize:12.5, color:T.mute, lineHeight:1.4 }}>
            {lang==='ru'?'Так будет выглядеть миниатюра':'Aperçu de la vignette'}
          </div>
        </div>
        {err && <div style={{ fontSize:12.5, color:'#B91C1C', background:'#FEF2F2', border:'1px solid #FCA5A5',
          borderRadius:10, padding:'8px 12px', marginTop:12 }}>{err}</div>}
        <div style={{ display:'flex', gap:10, marginTop:18, maxWidth:420 }}>
          <label style={{ flex:1, textAlign:'center', padding:'11px', borderRadius:11, border:`1px dashed ${T.line}`,
            color:T.soft, fontSize:13, fontWeight:600, cursor: busy?'default':'pointer', opacity:busy?.6:1,
            display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <i className="ti ti-replace" style={{ fontSize:15 }} aria-hidden="true" />
            {busy ? (lang==='ru'?'Замена…':'Remplacement…') : (lang==='ru'?'Заменить фото':'Remplacer la photo')}
            <input type="file" accept="image/*" hidden disabled={busy}
              onChange={e=>{ const f=e.target.files[0]; if(f) replace(f); e.target.value='' }} />
          </label>
          <button onClick={onClose} className="serif" style={{ flex:1, padding:'11px',
            borderRadius:11, background:T.clay, color:'#fff', fontWeight:600, fontSize:14 }}>
            {lang==='ru'?'Готово':'Terminé'}
          </button>
        </div>
      </div>
    </div>
  )
}
