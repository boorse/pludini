// ══════ Nouveaux parcours d'ajout d'observation, selon le type d'espèce ══════
// Type 1 (mammifères/oiseaux) : assistant guidé pas à pas.
// Type 2 (tout le reste) et Type 3 (humains/domestiques) : formulaire simplifié
// à un seul écran (Type 3 garde la notion de passage à l'affichage, mais le
// formulaire de saisie lui-même est identique à celui du Type 2).
import { useState } from 'react'
import { allCats, allPlayers, getMe, addSighting, setObservation, setQuality, setPixelated, speciesType, isFish,
         isVegetal, allSpecies, calcPtsLive } from './store.js'
import { METHODS, OBS_STATES, OBS_STATE_COLOR, obsStateLabel } from './data'
import { uploadPhotoFile } from './photoui.jsx'
import { T, Modal, label, input, ValidateBar, GpsMapPicker, visuallyHiddenFileInput, PhotoQualityPicker, FishSizePicker } from './editui.jsx'

const bigBtn = { display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'16px 8px',
  borderRadius:14, border:`1px solid ${T.line}`, background:T.card, textAlign:'center' }

function BackLink({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:5, color:T.clay,
      fontSize:12, fontWeight:600, marginBottom:10 }}>
      <i className="ti ti-arrow-left" style={{ fontSize:13 }} aria-hidden="true" />{children}
    </button>
  )
}

function WizardHeader({ lang, title, subtitle, optional, onClose, step, total }) {
  return (
    <div style={{ padding:'20px 22px 0' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div className="serif" style={{ fontSize:19, fontWeight:900, color:T.ink }}>{title}</div>
            {optional && <span style={{ fontSize:10, fontWeight:700, color:T.mute, background:T.card,
              border:`1px solid ${T.line}`, borderRadius:10, padding:'2px 8px', textTransform:'uppercase',
              letterSpacing:'.4px' }}>{lang==='ru'?'Необязательно':'Facultatif'}</span>}
          </div>
          {subtitle && <div style={{ fontSize:12, color:T.soft, marginTop:3 }}>{subtitle}</div>}
        </div>
        <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
          background:T.card, color:T.soft, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <i className="ti ti-x" style={{ fontSize:14 }} aria-hidden="true" />
        </button>
      </div>
      {total > 1 && (
        <div style={{ display:'flex', gap:4, marginTop:12 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ flex:1, height:4, borderRadius:2, background: i < step ? T.clay : T.line }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ══════ Étape « espèce » : règne puis animal — partagée par les trois types ══════
function SpeciesPickerScreen({ lang, species, screenTotal, onPick, onClose }) {
  const [pickCat, setPickCat] = useState(null)
  const [q, setQ] = useState('')
  const cats = allCats()
  const results = pickCat
    ? species.filter(s => s.cat === pickCat && (!q.trim() || s.n.toLowerCase().includes(q.toLowerCase().trim())))
    : []
  return (
    <>
      <WizardHeader lang={lang} step={1} total={screenTotal} onClose={onClose}
        title={lang==='ru'?'Какой вид?':'Quelle espèce ?'}
        subtitle={pickCat
          ? (lang==='ru'?'Выберите животное':'Choisis l’animal observé')
          : (lang==='ru'?'Сначала царство':'Commence par le règne')} />
      <div style={{ padding:'14px 22px 22px' }}>
        {!pickCat ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:8 }}>
            {cats.map(c => (
              <button key={c.id} onClick={() => setPickCat(c.id)} style={bigBtn}>
                <span style={{ fontSize:30 }}>{c.e}</span>
                <span style={{ fontSize:12.5, color:T.ink, fontWeight:600, lineHeight:1.2 }}>{c.n}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <BackLink onClick={() => { setPickCat(null); setQ('') }}>
              {lang==='ru'?'Все царства':'Tous les règnes'}
            </BackLink>
            <input value={q} onChange={e=>setQ(e.target.value)} autoFocus style={input}
              placeholder={lang==='ru'?'Начните вводить…':'Tape les premières lettres… (facultatif)'} />
            <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6, maxHeight:320, overflowY:'auto' }}>
              {results.length>0 ? results.map(s2=>(
                <button key={s2.id} onClick={()=>onPick(s2.id)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 13px', borderRadius:12,
                    border:`1px solid ${T.line}`, background:T.card, textAlign:'left' }}>
                  <span style={{ fontSize:22 }}>{s2.e}</span>
                  <span style={{ fontSize:13.5, color:T.ink, fontWeight:600, flex:1 }}>{s2.n}</span>
                  <span style={{ fontSize:10.5, color:T.mute, fontStyle:'italic' }}>{s2.lat}</span>
                </button>
              )) : (
                <div style={{ fontSize:12, color:T.mute, padding:'8px 2px', fontStyle:'italic' }}>
                  {lang==='ru'?'Ничего не найдено.':'Aucun résultat.'}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ══════ Assistant guidé — Type 1 : mammifères & oiseaux ══════
// Toujours un « passage » (jamais un familier à la création — on reconnaît et
// nomme un individu après coup, depuis sa fiche), pour ne poser qu'une seule
// question par écran comme demandé.
function Type1Wizard({ lang, sp, screenOffset, screenTotal, onClose, onSaved, onBackToSpecies }) {
  const me = getMe() || allPlayers()[0]?.name || ''
  const [step, setStep] = useState('photo_method') // 'photo_method' | 'lieu'
  const [subStep, setSubStep] = useState('photo')  // 'photo' | 'method'
  const [stagedFiles, setStagedFiles] = useState([])
  const [photoQuality, setPhotoQuality] = useState('normal') // 'low' | 'normal' | 'high'
  const [method, setMethod] = useState(null)
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [mapPick, setMapPick] = useState(false)
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [story, setStory] = useState('')
  const [unsure, setUnsure] = useState(false)
  const [obsState, setObsState] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const addFiles = files => setStagedFiles(v => [...v, ...[...files].filter(f=>f.type.startsWith('image/'))])
  const removeFile = i => setStagedFiles(v => v.filter((_,idx)=>idx!==i))

  const save = async () => {
    setBusy(true); setErr(null)
    try {
      const before = calcPtsLive(sp, me)
      const now = new Date()
      const dlabel = `Passage du ${now.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}`
      const gps = (lat && lon) ? [parseFloat(lat), parseFloat(lon)] : null
      const ind = {
        n: dlabel, named:false, note: note.trim(), d: now.toLocaleDateString('fr-FR'),
        time: time || now.toTimeString().slice(0,5), by: me, method, weather:'', story: story.trim(),
        desc:'', b:[], traits:'', uncertain: unsure, state: obsState || null,
        ...(gps ? { gps } : {}),
      }
      await addSighting(sp.id, ind)
      for (const f of stagedFiles) await uploadPhotoFile(`ind:${sp.id}:${dlabel}`, f, '', me)
      const cur = sp.obs?.[me] || []
      if (!cur.includes(method)) await setObservation(sp.id, me, [...cur, method])
      if (photoQuality==='high') await setQuality(sp.id, me, true)
      if (photoQuality==='low') await setPixelated(sp.id, me, true)
      const after = calcPtsLive(allSpecies().find(s=>s.id===sp.id) || sp, me)
      onSaved?.(sp.id, after - before); onClose()
    } catch (e) {
      setErr(e?.message || (lang==='ru'?'Не удалось сохранить. Проверьте соединение и попробуйте снова.'
        :'Échec de l’enregistrement. Vérifie ta connexion et réessaie.'))
      setBusy(false)
    }
  }

  const curIndex = step === 'photo_method' ? screenOffset + 1 : screenOffset + 2
  const methodIcons = { eye:'👁', scope:'🔭', night:'🌙', cam:'📷' }

  if (step === 'photo_method' && subStep === 'photo') return (
    <>
      <WizardHeader lang={lang} step={curIndex} total={screenTotal} onClose={onClose}
        title={lang==='ru'?'Фото':'La photo'} subtitle={sp.n} />
      <div style={{ padding:'14px 22px 0' }}>
        {onBackToSpecies && <BackLink onClick={onBackToSpecies}>{lang==='ru'?'Изменить вид':'Changer d’espèce'}</BackLink>}
        <label onDrop={e=>{ e.preventDefault(); addFiles(e.dataTransfer.files) }} onDragOver={e=>e.preventDefault()}
          style={{ display:'block', border:`2px dashed ${T.line}`, borderRadius:14, padding:'26px 14px', textAlign:'center',
            cursor:'pointer', background:T.card }}>
          <i className="ti ti-camera-plus" style={{ fontSize:28, color:T.clay }} aria-hidden="true" />
          <div style={{ fontSize:13, color:T.soft, marginTop:8 }}>
            {lang==='ru'?'Добавить фото':'Ajoute une ou plusieurs photos'}
          </div>
          <input type="file" accept="image/*" multiple style={visuallyHiddenFileInput}
            onChange={e=>{ addFiles(e.target.files); e.target.value='' }} />
        </label>
        {stagedFiles.length>0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
            {stagedFiles.map((f,i)=>(
              <div key={i} style={{ position:'relative', width:64, height:64, borderRadius:10, overflow:'hidden', border:`1px solid ${T.line}` }}>
                <img src={URL.createObjectURL(f)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                <button onClick={()=>removeFile(i)} style={{ position:'absolute', top:2, right:2, width:18, height:18,
                  borderRadius:'50%', background:'rgba(0,0,0,.6)', color:'#fff', fontSize:11, lineHeight:1 }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <PhotoQualityPicker lang={lang} value={photoQuality} onChange={setPhotoQuality} />
      </div>
      <div style={{ padding:'18px 22px 22px' }}>
        <button onClick={()=>setSubStep('method')} disabled={stagedFiles.length===0} className="serif"
          style={{ width:'100%', padding:'13px', borderRadius:13,
            background: stagedFiles.length===0 ? '#DDD3BE' : T.clay, color: stagedFiles.length===0 ? T.mute : '#fff',
            fontSize:14.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
          {lang==='ru'?'Далее':'Suivant'}
          <i className="ti ti-arrow-right" style={{ fontSize:16 }} aria-hidden="true" />
        </button>
      </div>
    </>
  )

  if (step === 'photo_method' && subStep === 'method') return (
    <>
      <WizardHeader lang={lang} step={curIndex} total={screenTotal} onClose={onClose}
        title={lang==='ru'?'Как вы увидели?':'Comment l’as-tu vu ?'} subtitle={sp.n} />
      <div style={{ padding:'14px 22px 22px' }}>
        <BackLink onClick={()=>setSubStep('photo')}>{lang==='ru'?'Назад':'Retour'}</BackLink>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {Object.entries(METHODS).map(([k,m])=>(
            <button key={k} onClick={()=>{ setMethod(k); setStep('lieu') }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7, padding:'22px 10px',
                borderRadius:14, border:`1px solid ${T.line}`, background:T.card }}>
              <span style={{ fontSize:30 }}>{methodIcons[k]}</span>
              <span style={{ fontSize:13, color:T.ink, fontWeight:600 }}>{m.l}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )

  // step === 'lieu'
  return (
    <>
      <WizardHeader lang={lang} step={curIndex} total={screenTotal} onClose={onClose} optional
        title={lang==='ru'?'Место и время':'Le lieu et l’heure'} subtitle={sp.n} />
      <div style={{ padding:'14px 22px 12px' }}>
        <BackLink onClick={()=>{ setStep('photo_method'); setSubStep('method') }}>{lang==='ru'?'Назад':'Retour'}</BackLink>

        <label style={label}>{lang==='ru'?'Координаты':'Où sur la carte ?'}</label>
        <div style={{ display:'flex', gap:6 }}>
          <input value={lat} onChange={e=>setLat(e.target.value)} placeholder="57.28636"
            style={{ ...input, flex:1, fontSize:12.5 }} />
          <input value={lon} onChange={e=>setLon(e.target.value)} placeholder="25.59392"
            style={{ ...input, flex:1, fontSize:12.5 }} />
          <button onClick={()=>setMapPick(true)} title={lang==='ru'?'Выбрать на карте':'Choisir sur la carte'}
            style={{ padding:'0 14px', borderRadius:10, border:`1px solid ${T.line}`,
              background:T.card, color:T.clay, fontSize:16 }}>📍</button>
        </div>

        <label style={label}>{lang==='ru'?'Время':'À quelle heure ?'}</label>
        <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={input} />

        <label style={label}>{lang==='ru'?'Кратко':'Petite info sur l’animal observé'}</label>
        <input value={note} onChange={e=>setNote(e.target.value)} style={{ ...input, fontSize:12.5 }}
          placeholder={lang==='ru'?'Взрослый самец':'Adulte, seul, en lisière'} />

        <label style={label}>{lang==='ru'?'Комментарий':'Commentaire d’observation'}</label>
        <textarea value={story} onChange={e=>setStory(e.target.value)} rows={3}
          style={{ ...input, fontSize:12.5, resize:'vertical' }}
          placeholder={lang==='ru'?'Что произошло…':'Raconte la rencontre… (facultatif)'} />

        <button type="button" onClick={()=>setUnsure(v=>!v)} style={{ width:'100%', padding:'10px', borderRadius:11, marginTop:12,
          border:`1.5px dashed ${unsure?'#D68C34':T.line}`, background:unsure?'#F5E4C8':'transparent',
          color: unsure?'#B5701A':T.soft, fontSize:12, fontWeight:600,
          display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <i className={`ti ${unsure?'ti-square-rounded-check':'ti-square-rounded'}`} style={{ fontSize:15 }} aria-hidden="true" />
          {lang==='ru'?'Я не уверен(а) в определении вида':'Je ne suis pas sûr(e) de l’identification'}
        </button>
        {unsure && <div style={{ fontSize:11, color:T.mute, marginTop:4, lineHeight:1.45 }}>
          {lang==='ru'?'Не будет приносить очков, пока определение не подтверждено.'
                      :'Ne rapportera pas de points tant que ce n’est pas confirmé.'}
        </div>}

        <label style={label}>{lang==='ru'?'Observation particulière':'Observation particulière'}</label>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {Object.keys(OBS_STATES).map(k=>{
            const st = obsStateLabel(k, sp)
            const on = obsState===k
            return (
              <button key={k} type="button" onClick={()=>setObsState(on?'':k)}
                style={{ padding:'7px 11px', borderRadius:10, fontSize:12,
                  border:`1.5px solid ${on?OBS_STATE_COLOR:T.line}`, background:on?'#DCE8F0':'transparent',
                  color:on?OBS_STATE_COLOR:T.soft, fontWeight:on?700:400,
                  display:'flex', alignItems:'center', gap:5 }}>
                <span>{st.e}</span>{lang==='ru'?st.ru:st.l}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize:11, color:T.mute, marginTop:4, lineHeight:1.45 }}>
          {lang==='ru'?'Необязательно — даёт +10% очков и продвигает коллекцию значков вида.'
                      :'Facultatif — rapporte 10% de points en plus et fait progresser le badge de collection de l’espèce.'}
        </div>

        {err && <div style={{ fontSize:12, color:'#B91C1C', background:'#FEF2F2', border:'1px solid #FCA5A5',
          borderRadius:9, padding:'8px 11px', marginTop:11 }}>{err}</div>}
      </div>
      <div style={{ padding:'6px 22px 22px' }}>
        <button onClick={save} disabled={busy} className="serif"
          style={{ width:'100%', padding:'13px', borderRadius:13,
            background: busy ? '#DDD3BE' : T.clay, color: busy ? T.mute : '#fff',
            fontSize:14.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
          <i className="ti ti-check" style={{ fontSize:17 }} aria-hidden="true" />
          {busy ? (lang==='ru'?'Сохранение…':'Enregistrement…') : (lang==='ru'?'Сохранить':'Enregistrer')}
        </button>
        {!busy && (
          <button onClick={save} style={{ display:'block', margin:'10px auto 0', color:T.mute, fontSize:11 }}>
            {lang==='ru'?'Сделаю это позже':'Je le ferai plus tard'}
          </button>
        )}
      </div>
      {mapPick && <GpsMapPicker lat={lat} lon={lon} lang={lang}
        onCancel={()=>setMapPick(false)}
        onPick={(p)=>{ setLat(p.lat.toFixed(5)); setLon(p.lon.toFixed(5)); setMapPick(false) }} />}
    </>
  )
}

// ══════ Formulaire simplifié — Type 2 (le reste) & Type 3 (humains/domestiques) ══════
// Identique dans les deux cas : seule la fiche espèce affiche le résultat
// différemment ensuite (grille de photos pour le Type 2, Passages sans
// Familiers pour le Type 3).
function SimpleObsForm({ lang, sp, onClose, onSaved, onBackToSpecies }) {
  const me = getMe() || allPlayers()[0]?.name || ''
  const fish = isFish(sp)
  const [stagedFiles, setStagedFiles] = useState([])
  const [note, setNote] = useState('')
  const [fishSize, setFishSize] = useState('moyen')
  const [unsure, setUnsure] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const addFiles = files => setStagedFiles(v => [...v, ...[...files].filter(f=>f.type.startsWith('image/'))])
  const removeFile = i => setStagedFiles(v => v.filter((_,idx)=>idx!==i))

  const save = async () => {
    setBusy(true); setErr(null)
    try {
      const before = calcPtsLive(sp, me)
      const now = new Date()
      const dateShort = now.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})
      const dlabel = isVegetal(sp) ? dateShort : `${fish?'Pêche':'Passage'} du ${dateShort}`
      const ind = { n: dlabel, named:false, note: note.trim(), d: now.toLocaleDateString('fr-FR'),
        time:'', by: me, method:'eye', weather:'', story:'', desc:'', b:[], traits:'', uncertain: unsure,
        ...(fish ? { size: fishSize } : {}) }
      await addSighting(sp.id, ind)
      for (const f of stagedFiles) await uploadPhotoFile(`ind:${sp.id}:${dlabel}`, f, '', me)
      const cur = sp.obs?.[me] || []
      if (!cur.includes('eye')) await setObservation(sp.id, me, [...cur, 'eye'])
      const after = calcPtsLive(allSpecies().find(s=>s.id===sp.id) || sp, me)
      onSaved?.(sp.id, after - before); onClose()
    } catch (e) {
      setErr(e?.message || (lang==='ru'?'Не удалось сохранить. Проверьте соединение и попробуйте снова.'
        :'Échec de l’enregistrement. Vérifie ta connexion et réessaie.'))
      setBusy(false)
    }
  }

  return (
    <>
      <WizardHeader lang={lang} step={1} total={1} onClose={onClose}
        title={fish ? (lang==='ru'?'Поймана рыба':'Poisson pêché') : (lang==='ru'?'Новое наблюдение':'Nouvelle observation')}
        subtitle={sp.n} />
      <div style={{ padding:'14px 22px 12px' }}>
        {onBackToSpecies && <BackLink onClick={onBackToSpecies}>{lang==='ru'?'Изменить вид':'Changer d’espèce'}</BackLink>}
        <label onDrop={e=>{ e.preventDefault(); addFiles(e.dataTransfer.files) }} onDragOver={e=>e.preventDefault()}
          style={{ display:'block', border:`2px dashed ${T.line}`, borderRadius:12, padding:'16px', textAlign:'center',
            cursor:'pointer', background:T.card }}>
          <i className="ti ti-camera-plus" style={{ fontSize:22, color:T.clay }} aria-hidden="true" />
          <div style={{ fontSize:12, color:T.soft, marginTop:5 }}>
            {lang==='ru'?'Добавить фото':'Ajoute une photo'}
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
        {fish && (<>
          <label style={label}>{lang==='ru'?'Размер':'Taille'}</label>
          <FishSizePicker lang={lang} sp={sp} value={fishSize} onChange={setFishSize} />
        </>)}
        <button type="button" onClick={()=>setUnsure(v=>!v)} style={{ width:'100%', padding:'10px', borderRadius:11, marginTop:10,
          border:`1.5px dashed ${unsure?'#D68C34':T.line}`, background:unsure?'#F5E4C8':'transparent',
          color: unsure?'#B5701A':T.soft, fontSize:12, fontWeight:600,
          display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <i className={`ti ${unsure?'ti-square-rounded-check':'ti-square-rounded'}`} style={{ fontSize:15 }} aria-hidden="true" />
          {lang==='ru'?'Я не уверен(а) в определении вида':'Je ne suis pas sûr(e) de l’identification'}
        </button>
        {unsure && <div style={{ fontSize:11, color:T.mute, marginTop:4, marginBottom:2, lineHeight:1.45 }}>
          {lang==='ru'?'Не будет приносить очков, пока определение не подтверждено.'
                      :'Ne rapportera pas de points tant que ce n’est pas confirmé.'}
        </div>}

        <label style={{ ...label, marginTop:10 }}>{lang==='ru'?'Кратко':'Un petit mot (facultatif)'}</label>
        <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3}
          style={{ ...input, fontSize:12.5, resize:'vertical' }}
          placeholder={lang==='ru'?'Что вы заметили…':'Ce que tu as remarqué…'} />
        {err && <div style={{ fontSize:12, color:'#B91C1C', background:'#FEF2F2', border:'1px solid #FCA5A5',
          borderRadius:9, padding:'8px 11px', marginTop:11 }}>{err}</div>}
      </div>
      <ValidateBar lang={lang} onCancel={onClose} onSave={save} busy={busy} disabled={false} />
    </>
  )
}

// ══════ Routeur principal : choisit l'espèce puis le bon formulaire ══════
export function AddObservation({ lang, species, presetSp, onClose, onSaved }) {
  const [spId, setSpId] = useState(presetSp?.id || '')
  const sp = (presetSp && presetSp.id === spId) ? presetSp : species.find(s => s.id === spId)
  const screenOffset = presetSp ? 0 : 1
  const screenTotal = sp ? (speciesType(sp) === 1 ? screenOffset + 2 : 1) : (presetSp ? 1 : 1)

  return (
    <Modal onClose={onClose} max={520}>
      {!sp ? (
        <SpeciesPickerScreen lang={lang} species={species} screenTotal={3}
          onPick={id => setSpId(id)} onClose={onClose} />
      ) : speciesType(sp) === 1 ? (
        <Type1Wizard lang={lang} sp={sp} screenOffset={screenOffset} screenTotal={screenOffset+2}
          onClose={onClose} onSaved={onSaved}
          onBackToSpecies={presetSp ? null : () => setSpId('')} />
      ) : (
        <SimpleObsForm lang={lang} sp={sp} onClose={onClose} onSaved={onSaved}
          onBackToSpecies={presetSp ? null : () => setSpId('')} />
      )}
    </Modal>
  )
}
