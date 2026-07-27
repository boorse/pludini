import { useState, useEffect, useRef } from 'react'
import { gradientFor } from './gradients.js'
import { PhotoBg, PhotoHero, PhotoManager, usePhotos, LUT } from './photoui.jsx'
import { getMe } from './store.js'

const T = {
  bg:'#EDE7D8', card:'#E6DDC8', ink:'#2B2620', soft:'#6B6357', mute:'#9A9081',
  line:'#D3C7AE', clay:'#B5602F',
}

const TXT = {
  fr: {
    tag:'Chambre d’hôtes', heroTitle:'Une nuit dans la forêt',
    heroSub:'Faune sauvage, autosuffisance et nuits sans une seule lumière — une propriété familiale nichée dans la forêt du Vidzeme, à vivre le temps d’une nuit.',
    book:'Réserver une nuit', activitiesTitle:'À vivre sur place', back:'Accueil', edit:'Édition',
    bookingTitle:'Réserver votre séjour', chooseDates:'Choisissez vos dates', night:'nuit', nights:'nuits',
    payment:'Moyen de paiement', confirm:'Confirmer la demande',
    disclaimer:'Module de paiement bientôt disponible — pour l’instant, contactez-nous directement.',
    toastOk:'Demande enregistrée (maquette) — le paiement en ligne arrive bientôt !',
    toastPick:'Choisissez une date d’arrivée et de départ.',
    methods:['Carte bancaire','Virement','PayPal'],
    storyTitle:'Notre histoire',
    storyText:'Le cidre se presse encore comme au temps de notre grand-père, un lynx passe parfois devant nos pièges photo, et la nuit ici n’a pas la moindre lumière parasite. Plus qu’une liste d’activités, c’est un lieu vivant — où la forêt, la ferme et le silence se partagent.',
    seasonAll:'Toute l’année', seasons:{ spring:'Printemps', summer:'Été', autumn:'Automne', winter:'Hiver' },
    comfortLine:'Un intérieur chaleureux, entre bois brut et lumière du matin.',
  },
  ru: {
    tag:'Гостевой дом', heroTitle:'Ночь в лесу',
    heroSub:'Дикая природа, натуральное хозяйство и ночи без единого огня — семейное поместье в лесах Видземе, где можно провести хотя бы одну ночь.',
    book:'Забронировать ночь', activitiesTitle:'Чем заняться на месте', back:'Домой', edit:'Правка',
    bookingTitle:'Забронировать проживание', chooseDates:'Выберите даты', night:'ночь', nights:'ночей',
    payment:'Способ оплаты', confirm:'Подтвердить запрос',
    disclaimer:'Модуль онлайн-оплаты скоро появится — пока свяжитесь с нами напрямую.',
    toastOk:'Запрос сохранён (макет) — онлайн-оплата скоро будет доступна!',
    toastPick:'Выберите дату заезда и отъезда.',
    methods:['Банковская карта','Банковский перевод','PayPal'],
    storyTitle:'Наша история',
    storyText:'Сидр здесь до сих пор давят так же, как во времена нашего деда, рысь порой проходит перед нашими фотоловушками, а ночью здесь нет ни единого постороннего огня. Это не список развлечений — это живое место, где лес, ферма и тишина делятся с гостями.',
    seasonAll:'Круглый год', seasons:{ spring:'Весна', summer:'Лето', autumn:'Осень', winter:'Зима' },
    comfortLine:'Тёплый интерьер — необработанное дерево и утренний свет.',
  },
  en: {
    tag:'Guest house', heroTitle:'A night in the forest',
    heroSub:'Wild animals, self-sufficiency, and nights without a single light — a family property tucked into the forests of Vidzeme, to experience for a night.',
    book:'Book a night', activitiesTitle:'Things to do here', back:'Home', edit:'Edit',
    bookingTitle:'Book your stay', chooseDates:'Choose your dates', night:'night', nights:'nights',
    payment:'Payment method', confirm:'Confirm request',
    disclaimer:'Online payment is coming soon — for now, contact us directly.',
    toastOk:'Request saved (mockup) — online payment is coming soon!',
    toastPick:'Please choose a check-in and check-out date.',
    methods:['Credit card','Bank transfer','PayPal'],
    storyTitle:'Our story',
    storyText:'Cider is still pressed here the way our grandfather did it, a lynx sometimes walks past our camera traps, and at night there isn’t a single stray light. More than a list of activities, this is a living place — where the forest, the farm and the silence are shared.',
    seasonAll:'Year-round', seasons:{ spring:'Spring', summer:'Summer', autumn:'Autumn', winter:'Winter' },
    comfortLine:'A warm interior, raw wood and morning light.',
  },
}

const CATEGORIES = [
  { key:'nature', items:[
    { id:'nature_faune', icon:'🦌', seasons:['all'],
      fr:{ title:'Observations sauvages', text:'Cerfs, chevreuils, sangliers, renards, et parfois un lynx, un élan ou un loup — à l’affût le jour, en vision thermique la nuit, ou révélés par nos pièges photo. Grues, pygargue et grand tétras complètent le tableau selon la saison.' },
      ru:{ title:'Наблюдения за живой природой', text:'Олени, косули, кабаны, лисы, а иногда рысь, лось или волк — в засаде днём, в тепловизоре ночью, или на фотоловушках. Журавли, орлан и глухарь дополняют картину в зависимости от сезона.' },
      en:{ title:'Wildlife watching', text:'Deer, roe deer, wild boar, foxes, and sometimes a lynx, elk or wolf — spotted by day, caught on thermal cameras by night, or revealed by our camera traps. Cranes, eagles and capercaillie complete the picture depending on the season.' } },
    { id:'astro', icon:'✨', seasons:['autumn','winter'],
      fr:{ title:'Ciel étoilé', text:'Un ciel très noir près des lacs, sans aucune lumière parasite — télescope sur demande.' },
      ru:{ title:'Звёздное небо', text:'По-настоящему тёмное небо у озёр, без единого постороннего огня — телескоп по запросу.' },
      en:{ title:'Starry sky', text:'A truly dark sky by the lakes, with zero light pollution — telescope on request.' } },
  ]},
  { key:'ferme', items:[
    { id:'ferme_fromage', icon:'🐐', seasons:['all'],
      fr:{ title:'Ferme & fromage', text:'Poules, dindes, lapins et chèvres à nourrir et câliner, miel récolté aux côtés des abeilles, et un après-midi à faire son propre fromage de chèvre.' },
      ru:{ title:'Ферма и сыр', text:'Куры, индюки, кролики и козы — покормить и приласкать, мёд рядом с пчёлами, и полдня, чтобы сделать свой козий сыр.' },
      en:{ title:'Farm & cheese', text:'Hens, turkeys, rabbits and goats to feed and cuddle, honey harvested alongside the bees, and an afternoon making your own goat cheese.' } },
  ]},
  { key:'artisanat', items:[
    { id:'pain', icon:'🍞', seasons:['all'],
      fr:{ title:'Fabrication du pain', text:'Pétrissage et cuisson au four à bois, recette transmise de génération en génération.' },
      ru:{ title:'Выпечка хлеба', text:'Замес и выпечка в дровяной печи — рецепт, передаваемый из поколения в поколение.' },
      en:{ title:'Bread making', text:'Kneading and baking in the wood-fired oven, a recipe passed down through generations.' } },
    { id:'cidre', icon:'🍎', seasons:['autumn'],
      fr:{ title:'Cidre & eau-de-vie de pomme', text:'Pressoir et alambic, une tradition familiale transmise depuis le grand-père.' },
      ru:{ title:'Сидр и яблочный бренди', text:'Пресс и самогонный аппарат — семейная традиция, идущая от деда.' },
      en:{ title:'Cider & apple brandy', text:'Press and still — a family tradition passed down from grandfather.' } },
    { id:'cuisine_conserves', icon:'🔥', seasons:['all'],
      fr:{ title:'Cuisine & conserves', text:'Plats mijotés au feu de bois, bocaux, sirops et légumes lacto-fermentés préparés au fil des récoltes.' },
      ru:{ title:'Кухня и заготовки', text:'Блюда, томлёные на дровяном огне, банки, сиропы и ферментированные овощи по мере урожая.' },
      en:{ title:'Cooking & preserves', text:'Dishes slow-cooked over a wood fire, jars, syrups and lacto-fermented vegetables prepared as the harvest comes in.' } },
  ]},
  { key:'jardin', items:[
    { id:'jardin_verger', icon:'🥕', seasons:['spring','summer','autumn'],
      fr:{ title:'Jardin & verger', text:'Semis, désherbage et récolte au potager ; arbres fruitiers à découvrir, de la floraison à la cueillette.' },
      ru:{ title:'Сад и огород', text:'Посев, прополка и сбор урожая в огороде; фруктовые деревья — от цветения до сбора урожая.' },
      en:{ title:'Garden & orchard', text:'Sowing, weeding and harvesting in the vegetable garden; fruit trees to discover, from blossom to harvest.' } },
  ]},
  { key:'pleinair', items:[
    { id:'arc', icon:'🏹', seasons:['all'],
      fr:{ title:'Tir à l’arc', text:'Initiation au tir à l’arc traditionnel dans la clairière, encadrée pour tous niveaux.' },
      ru:{ title:'Стрельба из лука', text:'Знакомство с традиционной стрельбой из лука на поляне — для любого уровня.' },
      en:{ title:'Archery', text:'Introduction to traditional archery in the clearing, suitable for all levels.' } },
    { id:'peche', icon:'🎣', seasons:['spring','summer','autumn'],
      fr:{ title:'Pêche', text:'Sur les lacs et la rivière Līčupe. Cannes et appâts fournis, à l’aube ou au crépuscule.' },
      ru:{ title:'Рыбалка', text:'На озёрах и реке Личупе. Удочки и наживка предоставляются — на рассвете или на закате.' },
      en:{ title:'Fishing', text:'On the lakes and the Līčupe river. Rods and bait provided, at dawn or dusk.' } },
    { id:'balades_bivouac', icon:'🥾', seasons:['all'],
      fr:{ title:'Balades & bivouac', text:'Marcher en forêt ou sur les sentiers du parc national de la Gauja, jusqu’à une nuit en bivouac sous les étoiles.' },
      ru:{ title:'Прогулки и ночёвка', text:'Прогулки по лесу или по тропам национального парка Гауя — вплоть до ночёвки под открытым небом.' },
      en:{ title:'Walks & camping', text:'Walking in the forest or along the trails of Gauja National Park — even camping out under the stars.' } },
    { id:'baignade_kayak', icon:'🛶', seasons:['summer'],
      fr:{ title:'Baignade & kayak', text:'Un plongeon dans l’eau claire des lacs, ou une descente tranquille de la Gauja en kayak ou en canoë.' },
      ru:{ title:'Купание и байдарка', text:'Купание в чистой воде озёр или спокойный сплав по Гауе на байдарке или каноэ.' },
      en:{ title:'Swimming & kayaking', text:'A dip in the clear lake water, or a gentle paddle down the Gauja by kayak or canoe.' } },
  ]},
  { key:'culture', items:[
    { id:'chateaux_villages', icon:'🏰', seasons:['all'],
      fr:{ title:'Châteaux & villages du Vidzeme', text:'Les forteresses de Cēsis et Rauna, et les villages alentour, à découvrir à proximité.' },
      ru:{ title:'Замки и деревни Видземе', text:'Крепости Цесис и Раунас, а также окрестные деревни — совсем рядом.' },
      en:{ title:'Castles & villages of Vidzeme', text:'The fortresses of Cēsis and Rauna, and the surrounding villages, all nearby.' } },
  ]},
]

const ALL_ACTIVITIES = CATEGORIES.flatMap(c => c.items)

function seasonLabel(lang, seasons) {
  const l = TXT[lang]
  if (!seasons || seasons.includes('all')) return l.seasonAll
  return seasons.map(s => l.seasons[s]).join(' · ')
}

// accord du mot "nuit(s)" — le russe a 3 formes (1 / 2-4 / 5+), pas juste singulier/pluriel
function nightsLabel(lang, n) {
  if (lang === 'ru') {
    const mod10 = n % 10, mod100 = n % 100
    if (mod10 === 1 && mod100 !== 11) return 'ночь'
    if ([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return 'ночи'
    return 'ночей'
  }
  const l = TXT[lang]
  return n > 1 ? l.nights : l.night
}

function Toast({ msg }) {
  return (
    <div style={{ position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)', zIndex:200,
      background:'rgba(43,38,32,.92)', color:'#F2EEE2', padding:'11px 18px', borderRadius:14,
      fontSize:12.5, maxWidth:'88%', textAlign:'center', boxShadow:'0 8px 24px rgba(0,0,0,.35)' }}>{msg}</div>
  )
}

function PwModal({ lang, pw, setPw, onSubmit, onClose }) {
  const l = TXT[lang]
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(43,38,32,.45)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:170, padding:20 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:18, padding:24,
        width:'100%', maxWidth:320, border:`1px solid ${T.line}` }}>
        <div className="serif" style={{ fontSize:18, fontWeight:900, color:T.ink, marginBottom:12 }}>{l.edit}</div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&onSubmit()} placeholder="•••" autoFocus
          style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${T.line}`,
            background:T.card, fontSize:13, marginBottom:12, color:T.ink }} />
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:'9px', borderRadius:10, border:`1px solid ${T.line}`, color:T.soft, fontSize:13 }}>✕</button>
          <button onClick={onSubmit} className="serif" style={{ flex:1, padding:'9px', borderRadius:10,
            background:T.clay, color:'#fff', fontSize:13, fontWeight:600 }}>OK</button>
        </div>
      </div>
    </div>
  )
}

function EditBtn({ onClick, style }) {
  return (
    <button onClick={(e)=>{ e.stopPropagation(); onClick() }} style={{ position:'absolute', top:12, right:12, zIndex:6,
      background:'rgba(0,0,0,.5)', color:'#fff', borderRadius:14, padding:'6px 10px', fontSize:11.5,
      fontWeight:600, display:'flex', alignItems:'center', gap:5, ...style }}>
      <i className="ti ti-camera-plus" style={{ fontSize:13 }} aria-hidden="true" />
    </button>
  )
}

function TopBar({ lang, setLang, onBack, backLabel, siteTitle }) {
  return (
    <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:5, padding:'18px 24px' }}>
      {siteTitle && (
        <div className="serif" style={{ fontSize:15, fontWeight:600, color:'#F2EEE2', marginBottom:4 }}>{siteTitle}</div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, color:'#F2EEE2', fontSize:13 }}>
          <i className="ti ti-arrow-left" aria-hidden="true" />{backLabel}
        </button>
        <div style={{ display:'flex', gap:5 }}>
          {['fr','ru','en'].map(c => (
            <button key={c} onClick={()=>setLang(c)} style={{ fontSize:10.5, padding:'4px 9px', borderRadius:12,
              background: lang===c ? 'rgba(242,238,226,.9)' : 'rgba(242,238,226,.13)',
              color: lang===c ? '#2B2620' : 'rgba(242,238,226,.8)', fontWeight:600,
              border:'1px solid rgba(242,238,226,.28)' }}>{c.toUpperCase()}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Fond photo qui défile tout seul toutes les 7s, glissement latéral (pas de coupe sèche) ──
function AutoSlideshow({ target, fallback, arrows }) {
  const { photos } = usePhotos(target)
  const [idx, setIdx] = useState(0)
  useEffect(() => { if (idx >= photos.length) setIdx(0) }, [photos.length, idx])
  useEffect(() => {
    if (photos.length < 2) return
    const t = setInterval(() => setIdx(i => (i+1) % photos.length), 7000)
    return () => clearInterval(t)
  }, [photos.length])
  const many = photos.length > 1
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', background: photos.length ? '#1E2418' : fallback }}>
      {photos.map((p,i)=>(
        <img key={p.id} src={p.url} alt="" loading="lazy" decoding="async" draggable={false}
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
            objectPosition:p.pos||'50% 50%', filter:LUT, display:'block',
            transform:`translateX(${(i-idx)*100}%)`, transition:'transform .6s cubic-bezier(.4,0,.2,1)' }} />
      ))}
      {arrows && many && <>
        <button onClick={(e)=>{ e.stopPropagation(); setIdx(i=>(i-1+photos.length)%photos.length) }}
          style={{ position:'absolute', top:'50%', left:14, transform:'translateY(-50%)', zIndex:4,
            width:38, height:38, borderRadius:'50%', background:'rgba(0,0,0,.35)', color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>‹</button>
        <button onClick={(e)=>{ e.stopPropagation(); setIdx(i=>(i+1)%photos.length) }}
          style={{ position:'absolute', top:'50%', right:14, transform:'translateY(-50%)', zIndex:4,
            width:38, height:38, borderRadius:'50%', background:'rgba(0,0,0,.35)', color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>›</button>
      </>}
    </div>
  )
}

// ── Bandeau "confort" : légende fine + photos d'intérieur qu'on fait défiler
// soi-même (la suivante reste visible en bordure, comme une invite à glisser) ──
function ComfortStrip({ lang, wide, canEditImages, onEditPhoto }) {
  const { photos } = usePhotos('exp:comfort')
  const trackRef = useRef(null)
  const l = TXT[lang]
  const loop = photos.length > 1
  const items = loop ? [...photos, ...photos, ...photos] : (photos.length ? photos : [null])

  // Boucle infinie : on affiche 3 copies de la liste et on recentre discrètement
  // (sans animation) sur la copie du milieu dès qu'on dérive vers une copie voisine.
  useEffect(() => {
    const el = trackRef.current
    if (!el || !loop) return
    el.scrollLeft = el.scrollWidth / 3
  }, [loop, photos.length])

  useEffect(() => {
    const el = trackRef.current
    if (!el || !loop) return
    const onScroll = () => {
      const single = el.scrollWidth / 3
      if (el.scrollLeft < single * 0.5) el.scrollLeft += single
      else if (el.scrollLeft > single * 1.5) el.scrollLeft -= single
    }
    el.addEventListener('scroll', onScroll, { passive:true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [loop])

  const scrollNext = () => {
    const el = trackRef.current; if (!el) return
    const tile = el.firstElementChild
    const step = tile ? tile.getBoundingClientRect().width + 10 : el.clientWidth * 0.8
    el.scrollBy({ left: step, behavior:'smooth' })
  }
  if (!photos.length && !canEditImages) return null
  return (
    <div style={{ padding: wide?'44px 0 6px':'30px 0 4px' }}>
      <div style={{ textAlign:'center', padding: wide?'0 40px 18px':'0 20px 12px' }}>
        <span style={{ fontSize: wide?14:12.5, color:T.soft, lineHeight:1.5 }}>{l.comfortLine}</span>
      </div>
      <div style={{ position:'relative' }}>
        <div ref={trackRef} style={{ display:'flex', gap:10, overflowX:'auto', scrollSnapType:'x mandatory',
          WebkitOverflowScrolling:'touch', height: wide?'46dvh':'35dvh',
          padding: wide?'0 40px':'0 20px' }}>
          {items.map((p,i)=>(
            <div key={p ? `${p.id}-${i}` : i} style={{ position:'relative', flex:'0 0 auto', height:'100%', aspectRatio:'4/3',
              borderRadius:16, overflow:'hidden', scrollSnapAlign:'center',
              background: p ? '#1E2418' : 'linear-gradient(150deg,#3E5233 0%,#7A8B5C 100%)' }}>
              {p && <img src={p.url} alt="" loading="lazy" decoding="async" draggable={false}
                style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:p.pos||'50% 50%', filter:LUT, display:'block' }} />}
            </div>
          ))}
        </div>
        {loop && (
          <button onClick={scrollNext} aria-label="next" style={{ position:'absolute', top:'50%', right: wide?26:10,
            transform:'translateY(-50%)', width:38, height:38, borderRadius:'50%', background:'#C9D98A', color:'#22301C',
            fontSize:19, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 14px rgba(0,0,0,.25)' }}>›</button>
        )}
        {canEditImages && <EditBtn onClick={onEditPhoto} style={{ top:10, right: wide?50:20 }} />}
      </div>
    </div>
  )
}

// ── Vignette de la grille "à la Instagram Explore" : titre révélé au survol / au toucher ──
function ActivityTile({ a, lang, edit, wide, onOpen, onEditPhoto }) {
  const [hover, setHover] = useState(false)
  const at = a[lang]
  return (
    <button onClick={onOpen} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ position:'relative', aspectRatio:'1', overflow:'hidden', border:'none', padding:0, borderRadius:14,
        flex: wide ? '1 1 300px' : '1 1 170px', maxWidth: wide ? 480 : 260 }}>
      <div style={{ position:'absolute', inset:0, filter: hover ? 'none' : 'grayscale(0.55) brightness(0.87)', transition:'filter .25s' }}>
        <AutoSlideshow target={`exp:activity:${a.id}`} fallback={gradientFor('exp-'+a.id)} />
      </div>
      <div style={{ position:'absolute', inset:0, background:'rgba(16,14,10,.5)', opacity: hover?1:0,
        transition:'opacity .2s', display:'flex', alignItems:'center', justifyContent:'center', padding:14 }}>
        <span className="serif" style={{ color:'#F2EEE2', fontSize:19, fontWeight:700, textAlign:'center', lineHeight:1.2 }}>{at.title}</span>
      </div>
      {!hover && (
        <span style={{ position:'absolute', bottom:10, left:10, fontSize:11, background:'rgba(0,0,0,.45)',
          color:'#F2EEE2', padding:'3px 8px', borderRadius:10 }}>{seasonLabel(lang, a.seasons)}</span>
      )}
      {edit && <EditBtn onClick={()=>onEditPhoto(a)} style={{ top:10, right:10, padding:'6px 9px' }} />}
    </button>
  )
}

// ── Page détail d'une activité : grande photo (carrousel si plusieurs images) + texte ──
function ActivityDetail({ a, lang, setLang, wide, edit, onBack, onEditPhoto }) {
  const at = a[lang]
  const l = TXT[lang]
  return (
    <div>
      <div style={{ position:'relative', height: wide?'68vh':'44vh', minHeight:300, overflow:'hidden' }}>
        <PhotoHero target={`exp:activity:${a.id}`} fallback={gradientFor('exp-'+a.id)} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(16,14,10,.75), transparent 50%)', pointerEvents:'none' }} />
        <TopBar lang={lang} setLang={setLang} onBack={onBack} backLabel={l.activitiesTitle} />
        {edit && <EditBtn onClick={()=>onEditPhoto(a)} style={{ top:64 }} />}
        <div style={{ position:'absolute', left:0, right:0, bottom:0, padding: wide?'0 40px 30px':'0 20px 22px' }}>
          <span style={{ fontSize: wide?38:30 }}>{a.icon}</span>
          <h1 className="serif" style={{ fontSize: wide?40:27, fontWeight:800, color:'#F2EEE2', letterSpacing:'-.8px', margin:'6px 0 4px' }}>{at.title}</h1>
          <span style={{ fontSize:12, color:'rgba(242,238,226,.75)' }}>{seasonLabel(lang, a.seasons)}</span>
        </div>
      </div>
      <div style={{ padding: wide?'36px 60px 60px':'26px 20px 44px', maxWidth:720, margin:'0 auto' }}>
        <p style={{ fontSize: wide?16:14, lineHeight:1.85, color:T.ink }}>{at.text}</p>
      </div>
    </div>
  )
}

function BookingCalendar({ lang, checkin, checkout, onPick }) {
  const [monthDate, setMonthDate] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const year = monthDate.getFullYear(), month = monthDate.getMonth()
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const monthLabel = monthDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'fr-FR', { month:'long', year:'numeric' })
  const weekDays = lang === 'ru' ? ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
    : lang === 'en' ? ['Mo','Tu','We','Th','Fr','Sa','Su'] : ['Lu','Ma','Me','Je','Ve','Sa','Di']

  const inRange = (d) => checkin && checkout && d > checkin && d < checkout
  const isEdge = (d) => (checkin && d.getTime() === checkin.getTime()) || (checkout && d.getTime() === checkout.getTime())

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <button onClick={()=>setMonthDate(new Date(year, month-1, 1))} style={{ width:28, height:28, borderRadius:'50%', border:`1px solid ${T.line}`, color:T.soft }}>‹</button>
        <span className="serif" style={{ fontSize:14.5, fontWeight:700, color:T.ink, textTransform:'capitalize' }}>{monthLabel}</span>
        <button onClick={()=>setMonthDate(new Date(year, month+1, 1))} style={{ width:28, height:28, borderRadius:'50%', border:`1px solid ${T.line}`, color:T.soft }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:4 }}>
        {weekDays.map(w => <div key={w} style={{ textAlign:'center', fontSize:10.5, color:T.mute, fontWeight:600 }}>{w}</div>)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const past = d < today
          const active = isEdge(d), between = inRange(d)
          return (
            <button key={i} disabled={past} onClick={()=>onPick(d)}
              style={{ aspectRatio:'1', borderRadius:9, fontSize:12,
                background: active ? T.clay : between ? 'rgba(181,96,47,.22)' : 'transparent',
                color: past ? T.mute : active ? '#fff' : T.ink, opacity: past?.4:1, fontWeight: active?700:400 }}>
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Booking({ lang, onBack }) {
  const l = TXT[lang]
  const [checkin, setCheckin] = useState(null)
  const [checkout, setCheckout] = useState(null)
  const [method, setMethod] = useState(0)
  const [toast, setToast] = useState(null)

  const pick = (d) => {
    if (!checkin || (checkin && checkout)) { setCheckin(d); setCheckout(null) }
    else if (d.getTime() === checkin.getTime()) { setCheckin(null) }
    else if (d < checkin) { setCheckin(d) }
    else { setCheckout(d) }
  }
  const nights = checkin && checkout ? Math.round((checkout - checkin) / 86400000) : 0

  const confirm = () => {
    if (!checkin || !checkout) { setToast(l.toastPick); setTimeout(()=>setToast(null), 3000); return }
    setToast(l.toastOk); setTimeout(()=>setToast(null), 3600)
  }

  return (
    <div style={{ minHeight:'100vh', background:T.bg, padding:'20px 18px 60px' }}>
      <div style={{ maxWidth:480, margin:'0 auto' }}>
        <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, color:T.soft, fontSize:13, marginBottom:16 }}>
          <i className="ti ti-arrow-left" aria-hidden="true" />{l.back}
        </button>
        <h2 className="serif" style={{ fontSize:24, fontWeight:900, color:T.ink, marginBottom:16 }}>{l.bookingTitle}</h2>
        <div style={{ background:T.card, borderRadius:16, border:`1px solid ${T.line}`, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:12, color:T.soft, marginBottom:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>{l.chooseDates}</div>
          <BookingCalendar lang={lang} checkin={checkin} checkout={checkout} onPick={pick} />
          {nights > 0 && (
            <div style={{ marginTop:10, fontSize:13, color:T.ink, fontWeight:600 }}>
              {nights} {nightsLabel(lang, nights)}
            </div>
          )}
        </div>
        <div style={{ background:T.card, borderRadius:16, border:`1px solid ${T.line}`, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:12, color:T.soft, marginBottom:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>{l.payment}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {l.methods.map((m, i) => (
              <button key={m} onClick={()=>setMethod(i)} style={{ display:'flex', alignItems:'center', gap:10,
                padding:'11px 13px', borderRadius:11, border:`1.5px solid ${method===i?T.clay:T.line}`,
                background: method===i ? 'rgba(181,96,47,.1)' : 'transparent', textAlign:'left' }}>
                <span style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${method===i?T.clay:T.line}`,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {method === i && <span style={{ width:8, height:8, borderRadius:'50%', background:T.clay }} />}
                </span>
                <span style={{ fontSize:13, color:T.ink }}>{m}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={confirm} className="serif" style={{ width:'100%', padding:'14px', borderRadius:14,
          background:T.clay, color:'#fff', fontSize:15, fontWeight:700, marginBottom:10 }}>{l.confirm}</button>
        <div style={{ fontSize:11, color:T.mute, textAlign:'center', lineHeight:1.5 }}>{l.disclaimer}</div>
      </div>
      {toast && <Toast msg={toast} />}
    </div>
  )
}

export default function Experience({ wide, onBack }) {
  const [lang, setLang] = useState('fr')
  const [view, setView] = useState('home') // home | activity | booking
  const [activeId, setActiveId] = useState(null)
  const [edit, setEdit] = useState(() => { try { return localStorage.getItem('pludini_editExp') === '1' } catch { return false } })
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [photoTarget, setPhotoTarget] = useState(null)
  const l = TXT[lang]
  // seul Ferdinand peut changer les images de Pludini Host (le mode édition
  // lui-même reste accessible à qui connaît le mot de passe, mais ne révèle
  // les boutons photo qu'à lui)
  const canEditImages = edit && getMe() === 'Ferdinand'

  // mémorise la position de défilement de chaque vue (accueil/activité/réservation)
  const scrollPos = useRef({})
  const goView = (v) => { scrollPos.current[view] = window.scrollY; setView(v) }
  useEffect(() => { window.scrollTo(0, scrollPos.current[view] || 0) }, [view])

  const submitPw = () => {
    if (pw === 'arc') { setEdit(true); setPwOpen(false); setPw(''); try { localStorage.setItem('pludini_editExp', '1') } catch {} }
    else setPw('')
  }
  const toggleEdit = () => {
    if (edit) { setEdit(false); try { localStorage.setItem('pludini_editExp', '0') } catch {} }
    else setPwOpen(true)
  }
  const openPhoto = (a) => setPhotoTarget({ target:`exp:activity:${a.id}`, label:a[lang].title })

  if (view === 'booking') return <Booking lang={lang} onBack={()=>goView('home')} />

  const activity = ALL_ACTIVITIES.find(a => a.id === activeId)

  return (
    <div style={{ minHeight:'100vh', background:T.bg }}>
      {view === 'activity' && activity ? (
        <ActivityDetail a={activity} lang={lang} setLang={setLang} wide={wide} edit={canEditImages}
          onBack={()=>goView('home')} onEditPhoto={openPhoto} />
      ) : (
        <>
          <div style={{ position:'relative', height:`calc(${wide?92:70}dvh + ${wide?90:70}px)`, minHeight:440, overflow:'hidden' }}>
            <AutoSlideshow target="exp:hero" fallback="linear-gradient(160deg,#2A2118 0%,#5C4A2E 45%,#A88B5C 100%)" arrows />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(16,14,10,.5) 0%, rgba(16,14,10,.1) 38%, rgba(16,14,10,.6) 100%)' }} />
            <TopBar lang={lang} setLang={setLang} onBack={onBack} backLabel="Pludini Doc" siteTitle="Pludini Host" />
            {canEditImages && <EditBtn onClick={()=>setPhotoTarget({ target:'exp:hero', label:'Hero' })} style={{ top:64 }} />}
            <div style={{ position:'relative', height:`${wide?92:70}dvh`, display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', textAlign:'center', padding: wide?'0 40px':'0 22px' }}>
              <span style={{ fontSize:11, letterSpacing:'2px', textTransform:'uppercase', color:'#E0B98A', fontWeight:700, marginBottom:14 }}>{l.tag}</span>
              <h1 className="serif" style={{ fontSize: wide?68:36, fontWeight:600, color:'#F2EEE2',
                letterSpacing:'-1.4px', lineHeight:1.06, marginBottom:16 }}>{l.heroTitle}</h1>
              <p style={{ fontSize: wide?15.5:13, color:'rgba(237,231,216,.88)', maxWidth:480, lineHeight:1.65, marginBottom:26 }}>{l.heroSub}</p>
              <button onClick={()=>goView('booking')} className="serif" style={{ background:T.clay, color:'#fff',
                padding: wide?'14px 28px':'12px 22px', borderRadius:18, fontSize: wide?15:13.5, fontWeight:700,
                display:'inline-flex', alignItems:'center', gap:8, boxShadow:'0 10px 28px rgba(0,0,0,.4)' }}>
                {l.book}<i className="ti ti-arrow-up-right" style={{ fontSize:15 }} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div style={{ position:'relative', marginTop: -(wide?90:70), borderRadius: wide?'32px 32px 0 0':'22px 22px 0 0',
            backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)', background:'rgba(237,231,216,.78)' }}>
            <ComfortStrip lang={lang} wide={wide} canEditImages={canEditImages}
              onEditPhoto={()=>setPhotoTarget({ target:'exp:comfort', label:l.comfortLine })} />
            <div style={{ padding: wide?'28px 32px 0':'20px 16px 0', textAlign:'center' }}>
              <h2 className="serif" style={{ fontSize: wide?26:20, fontWeight:700, color:T.ink }}>{l.activitiesTitle}</h2>
            </div>

            <div style={{ display:'flex', flexWrap:'wrap', gap:4,
              padding: wide?'20px 32px 10px':'14px 6px 4px' }}>
              {ALL_ACTIVITIES.map(a => (
                <ActivityTile key={a.id} a={a} lang={lang} edit={canEditImages} wide={wide}
                  onOpen={()=>{ setActiveId(a.id); goView('activity') }} onEditPhoto={openPhoto} />
              ))}
              {/* comble la dernière ligne sans étirer une vraie vignette ni laisser un trou visible */}
              {Array.from({ length:6 }).map((_,i) => (
                <div key={'filler'+i} aria-hidden="true"
                  style={{ flex: wide ? '1 1 300px' : '1 1 170px', maxWidth: wide ? 480 : 260, height:0 }} />
              ))}
            </div>
          </div>

          <div style={{ padding: wide?'64px 40px 20px':'46px 22px 14px', textAlign:'center', maxWidth:680, margin:'0 auto' }}>
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
              <div style={{ flex:1, height:1, background:T.line }} />
              <h2 className="serif" style={{ fontSize: wide?32:23, fontWeight:600, color:T.ink, whiteSpace:'nowrap' }}>{l.storyTitle}</h2>
              <div style={{ flex:1, height:1, background:T.line }} />
            </div>
            <p style={{ fontSize: wide?14:13, lineHeight:1.8, color:T.soft }}>{l.storyText}</p>
          </div>
          <div style={{ position:'relative', height: wide?280:170, margin: wide?'26px 40px 60px':'20px 16px 44px',
            borderRadius:18, overflow:'hidden' }}>
            <PhotoBg target="exp:story" fallback="linear-gradient(150deg,#3E5233 0%,#7A8B5C 100%)" />
            {canEditImages && <EditBtn onClick={()=>setPhotoTarget({ target:'exp:story', label:l.storyTitle })} />}
          </div>
        </>
      )}

      {edit ? (
        <button onClick={toggleEdit} style={{ position:'fixed', bottom:16, right:16, zIndex:20,
          background:'rgba(181,96,47,.85)', color:'#fff', borderRadius:20, padding:'8px 14px',
          fontSize:11.5, display:'flex', alignItems:'center', gap:5 }}>
          <i className="ti ti-check" style={{ fontSize:13 }} aria-hidden="true" />{l.edit}
        </button>
      ) : (
        <button onClick={()=>setPwOpen(true)} style={{ position:'fixed', bottom:16, right:16, zIndex:20,
          background:'rgba(43,38,32,.72)', color:'#EDE7D8', borderRadius:20, padding:'8px 14px',
          fontSize:11.5, display:'flex', alignItems:'center', gap:5 }}>
          <i className="ti ti-pencil" style={{ fontSize:13 }} aria-hidden="true" />{l.edit}
        </button>
      )}
      {pwOpen && <PwModal lang={lang} pw={pw} setPw={setPw} onSubmit={submitPw} onClose={()=>{ setPwOpen(false); setPw('') }} />}
      {photoTarget && <PhotoManager target={photoTarget.target} label={photoTarget.label} lang={lang==='en'?'fr':lang} onClose={()=>setPhotoTarget(null)} />}
    </div>
  )
}
