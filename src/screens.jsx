import { useState, useEffect } from 'react'
import { THEMES, MONTHS, MONTHS_RU, EVENTS, DEFAULT_TYPES, CENTER } from './territory.js'
import SatMap from './satmap.jsx'
import { isObserved, obsStateLabel } from './data'
import { gradientFor } from './gradients.js'
import { UI, nameOf, catNameOf } from './i18n.js'
import { LUT, thumbZoomStyle } from './photoui.jsx'
import { allPhotos, allSpecies, allPlayers, allCats, subscribe, namedOf, parseFrDateTime } from './store.js'
import { getTodos, saveTodo, deleteTodo, getPins, savePin, deletePin,
         getZones, saveZone, deleteZone, getPinTypes, savePinType,
         getThemes, saveTheme, getCalEvents, saveCalEvent } from './cloud.js'
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

const SEASON_OF = (i) => i===11||i<=1 ? { c:'#5B6B7E' } : i<=4 ? { c:'#7A8B5C' } : i<=7 ? { c:'#C08A3E' } : { c:'#B5602F' }

// ══════════ CALENDRIER + TO-DO ══════════
export function Calendar({ wide, lang, onBack, edit }) {
  const t = UI[lang]
  const [theme, setTheme] = useState('all')
  const [month, setMonth] = useState(new Date().getMonth())
  const [tab, setTab] = useState('cal')
  const months = lang==='ru' ? MONTHS_RU : MONTHS
  const todayMonth = new Date().getMonth()

  // thèmes & évènements — base statique + ajouts/modifications partagés
  const [customThemes, setCustomThemes] = useState([])
  const [evOverrides, setEvOverrides] = useState([])
  const [themeEditor, setThemeEditor] = useState(null)   // {} nouveau
  const [eventEditor, setEventEditor] = useState(null)   // {initial} nouveau ou existant
  const reloadCal = async () => {
    try { const [th, ev] = await Promise.all([getThemes(), getCalEvents()]); setCustomThemes(th); setEvOverrides(ev) } catch(e){}
  }
  useEffect(()=>{ reloadCal() },[])
  const allThemes = { ...THEMES, ...Object.fromEntries(customThemes.map(x=>[x.id,x])) }
  const allEvents = (() => {
    const map = new Map(EVENTS.map(e=>[e.id,e]))
    evOverrides.forEach(o => map.set(o.id, o))
    return [...map.values()]
  })()
  const list = allEvents.filter(e => (theme==='all'||e.t===theme) && e.m.includes(month))

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
        {lang==='ru'?'Что делать и что наблюдать в течение года':'Ce qu’il y a à faire et à observer au fil de l’année'}
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
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${wide?6:3},1fr)`, gap:7, marginBottom:16 }}>
          {months.map((m,i)=>{
            const s = SEASON_OF(i)
            const cnt = allEvents.filter(e=>(theme==='all'||e.t===theme)&&e.m.includes(i)).length
            const on = month===i
            return (
              <button key={m} onClick={()=>setMonth(i)} style={{ textAlign:'left', padding: wide?'12px 12px':'10px 10px',
                borderRadius:13, border:`2px solid ${on?T.clay:'transparent'}`,
                background: on ? T.clay : `${s.c}26`, transition:'background .12s, border-color .12s' }}>
                <div className="serif" style={{ fontSize: wide?15:13, fontWeight:800, color:on?'#fff':T.ink, lineHeight:1.1 }}>{m}</div>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:5 }}>
                  {i===todayMonth && <span style={{ width:6, height:6, borderRadius:'50%', background:on?'#fff':T.clay, flexShrink:0 }} />}
                  <span style={{ fontSize:10, fontWeight:600, color:on?'rgba(255,255,255,.85)':T.soft }}>
                    {cnt} {lang==='ru'?'событ.':'évén.'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:16, alignItems:'center' }}>
          <button onClick={()=>setTheme('all')} style={chip(theme==='all')}>{t.all}</button>
          {Object.entries(allThemes).map(([k,th])=>(
            <button key={k} onClick={()=>setTheme(k)} style={{ ...chip(theme===k),
              background:theme===k?th.c:'transparent', borderColor:theme===k?th.c:T.line, color:theme===k?'#fff':T.soft }}>
              {th.e} {lang==='ru'?th.ru:th.l}
            </button>
          ))}
          {edit && (
            <button onClick={()=>setThemeEditor({})} style={{ ...chip(false), display:'flex', alignItems:'center', gap:4,
              borderStyle:'dashed', color:T.clayDark }}>
              <i className="ti ti-plus" style={{ fontSize:13 }} aria-hidden="true" />
              {lang==='ru'?'Тема':'Thème'}
            </button>
          )}
        </div>
        {theme==='chasse' && (
          <div style={{ background:'#F0E4CF', border:'1px solid #DCC79E', borderRadius:11, padding:'9px 12px',
            fontSize:11.5, color:'#6B5330', marginBottom:12, display:'flex', alignItems:'flex-start', gap:8, lineHeight:1.5 }}>
            <i className="ti ti-alert-triangle" style={{ fontSize:15, flexShrink:0, marginTop:1 }} aria-hidden="true" />
            <span>{lang==='ru'
              ? 'Даты ориентировочные — перед выходом на охоту всегда проверяйте актуальные правила (VMD, Medību noteikumi).'
              : 'Dates indicatives — vérifie toujours les règles en vigueur avant une sortie (Service forestier d’État VMD, Medību noteikumi).'}</span>
          </div>
        )}
        {edit && (
          <button onClick={()=>setEventEditor({ initial:{ t: theme==='all'?Object.keys(allThemes)[0]:theme, m:[month] } })}
            className="serif" style={{ width:'100%', padding:'10px', borderRadius:12, border:`1px dashed ${T.clay}`,
            background:'transparent', color:T.clayDark, fontSize:12.5, fontWeight:600, marginBottom:12,
            display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <i className="ti ti-plus" style={{ fontSize:15 }} aria-hidden="true" />
            {lang==='ru'?'Добавить строку':'Ajouter une ligne'}
          </button>
        )}
        {list.length===0
          ? <div style={{ fontSize:13, color:T.mute, padding:'20px 0' }}>{t.nothingPlanned}</div>
          : <div style={{ display:'grid', gridTemplateColumns: wide?'1fr 1fr':'1fr', gap:9 }}>
              {list.map((e,i)=>{
                const th = allThemes[e.t]
                return (
                  <div key={e.id||i} style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden', display:'flex', position:'relative' }}>
                    <div style={{ width:5, background:th.c, flexShrink:0 }} />
                    <div style={{ padding:'11px 13px', flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                        <span style={{ fontSize:14 }}>{th.e}</span>
                        <span style={{ fontSize:10, color:th.c, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px' }}>{lang==='ru'?th.ru:th.l}</span>
                        <span style={{ marginLeft:'auto', fontSize:10, color:T.mute }}>{e.m.map(mi=>months[mi].slice(0,4)).join(' · ')}</span>
                      </div>
                      <div className="serif" style={{ fontSize:14, fontWeight:700, color:T.ink, marginBottom:3 }}>{e.l}</div>
                      <div style={{ fontSize:11.5, color:T.soft, lineHeight:1.5 }}>{e.d}</div>
                    </div>
                    {edit && (
                      <button onClick={()=>setEventEditor({ initial:e })} style={{ position:'absolute', top:7, right:7,
                        width:24, height:24, borderRadius:'50%', background:'rgba(43,38,32,.12)', color:T.clayDark,
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <i className="ti ti-pencil" style={{ fontSize:12 }} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>}
        {themeEditor && <ThemeEditor lang={lang} onClose={()=>setThemeEditor(null)}
          onSaved={()=>{ setThemeEditor(null); reloadCal() }} />}
        {eventEditor && <EventEditor lang={lang} months={months} allThemes={allThemes} initial={eventEditor.initial}
          onClose={()=>setEventEditor(null)} onSaved={()=>{ setEventEditor(null); reloadCal() }} />}
      </> : <>
        <div style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:14, padding:13, marginBottom:14 }}>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}
              placeholder={lang==='ru'?'Что нужно сделать?':'Qu’y a-t-il à faire ?'}
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
                const th = allThemes[x.theme] || THEMES.agri
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

// ══════════ Thème du calendrier — édition ══════════
const THEME_EMOJIS = ['🌾','🔨','🪓','🦌','🎯','🔭','🧺','🍄','🌸','🌱','🐟','🔥','🏠','⛺','🧊','🐝','🍂','☀️']
function ThemeEditor({ lang, onClose, onSaved }) {
  const [l, setL] = useState('')
  const [ru, setRu] = useState('')
  const [e, setE] = useState('🌾')
  const [c, setC] = useState('#8B9B6E')
  const [busy, setBusy] = useState(false)
  const colors = ['#8B9B6E','#B5602F','#7A5A3A','#4A5D32','#6B2E2E','#5B6B7E','#C08A3E','#9A7B4F','#A9799A','#6E8A6A','#5B7E8E','#8A7B62']
  const save = async () => {
    if (!l.trim()) return
    setBusy(true)
    const id = 'th_' + Date.now().toString(36)
    await saveTheme({ id, l:l.trim(), ru:ru.trim()||l.trim(), e, c })
    setBusy(false); onSaved?.()
  }
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.62)', zIndex:150,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={ev=>ev.stopPropagation()} style={{ background:T.bg, borderRadius:18, padding:22,
        width:'100%', maxWidth:420, border:`1px solid ${T.line}` }}>
        <div className="serif" style={{ fontSize:18, fontWeight:900, color:T.ink, marginBottom:14 }}>
          {lang==='ru'?'Новая тема':'Nouveau thème'}
        </div>
        <label style={{ fontSize:11, color:T.mute, display:'block', marginBottom:5 }}>{lang==='ru'?'Значок':'Emoji'}</label>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:12 }}>
          {THEME_EMOJIS.map(x=>(
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
        <label style={{ fontSize:11, color:T.mute, display:'block', marginBottom:5 }}>{lang==='ru'?'Название':'Nom du thème'}</label>
        <input value={l} onChange={ev=>setL(ev.target.value)} autoFocus
          placeholder={lang==='ru'?'Например: Рыбалка':'Ex. Pêche, Apiculture…'}
          style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${T.line}`,
            background:T.card, fontSize:13.5, color:T.ink, marginBottom:11 }} />
        <label style={{ fontSize:11, color:T.mute, display:'block', marginBottom:5 }}>Название (RU)</label>
        <input value={ru} onChange={ev=>setRu(ev.target.value)}
          placeholder="Рыбалка"
          style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${T.line}`,
            background:T.card, fontSize:13.5, color:T.ink, marginBottom:14 }} />
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:10,
            border:`1px solid ${T.line}`, color:T.soft, fontSize:13 }}>{lang==='ru'?'Отмена':'Annuler'}</button>
          <button onClick={save} disabled={busy||!l.trim()}
            className="serif" style={{ flex:1.3, padding:'10px', borderRadius:10, background:T.clay,
              color:'#fff', fontSize:13.5, fontWeight:700 }}>{lang==='ru'?'Создать':'Créer'}</button>
        </div>
      </div>
    </div>
  )
}

// ══════════ Ligne du calendrier — ajout / édition ══════════
function EventEditor({ lang, months, allThemes, initial, onClose, onSaved }) {
  const [th, setTh] = useState(initial?.t || Object.keys(allThemes)[0])
  const [ms, setMs] = useState(initial?.m || [])
  const [l, setL] = useState(initial?.l || '')
  const [d, setD] = useState(initial?.d || '')
  const [busy, setBusy] = useState(false)
  const toggleMonth = (i) => setMs(v => v.includes(i) ? v.filter(x=>x!==i) : [...v, i].sort((a,b)=>a-b))
  const save = async () => {
    if (!l.trim() || !ms.length) return
    setBusy(true)
    const id = initial?.id || ('ce_' + Date.now().toString(36))
    await saveCalEvent({ id, t:th, m:ms, l:l.trim(), d:d.trim() })
    setBusy(false); onSaved?.()
  }
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.62)', zIndex:150,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={ev=>ev.stopPropagation()} style={{ background:T.bg, borderRadius:18, width:'100%',
        maxWidth:460, maxHeight:'88vh', overflow:'auto', border:`1px solid ${T.line}` }}>
        <div style={{ padding:'20px 22px 0' }}>
          <div className="serif" style={{ fontSize:18, fontWeight:900, color:T.ink }}>
            {initial?.id ? (lang==='ru'?'Изменить строку':'Modifier la ligne') : (lang==='ru'?'Новая строка':'Nouvelle ligne')}
          </div>
        </div>
        <div style={{ padding:'14px 22px 0' }}>
          <label style={{ fontSize:11, color:T.mute, display:'block', marginBottom:5 }}>{lang==='ru'?'Тема':'Thème'}</label>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:14 }}>
            {Object.entries(allThemes).map(([k,tv])=>(
              <button key={k} onClick={()=>setTh(k)} style={{ fontSize:11.5, padding:'6px 11px', borderRadius:14,
                border:`1px solid ${th===k?tv.c:T.line}`, background:th===k?tv.c:'transparent',
                color:th===k?'#fff':T.soft }}>{tv.e} {lang==='ru'?tv.ru:tv.l}</button>
            ))}
          </div>
          <label style={{ fontSize:11, color:T.mute, display:'block', marginBottom:5 }}>{lang==='ru'?'Месяцы':'Mois concernés'}</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5, marginBottom:14 }}>
            {months.map((m,i)=>{
              const on = ms.includes(i)
              return (
                <button key={m} onClick={()=>toggleMonth(i)} style={{ fontSize:11, padding:'7px 4px', borderRadius:9,
                  border:`1px solid ${on?T.clay:T.line}`, background:on?T.clay:'transparent',
                  color:on?'#fff':T.soft, fontWeight:on?700:400 }}>{m.slice(0,4)}</button>
              )
            })}
          </div>
          <label style={{ fontSize:11, color:T.mute, display:'block', marginBottom:5 }}>{lang==='ru'?'Название':'Titre'}</label>
          <input value={l} onChange={ev=>setL(ev.target.value)} autoFocus
            placeholder={lang==='ru'?'Например: Сбор мёда':'Ex. Récolte du miel'}
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${T.line}`,
              background:T.card, fontSize:13.5, color:T.ink, marginBottom:11 }} />
          <label style={{ fontSize:11, color:T.mute, display:'block', marginBottom:5 }}>{lang==='ru'?'Описание':'Description'}</label>
          <textarea value={d} onChange={ev=>setD(ev.target.value)} rows={3}
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${T.line}`,
              background:T.card, fontSize:12.5, color:T.ink, marginBottom:14, resize:'vertical' }} />
        </div>
        <div style={{ position:'sticky', bottom:0, background:T.bg, borderTop:`1px solid ${T.line}`,
          padding:'12px 22px', display:'flex', gap:9 }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:12,
            border:`1px solid ${T.line}`, color:T.soft, fontSize:13 }}>{lang==='ru'?'Отмена':'Annuler'}</button>
          <button onClick={save} disabled={busy||!l.trim()||!ms.length}
            className="serif" style={{ flex:1.6, padding:'11px', borderRadius:12,
              background: (busy||!l.trim()||!ms.length)?'#DDD3BE':T.clay, color:(busy||!l.trim()||!ms.length)?T.mute:'#fff',
              fontSize:14, fontWeight:700 }}>{lang==='ru'?'Сохранить':'Enregistrer'}</button>
        </div>
      </div>
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
        // une photo dont l'individu n'existe plus (observation supprimée) ne
        // doit jamais apparaître — la suppression est censée l'avoir déjà
        // effacée elle aussi, mais on ne l'affiche jamais dans le doute
        if (kind === 'ind' && !ind) return
        const nm = ind ? namedOf(sp.id, ind.n) : null
        items.push({ sp, ind, url: p.url, thumbUrl: p.thumbUrl, pos: p.pos, zoom: p.zoom, caption: p.caption, by: p.by || ind?.by,
          named: !!nm, displayName: nm?.name || null })
      })
      SPECIES.filter(isObserved).forEach(sp => (sp.inds || []).forEach(ind => {
        if (!items.some(it => it.ind?.n === ind.n && it.sp.id === sp.id)) {
          const nm = namedOf(sp.id, ind.n)
          items.push({ sp, ind, url: null, named: !!nm, displayName: nm?.name || null })
        }
      }))
      // les individus reconnus (familiers) d'abord, puis du plus récent au plus ancien
      items.sort((a, b) => (b.named - a.named) || (parseFrDateTime(b.ind?.d, b.ind?.time) - parseFrDateTime(a.ind?.d, a.ind?.time)))
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
        {shots.map((sh,i)=>{
          const unc = !!sh.ind?.uncertain
          return (
          <button key={i} onClick={()=>setBox(sh)} style={{ textAlign:'left', borderRadius:14,
            overflow:'hidden', padding:0, position:'relative', aspectRatio:'4/5',
            border: unc?'2px solid #D68C34':sh.named?'2px solid #C9A046':`1px solid ${T.line}`,
            boxShadow: unc?'0 0 0 1px rgba(214,140,52,.3), 0 3px 12px rgba(214,140,52,.22)'
              :sh.named?'0 0 0 1px rgba(201,160,70,.28), 0 3px 12px rgba(201,160,70,.22)':'none' }}>
            {sh.url
              ? <img src={sh.thumbUrl||sh.url} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
                  objectPosition:sh.pos||'50% 50%', filter:LUT, ...thumbZoomStyle(sh) }} />
              : <div style={{ position:'absolute', inset:0, background:gradientFor(sh.sp.id+(sh.ind?.n||'')) }} />}
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(16,18,12,.78), transparent 55%)' }} />
            {unc && <span style={{ position:'absolute', top:8, left:8, background:'#D68C34',
              color:'#fff', borderRadius:8, padding:'2px 7px', fontSize:8, fontWeight:800,
              letterSpacing:'.4px', zIndex:2 }}>? {lang==='ru'?'ПРОВЕРИТЬ':'À CONFIRMER'}</span>}
            {!unc && sh.named && <span style={{ position:'absolute', top:8, left:8, background:'#C9A046',
              color:'#2B2620', borderRadius:8, padding:'2px 7px', fontSize:8, fontWeight:800,
              letterSpacing:'.4px', zIndex:2 }}>★ {lang==='ru'?'ЗНАКОМЫЙ':'FAMILIER'}</span>}
            <div style={{ position:'relative', height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:11 }}>
              <span style={{ fontSize:22 }}>{sh.sp.e}</span>
              <div>
                <div className="serif" style={{ fontSize:13.5, fontWeight:700, lineHeight:1.1,
                  color: unc?'#E8A855':sh.named?'#E3B94D':'#F2EEE2' }}>{sh.named ? sh.displayName : nameOf(sh.sp,lang).main}</div>
                {sh.ind?.d && <div style={{ fontSize:9.5, color:'rgba(242,238,226,.7)', marginTop:2 }}>{sh.ind.d}</div>}
              </div>
            </div>
          </button>
        )})}
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
  // par défaut, on ouvre sur la personne qui a fait la toute dernière observation
  // (tous individus confondus), plutôt que sur le premier joueur de la liste
  const [who, setWho] = useState(() => {
    let best = null, bestT = -Infinity
    allSpecies().forEach(sp => (sp.inds||[]).forEach(ind => {
      const ts = parseFrDateTime(ind.d, ind.time)
      if (ts > bestT) { bestT = ts; best = ind.by }
    }))
    return best || allPlayers()[0]?.name || ''
  })
  const [openCats, setOpenCats] = useState(() => new Set())
  const [openSp, setOpenSp] = useState(() => new Set())
  const SPECIES = allSpecies(); const ALL_PLAYERS = allPlayers(); const CATS = allCats()
  const mySpecies = SPECIES.filter(s=>(s.obs[who]||[]).length)
  const myInds = []
  SPECIES.forEach(sp => (sp.inds||[]).forEach(ind => { if (ind.by===who) myInds.push({sp,ind}) }))
  // repliée par dossier : ordre (règne) > espèce > individus
  const byCat = {}
  myInds.forEach(({sp,ind}) => {
    (byCat[sp.cat] ||= { cat: CATS.find(c=>c.id===sp.cat), bySpecies: {} })
    const bucket = byCat[sp.cat].bySpecies[sp.id] ||= { sp, inds: [] }
    bucket.inds.push(ind)
  })
  const catGroups = CATS.map(c => byCat[c.id]).filter(Boolean)
  const toggleCat = (id) => setOpenCats(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSp = (id) => setOpenSp(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

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

      <div style={{ background:'#F0E4CF', border:'1px solid #DCC79E', borderRadius:12, padding:'11px 14px',
        marginBottom:18, display:'flex', alignItems:'flex-start', gap:9 }}>
        <i className="ti ti-camera" style={{ fontSize:16, color:'#8F6A2E', flexShrink:0, marginTop:1 }} aria-hidden="true" />
        <div style={{ fontSize:11.5, color:'#6B5330', lineHeight:1.55 }}>
          {lang==='ru'
            ? 'Каждое наблюдение должно сопровождаться фото — даже нечётким. Это единственное доказательство встречи. Цель проекта — собрать как можно более качественную фотоколлекцию, а не просто накопить очки.'
            : 'Chaque observation doit être accompagnée d’une photo — même floue. C’est la seule preuve de la rencontre. Le but n’est pas d’accumuler des points, mais de construire la meilleure collection de photos possible.'}
        </div>
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
              // individus de CETTE personne pour cette espèce : liseré orange si un
              // doute traîne dessus, badges ronds pour chaque état bonus déjà croisé
              // (bébé/maman/papa/vieux/malade/gîte) — un coup d'œil, pas le détail
              const spInds = (sp.inds||[]).filter(ind=>ind.by===who)
              const unc = spInds.some(ind=>ind.uncertain)
              const states = [...new Set(spInds.map(ind=>ind.state).filter(Boolean))]
              return (
                <button key={sp.id} onClick={()=>onSelectSpecies(sp.id)} style={{ textAlign:'left', borderRadius:12,
                  overflow:'hidden', padding:0, position:'relative', minHeight:86,
                  border: unc?'2px solid #D68C34':`1px solid ${T.line}`,
                  boxShadow: unc?'0 0 0 1px rgba(214,140,52,.3), 0 3px 12px rgba(214,140,52,.22)':'none' }}>
                  <CoverBg sp={sp} fallback={gradientFor(sp.id)} />
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(16,18,12,.72), transparent 58%)' }} />
                  {states.length>0 && (
                    <div style={{ position:'absolute', top:6, right:6, display:'flex', gap:3, zIndex:2 }}>
                      {states.map(k=>{
                        const st = obsStateLabel(k, sp)
                        return <span key={k} title={lang==='ru'?st.ru:st.l} style={{ width:17, height:17, borderRadius:'50%',
                          background:'rgba(20,22,14,.75)', border:'1px solid rgba(242,238,226,.35)',
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:9.5 }}>{st.e}</span>
                      })}
                    </div>
                  )}
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
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {catGroups.map(({ cat, bySpecies }) => {
                const catOpen = openCats.has(cat.id)
                const spEntries = Object.values(bySpecies)
                const catCount = spEntries.reduce((n,b)=>n+b.inds.length,0)
                const cn = catNameOf(cat, lang)
                return (
                  <div key={cat.id} style={{ border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden', background:T.card }}>
                    <button onClick={()=>toggleCat(cat.id)} style={{ width:'100%', display:'flex', alignItems:'center', gap:9,
                      padding:'11px 13px', textAlign:'left' }}>
                      <i className={`ti ${catOpen?'ti-chevron-down':'ti-chevron-right'}`} style={{ fontSize:14, color:T.mute, flexShrink:0 }} aria-hidden="true" />
                      <span style={{ fontSize:17 }}>{cat.e}</span>
                      <span className="serif" style={{ fontSize:13.5, fontWeight:700, color:T.ink, flex:1 }}>{cn.main}</span>
                      <span style={{ fontSize:11, color:T.mute }}>{catCount}</span>
                    </button>
                    {catOpen && (
                      <div style={{ borderTop:`1px solid ${T.line}`, padding:'6px 8px 8px' }}>
                        {spEntries.map(({ sp, inds }) => {
                          const spOpen = openSp.has(sp.id)
                          const nm = nameOf(sp, lang)
                          return (
                            <div key={sp.id} style={{ marginTop:4 }}>
                              <button onClick={()=>toggleSp(sp.id)} style={{ width:'100%', display:'flex', alignItems:'center', gap:8,
                                padding:'8px 9px', borderRadius:9, textAlign:'left', background: spOpen?'rgba(0,0,0,.03)':'transparent' }}>
                                <i className={`ti ${spOpen?'ti-chevron-down':'ti-chevron-right'}`} style={{ fontSize:12, color:T.mute, flexShrink:0 }} aria-hidden="true" />
                                <span style={{ fontSize:15 }}>{sp.e}</span>
                                <span style={{ fontSize:12.5, fontWeight:600, color:T.ink, flex:1 }}>{nm.main}</span>
                                <span style={{ fontSize:10.5, color:T.mute }}>{inds.length}</span>
                              </button>
                              {spOpen && (
                                <div style={{ display:'grid', gridTemplateColumns: wide?'1fr 1fr':'1fr', gap:7, padding:'6px 4px 4px 26px' }}>
                                  {inds.map((ind,i)=>{
                                    const ov = namedOf(sp.id, ind.n)
                                    const named = !!ov
                                    const unc = !!ind.uncertain
                                    const displayName = named ? ov.name : ind.n
                                    return (
                                      <button key={i} onClick={()=>onSelectSpecies(sp.id)} style={{ textAlign:'left', background:T.bg,
                                        border: unc?'1.5px solid #D68C34':named?'1.5px solid #C9A046':`1px solid ${T.line}`,
                                        boxShadow: unc?'0 0 0 1px rgba(214,140,52,.25)':named?'0 0 0 1px rgba(201,160,70,.22)':'none',
                                        borderRadius:10, padding:'9px 11px', display:'flex', gap:8, alignItems:'flex-start' }}>
                                        <div style={{ flex:1, minWidth:0 }}>
                                          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                                            <div className="serif" style={{ fontSize:12.5, fontWeight:700,
                                              color: unc?'#B5701A':named?'#A07C28':T.ink }}>{displayName}</div>
                                            {unc && <span style={{ fontSize:8, fontWeight:800, color:'#fff', background:'#D68C34',
                                              borderRadius:6, padding:'1.5px 6px', letterSpacing:'.3px' }}>{lang==='ru'?'ПРОВЕРИТЬ':'DOUTE'}</span>}
                                            {!unc && named && <span style={{ fontSize:8, fontWeight:800, color:'#2B2620', background:'#C9A046',
                                              borderRadius:6, padding:'1.5px 6px', letterSpacing:'.3px' }}>★ {lang==='ru'?'ЗНАКОМЫЙ':'FAMILIER'}</span>}
                                          </div>
                                          <div style={{ fontSize:10, color:T.mute, marginTop:2 }}>{ind.d}</div>
                                          {ind.story && <div style={{ fontSize:10.5, color:T.soft, marginTop:4, lineHeight:1.4,
                                            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{ind.story}</div>}
                                        </div>
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>}
        </>}
    </div>
  )
}
