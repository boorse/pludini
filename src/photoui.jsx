import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { sb } from './supabase.js'
import { photosFor, addPhotoRec, removePhoto, setPhotoPos, flushPhotoPos, subscribe, allPlayers, getMe, coverPhoto, speciesPhotos,
         coverIdFor, setPhotoCover, clearPhotoCover } from './store.js'

// pas de sepia/hue-rotate : ça écrasait le bleu du ciel et virait tout au
// brun (l'effet "vieux filtre Instagram" signalé) — juste un peu de
// saturation/contraste/lumière pour faire ressortir le ciel, le vert et
// les fleurs sans dénaturer les couleurs
export const LUT = 'saturate(1.15) contrast(1.06) brightness(1.02)'

const T = { bg:'#EDE7D8', card:'#E6DDC8', ink:'#2B2620', soft:'#6B6357',
  mute:'#9A9081', line:'#D3C7AE', clay:'#B5602F', sageDark:'#4A5D32' }

// chemin de la miniature déduit du chemin principal
export const thumbOf = (path) => path ? path.replace(/\.jpg$/, '_t.jpg') : path

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
          style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:cover.pos||'50% 50%', filter:LUT, display:'block' }} />
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
          style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:cover.pos||'50% 50%', filter:plain?'none':LUT, display:'block', WebkitTouchCallout:'none' }} />
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
            style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:cover.pos||'50% 50%', filter:LUT, display:'block' }} />
        )}
      </div>
      {many && <>
        <button onClick={(e)=>{ e.stopPropagation(); setIdx(i=>(i-1+photos.length)%photos.length) }} style={navBtn('left')}>‹</button>
        <button onClick={(e)=>{ e.stopPropagation(); setIdx(i=>(i+1)%photos.length) }} style={navBtn('right')}>›</button>
        <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', display:'flex', gap:4, zIndex:2 }}>
          {photos.map((_,i)=>(
            <span key={i} style={{ width:i===idx?14:5, height:5, borderRadius:3,
              background: i===idx?'#F2EEE2':'rgba(242,238,226,.45)', transition:'width .15s' }} />
          ))}
        </div>
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
            style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:current.photo.pos||'50% 50%', filter:LUT, display:'block' }} />
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
        <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', display:'flex', gap:4, zIndex:2 }}>
          {shots.map((_,i)=>(
            <span key={i} style={{ width:i===idx?14:5, height:5, borderRadius:3,
              background: i===idx?'#F2EEE2':'rgba(242,238,226,.45)', transition:'width .15s' }} />
          ))}
        </div>
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
export function Lightbox({ photos, index, onIndex, onClose }) {
  const p = photos[index]
  const many = photos.length > 1
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && many) onIndex(i=>(i-1+photos.length)%photos.length)
      else if (e.key === 'ArrowRight' && many) onIndex(i=>(i+1)%photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photos.length, many, onClose, onIndex])
  if (!p) return null
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(10,11,7,.92)', zIndex:200,
      display:'flex', alignItems:'center', justifyContent:'center', padding:28 }}>
      <img src={p.url} alt="" draggable={false} onClick={e=>e.stopPropagation()}
        style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', filter:LUT, borderRadius:4 }} />
      <button onClick={onClose} style={{ position:'absolute', top:16, right:16, width:36, height:36,
        borderRadius:'50%', background:'rgba(255,255,255,.12)', color:'#fff', fontSize:16 }}>✕</button>
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
  const [focalPhoto, setFocalPhoto] = useState(null)
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
                    <img src={p.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover',
                      objectPosition:p.pos||'50% 50%', filter:LUT, display:'block' }} />
                    <button onClick={()=>setFocalPhoto(p)}
                      style={{ position:'absolute', top:6, left:6, width:24, height:24, borderRadius:'50%',
                        background:'rgba(0,0,0,.55)', color:'#fff', fontSize:12, display:'flex',
                        alignItems:'center', justifyContent:'center' }} title={lang==='ru'?'Точка фокуса':'Point focal'}>
                      <i className="ti ti-focus-2" style={{ fontSize:13 }} aria-hidden="true" />
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
      {focalPhoto && <FocalPicker target={target} photo={focalPhoto} lang={lang} onClose={()=>setFocalPhoto(null)} />}
    </div>
  )
}

// ── Point focal : le sujet reste visible quel que soit le cadrage ──
export function FocalPicker({ target, photo, lang, onClose }) {
  const [pos, setPos] = useState(photo.pos || '50% 50%')
  const boxRef = useRef(null)
  const [px, py] = pos.replace(/%/g,'').split(' ').map(Number)

  useEffect(() => () => { flushPhotoPos(photo.id) }, [photo.id])

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

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.7)', zIndex:150,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:16, padding:16,
        maxWidth:420, width:'100%', border:`1px solid ${T.line}` }}>
        <div className="serif" style={{ fontSize:15, fontWeight:700, color:T.ink, marginBottom:5 }}>
          {lang==='ru'?'Точка фокуса':'Point focal'}
        </div>
        <div style={{ fontSize:12, color:T.soft, marginBottom:10, lineHeight:1.5 }}>
          {lang==='ru'
            ? 'Нажмите на важную часть фото — она останется видимой при любой обрезке.'
            : 'Touche l’endroit important de la photo (le sujet) : il restera toujours visible, quel que soit le cadrage utilisé dans l’appli.'}
        </div>
        <div ref={boxRef} onClick={pick} style={{ position:'relative', width:'100%', aspectRatio:'4/3',
          borderRadius:10, overflow:'hidden', cursor:'crosshair', background:'#1E2418' }}>
          <img src={photo.url} alt="" draggable={false}
            style={{ width:'100%', height:'100%', objectFit:'contain', filter:LUT, display:'block' }} />
          <span style={{ position:'absolute', left:`${px}%`, top:`${py}%`, transform:'translate(-50%,-50%)',
            width:22, height:22, borderRadius:'50%', border:'2.5px solid #fff',
            boxShadow:'0 0 0 1.5px rgba(0,0,0,.5), 0 2px 8px rgba(0,0,0,.4)', pointerEvents:'none' }} />
        </div>
        <button onClick={onClose} className="serif" style={{ marginTop:12, width:'100%', padding:'9px',
          borderRadius:10, background:T.clay, color:'#fff', fontWeight:600, fontSize:13 }}>
          {lang==='ru'?'Готово':'Terminé'}
        </button>
      </div>
    </div>
  )
}
