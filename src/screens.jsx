import { useState, useEffect } from 'react'
import { THEMES, MONTHS, MONTHS_RU, EVENTS, DEFAULT_TYPES, CENTER } from './territory.js'
import SatMap from './satmap.jsx'
import { isObserved } from './data'
import { gradientFor } from './gradients.js'
import { UI, nameOf } from './i18n.js'
import { LUT } from './photoui.jsx'
import { allPhotos, allSpecies, allPlayers, subscribe } from './store.js'
import { getTodos, saveTodo, deleteTodo, getPins, savePin, deletePin,
         getZones, saveZone, deleteZone, getPinTypes, savePinType } from './cloud.js'
import { CoverBg } from './photoui.jsx'

const T = {
  bg:'#EDE7D8', surface:'#E3DAC5', card:'#E6DDC8',
  ink:'#2B2620', soft:'#6B6357', mute:'#9A9081',
  line:'#D3C7AE', clay:'#B5602F', clayDark:'#8F4A22', sage:'#7A8B5C', sageDark:'#4A5D32',
}
const chip = (on) => ({ fontSize:11.5, padding:'6px 12px', borderRadius:16,
  border:`1px solid ${on?T.clay:T.line}`, background:on?T.clay:'transparent',
  color:on?'#fff':T.soft, fontWeight:on?600:400 })

function Back({ onBack, label }) {
  return <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:T.soft, marginBottom:12 }}>
    <i className="ti ti-arrow-left" aria-hidden="true" /> {label}
  </button>
}

// ══════════ CALENDRIER + TO-DO ══════════
export function Calendar({ wide, lang, onBack }) {
  const t = UI[lang]
  const [theme, setTheme] = useState('all')
  const [month, setMonth] = useState(new Date().getMonth())
  const [tab, setTab] = useState('cal')
  const months = lang==='ru' ? MONTHS_RU : MONTHS
  const list = EVENTS.filter(e => (theme==='all'||e.t===theme) && e.m.includes(month))

  // to-do partagée (localStorage)
  const [todos, setTodos] = useState([])
  const [draft, setDraft] = useState('')
  const [who, setWho] = useState(() => allPlayers()[0]?.name || '')
  const SPECIES = allSpecies(); const ALL_PLAYERS = allPlayers()
  const reloadTodos = async () => { try { setTodos(await getTodos()) } catch(e){} }
  useEffect(()=>{ reloadTodos() },[])
  const add = async () => {
    if(!draft.trim()) return
    const t2 = { id:Date.now(), txt:draft.trim(), by:who, done:false, theme }
    setTodos(v=>[...v, t2]); setDraft('')
    await saveTodo(t2); reloadTodos()
  }
  const toggle = async (id) => {
    const t2 = todos.find(x=>x.id===id); if(!t2) return
    const n = { ...t2, done:!t2.done }
    setTodos(v=>v.map(x=>x.id===id?n:x))
    await saveTodo(n)
  }
  const del = async (id) => { setTodos(v=>v.filter(x=>x.id!==id)); await deleteTodo(id) }

  return (
    <div style={{ padding: wide?'16px 40px 40px':'14px 18px 30px' }}>
      <Back onBack={onBack} label={t.home} />
      <h2 className="serif" style={{ fontSize: wide?30:23, fontWeight:900, color:T.ink, marginBottom:4 }}>
        {lang==='ru'?'Календарь работ':'Calendrier des travaux'}
      </h2>
      <p style={{ fontSize:12.5, color:T.mute, marginBottom:14 }}>
        {lang==='ru'?'Что делать и что наблюдать в течение года':'Ce qu\u2019il y a à faire et à observer au fil de l\u2019année'}
      </p>

      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {[['cal', lang==='ru'?'Календарь':'Calendrier','ti-calendar'],['todo', t.todo,'ti-checklist']].map(([k,l,ic])=>(
          <button key={k} onClick={()=>setTab(k)} className="serif" style={{ fontSize:15, fontWeight:tab===k?900:500,
            padding:'8px 16px', borderRadius:20, background:tab===k?T.clay:'transparent',
            color:tab===k?'#fff':T.ink, border:tab===k?'none':`1px solid ${T.line}`,
            display:'flex', alignItems:'center', gap:6 }}>
            <i className={`ti ${ic}`} style={{ fontSize:15 }} aria-hidden="true" />{l}
            {k==='todo' && todos.filter(x=>!x.done).length>0 &&
              <span style={{ fontSize:10, background:tab===k?'rgba(255,255,255,.25)':'#F0E4CF', color:tab===k?'#fff':'#8F4A22', borderRadius:9, padding:'1px 6px', fontWeight:700 }}>{todos.filter(x=>!x.done).length}</span>}
          </button>
        ))}
      </div>

      {tab==='cal' ? <>
        <div style={{ display:'flex', gap:5, overflowX:'auto', paddingBottom:8, marginBottom:12 }}>
          {months.map((m,i)=>(
            <button key={m} onClick={()=>setMonth(i)} style={{ flexShrink:0, fontSize:12, padding:'7px 13px', borderRadius:16,
              border:`1px solid ${month===i?T.clay:T.line}`, background:month===i?T.clay:'transparent',
              color:month===i?'#fff':T.soft, fontWeight:month===i?600:400 }}>{m.slice(0,4)}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:16 }}>
          <button onClick={()=>setTheme('all')} style={chip(theme==='all')}>{t.all}</button>
          {Object.entries(THEMES).map(([k,th])=>(
            <button key={k} onClick={()=>setTheme(k)} style={{ ...chip(theme===k),
              background:theme===k?th.c:'transparent', borderColor:theme===k?th.c:T.line, color:theme===k?'#fff':T.soft }}>
              {th.e} {lang==='ru'?th.ru:th.l}
            </button>
          ))}
        </div>
        {list.length===0
          ? <div style={{ fontSize:13, color:T.mute, padding:'20px 0' }}>{t.nothingPlanned}</div>
          : <div style={{ display:'grid', gridTemplateColumns: wide?'1fr 1fr':'1fr', gap:9 }}>
              {list.map((e,i)=>{
                const th = THEMES[e.t]
                return (
                  <div key={i} style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden', display:'flex' }}>
                    <div style={{ width:5, background:th.c, flexShrink:0 }} />
                    <div style={{ padding:'11px 13px', flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                        <span style={{ fontSize:14 }}>{th.e}</span>
                        <span style={{ fontSize:10, color:th.c, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px' }}>{lang==='ru'?th.ru:th.l}</span>
                        <span style={{ marginLeft:'auto', fontSize:10, color:T.mute }}>{e.m.map(mi=>months[mi].slice(0,3)).join(' · ')}</span>
                      </div>
                      <div className="serif" style={{ fontSize:14, fontWeight:700, color:T.ink, marginBottom:3 }}>{e.l}</div>
                      <div style={{ fontSize:11.5, color:T.soft, lineHeight:1.5 }}>{e.d}</div>
                    </div>
                  </div>
                )
              })}
            </div>}
      </> : <>
        <div style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:14, padding:13, marginBottom:14 }}>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}
              placeholder={lang==='ru'?'Что нужно сделать?':'Qu\u2019y a-t-il à faire ?'}
              style={{ flex:1, minWidth:180, padding:'10px 12px', borderRadius:10, border:`1px solid ${T.line}`, background:T.bg, fontSize:13, color:T.ink }} />
            <select value={who} onChange={e=>setWho(e.target.value)}
              style={{ padding:'10px 10px', borderRadius:10, border:`1px solid ${T.line}`, background:T.bg, fontSize:12.5, color:T.soft }}>
              {allPlayers().filter(p=>!p.demo).map(p=><option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <button onClick={add} className="serif" style={{ padding:'10px 18px', borderRadius:10, background:T.sageDark, color:'#fff', fontSize:13.5, fontWeight:700 }}>
              {t.addTask}
            </button>
          </div>
        </div>
        {todos.length===0
          ? <div style={{ fontSize:13, color:T.mute, padding:'16px 0' }}>{t.noTask}</div>
          : <div style={{ display:'grid', gridTemplateColumns: wide?'1fr 1fr':'1fr', gap:8 }}>
              {[...todos].sort((a,b)=>a.done-b.done).map(x=>{
                const th = THEMES[x.theme] || THEMES.agri
                return (
                  <div key={x.id} style={{ background:T.card, border:`1px solid ${x.done?T.line:th.c}`, borderRadius:12,
                    padding:'10px 12px', display:'flex', alignItems:'center', gap:10, opacity:x.done?.55:1 }}>
                    <button onClick={()=>toggle(x.id)} style={{ width:20, height:20, borderRadius:6, flexShrink:0,
                      border:`2px solid ${x.done?T.sage:T.line}`, background:x.done?T.sage:'transparent',
                      color:'#fff', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>{x.done?'✓':''}</button>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, color:T.ink, textDecoration:x.done?'line-through':'none' }}>{x.txt}</div>
                      <div style={{ fontSize:10.5, color:T.mute, marginTop:2 }}>{x.by}</div>
                    </div>
                    <button onClick={()=>del(x.id)} style={{ color:T.mute, fontSize:14 }}>✕</button>
                  </div>
                )
              })}
            </div>}
      </>}
    </div>
  )
}

// ══════════ TERRITOIRE — carte satellite éditable ══════════
export function Territory({ wide, lang, onBack, edit }) {
  const t = UI[lang]
  const [pins, setPins] = useState([])
  const [zones, setZones] = useState([])
  const [types, setTypes] = useState([])       // types de pin personnalisés
  const [sel, setSel] = useState(null)          // pin sélectionné
  const [tool, setTool] = useState(null)        // 'pin' | 'zone' | 'line' | null
  const [pinType, setPinType] = useState(null)
  const [draftPin, setDraftPin] = useState(null)
  const [draftPts, setDraftPts] = useState([])  // sommets en cours (zone/ligne)
  const [typeEditor, setTypeEditor] = useState(false)

  const reload = async () => {
    try {
      const [p, z, ty] = await Promise.all([getPins(), getZones(), getPinTypes()])
      setPins(p); setZones(z); setTypes(ty)
    } catch(e){}
  }
  useEffect(()=>{ reload() },[])

  const allTypes = { ...DEFAULT_TYPES, ...Object.fromEntries(types.map(t2=>[t2.id, t2])) }
  const mapPins = pins.map(p => ({
    id:p.id, lat:p.gps[0], lon:p.gps[1], label:p.l,
    color:allTypes[p.t]?.c || '#B5602F', emoji:allTypes[p.t]?.e || '📍'
  }))
  const center = sel ? { lat:sel.gps[0], lon:sel.gps[1] } : CENTER

  const onMapClick = async (pos) => {
    if (tool === 'pin') {
      setDraftPin({ gps:[pos.lat, pos.lon], t: pinType || Object.keys(allTypes)[0], l:'', d:'' })
      setTool(null)
    } else if (tool === 'zone' || tool === 'line') {
      setDraftPts(pts => [...pts, [pos.lat, pos.lon]])
    }
  }

  const finishShape = async () => {
    if (draftPts.length < 2) { setDraftPts([]); setTool(null); return }
    const kind = tool
    const z = { id:'z'+Date.now(), kind, pts:draftPts,
      color: kind==='zone' ? '#7A8B5C' : '#B5602F', l:'' }
    setZones(v=>[...v, z]); setDraftPts([]); setTool(null)
    await saveZone(z); reload()
  }

  return (
    <div style={{ padding: wide?'16px 40px 40px':'14px 18px 30px' }}>
      <Back onBack={onBack} label={t.home} />
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:12 }}>
        <div>
          <h2 className="serif" style={{ fontSize: wide?30:23, fontWeight:900, color:T.ink, marginBottom:3 }}>
            {lang==='ru'?'Территория':'Le territoire'}
          </h2>
          <p style={{ fontSize:12, color:T.mute }}>57°17′10.9″N · 25°35′38.1″E</p>
        </div>
      </div>

      {edit && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12, alignItems:'center' }}>
          <span style={{ fontSize:11, color:T.mute }}>{lang==='ru'?'Инструмент:':'Outil :'}</span>
          <button onClick={()=>{ setTool(tool==='pin'?null:'pin'); setDraftPts([]) }}
            style={toolBtn(tool==='pin')}>
            <i className="ti ti-map-pin" style={{ fontSize:14 }} aria-hidden="true" /> {lang==='ru'?'Точка':'Repère'}
          </button>
          <button onClick={()=>{ setTool(tool==='zone'?null:'zone'); setDraftPts([]) }}
            style={toolBtn(tool==='zone')}>
            <i className="ti ti-polygon" style={{ fontSize:14 }} aria-hidden="true" /> {lang==='ru'?'Зона':'Zone'}
          </button>
          <button onClick={()=>{ setTool(tool==='line'?null:'line'); setDraftPts([]) }}
            style={toolBtn(tool==='line')}>
            <i className="ti ti-line" style={{ fontSize:14 }} aria-hidden="true" /> {lang==='ru'?'Линия':'Tracé'}
          </button>
          <button onClick={()=>setTypeEditor(true)} style={{ ...toolBtn(false), marginLeft:6 }}>
            <i className="ti ti-plus" style={{ fontSize:14 }} aria-hidden="true" /> {lang==='ru'?'Тип точки':'Type de repère'}
          </button>
        </div>
      )}

      {edit && tool==='pin' && (
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10, alignItems:'center' }}>
          <span style={{ fontSize:11, color:T.mute }}>{lang==='ru'?'Тип:':'Type :'}</span>
          {Object.entries(allTypes).map(([k,ty])=>(
            <button key={k} onClick={()=>setPinType(k)} style={{ fontSize:11.5, padding:'5px 10px', borderRadius:14,
              border:`1px solid ${(pinType||Object.keys(allTypes)[0])===k?ty.c:T.line}`,
              background:(pinType||Object.keys(allTypes)[0])===k?ty.c:'transparent',
              color:(pinType||Object.keys(allTypes)[0])===k?'#fff':T.soft }}>{ty.e} {ty.l}</button>
          ))}
        </div>
      )}

      {edit && (tool==='zone'||tool==='line') && (
        <div style={{ background:'#F0E4CF', border:'1px solid #DCC79E', borderRadius:11, padding:'9px 12px',
          fontSize:12, color:'#6B5330', marginBottom:10, display:'flex', alignItems:'center', gap:9, flexWrap:'wrap' }}>
          <i className="ti ti-hand-click" style={{ fontSize:15 }} aria-hidden="true" />
          <span style={{ flex:1 }}>
            {tool==='zone'
              ? (lang==='ru'?'Отметьте углы зоны на карте.':'Clique les coins de la zone sur la carte.')
              : (lang==='ru'?'Отметьте точки линии.':'Clique les points du tracé.')}
            {draftPts.length>0 && ` (${draftPts.length})`}
          </span>
          <button onClick={finishShape} disabled={draftPts.length<2}
            className="serif" style={{ padding:'6px 13px', borderRadius:10,
              background:draftPts.length>=2?T.sageDark:'#CFC3A8', color:'#fff', fontSize:12.5, fontWeight:700 }}>
            {lang==='ru'?'Готово':'Terminer'}
          </button>
          <button onClick={()=>{ setDraftPts([]); setTool(null) }}
            style={{ padding:'6px 11px', borderRadius:10, border:`1px solid #DCC79E`, color:'#6B5330', fontSize:12 }}>
            {lang==='ru'?'Отмена':'Annuler'}
          </button>
        </div>
      )}

      <div style={{ borderRadius:16, overflow:'hidden', border:`1px solid ${T.line}`, position:'relative' }}>
        <SatMap center={center} pins={mapPins} zones={zones} draftPts={draftPts} draftKind={tool}
          selected={sel && { id:sel.id }} height={wide?680:'calc(100dvh - 260px)'}
          addMode={tool==='pin'} lineMode={tool==='zone'||tool==='line'}
          onSelect={(p)=>setSel(p ? pins.find(x=>x.id===p.id) : null)}
          onMapClick={onMapClick} />
        {sel && (
          <div style={{ position:'absolute', left:10, right:10, bottom:10, background:'rgba(20,22,14,.93)',
            borderRadius:12, padding:'11px 13px', zIndex:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
              <span style={{ fontSize:15 }}>{allTypes[sel.t]?.e}</span>
              <span className="serif" style={{ fontSize:14, fontWeight:700, color:'#F2EEE2' }}>{sel.l||allTypes[sel.t]?.l}</span>
              {edit && <button onClick={async()=>{ setPins(v=>v.filter(x=>x.id!==sel.id)); const id=sel.id; setSel(null); await deletePin(id) }}
                style={{ color:'rgba(255,180,160,.9)', fontSize:11, marginLeft:6 }}>{lang==='ru'?'Удалить':'Supprimer'}</button>}
              <button onClick={()=>setSel(null)} style={{ marginLeft:'auto', color:'rgba(242,238,226,.6)', fontSize:15 }}>✕</button>
            </div>
            {sel.d && <div style={{ fontSize:11.5, color:'rgba(242,238,226,.8)', lineHeight:1.5 }}>{sel.d}</div>}
            <div style={{ fontSize:10.5, color:'rgba(242,238,226,.5)', marginTop:4 }}>
              {sel.gps[0].toFixed(5)}° N · {sel.gps[1].toFixed(5)}° E
            </div>
          </div>
        )}
      </div>

      {/* liste des repères */}
      {pins.length>0 && (
        <div style={{ display:'grid', gridTemplateColumns: wide?'1fr 1fr':'1fr', gap:7, marginTop:14 }}>
          {pins.map(p=>{
            const ty = allTypes[p.t] || {}; const on = sel?.id===p.id
            return (
              <button key={p.id} onClick={()=>setSel(on?null:p)} style={{ textAlign:'left',
                background:on?'#F0E4CF':T.card, border:`1px solid ${on?T.clay:T.line}`, borderRadius:11,
                padding:'9px 11px', display:'flex', alignItems:'flex-start', gap:9 }}>
                <span style={{ width:26, height:26, borderRadius:'50%', background:ty.c||'#B5602F', display:'flex',
                  alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>{ty.e||'📍'}</span>
                <div>
                  <div className="serif" style={{ fontSize:12.5, fontWeight:700, color:T.ink }}>{p.l||ty.l}</div>
                  {p.d && <div style={{ fontSize:11, color:T.soft, lineHeight:1.45, marginTop:2 }}>{p.d}</div>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {draftPin && <PinEditor draft={draftPin} types={allTypes} lang={lang}
        onCancel={()=>setDraftPin(null)}
        onSave={async(pin)=>{ const np={ ...pin, id:'p'+Date.now() }; setPins(v=>[...v,np]); setDraftPin(null); await savePin(np); reload() }} />}
      {typeEditor && <PinTypeEditor lang={lang} onCancel={()=>setTypeEditor(false)}
        onSave={async(ty)=>{ const nt={ ...ty, id:'t'+Date.now() }; setTypes(v=>[...v,nt]); setPinType(nt.id); setTypeEditor(false); await savePinType(nt); reload() }} />}
    </div>
  )
}

const toolBtn = (on) => ({ fontSize:11.5, padding:'6px 12px', borderRadius:16,
  border:`1px solid ${on?T.clay:T.line}`, background:on?T.clay:'transparent',
  color:on?'#fff':T.soft, fontWeight:on?600:400, display:'flex', alignItems:'center', gap:5 })

function PinEditor({ draft, types, lang, onCancel, onSave }) {
  const [l, setL] = useState('')
  const [d, setD] = useState('')
  const [ty, setTy] = useState(draft.t)
  return (
    <div onClick={onCancel} style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.6)', zIndex:140,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:18, padding:22,
        width:'100%', maxWidth:400, border:`1px solid ${T.line}` }}>
        <div className="serif" style={{ fontSize:18, fontWeight:900, color:T.ink, marginBottom:4 }}>
          {lang==='ru'?'Новая точка':'Nouveau repère'}
        </div>
        <div style={{ fontSize:11, color:T.mute, marginBottom:14 }}>
          {draft.gps[0].toFixed(5)}° N · {draft.gps[1].toFixed(5)}° E
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:12 }}>
          {Object.entries(types).map(([k,v])=>(
            <button key={k} onClick={()=>setTy(k)} style={{ fontSize:11, padding:'5px 10px', borderRadius:14,
              border:`1px solid ${ty===k?v.c:T.line}`, background:ty===k?v.c:'transparent',
              color:ty===k?'#fff':T.soft }}>{v.e} {v.l}</button>
          ))}
        </div>
        <input value={l} onChange={e=>setL(e.target.value)} autoFocus
          placeholder={lang==='ru'?'Название':'Nom du repère'}
          style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${T.line}`,
            background:T.card, fontSize:13.5, color:T.ink, marginBottom:9 }} />
        <textarea value={d} onChange={e=>setD(e.target.value)} rows={3}
          placeholder={lang==='ru'?'Заметка':'Note'}
          style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${T.line}`,
            background:T.card, fontSize:12.5, color:T.ink, marginBottom:14, resize:'vertical' }} />
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onCancel} style={{ flex:1, padding:'10px', borderRadius:10,
            border:`1px solid ${T.line}`, color:T.soft, fontSize:13 }}>
            {lang==='ru'?'Отмена':'Annuler'}
          </button>
          <button onClick={()=>onSave({ ...draft, t:ty, l:l.trim(), d:d.trim() })}
            className="serif" style={{ flex:1.3, padding:'10px', borderRadius:10, background:T.clay,
              color:'#fff', fontSize:13.5, fontWeight:700 }}>
            {lang==='ru'?'Сохранить':'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

const PIN_EMOJIS = ['📷','🕳️','🔨','💧','🍄','🌾','🏠','🔭','❓','🦌','🐗','🦫','🪺','🌲','🍇','⛺','🔥','⚠️','🚩','⭐','🥾','🎣']
function PinTypeEditor({ lang, onCancel, onSave }) {
  const [l, setL] = useState('')
  const [e, setE] = useState('🚩')
  const [c, setC] = useState('#B5602F')
  const colors = ['#B5602F','#4A5D32','#5B7E8E','#9A7B4F','#8B9B6E','#8A7B62','#5B6B7E','#8B3A2E','#A9799A','#C9A046']
  return (
    <div onClick={onCancel} style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.6)', zIndex:145,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={ev=>ev.stopPropagation()} style={{ background:T.bg, borderRadius:18, padding:22,
        width:'100%', maxWidth:420, border:`1px solid ${T.line}` }}>
        <div className="serif" style={{ fontSize:18, fontWeight:900, color:T.ink, marginBottom:14 }}>
          {lang==='ru'?'Новый тип точки':'Nouveau type de repère'}
        </div>
        <label style={{ fontSize:11, color:T.mute, display:'block', marginBottom:5 }}>{lang==='ru'?'Значок':'Emoji'}</label>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:12 }}>
          {PIN_EMOJIS.map(x=>(
            <button key={x} onClick={()=>setE(x)} style={{ fontSize:18, width:34, height:34, borderRadius:9,
              border:`1px solid ${e===x?T.clay:T.line}`, background:e===x?'#F0DDD0':'transparent' }}>{x}</button>
          ))}
        </div>
        <label style={{ fontSize:11, color:T.mute, display:'block', marginBottom:5 }}>{lang==='ru'?'Цвет':'Couleur'}</label>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          {colors.map(x=>(
            <button key={x} onClick={()=>setC(x)} style={{ width:28, height:28, borderRadius:'50%', background:x,
              border:c===x?'3px solid #2B2620':'2px solid #fff', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }} />
          ))}
        </div>
        <label style={{ fontSize:11, color:T.mute, display:'block', marginBottom:5 }}>{lang==='ru'?'Название':'Nom du type'}</label>
        <input value={l} onChange={ev=>setL(ev.target.value)} autoFocus
          placeholder={lang==='ru'?'Например: Гнездо':'Ex. Nid, Piège, Source…'}
          style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${T.line}`,
            background:T.card, fontSize:13.5, color:T.ink, marginBottom:14 }} />
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onCancel} style={{ flex:1, padding:'10px', borderRadius:10,
            border:`1px solid ${T.line}`, color:T.soft, fontSize:13 }}>{lang==='ru'?'Отмена':'Annuler'}</button>
          <button onClick={()=>l.trim() && onSave({ l:l.trim(), e, c })}
            className="serif" style={{ flex:1.3, padding:'10px', borderRadius:10, background:T.clay,
              color:'#fff', fontSize:13.5, fontWeight:700 }}>{lang==='ru'?'Создать':'Créer'}</button>
        </div>
      </div>
    </div>
  )
}

// ══════════ GALERIE + LIGHTBOX ══════════
export function Gallery({ wide, lang, onBack }) {
  const t = UI[lang]
  const SPECIES = allSpecies()
  const [box, setBox] = useState(null)
  const [shots, setShots] = useState([])

  useEffect(() => {
    ;(async () => {
      const photos = allPhotos()
      const items = []
      photos.forEach(p => {
        const [kind, spId, indName] = p.target.split(':')
        const sp = SPECIES.find(x => x.id === spId)
        if (!sp) return
        const ind = kind === 'ind' ? (sp.inds || []).find(i => i.n === indName) : null
        items.push({ sp, ind, url: p.url, caption: p.caption, by: p.by || ind?.by })
      })
      SPECIES.filter(isObserved).forEach(sp => (sp.inds || []).forEach(ind => {
        if (!items.some(it => it.ind?.n === ind.n && it.sp.id === sp.id)) items.push({ sp, ind, url: null })
      }))
      setShots(items)
    })()
  }, [])

  const real = shots.filter(s => s.url).length

  return (
    <div style={{ padding: wide?'16px 40px 40px':'14px 18px 30px' }}>
      <Back onBack={onBack} label={t.home} />
      <h2 className="serif" style={{ fontSize: wide?30:23, fontWeight:900, color:T.ink, marginBottom:4 }}>
        {lang==='ru'?'Галерея':'La galerie'}
      </h2>
      <p style={{ fontSize:12.5, color:T.mute, marginBottom:16 }}>
        {real} {lang==='ru'?'фото':'photo'}{real!==1?'s':''} · {shots.length-real} {lang==='ru'?'без фото':'sans image'}
      </p>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(auto-fill,minmax(${wide?170:140}px,1fr))`, gap:10 }}>
        {shots.map((sh,i)=>(
          <button key={i} onClick={()=>setBox(sh)} style={{ textAlign:'left', borderRadius:14,
            overflow:'hidden', border:`1px solid ${T.line}`, padding:0, position:'relative', aspectRatio:'4/5' }}>
            {sh.url
              ? <img src={sh.url} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', filter:LUT }} />
              : <div style={{ position:'absolute', inset:0, background:gradientFor(sh.sp.id+(sh.ind?.n||'')) }} />}
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(16,18,12,.78), transparent 55%)' }} />
            <div style={{ position:'relative', height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:11 }}>
              <span style={{ fontSize:22 }}>{sh.sp.e}</span>
              <div>
                <div className="serif" style={{ fontSize:13.5, fontWeight:700, color:'#F2EEE2', lineHeight:1.1 }}>{sh.ind?.n || nameOf(sh.sp,lang).main}</div>
                <div style={{ fontSize:10.5, color:'rgba(242,238,226,.78)', marginTop:2 }}>{nameOf(sh.sp,lang).main}</div>
                {sh.ind?.d && <div style={{ fontSize:9.5, color:'rgba(242,238,226,.6)', marginTop:1 }}>{sh.ind.d}</div>}
              </div>
            </div>
          </button>
        ))}
      </div>
      {box && <Lightbox sh={box} lang={lang} wide={wide} onClose={()=>setBox(null)} />}
    </div>
  )
}

function Lightbox({ sh, lang, wide, onClose }) {
  const { sp, ind, url, caption, by } = sh
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(20,18,14,.93)', zIndex:100,
      display:'flex', alignItems:'center', justifyContent:'center', padding: wide?32:0 }}>
      <div onClick={e=>e.stopPropagation()} style={{ position:'relative', width:'100%', maxWidth:820,
        maxHeight:'92vh', borderRadius: wide?18:0, overflow:'hidden' }}>
        <div style={{ position:'relative', minHeight: wide?480:340, maxHeight:'92vh',
          display:'flex', alignItems:'center', justifyContent:'center',
          background: url?'#14160E':gradientFor(sp.id+(ind?.n||'')) }}>
          {url
            ? <img src={url} alt="" style={{ maxWidth:'100%', maxHeight:'92vh', objectFit:'contain', filter:LUT, display:'block' }} />
            : <span style={{ fontSize: wide?110:80, opacity:.9 }}>{sp.e}</span>}
          <button onClick={onClose} style={{ position:'absolute', top:14, right:14, width:34, height:34,
            borderRadius:'50%', background:'rgba(0,0,0,.45)', color:'#fff', fontSize:16,
            display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          <div style={{ position:'absolute', top:14, left:16 }}>
            <div style={{ fontSize:10.5, color:'rgba(242,238,226,.7)', textTransform:'uppercase', letterSpacing:'1px' }}>{nameOf(sp,lang).main}</div>
            {ind && <div className="serif" style={{ fontSize: wide?26:21, fontWeight:900, color:'#F2EEE2', lineHeight:1.05 }}>{ind.n}</div>}
          </div>
          <div style={{ position:'absolute', left:0, right:0, bottom:0,
            background:'linear-gradient(to top, rgba(14,16,10,.92), rgba(14,16,10,.55) 58%, transparent)',
            padding: wide?'40px 22px 20px':'30px 16px 16px' }}>
            {(caption || ind?.story) && (
              <div className="serif" style={{ fontSize: wide?15:13.5, color:'#F2EEE2', lineHeight:1.65, fontStyle:'italic', marginBottom:8 }}>
                « {caption || ind.story} »
              </div>
            )}
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:11, color:'rgba(242,238,226,.72)' }}>
              {(by || ind?.by) && <span>📷 {by || ind.by}</span>}
              {ind?.d && <span>📅 {ind.d}</span>}
              {ind?.time && <span>🕐 {ind.time}</span>}
              {ind?.weather && <span>🌤 {ind.weather}</span>}
              {ind?.gps && <span>📍 {ind.gps[0].toFixed(4)}°N {ind.gps[1].toFixed(4)}°E</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════ PAR OBSERVATEUR ══════════
export function ByPerson({ wide, lang, onSelectSpecies }) {
  const t = UI[lang]
  const [who, setWho] = useState(() => allPlayers()[0]?.name || '')
  const SPECIES = allSpecies(); const ALL_PLAYERS = allPlayers()
  const mySpecies = SPECIES.filter(s=>(s.obs[who]||[]).length)
  const myInds = []
  SPECIES.forEach(sp => (sp.inds||[]).forEach(ind => { if (ind.by===who) myInds.push({sp,ind}) }))

  return (
    <div style={{ padding: wide?'14px 24px 30px':'12px 18px 26px' }}>
      <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:16 }}>
        {ALL_PLAYERS.map(p=>{
          const on = who===p.name
          const n = SPECIES.filter(s=>(s.obs[p.name]||[]).length).length
          return (
            <button key={p.id} onClick={()=>setWho(p.name)} style={{ display:'flex', alignItems:'center', gap:8,
              padding:'8px 14px', borderRadius:20, border:`1px solid ${on?T.clay:T.line}`,
              background:on?T.clay:'transparent' }}>
              <span className="serif" style={{ width:26, height:26, borderRadius:'50%',
                background:on?'rgba(255,255,255,.22)':T.sage, color:'#fff', display:'flex',
                alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700 }}>{p.id}</span>
              <span className="serif" style={{ fontSize:14, fontWeight:on?900:600, color:on?'#fff':T.ink }}>{p.name}</span>
              <span style={{ fontSize:10.5, color:on?'rgba(255,255,255,.75)':T.mute }}>{n}</span>
            </button>
          )
        })}
      </div>

      {mySpecies.length===0
        ? <div style={{ fontSize:13, color:T.mute }}>{who} {t.nothingAdded}</div>
        : <>
          <div style={{ fontSize:10.5, fontWeight:600, color:T.mute, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:9 }}>
            {mySpecies.length} {lang==='ru'?'видов':'espèces'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:`repeat(auto-fill,minmax(${wide?150:130}px,1fr))`, gap:9, marginBottom:20 }}>
            {mySpecies.map(sp=>{
              const nm = nameOf(sp,lang)
              return (
                <button key={sp.id} onClick={()=>onSelectSpecies(sp.id)} style={{ textAlign:'left', borderRadius:12,
                  overflow:'hidden', border:`1px solid ${T.line}`, padding:0, position:'relative', minHeight:86 }}>
                  <CoverBg sp={sp} fallback={gradientFor(sp.id)} />
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(16,18,12,.72), transparent 58%)' }} />
                  <div style={{ position:'relative', minHeight:86, display:'flex', flexDirection:'column', justifyContent:'space-between', padding:9 }}>
                    <span style={{ fontSize:19 }}>{sp.e}</span>
                    <div>
                      <div className="serif" style={{ fontSize:12, fontWeight:700, color:'#F2EEE2', lineHeight:1.1 }}>{nm.main}</div>
                      {nm.sub && <div style={{ fontSize:8.5, color:'rgba(242,238,226,.5)' }}>{nm.sub}</div>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          {myInds.length>0 && <>
            <div style={{ fontSize:10.5, fontWeight:600, color:T.mute, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:9 }}>
              {myInds.length} {lang==='ru'?'особей':'individus'}
            </div>
            <div style={{ display:'grid', gridTemplateColumns: wide?'1fr 1fr':'1fr', gap:8 }}>
              {myInds.map(({sp,ind},i)=>(
                <button key={i} onClick={()=>onSelectSpecies(sp.id)} style={{ textAlign:'left', background:T.card,
                  border:`1px solid ${T.line}`, borderRadius:11, padding:'10px 12px', display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ fontSize:20 }}>{sp.e}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="serif" style={{ fontSize:13, fontWeight:700, color:T.ink }}>{ind.n}</div>
                    <div style={{ fontSize:10.5, color:T.mute }}>{nameOf(sp,lang).main} · {ind.d}</div>
                    {ind.story && <div style={{ fontSize:11, color:T.soft, marginTop:4, lineHeight:1.45,
                      display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{ind.story}</div>}
                  </div>
                </button>
              ))}
            </div>
          </>}
        </>}
    </div>
  )
}
