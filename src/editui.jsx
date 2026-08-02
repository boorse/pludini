import { useState, useEffect } from 'react'
import { allPlayers, addPlayer, allCats, addSpecies, editSpecies, removeSpecies, setObservation, addSighting, editSighting,
         removeSighting, promote, demote, namedOf, getMe, setMe, setBlurry, setPixelated, setQuality, speciesType, isVegetal,
         individualCovers, setCover, clearCover, removePhoto, coverIdFor, setPhotoCover, clearPhotoCover,
         allSpecies, calcPtsLive } from './store.js'
import { RARITY, METHODS, SIZE_MULT, FISH_SIZE_MULT } from './data'
import { subNameOf } from './i18n.js'
import { LUT, uploadPhotoFile, uploadAudioFile, usePhotos, FocalPicker } from './photoui.jsx'
import SatMap from './satmap.jsx'
import { CENTER } from './territory.js'

export const T = { bg:'#EDE7D8', card:'#E6DDC8', ink:'#2B2620', soft:'#6B6357',
  mute:'#9A9081', line:'#D3C7AE', clay:'#B5602F', sageDark:'#4A5D32', gold:'#C9A046' }

export const Modal = ({ children, onClose, wide, max=460 }) => (
  <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.62)', zIndex:150,
    display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
    <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:18, width:'100%',
      maxWidth:max, maxHeight:'88vh', overflow:'auto', border:`1px solid ${T.line}` }}>{children}</div>
  </div>
)
export const label = { fontSize:11, color:T.mute, display:'block', marginBottom:4, marginTop:11 }

// input file caché mais toujours cliquable via son <label> englobant — un
// simple <div onClick={()=>ref.click()}> autour d'un input hidden déclenche
// un input.click() qui remonte (bubble) jusqu'à ce même onClick et le
// redéclenche, ce qui bloque le sélecteur natif au second essai sur certains
// navigateurs mobiles (Safari iOS notamment). L'association native via
// <label> évite complètement ce problème : aucun JS requis pour ouvrir le sélecteur.
export const visuallyHiddenFileInput = { position:'absolute', width:1, height:1, padding:0, margin:-1,
  overflow:'hidden', clipPath:'inset(50%)', whiteSpace:'nowrap', border:0 }

// ══════ Trois niveaux de qualité de photo, mutuellement exclusifs — mammifères et oiseaux uniquement ══════
export function PhotoQualityPicker({ lang, value, onChange }) {
  const opts = [
    ['low', lang==='ru'?'Издалека (÷2)':'De loin (÷2)'],
    ['normal', lang==='ru'?'Обычная':'Normal'],
    ['high', lang==='ru'?'Крупным планом (×2)':'De près (×2)'],
  ]
  return (
    <div style={{ display:'flex', gap:5, marginTop:9 }}>
      {opts.map(([k,l])=>(
        <button key={k} onClick={()=>onChange(k)} style={{ flex:1, fontSize:11.5, padding:'9px 6px', borderRadius:10,
          border:`1px solid ${value===k?T.clay:T.line}`, background:value===k?'#F0DDD0':'transparent',
          color:T.ink, fontWeight:value===k?700:400, textAlign:'center' }}>{l}</button>
      ))}
    </div>
  )
}

// ══════ Trois paliers de taille pêchée, mutuellement exclusifs — poissons uniquement ══════
// remplace le choix de qualité de photo pour cette catégorie : le multiplicateur
// de points dépend de la taille du poisson plutôt que de la netteté du cliché
export function FishSizePicker({ lang, sp, value, onChange }) {
  const [a, b] = sp?.tailleCm || [20, 40]
  const opts = [
    ['petit', lang==='ru'?`Мелкая (< ${a} см)`:`Petit (< ${a} cm)`],
    ['moyen', lang==='ru'?`Средняя (${a}–${b} см)`:`Moyen (${a}–${b} cm)`],
    ['grand', lang==='ru'?`Крупная (> ${b} см)`:`Grand (> ${b} cm)`],
  ]
  return (
    <div style={{ display:'flex', gap:5, marginTop:9 }}>
      {opts.map(([k,l])=>(
        <button key={k} onClick={()=>onChange(k)} style={{ flex:1, fontSize:11, padding:'9px 6px', borderRadius:10,
          border:`1px solid ${value===k?T.clay:T.line}`, background:value===k?'#F0DDD0':'transparent',
          color:T.ink, fontWeight:value===k?700:400, textAlign:'center', lineHeight:1.35 }}>
          {l}<br/><span style={{ fontSize:10, color:T.mute }}>×{FISH_SIZE_MULT[k]} pts</span>
        </button>
      ))}
    </div>
  )
}

// ══════ Confirmation (remplace window.confirm — bloque tout le navigateur et casse l'auto-clôture) ══════
export function ConfirmDialog({ lang, title, message, onCancel, onConfirm, busy }) {
  return (
    <div onClick={onCancel} style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.65)', zIndex:180,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:16, padding:20,
        width:'100%', maxWidth:380, border:`1px solid ${T.line}` }}>
        <div className="serif" style={{ fontSize:16, fontWeight:800, color:T.ink, marginBottom:6 }}>{title}</div>
        <div style={{ fontSize:12.5, color:T.soft, lineHeight:1.55, marginBottom:18 }}>{message}</div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onCancel} style={{ flex:1, padding:'10px', borderRadius:10,
            border:`1px solid ${T.line}`, color:T.soft, fontSize:13 }}>
            {lang==='ru'?'Отмена':'Annuler'}
          </button>
          <button onClick={onConfirm} disabled={busy} className="serif" style={{ flex:1.3, padding:'10px',
            borderRadius:10, background:'#8F3A2E', color:'#fff', fontSize:13.5, fontWeight:700 }}>
            {lang==='ru'?'Удалить':'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}
export const input = { width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${T.line}`,
  background:T.card, fontSize:13.5, color:T.ink }

// ══════ Choix d'identité ══════
export function IdentityPicker({ lang, onClose }) {
  const [me, setLocal] = useState(getMe())
  const [adding, setAdding] = useState('')
  const players = allPlayers().filter(p=>!p.demo)
  return (
    <Modal onClose={onClose}>
      <div style={{ padding:22 }}>
        <div className="serif" style={{ fontSize:19, fontWeight:900, color:T.ink, marginBottom:4 }}>
          {lang==='ru'?'Кто вы?':'Qui es-tu ?'}
        </div>
        <div style={{ fontSize:12.5, color:T.soft, marginBottom:14, lineHeight:1.5 }}>
          {lang==='ru'?'Ваши добавления будут записаны на ваше имя.'
                     :'Tes ajouts seront enregistrés à ton nom.'}
        </div>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:14 }}>
          {players.map(p=>{
            const on = me===p.name
            return (
              <button key={p.name} onClick={()=>{ setLocal(p.name); setMe(p.name) }}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', borderRadius:20,
                  border:`1px solid ${on?T.clay:T.line}`, background:on?T.clay:'transparent' }}>
                <span className="serif" style={{ width:26, height:26, borderRadius:'50%',
                  background:on?'rgba(255,255,255,.22)':'#7A8B5C', color:'#fff', display:'flex',
                  alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700 }}>{p.id}</span>
                <span className="serif" style={{ fontSize:14, fontWeight:on?900:600, color:on?'#fff':T.ink }}>{p.name}</span>
              </button>
            )
          })}
        </div>
        <div style={{ display:'flex', gap:7 }}>
          <input value={adding} onChange={e=>setAdding(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&adding.trim()){ addPlayer(adding); setLocal(adding.trim()); setMe(adding.trim()); setAdding('') } }}
            placeholder={lang==='ru'?'Новый наблюдатель':'Nouvel observateur'}
            style={{ ...input, flex:1 }} />
          <button onClick={()=>{ if(adding.trim()){ addPlayer(adding); setLocal(adding.trim()); setMe(adding.trim()); setAdding('') } }}
            style={{ padding:'10px 16px', borderRadius:10, background:T.sageDark, color:'#fff', fontSize:13, fontWeight:700 }}>+</button>
        </div>
        <button onClick={onClose} disabled={!me} className="serif"
          style={{ width:'100%', marginTop:16, padding:'11px', borderRadius:12,
            background: me?T.clay:'#DDD3BE', color: me?'#fff':T.mute, fontSize:14, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
          <i className="ti ti-check" style={{ fontSize:16 }} aria-hidden="true" />
          {lang==='ru'?'Продолжить':'Continuer'}
        </button>
      </div>
    </Modal>
  )
}

// ══════ Nouvelle espèce ══════
const EMOJIS = ['🦌','🦊','🐺','🐆','🦡','🦫','🐗','🐇','🐿️','🦔','🦉','🦅','🐦','🪽','🦆','🌳','🌲','🍁','🍄','🍃','🦋','🪲','🐝','🐌','🐸','🐍','🐟','🌸','🌾','🧍']

export function SpeciesEditor({ lang, initial, presetCat, presetSub, onClose, onSaved, onDeleted }) {
  const isEdit = !!initial
  const cats = allCats()
  const [n, setN] = useState(initial?.n || '')
  const [lat, setLat] = useState(initial?.lat || '')
  const [e, setE] = useState(initial?.e || '🦌')
  const [cat, setCat] = useState(initial?.cat || presetCat || cats[0].id)
  const [sub, setSub] = useState(initial?.sub || presetSub || cats[0].subs[0].id)
  const [newSub, setNewSub] = useState('')
  const [r, setR] = useState(initial?.r || 'commun')
  const [sz, setSz] = useState(initial?.sz || 'm')
  const [alim, setAlim] = useState(initial?.alim || '')
  const [hab, setHab] = useState(initial?.hab || '')
  const [dng, setDng] = useState(initial?.dng || '')
  const [wiki, setWiki] = useState(initial?.wiki || '')
  const [youtube, setYoutube] = useState(initial?.youtube || '')
  const [audio, setAudio] = useState(initial?.audio || '')
  const [audioBusy, setAudioBusy] = useState(false)
  const [audioErr, setAudioErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const catObj = cats.find(c=>c.id===cat) || cats[0]
  const covers = isEdit ? individualCovers(initial) : []
  const [cover, setCoverLocal] = useState(initial?.cover || null)
  const pickCover = (c) => { setCoverLocal({ ind:c.ind, photoId:c.photo.id }); setCover(initial.id, c.ind, c.photo.id) }
  const resetCover = () => { setCoverLocal(null); clearCover(initial.id) }

  // importer un fichier remplace le lien collé à la main par l'URL hébergée
  const pickAudioFile = async (file) => {
    if (!file) return
    setAudioBusy(true); setAudioErr(null)
    try {
      const url = await uploadAudioFile(file)
      setAudio(url)
    } catch (e) {
      setAudioErr(e?.message || (lang==='ru'?'Не удалось загрузить файл.':'Échec de l’import du fichier.'))
    }
    setAudioBusy(false)
  }

  const save = async () => {
    if (!n.trim()) return
    setBusy(true)
    const fields = { n:n.trim(), lat:lat.trim(), e, cat, sub:(newSub.trim()||sub), r, sz,
      alim:alim.trim(), hab:hab.trim(), dng:dng.trim(), wiki:wiki.trim(), youtube:youtube.trim(), audio:audio.trim() }
    if (isEdit) await editSpecies(initial.id, fields)
    else await addSpecies(fields)
    setBusy(false); onSaved?.(); onClose()
  }

  const remove = async () => {
    setBusy(true)
    await removeSpecies(initial.id)
    setBusy(false); onDeleted?.(); onClose()
  }

  return (
    <Modal onClose={onClose} max={520}>
      <div style={{ padding:'20px 22px 0' }}>
        <div className="serif" style={{ fontSize:19, fontWeight:900, color:T.ink }}>
          {isEdit ? (lang==='ru'?'Изменить вид':'Modifier l\u2019espèce')
                  : (lang==='ru'?'Новый вид':'Nouvelle espèce')}
        </div>
      </div>
      <div style={{ padding:'0 22px 12px' }}>
        <label style={label}>{lang==='ru'?'Название':'Nom courant'}</label>
        <input value={n} onChange={ev=>setN(ev.target.value)} autoFocus style={input}
          placeholder={lang==='ru'?'Например: Рысь':'Ex. Lynx boréal'} />

        <label style={label}>{lang==='ru'?'Латинское название':'Nom latin'}</label>
        <input value={lat} onChange={ev=>setLat(ev.target.value)} style={input} placeholder="Lynx lynx" />

        <label style={label}>{lang==='ru'?'Значок':'Pictogramme'}</label>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {EMOJIS.map(x=>(
            <button key={x} onClick={()=>setE(x)} style={{ fontSize:19, width:34, height:34, borderRadius:9,
              border:`1px solid ${e===x?T.clay:T.line}`, background:e===x?'#F0DDD0':'transparent' }}>{x}</button>
          ))}
        </div>

        {isEdit && covers.length>0 && <>
          <label style={label}>{lang==='ru'?'Обложка':'Vignette'}</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button onClick={resetCover} style={{ width:52, height:52, borderRadius:10, fontSize:9.5,
              color:T.soft, textAlign:'center', padding:2, border:`1px solid ${!cover?T.clay:T.line}`,
              background: !cover?'#F0DDD0':T.card }}>
              {lang==='ru'?'Авто':'Auto'}
            </button>
            {covers.map(c=>{
              const on = cover && cover.ind===c.ind && cover.photoId===c.photo.id
              return (
                <button key={c.ind} onClick={()=>pickCover(c)} style={{ width:52, height:52, borderRadius:10,
                  overflow:'hidden', padding:0, position:'relative', border:`2px solid ${on?T.clay:'transparent'}` }}
                  title={c.displayName}>
                  <img src={c.photo.thumbUrl||c.photo.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', filter:LUT, display:'block' }} />
                </button>
              )
            })}
          </div>
          <div style={{ fontSize:10.5, color:T.mute, marginTop:4, lineHeight:1.4 }}>
            {lang==='ru'?'Эта фотография используется как миниатюра вида.'
                       :'Cette photo sert de vignette pour l’espèce partout dans l’appli.'}
          </div>
        </>}

        <label style={label}>{lang==='ru'?'Царство':'Règne'}</label>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {cats.map(c=>(
            <button key={c.id} onClick={()=>{ setCat(c.id); setSub(c.subs[0]?.id||'') }}
              style={{ fontSize:11.5, padding:'6px 11px', borderRadius:14,
                border:`1px solid ${cat===c.id?T.clay:T.line}`, background:cat===c.id?T.clay:'transparent',
                color:cat===c.id?'#fff':T.soft }}>{c.e} {c.n}</button>
          ))}
        </div>

        <label style={label}>{lang==='ru'?'Семейство':'Famille'}</label>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:6 }}>
          {catObj.subs.map(sv=>(
            <button key={sv.id} onClick={()=>{ setSub(sv.id); setNewSub('') }}
              style={{ fontSize:11.5, padding:'6px 11px', borderRadius:14,
                border:`1px solid ${!newSub && sub===sv.id?T.clay:T.line}`,
                background:!newSub && sub===sv.id?'#F0DDD0':'transparent', color:T.soft }}>{subNameOf(sv.id, lang).main}</button>
          ))}
        </div>
        <input value={newSub} onChange={ev=>setNewSub(ev.target.value)} style={{ ...input, fontSize:12.5 }}
          placeholder={lang==='ru'?'…или новое семейство':'…ou créer une nouvelle famille'} />

        {speciesType({ cat })!==3 && <>
          <label style={label}>{lang==='ru'?'Редкость':'Rareté'}</label>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {Object.entries(RARITY).map(([k,v])=>(
              <button key={k} onClick={()=>setR(k)} style={{ fontSize:11.5, padding:'6px 11px', borderRadius:14,
                border:`1px solid ${r===k?v.c:T.line}`, background:r===k?v.c:'transparent',
                color:r===k?'#fff':T.soft }}>{v.l} · {v.p} pts</button>
            ))}
          </div>
        </>}

        {speciesType({ cat })===1 && <>
          <label style={label}>{lang==='ru'?'Размер':'Taille'}</label>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {[['xs','Très petit'],['s','Petit'],['m','Moyen'],['l','Grand'],['xl','Géant']].map(([k,l])=>(
              <button key={k} onClick={()=>setSz(k)} style={{ fontSize:11.5, padding:'6px 11px', borderRadius:14,
                border:`1px solid ${sz===k?T.clay:T.line}`, background:sz===k?'#F0DDD0':'transparent',
                color:T.soft }}>{l} ×{SIZE_MULT[k]} pts</button>
            ))}
          </div>
        </>}

        {!isVegetal({ cat }) && <>
          <label style={label}>{lang==='ru'?'Питание':'Alimentation'}</label>
          <textarea value={alim} onChange={ev=>setAlim(ev.target.value)} rows={2} style={{ ...input, fontSize:12.5, resize:'vertical' }} />
        </>}
        <label style={label}>{lang==='ru'?'Среда обитания':'Habitat & territoire'}</label>
        <textarea value={hab} onChange={ev=>setHab(ev.target.value)} rows={2} style={{ ...input, fontSize:12.5, resize:'vertical' }} />
        <label style={label}>{lang==='ru'?'Знаете ли вы?':'Le saviez-vous ?'}</label>
        <textarea value={dng} onChange={ev=>setDng(ev.target.value)} rows={2} style={{ ...input, fontSize:12.5, resize:'vertical' }} />

        <label style={label}>{lang==='ru'?'Ссылка на Википедию':'Lien Wikipédia'}</label>
        <input value={wiki} onChange={ev=>setWiki(ev.target.value)} style={input} placeholder="https://fr.wikipedia.org/wiki/…" />
        <label style={label}>{lang==='ru'?'Видео YouTube':'Vidéo YouTube'}</label>
        <input value={youtube} onChange={ev=>setYoutube(ev.target.value)} style={input} placeholder="https://youtube.com/watch?v=…" />
        <label style={label}>{lang==='ru'?'Аудио (крик/пение)':'Lien audio (cri / chant)'}</label>
        <input value={audio} onChange={ev=>setAudio(ev.target.value)} style={input} placeholder="https://xeno-canto.org/… ou Wikimedia Commons" />
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
          <span style={{ fontSize:11, color:T.mute }}>{lang==='ru'?'…или':'…ou'}</span>
          <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:600, color:T.clay,
            padding:'6px 11px', borderRadius:10, border:`1px dashed ${T.line}`, cursor:'pointer' }}>
            <i className="ti ti-file-music" style={{ fontSize:14 }} aria-hidden="true" />
            {audioBusy ? (lang==='ru'?'Импорт…':'Import…') : (lang==='ru'?'Импортировать файл':'Importer un fichier')}
            <input type="file" accept="audio/*" style={visuallyHiddenFileInput} disabled={audioBusy}
              onChange={e=>{ const f=e.target.files[0]; if(f) pickAudioFile(f); e.target.value='' }} />
          </label>
          {audio && <span style={{ fontSize:11, color:T.mute }}>✓ {lang==='ru'?'указано':'renseigné'}</span>}
        </div>
        {audioErr && <div style={{ fontSize:11.5, color:'#B91C1C', marginTop:4 }}>{audioErr}</div>}

        {isEdit && (
          <button onClick={()=>setConfirmDel(true)} disabled={busy} style={{ marginTop:16, width:'100%', padding:'10px', borderRadius:10,
            border:'1px dashed #C9877C', background:'transparent', color:'#8F4A22', fontSize:12.5, fontWeight:600,
            display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <i className="ti ti-trash" style={{ fontSize:15 }} aria-hidden="true" />
            {lang==='ru'?'Удалить этот вид':'Supprimer cette espèce'}
          </button>
        )}
      </div>

      <ValidateBar lang={lang} onCancel={onClose} onSave={save} busy={busy} disabled={!n.trim()} />
      {confirmDel && <ConfirmDialog lang={lang}
        title={lang==='ru'?'Удалить этот вид?':'Supprimer cette espèce ?'}
        message={lang==='ru'?'Все наблюдения этого вида будут потеряны. Это действие необратимо.'
          :'Toutes ses observations seront perdues. Cette action est irréversible.'}
        busy={busy} onCancel={()=>setConfirmDel(false)} onConfirm={remove} />}
    </Modal>
  )
}

// ══════ Barre de validation ══════
export function ValidateBar({ lang, onCancel, onSave, busy, disabled }) {
  return (
    <div style={{ position:'sticky', bottom:0, background:T.bg, borderTop:`1px solid ${T.line}`,
      padding:'12px 22px', display:'flex', gap:9, zIndex:3 }}>
      <button onClick={onCancel} style={{ flex:1, padding:'11px', borderRadius:12,
        border:`1px solid ${T.line}`, color:T.soft, fontSize:13 }}>
        {lang==='ru'?'Отмена':'Annuler'}
      </button>
      <button onClick={onSave} disabled={busy||disabled} className="serif"
        style={{ flex:1.6, padding:'11px', borderRadius:12,
          background: (busy||disabled)?'#DDD3BE':T.clay, color:(busy||disabled)?T.mute:'#fff',
          fontSize:14, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
        <i className="ti ti-check" style={{ fontSize:17 }} aria-hidden="true" />
        {busy ? (lang==='ru'?'Сохранение…':'Enregistrement…') : (lang==='ru'?'Подтвердить':'Valider')}
      </button>
    </div>
  )
}

// ══════ Nouvelle observation (passage ou familier) — ou édition d'une observation existante ══════

// "12/6/2026" (toLocaleDateString('fr-FR')) → "2026-06-12" (valeur attendue par <input type="date">)
function frDateToIso(s) {
  const m = (s||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return new Date().toISOString().slice(0,10)
  const [,dd,mm,yyyy] = m
  return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`
}

export function SightingEditor({ lang, species, presetSp, editing, onClose, onSaved }) {
  const me = getMe() || allPlayers()[0]?.name || ''
  const editSp = editing?.sp, editInd = editing?.ind
  const isEdit = !!editing
  const [spId, setSpId] = useState(editSp?.id || presetSp?.id || '')
  const [q, setQ] = useState('')
  // choix en deux temps quand on ouvre le formulaire sans espèce déjà choisie :
  // d'abord le règne, puis l'animal — avant, il fallait deviner le nom exact
  // à taper, ce qui rendait le bouton "Noter une observation" inutilisable
  const [pickCat, setPickCat] = useState(null)
  const cats = allCats()
  const [named, setNamed] = useState(editInd ? !!editInd.named : false)
  const [name, setName] = useState(editInd?.displayName || editInd?.n || '')
  const [note, setNote] = useState(editInd?.note || '')
  const [traits, setTraits] = useState(editInd?.traits || '')
  const [story, setStory] = useState(editInd?.story || '')
  const [by, setBy] = useState(editInd?.by || me)
  const [method, setMethod] = useState(editInd?.method || 'eye')
  const now = new Date()
  const [d, setD] = useState(editInd ? frDateToIso(editInd.d) : now.toISOString().slice(0,10))
  const [time, setTime] = useState(editInd?.time || now.toTimeString().slice(0,5))
  const [weather, setWeather] = useState(editInd?.weather || '')
  const [lat, setLat] = useState(editInd?.gps ? String(editInd.gps[0]) : '')
  const [lon, setLon] = useState(editInd?.gps ? String(editInd.gps[1]) : '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [mapPick, setMapPick] = useState(false)
  const [stagedFiles, setStagedFiles] = useState([])
  // trois options mutuellement exclusives : de près (×2), normal, de loin (÷2) —
  // réservé aux mammifères et oiseaux
  const [photoQuality, setPhotoQuality] = useState(() => {
    if (editSp?.quality?.[editInd?.by]) return 'high'
    if (editSp?.pixelated?.[editInd?.by]) return 'low'
    return 'normal'
  })
  const photoTarget = isEdit ? `ind:${editSp?.id}:${editInd?.n}` : ''
  const { photos: existingPhotos } = usePhotos(photoTarget)
  const coverId = coverIdFor(photoTarget)
  const [focalPhoto, setFocalPhoto] = useState(null)

  const sp = isEdit ? editSp : species.find(s=>s.id===spId)
  // seuls mammifères et oiseaux se prêtent à l'affût/caméra — le reste (végétal, champignons, insectes…) s'observe à l'œil nu
  const isPlant = sp && !['mammiferes','oiseaux'].includes(sp.cat)
  // dans un règne choisi : tous ses animaux, filtrés par la recherche si tapée
  const catResults = !isEdit && pickCat
    ? species.filter(s=>s.cat===pickCat && (!q.trim() || s.n.toLowerCase().includes(q.toLowerCase().trim())))
    : []

  useEffect(() => { if (isPlant && method !== 'eye') setMethod('eye') }, [isPlant])

  const addFiles = (files) => setStagedFiles(v => [...v, ...[...files].filter(f=>f.type.startsWith('image/'))])
  const removeFile = (i) => setStagedFiles(v => v.filter((_,idx)=>idx!==i))

  const save = async () => {
    if (!spId) return
    setBusy(true); setErr(null)
    try {
      const gps = (lat && lon) ? [parseFloat(lat), parseFloat(lon)] : null

      if (isEdit) {
        const fields = { note: note.trim(), d: new Date(d).toLocaleDateString('fr-FR'), time, by, method,
          weather: weather.trim(), story: story.trim(), traits: traits.trim(), gps }
        await editSighting(spId, editInd.n, fields)
        const wasNamed = !!namedOf(spId, editInd.n)
        if (named) await promote(spId, editInd.n, name.trim() || editInd.n, traits.trim())
        else if (wasNamed) await demote(spId, editInd.n)
        for (const f of stagedFiles) await uploadPhotoFile(`ind:${spId}:${editInd.n}`, f, '', by)
        await setPixelated(spId, by, photoQuality==='low')
        await setQuality(spId, by, photoQuality==='high')
        onSaved?.(spId); onClose()
        return
      }

      const before = calcPtsLive(sp, by)
      const label = named ? (name.trim() || 'Sans nom')
        : `Passage du ${new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}`
      const ind = {
        n: label, named, note: note.trim(), d: new Date(d).toLocaleDateString('fr-FR'),
        time, by, method, weather: weather.trim(), story: story.trim(),
        desc: '', b: [], traits: traits.trim(),
        ...(gps ? { gps } : {}),
      }
      await addSighting(spId, ind)
      for (const f of stagedFiles) await uploadPhotoFile(`ind:${spId}:${label}`, f, '', by)
      // marquer aussi l'espèce comme observée par cette personne
      const cur = sp?.obs?.[by] || []
      if (!cur.includes(method)) await setObservation(spId, by, [...cur, method])
      if (photoQuality==='low') await setPixelated(spId, by, true)
      if (photoQuality==='high') await setQuality(spId, by, true)
      const after = calcPtsLive(allSpecies().find(s=>s.id===spId) || sp, by)
      onSaved?.(spId, after - before); onClose()
    } catch (e) {
      // sans ce filet, un échec réseau/upload laissait le bouton bloqué sur
      // "Enregistrement…" sans aucun message — donnait l'impression que la
      // photo "ne marchait pas" sans jamais dire pourquoi
      setErr(e?.message || (lang==='ru'?'Не удалось сохранить. Проверьте соединение и попробуйте снова.'
        :'Échec de l’enregistrement. Vérifie ta connexion et réessaie.'))
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} max={520}>
      <div style={{ padding:'20px 22px 0' }}>
        <div className="serif" style={{ fontSize:19, fontWeight:900, color:T.ink }}>
          {isEdit
            ? (lang==='ru'?'Изменить наблюдение':'Modifier l’observation')
            : (lang==='ru'?'Новое наблюдение':'Nouvelle observation')}
        </div>
        <div style={{ fontSize:12, color:T.soft, marginTop:3 }}>
          {isEdit
            ? (lang==='ru'?'Modifiez tous les détails de cette rencontre.':'Modifie tous les détails de cette rencontre.')
            : (lang==='ru'?'Запишите встречу с животным или растением.'
                         :'Note une rencontre : ce que tu as vu, où et quand.')}
        </div>
      </div>
      <div style={{ padding:'0 22px 12px' }}>
        <label style={label}>{lang==='ru'?'Вид':'Quelle espèce ?'}</label>
        {sp ? (
          <div style={{ display:'flex', alignItems:'center', gap:9, background:T.card,
            border:`1px solid ${T.line}`, borderRadius:10, padding:'9px 11px' }}>
            <span style={{ fontSize:20 }}>{sp.e}</span>
            <span style={{ flex:1, fontSize:13.5, fontWeight:600, color:T.ink }}>{sp.n}</span>
            {!isEdit && (
              <button onClick={()=>{ setSpId(''); setQ('') }} style={{ color:T.mute, fontSize:12 }}>
                {lang==='ru'?'изменить':'changer'}
              </button>
            )}
          </div>
        ) : pickCat ? (
          <>
            <button onClick={()=>{ setPickCat(null); setQ('') }}
              style={{ display:'flex', alignItems:'center', gap:5, color:T.clay, fontSize:12, fontWeight:600, marginBottom:8 }}>
              <i className="ti ti-arrow-left" style={{ fontSize:13 }} aria-hidden="true" />
              {lang==='ru'?'Все царства':'Tous les règnes'}
            </button>
            <input value={q} onChange={e=>setQ(e.target.value)} autoFocus style={input}
              placeholder={lang==='ru'?'Начните вводить…':'Tape les premières lettres… (facultatif)'} />
            <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:4, maxHeight:220, overflowY:'auto' }}>
              {catResults.length>0 ? catResults.map(s2=>(
                <button key={s2.id} onClick={()=>{ setSpId(s2.id); setQ('') }}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:9,
                    border:`1px solid ${T.line}`, background:T.card, textAlign:'left' }}>
                  <span style={{ fontSize:17 }}>{s2.e}</span>
                  <span style={{ fontSize:12.5, color:T.ink, flex:1 }}>{s2.n}</span>
                  <span style={{ fontSize:10.5, color:T.mute, fontStyle:'italic' }}>{s2.lat}</span>
                </button>
              )) : (
                <div style={{ fontSize:12, color:T.mute, padding:'8px 2px', fontStyle:'italic' }}>
                  {lang==='ru'?'Ничего не найдено.':'Aucun résultat.'}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:6 }}>
            {cats.map(c=>(
              <button key={c.id} onClick={()=>setPickCat(c.id)}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'11px 6px',
                  borderRadius:11, border:`1px solid ${T.line}`, background:T.card, textAlign:'center' }}>
                <span style={{ fontSize:22 }}>{c.e}</span>
                <span style={{ fontSize:11, color:T.ink, fontWeight:600, lineHeight:1.2 }}>{c.n}</span>
              </button>
            ))}
          </div>
        )}

        <label style={label}>{lang==='ru'?'Тип':'Type de rencontre'}</label>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={()=>setNamed(false)} style={{ flex:1, padding:'10px', borderRadius:11,
            border:`1px solid ${!named?T.clay:T.line}`, background:!named?'#F0DDD0':'transparent',
            fontSize:12.5, color:T.ink, fontWeight:!named?700:400 }}>
            👁 {lang==='ru'?'Проход':'Passage'}
          </button>
          <button onClick={()=>setNamed(true)} style={{ flex:1, padding:'10px', borderRadius:11,
            border:`2px solid ${named?T.gold:T.line}`, background:named?'#F5EBD6':'transparent',
            fontSize:12.5, color:T.ink, fontWeight:named?700:400 }}>
            ★ {lang==='ru'?'Знакомый':'Familier'}
          </button>
        </div>
        <div style={{ fontSize:11, color:T.mute, marginTop:5, lineHeight:1.45 }}>
          {named
            ? (lang==='ru'?'Особь, которую вы узнаёте и будете отслеживать.'
                          :'Un animal que tu reconnais et que tu suivras dans le temps.')
            : (lang==='ru'?'Разовая встреча без опознания особи.'
                          :'Une rencontre ponctuelle, sans identifier l’individu.')}
        </div>

        {named && <>
          <label style={label}>{lang==='ru'?'Имя':'Son nom'}</label>
          <input value={name} onChange={e=>setName(e.target.value)} style={input}
            placeholder={lang==='ru'?'Локи':'Loki, Balafré, La Vieille…'} />
          <label style={label}>{lang==='ru'?'Приметы':'Signes distinctifs'}</label>
          <input value={traits} onChange={e=>setTraits(e.target.value)} style={{ ...input, fontSize:12.5 }}
            placeholder={lang==='ru'?'Шрам, окрас…':'Cicatrice, tache, bois…'} />
        </>}

        <label style={label}>{lang==='ru'?'Фото':'Photo(s)'}</label>
        {isEdit && existingPhotos.length>0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
            {existingPhotos.map((p,i)=>{
              const isCover = coverId ? coverId===p.id : i===0
              return (
                <div key={p.id} style={{ position:'relative', width:72, height:72, borderRadius:9, overflow:'hidden',
                  border:`1px solid ${isCover?T.clay:T.line}` }}>
                  <img src={p.thumbUrl||p.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover',
                    objectPosition:p.pos||'50% 50%', filter:LUT, display:'block' }} />
                  <button onClick={()=>setFocalPhoto(p)} title={lang==='ru'?'Точка фокуса':'Point focal'}
                    style={{ position:'absolute', top:3, left:3, width:18, height:18, borderRadius:'50%',
                      background:'rgba(0,0,0,.55)', color:'#fff', fontSize:10, display:'flex',
                      alignItems:'center', justifyContent:'center' }}>
                    <i className="ti ti-focus-2" style={{ fontSize:10 }} aria-hidden="true" />
                  </button>
                  <button onClick={()=>removePhoto(photoTarget, p.id, p.path)} title={lang==='ru'?'Удалить':'Supprimer'}
                    style={{ position:'absolute', top:3, right:3, width:18, height:18, borderRadius:'50%',
                      background:'rgba(0,0,0,.55)', color:'#fff', fontSize:10 }}>✕</button>
                  <button onClick={()=>isCover ? clearPhotoCover(photoTarget) : setPhotoCover(photoTarget, p.id)}
                    title={isCover ? (lang==='ru'?'Обложка (сбросить)':'Vignette actuelle (clique pour réinitialiser)')
                                   : (lang==='ru'?'Сделать обложкой':'Choisir comme vignette')}
                    style={{ position:'absolute', bottom:3, right:3, width:18, height:18, borderRadius:'50%',
                      background: isCover ? T.clay : 'rgba(0,0,0,.55)', color:'#fff', fontSize:10, display:'flex',
                      alignItems:'center', justifyContent:'center' }}>
                    <i className="ti ti-star" style={{ fontSize:10 }} aria-hidden="true" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <label onDrop={e=>{ e.preventDefault(); addFiles(e.dataTransfer.files) }} onDragOver={e=>e.preventDefault()}
          style={{ display:'block', border:`2px dashed ${T.line}`, borderRadius:12, padding:'14px', textAlign:'center',
            cursor:'pointer', background:T.card }}>
          <i className="ti ti-camera-plus" style={{ fontSize:20, color:T.clay }} aria-hidden="true" />
          <div style={{ fontSize:11.5, color:T.soft, marginTop:4 }}>
            {lang==='ru'?'Добавить фото':'Ajoute une ou plusieurs photos'}
          </div>
          <input type="file" accept="image/*" multiple style={visuallyHiddenFileInput}
            onChange={e=>{ addFiles(e.target.files); e.target.value='' }} />
        </label>
        {stagedFiles.length>0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
            {stagedFiles.map((f,i)=>(
              <div key={i} style={{ position:'relative', width:56, height:56, borderRadius:9, overflow:'hidden', border:`1px solid ${T.line}` }}>
                <img src={URL.createObjectURL(f)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                <button onClick={()=>removeFile(i)} style={{ position:'absolute', top:2, right:2, width:16, height:16,
                  borderRadius:'50%', background:'rgba(0,0,0,.6)', color:'#fff', fontSize:10, lineHeight:1 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {sp && speciesType(sp)===1 && (
          <PhotoQualityPicker lang={lang} value={photoQuality} onChange={setPhotoQuality} />
        )}

        {isPlant ? (
          <>
            <label style={label}>{lang==='ru'?'Способ':'Comment ?'}</label>
            <div style={{ fontSize:11.5, color:T.mute, background:T.card, border:`1px solid ${T.line}`,
              borderRadius:10, padding:'8px 11px', display:'flex', alignItems:'center', gap:6 }}>
              👁 {lang==='ru'?'Только прямое наблюдение для этой категории.':'Vue directe uniquement pour cette catégorie.'}
            </div>
          </>
        ) : (
          <>
            <label style={label}>{lang==='ru'?'Способ':'Comment ?'}</label>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {Object.entries(METHODS).map(([k,m])=>(
                <button key={k} onClick={()=>setMethod(k)} style={{ fontSize:11.5, padding:'7px 12px', borderRadius:14,
                  border:`1px solid ${method===k?m.c:T.line}`, background:method===k?m.c:'transparent',
                  color:method===k?m.on:T.soft, fontWeight:method===k?600:400 }}>
                  {k==='eye'?'👁':k==='scope'?'🔭':k==='night'?'🌙':'📷'} {m.l}
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{ display:'flex', gap:8 }}>
          <div style={{ flex:1 }}>
            <label style={label}>{lang==='ru'?'Дата':'Date'}</label>
            <input type="date" value={d} onChange={e=>setD(e.target.value)} style={input} />
          </div>
          <div style={{ width:120 }}>
            <label style={label}>{lang==='ru'?'Время':'Heure'}</label>
            <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={input} />
          </div>
        </div>

        <label style={label}>{lang==='ru'?'Наблюдатель':'Observateur'}</label>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {allPlayers().filter(p=>!p.demo).map(p=>(
            <button key={p.name} onClick={()=>setBy(p.name)} style={{ fontSize:12, padding:'6px 12px', borderRadius:14,
              border:`1px solid ${by===p.name?T.clay:T.line}`, background:by===p.name?T.clay:'transparent',
              color:by===p.name?'#fff':T.soft }}>{p.name}</button>
          ))}
        </div>

        <label style={label}>{lang==='ru'?'Координаты':'Coordonnées GPS'}</label>
        <div style={{ display:'flex', gap:6 }}>
          <input value={lat} onChange={e=>setLat(e.target.value)} placeholder="57.28636"
            style={{ ...input, flex:1, fontSize:12.5 }} />
          <input value={lon} onChange={e=>setLon(e.target.value)} placeholder="25.59392"
            style={{ ...input, flex:1, fontSize:12.5 }} />
          <button onClick={()=>setMapPick(true)} title={lang==='ru'?'Выбрать на карте':'Choisir sur la carte'}
            style={{ padding:'0 14px', borderRadius:10, border:`1px solid ${T.line}`,
              background:T.card, color:T.clay, fontSize:16 }}>📍</button>
        </div>

        <label style={label}>{lang==='ru'?'Условия':'Conditions'}</label>
        <input value={weather} onChange={e=>setWeather(e.target.value)} style={{ ...input, fontSize:12.5 }}
          placeholder={lang==='ru'?'Ясно, 12 °C':'Ciel dégagé, 12 °C'} />

        <label style={label}>{lang==='ru'?'Кратко':'En un mot'}</label>
        <input value={note} onChange={e=>setNote(e.target.value)} style={{ ...input, fontSize:12.5 }}
          placeholder={lang==='ru'?'Взрослый самец':'Adulte, seul, en lisière'} />

        <label style={label}>{lang==='ru'?'Рассказ':'Ton récit'}</label>
        <textarea value={story} onChange={e=>setStory(e.target.value)} rows={4}
          style={{ ...input, fontSize:12.5, resize:'vertical' }}
          placeholder={lang==='ru'?'Что произошло…':'Raconte la rencontre…'} />
        {err && <div style={{ fontSize:12, color:'#B91C1C', background:'#FEF2F2', border:'1px solid #FCA5A5',
          borderRadius:9, padding:'8px 11px', marginTop:11 }}>{err}</div>}
      </div>
      <ValidateBar lang={lang} onCancel={onClose} onSave={save} busy={busy} disabled={!spId} />
      {mapPick && <GpsMapPicker lat={lat} lon={lon} lang={lang}
        onCancel={()=>setMapPick(false)}
        onPick={(p)=>{ setLat(p.lat.toFixed(5)); setLon(p.lon.toFixed(5)); setMapPick(false) }} />}
      {focalPhoto && <FocalPicker target={photoTarget} photo={focalPhoto} lang={lang} onClose={()=>setFocalPhoto(null)} />}
    </Modal>
  )
}

// ══════ Sélection d'un point GPS sur la carte satellite du site ══════
export function GpsMapPicker({ lat, lon, lang, onCancel, onPick }) {
  const [pos, setPos] = useState((lat && lon) ? { lat:parseFloat(lat), lon:parseFloat(lon) } : null)
  const center = pos || CENTER
  return (
    <div onClick={onCancel} style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.65)', zIndex:170,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:16, width:'100%', maxWidth:560,
        border:`1px solid ${T.line}`, overflow:'hidden' }}>
        <div style={{ padding:'13px 16px', borderBottom:`1px solid ${T.line}` }}>
          <div className="serif" style={{ fontSize:15, fontWeight:800, color:T.ink }}>
            {lang==='ru'?'Выбрать точку на карте':'Choisir le point sur la carte'}
          </div>
          <div style={{ fontSize:11, color:T.mute, marginTop:2 }}>
            {lang==='ru'?'Нажмите на карту, чтобы установить координаты.':'Touche la carte pour placer le repère.'}
          </div>
        </div>
        <div style={{ height:360, position:'relative' }}>
          <SatMap center={center}
            pins={pos ? [{ id:'pick', lat:pos.lat, lon:pos.lon, color:'#B5602F', emoji:'📍' }] : []}
            addMode height={360} onMapClick={p=>setPos(p)} />
        </div>
        <div style={{ display:'flex', gap:8, padding:12 }}>
          <button onClick={onCancel} style={{ flex:1, padding:'10px', borderRadius:10,
            border:`1px solid ${T.line}`, color:T.soft, fontSize:13 }}>
            {lang==='ru'?'Отмена':'Annuler'}
          </button>
          <button onClick={()=>pos && onPick(pos)} disabled={!pos} className="serif"
            style={{ flex:1.4, padding:'10px', borderRadius:10, background:pos?T.clay:'#DDD3BE',
              color:pos?'#fff':T.mute, fontSize:13.5, fontWeight:700 }}>
            {lang==='ru'?'Подтвердить':'Valider ce point'}
          </button>
        </div>
      </div>
    </div>
  )
}
