import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { SPECIES as _BASE, CATS as _BASECATS, RARITY, METHODS, SIZE_MULT, ACHIEVEMENTS, calcPts, totalPts, speciesPts, badgePts, isObserved,
         OBS_STATES, OBS_STATE_COLOR, obsStateLabel } from './data'
import MindMap from './mindmap.jsx'
import SatMap from './satmap.jsx'
import { gradientFor, gradientForCat, catAccentColor } from './gradients.js'
import { UI, nameOf, catNameOf } from './i18n.js'
import { Calendar, Territory, Gallery, ByPerson } from './screens.jsx'
import Experience from './experience.jsx'
import { PhotoManager, PhotoBg, PhotoHero, PhotoHeroSpecies, usePhotos, LUT, thumbZoomStyle } from './photoui.jsx'
import { loadAll, subscribe, allSpecies, allPlayers, allCats, splitInds, promote, demote, mergeAsIndividual,
         namedOf, getMe, setMe, isReady, totalPtsLive, speciesPtsLive, badgePtsLive, calcPtsLive,
         removeSighting, setObservation, setBlurry, speciesType, isVegetal, isFish, photosFor, sightingsNearGps, setUncertain,
         REPEAT_PASSAGE_MULT } from './store.js'
import { IdentityPicker, SpeciesEditor, SightingEditor, ConfirmDialog } from './editui.jsx'
import { AddObservation } from './addobs.jsx'
import Quiz from './quiz.jsx'
import { ForumPage } from './forum.jsx'
import { RewardBurst, tierFor } from './reward.jsx'
import Farm from './farm.jsx'

const T = {
  bg:'#EDE7D8', surface:'#E3DAC5', card:'#E6DDC8',
  ink:'#2B2620', soft:'#6B6357', mute:'#9A9081',
  line:'#D3C7AE', lineSoft:'#DAD0BA',
  clay:'#B5602F', clayDark:'#8F4A22', sage:'#7A8B5C', sageDark:'#4A5D32',
  leaf:'#C8DBA4',
}

function BobberIcon({ size = 20, style }) {
  return <img src="/icons/bobber-mark.png" width={size} height={size} style={style} alt="" aria-hidden="true" />
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
      <div style={{ position:'absolute', inset:0, transform: hover?'scale(1.15)':'scale(1)', transition:'transform .35s ease' }}>
        <PhotoBg target={`site:card:${c.k}`} thumb={false} fallback="transparent" />
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

// ── Bouton flottant, présent sur toutes les pages : entrer/quitter le mode
// édition. Auparavant introuvable sur Accueil (une fois actif) et sur
// Calendrier/Territoire/Galerie, qui n'avaient aucun bouton du tout ──
function EditToggleBtn({ editMode, onToggle, lang }) {
  return (
    <button onClick={onToggle} style={{ position:'fixed', bottom:16, right:16, zIndex:20,
      background: editMode ? 'rgba(181,96,47,.88)' : 'rgba(43,38,32,.72)', color:'#EDE7D8',
      borderRadius:20, padding:'8px 14px', fontSize:11.5, display:'flex', alignItems:'center', gap:5 }}>
      <i className={`ti ${editMode?'ti-check':'ti-pencil'}`} style={{ fontSize:13 }} aria-hidden="true" />
      {editMode ? (lang==='ru'?'Готово':'Quitter') : (lang==='ru'?'Правка':'Édition')}
    </button>
  )
}

// ══════════════════ LANDING ══════════════════
function Landing({ lang, setLang, go, onQuiz, edit, editMode, onToggleEdit, onEditHero, onEditCard }) {
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
        {/* assombrit légèrement juste derrière le texte central, pas toute la photo */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none',
          background:'radial-gradient(ellipse 55% 42% at 50% 50%, rgba(0,0,0,.3) 0%, rgba(0,0,0,0) 72%)' }} />
        {edit && (
          <button onClick={onEditHero} style={{ position:'absolute', top:64, right:20, zIndex:4,
            background:'rgba(0,0,0,.5)', color:'#fff', borderRadius:14, padding:'7px 13px',
            fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
            <i className="ti ti-camera-plus" style={{ fontSize:14 }} aria-hidden="true" />
            {lang==='ru'?'Фон':'Changer l\u2019image'}
          </button>
        )}
        <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:5, padding: wide?'20px 32px':'16px 18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <BobberIcon size={22} />
              <div className="serif" style={{ fontSize: wide?21.6:19.2, fontWeight:600, color:'#F2EEE2' }}>Pludini Doc</div>
            </div>
            <div style={{ display:'flex', gap:5 }}>
              {['fr','ru'].map(c=>(
                <button key={c} onClick={()=>setLang(c)} style={{ fontSize:10.5, padding:'4px 9px', borderRadius:12,
                  background: lang===c?'rgba(242,238,226,.9)':'rgba(242,238,226,.13)',
                  color: lang===c?'#2B2620':'rgba(242,238,226,.8)', fontWeight:600,
                  border:'1px solid rgba(242,238,226,.28)' }}>{c==='fr'?'FR':'RU'}</button>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:3, marginTop:6, alignItems:'flex-start' }}>
            <button onClick={()=>go('experience')} style={{ display:'flex', alignItems:'center', gap:6, color:'#F2EEE2', fontSize: wide?14:13 }}>
              <i className="ti ti-arrow-left" aria-hidden="true" />Pludini Host
            </button>
            <button onClick={()=>go('farm')} style={{ display:'flex', alignItems:'center', gap:6, color:'rgba(242,238,226,.75)', fontSize: wide?14:13 }}>
              <i className="ti ti-arrow-left" aria-hidden="true" />Pludini Farm
            </button>
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

      <div style={{ padding: wide?'26px 40px 26px':'16px 16px 16px', textAlign:'center' }}>
        <h2 className="serif" style={{ fontSize: wide?26:20, fontWeight:700, color:'#2B2620' }}>
          {lang==='ru'?'Наша история':'Notre histoire'}
        </h2>
      </div>
      <div style={{ padding: wide?'0 40px 10px':'0 16px 8px', textAlign:'center', maxWidth:720, margin:'0 auto' }}>
        {(lang==='ru' ? [
          'Всё началось с фотоловушки, закреплённой на дереве в глубине леса. Я просто хотел увидеть, кто проходит здесь по ночам.',
          'Через несколько недель — сотни фотографий. Лиса на рассвете, косуля, щиплющая траву, и однажды — пятнистый силуэт, бесшумно пересекающий кадр: рысь.',
          'Понять что-либо в этой дикой жизни, разбросанной по тысячам файлов, было невозможно. Всё это нужно было классифицировать, дать имена, даты, места. Знать, кто здесь живёт, кто проходит мимо, кто возвращается.',
          'Желание навести порядок во всём, что меня окружает, было слишком сильным — но никакой унылой таблицы. Мне хотелось игру, коллекцию, Заповедник живой природы, где каждый замеченный вид — маленькая победа. Не только животные: деревья, грибы, цветы — всё, что населяет эти леса, озёра и эту реку.',
          'Ничего этого не было бы без Елены, придумавшей это чудесное — сотворить такой райский сад. Спасибо, что подарила нам такое место — исследовать и любить.',
        ] : [
          'Tout a commencé avec une caméra piège, accrochée à un arbre au fond de la forêt. Je voulais juste voir qui passait par là, la nuit.',
          'Quelques semaines plus tard : des centaines de photos. Un renard au petit matin, un chevreuil qui broute, et un jour une silhouette tachetée qui traverse le cadre sans un bruit — un lynx.',
          'Impossible de comprendre quoi que ce soit à une vie sauvage éparpillée dans des milliers de fichiers. Il fallait classer tout ça, mettre des noms, des dates, des lieux. Savoir qui vit ici, qui passe, qui revient.',
          'L’envie d’ordonner tout ce qui m’entoure était trop forte — mais pas question d’un tableur triste. Je voulais un jeu, une collection, un Conservatoire du vivant où chaque espèce observée est une petite victoire. Pas seulement les animaux : les arbres, les champignons, les fleurs, tout ce qui peuple ces forêts, ces lacs et cette rivière.',
          'Rien de tout cela n’existerait sans Elena, qui a eu la merveilleuse idée de façonner ce jardin d’Éden. Merci de nous avoir offert un endroit pareil à explorer et à aimer.',
        ]).map((p,i)=>(
          <p key={i} style={{ fontSize: wide?12:11, lineHeight:1.55, color:'#9A9081', textAlign:'left', marginTop: i===0?0:7 }}>{p}</p>
        ))}
      </div>

      <div style={{ position:'relative', height: wide?300:220, margin: wide?'26px 40px 60px':'20px 16px 44px',
        borderRadius:18, overflow:'hidden' }}>
        <PhotoBg target="site:card:contact" thumb={false} fallback="linear-gradient(150deg,#3E5233 0%,#7A8B5C 100%)" />
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

      <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', justifyContent:'space-between',
        margin: wide?'0 40px 40px':'0 16px 30px', padding: wide?'16px 22px':'14px 16px',
        borderRadius:16, border:'1px solid #D3C7AE', background:'#E6DDC8' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <i className={`ti ${installed?'ti-message-circle':'ti-device-mobile-plus'}`} style={{ fontSize:20, color:'#B5602F' }} aria-hidden="true" />
          <div style={{ fontSize:12.5, color:'#6B6357', lineHeight:1.5 }}>
            {installed
              ? (lang==='ru'?'Обсуждения и идеи для сайта.':'Discussions et idées pour le site.')
              : (lang==='ru'?'Добавьте Pludini на главный экран телефона.':'Ajoute Pludini à l’écran d’accueil de ton téléphone.')}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          {!installed && (
            <button onClick={onInstallClick} className="serif" style={{ padding:'9px 16px', borderRadius:12,
              background:'#B5602F', color:'#fff', fontSize:12.5, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
              <i className="ti ti-download" style={{ fontSize:14 }} aria-hidden="true" />
              {lang==='ru'?'Установить':'Installer l’app'}
            </button>
          )}
          <button onClick={()=>go('forum')} className="serif" style={{ padding:'9px 16px', minWidth:165, borderRadius:12,
            background:'#B5602F', color:'#fff', fontSize:12.5, fontWeight:700, display:'flex', alignItems:'center',
            justifyContent:'center', gap:6 }}>
            <i className="ti ti-message-circle-2" style={{ fontSize:14 }} aria-hidden="true" />
            {lang==='ru'?'Форум':'Forum'}
          </button>
        </div>
      </div>

      {installHint && <InstallHint lang={lang} isIOS={isIOS} onClose={()=>setInstallHint(false)} />}
      <EditToggleBtn editMode={editMode} onToggle={onToggleEdit} lang={lang} />
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
          {lang==='ru'?'Введите пароль.':'Entre le mot de passe pour modifier le Conservatoire.'}
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

// URLs partagées directement vers un écran précis — / est Pludini Host (page
// publique du domaine), Pludini Doc (l'inventaire) vit sur /doc ; /host et
// /pokedex restent en redirection d'écran pour ne pas casser d'anciens liens
// déjà partagés (le Pokédex s'appelle désormais "Le Conservatoire")
const PATH_SCREENS = { '/': 'experience', '/host': 'experience', '/doc': 'landing', '/conservatoire': 'app', '/pokedex': 'app', '/farm': 'farm' }
const SCREEN_PATHS = { landing: '/doc', experience: '/', app: '/conservatoire', farm: '/farm' }

// ══════════════════ APP ══════════════════
export default function App() {
  const wide = useWide()
  // /host et /conservatoire sont de vraies URLs partageables (aperçu de lien dédié
  // pour /host via middleware.js) : elles doivent toujours ouvrir le bon écran,
  // même si le dernier écran mémorisé était différent — sinon un lien partagé
  // n'amènerait pas au bon endroit
  const [screen, setScreen] = useState(() => {
    try {
      const fromPath = PATH_SCREENS[window.location.pathname.replace(/\/$/, '') || '/']
      if (fromPath) return fromPath
      return localStorage.getItem('pludini_screen') || localStorage.getItem('pluduni_screen') || 'landing'
    } catch { return 'landing' }
  })
  // langue par défaut à la toute première ouverture : celle du téléphone si
  // elle est prise en charge (russe), sinon français — puis mémorisée dès
  // qu'un choix (auto ou manuel) a été fait, pour ne plus jamais redevenir
  // dépendante de la langue du navigateur ensuite
  const [lang, setLangRaw] = useState(() => {
    try {
      const stored = localStorage.getItem('pludini_lang')
      if (stored) return stored
      const nav = (navigator.language || navigator.userLanguage || '').toLowerCase()
      return nav.startsWith('ru') ? 'ru' : 'fr'
    } catch { return 'fr' }
  })
  const setLang = (l) => { setLangRaw(l); try { localStorage.setItem('pludini_lang', l) } catch {} }
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
  const [reward, setReward] = useState(null) // {points, tier} — feedback à l'enregistrement d'une observation
  const [mobileTab, setMobileTab] = useState('map')
  const [focus, setFocus] = useState(null)        // 'map' | 'matrix' | null
  const [curInd, setCurInd] = useState(null)      // individu ouvert
  const [curPlayer, setCurPlayer] = useState(null) // detail score
  const [scoreCat, setScoreCat] = useState('all')  // filtre règne dans la fiche score
  const [photoTarget, setPhotoTarget] = useState(null) // {target,label}
  const [promoting, setPromoting] = useState(null)   // {sp, ind}
  const [merging, setMerging] = useState(null)        // {spId, selected:Set<string>} — mode multi-sélection des passages
  const [mergeSheet, setMergeSheet] = useState(null)  // {sp, indNames} — fenêtre de nommage après sélection
  const [confirmDelSighting, setConfirmDelSighting] = useState(null) // {sp, ind}
  const [confirmClearObs, setConfirmClearObs] = useState(null) // {sp, player}
  const [refresh, setRefresh] = useState(0)
  const [mapExpanded, setMapExpanded] = useState(() => new Set())
  const [mapTf, setMapTf] = useState({ x: 0, y: 0, k: 1 })
  const [mapObsOnly, setMapObsOnly] = useState(() => new Set())

  const [spEditor, setSpEditor] = useState(null)   // {initial?, presetCat?, presetSub?}
  const [sighting, setSighting] = useState(null)
  const [idPicker, setIdPicker] = useState(false)
  const [showCalendar, setShowCalendar] = useState(null) // espèce dont on affiche le calendrier des passages

  useEffect(() => {
    loadAll().then(()=>setRefresh(r=>r+1))
    return subscribe(()=>setRefresh(r=>r+1))
  }, [])

  useEffect(() => { try { localStorage.setItem('pludini_screen', screen) } catch {} }, [screen])
  useEffect(() => { try { localStorage.setItem('pludini_edit', edit ? '1' : '0') } catch {} }, [edit])

  // bloque le scroll de la page derrière une fenêtre plein écran (fiche espèce,
  // score, etc.) : sans ça, sur mobile, un geste de défilement dans la fenêtre
  // peut "rebondir" jusqu'au corps de page en dessous et faire bouger toute
  // la page — elle doit rester parfaitement fixe pendant qu'une fenêtre est ouverte
  const anyModalOpen = !!(curSp || curPlayer || promoting || mergeSheet || spEditor || sighting || idPicker || showCalendar || photoTarget)
  useEffect(() => {
    if (!anyModalOpen) return
    const scrollY = window.scrollY
    const { style } = document.body
    const prev = { position: style.position, top: style.top, width: style.width, overflow: style.overflow }
    style.position = 'fixed'
    style.top = `-${scrollY}px`
    style.width = '100%'
    style.overflow = 'hidden'
    return () => {
      style.position = prev.position
      style.top = prev.top
      style.width = prev.width
      style.overflow = prev.overflow
      window.scrollTo(0, scrollY)
    }
  }, [anyModalOpen])

  // mémorise la position de défilement de chaque écran — le scroll brut du navigateur
  // ne s'applique pas à la nouvelle mise en page et donne des sauts incohérents
  const scrollPos = useRef({})
  // idem pour le panneau Matrice : ouvrir une fiche espèce redéfinit le composant
  // Explore/MatrixPane (déclarés en interne à App) à chaque re-rendu, donc le
  // panneau est démonté/remonté et perd son scroll natif — restauré manuellement
  const matrixScrollTop = useRef(0)
  // même souci pour la fiche espèce : ouvrir/fermer un individu (curInd) redéfinit
  // Detail à chaque fois, donc son scroll interne repart à 0 — d'où l'impression de
  // "remonter en haut" en cliquant une vignette de passage puis en la refermant
  const detailScrollTop = useRef({})
  // seuls landing ("Pludini Doc"), experience ("Pludini Host") et app ("Le
  // Conservatoire") ont une URL dédiée (/doc, /, /conservatoire) — ce sont les seules
  // pages qu'on partage avec un lien direct (aperçu de lien propre pour
  // chacune) ; les autres écrans restent de simples états internes
  const goScreen = (s) => {
    scrollPos.current[screen] = window.scrollY
    setScreen(s)
    const path = SCREEN_PATHS[s]
    if (path) { try { window.history.pushState({ screen: s }, '', path) } catch {} }
  }
  useEffect(() => { window.scrollTo(0, scrollPos.current[screen] || 0) }, [screen])
  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname.replace(/\/$/, '') || '/'
      setScreen(PATH_SCREENS[path] || 'landing')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const SPECIES = allSpecies()
  const CATS = allCats()
  const PLAYERS = allPlayers().filter(p=>!p.demo)
  const ALL_PLAYERS = allPlayers()

  const sp = SPECIES.find(s => s.id === curSp)
  const catObj = CATS.find(c => c.id === curCat)

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 3200) }
  const triggerReward = (points) => { if (points > 0) setReward({ points, tier: tierFor(points) }) }
  const selSpFull = (id) => { const s = SPECIES.find(x=>x.id===id); setCurCat(s?.cat); setCurSp(id); setDetTab('obs') }

  const submitPw = () => { if (pw==='arbalete'){ setEdit(true); setPwOpen(false); setPw(''); if(!getMe()) setIdPicker(true) } else setPw('') }
  const toggleEdit = () => edit ? setEdit(false) : setPwOpen(true)
  // seul Ferdinand peut changer les images du fond d'accueil et des menus
  // (le reste du mode édition — espèces, observations — reste ouvert à tous)
  const canEditImages = edit && getMe() === 'Ferdinand'

  const t = UI[lang]

  if (screen === 'lang') return <LangPicker onPick={(c)=>{ setLang(c); setScreen('landing') }} />
  if (screen === 'landing') return (
    <>
      <Landing lang={lang} setLang={setLang} go={goScreen} onQuiz={()=>goScreen('quiz')}
        edit={canEditImages} editMode={edit} onToggleEdit={toggleEdit}
        onEditHero={()=>setPhotoTarget({ target:'site:hero', label:lang==='ru'?'Главное фото':'Image d\u2019accueil' })}
        onEditCard={(c)=>setPhotoTarget({ target:`site:card:${c.k}`, label:c.title })} />
      {photoTarget && <PhotoManager target={photoTarget.target} label={photoTarget.label} lang={lang} onClose={()=>setPhotoTarget(null)} />}
      {pwOpen && <PwModal lang={lang} pw={pw} setPw={setPw} onSubmit={submitPw}
        onClose={()=>{ setPwOpen(false); setPw('') }} />}
      {idPicker && <IdentityPicker lang={lang} onClose={()=>setIdPicker(false)} />}
      {toast && <Toast msg={toast} />}
    </>
  )
  if (screen === 'experience') return <Experience wide={wide} onBack={()=>goScreen('landing')} onGoFarm={()=>goScreen('farm')} />
  if (screen === 'farm') return <Farm wide={wide} onBack={()=>goScreen('landing')} onGoHost={()=>goScreen('experience')} />
  // Calendrier/Territoire/Galerie : même bouton flottant que sur Accueil pour
  // entrer/quitter le mode édition, plus le mot de passe qui va avec — ces
  // pages n'avaient jusqu'ici aucun moyen d'y accéder ni d'en sortir
  if (screen === 'calendar') return (
    <>
      <Shell lang={lang} setLang={setLang} onHome={()=>goScreen('landing')} edit={edit} onToggleEdit={toggleEdit}
        pageTitle={lang==='ru'?'Календарь':'Calendrier'}>
        <Calendar wide={wide} lang={lang} onBack={()=>goScreen('landing')} edit={edit} />
      </Shell>
      {pwOpen && <PwModal lang={lang} pw={pw} setPw={setPw} onSubmit={submitPw} onClose={()=>{ setPwOpen(false); setPw('') }} />}
      {idPicker && <IdentityPicker lang={lang} onClose={()=>setIdPicker(false)} />}
    </>
  )
  if (screen === 'territory') return (
    <>
      <Shell lang={lang} setLang={setLang} onHome={()=>goScreen('landing')} edit={edit} onToggleEdit={toggleEdit}
        pageTitle={lang==='ru'?'Территория':'Territoire'}>
        <Territory wide={wide} lang={lang} edit={edit} onBack={()=>goScreen('landing')} />
      </Shell>
      {pwOpen && <PwModal lang={lang} pw={pw} setPw={setPw} onSubmit={submitPw} onClose={()=>{ setPwOpen(false); setPw('') }} />}
      {idPicker && <IdentityPicker lang={lang} onClose={()=>setIdPicker(false)} />}
    </>
  )
  if (screen === 'gallery')   return (
    <>
      <Shell lang={lang} setLang={setLang} onHome={()=>goScreen('landing')} edit={edit} onToggleEdit={toggleEdit}
        pageTitle={lang==='ru'?'Галерея':'Galerie'}>
        <Gallery wide={wide} lang={lang} onBack={()=>goScreen('landing')} />
      </Shell>
      {pwOpen && <PwModal lang={lang} pw={pw} setPw={setPw} onSubmit={submitPw} onClose={()=>{ setPwOpen(false); setPw('') }} />}
      {idPicker && <IdentityPicker lang={lang} onClose={()=>setIdPicker(false)} />}
    </>
  )
  if (screen === 'quiz')      return (
    <>
      <Shell lang={lang} setLang={setLang} onHome={()=>goScreen('landing')} edit={edit} onToggleEdit={toggleEdit}
        pageTitle={lang==='ru'?'Викторина':'Le Quiz'}>
        <Quiz wide={wide} lang={lang} onBack={()=>goScreen('landing')} edit={edit} />
      </Shell>
      {pwOpen && <PwModal lang={lang} pw={pw} setPw={setPw} onSubmit={submitPw} onClose={()=>{ setPwOpen(false); setPw('') }} />}
      {idPicker && <IdentityPicker lang={lang} onClose={()=>setIdPicker(false)} />}
    </>
  )
  if (screen === 'forum')    return (
    <>
      <Shell lang={lang} setLang={setLang} onHome={()=>goScreen('landing')} edit={edit} onToggleEdit={toggleEdit}
        pageTitle={lang==='ru'?'Форум':'Le Forum'}>
        <ForumPage wide={wide} lang={lang} onBack={()=>goScreen('landing')} edit={edit} />
      </Shell>
      {pwOpen && <PwModal lang={lang} pw={pw} setPw={setPw} onSubmit={submitPw} onClose={()=>{ setPwOpen(false); setPw('') }} />}
      {idPicker && <IdentityPicker lang={lang} onClose={()=>setIdPicker(false)} />}
    </>
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
          // bande de luminosité par ordre (sous-famille) : chaque changement de
          // "sub" alterne la teinte, pour repérer les zones d'un coup d'œil
          // sans introduire de nouvelles couleurs — juste plus ou moins clair
          let curSub = null, bandOn = false
          const bands = list.map(s => { if (s.sub !== curSub) { curSub = s.sub; bandOn = !bandOn }; return bandOn })
          const catColor = catAccentColor(cat.id)
          return (
            <div key={cat.id} style={{ marginBottom:26, paddingLeft:14, borderLeft:`4px solid ${catColor}` }}>
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
              {cat.niche && <div style={{ fontSize:11.5, color:T.mute, fontStyle:'italic', lineHeight:1.55, marginBottom:9, maxWidth:720 }}>{cat.niche}</div>}
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, tableLayout:'fixed' }}>
                <thead><tr>
                  <th style={{ width:200, textAlign:'left', padding:'7px 8px', color:T.mute, fontWeight:500, fontSize:10.5, borderBottom:`1.5px solid ${T.line}` }}>{lang==='ru'?'Вид':'Espèce'}</th>
                  {cols.map(p=>(
                    <th key={p.id} style={{ padding:'7px 8px', textAlign:'center', borderBottom:`1.5px solid ${T.line}`,
                      borderLeft:`1px solid ${T.lineSoft}`, width:110, background:p.demo?'rgba(211,199,174,.18)':'transparent' }}>
                      <div className="serif" style={{ fontSize:13, fontWeight:700, color:T.ink }}>{p.name}</div>
                    </th>
                  ))}
                </tr></thead>
                <tbody>
                  {list.map((s,si)=>{
                    const r = (RARITY[s.r]||RARITY.commun), o = isObserved(s), nm = nameOf(s, lang)
                    const newGroup = si===0 || list[si-1].sub !== s.sub
                    const groupBorder = newGroup && si>0 ? `1px solid ${T.line}` : 'none'
                    return (
                      <tr key={s.id} style={{ opacity:o?1:.5, background: bands[si] ? 'rgba(180,166,136,.13)' : 'transparent' }}>
                        <td onClick={()=>selSpFull(s.id)} style={{ padding:'7px 8px', borderBottom:`1px solid ${T.lineSoft}`, borderTop:groupBorder, cursor:'pointer' }}>
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
                              borderBottom:`1px solid ${T.lineSoft}`, borderLeft:`1px solid ${T.lineSoft}`, borderTop:groupBorder,
                              textAlign:'center', cursor:'pointer' }}>
                              {best ? (
                                mine.length>0 ? (
                                  <span style={{ display:'flex', gap:3, flexWrap:'wrap', justifyContent:'center' }}>
                                    {mine.slice(0,2).map((ind,i)=>(
                                      <span key={i} style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                                        <ObsCell spId={s.id} indName={ind.n} method={best} named={ind.named} uncertain={ind.uncertain}
                                          label={`${ind.displayName} — ${METHODS[best].l}${ind.uncertain?' — à confirmer':''}`} />
                                        <span style={{ fontSize:7.5, color: ind.named?'#A07C28':T.mute,
                                          fontWeight: ind.named?700:400, maxWidth:44, whiteSpace:'normal',
                                          wordBreak:'break-word', textAlign:'center', lineHeight:1.25 }}>{ind.displayName}</span>
                                      </span>
                                    ))}
                                    {mine.length>2 && (
                                      <span title={`+${mine.length-2} ${lang==='ru'?'ещё':'de plus'}`}
                                        style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                                        width:38, height:30, borderRadius:6, border:`1px solid ${T.line}`,
                                        background:T.card, fontSize:11, fontWeight:700, color:T.soft, flexShrink:0 }}>
                                        +{mine.length-2}
                                      </span>
                                    )}
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
        let curSub = null, bandOn = false
        const bands = list.map(s => { if (s.sub !== curSub) { curSub = s.sub; bandOn = !bandOn }; return bandOn })
        const catColor = catAccentColor(cat.id)
        return (
          <div key={cat.id} style={{ marginBottom:22, paddingLeft:11, borderLeft:`4px solid ${catColor}` }}>
            <div className="serif" style={{ fontSize:14, fontWeight:600, color:T.ink, marginBottom:7, display:'flex', alignItems:'center', gap:6 }}>
              <span>{cat.e}</span>{cn.main}
              <span style={{ fontSize:10.5, color:T.mute, fontWeight:400 }}>· {list.filter(isObserved).length}/{list.length}</span>
            </div>
            {cat.niche && <div style={{ fontSize:10.5, color:T.mute, fontStyle:'italic', lineHeight:1.5, marginBottom:7 }}>{cat.niche}</div>}
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, tableLayout:'fixed' }}>
              <thead><tr>
                <th style={{ width:120, textAlign:'left', padding:'5px 6px', color:T.mute, fontWeight:500, fontSize:10, borderBottom:`1px solid ${T.line}` }}>{lang==='ru'?'Вид':'Espèce'}</th>
                <th style={{ padding:'5px 3px', textAlign:'center', color:T.mute, fontWeight:500, fontSize:10, borderBottom:`1px solid ${T.line}`, width:30 }} title="Individus identifiés">👤</th>
                {ALL_PLAYERS.map(p=><th key={p.id} title={p.name} style={{ padding:'5px 3px', textAlign:'center', color:T.soft, fontWeight:600, fontSize:10, borderBottom:`1px solid ${T.line}`, width:38 }}>{p.id}</th>)}
              </tr></thead>
              <tbody>
                {list.map((s,si)=>{
                  const r = (RARITY[s.r]||RARITY.commun), o = isObserved(s)
                  const nm = nameOf(s, lang)
                  const nInd = (s.inds||[]).length
                  const newGroup = si===0 || list[si-1].sub !== s.sub
                  const groupBorder = newGroup && si>0 ? `1px solid ${T.line}` : 'none'
                  const rowBg = bands[si] ? 'rgba(180,166,136,.13)' : 'transparent'
                  return (
                    <tr key={s.id} onClick={()=>selSpFull(s.id)} style={{ cursor:'pointer', opacity:o?1:0.5, background:rowBg }}>
                      <td style={{ padding:'5px 6px', borderBottom:`1px solid ${T.lineSoft}`, borderTop:groupBorder }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ width:8, height:8, borderRadius:2, background:o?r.c:'#CFC3A8', flexShrink:0 }} />
                          <span style={{ fontSize:13, filter:o?'none':'grayscale(.6)' }}>{s.e}</span>
                          <span style={{ minWidth:0 }}>
                            <span style={{ display:'block', fontSize:11, fontWeight:o?600:400, color:T.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:100 }}>{nm.main}</span>
                            {nm.sub && <span style={{ display:'block', fontSize:8.5, color:T.mute, opacity:.62, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:100 }}>{nm.sub}</span>}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding:'5px 3px', textAlign:'center', borderBottom:`1px solid ${T.lineSoft}`, borderTop:groupBorder }}>
                        {nInd>0 && <span className="serif" style={{ fontSize:10.5, fontWeight:700, color:'#8F4A22', background:'#F0E4CF', borderRadius:8, padding:'1px 6px' }}>{nInd}</span>}
                      </td>
                      {PLAYERS.map(pl=>{
                        const m = s.obs[pl.name]||[]
                        const best = m.length ? m.reduce((b,x)=>(METHODS[x]?.mult||0)>(METHODS[b]?.mult||0)?x:b, m[0]) : null
                        const myInds = (s.inds||[]).filter(i=>i.by===pl.name)
                        const myInd = myInds.length
                        const hasUncertain = myInds.some(i=>i.uncertain)
                        return (
                          <td key={pl.id} style={{ padding:'5px 3px', borderBottom:`1px solid ${T.lineSoft}`, borderTop:groupBorder, textAlign:'center' }}>
                            <div title={`${best?`${pl.name} — ${METHODS[best].l}${myInd?` · ${myInd} individu(s)`:''}`:pl.name}${hasUncertain?' · identification à confirmer':''}`}
                              style={{ position:'relative', width:22, height:22, borderRadius:'50%', margin:'0 auto',
                                display:'flex', alignItems:'center', justifyContent:'center', fontSize:9,
                                background:best?METHODS[best].c:'#E0D8C6',
                                border: hasUncertain?'1.5px solid #D68C34':`1px solid ${best?METHODS[best].c:T.line}` }}>
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
    const detailScrollRef = useRef(null)
    useEffect(() => { if (detailScrollRef.current) detailScrollRef.current.scrollTop = detailScrollTop.current[sp.id] || 0 }, [])
    const trackDetailScroll = (e) => { detailScrollTop.current[sp.id] = e.currentTarget.scrollTop }
    const [yearFilter, setYearFilter] = useState('all') // filtre par année des passages, quand il y en a beaucoup
    const tabs = [['obs',t.obs],['infos',t.infos],...(seasons?[['saisons',t.seasons]]:[])]
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.5)', zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding: wide?24:16 }} onClick={()=>{setCurSp(null);setCurInd(null)}}>
        <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:20, width:'100%', maxWidth: wide?820:640, maxHeight: wide?'90vh':'92dvh', overflow:'hidden', display:'flex', flexDirection:'column', border:`1px solid ${T.line}` }}>
          <div ref={detailScrollRef} onScroll={trackDetailScroll} style={{ overflowY:'auto', overscrollBehavior:'contain', flex:'1 1 auto', minHeight:0 }}>
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
            {!isPerson && <div className="serif" style={{ fontSize:15, fontWeight:600, color:T.clay, marginBottom:12 }}>{baseP} pts base · max {baseP*3+50} pts</div>}
            {isPerson && (
              <div style={{ fontSize:11.5, color:T.mute, marginBottom:12, fontStyle:'italic' }}>
                {lang==='ru'?'Не приносит очков, но наблюдения всё равно можно записывать.'
                            :'Ne rapporte pas de points, mais on peut quand même noter des observations.'}
              </div>
            )}
            <div style={{ display:'flex', borderBottom:`1px solid ${T.line}`, marginBottom:14 }}>
              {tabs.map(([id,l])=>(
                <button key={id} onClick={()=>setDetTab(id)} style={{ fontSize:12.5, padding:'8px 14px', color:detTab===id?T.clayDark:T.soft, borderBottom:`2px solid ${detTab===id?T.clay:'transparent'}`, marginBottom:-1, fontWeight:detTab===id?600:400 }}>{l}</button>
              ))}
            </div>

            {detTab==='obs' && <>
              {speciesType(sp)===1 && (() => {
                const firstByState = {}
                ;(sp.inds||[]).forEach(ind => { if (ind.state && !firstByState[ind.state]) firstByState[ind.state] = ind })
                return (
                  <div style={{ display:'grid', gridTemplateColumns:`repeat(${Object.keys(OBS_STATES).length},1fr)`, gap:6, marginBottom:14 }}>
                    {Object.keys(OBS_STATES).map(k=>{
                      const st = obsStateLabel(k, sp)
                      const found = firstByState[k]
                      return (
                        <button key={k} onClick={found ? ()=>setCurInd(found.n) : undefined}
                          style={{ textAlign:'center', borderRadius:10, overflow:'hidden', position:'relative',
                            height:60, border:`1px solid ${found?OBS_STATE_COLOR:T.line}`,
                            cursor:found?'pointer':'default' }}>
                          {found ? <>
                            <PhotoBg target={`ind:${sp.id}:${found.n}`} fallback={gradientFor(sp.id+found.n)} />
                            <div style={{ position:'absolute', inset:0,
                              background:'linear-gradient(to top, rgba(16,18,12,.68), transparent 62%)' }} />
                          </> : <div style={{ position:'absolute', inset:0, background:T.card }} />}
                          <div style={{ position:'relative', height:'100%', display:'flex', flexDirection:'column',
                            alignItems:'center', justifyContent:'flex-end', padding:'4px 2px' }}>
                            <span style={{ fontSize:15, opacity:found?1:.45, filter:found?'none':'grayscale(.75)' }}>{st.e}</span>
                            <span style={{ fontSize:8, fontWeight:700, marginTop:1, lineHeight:1.1,
                              color:found?'#F2EEE2':T.mute }}>{lang==='ru'?st.ru:st.l}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })()}
              <div style={{ display:'flex', alignItems:'center', marginBottom:8 }}>
                <div style={{ fontSize:10.5, fontWeight:600, color:T.mute, textTransform:'uppercase', letterSpacing:'.5px' }}>{t.whoObserved}</div>
                <div style={{ marginLeft:'auto', display:'flex', gap:5 }}>
                  {speciesType(sp)===1 && (
                    <button onClick={()=>setShowCalendar(sp)}
                      title={lang==='ru'?'Календарь появлений':'Calendrier des passages'}
                      style={{ width:32, height:32, borderRadius:'50%', border:`1px solid ${T.line}`,
                        background:T.card, color:T.clay, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <i className="ti ti-calendar-event" style={{ fontSize:15 }} aria-hidden="true" />
                    </button>
                  )}
                  {edit && (
                    <button onClick={()=>setSighting({ sp })} style={{ fontSize:12.5,
                      padding:'7px 14px', borderRadius:14, background:T.clay, color:'#fff', fontWeight:600,
                      display:'flex', alignItems:'center', gap:5 }}>
                      <i className="ti ti-plus" style={{ fontSize:14 }} aria-hidden="true" />
                      {isFish(sp) ? (lang==='ru'?'Поймана':'Pêché') : (lang==='ru'?'Наблюдение':'Observation')}
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${wide?5:3},1fr)`, gap:8, marginBottom:16 }}>
                {ALL_PLAYERS.map(pl=>{
                  const m = sp.obs[pl.name]||[]
                  const best = m.length ? m.reduce((b,x)=>(METHODS[x]?.mult||0)>(METHODS[b]?.mult||0)?x:b, m[0]) : null
                  const p2 = calcPtsLive(sp, pl.name)
                  // méthodes cochées sans individu qui les justifie encore (reliquat d'une
                  // suppression d'individu antérieure à la correction de la cascade — y compris
                  // partiel : un individu subsiste mais avec moins de méthodes qu'avant) :
                  // seul cas où on propose de resynchroniser directement depuis cette vignette
                  const indMethods = new Set(sp.inds.filter(i=>i.by===pl.name).map(i=>i.method).filter(Boolean))
                  const orphanMethods = m.filter(x=>!indMethods.has(x))
                  const orphan = edit && orphanMethods.length>0
                  return (
                    <div key={pl.id} style={{ position:'relative', background:best?`${METHODS[best].c}33`:T.card, border:`1px solid ${best?METHODS[best].c:T.line}`, borderRadius:10, padding:'5px 6px', textAlign:'center', opacity:pl.demo?.7:1 }}>
                      {orphan && (
                        <button onClick={()=>setConfirmClearObs({ sp, player:pl.name, keep:[...indMethods] })}
                          title={lang==='ru'?'Убрать способы без особи':'Retirer les méthodes sans individu'}
                          style={{ position:'absolute', top:-6, right:-6, width:18, height:18, borderRadius:'50%',
                            background:'#8F3A2E', color:'#fff', fontSize:10, lineHeight:1, display:'flex',
                            alignItems:'center', justifyContent:'center' }}>✕</button>
                      )}
                      <div style={{ fontSize:12, marginBottom:1 }}>{best?(best==='eye'?'👁':best==='scope'?'🔭':best==='night'?'🌙':'📷'):'—'}</div>
                      <div style={{ fontSize:9, color:T.soft }}>{pl.name}</div>
                      <div className="serif" style={{ fontSize:10.5, fontWeight:600, color:T.ink }}>{p2?p2+' pts':'—'}</div>
                    </div>
                  )
                })}
              </div>
              {speciesType(sp)===2 ? (() => {
                // on liste les individus directement (pas juste leurs photos) : une
                // observation sans photo doit rester visible et supprimable, sinon
                // impossible de revenir dessus une fois enregistrée
                const entries = (sp.inds||[]).map(ind => ({ ind, photos: photosFor(`ind:${sp.id}:${ind.n}`) }))
                return entries.length>0 ? (
                  <div>
                    <div style={{ fontSize:10.5, fontWeight:700, color:T.mute, textTransform:'uppercase',
                      letterSpacing:'.6px', marginBottom:8 }}>
                      {isFish(sp) ? (lang==='ru'?'Рыбалка':'Pêches') : (lang==='ru'?'Наблюдения':'Observations')} ({entries.length})
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:`repeat(auto-fill,minmax(${wide?110:90}px,1fr))`, gap:8 }}>
                      {entries.map(({ ind, photos }, i)=>(
                        <div key={i} onClick={()=>edit && setSighting({ editing:{ sp, ind } })}
                          style={{ position:'relative', borderRadius:10, overflow:'hidden', aspectRatio:'1',
                          border: ind.uncertain?'1.5px solid #D68C34':`1px solid ${T.line}`,
                          boxShadow: ind.uncertain?'0 0 0 1px rgba(214,140,52,.3)':'none', background:T.card,
                          cursor: edit?'pointer':'default' }}>
                          {photos[0] ? (
                            <img src={photos[0].thumbUrl||photos[0].url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover',
                              objectPosition:photos[0].pos||'50% 50%', filter:LUT, display:'block', ...thumbZoomStyle(photos[0]) }} />
                          ) : (
                            <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column',
                              alignItems:'center', justifyContent:'center', padding:6, textAlign:'center' }}>
                              <i className="ti ti-eye" style={{ fontSize:18, color:T.mute }} aria-hidden="true" />
                              {ind.note && <div style={{ fontSize:9, color:T.soft, marginTop:4, lineHeight:1.3 }}>{ind.note}</div>}
                            </div>
                          )}
                          {ind.size && (
                            <span style={{ position:'absolute', top:4, left:4, background:'rgba(20,18,14,.6)',
                              color:'#fff', fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:8,
                              textTransform:'capitalize' }}>{ind.size}</span>
                          )}
                          {photos.length>1 && (
                            <span style={{ position:'absolute', bottom:4, left:4, background:'rgba(20,18,14,.6)',
                              color:'#fff', fontSize:9, padding:'2px 6px', borderRadius:8 }}>+{photos.length-1}</span>
                          )}
                          {ind.uncertain && (
                            <span title={lang==='ru'?'Определение под вопросом':'Identification à confirmer'}
                              style={{ position:'absolute', bottom:4, right: edit?26:4, width:16, height:16, borderRadius:'50%',
                                background:'#D68C34', color:'#fff', fontSize:9, fontWeight:800, lineHeight:1,
                                display:'flex', alignItems:'center', justifyContent:'center' }}>?</span>
                          )}
                          {edit && (
                            <button onClick={(e)=>{ e.stopPropagation(); setUncertain(sp.id, ind.n, !ind.uncertain) }}
                              title={ind.uncertain
                                ? (lang==='ru'?'Подтвердить определение':'Confirmer cette identification')
                                : (lang==='ru'?'Я не уверен(а) в определении':'Je doute de cette identification')}
                              style={{ position:'absolute', bottom:4, right:4, width:20, height:20, borderRadius:'50%',
                                background: ind.uncertain?'#D68C34':'rgba(20,18,14,.6)', color:'#fff', fontSize:11, lineHeight:1,
                                display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <i className="ti ti-help-circle" style={{ fontSize:12 }} aria-hidden="true" />
                            </button>
                          )}
                          {edit && (
                            <button onClick={(e)=>{ e.stopPropagation(); setConfirmDelSighting({ sp, ind }) }}
                              title={lang==='ru'?'Удалить это наблюдение':'Supprimer cette observation'}
                              style={{ position:'absolute', top:4, right:4, width:20, height:20, borderRadius:'50%',
                                background:'rgba(20,18,14,.6)', color:'#fff', fontSize:11, lineHeight:1,
                                display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize:11.5, color:T.mute, fontStyle:'italic' }}>
                    {lang==='ru'?'Пока нет наблюдений':'Aucune observation pour l\'instant'}
                  </div>
                )
              })() : sp.inds.length>0 && (() => {
                const { named, sightings: allSightings } = splitInds(sp)
                // filtre par année seulement utile s'il y a beaucoup de passages à trier
                const years = [...new Set(allSightings.map(i=>i.d?.split('/')[2]).filter(Boolean))].sort().reverse()
                const showYearFilter = allSightings.length > 12 && years.length > 1
                const sightings = (showYearFilter && yearFilter!=='all') ? allSightings.filter(i=>i.d?.split('/')[2]===yearFilter) : allSightings
                const selectMode = merging?.spId === sp.id
                const selected = merging?.selected || new Set()
                const toggleSelect = (n) => setMerging(m => {
                  const next = new Set(m.selected)
                  next.has(n) ? next.delete(n) : next.add(n)
                  return { ...m, selected: next }
                })
                const Col = ({ title, icon, list, isNamed }) => (
                  <div>
                    <div style={{ fontSize:10.5, fontWeight:700, color: isNamed?'#A07C28':T.mute, textTransform:'uppercase',
                      letterSpacing:'.6px', marginBottom:8, display:'flex', alignItems:'center', gap:5,
                      paddingBottom:5, borderBottom: isNamed?'1.5px solid #C9A046':`1px solid ${T.line}` }}>
                      <i className={`ti ${icon}`} style={{ fontSize:13 }} aria-hidden="true" />
                      {title} ({list.length})
                      {edit && !isNamed && list.length>1 && (
                        <button onClick={()=>setMerging(selectMode ? null : { spId:sp.id, selected:new Set() })}
                          style={{ marginLeft:'auto', fontSize:9.5, fontWeight:600, padding:'3px 8px', borderRadius:10,
                            border:`1px solid ${selectMode?'#B5602F':T.line}`, background:selectMode?'#B5602F':'transparent',
                            color:selectMode?'#fff':T.mute, textTransform:'none', letterSpacing:0 }}>
                          {selectMode ? (lang==='ru'?'Отмена':'Annuler')
                            : (lang==='ru'?'Выбрать':'Sélectionner')}
                        </button>
                      )}
                    </div>
                    {list.length===0
                      ? <div style={{ fontSize:11.5, color:T.mute, padding:'8px 0', fontStyle:'italic' }}>
                          {isNamed ? (lang==='ru'?'Пока никого не опознали':'Aucun individu reconnu pour l\'instant')
                                   : (lang==='ru'?'Нет наблюдений':'Aucune observation')}
                        </div>
                      : <div style={{ display:'grid', gridTemplateColumns:`repeat(auto-fill,minmax(${wide?118:104}px,1fr))`, gap:8 }}>
                          {list.map((ind,i)=>{
                            const isSel = !isNamed && selectMode && selected.has(ind.n)
                            return (
                            <button key={i} onClick={()=> (!isNamed && selectMode) ? toggleSelect(ind.n) : setCurInd(ind.n)}
                              style={{ textAlign:'left', borderRadius:12,
                              overflow:'hidden', padding:0, position:'relative', minHeight: isNamed?100:92,
                              border: isSel?'2px solid #B5602F':isNamed?'2px solid #C9A046':ind.state?`2px solid ${OBS_STATE_COLOR}`:`1px solid ${T.line}`,
                              boxShadow: isSel?'0 0 0 1px rgba(181,96,47,.3), 0 3px 12px rgba(181,96,47,.25)'
                                :isNamed?'0 0 0 1px rgba(201,160,70,.28), 0 3px 12px rgba(201,160,70,.22)'
                                :ind.state?'0 0 0 1px rgba(62,107,140,.28), 0 3px 12px rgba(62,107,140,.22)':'none' }}>
                              <PhotoBg target={`ind:${sp.id}:${ind.n}`} fallback={gradientFor(sp.id+ind.n)} />
                              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(16,18,12,.74), transparent 56%)' }} />
                              {isNamed && <span style={{ position:'absolute', top:6, left:6, background:'#C9A046',
                                color:'#2B2620', borderRadius:8, padding:'2px 7px', fontSize:8.5, fontWeight:800,
                                letterSpacing:'.4px', display:'flex', alignItems:'center', gap:3, zIndex:2 }}>
                                ★ {lang==='ru'?'ЗНАКОМЫЙ':'FAMILIER'}</span>}
                              {ind.state && OBS_STATES[ind.state] && (() => { const st = obsStateLabel(ind.state, sp); return (
                                <span title={lang==='ru'?st.ru:st.l}
                                  style={{ position:'absolute', top:6, right:6, background:OBS_STATE_COLOR,
                                  color:'#fff', borderRadius:'50%', width:20, height:20, fontSize:11,
                                  display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}>
                                  {st.e}</span>
                              )})()}
                              {isNamed && ind.mergedCount>1 && <span style={{ position:'absolute', top:6, right:6,
                                background:'rgba(20,18,14,.72)', color:'#fff', borderRadius:8, padding:'2px 7px',
                                fontSize:8.5, fontWeight:800, zIndex:2 }}>×{ind.mergedCount}</span>}
                              {!isNamed && selectMode && <span style={{ position:'absolute', top:6, right:6, width:18, height:18,
                                borderRadius:'50%', border:'1.5px solid #fff', background:isSel?'#B5602F':'rgba(20,18,14,.4)',
                                display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}>
                                {isSel && <i className="ti ti-check" style={{ fontSize:11, color:'#fff' }} aria-hidden="true" />}
                              </span>}
                              <div style={{ position:'relative', height:'100%', minHeight:92, display:'flex',
                                flexDirection:'column', justifyContent:'flex-end', padding:9 }}>
                                {isNamed && <div className="serif" style={{ fontSize:12, fontWeight:700, color:'#F2EEE2', lineHeight:1.1 }}>{ind.displayName}</div>}
                                <div style={{ fontSize:9.5, color:'rgba(242,238,226,.72)', marginTop:2 }}>{ind.d}</div>
                              </div>
                            </button>
                          )})}
                        </div>}
                  </div>
                )
                const showFamiliers = speciesType(sp)!==3
                return (
                  <div>
                    {showYearFilter && (
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                        <span style={{ fontSize:10.5, color:T.mute, alignSelf:'center' }}>
                          {lang==='ru'?'Год :':'Année :'}
                        </span>
                        <button onClick={()=>setYearFilter('all')} style={{ fontSize:11, padding:'4px 10px', borderRadius:12,
                          border:`1px solid ${yearFilter==='all'?T.clay:T.line}`, background:yearFilter==='all'?T.clay:'transparent',
                          color:yearFilter==='all'?'#fff':T.soft, fontWeight:yearFilter==='all'?600:400 }}>
                          {lang==='ru'?'Все':'Toutes'} ({allSightings.length})
                        </button>
                        {years.map(y=>{
                          const n = allSightings.filter(i=>i.d?.split('/')[2]===y).length
                          return (
                            <button key={y} onClick={()=>setYearFilter(y)} style={{ fontSize:11, padding:'4px 10px', borderRadius:12,
                              border:`1px solid ${yearFilter===y?T.clay:T.line}`, background:yearFilter===y?T.clay:'transparent',
                              color:yearFilter===y?'#fff':T.soft, fontWeight:yearFilter===y?600:400 }}>
                              {y} ({n})
                            </button>
                          )
                        })}
                      </div>
                    )}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16,
                      paddingBottom: selectMode ? 64 : 0 }}>
                      {showFamiliers && <Col title={lang==='ru'?'Знакомые':'Familiers'} icon="ti-star" list={named} isNamed={true} />}
                      <Col title={lang==='ru'?'Проходы':'Passages'} icon="ti-eye" list={sightings} isNamed={false} />
                    </div>
                    {selectMode && (
                      <div style={{ position:'sticky', bottom:0, zIndex:5, marginTop:12, padding:'10px 12px', borderRadius:12,
                        background:'#2B2620', display:'flex', alignItems:'center', gap:10, boxShadow:'0 4px 16px rgba(0,0,0,.25)' }}>
                        <span style={{ fontSize:12, color:'#EDE7D8', fontWeight:600 }}>
                          {selected.size} {lang==='ru'?'выбрано':'sélectionné'}{selected.size>1 && lang!=='ru' ?'s':''}
                        </span>
                        <button onClick={()=>setMerging(null)} style={{ marginLeft:'auto', fontSize:12, padding:'7px 12px',
                          borderRadius:9, color:'#C3B9A6' }}>{lang==='ru'?'Отмена':'Annuler'}</button>
                        <button disabled={selected.size===0}
                          onClick={()=>setMergeSheet({ sp, indNames:[...selected] })}
                          className="serif" style={{ fontSize:12.5, fontWeight:700, padding:'8px 14px', borderRadius:9,
                            background: selected.size===0?'#5A5245':'#B5602F', color:'#fff',
                            opacity: selected.size===0?.6:1 }}>
                          <i className="ti ti-star" style={{ fontSize:13, marginRight:5 }} aria-hidden="true" />
                          {lang==='ru'?'Опознать как один':(selected.size>1?'Regrouper en individu':'Reconnaître')}
                        </button>
                      </div>
                    )}
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

            {detTab==='infos' && <>
              {(() => {
                const infos = [
                  ...(isVegetal(sp) ? [] : [[lang==='ru'?'Питание':'Alimentation', sp.alim]]),
                  [lang==='ru'?'Среда обитания':'Habitat & territoire', sp.hab],
                ].filter(([,v])=>v)
                if (!infos.length) return null
                return (
                  <div style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:10, padding:11, marginBottom:8,
                    display:'flex', gap:16, flexWrap:'wrap' }}>
                    {infos.map(([t,v])=>(
                      <div key={t} style={{ flex:'1 1 150px', minWidth:150 }}>
                        <div style={{ fontSize:10.5, fontWeight:600, color:T.mute, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>{t}</div>
                        <div style={{ fontSize:12.5, color:T.soft, lineHeight:1.65 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}
              {sp.niche && (
                <div style={{ background:'#E6EAD9', border:'1px solid #C3CDA9', borderRadius:10, padding:12, marginBottom:8 }}>
                  <div style={{ fontSize:10.5, fontWeight:700, color:'#4A5D32', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                    <i className="ti ti-plant-2" style={{ fontSize:13 }} aria-hidden="true" />{lang==='ru'?'Экологическая ниша':'Niche écologique'}
                  </div>
                  <div style={{ fontSize:12.5, color:'#3F4B2E', lineHeight:1.65 }}>{sp.niche}</div>
                </div>
              )}
              {(sp.dng || sp.anecdote) && (
                <div style={{ background:'#F0E4CF', border:`1px solid #DCC79E`, borderRadius:10, padding:12, marginTop:4, marginBottom:8 }}>
                  <div style={{ fontSize:10.5, fontWeight:700, color:'#8F6A2E', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                    <i className="ti ti-sparkles" style={{ fontSize:13 }} aria-hidden="true" />{lang==='ru'?'Знаете ли вы?':'Le saviez-vous ?'}
                  </div>
                  {sp.dng && <div style={{ fontSize:12.5, color:'#6B5330', lineHeight:1.65 }}>{sp.dng}</div>}
                  {sp.dng && sp.anecdote && <div style={{ height:1, background:'#DCC79E', margin:'9px 0' }} />}
                  {sp.anecdote && <div style={{ fontSize:12.5, color:'#6B5330', lineHeight:1.65 }}>{sp.anecdote}</div>}
                </div>
              )}
              {(sp.wiki || sp.youtube) && (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:10 }}>
                  {sp.wiki && (
                    <a href={sp.wiki} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:6,
                      padding:'8px 13px', borderRadius:12, background:T.card, border:`1px solid ${T.line}`, color:T.clay, fontSize:12, fontWeight:600 }}>
                      <i className="ti ti-brand-wikipedia" style={{ fontSize:15 }} aria-hidden="true" />Wikipédia
                    </a>
                  )}
                  {sp.youtube && (
                    <a href={sp.youtube} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:6,
                      padding:'8px 13px', borderRadius:12, background:T.card, border:`1px solid ${T.line}`, color:T.clay, fontSize:12, fontWeight:600 }}>
                      <i className="ti ti-brand-youtube" style={{ fontSize:15 }} aria-hidden="true" />{lang==='ru'?'Видео':'Vidéo'}
                    </a>
                  )}
                </div>
              )}
              {sp.audio && (/\.(mp3|ogg|wav|m4a|opus|aac)(\?.*)?$/i.test(sp.audio) ? (
                <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:9, padding:'9px 13px',
                  borderRadius:12, background:T.card, border:`1px solid ${T.line}` }}>
                  <i className="ti ti-volume" style={{ fontSize:15, color:T.clay, flexShrink:0 }} aria-hidden="true" />
                  <audio controls src={sp.audio} style={{ height:32, flex:1, minWidth:0 }} />
                </div>
              ) : (
                <a href={sp.audio} target="_blank" rel="noopener noreferrer" style={{ marginTop:10, display:'flex', alignItems:'center', gap:7,
                  padding:'8px 13px', borderRadius:12, background:T.card, border:`1px solid ${T.line}`, color:T.clay, fontSize:12, fontWeight:600, width:'fit-content' }}>
                  <i className="ti ti-volume" style={{ fontSize:15 }} aria-hidden="true" />
                  {lang==='ru'?'Крик / пение':'Cri / chant de l’espèce'}
                </a>
              ))}
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
      </div>
    )
  }

  // ═════ INDIVIDU ═════
  const IndividuSheet = () => {
    if (!curInd || !sp) return null
    // curInd est juste le nom technique (clé) de l'individu — on relit toujours
    // sa version à jour dans sp.inds, sinon la fiche affiche une photo figée
    // (ex: "incertain" qui ne se met pas à jour après un clic sur le bouton)
    const { named: namedList, sightings: sightingsList } = splitInds(sp)
    const ind = [...namedList, ...sightingsList].find(i => i.n === curInd)
    if (!ind) return null
    const M = ind.method ? METHODS[ind.method] : null
    const [addingPassage, setAddingPassage] = useState(false)
    const [addSel, setAddSel] = useState(() => new Set())
    const candidates = addingPassage ? splitInds(sp).sightings : []
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.6)', zIndex:80, display:'flex', alignItems:'center', justifyContent:'center', padding: wide?24:16 }} onClick={()=>setCurInd(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:20, width:'100%', maxWidth: wide?660:560, maxHeight: wide?'88vh':'74dvh', overflow:'hidden', display:'flex', flexDirection:'column', border:`1px solid ${T.line}` }}>
          <div style={{ overflowY:'auto', overscrollBehavior:'contain', flex:'1 1 auto', minHeight:0 }}>
          <div style={{ position:'relative', height: wide?380:260, display:'flex', alignItems:'flex-end', padding:18 }}>
            <PhotoHero target={`ind:${sp.id}:${ind.n}`} fallback={gradientFor(sp.id+ind.n)} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(20,20,14,.6), transparent 62%)', pointerEvents:'none' }} />
            {edit && <div style={{ position:'absolute', top:12, right:48, display:'flex', gap:5 }}>
              <button onClick={(e)=>{ e.stopPropagation(); setSighting({ editing:{ sp, ind } }) }}
                style={{ background:'rgba(0,0,0,.35)', color:'#fff', borderRadius:'50%', width:28, height:28,
                  display:'flex', alignItems:'center', justifyContent:'center' }}
                title={lang==='ru'?'Изменить наблюдение':'Modifier cette observation'}>
                <i className="ti ti-pencil" style={{ fontSize:13 }} aria-hidden="true" />
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
            {ind.uncertain && (
              <div style={{ background:'#F5E4C8', border:'1.5px solid #D68C34', borderRadius:12, padding:12, marginBottom:12,
                display:'flex', alignItems:'flex-start', gap:8 }}>
                <i className="ti ti-help-circle" style={{ fontSize:17, color:'#B5701A', flexShrink:0, marginTop:1 }} aria-hidden="true" />
                <div>
                  <div style={{ fontSize:11.5, fontWeight:700, color:'#8F5A15' }}>
                    {lang==='ru'?'Определение под вопросом':'Identification à confirmer'}
                  </div>
                  <div style={{ fontSize:11, color:'#8F5A15', marginTop:2, lineHeight:1.5 }}>
                    {lang==='ru'?'Не приносит очков, пока не подтверждено.':"Ne rapporte pas de points tant que ce n'est pas confirmé."}
                  </div>
                </div>
              </div>
            )}
            {edit && (
              <button onClick={()=>setUncertain(sp.id, ind.n, !ind.uncertain)}
                style={{ width:'100%', padding:'10px', borderRadius:12, border:`1px dashed ${ind.uncertain?'#D68C34':T.line}`,
                  background:'transparent', color: ind.uncertain?'#B5701A':T.mute, fontSize:12, fontWeight:600,
                  marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <i className="ti ti-help-circle" style={{ fontSize:14 }} aria-hidden="true" />
                {ind.uncertain
                  ? (lang==='ru'?'Определение подтверждено':'Confirmer cette identification')
                  : (lang==='ru'?'Я не уверен в определении':'Je doute de cette identification')}
              </button>
            )}
            {ind.gps && <MiniMap gps={ind.gps} lang={lang} excludeKey={`${sp.id}::${ind.n}`}
              onJump={(sp2, ind2)=>{ setCurSp(sp2.id); setCurInd(ind2.n) }} />}
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
            {ind.mergedCount>1 && (
              <div style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:12, padding:12, marginBottom:9 }}>
                <div style={{ fontSize:10.5, fontWeight:700, color:T.mute, textTransform:'uppercase',
                  letterSpacing:'.5px', marginBottom:5, display:'flex', alignItems:'center', gap:5 }}>
                  <i className="ti ti-copy" style={{ fontSize:12 }} aria-hidden="true" />
                  {lang==='ru'?`${ind.mergedCount} прохода объединены`:`${ind.mergedCount} passages regroupés`}
                </div>
                <div style={{ fontSize:11.5, color:T.soft, lineHeight:1.6 }}>{(ind.mergedDates||[]).join(' · ')}</div>
              </div>
            )}
            {edit && !ind.named && speciesType(sp)!==3 && (
              <button onClick={()=>{ setCurInd(null); setPromoting({ sp, ind }) }}
                style={{ width:'100%', padding:'11px', borderRadius:12, border:'1px dashed #C9A87C',
                  background:'transparent', color:'#8F4A22', fontSize:12.5, fontWeight:600,
                  marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <i className="ti ti-lock-open" style={{ fontSize:15 }} aria-hidden="true" />
                {lang==='ru'?'Опознать эту особь и дать имя':'Reconnaître cet individu et lui donner un nom'}
              </button>
            )}
            {edit && ind.named && speciesType(sp)!==3 && (
              <button onClick={()=>{ setAddingPassage(true); setAddSel(new Set()) }}
                style={{ width:'100%', padding:'11px', borderRadius:12, border:'1px dashed #C9A87C',
                  background:'transparent', color:'#8F4A22', fontSize:12.5, fontWeight:600,
                  marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <i className="ti ti-plus" style={{ fontSize:15 }} aria-hidden="true" />
                {lang==='ru'?'Добавить проход этой особи':'Ajouter un passage à cet individu'}
              </button>
            )}
            {addingPassage && (
              <div onClick={e=>e.stopPropagation()} style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:12, padding:13, marginBottom:10 }}>
                <div style={{ fontSize:10.5, fontWeight:700, color:T.mute, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>
                  {lang==='ru'?'Выбрать проходы для добавления':'Choisir les passages à ajouter'}
                </div>
                {candidates.length === 0 ? (
                  <div style={{ fontSize:11.5, color:T.mute, fontStyle:'italic', marginBottom:8 }}>
                    {lang==='ru'?'Нет отдельных проходов для этого вида.':'Aucun passage isolé pour cette espèce.'}
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:`repeat(auto-fill,minmax(${wide?100:88}px,1fr))`, gap:7, marginBottom:10 }}>
                    {candidates.map((c,i)=>{
                      const isSel = addSel.has(c.n)
                      return (
                        <button key={i} onClick={()=>setAddSel(prev=>{ const n=new Set(prev); n.has(c.n)?n.delete(c.n):n.add(c.n); return n })}
                          style={{ textAlign:'left', borderRadius:10, overflow:'hidden', padding:0, position:'relative', minHeight:76,
                            border: isSel?'2px solid #B5602F':`1px solid ${T.line}` }}>
                          <PhotoBg target={`ind:${sp.id}:${c.n}`} fallback={gradientFor(sp.id+c.n)} />
                          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(16,18,12,.74), transparent 56%)' }} />
                          <span style={{ position:'absolute', top:5, right:5, width:16, height:16, borderRadius:'50%',
                            border:'1.5px solid #fff', background:isSel?'#B5602F':'rgba(20,18,14,.4)',
                            display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {isSel && <i className="ti ti-check" style={{ fontSize:10, color:'#fff' }} aria-hidden="true" />}
                          </span>
                          <div style={{ position:'relative', padding:6, fontSize:9, color:'rgba(242,238,226,.85)' }}>{c.d}</div>
                        </button>
                      )
                    })}
                  </div>
                )}
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>setAddingPassage(false)} style={{ flex:1, padding:'9px', borderRadius:9,
                    border:`1px solid ${T.line}`, color:T.soft, fontSize:12.5 }}>
                    {lang==='ru'?'Отмена':'Annuler'}
                  </button>
                  <button disabled={addSel.size===0} onClick={async()=>{
                      await mergeAsIndividual(sp.id, [ind.n, ...addSel], ind.displayName, ind.traits || '')
                      setAddingPassage(false); setCurInd(null); setRefresh(r=>r+1)
                    }}
                    className="serif" style={{ flex:1.4, padding:'9px', borderRadius:9, background: addSel.size===0?'#B5A98C':'#B5602F',
                      color:'#fff', fontSize:12.5, fontWeight:700 }}>
                    {lang==='ru'?'Добавить':`Ajouter${addSel.size?` (${addSel.size})`:''}`}
                  </button>
                </div>
              </div>
            )}
            {ind.desc && (
              <div style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:12, padding:13 }}>
                <div style={{ fontSize:10.5, fontWeight:600, color:T.mute, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>Description</div>
                <div style={{ fontSize:12.5, color:T.soft, lineHeight:1.6 }}>{ind.desc}</div>
              </div>
            )}
            {edit && (
              <button onClick={()=>setConfirmDelSighting({ sp, ind })}
                style={{ marginTop:16, width:'100%', padding:'10px', borderRadius:10,
                  border:'1px dashed #C9877C', background:'transparent', color:'#8F4A22', fontSize:12.5, fontWeight:600,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <i className="ti ti-trash" style={{ fontSize:15 }} aria-hidden="true" />
                {lang==='ru'?'Удалить это наблюдение':'Supprimer cette observation'}
              </button>
            )}
          </div>
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
                ['Bonus', [['👶 Bébés','+20'],['🏠 Terrier','+30'],['📸 De près','×2'],['📷 De loin','÷2']]],
                ['Catégorie', [['Arbres, arbustes','×0.3'],['Humains, domestiques','×0']]],
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
            <div style={{ fontSize:10.5, color:T.mute, marginTop:9, lineHeight:1.6, display:'flex', alignItems:'flex-start', gap:5 }}>
              <i className="ti ti-repeat" style={{ fontSize:13, marginTop:1, flexShrink:0 }} aria-hidden="true" />
              <span>Passages répétés : le premier passage vaut 100% des points, chaque passage suivant du même animal déjà reconnu ne vaut plus que {Math.round(REPEAT_PASSAGE_MULT*100)}%.</span>
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
        <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:20, width:'100%', maxWidth:600, maxHeight: wide?'88vh':'92vh', overflow:'hidden', display:'flex', flexDirection:'column', border:`1px solid ${T.line}` }}>
          <div style={{ overflowY:'auto', overscrollBehavior:'contain', flex:'1 1 auto', minHeight:0 }}>
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
    // hauteur calculée (pas un simple "100dvh - constante") : elle s'ajuste à
    // la vraie place restante sous l'en-tête, quelle que soit la taille de
    // l'écran ou celle de l'en-tête — sinon la légende du bas était rognée
    const mapWrapRef = useRef(null)
    const matrixDivRef = useRef(null)
    const trackMatrixScroll = e => { matrixScrollTop.current = e.currentTarget.scrollTop }
    useEffect(() => {
      const el = wide ? matrixDivRef.current : (mobileTab==='matrix' ? mapWrapRef.current : null)
      if (el) el.scrollTop = matrixScrollTop.current
    }, [])
    const [mapH, setMapH] = useState(420)
    useLayoutEffect(() => {
      if (wide) return
      const el = mapWrapRef.current
      if (!el) return
      const compute = () => setMapH(Math.max(320, window.innerHeight - el.getBoundingClientRect().top - 10))
      compute()
      window.addEventListener('resize', compute)
      window.addEventListener('orientationchange', compute)
      return () => { window.removeEventListener('resize', compute); window.removeEventListener('orientationchange', compute) }
    }, [wide, mobileTab])
    if (!wide) {
      return (
        <div style={{ padding: mobileTab==='map' ? '10px 14px 0' : '10px 14px 26px' }}>
          <div style={{ display:'flex', gap:6, marginBottom:12 }}>
            {[['map','Mindmap','ti-hierarchy-2'],['matrix','Matrice','ti-layout-grid']].map(([v,l,ic])=>(
              <button key={v} onClick={()=>setMobileTab(v)} style={{ flex:1, fontSize:13, padding:'9px', borderRadius:14, border:`1px solid ${mobileTab===v?T.clay:T.line}`, background:mobileTab===v?T.clay:'transparent', color:mobileTab===v?'#fff':T.soft, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                <i className={`ti ${ic}`} style={{ fontSize:14 }} aria-hidden="true" />{l}
              </button>
            ))}
          </div>
          <div ref={mapWrapRef} onScroll={mobileTab==='matrix' ? trackMatrixScroll : undefined}
            style={{ background:T.surface, borderRadius:16, border:`1px solid ${T.line}`,
            ...(mobileTab==='map'
              ? { overflow:'hidden', height:mapH, minHeight:320 }
              : { overflow:'auto' }) }}>
            {mobileTab==='map' ? <MindMap onSelectSpecies={selSpFull} lang={lang} expanded={mapExpanded} setExpanded={setMapExpanded} tf={mapTf} setTf={setMapTf} obsOnly={mapObsOnly} setObsOnly={setMapObsOnly} edit={edit} onAddSpecies={(c,sv)=>setSpEditor({ cat:c, sub:sv })} /> : <MatrixPane compact />}
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
            <MindMap onSelectSpecies={selSpFull} lang={lang} expanded={mapExpanded} setExpanded={setMapExpanded} tf={mapTf} setTf={setMapTf} obsOnly={mapObsOnly} setObsOnly={setMapObsOnly} edit={edit} onAddSpecies={(c,sv)=>setSpEditor({ cat:c, sub:sv })} />
          </div>
        </div>
        <div onMouseEnter={()=>setFocus('matrix')} onClick={()=>setFocus('matrix')}
          style={{ flex:matFlex, minWidth:0, background:T.bg, borderRadius:18, border:`1px solid ${focus==='matrix'?T.clay:T.line}`,
            overflow:'hidden', display:'flex', flexDirection:'column',
            transition:'flex .2s cubic-bezier(.4,0,.2,1), border-color .2s' }}>
          <PaneHeader title={t.matrixTitle} icon="ti-layout-grid" />
          <div ref={matrixDivRef} onScroll={trackMatrixScroll} style={{ flex:1, overflowY:'auto' }}>
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
        <button onClick={()=>goScreen('landing')} style={{ display:'flex', alignItems:'center', gap:9 }}>
          <BobberIcon size={26} />
          <span style={{ textAlign:'left' }}>
            <span className="serif" style={{ display:'block', fontSize:10.5, fontWeight:600, color:T.soft, letterSpacing:'.3px' }}>Pludini Doc</span>
            <span className="serif" style={{ display:'block', fontSize:20, fontWeight:900, color:T.ink, letterSpacing:'-0.4px', lineHeight:1.05 }}>
              {lang==='ru'?'Заповедник':'Conservatoire'}
            </span>
          </span>
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
      {mergeSheet && <MergeSheet sp={mergeSheet.sp} indNames={mergeSheet.indNames} lang={lang} wide={wide}
        onClose={()=>setMergeSheet(null)}
        onDone={()=>{ setMergeSheet(null); setMerging(null); setRefresh(r=>r+1) }} />}
      {confirmDelSighting && <ConfirmDialog lang={lang}
        title={lang==='ru'?'Удалить это наблюдение?':'Supprimer cette observation ?'}
        message={lang==='ru'?'Это действие необратимо.':'Cette action est irréversible.'}
        onCancel={()=>setConfirmDelSighting(null)}
        onConfirm={async()=>{
          const { sp, ind } = confirmDelSighting
          await removeSighting(sp.id, ind.n)
          // sans ça, la case "qui a observé" (et ses points) reste cochée même
          // après suppression du dernier individu qui la justifiait
          if (ind.by) {
            const after = allSpecies().find(s=>s.id===sp.id)
            const remaining = [...new Set((after?.inds||[]).filter(i=>i.by===ind.by).map(i=>i.method).filter(Boolean))]
            await setObservation(sp.id, ind.by, remaining)
          }
          setConfirmDelSighting(null); setCurInd(null); setRefresh(r=>r+1) }} />}
      {confirmClearObs && <ConfirmDialog lang={lang}
        title={lang==='ru'?'Убрать способы без особи?':'Retirer les méthodes sans individu ?'}
        message={lang==='ru'?'Способы наблюдения, для которых больше нет особи, будут убраны (очки соответственно уменьшатся).'
          :'Les méthodes d’observation qui ne correspondent plus à aucun individu seront retirées (les points seront recalculés en conséquence).'}
        onCancel={()=>setConfirmClearObs(null)}
        onConfirm={async()=>{
          const { sp, player, keep } = confirmClearObs
          await setObservation(sp.id, player, keep)
          if (!keep.length) await setBlurry(sp.id, player, false)
          setConfirmClearObs(null); setRefresh(r=>r+1) }} />}
      {idPicker && <IdentityPicker lang={lang} onClose={()=>setIdPicker(false)} />}
      {spEditor && <SpeciesEditor lang={lang} initial={spEditor.initial} presetCat={spEditor.cat}
        presetSub={spEditor.sub} onClose={()=>setSpEditor(null)} onSaved={()=>setRefresh(r=>r+1)}
        onDeleted={()=>{ setCurSp(null); setRefresh(r=>r+1) }} />}
      {sighting && sighting.editing && <SightingEditor lang={lang} species={SPECIES} editing={sighting.editing}
        onClose={()=>setSighting(null)}
        onSaved={(id, pts)=>{ setRefresh(r=>r+1); setCurInd(null); triggerReward(pts) }} />}
      {sighting && !sighting.editing && <AddObservation lang={lang} species={SPECIES} presetSp={sighting.sp}
        onClose={()=>setSighting(null)}
        onSaved={(id, pts)=>{ setRefresh(r=>r+1); if(id) selSpFull(id); triggerReward(pts) }} />}
      {photoTarget && <PhotoManager target={photoTarget.target} label={photoTarget.label} lang={lang} onClose={()=>setPhotoTarget(null)} />}
      {showCalendar && <PassageCalendar sp={showCalendar} lang={lang} edit={edit} onClose={()=>setShowCalendar(null)}
        onOpenObs={(ind)=>{ setCurInd(ind.n); setShowCalendar(null) }} />}
      {toast && <Toast msg={toast} />}
      {reward && <RewardBurst points={reward.points} tier={reward.tier} onDone={()=>setReward(null)} />}

      {pwOpen && <PwModal lang={lang} pw={pw} setPw={setPw} onSubmit={submitPw}
        onClose={()=>{ setPwOpen(false); setPw('') }} />}
    </div>
  )
}



// "12/6/2026" (toLocaleDateString('fr-FR')) → { day:12, month:6 } — sert au calendrier des passages
function parseFrDate(s) {
  const m = (s||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return null
  return { day: parseInt(m[1],10), month: parseInt(m[2],10), year: parseInt(m[3],10) }
}
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

// ═════ Calendrier annuel des passages (toutes années confondues) — Type 1 uniquement ═════
function PassageCalendar({ sp, lang, edit, onClose, onOpenObs }) {
  const marks = new Map()
  ;(sp.inds||[]).forEach(ind => {
    const p = parseFrDate(ind.d)
    if (!p) return
    const key = `${p.month}-${p.day}`
    const prev = marks.get(key)
    if (!prev || p.year >= prev.year) marks.set(key, { ind, year:p.year })
  })
  const REF_YEAR = 2024 // année bissextile arbitraire, seulement pour aligner les jours de la semaine
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.6)', zIndex:170,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:18, width:'100%', maxWidth:920,
        maxHeight:'90vh', overflow:'auto', overscrollBehavior:'contain', border:`1px solid ${T.line}` }}>
        <div style={{ padding:'18px 20px 4px', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <div className="serif" style={{ fontSize:17, fontWeight:900, color:T.ink }}>
              {lang==='ru'?'Календарь появлений':'Calendrier des passages'}
            </div>
            <div style={{ fontSize:11.5, color:T.soft, marginTop:2 }}>{sp.n}</div>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%', background:T.card, color:T.soft,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <i className="ti ti-x" style={{ fontSize:14 }} aria-hidden="true" />
          </button>
        </div>
        <div style={{ padding:'12px 18px 6px', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:16 }}>
          {Array.from({ length:12 }).map((_, mi) => {
            const month = mi+1
            const first = new Date(REF_YEAR, mi, 1)
            const startDow = (first.getDay()+6)%7 // lundi=0
            const daysInMonth = new Date(REF_YEAR, mi+1, 0).getDate()
            const cells = []
            for (let i=0;i<startDow;i++) cells.push(null)
            for (let d=1; d<=daysInMonth; d++) cells.push(d)
            return (
              <div key={mi}>
                <div style={{ fontSize:12, fontWeight:700, color:T.ink, textAlign:'center', marginBottom:6 }}>
                  {(lang==='ru'?MONTHS_RU:MONTHS_FR)[mi]}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
                  {cells.map((d,i) => {
                    const mark = d!=null ? marks.get(`${month}-${d}`) : null
                    const on = !!mark
                    const clickable = on && edit
                    const Tag = clickable ? 'button' : 'div'
                    return (
                      <Tag key={i}
                        onClick={clickable ? ()=>onOpenObs(mark.ind) : undefined}
                        title={clickable ? (lang==='ru'?'Открыть наблюдение':'Ouvrir l’observation') : undefined}
                        style={{ aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:11.5, fontWeight:on?700:400, borderRadius:6, color: on?'#fff':T.mute,
                        background: on?T.clay:(d!=null?T.card:'transparent'),
                        border:'none', cursor: clickable?'pointer':(d!=null?'default':'default'),
                        boxShadow: on?'0 1px 3px rgba(143,74,34,.35)':'none' }}>
                        {d!=null ? (on?'●':d) : ''}
                      </Tag>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ padding:'0 20px 18px', fontSize:11, color:T.mute, lineHeight:1.5 }}>
          {edit
            ? (lang==='ru'?'Точки отмечают дни, когда это животное уже наблюдали — нажмите на точку, чтобы открыть наблюдение.'
              :'Les points marquent les dates où cet animal a déjà été observé — cliquer sur un point ouvre cette observation.')
            : (lang==='ru'?'Точки отмечают дни, когда это животное уже наблюдали (все годы вместе).'
              :'Les points marquent les dates où cet animal a déjà été observé (toutes années confondues).')}
        </div>
      </div>
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

// fusionne plusieurs passages sélectionnés en un seul individu reconnu —
// toutes leurs photos rejoignent le passage conservé (le plus ancien)
function MergeSheet({ sp, indNames, lang, wide, onClose, onDone }) {
  const [name, setName] = useState('')
  const [traits, setTraits] = useState('')
  const [busy, setBusy] = useState(false)
  const n = indNames.length
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.62)', zIndex:130,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#EDE7D8', borderRadius:18, padding:22,
        width:'100%', maxWidth:400, border:'1px solid #D3C7AE' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
          <span style={{ fontSize:20 }}>⭐</span>
          <div className="serif" style={{ fontSize:18, fontWeight:900, color:'#2B2620' }}>
            {lang==='ru'?'Опознать особь':(n>1?'Regrouper en individu':'Reconnaître un individu')}
          </div>
        </div>
        <div style={{ fontSize:12, color:'#6B6357', lineHeight:1.55, marginBottom:14 }}>
          {n>1
            ? (lang==='ru'
              ? `Ces ${n} наблюдения объединятся en un seul individu récurrent — toutes leurs photos seront rassemblées.`
              : `Ces ${n} passages deviendront un seul individu récurrent — toutes leurs photos seront rassemblées sous cette fiche.`)
            : (lang==='ru'
              ? 'Если вы узнаёте это животное по приметам — дайте ему имя.'
              : "Si tu reconnais cet animal à des signes distinctifs, donne-lui un nom.")}
        </div>
        <label style={{ fontSize:11, color:'#9A9081', display:'block', marginBottom:4 }}>
          {lang==='ru'?'Имя':'Nom'}
        </label>
        <input value={name} onChange={e=>setName(e.target.value)} autoFocus
          placeholder={lang==='ru'?'ex. Барсук со шрамом':'ex. Le blaireau à l\'oreille fendue'}
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
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:10,
            border:'1px solid #D3C7AE', color:'#6B6357', fontSize:13 }}>
            {lang==='ru'?'Отмена':'Annuler'}
          </button>
          <button disabled={busy} onClick={async()=>{
              if (!name.trim()) return
              setBusy(true)
              await mergeAsIndividual(sp.id, indNames, name.trim(), traits.trim())
              onDone()
            }}
            className="serif" style={{ flex:1.4, padding:'10px', borderRadius:10, background:'#B5602F',
              color:'#fff', fontSize:13.5, fontWeight:700, opacity:busy?.6:1 }}>
            {busy ? (lang==='ru'?'…':'…') : (lang==='ru'?'Опознать':'Reconnaître')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ObsCell({ spId, indName, method, label, named, uncertain }) {
  const { photos } = usePhotos(`ind:${spId}:${indName}`)
  const ph = photos[0]
  const ico = method==='eye'?'👁':method==='scope'?'🔭':method==='night'?'🌙':'📷'
  return (
    <span title={label} style={{ position:'relative', width:38, height:30, borderRadius:6, overflow:'hidden',
      display:'inline-block', flexShrink:0,
      border: uncertain?'1.5px solid #D68C34':named?'1.5px solid #C9A046':'1px solid #D3C7AE',
      boxShadow: uncertain?'0 0 0 1px rgba(214,140,52,.3)':named?'0 0 0 1px rgba(201,160,70,.25)':'none',
      background: ph?'#1E2418':'#DDD3BE' }}>
      {ph && <img src={ph.thumbUrl || ph.url} alt="" loading="lazy"
        style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:ph.pos||'50% 50%', filter:LUT, display:'block', ...thumbZoomStyle(ph) }} />}
      <span style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(14,16,10,.72)',
        color:'#F2EEE2', fontSize:7, lineHeight:'10px', textAlign:'center' }}>{ico}</span>
      {uncertain && <span style={{ position:'absolute', top:-1, right:-1, width:11, height:11, borderRadius:'50%',
        background:'#D68C34', color:'#fff', fontSize:8, fontWeight:800, display:'flex', alignItems:'center',
        justifyContent:'center', lineHeight:1, border:'1px solid #EDE7D8' }}>?</span>}
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
        style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:ph.pos||'50% 50%', filter:LUT, display:'block', ...thumbZoomStyle(ph) }} />}
      <span style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(14,16,10,.72)',
        color:'#F2EEE2', fontSize:7, lineHeight:'10px', textAlign:'center' }}>{ico}</span>
    </span>
  )
}

function Shell({ children, lang, setLang, onHome, edit, onToggleEdit, pageTitle }) {
  return (
    <div style={{ minHeight:'100vh', background:'#EDE7D8' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 24px', borderBottom:'1px solid #D3C7AE', background:'#E3DAC5', position:'sticky', top:0, zIndex:30 }}>
        <button onClick={onHome} style={{ display:'flex', alignItems:'center', gap:9 }}>
          <BobberIcon size={26} />
          <span style={{ textAlign:'left' }}>
            <span className="serif" style={{ display:'block', fontSize:10.5, fontWeight:600, color:'#9A9081', letterSpacing:'.3px' }}>Pludini Doc</span>
            <span className="serif" style={{ display:'block', fontSize:20, fontWeight:900, color:'#2B2620', letterSpacing:'-0.4px', lineHeight:1.05 }}>{pageTitle}</span>
          </span>
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
      {onToggleEdit && <EditToggleBtn editMode={edit} onToggle={onToggleEdit} lang={lang} />}
    </div>
  )
}

function MiniMap({ gps, lang, excludeKey, onJump }) {
  const [lat, lon] = gps
  const [spotOpen, setSpotOpen] = useState(false)
  const spot = spotOpen ? sightingsNearGps(lat, lon).filter(r => `${r.sp.id}::${r.ind.n}` !== excludeKey) : []
  return (
    <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid #D3C7AE', marginBottom:9 }}>
      <div style={{ position:'relative' }}>
        <SatMap center={{ lat, lon }} pins={[{ id:'p', lat, lon, color:'#B5602F', emoji:'📍' }]} height={170}
          onSelect={()=>setSpotOpen(v=>!v)} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 11px', background:'#E6DDC8', fontSize:11, color:'#6B6357' }}>
        <button onClick={()=>setSpotOpen(v=>!v)} style={{ display:'flex', alignItems:'center', gap:5, color:'#6B6357' }}>
          <i className="ti ti-map-pin" style={{ fontSize:13, color:'#B5602F' }} aria-hidden="true" />
          {lat.toFixed(4)}° N · {lon.toFixed(4)}° E
        </button>
        <a href={`https://www.google.com/maps/@${lat},${lon},17z/data=!3m1!1e3`} target="_blank" rel="noreferrer" style={{ color:'#8F4A22', textDecoration:'none', fontWeight:600 }}>Ouvrir ↗</a>
      </div>
      {spotOpen && (
        <div style={{ background:'#E6DDC8', borderTop:'1px solid #D3C7AE', padding:'9px 11px' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#8F4A22', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:7 }}>
            {lang==='ru'?'Здесь также замечены':'Vues au même endroit'} {spot.length ? `(${spot.length})` : ''}
          </div>
          {spot.length === 0 ? (
            <div style={{ fontSize:11.5, color:'#9A9081', fontStyle:'italic' }}>
              {lang==='ru'?'Ничего другого здесь не замечено.':'Aucune autre observation à cet endroit.'}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {spot.map(({ sp:sp2, ind:ind2 }, i) => (
                <button key={i} onClick={()=>onJump?.(sp2, ind2)} style={{ display:'flex', alignItems:'center', gap:8,
                  padding:'6px 8px', borderRadius:9, background:'#DDD3BE', textAlign:'left' }}>
                  <span style={{ fontSize:15 }}>{sp2.e}</span>
                  <span style={{ flex:1, minWidth:0 }}>
                    <span style={{ display:'block', fontSize:11.5, fontWeight:600, color:'#2B2620' }}>{sp2.n}</span>
                    <span style={{ display:'block', fontSize:10, color:'#8A8172' }}>{ind2.named ? '⭐ ' : ''}{ind2.displayName} · {ind2.d}</span>
                  </span>
                  <i className="ti ti-chevron-right" style={{ fontSize:13, color:'#9A9081' }} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
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
