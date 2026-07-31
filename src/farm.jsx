// ══════ Pludini Farm — maquette de présentation des produits de la ferme ══════
// Sur le modèle de Pludini Host (page indépendante, même palette/typo), mais
// sans grille de vignettes : un bandeau d'images défilant par thème de
// produit. Les images sont soit les vraies photos importées via le système
// de photos existant (usePhotos/PhotoManager), soit — tant qu'aucune n'a été
// importée — des photos Unsplash libres de droit, en simple remplacement.
import { useState, useEffect, useRef } from 'react'
import { usePhotos, PhotoManager, LUT } from './photoui.jsx'
import { getMe } from './store.js'

const T = { bg:'#EDE7D8', card:'#E6DDC8', ink:'#2B2620', soft:'#6B6357', mute:'#9A9081', line:'#D3C7AE', clay:'#B5602F' }

const img = (id, w = 1000) => `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`
const HERO_PLACEHOLDER = img('1732123280078-27d7997ab0fb', 2000)

const THEMES = [
  {
    key:'cidre', icon:'🍎', target:'farm:cidre',
    placeholders:[img('1698842390212-7399050a3627'), img('1601952806112-cd12869e1d71'), img('1576179635662-9d1983e97e1e'), img('1633545382904-5e97dedc6e19')],
    fr:{ title:'Cidre & eau-de-vie', text:'Pressoir et alambic familial : nos pommes deviennent cidre brut et eau-de-vie limpide, distillés à l’ancienne, comme du temps du grand-père.' },
    ru:{ title:'Сидр и бренди', text:'Семейный пресс и самогонный аппарат: наши яблоки становятся терпким сидром и прозрачным бренди — по старинному рецепту деда.' },
    en:{ title:'Cider & apple brandy', text:'Family press and still: our apples become dry cider and clear brandy, distilled the old way, just like grandfather did.' },
  },
  {
    key:'argousier', icon:'🧡', target:'farm:argousier',
    placeholders:[img('1599580782029-3f71e2988c45'), img('1565852093870-66948332472a'), img('1664261523044-2fb14083eeba'), img('1605724841466-4b59296daf23')],
    fr:{ title:'Argousier', text:'Ces baies orange vif, gorgées de vitamine C, deviennent chez nous jus, sirop et confiture au goût acidulé bien reconnaissable.' },
    ru:{ title:'Облепиха', text:'Эти ярко-оранжевые ягоды, богатые витамином C, превращаются у нас в сок, сироп и варенье с узнаваемым кисловатым вкусом.' },
    en:{ title:'Sea buckthorn', text:'These bright orange berries, packed with vitamin C, become juice, syrup and jam with a distinctive tangy flavour.' },
  },
  {
    key:'miel', icon:'🍯', target:'farm:miel',
    placeholders:[img('1623018697148-8350cf18e64e'), img('1577095870693-360d002ad341'), img('1586106901017-b2d588f9c458'), img('1573500758697-c9cf976308d8')],
    fr:{ title:'Miel', text:'Récolté aux côtés de nos ruches, notre miel toutes fleurs garde toute la richesse aromatique des forêts et prairies du Vidzeme.' },
    ru:{ title:'Мёд', text:'Собранный рядом с нашими ульями, наш цветочный мёд сохраняет весь аромат лесов и лугов Видземе.' },
    en:{ title:'Honey', text:'Harvested right by our hives, our wildflower honey keeps all the aromatic richness of the forests and meadows of Vidzeme.' },
  },
  {
    key:'fromage', icon:'🐐', target:'farm:fromage',
    placeholders:[img('1641813362391-59eee2a8c2fd'), img('1624806972468-ea9c923a425e'), img('1719916690468-d21a4734c9c3'), img('1543176917-0f95487ea2dd')],
    fr:{ title:'Fromage de chèvre', text:'Nos chèvres pâturent librement ; leur lait devient fromage frais ou affiné, préparé en petites quantités directement à la ferme.' },
    ru:{ title:'Козий сыр', text:'Наши козы свободно пасутся; их молоко превращается в свежий или выдержанный сыр, приготовленный небольшими партиями прямо на ферме.' },
    en:{ title:'Goat cheese', text:'Our goats graze freely; their milk becomes fresh or aged cheese, made in small batches right here on the farm.' },
  },
  {
    key:'legumes', icon:'🥕', target:'farm:legumes',
    placeholders:[img('1624668430039-0175a0fbf006'), img('1631981798865-e0216d05b443'), img('1648090229186-6188eaefcc6a'), img('1629997390995-aeca5462dde7')],
    fr:{ title:'Légumes du potager', text:'Cultivés sans pesticides et récoltés à maturité, nos légumes de saison ont simplement le goût de la terre qui les a fait pousser.' },
    ru:{ title:'Овощи с огорода', text:'Выращенные без пестицидов и собранные вовремя, наши сезонные овощи просто имеют вкус земли, на которой они выросли.' },
    en:{ title:'Garden vegetables', text:'Grown without pesticides and harvested at peak ripeness, our seasonal vegetables simply taste of the soil that grew them.' },
  },
  {
    key:'restaurants', icon:'🍽️', target:'farm:restaurants',
    placeholders:[img('1663530761401-15eefb544889'), img('1514326640560-7d063ef2aed5'), img('1467003909585-2f8a72700288'), img('1593854989775-ae5e4d9e49e9')],
    fr:{ title:'Pour les restaurants', text:'Nous fournissons des cuisines locales en produits de la ferme — cidre, miel, fromage et légumes — pour des cartes ancrées dans le terroir du Vidzeme.' },
    ru:{ title:'Для ресторанов', text:'Мы поставляем местным ресторанам продукцию фермы — сидр, мёд, сыр и овощи — для меню, укоренённого в терруаре Видземе.' },
    en:{ title:'For restaurants', text:'We supply local kitchens with farm products — cider, honey, cheese and vegetables — for menus rooted in the Vidzeme terroir.' },
  },
]

const TXT = {
  fr:{ tag:'Ferme familiale', heroTitle:'Les produits de notre ferme',
    heroSub:'Cidre, argousier, miel, fromage de chèvre et légumes du potager — une petite production familiale, façonnée au rythme des saisons du Vidzeme.',
    storyTitle:'Notre histoire et nos valeurs',
    storyText:'Tout ici pousse, mûrit et se transforme au même endroit, sans hâte : le verger donne ses pommes, les chèvres leur lait, les ruches leur miel. Nous cultivons peu, mais bien, en petites quantités et sans intrants chimiques, avec le souci de préserver la terre qui nous les donne. Chaque produit porte l’empreinte d’une saison et d’un geste transmis dans la famille.',
    contactTitle:'Envie d’en savoir plus ?', contactSub:'Pour goûter nos produits ou vous fournir chez nous, écrivez-nous directement.',
    contactBtn:'Nous contacter', back:'Pludini Doc', photos:'Photos' },
  ru:{ tag:'Семейная ферма', heroTitle:'Продукция нашей фермы',
    heroSub:'Сидр, облепиха, мёд, козий сыр и овощи с огорода — небольшое семейное хозяйство, живущее в ритме сезонов Видземе.',
    storyTitle:'Наша история и наши ценности',
    storyText:'Здесь всё растёт, зреет и перерабатывается на одном месте, без спешки: сад даёт яблоки, козы — молоко, улья — мёд. Мы выращиваем немного, но качественно, небольшими партиями и без химических добавок, заботясь о земле, которая нам всё это даёт. Каждый продукт несёт отпечаток сезона и семейного мастерства.',
    contactTitle:'Хотите узнать больше?', contactSub:'Чтобы попробовать нашу продукцию или стать поставщиком, напишите нам напрямую.',
    contactBtn:'Связаться с нами', back:'Pludini Doc', photos:'Фото' },
  en:{ tag:'Family farm', heroTitle:'Products from our farm',
    heroSub:'Cider, sea buckthorn, honey, goat cheese and garden vegetables — a small family production, shaped by the seasons of Vidzeme.',
    storyTitle:'Our story and our values',
    storyText:'Everything here grows, ripens and is transformed in the same place, without haste: the orchard gives its apples, the goats their milk, the hives their honey. We grow little, but well, in small batches and without chemical inputs, mindful of preserving the land that gives us all this. Every product carries the mark of a season and a gesture passed down in the family.',
    contactTitle:'Want to know more?', contactSub:'To taste our products or become a supplier, write to us directly.',
    contactBtn:'Contact us', back:'Pludini Doc', photos:'Photos' },
}

// extraLinks : autres pages principales atteignables directement d'ici
// (ex. Pludini Host depuis Pludini Farm), affichées à côté du retour
function TopBar({ lang, setLang, onBack, backLabel, siteTitle, wide, extraLinks }) {
  return (
    <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:5, padding: wide?'20px 32px':'16px 18px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <img src="/icons/bobber-mark.png" width={22} height={22} alt="" aria-hidden="true" />
          <div className="serif" style={{ fontSize: wide?21.6:19.2, fontWeight:600, color:'#F2EEE2' }}>{siteTitle}</div>
        </div>
        <div style={{ display:'flex', gap:5 }}>
          {['fr','ru','en'].map(c => (
            <button key={c} onClick={()=>setLang(c)} style={{ fontSize:10.5, padding:'4px 9px', borderRadius:12,
              background: lang===c ? 'rgba(242,238,226,.9)' : 'rgba(242,238,226,.13)',
              color: lang===c ? '#2B2620' : 'rgba(242,238,226,.8)', fontWeight:600,
              border:'1px solid rgba(242,238,226,.28)' }}>{c.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginTop:6, flexWrap:'wrap' }}>
        <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, color:'#F2EEE2', fontSize: wide?14:13 }}>
          <i className="ti ti-arrow-left" aria-hidden="true" />{backLabel}
        </button>
        {extraLinks?.map(l => (
          <button key={l.label} onClick={l.onClick} style={{ color:'rgba(242,238,226,.75)', fontSize: wide?14:13,
            textDecoration:'underline', textUnderlineOffset:3 }}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function EditBtn({ onClick, style }) {
  return (
    <button onClick={(e)=>{ e.stopPropagation(); onClick() }} style={{ position:'absolute', zIndex:6,
      background:'rgba(0,0,0,.5)', color:'#fff', borderRadius:14, padding:'6px 10px', fontSize:11.5,
      fontWeight:600, display:'flex', alignItems:'center', gap:5, ...style }}>
      <i className="ti ti-camera-plus" style={{ fontSize:13 }} aria-hidden="true" />
    </button>
  )
}

// image unique (bannière) : la propre photo importée prime, sinon le placeholder Unsplash
function HeroImg({ target, placeholder }) {
  const { photos } = usePhotos(target)
  const cover = photos[0]
  return (
    <img src={cover ? cover.url : placeholder} alt="" loading="lazy" decoding="async" draggable={false}
      style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:cover?.pos||'50% 50%', filter:LUT, display:'block' }} />
  )
}

// ── Bandeau d'images d'un thème : dérive automatiquement vers la droite, en
// boucle infinie, et se laisse glisser au doigt/à la souris (met en pause la
// dérive pendant qu'on glisse, reprend juste après) — même mécanique que le
// bandeau "confort" de Pludini Host ──
function ThemeStrip({ target, placeholders, wide }) {
  const { photos } = usePhotos(target)
  const items = photos.length ? photos : placeholders.map((url, i) => ({ id:`ph-${i}`, url, pos:'50% 50%' }))
  const trackRef = useRef(null)
  const pausedRef = useRef(false)
  const loop = items.length > 1
  const display = loop ? [...items, ...items, ...items] : items

  useEffect(() => {
    const el = trackRef.current
    if (!el || !loop) return
    el.scrollLeft = el.scrollWidth / 3
  }, [loop, items.length])

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

  useEffect(() => {
    const el = trackRef.current
    if (!el || !loop) return
    let raf
    const tick = () => { if (!pausedRef.current) el.scrollLeft += 0.5; raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    const pause = () => { pausedRef.current = true }
    const resume = () => setTimeout(() => { pausedRef.current = false }, 2200)
    el.addEventListener('pointerdown', pause)
    el.addEventListener('pointerup', resume)
    el.addEventListener('pointercancel', resume)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointerdown', pause)
      el.removeEventListener('pointerup', resume)
      el.removeEventListener('pointercancel', resume)
    }
  }, [loop])

  const cardW = wide ? 300 : 216
  const cardH = wide ? 220 : 162

  return (
    <div ref={trackRef} className="no-scrollbar" style={{ display:'flex', gap:10, overflowX:'auto',
      WebkitOverflowScrolling:'touch', padding: wide?'0 32px':'0 16px' }}>
      {display.map((p, i) => (
        <div key={`${p.id}-${i}`} style={{ position:'relative', flex:'0 0 auto', width:cardW, height:cardH,
          borderRadius:16, overflow:'hidden', background:'#1E2418' }}>
          <img src={p.url} alt="" loading="lazy" decoding="async" draggable={false}
            style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:p.pos||'50% 50%', filter:LUT, display:'block' }} />
        </div>
      ))}
    </div>
  )
}

function ThemeSection({ t, lang, wide, canEditImages, onEditPhoto }) {
  const tx = t[lang]
  return (
    <div style={{ padding: wide?'30px 0':'22px 0' }}>
      <div style={{ padding: wide?'0 32px 14px':'0 16px 10px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
        <div style={{ maxWidth:560 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ fontSize:20 }}>{t.icon}</span>
            <h3 className="serif" style={{ fontSize: wide?23:19, fontWeight:800, color:T.ink }}>{tx.title}</h3>
          </div>
          <p style={{ fontSize: wide?13.5:12.5, color:T.soft, lineHeight:1.6 }}>{tx.text}</p>
        </div>
        {canEditImages && (
          <button onClick={onEditPhoto} style={{ flexShrink:0, display:'flex', alignItems:'center', gap:6,
            padding:'7px 12px', borderRadius:12, background:T.card, border:`1px solid ${T.line}`,
            color:T.clay, fontSize:11.5, fontWeight:600 }}>
            <i className="ti ti-camera-plus" style={{ fontSize:14 }} aria-hidden="true" />
            {TXT[lang].photos}
          </button>
        )}
      </div>
      <ThemeStrip target={t.target} placeholders={t.placeholders} wide={wide} />
    </div>
  )
}

export default function Farm({ wide, onBack, edit, onGoHost }) {
  const [lang, setLang] = useState('fr')
  const [photoTarget, setPhotoTarget] = useState(null)
  const l = TXT[lang]
  // comme pour Pludini Host, seul Ferdinand peut remplacer les photos —
  // le mode édition (mot de passe partagé) reste actif pour tous
  const canEditImages = edit && getMe() === 'Ferdinand'

  return (
    <div style={{ minHeight:'100vh', background:T.bg }}>
      <div style={{ position:'relative', height: wide?'72vh':'56vh', minHeight:420, overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0 }}>
          <HeroImg target="farm:hero" placeholder={HERO_PLACEHOLDER} />
        </div>
        <div style={{ position:'absolute', inset:0,
          background:'linear-gradient(180deg, rgba(16,14,10,.52) 0%, rgba(16,14,10,.15) 40%, rgba(16,14,10,.64) 100%)' }} />
        <TopBar lang={lang} setLang={setLang} onBack={onBack} backLabel={l.back} siteTitle="Pludini Farm" wide={wide}
          extraLinks={onGoHost ? [{ label:'Pludini Host', onClick:onGoHost }] : null} />
        {canEditImages && <EditBtn onClick={()=>setPhotoTarget({ target:'farm:hero', label:'Hero' })} style={{ top:64, right:20 }} />}
        <div style={{ position:'relative', height:'100%', display:'flex', flexDirection:'column', alignItems:'center',
          justifyContent:'center', textAlign:'center', padding: wide?'0 40px':'0 22px' }}>
          <span style={{ fontSize:11, letterSpacing:'2px', textTransform:'uppercase', color:'#C8DBA4', fontWeight:700, marginBottom:14 }}>{l.tag}</span>
          <h1 className="serif" style={{ fontSize: wide?58:33, fontWeight:600, color:'#F2EEE2', letterSpacing:'-1.2px', lineHeight:1.08, marginBottom:16 }}>
            {l.heroTitle}
          </h1>
          <p style={{ fontSize: wide?15:13, color:'rgba(237,231,216,.88)', maxWidth:520, lineHeight:1.65 }}>{l.heroSub}</p>
        </div>
      </div>

      <div style={{ position:'relative', marginTop: wide?-30:-18, borderRadius: wide?'32px 32px 0 0':'22px 22px 0 0',
        background:T.bg, paddingTop: wide?18:12 }}>
        {THEMES.map(t => (
          <ThemeSection key={t.key} t={t} lang={lang} wide={wide} canEditImages={canEditImages}
            onEditPhoto={()=>setPhotoTarget({ target:t.target, label:t[lang].title })} />
        ))}
      </div>

      <div style={{ padding: wide?'46px 40px 16px':'34px 20px 12px', textAlign:'center', maxWidth:680, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
          <div style={{ flex:1, height:1, background:T.line }} />
          <h2 className="serif" style={{ fontSize: wide?30:22, fontWeight:600, color:T.ink, whiteSpace:'nowrap' }}>{l.storyTitle}</h2>
          <div style={{ flex:1, height:1, background:T.line }} />
        </div>
        <p style={{ fontSize: wide?14:13, lineHeight:1.8, color:T.soft }}>{l.storyText}</p>
      </div>

      <div style={{ textAlign:'center', padding: wide?'20px 40px 70px':'14px 22px 54px' }}>
        <div className="serif" style={{ fontSize: wide?19:16, fontWeight:700, color:T.ink, marginBottom:6 }}>{l.contactTitle}</div>
        <p style={{ fontSize:12.5, color:T.soft, marginBottom:18, maxWidth:420, marginLeft:'auto', marginRight:'auto', lineHeight:1.6 }}>
          {l.contactSub}
        </p>
        <a href="mailto:contact@pludini.lv" className="serif" style={{ display:'inline-flex', alignItems:'center', gap:8,
          background:T.clay, color:'#fff', padding: wide?'14px 30px':'12px 24px', borderRadius:18,
          fontSize: wide?15:13.5, fontWeight:700, boxShadow:'0 10px 28px rgba(0,0,0,.18)' }}>
          <i className="ti ti-mail" style={{ fontSize:16 }} aria-hidden="true" />
          {l.contactBtn}
        </a>
      </div>

      {photoTarget && <PhotoManager target={photoTarget.target} label={photoTarget.label}
        lang={lang==='en'?'fr':lang} onClose={()=>setPhotoTarget(null)} />}
    </div>
  )
}
