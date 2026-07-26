import { useState, useEffect, useRef } from 'react'
import { SPECIES as _BASE, CATS as _BASECATS, RARITY, METHODS, SIZE_MULT, ACHIEVEMENTS, calcPts, totalPts, speciesPts, badgePts, isObserved } from './data'
import MindMap from './mindmap.jsx'
import SatMap from './satmap.jsx'
import { gradientFor, gradientForCat } from './gradients.js'
import { UI, nameOf, catNameOf } from './i18n.js'
import { Calendar, Territory, Gallery, ByPerson } from './screens.jsx'
import Experience from './experience.jsx'
import { PhotoManager, PhotoBg, PhotoHero, PhotoHeroSpecies, usePhotos, LUT } from './photoui.jsx'
import { loadAll, subscribe, allSpecies, allPlayers, allCats, splitInds, promote, demote,
         namedOf, getMe, setMe, isReady, totalPtsLive, speciesPtsLive, badgePtsLive, calcPtsLive,
         removeSighting } from './store.js'
import { IdentityPicker, SpeciesEditor, SightingEditor, ConfirmDialog } from './editui.jsx'

const T = {
  bg:'#EDE7D8', surface:'#E3DAC5', card:'#E6DDC8',
  ink:'#2B2620', soft:'#6B6357', mute:'#9A9081',
  line:'#D3C7AE', lineSoft:'#DAD0BA',
  clay:'#B5602F', clayDark:'#8F4A22', sage:'#7A8B5C', sageDark:'#4A5D32',
  leaf:'#C8DBA4',
}

function BobberIcon({ size = 20, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      <ellipse cx="12" cy="20.5" rx="7.5" ry="1.4" fill="none" stroke="#7A8B5C" strokeOpacity="0.4" strokeWidth="1.2"/>
      <line x1="12" y1="2.5" x2="12" y2="7" stroke="#2B2620" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="12" cy="2.3" r="1.2" fill="#B5602F"/>
      <path d="M6.5 13.5 A5.5 6.5 0 0 1 17.5 13.5 Z" fill="#B5602F"/>
      <path d="M6.5 13.5 A5.5 6.5 0 0 0 17.5 13.5 Z" fill="#F2EEE2" stroke="#B5602F" strokeWidth="0.5"/>
    </svg>
  )
}

function useWide() {
  const [wide, setWide] = useState(typeof window !== 'undefined' ? window.innerWidth >= 900 : true)
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= 900)
    window.addEventListener('resize', on); return () => window.removeEventListener('resize', on)
  }, [])
  return wide
}

// ── Installation sur l'écran d'accueil (PWA) : capte l'invite native quand le navigateur la propose ──
function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(() => {
    try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true } catch { return false }
  })
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e) }
    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])
  const install = async () => {
    if (!deferredPrompt) return false
    try {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
      return true
    } catch {
      return false
    }
  }
  return { deferredPrompt, installed, install }
}

// ══════════════════ CHOIX DE LANGUE ══════════════════
function LangPicker({ onPick }) {
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(155deg,#22301C 0%,#3E5233 45%,#6E8557 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ marginBottom:14 }}><BobberIcon size={48} /></div>
      <div className="serif" style={{ fontSize:34, fontWeight:900, color:'#F2EEE2', letterSpacing:'-1px', marginBottom:6 }}>Pludini</div>
      <div style={{ fontSize:13, color:'rgba(237,231,216,.7)', marginBottom:30 }}>Vidzeme · Latvija</div>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
        {[['fr','Français','Continuer en français'],['ru','Русский','Продолжить по-русски']].map(([code,label,sub])=>(
          <button key={code} onClick={()=>onPick(code)} style={{ background:'rgba(242,238,226,.1)',
            border:'1px solid rgba(242,238,226,.3)', borderRadius:16, padding:'18px 28px', minWidth:180,
            display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <span className="serif" style={{ fontSize:20, fontWeight:700, color:'#F2EEE2' }}>{label}</span>
            <span style={{ fontSize:11.5, color:'rgba(242,238,226,.65)' }}>{sub}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Vignette de menu : couleur unie, la photo apparaît au survol (miniature de la page ciblée) ──
function NavCard({ c, wide, edit, onOpen, onEditPhoto }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onOpen} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ textAlign:'left', borderRadius:14, overflow:'hidden', border:'none', padding:0,
        position:'relative', minHeight: wide?148:104 }}>
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(145deg,#39432E 0%,#5C6B48 100%)' }} />
      <div style={{ position:'absolute', inset:0, opacity: hover?1:0, transition:'opacity .3s' }}>
        <PhotoBg target={`site:card:${c.k}`} fallback="transparent" />
      </div>
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(18,20,14,.72), transparent 60%)' }} />
      {edit && (
        <button onClick={(e)=>{ e.stopPropagation(); onEditPhoto(c) }} style={{ position:'absolute', top:10, right:10, zIndex:6,
          background:'rgba(0,0,0,.5)', color:'#fff', borderRadius:14, padding:'6px 9px' }}>
          <i className="ti ti-camera-plus" style={{ fontSize:13 }} aria-hidden="true" />
        </button>
      )}
      <div style={{ position:'relative', height:'100%', minHeight: wide?148:104, display:'flex', flexDirection:'column',
        justifyContent:'flex-end', padding: wide?'17px':'14px' }}>
        <span style={{ fontSize:10, letterSpacing:'1.4px', textTransform:'uppercase', color:'#C8DBA4', fontWeight:700, marginBottom:4 }}>{c.tag}</span>
        <span className="serif" style={{ fontSize: wide?22:18, fontWeight:900, color:'#F2EEE2', lineHeight:1.05, letterSpacing:'-.6px' }}>{c.title}</span>
        <span style={{ fontSize:11.5, color:'rgba(242,238,226,.76)', marginTop:4, lineHeight:1.4 }}>{c.sub}</span>
      </div>
    </button>
  )
}

// ══════════════════ LANDING ══════════════════
function Landing({ lang, setLang, go, onQuiz, edit, onEditHero, onEditCard }) {
  const wide = useWide()
  const SPECIES = allSpecies(), CATS = allCats(), PLAYERS = allPlayers().filter(p=>!p.demo)
  const t = UI[lang]
  const obs = SPECIES.filter(isObserved).length
  const { deferredPrompt, installed, install } = useInstallPrompt()
  const [installHint, setInstallHint] = useState(false)
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  const onInstallClick = async () => {
    if (deferredPrompt) { const did = await install(); if (!did) setInstallHint(true) }
    else setInstallHint(true)
  }
  const cards = [
    { k:'app',       tag:t.consult, title:t.pokedex,   sub: lang==='ru'?'Карта живого, матрица, очки и значки':'Map du vivant, matrice, scores et badges' },
    { k:'territory', tag:t.locate,  title:t.territory, sub: lang==='ru'?'Камеры, норы, грибные места, проекты':'Caméras, terriers, coins à champignons, projets' },
    { k:'calendar',  tag:t.plan,    title:t.calendar,  sub: lang==='ru'?'Работы и наблюдения по месяцам':'Travaux et observations mois par mois' },
    { k:'gallery',   tag:t.browse,  title:t.gallery,   sub: lang==='ru'?'Все снимки особей':'Tous les clichés d\'individus' },
    { k:'quiz',      tag:t.play,    title:t.quiz,      sub: lang==='ru'?'Карточки-угадайки из ваших наблюдений':'Des cartes à deviner, tirées de vos observations' },
  ]
  const heroH = wide ? 66 : 54
  const bleed = wide ? 80 : 60
  return (
    <div style={{ minHeight:'100vh', background:'#EDE7D8' }}>
      <div style={{ position:'relative', height:`calc(${heroH}dvh + ${bleed}px)`, minHeight:460, overflow:'hidden' }}>
        <PhotoBg target="site:hero" thumb={false} fallback="linear-gradient(155deg,#22301C 0%,#3E5233 42%,#6E8557 78%,#94A874 100%)" />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(16,20,12,.55) 0%, rgba(16,20,12,.12) 40%, rgba(16,20,12,.4) 75%, rgba(16,20,12,.58) 100%)' }} />
        {edit && (
          <button onClick={onEditHero} style={{ position:'absolute', top:64, right:20, zIndex:4,
            background:'rgba(0,0,0,.5)', color:'#fff', borderRadius:14, padding:'7px 13px',
            fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
            <i className="ti ti-camera-plus" style={{ fontSize:14 }} aria-hidden="true" />
            {lang==='ru'?'Фон':'Changer l\u2019image'}
          </button>
        )}
        <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:5, padding: wide?'20px 32px':'16px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button onClick={()=>go('experience')} style={{ display:'flex', alignItems:'center', gap:6, color:'#F2EEE2', fontSize: wide?14:13 }}>
            <i className="ti ti-arrow-left" aria-hidden="true" />Pludini Host
          </button>
          <div style={{ display:'flex', gap:5 }}>
            {['fr','ru'].map(c=>(
              <button key={c} onClick={()=>setLang(c)} style={{ fontSize:10.5, padding:'4px 9px', borderRadius:12,
                background: lang===c?'rgba(242,238,226,.9)':'rgba(242,238,226,.13)',
                color: lang===c?'#2B2620':'rgba(242,238,226,.8)', fontWeight:600,
                border:'1px solid rgba(242,238,226,.28)' }}>{c==='fr'?'FR':'RU'}</button>
            ))}
          </div>
        </div>
        <div style={{ position:'relative', height:`${heroH}dvh`, display:'flex', flexDirection:'column', alignItems:'center',
          justifyContent:'center', textAlign:'center', padding: wide?'0 40px':'0 22px' }}>
          <h1 className="serif" style={{ fontSize: wide?60:33, lineHeight:1.05, fontWeight:600, color:'#F2EEE2', letterSpacing:'-1.3px', marginBottom:16, whiteSpace:'pre-line' }}>
            {t.heroTitle}
          </h1>
          <p style={{ fontSize: wide?15:13, color:'rgba(237,231,216,.85)', maxWidth:520, lineHeight:1.65 }}>{t.heroSub}</p>
        </div>
      </div>

      <div style={{ position:'relative', marginTop:-bleed, borderRadius: wide?'32px 32px 0 0':'22px 22px 0 0',
        backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)', background:'rgba(237,231,216,.78)',
        padding: wide?'22px 40px 32px':'16px 18px 24px' }}>
        <div style={{ display:'flex', gap:20, marginBottom:16, flexWrap:'wrap', justifyContent:'center' }}>
          {[[SPECIES.length,t.species],[obs,t.observed],[CATS.length,t.reigns],[PLAYERS.length,t.observers]].map(([v,l])=>(
            <div key={l} style={{ textAlign:'center' }}>
              <div className="serif" style={{ fontSize: wide?26:20, fontWeight:900, color:'#2B2620', lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:11, color:'#9A9081', marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns: wide?'repeat(auto-fit,minmax(210px,1fr))':'1fr', gap:9 }}>
          {cards.map(c=>(
            <NavCard key={c.k} c={c} wide={wide} edit={edit}
              onOpen={()=> c.k==='quiz' ? onQuiz() : go(c.k)} onEditPhoto={onEditCard} />
          ))}
        </div>
      </div>

      <div style={{ padding: wide?'40px 40px 20px':'28px 22px 14px', textAlign:'center', maxWidth:640, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
          <div style={{ flex:1, height:1, background:'#D3C7AE' }} />
          <h2 className="serif" style={{ fontSize: wide?30:22, fontWeight:600, color:'#2B2620', whiteSpace:'nowrap' }}>
            {lang==='ru'?'Наша история':'Notre histoire'}
          </h2>
          <div style={{ flex:1, height:1, background:'#D3C7AE' }} />
        </div>
        <p style={{ fontSize: wide?14:13, lineHeight:1.8, color:'#6B6357' }}>
          {lang==='ru'
            ? 'Документировать всё живое вокруг нас, сезон за сезоном, чтобы научиться узнавать и беречь это. Четыре наблюдателя, общая коллекция, которую можно пополнять откуда угодно, и простое желание — не упустить ничего незамеченным.'
            : 'Documenter ce qui vit autour de nous, saison après saison, pour apprendre à le reconnaître et à le protéger. Quatre observateurs, une collection collaborative que chacun peut nourrir d’où il se trouve, et une envie simple : ne rien laisser filer sans le noter.'}
        </p>
      </div>

      <div style={{ position:'relative', height: wide?300:220, margin: wide?'26px 40px 60px':'20px 16px 44px',
        borderRadius:18, overflow:'hidden' }}>
        <PhotoBg target="site:contact" fallback="linear-gradient(150deg,#3E5233 0%,#7A8B5C 100%)" />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(16,20,12,.6), transparent 55%)' }} />
        {edit && (
          <button onClick={()=>onEditCard({ k:'contact', title:lang==='ru'?'Контакты':'Contact' })} style={{ position:'absolute', top:10, right:10, zIndex:6,
            background:'rgba(0,0,0,.5)', color:'#fff', borderRadius:14, padding:'6px 9px' }}>
            <i className="ti ti-camera-plus" style={{ fontSize:13 }} aria-hidden="true" />
          </button>
        )}
        <div style={{ position:'absolute', left: wide?24:16, right: wide?24:16, bottom: wide?24:16, borderRadius:16,
          backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', background:'rgba(237,231,216,.62)',
          padding: wide?'20px 24px':'16px 18px' }}>
          <div className="serif" style={{ fontSize: wide?17:15, fontWeight:800, color:'#2B2620', marginBottom:6 }}>
            {lang==='ru'?'Контакты':'Contact'}
          </div>
          <div style={{ fontSize:12.5, color:'#6B6357', lineHeight:1.7 }}>
            {lang==='ru'?'Email · Телефон · WhatsApp':'Email · Téléphone · WhatsApp'}<br />
            {lang==='ru'?'(скоро)':'(bientôt disponible)'}
          </div>
        </div>
      </div>

      {!installed && (
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', justifyContent:'space-between',
          margin: wide?'0 40px 40px':'0 16px 30px', padding: wide?'16px 22px':'14px 16px',
          borderRadius:16, border:'1px solid #D3C7AE', background:'#E6DDC8' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <i className="ti ti-device-mobile-plus" style={{ fontSize:20, color:'#B5602F' }} aria-hidden="true" />
            <div style={{ fontSize:12.5, color:'#6B6357', lineHeight:1.5 }}>
              {lang==='ru'?'Добавьте Pludini на главный экран телефона.':'Ajoute Pludini à l’écran d’accueil de ton téléphone.'}
            </div>
          </div>
          <button onClick={onInstallClick} className="serif" style={{ flexShrink:0, padding:'9px 16px', borderRadius:12,
            background:'#B5602F', color:'#fff', fontSize:12.5, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
            <i className="ti ti-download" style={{ fontSize:14 }} aria-hidden="true" />
            {lang==='ru'?'Установить':'Installer l’app'}
          </button>
        </div>
      )}
      {installHint && <InstallHint lang={lang} isIOS={isIOS} onClose={()=>setInstallHint(false)} />}
    </div>
  )
}

function InstallHint({ lang, isIOS, onClose }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.5)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:80, padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#EDE7D8', borderRadius:18, padding:22,
        width:'100%', maxWidth:360, border:'1px solid #D3C7AE' }}>
        <div className="serif" style={{ fontSize:17, fontWeight:900, color:'#2B2620', marginBottom:10 }}>
          {lang==='ru'?'Установить на главный экран':'Ajouter à l’écran d’accueil'}
        </div>
        {isIOS ? (
          <div style={{ fontSize:13, color:'#6B6357', lineHeight:1.7 }}>
            {lang==='ru'
              ? <>Нажмите <i className="ti ti-upload" style={{ fontSize:14 }} aria-hidden="true" /> «Поделиться» внизу экрана Safari, затем «На экран Домой».</>
              : <>Appuie sur <i className="ti ti-upload" style={{ fontSize:14 }} aria-hidden="true" /> « Partager » en bas de Safari, puis « Sur l’écran d’accueil ».</>}
          </div>
        ) : (
          <div style={{ fontSize:13, color:'#6B6357', lineHeight:1.7 }}>
            {lang==='ru'
              ? 'Откройте меню браузера (⋮) и выберите «Установить приложение» или «Добавить на главный экран».'
              : 'Ouvre le menu de ton navigateur (⋮) et choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ».'}
          </div>
        )}
        <button onClick={onClose} className="serif" style={{ marginTop:16, width:'100%', padding:'11px', borderRadius:12,
          background:'#B5602F', color:'#fff', fontSize:13.5, fontWeight:700 }}>
          {lang==='ru'?'Понятно':'Compris'}
        </button>
      </div>
    </div>
  )
}

function PwModal({ lang, pw, setPw, onSubmit, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.45)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:70, padding:20 }}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:18, padding:24,
        width:'100%', maxWidth:340, border:`1px solid ${T.line}` }}>
        <div className="serif" style={{ fontSize:19, fontWeight:900, color:T.ink, marginBottom:6 }}>
          {lang==='ru'?'Режим правки':'Mode édition'}
        </div>
        <div style={{ fontSize:12.5, color:T.soft, marginBottom:14 }}>
          {lang==='ru'?'Введите пароль.':'Entre le mot de passe pour modifier le Pokédex.'}
        </div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&onSubmit()} placeholder={lang==='ru'?'Пароль':'Mot de passe'} autoFocus
          style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${T.line}`,
            background:T.card, fontSize:13, marginBottom:12, color:T.ink }} />
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:'9px',
            borderRadius:10, border:`1px solid ${T.line}`, color:T.soft, fontSize:13 }}>
            {lang==='ru'?'Отмена':'Annuler'}
          </button>
          <button onClick={onSubmit} className="serif" style={{ flex:1, padding:'9px', borderRadius:10,
            background:T.clay, color:'#fff', fontSize:13, fontWeight:600 }}>
            {lang==='ru'?'Открыть':'Déverrouiller'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════ APP ══════════════════
export default function App() {
  const wide = useWide()
  const [screen, setScreen] = useState(() => {
    try { return localStorage.getItem('pludini_screen') || localStorage.getItem('pluduni_screen') || 'landing' } catch { return 'landing' }
  })
  const [lang, setLang] = useState('fr')
  const [nav, setNav] = useState('explore')
  const [curCat, setCurCat] = useState(null)
  const [curSub, setCurSub] = useState('Tous')
  const [curSp, setCurSp] = useState(null)
  const [detTab, setDetTab] = useState('obs')
  const [pane, setPane] = useState('split')      // split | map | matrix
  const [edit, setEdit] = useState(() => {
    try { return localStorage.getItem('pludini_edit') === '1' || localStorage.getItem('pluduni_edit') === '1' } catch { return false }
  })
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [toast, setToast] = useState(null)
  const [mobileTab, setMobileTab] = useState('map')
  const [focus, setFocus] = useState(null)        // 'map' | 'matrix' | null
  const [curInd, setCurInd] = useState(null)      // individu ouvert
  const [curPlayer, setCurPlayer] = useState(null) // detail score
  const [scoreCat, setScoreCat] = useState('all')  // filtre règne dans la fiche score
  const [photoTarget, setPhotoTarget] = useState(null) // {target,label}
  const [promoting, setPromoting] = useState(null)   // {sp, ind}
  const [confirmDelSighting, setConfirmDelSighting] = useState(null) // {sp, ind}
  const [refresh, setRefresh] = useState(0)
  const [mapExpanded, setMapExpanded] = useState(() => new Set())
  const [mapTf, setMapTf] = useState({ x: 0, y: 0, k: 1 })

  const [spEditor, setSpEditor] = useState(null)   // {initial?, presetCat?, presetSub?}
  const [sighting, setSighting] = useState(null)
  const [idPicker, setIdPicker] = useState(false)

  useEffect(() => {
    loadAll().then(()=>setRefresh(r=>r+1))
    return subscribe(()=>setRefresh(r=>r+1))
  }, [])

  useEffect(() => { try { localStorage.setItem('pludini_screen', screen) } catch {} }, [screen])
  useEffect(() => { try { localStorage.setItem('pludini_edit', edit ? '1' : '0') } catch {} }, [edit])

  // mémorise la position de défilement de chaque écran — le scroll brut du navigateur
  // ne s'applique pas à la nouvelle mise en page et donne des sauts incohérents
  const scrollPos = useRef({})
  const goScreen = (s) => { scrollPos.current[screen] = window.scrollY; setScreen(s) }
  useEffect(() => { window.scrollTo(0, scrollPos.current[screen] || 0) }, [screen])

  const SPECIES = allSpecies()
  const CATS = allCats()
  const PLAYERS = allPlayers().filter(p=>!p.demo)
  const ALL_PLAYERS = allPlayers()

  const sp = SPECIES.find(s => s.id === curSp)
  const catObj = CATS.find(c => c.id === curCat)

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 3200) }
  const selSpFull = (id) => { const s = SPECIES.find(x=>x.id===id); setCurCat(s?.cat); setCurSp(id); setDetTab('obs') }

  const submitPw = () => { if (pw==='arbalete'){ setEdit(true); setPwOpen(false); setPw(''); if(!getMe()) setIdPicker(true) } else setPw('') }

  const t = UI[lang]

  if (screen === 'lang') return <LangPicker onPick={(c)=>{ setLang(c); setScreen('landing') }} />
  if (screen === 'landing') return (
    <>
      <Landing lang={lang} setLang={setLang} go={goScreen} onQuiz={()=>showToast(t.quizSoon)}
        edit={edit} onEditHero={()=>setPhotoTarget({ target:'site:hero', label:lang==='ru'?'Главное фото':'Image d\u2019accueil' })}
        onEditCard={(c)=>setPhotoTarget({ target:`site:card:${c.k}`, label:c.title })} />
      {photoTarget && <PhotoManager target={photoTarget.target} label={photoTarget.label} lang={lang} onClose={()=>setPhotoTarget(null)} />}
      {!edit && (
        <button onClick={()=>setPwOpen(true)} style={{ position:'fixed', bottom:16, right:16, zIndex:20,
          background:'rgba(43,38,32,.72)', color:'#EDE7D8', borderRadius:20, padding:'8px 14px',
          fontSize:11.5, display:'flex', alignItems:'center', gap:5 }}>
          <i className="ti ti-pencil" style={{ fontSize:13 }} aria-hidden="true" />
          {lang==='ru'?'Правка':'Édition'}
        </button>
      )}
      {pwOpen && <PwModal lang={lang} pw={pw} setPw={setPw} onSubmit={submitPw}
        onClose={()=>{ setPwOpen(false); setPw('') }} />}
      {idPicker && <IdentityPicker lang={lang} onClose={()=>setIdPicker(false)} />}
      {toast && <Toast msg={toast} />}
    </>
  )
  if (screen === 'experience') return <Experience wide={wide} onBack={()=>goScreen('landing')} />
  if (screen === 'calendar')  return <Shell lang={lang} setLang={setLang} onHome={()=>goScreen('landing')}><Calendar wide={wide} lang={lang} onBack={()=>goScreen('landing')} edit={edit} /></Shell>
  if (screen === 'territory') return <Shell lang={lang} setLang={setLang} onHome={()=>goScreen('landing')}><Territory wide={wide} lang={lang} edit={edit} onBack={()=>goScreen('landing')} /></Shell>
  if (screen === 'gallery')   return (
    <Shell lang={lang} setLang={setLang} onHome={()=>goScreen('landing')}>
      <Gallery wide={wide} lang={lang} onBack={()=>goScreen('landing')} />
    </Shell>
  )

  // ═════ MATRIX PANE ═════
  const MatrixPane = ({ compact }) => {
    const [focusPerson, setFocusPerson] = useState(null)
    if (!compact) return <MatrixWide focusPerson={focusPerson} setFocusPerson={setFocusPerson} />
    return <MatrixCompact />
  }

  // vue large : une colonne complète par personne
  const MatrixWide = ({ focusPerson, setFocusPerson }) => {
    const cols = focusPerson ? ALL_PLAYERS.filter(p=>p.name===focusPerson) : ALL_PLAYERS
    return (
      <div style={{ padding:'14px 18px' }}>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:14, alignItems:'center' }}>
          <span style={{ fontSize:11, color:T.mute }}>{lang==='ru'?'Показать:':'Afficher :'}</span>
          <button onClick={()=>setFocusPerson(null)} style={{ fontSize:11.5, padding:'5px 11px', borderRadius:14,
            border:`1px solid ${!focusPerson?T.clay:T.line}`, background:!focusPerson?T.clay:'transparent',
            color:!focusPerson?'#fff':T.soft, fontWeight:!focusPerson?600:400 }}>{t.all}</button>
          {ALL_PLAYERS.map(p=>{
            const on = focusPerson===p.name
            return <button key={p.id} onClick={()=>setFocusPerson(on?null:p.name)} style={{ fontSize:11.5, padding:'5px 11px',
              borderRadius:14, border:`1px solid ${on?T.clay:T.line}`, background:on?T.clay:'transparent',
              color:on?'#fff':T.soft, fontWeight:on?600:400 }}>{p.name}</button>
          })}
        </div>
        {CATS.filter(c=>SPECIES.some(s=>s.cat===c.id)).map(cat=>{
          const list = SPECIES.filter(s=>s.cat===cat.id)
          const cn = catNameOf(cat, lang)
          return (
            <div key={cat.id} style={{ marginBottom:20 }}>
              <div className="serif" style={{ fontSize:15, fontWeight:700, color:T.ink, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                <span>{cat.e}</span>{cn.main}
                <span style={{ fontSize:11, color:T.mute, fontWeight:400 }}>· {list.filter(isObserved).length}/{list.length}</span>
                {edit && <button onClick={()=>setSpEditor({ cat:cat.id })}
                  style={{ marginLeft:'auto', fontSize:11, padding:'4px 10px', borderRadius:12,
                    background:T.sageDark, color:'#fff', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                  <i className="ti ti-plus" style={{ fontSize:12 }} aria-hidden="true" />
                  {lang==='ru'?'Вид':'Espèce'}
                </button>}
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr>
                  <th style={{ textAlign:'left', padding:'7px 8px', color:T.mute, fontWeight:500, fontSize:10.5, borderBottom:`1.5px solid ${T.line}` }}>{lang==='ru'?'Вид':'Espèce'}</th>
                  {cols.map(p=>(
                    <th key={p.id} style={{ padding:'7px 8px', textAlign:'center', borderBottom:`1.5px solid ${T.line}`,
                      borderLeft:`1px solid ${T.lineSoft}`, minWidth:110, background:p.demo?'rgba(211,199,174,.18)':'transparent' }}>
                      <div className="serif" style={{ fontSize:13, fontWeight:700, color:T.ink }}>{p.name}</div>
                    </th>
                  ))}
                </tr></thead>
                <tbody>
                  {list.map((s,si)=>{
                    const r = (RARITY[s.r]||RARITY.commun), o = isObserved(s), nm = nameOf(s, lang)
                    return (
                      <tr key={s.id} style={{ opacity:o?1:.5, background: si%2 ? 'rgba(211,199,174,.16)' : 'transparent' }}>
                        <td onClick={()=>selSpFull(s.id)} style={{ padding:'7px 8px', borderBottom:`1px solid ${T.lineSoft}`, cursor:'pointer' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                            <span style={{ width:9, height:9, borderRadius:2, background:o?r.c:'#CFC3A8', flexShrink:0 }} />
                            <span style={{ fontSize:15, filter:o?'none':'grayscale(.6)' }}>{s.e}</span>
                            <span>
                              <span style={{ display:'block', fontSize:12, fontWeight:o?600:400, color:T.ink }}>{nm.main}</span>
                              {nm.sub && <span style={{ display:'block', fontSize:9, color:T.mute, opacity:.6 }}>{nm.sub}</span>}
                            </span>
                          </div>
                        </td>
                        {cols.map((pl,ci)=>{
                          const m = s.obs[pl.name]||[]
                          const best = m.length ? m.reduce((b,x)=>(METHODS[x]?.mult||0)>(METHODS[b]?.mult||0)?x:b, m[0]) : null
                          const resolved = splitInds(s)
                          const mine = [...resolved.named, ...resolved.sightings].filter(i=>i.by===pl.name)
                          return (
                            <td key={pl.id} onClick={()=>selSpFull(s.id)} style={{ padding:'6px 8px',
                              borderBottom:`1px solid ${T.lineSoft}`, borderLeft:`1px solid ${T.lineSoft}`,
                              textAlign:'center', cursor:'pointer' }}>
                              {best ? (
                                mine.length>0 ? (
                                  <span style={{ display:'flex', gap:3, flexWrap:'wrap', justifyContent:'center' }}>
                                    {mine.map((ind,i)=>(
                                      <span key={i} style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                                        <ObsCell spId={s.id} indName={ind.n} method={best} named={ind.named}
                                          label={`${ind.displayName} — ${METHODS[best].l}`} />
                                        <span style={{ fontSize:7.5, color: ind.named?'#A07C28':T.mute,
                                          fontWeight: ind.named?700:400, maxWidth:44, overflow:'hidden',
                                          textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ind.displayName}</span>
                                      </span>
                                    ))}
                                  </span>
                                ) : <SpeciesCell spId={s.id} method={best} label={`${pl.name} — ${METHODS[best].l}`} />
                              ) : <span style={{ color:T.line, fontSize:13 }}>·</span>}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {edit && (
                <button onClick={()=>setSpEditor({ cat:cat.id })}
                  style={{ width:'100%', marginTop:6, padding:'8px', borderRadius:10,
                    border:`1px dashed ${T.line}`, color:T.mute, fontSize:12,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <i className="ti ti-plus" style={{ fontSize:13 }} aria-hidden="true" />
                  {lang==='ru'?'Добавить вид в это царство':'Ajouter une espèce dans ce règne'}
                </button>
              )}
            </div>
          )
        })}
        <div style={{ display:'flex', gap:11, flexWrap:'wrap', fontSize:11, color:T.soft, alignItems:'center', paddingTop:6 }}>
          {Object.entries(METHODS).map(([k,m])=>(
            <span key={k} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:17, height:17, borderRadius:'50%', background:m.c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9 }}>{k==='eye'?'👁':k==='scope'?'🔭':k==='night'?'🌙':'📷'}</span>{m.l} ×{m.mult}
            </span>
          ))}
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:24, height:19, borderRadius:5, border:'1.5px solid #C9A046',
              background:'#DDD3BE', display:'inline-block' }} />
            {lang==='ru'?'знакомый':'familier'}
          </span>
        </div>
      </div>
    )
  }

  const MatrixCompact = () => (
    <div style={{ padding:'12px 14px' }}>
      {CATS.filter(c=>SPECIES.some(s=>s.cat===c.id)).map(cat=>{
        const list = SPECIES.filter(s=>s.cat===cat.id)
        const cn = catNameOf(cat, lang)
        return (
          <div key={cat.id} style={{ marginBottom:16 }}>
            <div className="serif" style={{ fontSize:14, fontWeight:600, color:T.ink, marginBottom:7, display:'flex', alignItems:'center', gap:6 }}>
              <span>{cat.e}</span>{cn.main}
              <span style={{ fontSize:10.5, color:T.mute, fontWeight:400 }}>· {list.filter(isObserved).length}/{list.length}</span>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead><tr>
                <th style={{ textAlign:'left', padding:'5px 6px', color:T.mute, fontWeight:500, fontSize:10, borderBottom:`1px solid ${T.line}` }}>{lang==='ru'?'Вид':'Espèce'}</th>
                <th style={{ padding:'5px 3px', textAlign:'center', color:T.mute, fontWeight:500, fontSize:10, borderBottom:`1px solid ${T.line}`, width:30 }} title="Individus identifiés">👤</th>
                {ALL_PLAYERS.map(p=><th key={p.id} title={p.name} style={{ padding:'5px 3px', textAlign:'center', color:T.soft, fontWeight:600, fontSize:10, borderBottom:`1px solid ${T.line}`, width:38 }}>{p.id}</th>)}
              </tr></thead>
              <tbody>
                {list.map(s=>{
                  const r = (RARITY[s.r]||RARITY.commun), o = isObserved(s)
                  const nm = nameOf(s, lang)
                  const nInd = (s.inds||[]).length
                  return (
                    <tr key={s.id} onClick={()=>selSpFull(s.id)} style={{ cursor:'pointer', opacity:o?1:0.5 }}>
                      <td style={{ padding:'5px 6px', borderBottom:`1px solid ${T.lineSoft}` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ width:8, height:8, borderRadius:2, background:o?r.c:'#CFC3A8', flexShrink:0 }} />
                          <span style={{ fontSize:13, filter:o?'none':'grayscale(.6)' }}>{s.e}</span>
                          <span style={{ minWidth:0 }}>
                            <span style={{ display:'block', fontSize:11, fontWeight:o?600:400, color:T.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:100 }}>{nm.main}</span>
                            {nm.sub && <span style={{ display:'block', fontSize:8.5, color:T.mute, opacity:.62, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:100 }}>{nm.sub}</span>}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding:'5px 3px', textAlign:'center', borderBottom:`1px solid ${T.lineSoft}` }}>
                        {nInd>0 && <span className="serif" style={{ fontSize:10.5, fontWeight:700, color:'#8F4A22', background:'#F0E4CF', borderRadius:8, padding:'1px 6px' }}>{nInd}</span>}
                      </td>
                      {PLAYERS.map(pl=>{
                        const m = s.obs[pl.name]||[]
                        const best = m.length ? m.reduce((b,x)=>(METHODS[x]?.mult||0)>(METHODS[b]?.mult||0)?x:b, m[0]) : null
                        const myInd = (s.inds||[]).filter(i=>i.by===pl.name).length
                        return (
                          <td key={pl.id} style={{ padding:'5px 3px', borderBottom:`1px solid ${T.lineSoft}`, textAlign:'center' }}>
                            <div title={best?`${pl.name} — ${METHODS[best].l}${myInd?` · ${myInd} individu(s)`:''}`:pl.name}
                              style={{ position:'relative', width:22, height:22, borderRadius:'50%', margin:'0 auto',
                                display:'flex', alignItems:'center', justifyContent:'center', fontSize:9,
                                background:best?METHODS[best].c:'#E0D8C6', border:`1px solid ${best?METHODS[best].c:T.line}` }}>
                              {best?(best==='eye'?'👁':best==='scope'?'🔭':best==='night'?'🌙':'📷'):''}
                              {myInd>0 && <span className="serif" style={{ position:'absolute', top:-4, right:-5,
                                minWidth:13, height:13, borderRadius:7, background:'#8F4A22', color:'#fff',
                                fontSize:8, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center',
                                padding:'0 3px', border:'1px solid #EDE7D8' }}>{myInd}</span>}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
      <div style={{ display:'flex', gap:9, flexWrap:'wrap', fontSize:10, color:T.soft, paddingTop:4, alignItems:'center' }}>
        {Object.entries(METHODS).map(([k,m])=>(
          <span key={k} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:15, height:15, borderRadius:'50%', background:m.c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8 }}>{k==='eye'?'👁':k==='scope'?'🔭':k==='night'?'🌙':'📷'}</span>×{m.mult}
          </span>
        ))}
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ minWidth:13, height:13, borderRadius:7, background:'#8F4A22', color:'#fff', fontSize:8, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>2</span>
          {lang==='ru'?'особей':'individus'}
        </span>
      </div>
    </div>
  )

  // ═════ PANE HEADER ═════
  const PaneHeader = ({ title, icon }) => (
    <div style={{ display:'flex', alignItems:'center', padding:'11px 14px', borderBottom:`1px solid ${T.line}`, background:T.surface }}>
      <div className="serif" style={{ fontSize:14, fontWeight:600, color:T.ink, display:'flex', alignItems:'center', gap:6 }}>
        <i className={`ti ${icon}`} style={{ fontSize:15, color:T.clay }} aria-hidden="true" />{title}
      </div>
    </div>
  )

  // ═════ SPECIES DETAIL ═════
  const Detail = () => {
    if (!sp) return null
    const r = (RARITY[sp.r]||RARITY.commun); const o = isObserved(sp)
    const allM = new Set(Object.values(sp.obs).flat())
    const baseP = Math.round(r.p * SIZE_MULT[sp.sz])
    const seasons = sp.saisons
    const isPerson = sp.cat === 'humains' || sp.cat === 'domestiques'
    const tabs = [['obs',t.obs],['infos',t.infos],...(seasons?[['saisons',t.seasons]]:[])]
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.5)', zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding: wide?24:16 }} onClick={()=>{setCurSp(null);setCurInd(null)}}>
        <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:20, width:'100%', maxWidth: wide?820:640, maxHeight: wide?'90vh':'92dvh', overflow:'auto', border:`1px solid ${T.line}` }}>
          <div style={{ position:'relative', height: wide?420:260, display:'flex', alignItems:'flex-end', padding:20 }}>
            <PhotoHeroSpecies sp={sp} fallback={gradientFor(sp.id)} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(20,20,14,.55), transparent 65%)', pointerEvents:'none' }} />
            {edit && <div style={{ position:'absolute', top:14, right:52, display:'flex', gap:5 }}>
              <button onClick={(e)=>{ e.stopPropagation(); setSpEditor({ initial:sp }) }}
                style={{ background:'rgba(0,0,0,.45)', color:'#fff', borderRadius:12, padding:'5px 10px', fontSize:11.5 }}>
                <i className="ti ti-pencil" style={{ fontSize:13 }} aria-hidden="true" />
              </button>
            </div>}
            <button onClick={()=>setCurSp(null)} style={{ position:'absolute', top:14, right:14, width:30, height:30, borderRadius:'50%', background:'rgba(0,0,0,.3)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className="ti ti-x" style={{ fontSize:15 }} aria-hidden="true" />
            </button>
            <div style={{ position:'absolute', top:14, left:16, fontSize:44 }}>{sp.e}</div>
            <div style={{ position:'relative' }}>
              <div className="serif" style={{ fontSize:26, fontWeight:900, color:'#F2EEE2', lineHeight:1.05 }}>{nameOf(sp,lang).main}</div>
              {nameOf(sp,lang).sub && <div style={{ fontSize:13, color:'rgba(242,238,226,.5)', marginTop:1 }}>{nameOf(sp,lang).sub}</div>}
              <div style={{ fontSize:12, color:'rgba(242,238,226,.78)', fontStyle:'italic', marginTop:2 }}>{sp.lat}</div>
              {!isPerson && <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
                <span style={{ fontSize:10.5, fontWeight:600, padding:'3px 9px', borderRadius:12, background:r.c, color:'#fff' }}>{r.l}</span>
                {[...allM].map(m => (METHODS[m]||METHODS.eye) && <span key={m} style={{ fontSize:10.5, padding:'3px 9px', borderRadius:12, background:METHODS[m].c, color:METHODS[m].on }}>{METHODS[m].l}</span>)}
                {!o && <span style={{ fontSize:10.5, padding:'3px 9px', borderRadius:12, background:'rgba(255,255,255,.22)', color:'#F2EEE2' }}>{t.notObserved}</span>}
              </div>}
            </div>
          </div>
          <div style={{ padding:'14px 18px 22px' }}>
            {isPerson && <>
              {[['Alimentation',sp.alim],['Habitat & territoire',sp.hab],['Danger',sp.dng]].map(([tt,v])=>(
                <div key={tt} style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:10, padding:11, marginBottom:8 }}>
                  <div style={{ fontSize:10.5, fontWeight:600, color:T.mute, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>{tt}</div>
                  <div style={{ fontSize:12.5, color:T.soft, lineHeight:1.65 }}>{v}</div>
                </div>
              ))}
              {sp.anecdote && (
                <div style={{ background:'#F0E4CF', border:`1px solid #DCC79E`, borderRadius:10, padding:12, marginTop:4 }}>
                  <div style={{ fontSize:10.5, fontWeight:700, color:'#8F6A2E', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                    <i className="ti ti-sparkles" style={{ fontSize:13 }} aria-hidden="true" />Le saviez-vous
                  </div>
                  <div style={{ fontSize:12.5, color:'#6B5330', lineHeight:1.65 }}>{sp.anecdote}</div>
                </div>
              )}
            </>}
            {!isPerson && <div className="serif" style={{ fontSize:15, fontWeight:600, color:T.clay, marginBottom:12 }}>{baseP} pts base · max {baseP*3+50} pts</div>}
            {!isPerson && <div style={{ display:'flex', borderBottom:`1px solid ${T.line}`, marginBottom:14 }}>
              {tabs.map(([id,l])=>(
                <button key={id} onClick={()=>setDetTab(id)} style={{ fontSize:12.5, padding:'8px 14px', color:detTab===id?T.clayDark:T.soft, borderBottom:`2px solid ${detTab===id?T.clay:'transparent'}`, marginBottom:-1, fontWeight:detTab===id?600:400 }}>{l}</button>
              ))}
            </div>}

            {!isPerson && detTab==='obs' && <>
              <div style={{ display:'flex', alignItems:'center', marginBottom:8 }}>
                <div style={{ fontSize:10.5, fontWeight:600, color:T.mute, textTransform:'uppercase', letterSpacing:'.5px' }}>{t.whoObserved}</div>
                {edit && <div style={{ marginLeft:'auto', display:'flex', gap:5 }}>
                  <button onClick={()=>setSighting({ sp })} style={{ fontSize:12.5,
                    padding:'7px 14px', borderRadius:14, background:T.clay, color:'#fff', fontWeight:600,
                    display:'flex', alignItems:'center', gap:5 }}>
                    <i className="ti ti-plus" style={{ fontSize:14 }} aria-hidden="true" />
                    {lang==='ru'?'Наблюдение':'Observation'}
                  </button>
                </div>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${wide?5:3},1fr)`, gap:8, marginBottom:16 }}>
                {ALL_PLAYERS.map(pl=>{
                  const m = sp.obs[pl.name]||[]
                  const best = m.length ? m.reduce((b,x)=>(METHODS[x]?.mult||0)>(METHODS[b]?.mult||0)?x:b, m[0]) : null
                  const p2 = calcPtsLive(sp, pl.name)
                  return (
                    <div key={pl.id} style={{ background:best?`${METHODS[best].c}33`:T.card, border:`1px solid ${best?METHODS[best].c:T.line}`, borderRadius:10, padding:'9px 6px', textAlign:'center', opacity:pl.demo?.7:1 }}>
                      <div style={{ fontSize:15, marginBottom:2 }}>{best?(best==='eye'?'👁':best==='scope'?'🔭':best==='night'?'🌙':'📷'):'—'}</div>
                      <div style={{ fontSize:10, color:T.soft }}>{pl.name}</div>
                      <div className="serif" style={{ fontSize:12, fontWeight:600, color:T.ink }}>{p2?p2+' pts':'—'}</div>
                    </div>
                  )
                })}
              </div>
              {sp.inds.length>0 && (() => {
                const { named, sightings } = splitInds(sp)
                const Col = ({ title, icon, list, isNamed }) => (
                  <div>
                    <div style={{ fontSize:10.5, fontWeight:700, color: isNamed?'#A07C28':T.mute, textTransform:'uppercase',
                      letterSpacing:'.6px', marginBottom:8, display:'flex', alignItems:'center', gap:5,
                      paddingBottom:5, borderBottom: isNamed?'1.5px solid #C9A046':`1px solid ${T.line}` }}>
                      <i className={`ti ${icon}`} style={{ fontSize:13 }} aria-hidden="true" />
                      {title} ({list.length})
                    </div>
                    {list.length===0
                      ? <div style={{ fontSize:11.5, color:T.mute, padding:'8px 0', fontStyle:'italic' }}>
                          {isNamed ? (lang==='ru'?'Пока никого не опознали':'Aucun individu reconnu pour l\'instant')
                                   : (lang==='ru'?'Нет наблюдений':'Aucune observation')}
                        </div>
                      : <div style={{ display:'grid', gridTemplateColumns:`repeat(auto-fill,minmax(${wide?118:104}px,1fr))`, gap:8 }}>
                          {list.map((ind,i)=>(
                            <button key={i} onClick={()=>setCurInd(ind)} style={{ textAlign:'left', borderRadius:12,
                              overflow:'hidden', padding:0, position:'relative', minHeight: isNamed?100:92,
                              border: isNamed?'2px solid #C9A046':`1px solid ${T.line}`,
                              boxShadow: isNamed?'0 0 0 1px rgba(201,160,70,.28), 0 3px 12px rgba(201,160,70,.22)':'none' }}>
                              <PhotoBg target={`ind:${sp.id}:${ind.n}`} fallback={gradientFor(sp.id+ind.n)} />
                              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(16,18,12,.74), transparent 56%)' }} />
                              {isNamed && <span style={{ position:'absolute', top:6, left:6, background:'#C9A046',
                                color:'#2B2620', borderRadius:8, padding:'2px 7px', fontSize:8.5, fontWeight:800,
                                letterSpacing:'.4px', display:'flex', alignItems:'center', gap:3, zIndex:2 }}>
                                ★ {lang==='ru'?'ЗНАКОМЫЙ':'FAMILIER'}</span>}
                              <div style={{ position:'relative', height:'100%', minHeight:92, display:'flex',
                                flexDirection:'column', justifyContent:'flex-end', padding:9 }}>
                                <div className="serif" style={{ fontSize:12, fontWeight:700, color:'#F2EEE2', lineHeight:1.1 }}>{ind.displayName}</div>
                                <div style={{ fontSize:9.5, color:'rgba(242,238,226,.72)', marginTop:2 }}>{ind.d}</div>
                              </div>
                            </button>
                          ))}
                        </div>}
                  </div>
                )
                return (
                  <div style={{ display:'grid', gridTemplateColumns: wide?'1fr 1fr':'1fr', gap:16 }}>
                    <Col title={lang==='ru'?'Проходы':'Passages'} icon="ti-eye" list={sightings} isNamed={false} />
                    <Col title={lang==='ru'?'Знакомые':'Familiers'} icon="ti-star" list={named} isNamed={true} />
                  </div>
                )
              })()}

              {Object.entries(sp.bonus||{}).some(([,b])=>b.length) && (
                <div style={{ marginTop:14 }}>
                  <div style={{ fontSize:10.5, fontWeight:600, color:T.mute, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>Bonus</div>
                  {Object.entries(sp.bonus).map(([pl,bs])=>bs.map(b=>(
                    <div key={pl+b} style={{ fontSize:11.5, color:T.soft, marginBottom:3 }}>• <b>{pl}</b> : {b==='terrier'?'🏠 Terrier trouvé (+30 pts)':b==='bebe'?'👶 Bébés observés (+20 pts)':b}</div>
                  )))}
                </div>
              )}
            </>}

            {!isPerson && detTab==='infos' && <>
              {[['Alimentation',sp.alim],['Habitat & territoire',sp.hab],['Danger',sp.dng]].map(([t,v])=>(
                <div key={t} style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:10, padding:11, marginBottom:8 }}>
                  <div style={{ fontSize:10.5, fontWeight:600, color:T.mute, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>{t}</div>
                  <div style={{ fontSize:12.5, color:T.soft, lineHeight:1.65 }}>{v}</div>
                </div>
              ))}
              {sp.anecdote && (
                <div style={{ background:'#F0E4CF', border:`1px solid #DCC79E`, borderRadius:10, padding:12, marginTop:4 }}>
                  <div style={{ fontSize:10.5, fontWeight:700, color:'#8F6A2E', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                    <i className="ti ti-sparkles" style={{ fontSize:13 }} aria-hidden="true" />Le saviez-vous
                  </div>
                  <div style={{ fontSize:12.5, color:'#6B5330', lineHeight:1.65 }}>{sp.anecdote}</div>
                </div>
              )}
              <div style={{ marginTop:10, padding:'9px 11px', border:`1px dashed ${T.line}`, borderRadius:10, fontSize:11.5, color:T.mute, display:'flex', alignItems:'center', gap:7 }}>
                <i className="ti ti-volume" style={{ fontSize:15 }} aria-hidden="true" />
                Cri / chant de l'espèce — à venir
              </div>
            </>}

            {!isPerson && detTab==='saisons' && seasons && (
              <div style={{ display:'grid', gridTemplateColumns: wide?'1fr 1fr':'1fr', gap:9 }}>
                {[['printemps','Printemps','🌱','#8FA96B'],['ete','Été','☀️','#C0913E'],['automne','Automne','🍂','#B5602F'],['hiver','Hiver','❄️','#7C8B95']].map(([k,l,e,c])=>(
                  <div key={k} style={{ borderRadius:12, overflow:'hidden', border:`1px solid ${T.line}` }}>
                    <div style={{ background:c, padding:'7px 11px', display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:14 }}>{e}</span>
                      <span className="serif" style={{ fontSize:12.5, fontWeight:700, color:'#fff' }}>{l}</span>
                    </div>
                    <div style={{ padding:'9px 11px', background:T.card, fontSize:11.5, color:T.soft, lineHeight:1.55 }}>{seasons[k]}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ═════ INDIVIDU ═════
  const IndividuSheet = () => {
    if (!curInd || !sp) return null
    const ind = curInd
    const M = ind.method ? METHODS[ind.method] : null
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.6)', zIndex:80, display:'flex', alignItems:'center', justifyContent:'center', padding: wide?24:16 }} onClick={()=>setCurInd(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:20, width:'100%', maxWidth: wide?660:560, maxHeight: wide?'88vh':'74dvh', overflow:'auto', border:`1px solid ${T.line}` }}>
          <div style={{ position:'relative', height: wide?380:260, display:'flex', alignItems:'flex-end', padding:18 }}>
            <PhotoHero target={`ind:${sp.id}:${ind.n}`} fallback={gradientFor(sp.id+ind.n)} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(20,20,14,.6), transparent 62%)', pointerEvents:'none' }} />
            {edit && <div style={{ position:'absolute', top:12, right:80, display:'flex', gap:5 }}>
              <button onClick={(e)=>{ e.stopPropagation(); setSighting({ editing:{ sp, ind } }) }}
                style={{ background:'rgba(0,0,0,.35)', color:'#fff', borderRadius:'50%', width:28, height:28,
                  display:'flex', alignItems:'center', justifyContent:'center' }}
                title={lang==='ru'?'Изменить наблюдение':'Modifier cette observation'}>
                <i className="ti ti-pencil" style={{ fontSize:13 }} aria-hidden="true" />
              </button>
              <button onClick={(e)=>{ e.stopPropagation(); setConfirmDelSighting({ sp, ind }) }}
                style={{ background:'rgba(139,58,46,.8)', color:'#fff', borderRadius:'50%', width:28, height:28,
                  display:'flex', alignItems:'center', justifyContent:'center' }}
                title={lang==='ru'?'Удалить':'Supprimer cette observation'}>
                <i className="ti ti-trash" style={{ fontSize:13 }} aria-hidden="true" />
              </button>
            </div>}
            <button onClick={()=>setCurInd(null)} style={{ position:'absolute', top:12, right:12, width:28, height:28, borderRadius:'50%', background:'rgba(0,0,0,.3)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className="ti ti-x" style={{ fontSize:14 }} aria-hidden="true" />
            </button>
            <div style={{ position:'absolute', top:12, left:14, fontSize:34 }}>{sp.e}</div>
            <div style={{ position:'relative' }}>
              <div style={{ fontSize:10.5, color:'rgba(242,238,226,.7)', textTransform:'uppercase', letterSpacing:'1px' }}>{sp.n}</div>
              <div className="serif" style={{ fontSize:24, fontWeight:900, color:'#F2EEE2', lineHeight:1.05,
                display:'flex', alignItems:'center', gap:7 }}>
                {ind.named && <span style={{ fontSize:17 }}>⭐</span>}{ind.displayName || ind.n}
              </div>
              <div style={{ fontSize:11.5, color:'rgba(242,238,226,.78)', marginTop:3 }}>{ind.note}</div>
            </div>
          </div>
          <div style={{ padding:'14px 18px 22px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:8, marginBottom:14 }}>
              {[['Date',ind.d,'ti-calendar'],['Heure',ind.time||'—','ti-clock'],['Observé par',ind.by||'—','ti-user'],['Conditions',ind.weather||'—','ti-cloud']].map(([l,v,ic])=>(
                <div key={l} style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:10, padding:'8px 10px' }}>
                  <div style={{ fontSize:9.5, color:T.mute, textTransform:'uppercase', letterSpacing:'.5px', display:'flex', alignItems:'center', gap:4, marginBottom:3 }}>
                    <i className={`ti ${ic}`} style={{ fontSize:11 }} aria-hidden="true" />{l}
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:T.ink }}>{v}</div>
                </div>
              ))}
            </div>
            {M && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:M.c, color:M.on, padding:'5px 11px', borderRadius:14, fontSize:11.5, fontWeight:600, marginBottom:14 }}>
                {ind.method==='eye'?'👁':ind.method==='scope'?'🔭':ind.method==='night'?'🌙':'📷'} {M.l}
              </div>
            )}
            {ind.gps && <MiniMap gps={ind.gps} />}
            {ind.story && (
              <div style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:12, padding:13, marginBottom:9 }}>
                <div style={{ fontSize:10.5, fontWeight:600, color:T.mute, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:7, display:'flex', alignItems:'center', gap:5 }}>
                  <i className="ti ti-quote" style={{ fontSize:12 }} aria-hidden="true" />Récit de {ind.by||'l\'observateur'}
                </div>
                <div className="serif" style={{ fontSize:13.5, color:T.ink, lineHeight:1.7, fontStyle:'italic' }}>« {ind.story} »</div>
              </div>
            )}
            {ind.traits && (
              <div style={{ background:'#F0E4CF', border:'1px solid #DCC79E', borderRadius:12, padding:12, marginBottom:9 }}>
                <div style={{ fontSize:10.5, fontWeight:700, color:'#8F6A2E', textTransform:'uppercase',
                  letterSpacing:'.5px', marginBottom:5, display:'flex', alignItems:'center', gap:5 }}>
                  <i className="ti ti-fingerprint" style={{ fontSize:13 }} aria-hidden="true" />
                  {lang==='ru'?'Приметы':'Signes distinctifs'}
                </div>
                <div style={{ fontSize:12.5, color:'#6B5330', lineHeight:1.6 }}>{ind.traits}</div>
              </div>
            )}
            {edit && !ind.named && (
              <button onClick={()=>{ setCurInd(null); setPromoting({ sp, ind }) }}
                style={{ width:'100%', padding:'11px', borderRadius:12, border:'1px dashed #C9A87C',
                  background:'transparent', color:'#8F4A22', fontSize:12.5, fontWeight:600,
                  marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <i className="ti ti-lock-open" style={{ fontSize:15 }} aria-hidden="true" />
                {lang==='ru'?'Опознать эту особь и дать имя':'Reconnaître cet individu et lui donner un nom'}
              </button>
            )}
            <IndPhotos spId={sp.id} indName={ind.n} />
            {ind.desc && (
              <div style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:12, padding:13 }}>
                <div style={{ fontSize:10.5, fontWeight:600, color:T.mute, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>Description</div>
                <div style={{ fontSize:12.5, color:T.soft, lineHeight:1.6 }}>{ind.desc}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ═════ SCORES ═════
  const Scores = () => {
    const rows = ALL_PLAYERS.map(p=>({ ...p, pts:totalPtsLive(p.name), spp:speciesPtsLive(p.name), bp:badgePtsLive(p.name), sps:SPECIES.filter(s=>(s.obs[p.name]||[]).length).length })).sort((a,b)=>b.pts-a.pts)
    const max = Math.max(rows[0].pts,1)
    return (
      <div style={{ padding: wide?'18px 40px 40px':'16px 20px 30px' }}>
        <div style={{ display:'grid', gridTemplateColumns: wide?'1fr 1fr':'1fr', gap:16 }}>
          <div>
            <div className="serif" style={{ fontSize:13, fontWeight:600, color:T.mute, textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>Classement</div>
            {rows.map((p,i)=>(
              <button key={p.id} onClick={()=>{ setCurPlayer(p.name); setScoreCat('all') }} style={{ width:'100%', textAlign:'left', background:T.card, border:`1px solid ${p.demo?'#C9BFA6':T.line}`, borderRadius:12, padding:'11px 13px', display:'flex', alignItems:'center', gap:11, marginBottom:7, opacity:p.demo?.68:1 }}>
                <span style={{ fontSize:16, width:24 }}>{p.demo?'🎓':['🥇','🥈','🥉','4️⃣'][i]}</span>
                <div className="serif" style={{ width:32, height:32, borderRadius:'50%', background:T.sage, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, flexShrink:0 }}>{p.id}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="serif" style={{ fontSize:14, fontWeight:600, color:T.ink }}>{p.name}</div>
                  <div style={{ fontSize:11, color:T.mute }}>{p.sps} espèce{p.sps!==1?'s':''} · {p.bp} pts de badges</div>
                </div>
                <div style={{ flex:1, maxWidth:110, background:'#DDD3BE', borderRadius:5, height:7, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:5, background:T.clay, width:`${Math.round(p.pts/max*100)}%` }} />
                </div>
                <div className="serif" style={{ fontSize:15, fontWeight:900, color:T.clay, minWidth:48, textAlign:'right' }}>{p.pts}</div>
                <i className="ti ti-chevron-right" style={{ fontSize:14, color:T.mute }} aria-hidden="true" />
              </button>
            ))}
            <div style={{ fontSize:11, color:T.mute, marginTop:6, display:'flex', alignItems:'center', gap:5 }}>
              <i className="ti ti-info-circle" style={{ fontSize:13 }} aria-hidden="true" />Clique sur un observateur pour le détail du calcul
            </div>
          </div>
          <div>
            <div className="serif" style={{ fontSize:13, fontWeight:600, color:T.mute, textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>Système de points</div>
            <div style={{ background:'#F0E4CF', border:'1px solid #DCC79E', borderRadius:12, padding:'11px 13px', marginBottom:9 }}>
              <div className="serif" style={{ fontSize:13, fontWeight:700, color:'#8F6A2E', marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
                <i className="ti ti-award" style={{ fontSize:15 }} aria-hidden="true" />Les badges rapportent gros
              </div>
              <div style={{ fontSize:11.5, color:'#6B5330', lineHeight:1.6 }}>
                De <b>35 à 300 points</b> chacun — souvent plus qu'une observation rare. Voir un ours vaut 300 pts, une trace de loup 200 pts.
                C'est là que se joue le classement.
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                ['Rareté', Object.values(RARITY).map(r=>[r.l,`+${r.p}`])],
                ['Méthode', Object.values(METHODS).map(m=>[m.l,`×${m.mult}`])],
                ['Taille', [['Très petit','×1'],['Petit','×1.5'],['Moyen','×2'],['Grand','×2.5'],['Géant','×3']]],
                ['Bonus', [['👶 Bébés','+20'],['🏠 Terrier','+30'],['📸 Photo nette','+10']]],
              ].map(([title,items])=>(
                <div key={title} style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:10, padding:'9px 11px' }}>
                  <div className="serif" style={{ fontSize:12, fontWeight:600, color:T.ink, marginBottom:5 }}>{title}</div>
                  {items.map(([l,v])=>(
                    <div key={l} style={{ fontSize:10.5, color:T.soft, lineHeight:1.9, display:'flex', justifyContent:'space-between', gap:6 }}>
                      <span>{l}</span><span style={{ color:T.clay, fontWeight:600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═════ DÉTAIL D'UN SCORE ═════
  const ScoreSheet = () => {
    if (!curPlayer) return null
    const lines = SPECIES.filter(s=>(s.obs[curPlayer]||[]).length).map(s=>{
      const m = s.obs[curPlayer]
      const best = m.reduce((b,x)=>(METHODS[x]?.mult||0)>(METHODS[b]?.mult||0)?x:b, m[0])
      const bonuses = s.bonus[curPlayer]||[]
      return { s, best, bonuses, pts: calcPtsLive(s, curPlayer) }
    }).sort((a,b)=>b.pts-a.pts)
    const myBadges = ACHIEVEMENTS.filter(a=>a.on && a.w.includes(curPlayer))
    const spTotal = speciesPtsLive(curPlayer), bTotal = badgePtsLive(curPlayer)
    const catBreakdown = CATS.map(cat => ({
      cat, pts: lines.filter(l=>l.s.cat===cat.id).reduce((s,l)=>s+l.pts,0), n: lines.filter(l=>l.s.cat===cat.id).length,
    })).filter(c=>c.n>0).sort((a,b)=>b.pts-a.pts)
    const shownLines = scoreCat==='all' ? lines : lines.filter(l=>l.s.cat===scoreCat)
    const shownPts = scoreCat==='all' ? spTotal : (catBreakdown.find(c=>c.cat.id===scoreCat)?.pts || 0)
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.55)', zIndex:70, display:'flex', alignItems:'center', justifyContent:'center', padding: wide?24:16 }} onClick={()=>setCurPlayer(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:20, width:'100%', maxWidth:600, maxHeight: wide?'88vh':'92vh', overflow:'auto', border:`1px solid ${T.line}` }}>
          <div style={{ position:'sticky', top:0, background:T.surface, borderBottom:`1px solid ${T.line}`, padding:'14px 18px', display:'flex', alignItems:'center', gap:11, zIndex:2 }}>
            <div className="serif" style={{ width:38, height:38, borderRadius:'50%', background:T.sage, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700 }}>{curPlayer[0]}</div>
            <div style={{ flex:1 }}>
              <div className="serif" style={{ fontSize:18, fontWeight:900, color:T.ink }}>{curPlayer}</div>
              <div style={{ fontSize:11.5, color:T.mute }}>{lines.length} observation{lines.length!==1?'s':''} · {myBadges.length} badge{myBadges.length!==1?'s':''}</div>
            </div>
            <div className="serif" style={{ fontSize:22, fontWeight:900, color:T.clay }}>{spTotal+bTotal}</div>
            <button onClick={()=>setCurPlayer(null)} style={{ width:28, height:28, borderRadius:'50%', border:`1px solid ${T.line}`, color:T.soft, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className="ti ti-x" style={{ fontSize:14 }} aria-hidden="true" />
            </button>
          </div>
          <div style={{ padding:'14px 18px 22px' }}>
            {catBreakdown.length>1 && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                <button onClick={()=>setScoreCat('all')} style={{ fontSize:11.5, padding:'6px 11px', borderRadius:14,
                  border:`1px solid ${scoreCat==='all'?T.clay:T.line}`, background:scoreCat==='all'?T.clay:'transparent',
                  color:scoreCat==='all'?'#fff':T.soft, fontWeight:scoreCat==='all'?700:400 }}>
                  {lang==='ru'?'Все':'Tout'} · {spTotal}
                </button>
                {catBreakdown.map(({cat,pts,n})=>(
                  <button key={cat.id} onClick={()=>setScoreCat(cat.id)} style={{ fontSize:11.5, padding:'6px 11px', borderRadius:14,
                    border:`1px solid ${scoreCat===cat.id?T.clay:T.line}`, background:scoreCat===cat.id?T.clay:'transparent',
                    color:scoreCat===cat.id?'#fff':T.soft, fontWeight:scoreCat===cat.id?700:400 }}>
                    {cat.e} {catNameOf(cat,lang).main} · {pts}
                  </button>
                ))}
              </div>
            )}
            <div style={{ fontSize:10.5, fontWeight:600, color:T.mute, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Observations · {shownPts} pts</div>
            {shownLines.map(({s,best,bonuses,pts})=>{
              const r = (RARITY[s.r]||RARITY.commun), M = (METHODS[best]||METHODS.eye)
              return (
                <div key={s.id} onClick={()=>{setCurPlayer(null);selSpFull(s.id)}} style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:10, padding:'9px 11px', marginBottom:6, cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                    <span style={{ fontSize:16 }}>{s.e}</span>
                    <span style={{ fontSize:12.5, fontWeight:600, color:T.ink, flex:1 }}>{s.n}</span>
                    <span className="serif" style={{ fontSize:14, fontWeight:900, color:T.clay }}>{pts}</span>
                  </div>
                  <div style={{ fontSize:10.5, color:T.soft, display:'flex', flexWrap:'wrap', gap:4, alignItems:'center' }}>
                    <span style={{ padding:'1px 6px', borderRadius:8, background:r.c, color:'#fff' }}>{r.p}</span>
                    <span>×</span>
                    <span style={{ padding:'1px 6px', borderRadius:8, background:'#DDD3BE' }}>{SIZE_MULT[s.sz]} taille</span>
                    <span>×</span>
                    <span style={{ padding:'1px 6px', borderRadius:8, background:M.c, color:M.on }}>{M.mult} {M.l}</span>
                    {bonuses.map(b=><span key={b} style={{ padding:'1px 6px', borderRadius:8, background:'#F0E4CF', color:'#8F6A2E' }}>+{b==='bebe'?'20 bébés':'30 terrier'}</span>)}
                    <span style={{ marginLeft:'auto', fontWeight:600, color:T.ink }}>= {pts} pts</span>
                  </div>
                </div>
              )
            })}
            {myBadges.length>0 && <>
              <div style={{ fontSize:10.5, fontWeight:600, color:T.mute, textTransform:'uppercase', letterSpacing:'.5px', margin:'16px 0 8px' }}>Badges · {bTotal} pts</div>
              {myBadges.map(a=>(
                <div key={a.n} style={{ background:'#F0E4CF', border:'1px solid #DCC79E', borderRadius:10, padding:'9px 11px', marginBottom:6, display:'flex', alignItems:'center', gap:9 }}>
                  <span style={{ fontSize:19 }}>{a.e}</span>
                  <div style={{ flex:1 }}>
                    <div className="serif" style={{ fontSize:12.5, fontWeight:700, color:'#6B5330' }}>{a.n}</div>
                    <div style={{ fontSize:10.5, color:'#8F6A2E' }}>{a.d}</div>
                  </div>
                  <span className="serif" style={{ fontSize:14, fontWeight:900, color:'#8F4A22' }}>+{a.pts}</span>
                </div>
              ))}
            </>}
            <div style={{ marginTop:14, padding:'11px 13px', background:T.surface, borderRadius:10, border:`1px solid ${T.line}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span className="serif" style={{ fontSize:14, fontWeight:700, color:T.ink }}>Total</span>
              <span className="serif" style={{ fontSize:20, fontWeight:900, color:T.clay }}>{spTotal} + {bTotal} = {spTotal+bTotal} pts</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═════ BADGES ═════
  const Badges = () => {
    const tiers = ACHIEVEMENTS.filter(a=>a.tier).sort((a,b)=>a.tier-b.tier)
    const rest  = ACHIEVEMENTS.filter(a=>!a.tier)
    const doneCount = SPECIES.filter(isObserved).length
    const Card = ({ a }) => {
      const locked = !a.on
      return (
        <div style={{ borderRadius:14, overflow:'hidden', position:'relative', minHeight:124,
          border: locked?`1px solid ${T.line}`:'2px solid #C9A046',
          boxShadow: locked?'none':'0 0 0 1px rgba(201,160,70,.25), 0 3px 14px rgba(201,160,70,.2)' }}>
          <div style={{ position:'absolute', inset:0, background: locked?'#DDD3BE':gradientFor(a.n) }} />
          {!locked && <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(20,20,14,.55), transparent 60%)' }} />}
          <div style={{ position:'relative', height:'100%', minHeight:124, display:'flex', flexDirection:'column',
            justifyContent:'space-between', padding:12 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
              <span style={{ fontSize:26, filter: locked?'grayscale(1)':'none', opacity: locked?.3:1 }}>{a.e}</span>
              <span className="serif" style={{ fontSize:13, fontWeight:900,
                color: locked?T.mute:'#F0D9A8' }}>+{a.pts}</span>
            </div>
            <div>
              <div className="serif" style={{ fontSize:13.5, fontWeight:700, color: locked?T.ink:'#F2EEE2' }}>{a.n}</div>
              <div style={{ fontSize:10.5, color: locked?T.mute:'rgba(242,238,226,.82)', marginTop:2, lineHeight:1.4 }}>{a.d}</div>
              {a.tier && locked && (
                <div style={{ marginTop:6 }}>
                  <div style={{ height:4, background:'#CFC3A8', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', background:'#C9A046',
                      width:`${Math.min(100, Math.round(doneCount / [10,25,50,80,SPECIES.length][a.tier-1] * 100))}%` }} />
                  </div>
                  <div style={{ fontSize:9, color:T.mute, marginTop:3 }}>
                    {doneCount} / {[10,25,50,80,SPECIES.length][a.tier-1]}
                  </div>
                </div>
              )}
              {!a.tier && locked && <div style={{ fontSize:9.5, color:T.mute, marginTop:4 }}>Non débloqué</div>}
              {!locked && <div style={{ fontSize:10, color:'#C9DBA4', marginTop:4, fontWeight:600 }}>{a.w}</div>}
            </div>
          </div>
        </div>
      )
    }
    const Section = ({ title, list }) => (
      <>
        <div className="serif" style={{ fontSize:13, fontWeight:700, color:T.mute, textTransform:'uppercase',
          letterSpacing:'1px', marginBottom:10 }}>{title}</div>
        <div style={{ display:'grid', gridTemplateColumns:`repeat(auto-fill,minmax(${wide?185:150}px,1fr))`,
          gap:10, marginBottom:22 }}>{list.map(a=><Card key={a.n} a={a} />)}</div>
      </>
    )
    return (
      <div style={{ padding: wide?'18px 40px 40px':'16px 20px 30px' }}>
        <div style={{ background:'#F0E4CF', border:'1px solid #DCC79E', borderRadius:12,
          padding:'12px 14px', marginBottom:20 }}>
          <div className="serif" style={{ fontSize:14, fontWeight:700, color:'#8F6A2E', marginBottom:3,
            display:'flex', alignItems:'center', gap:6 }}>
            <i className="ti ti-award" style={{ fontSize:16 }} aria-hidden="true" />
            {lang==='ru'?'Все значки трудные':'Tous les badges sont difficiles'}
          </div>
          <div style={{ fontSize:11.5, color:'#6B5330', lineHeight:1.55 }}>
            {lang==='ru'
              ? 'От 60 до 900 очков. Ни один не даётся легко — это настоящие цели на годы.'
              : 'De 60 à 900 points. Aucun ne s\'obtient par hasard — ce sont de vrais objectifs, certains sur plusieurs années.'}
          </div>
        </div>
        <Section title={lang==='ru'?'Этапы каталога':'Paliers du recensement'} list={tiers} />
        <Section title={lang==='ru'?'Испытания':'Défis de terrain'} list={rest} />
      </div>
    )
  }

  // ═════ EXPLORE (split) ═════
  const Explore = () => {
    if (!wide) {
      return (
        <div style={{ padding:'10px 14px 26px' }}>
          <div style={{ display:'flex', gap:6, marginBottom:12 }}>
            {[['map','Mindmap','ti-hierarchy-2'],['matrix','Matrice','ti-layout-grid']].map(([v,l,ic])=>(
              <button key={v} onClick={()=>setMobileTab(v)} style={{ flex:1, fontSize:13, padding:'9px', borderRadius:14, border:`1px solid ${mobileTab===v?T.clay:T.line}`, background:mobileTab===v?T.clay:'transparent', color:mobileTab===v?'#fff':T.soft, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                <i className={`ti ${ic}`} style={{ fontSize:14 }} aria-hidden="true" />{l}
              </button>
            ))}
          </div>
          <div style={{ background:T.surface, borderRadius:16, border:`1px solid ${T.line}`,
            ...(mobileTab==='map'
              ? { overflow:'hidden', height:'calc(100dvh - 230px)', minHeight:420 }
              : { overflow:'auto' }) }}>
            {mobileTab==='map' ? <MindMap onSelectSpecies={selSpFull} lang={lang} expanded={mapExpanded} setExpanded={setMapExpanded} tf={mapTf} setTf={setMapTf} edit={edit} onAddSpecies={(c,sv)=>setSpEditor({ cat:c, sub:sv })} /> : <MatrixPane compact />}
          </div>
        </div>
      )
    }

    const mapFlex = focus==='map' ? 3 : focus==='matrix' ? 1 : 1.15
    const matFlex = focus==='matrix' ? 3 : focus==='map' ? 1 : 1
    return (
      <div style={{ padding:'12px 24px 28px', display:'flex', gap:12, alignItems:'stretch', height:'calc(100vh - 132px)', minHeight:520 }}>
        <div onMouseEnter={()=>setFocus('map')} onClick={()=>setFocus('map')}
          style={{ flex:mapFlex, minWidth:0, background:T.surface, borderRadius:18, border:`1px solid ${focus==='map'?T.clay:T.line}`,
            overflow:'hidden', display:'flex', flexDirection:'column',
            transition:'flex .2s cubic-bezier(.4,0,.2,1), border-color .2s' }}>
          <PaneHeader title={t.mapTitle} icon="ti-hierarchy-2" />
          <div style={{ flex:1, overflow:'hidden' }}>
            <MindMap onSelectSpecies={selSpFull} lang={lang} expanded={mapExpanded} setExpanded={setMapExpanded} tf={mapTf} setTf={setMapTf} edit={edit} onAddSpecies={(c,sv)=>setSpEditor({ cat:c, sub:sv })} />
          </div>
        </div>
        <div onMouseEnter={()=>setFocus('matrix')} onClick={()=>setFocus('matrix')}
          style={{ flex:matFlex, minWidth:0, background:T.bg, borderRadius:18, border:`1px solid ${focus==='matrix'?T.clay:T.line}`,
            overflow:'hidden', display:'flex', flexDirection:'column',
            transition:'flex .2s cubic-bezier(.4,0,.2,1), border-color .2s' }}>
          <PaneHeader title={t.matrixTitle} icon="ti-layout-grid" />
          <div style={{ flex:1, overflowY:'auto' }}>
            <MatrixPane compact={focus!=='matrix'} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:T.bg }}>
      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding: wide?'12px 24px':'11px 16px', borderBottom:`1px solid ${T.line}`, background:T.surface, position:'sticky', top:0, zIndex:30 }}>
        <button onClick={()=>goScreen('landing')} className="serif" style={{ fontSize:20, fontWeight:900, color:T.ink, letterSpacing:'-0.5px', display:'flex', alignItems:'center', gap:7 }}>
          <BobberIcon size={19} style={{ marginRight: -2 }} />Pludini
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ display:'flex', gap:3 }}>
            {['fr','ru'].map(c=>(
              <button key={c} onClick={()=>setLang(c)} style={{ fontSize:10.5, padding:'4px 9px', borderRadius:11,
                background: lang===c?T.clay:'transparent', color: lang===c?'#fff':T.soft,
                border:`1px solid ${T.line}`, fontWeight:600 }}>{c==='fr'?'FR':'RU'}</button>
            ))}
          </div>
          {edit && (
            <button onClick={()=>setIdPicker(true)} style={{ fontSize:10.5, color:'#B5602F', fontWeight:600,
              background:'#F0DDD0', padding:'4px 9px', borderRadius:12, display:'inline-flex',
              alignItems:'center', gap:5 }}>
              <i className="ti ti-user" style={{ fontSize:12 }} aria-hidden="true" />
              {getMe() || (lang==='ru'?'Кто вы?':'Qui es-tu ?')}
            </button>
          )}
          <button onClick={()=>edit?setEdit(false):setPwOpen(true)} style={{ fontSize:11.5, color:T.soft, padding:'5px 10px', borderRadius:14, border:`1px solid ${T.line}`, display:'flex', alignItems:'center', gap:4 }}>
            <i className="ti ti-pencil" style={{ fontSize:13 }} aria-hidden="true" />{wide && (edit?'Quitter':'Édition')}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:'flex', gap:8, padding: wide?'14px 24px 0':'12px 16px 0', flexWrap:'wrap', alignItems:'center' }}>
        {[['explore',t.explore,'ti-map-2'],['person',t.byPerson,'ti-users'],['scores',t.scores,'ti-trophy'],['badges',t.badges,'ti-award']].map(([id,label,icon])=>{
          const on = nav===id
          return (
            <button key={id} onClick={()=>setNav(id)} className="serif"
              style={{ fontSize: wide?17:15, fontWeight:on?900:500, color:on?'#fff':T.ink,
                background:on?T.clay:'transparent', padding: wide?'9px 18px':'8px 14px', borderRadius:24,
                border:on?'none':`1px solid ${T.line}`, display:'flex', alignItems:'center', gap:6 }}>
              <i className={`ti ${icon}`} style={{ fontSize:16 }} aria-hidden="true" />{label}
            </button>
          )
        })}
        {nav==='explore' && (
          <button onClick={()=>edit?setSighting({}):setPwOpen(true)} className="serif"
            style={{ fontSize: wide?17:15, fontWeight:600, color:'#fff', background:T.clay,
              padding: wide?'9px 18px':'8px 14px', borderRadius:24, display:'flex',
              alignItems:'center', gap:6, marginLeft:'auto' }}>
            <i className="ti ti-eye-plus" style={{ fontSize:16 }} aria-hidden="true" />
            {wide?(lang==='ru'?'Новое наблюдение':'Noter une observation'):(lang==='ru'?'Наблюдение':'Observer')}
          </button>
        )}
        {nav==='explore' && (
          <button onClick={()=>edit?setSpEditor({}):setPwOpen(true)} className="serif"
            style={{ fontSize: wide?17:15, fontWeight:600, color:'#fff', background:T.sageDark, padding: wide?'9px 18px':'8px 14px', borderRadius:24, display:'flex', alignItems:'center', gap:6 }}>
            <i className="ti ti-plus" style={{ fontSize:16 }} aria-hidden="true" />{wide?(lang==='ru'?'Новый вид':'Nouvelle espèce'):(lang==='ru'?'Вид':'Espèce')}
          </button>
        )}
      </div>

      {nav==='explore' && <Explore />}
      {nav==='person' && <ByPerson wide={wide} lang={lang} onSelectSpecies={selSpFull} />}
      {nav==='scores' && <Scores />}
      {nav==='badges' && <Badges />}

      {curSp && <Detail />}
      {curInd && <IndividuSheet />}
      {curPlayer && <ScoreSheet />}
      {promoting && <PromoteSheet sp={promoting.sp} ind={promoting.ind} lang={lang} wide={wide}
        onClose={()=>setPromoting(null)} onDone={()=>{ setPromoting(null); setRefresh(r=>r+1) }} />}
      {confirmDelSighting && <ConfirmDialog lang={lang}
        title={lang==='ru'?'Удалить это наблюдение?':'Supprimer cette observation ?'}
        message={lang==='ru'?'Это действие необратимо.':'Cette action est irréversible.'}
        onCancel={()=>setConfirmDelSighting(null)}
        onConfirm={async()=>{ await removeSighting(confirmDelSighting.sp.id, confirmDelSighting.ind.n);
          setConfirmDelSighting(null); setCurInd(null); setRefresh(r=>r+1) }} />}
      {idPicker && <IdentityPicker lang={lang} onClose={()=>setIdPicker(false)} />}
      {spEditor && <SpeciesEditor lang={lang} initial={spEditor.initial} presetCat={spEditor.cat}
        presetSub={spEditor.sub} onClose={()=>setSpEditor(null)} onSaved={()=>setRefresh(r=>r+1)}
        onDeleted={()=>{ setCurSp(null); setRefresh(r=>r+1) }} />}
      {sighting && <SightingEditor lang={lang} species={SPECIES} presetSp={sighting.sp} editing={sighting.editing}
        onClose={()=>setSighting(null)}
        onSaved={(id)=>{ setRefresh(r=>r+1); if (sighting.editing) setCurInd(null); else if(id) selSpFull(id) }} />}
      {photoTarget && <PhotoManager target={photoTarget.target} label={photoTarget.label} lang={lang} onClose={()=>setPhotoTarget(null)} />}
      {toast && <Toast msg={toast} />}

      {pwOpen && <PwModal lang={lang} pw={pw} setPw={setPw} onSubmit={submitPw}
        onClose={()=>{ setPwOpen(false); setPw('') }} />}
    </div>
  )
}



function PromoteSheet({ sp, ind, lang, wide, onClose, onDone }) {
  const [name, setName] = useState(ind.displayName || ind.n)
  const [traits, setTraits] = useState(ind.traits || '')
  const already = !!namedOf(sp.id, ind.n)
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.62)', zIndex:130,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#EDE7D8', borderRadius:18, padding:22,
        width:'100%', maxWidth:400, border:'1px solid #D3C7AE' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
          <span style={{ fontSize:20 }}>⭐</span>
          <div className="serif" style={{ fontSize:18, fontWeight:900, color:'#2B2620' }}>
            {lang==='ru'?'Опознать особь':'Reconnaître un individu'}
          </div>
        </div>
        <div style={{ fontSize:12, color:'#6B6357', lineHeight:1.55, marginBottom:14 }}>
          {lang==='ru'
            ? 'Если вы узнаёте это животное по приметам — дайте ему имя. Оно станет постоянной особью.'
            : "Si tu reconnais cet animal à des signes distinctifs, donne-lui un nom. Il devient alors un individu récurrent qu\'on pourra suivre dans le temps."}
        </div>
        <label style={{ fontSize:11, color:'#9A9081', display:'block', marginBottom:4 }}>
          {lang==='ru'?'Имя':'Nom'}
        </label>
        <input value={name} onChange={e=>setName(e.target.value)} autoFocus
          style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid #D3C7AE',
            background:'#E6DDC8', fontSize:14, color:'#2B2620', marginBottom:11 }} />
        <label style={{ fontSize:11, color:'#9A9081', display:'block', marginBottom:4 }}>
          {lang==='ru'?'Приметы':'Signes distinctifs'}
        </label>
        <textarea value={traits} onChange={e=>setTraits(e.target.value)} rows={3}
          placeholder={lang==='ru'?'Шрам, окрас, размер…':'Cicatrice, tache, taille des bois…'}
          style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid #D3C7AE',
            background:'#E6DDC8', fontSize:12.5, color:'#2B2620', marginBottom:14, resize:'vertical' }} />
        <div style={{ display:'flex', gap:8 }}>
          {already && (
            <button onClick={async()=>{ await demote(sp.id, ind.n); onDone() }}
              style={{ padding:'10px 14px', borderRadius:10, border:'1px solid #D3C7AE', color:'#6B6357', fontSize:12.5 }}>
              {lang==='ru'?'Убрать':'Retirer'}
            </button>
          )}
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:10,
            border:'1px solid #D3C7AE', color:'#6B6357', fontSize:13 }}>
            {lang==='ru'?'Отмена':'Annuler'}
          </button>
          <button onClick={async()=>{ if(name.trim()){ await promote(sp.id, ind.n, name.trim(), traits.trim()); onDone() } }}
            className="serif" style={{ flex:1.4, padding:'10px', borderRadius:10, background:'#B5602F',
              color:'#fff', fontSize:13.5, fontWeight:700 }}>
            {lang==='ru'?'Опознать':'Reconnaître'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ObsCell({ spId, indName, method, label, named }) {
  const { photos } = usePhotos(`ind:${spId}:${indName}`)
  const ph = photos[0]
  const ico = method==='eye'?'👁':method==='scope'?'🔭':method==='night'?'🌙':'📷'
  return (
    <span title={label} style={{ position:'relative', width:38, height:30, borderRadius:6, overflow:'hidden',
      display:'inline-block', flexShrink:0,
      border: named?'1.5px solid #C9A046':'1px solid #D3C7AE',
      boxShadow: named?'0 0 0 1px rgba(201,160,70,.25)':'none',
      background: ph?'#1E2418':'#DDD3BE' }}>
      {ph && <img src={ph.thumbUrl || ph.url} alt="" loading="lazy"
        style={{ width:'100%', height:'100%', objectFit:'cover', filter:LUT, display:'block' }} />}
      <span style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(14,16,10,.72)',
        color:'#F2EEE2', fontSize:7, lineHeight:'10px', textAlign:'center' }}>{ico}</span>
    </span>
  )
}

function SpeciesCell({ spId, method, label }) {
  const { photos } = usePhotos(`sp:${spId}`)
  const ph = photos[0]
  const ico = method==='eye'?'👁':method==='scope'?'🔭':method==='night'?'🌙':'📷'
  return (
    <span title={label} style={{ position:'relative', width:38, height:30, borderRadius:6, overflow:'hidden',
      display:'inline-block', flexShrink:0, border:'1px solid #D3C7AE', background: ph?'#1E2418':'#DDD3BE' }}>
      {ph && <img src={ph.thumbUrl || ph.url} alt="" loading="lazy"
        style={{ width:'100%', height:'100%', objectFit:'cover', filter:LUT, display:'block' }} />}
      <span style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(14,16,10,.72)',
        color:'#F2EEE2', fontSize:7, lineHeight:'10px', textAlign:'center' }}>{ico}</span>
    </span>
  )
}

function IndPhotos({ spId, indName }) {
  const { photos } = usePhotos(`ind:${spId}:${indName}`)
  if (photos.length < 2) return null
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(96px,1fr))', gap:7, marginBottom:9 }}>
      {photos.slice(1).map(p=>(
        <div key={p.id} style={{ borderRadius:10, overflow:'hidden', border:'1px solid #D3C7AE', aspectRatio:'1/1' }}>
          <img src={p.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', filter:LUT, display:'block' }} />
        </div>
      ))}
    </div>
  )
}

function Shell({ children, lang, setLang, onHome }) {
  return (
    <div style={{ minHeight:'100vh', background:'#EDE7D8' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 24px', borderBottom:'1px solid #D3C7AE', background:'#E3DAC5', position:'sticky', top:0, zIndex:30 }}>
        <button onClick={onHome} className="serif" style={{ fontSize:20, fontWeight:900, color:'#2B2620',
          display:'flex', alignItems:'center', gap:7 }}>
          <BobberIcon size={19} style={{ marginRight: -2 }} />Pludini
        </button>
        <div style={{ display:'flex', gap:5 }}>
          {['fr','ru'].map(c=>(
            <button key={c} onClick={()=>setLang(c)} style={{ fontSize:11, padding:'4px 10px', borderRadius:12,
              background: lang===c?'#B5602F':'transparent', color: lang===c?'#fff':'#6B6357',
              border:'1px solid #D3C7AE', fontWeight:600 }}>{c==='fr'?'FR':'RU'}</button>
          ))}
        </div>
      </div>
      {children}
    </div>
  )
}

function MiniMap({ gps }) {
  const [lat, lon] = gps
  return (
    <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid #D3C7AE', marginBottom:9 }}>
      <SatMap center={{ lat, lon }} pins={[{ id:'p', lat, lon, color:'#B5602F', emoji:'📍' }]} height={170} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 11px', background:'#E6DDC8', fontSize:11, color:'#6B6357' }}>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <i className="ti ti-map-pin" style={{ fontSize:13, color:'#B5602F' }} aria-hidden="true" />
          {lat.toFixed(4)}° N · {lon.toFixed(4)}° E
        </span>
        <a href={`https://www.google.com/maps/@${lat},${lon},17z/data=!3m1!1e3`} target="_blank" rel="noreferrer" style={{ color:'#8F4A22', textDecoration:'none', fontWeight:600 }}>Ouvrir ↗</a>
      </div>
    </div>
  )
}

function Toast({ msg }) {
  return (
    <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:90,
      background:'#2B2620', color:'#F2EEE2', padding:'13px 20px', borderRadius:14, fontSize:13,
      maxWidth:'90vw', boxShadow:'0 8px 28px rgba(0,0,0,0.25)', display:'flex', alignItems:'center', gap:9 }}>
      <i className="ti ti-alert-circle" style={{ fontSize:17, color:'#C8DBA4' }} aria-hidden="true" />
      <span>{msg}</span>
    </div>
  )
}
