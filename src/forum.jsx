import { useState } from 'react'
import { getMe, allSpecies, speciesType, CAT_PT_MULT, REPEAT_PASSAGE_MULT, allForumTopics, forumPostsFor, forumPostCount,
         addForumTopic, addForumPost, removeForumTopic, removeForumPost } from './store.js'
import { RARITY, SIZE_MULT, METHODS, FISH_SIZE_MULT } from './data'
import { UI, nameOf } from './i18n.js'
import { T, Modal, label, input, ValidateBar, ConfirmDialog, IdentityPicker } from './editui.jsx'

function timeAgo(ts, lang) {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000)
  if (min < 1) return lang === 'ru' ? 'только что' : 'à l’instant'
  if (min < 60) return lang === 'ru' ? `${min} мин назад` : `il y a ${min} min`
  if (h < 24) return lang === 'ru' ? `${h} ч назад` : `il y a ${h} h`
  if (d < 7) return lang === 'ru' ? `${d} дн назад` : `il y a ${d} j`
  return new Date(ts).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'fr-FR')
}

function Avatar({ name, size = 28 }) {
  return (
    <span style={{ width:size, height:size, borderRadius:'50%', background:T.sageDark, color:'#fff',
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.43, fontWeight:700, flexShrink:0 }}>
      {name?.[0]?.toUpperCase() || '?'}
    </span>
  )
}

function Back({ onBack, label: l }) {
  return (
    <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:T.soft, marginBottom:12 }}>
      <i className="ti ti-arrow-left" aria-hidden="true" /> {l}
    </button>
  )
}

// ══════ Page du forum (écran dédié) ══════
export function ForumPage({ wide, lang, edit, onBack }) {
  const t = UI[lang]
  const [openTopic, setOpenTopic] = useState(null)
  const [newTopic, setNewTopic] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const topics = allForumTopics()

  return (
    <div style={{ padding: wide?'16px 40px 60px':'14px 18px 40px', maxWidth:720, margin:'0 auto' }}>
      <Back onBack={onBack} label={t.home} />
      <h2 className="serif" style={{ fontSize: wide?30:23, fontWeight:900, color:T.ink, marginBottom:4 }}>
        {lang==='ru'?'Форум':'Le Forum'}
      </h2>
      <p style={{ fontSize:12.5, color:T.mute, marginBottom:18 }}>
        {lang==='ru'
          ? 'Обсуждения, вопросы, идеи для сайта — открыто для всех игроков.'
          : 'Discussions, questions, idées pour le site — ouvert à tous les joueurs.'}
      </p>

      <button onClick={()=>setNewTopic(true)} className="serif" style={{ width:'100%', padding:'12px', borderRadius:13,
        background:T.clay, color:'#fff', fontSize:14, fontWeight:700, display:'flex', alignItems:'center',
        justifyContent:'center', gap:7, marginBottom:16 }}>
        <i className="ti ti-plus" style={{ fontSize:16 }} aria-hidden="true" />
        {lang==='ru'?'Новая тема':'Nouveau sujet'}
      </button>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {topics.map(top => {
          const count = forumPostCount(top.id)
          return (
            <div key={top.id} style={{ position:'relative' }}>
              <button onClick={()=>setOpenTopic(top)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10,
                padding:'12px 14px', borderRadius:13, border:`1px solid ${T.line}`, background:T.card, textAlign:'left' }}>
                <Avatar name={top.author} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:T.ink, lineHeight:1.3 }}>{top.title}</div>
                  <div style={{ fontSize:11, color:T.mute, marginTop:2 }}>
                    {top.author} · {timeAgo(top.createdAt, lang)} · {count} {lang==='ru'?'сообщ.':(count>1?'réponses':'réponse')}
                  </div>
                </div>
                <i className="ti ti-chevron-right" style={{ fontSize:16, color:T.mute, flexShrink:0 }} aria-hidden="true" />
              </button>
              {edit && (
                <button onClick={()=>setConfirmDel(top)} title={lang==='ru'?'Удалить тему':'Supprimer le sujet'}
                  style={{ position:'absolute', top:8, right:34, width:22, height:22, borderRadius:'50%',
                    background:'rgba(43,38,32,.5)', color:'#fff', fontSize:11, display:'flex',
                    alignItems:'center', justifyContent:'center' }}>
                  <i className="ti ti-trash" style={{ fontSize:11 }} aria-hidden="true" />
                </button>
              )}
            </div>
          )
        })}
        {topics.length===0 && (
          <div style={{ fontSize:12.5, color:T.mute, textAlign:'center', padding:'18px 0', fontStyle:'italic' }}>
            {lang==='ru'?'Пока нет тем — начните первую !':'Aucun sujet pour l’instant — lance le premier !'}
          </div>
        )}
      </div>

      {newTopic && <NewTopicModal lang={lang} onClose={()=>setNewTopic(false)} />}
      {openTopic && <TopicThread lang={lang} topic={openTopic} edit={edit} onClose={()=>setOpenTopic(null)} />}
      {confirmDel && <ConfirmDialog lang={lang}
        title={lang==='ru'?'Удалить эту тему?':'Supprimer ce sujet ?'}
        message={lang==='ru'?'Все сообщения будут потеряны. Это действие необратимо.'
          :'Tous ses messages seront perdus. Cette action est irréversible.'}
        onCancel={()=>setConfirmDel(null)}
        onConfirm={async()=>{ await removeForumTopic(confirmDel.id); setConfirmDel(null) }} />}
    </div>
  )
}

// ══════ Créer un sujet — nécessite d'avoir choisi son identité ══════
function NewTopicModal({ lang, onClose }) {
  const author = getMe()
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  if (!author) return <IdentityPicker lang={lang} onClose={onClose} />

  const valid = title.trim() && text.trim()
  const save = async () => {
    if (!valid) return
    setBusy(true)
    await addForumTopic(title.trim(), author, text.trim())
    onClose()
  }

  return (
    <Modal onClose={onClose} max={480}>
      <div style={{ padding:'20px 22px 0' }}>
        <div className="serif" style={{ fontSize:19, fontWeight:900, color:T.ink }}>
          {lang==='ru'?'Новая тема':'Nouveau sujet'}
        </div>
      </div>
      <div style={{ padding:'0 22px 12px' }}>
        <label style={label}>{lang==='ru'?'Заголовок':'Titre'}</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} autoFocus style={input}
          placeholder={lang==='ru'?'Например: Расчёт очков':'Ex. Le calcul des points'} />
        <label style={label}>{lang==='ru'?'Сообщение':'Message'}</label>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={5}
          style={{ ...input, fontSize:13, resize:'vertical' }}
          placeholder={lang==='ru'?'Что вы хотите сказать…':'Explique ton sujet…'} />
      </div>
      <ValidateBar lang={lang} onCancel={onClose} onSave={save} busy={busy} disabled={!valid} />
    </Modal>
  )
}

// ══════ Fil d'un sujet — messages + réponse (+ tableau des points pour le sujet dédié) ══════
function TopicThread({ lang, topic, edit, onClose }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [idPicker, setIdPicker] = useState(false)
  const [confirmDelPost, setConfirmDelPost] = useState(null)
  const posts = forumPostsFor(topic.id)

  const reply = async () => {
    if (!text.trim()) return
    if (!getMe()) { setIdPicker(true); return }
    setBusy(true)
    await addForumPost(topic.id, getMe(), text.trim())
    setText(''); setBusy(false)
  }

  return (
    <Modal onClose={onClose} max={topic.special==='points-table' ? 820 : 560}>
      <div style={{ padding:'20px 22px 0' }}>
        <div className="serif" style={{ fontSize:18, fontWeight:900, color:T.ink, lineHeight:1.3 }}>{topic.title}</div>
      </div>
      <div style={{ padding:'14px 22px 12px', display:'flex', flexDirection:'column', gap:12 }}>
        {posts.map(p => (
          <div key={p.id} style={{ display:'flex', gap:10, position:'relative' }}>
            <Avatar name={p.author} />
            <div style={{ flex:1, background:T.card, border:`1px solid ${T.line}`, borderRadius:12, padding:'9px 12px' }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:7, marginBottom:4 }}>
                <span style={{ fontSize:12, fontWeight:700, color:T.ink }}>{p.author}</span>
                <span style={{ fontSize:10.5, color:T.mute }}>{timeAgo(p.createdAt, lang)}</span>
              </div>
              <div style={{ fontSize:12.5, color:T.ink, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{p.text}</div>
            </div>
            {edit && (
              <button onClick={()=>setConfirmDelPost(p)} title={lang==='ru'?'Удалить':'Supprimer'}
                style={{ position:'absolute', top:0, right:0, width:20, height:20, borderRadius:'50%',
                  background:'rgba(43,38,32,.5)', color:'#fff', fontSize:10, display:'flex',
                  alignItems:'center', justifyContent:'center' }}>✕</button>
            )}
          </div>
        ))}
        {topic.special==='points-table' && <PointsTable lang={lang} />}
      </div>
      <div style={{ padding:'0 22px 20px' }}>
        <label style={label}>{lang==='ru'?'Ваш ответ':'Ta réponse'}</label>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={3}
          style={{ ...input, fontSize:13, resize:'vertical' }}
          placeholder={lang==='ru'?'Написать сообщение…':'Écris une réponse…'} />
        <button onClick={reply} disabled={busy || !text.trim()} className="serif" style={{ width:'100%', marginTop:9,
          padding:'11px', borderRadius:12, background: (busy||!text.trim())?'#DDD3BE':T.clay,
          color: (busy||!text.trim())?T.mute:'#fff', fontSize:13.5, fontWeight:700, display:'flex',
          alignItems:'center', justifyContent:'center', gap:7 }}>
          <i className="ti ti-send" style={{ fontSize:15 }} aria-hidden="true" />
          {lang==='ru'?'Опубликовать':'Publier'}
        </button>
      </div>
      {idPicker && <IdentityPicker lang={lang} onClose={()=>setIdPicker(false)} />}
      {confirmDelPost && <ConfirmDialog lang={lang}
        title={lang==='ru'?'Удалить это сообщение?':'Supprimer ce message ?'}
        message={lang==='ru'?'Это действие необратимо.':'Cette action est irréversible.'}
        onCancel={()=>setConfirmDelPost(null)}
        onConfirm={async()=>{ await removeForumPost(confirmDelPost.id); setConfirmDelPost(null) }} />}
    </Modal>
  )
}

// ── Points maximum théoriques d'une espèce : 1 passage, vue directe, meilleure
// qualité de photo si applicable, bonus bébé+terrier — calculé exactement comme
// calcPtsLive (store.js) pour rester cohérent avec les scores réels affichés partout ──
function maxPointsFor(sp) {
  const r = RARITY[sp.r] || RARITY.commun
  const rarityPts = r.p * (SIZE_MULT[sp.sz] || 1)
  const catMult = CAT_PT_MULT[sp.cat] ?? 1
  const qualityMultMax = speciesType(sp) === 1 ? 2 : 1
  return Math.round((rarityPts * 3 + 50) * catMult * qualityMultMax)
}

// ── Petit bloc "Nom · valeur", réutilisé pour chaque grille de référence ──
function Chip({ l, v }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', gap:8, fontSize:11.5, padding:'4px 0' }}>
      <span style={{ color:T.soft }}>{l}</span>
      <span style={{ color:T.clay, fontWeight:700 }}>{v}</span>
    </div>
  )
}
function RefBox({ title, children }) {
  return (
    <div style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:10, padding:'9px 11px' }}>
      <div className="serif" style={{ fontSize:12, fontWeight:700, color:T.ink, marginBottom:2 }}>{title}</div>
      {children}
    </div>
  )
}

// ══════ Explication détaillée du calcul (barème complet, toujours à jour) ══════
function PointsExplainer({ lang }) {
  const repeatPct = Math.round(REPEAT_PASSAGE_MULT * 100)
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:12.5, color:T.soft, lineHeight:1.6, marginBottom:10 }}>
        {lang==='ru'
          ? 'Очки = (База + Бонусы) × множитель категории × множитель качества фото. База = редкость × размер. Первое замеченное животное данного вида приносит очки за лучший использованный метод наблюдения ; каждое следующее прохождение того же вида приносит лишь малую долю (см. ниже), чтобы нельзя было бесконечно раздувать счёт, фотографируя одно и то же узнанное животное.'
          : "Points = (Base + Bonus) × multiplicateur de catégorie × multiplicateur de qualité photo. La base = rareté × taille. Le premier passage enregistré pour une espèce rapporte les points de sa méthode d'observation ; chaque passage suivant du même animal n'en rapporte qu'une part infime (voir plus bas), pour empêcher de gonfler son score à l'infini en repassant la même caméra devant un animal déjà reconnu."}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:8, marginBottom:10 }}>
        <RefBox title={lang==='ru'?'Редкость':'Rareté'}>
          {Object.values(RARITY).map(r=><Chip key={r.l} l={r.l} v={`+${r.p}`} />)}
        </RefBox>
        <RefBox title={lang==='ru'?'Размер':'Taille'}>
          <Chip l={lang==='ru'?'Очень маленький':'Très petit'} v="×1" />
          <Chip l={lang==='ru'?'Маленький':'Petit'} v="×1.5" />
          <Chip l={lang==='ru'?'Средний':'Moyen'} v="×2" />
          <Chip l={lang==='ru'?'Большой':'Grand'} v="×2.5" />
          <Chip l={lang==='ru'?'Огромный':'Géant'} v="×3" />
        </RefBox>
        <RefBox title={lang==='ru'?'Способ наблюдения':'Méthode d’observation'}>
          {Object.values(METHODS).map(m=><Chip key={m.l} l={m.l} v={`×${m.mult}`} />)}
          <div style={{ fontSize:10, color:T.mute, marginTop:4, lineHeight:1.4, fontStyle:'italic' }}>
            {lang==='ru'?'Прямое наблюдение стоит больше, чем фотоловушка.':'Vu en direct rapporte plus que capté par une caméra piège.'}
          </div>
        </RefBox>
        <RefBox title={lang==='ru'?'Поймано (рыбы)':'Prise (poissons)'}>
          <Chip l={lang==='ru'?'Маленькая':'Petite'} v={`×${FISH_SIZE_MULT.petit}`} />
          <Chip l={lang==='ru'?'Средняя':'Moyenne'} v={`×${FISH_SIZE_MULT.moyen}`} />
          <Chip l={lang==='ru'?'Крупная':'Grande'} v={`×${FISH_SIZE_MULT.grand}`} />
          <div style={{ fontSize:10, color:T.mute, marginTop:4, lineHeight:1.4, fontStyle:'italic' }}>
            {lang==='ru'?'Заменяет способ наблюдения для рыб.':'Remplace la méthode d’observation pour les poissons.'}
          </div>
        </RefBox>
        <RefBox title={lang==='ru'?'Бонусы':'Bonus'}>
          <Chip l={lang==='ru'?'👶 Детёныши':'👶 Bébés'} v="+20" />
          <Chip l={lang==='ru'?'🏠 Нора':'🏠 Terrier'} v="+30" />
          <Chip l={lang==='ru'?'📸 Крупным планом':'📸 De près'} v="×2" />
          <Chip l={lang==='ru'?'📷 Издалека':'📷 De loin'} v="÷2" />
        </RefBox>
        <RefBox title={lang==='ru'?'Категория':'Catégorie'}>
          <Chip l={lang==='ru'?'Деревья, кустарники':'Arbres, arbustes'} v="×0.3" />
          <Chip l={lang==='ru'?'Люди, домашние животные':'Humains, domestiques'} v="×0" />
          <div style={{ fontSize:10, color:T.mute, marginTop:4, lineHeight:1.4, fontStyle:'italic' }}>
            {lang==='ru'?'Остальные категории — ×1.':'Toutes les autres catégories — ×1.'}
          </div>
        </RefBox>
      </div>
      <div style={{ background:'#F0E4CF', border:'1px solid #DCC79E', borderRadius:10, padding:'9px 11px' }}>
        <div className="serif" style={{ fontSize:12, fontWeight:700, color:'#8F6A2E', marginBottom:3 }}>
          {lang==='ru'?'Повторные прохождения':'Passages répétés'}
        </div>
        <div style={{ fontSize:11.5, color:'#6B5330', lineHeight:1.6 }}>
          {lang==='ru'
            ? `Первое прохождение = 100% очков. Каждое следующее прохождение того же уже узнанного животного = только ${repeatPct}%.`
            : `Le premier passage vaut 100% des points. Chaque passage suivant du même animal déjà reconnu ne vaut plus que ${repeatPct}%.`}
        </div>
      </div>
    </div>
  )
}

// ══════ Tableau live de tous les points max par espèce, triés du plus au moins ══════
function PointsTable({ lang }) {
  const rows = allSpecies()
    .map(sp => ({ sp, max: maxPointsFor(sp), base: Math.round((RARITY[sp.r]||RARITY.commun).p * (SIZE_MULT[sp.sz]||1)) }))
    .sort((a, b) => b.max - a.max)

  return (
    <>
    <PointsExplainer lang={lang} />
    <div style={{ border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden' }}>
      <div style={{ maxHeight:420, overflowY:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }}>
          <thead style={{ position:'sticky', top:0, background:T.card, zIndex:1 }}>
            <tr>
              <th style={{ textAlign:'left', padding:'7px 8px', color:T.mute, fontWeight:700, textTransform:'uppercase',
                fontSize:9.5, letterSpacing:'.4px', borderBottom:`1px solid ${T.line}` }}>
                {lang==='ru'?'Вид':'Espèce'}
              </th>
              <th style={{ textAlign:'left', padding:'7px 8px', color:T.mute, fontWeight:700, textTransform:'uppercase',
                fontSize:9.5, letterSpacing:'.4px', borderBottom:`1px solid ${T.line}` }}>
                {lang==='ru'?'Редкость':'Rareté'}
              </th>
              <th style={{ textAlign:'left', padding:'7px 8px', color:T.mute, fontWeight:700, textTransform:'uppercase',
                fontSize:9.5, letterSpacing:'.4px', borderBottom:`1px solid ${T.line}` }}>
                {lang==='ru'?'Размер':'Taille'}
              </th>
              <th style={{ textAlign:'right', padding:'7px 8px', color:T.mute, fontWeight:700, textTransform:'uppercase',
                fontSize:9.5, letterSpacing:'.4px', borderBottom:`1px solid ${T.line}` }}>
                {lang==='ru'?'База':'Base'}
              </th>
              <th style={{ textAlign:'right', padding:'7px 8px', color:T.mute, fontWeight:700, textTransform:'uppercase',
                fontSize:9.5, letterSpacing:'.4px', borderBottom:`1px solid ${T.line}` }}>
                {lang==='ru'?'Макс.':'Max'}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ sp, max, base }, i) => {
              const isPerson = speciesType(sp) === 3
              return (
                <tr key={sp.id} style={{ background: i%2 ? 'rgba(211,199,174,.25)' : 'transparent' }}>
                  <td style={{ padding:'6px 8px', color:T.ink, whiteSpace:'nowrap' }}>
                    {sp.e} {nameOf(sp, lang).main}
                  </td>
                  <td style={{ padding:'6px 8px', color:T.soft }}>
                    {isPerson ? '—' : (RARITY[sp.r]||RARITY.commun).l}
                  </td>
                  <td style={{ padding:'6px 8px', color:T.soft }}>
                    {isPerson ? '—' : `×${SIZE_MULT[sp.sz] ?? 1}`}
                  </td>
                  <td style={{ padding:'6px 8px', color:T.soft, textAlign:'right' }}>
                    {isPerson ? '—' : base}
                  </td>
                  <td style={{ padding:'6px 8px', color:T.clay, fontWeight:700, textAlign:'right' }}>
                    {isPerson ? '—' : max}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize:10.5, color:T.mute, padding:'8px 10px', borderTop:`1px solid ${T.line}`, lineHeight:1.5 }}>
        {lang==='ru'
          ? 'Таблица обновляется автоматически по текущим данным видов.'
          : 'Ce tableau se met à jour automatiquement selon les données actuelles des espèces.'}
      </div>
    </div>
    </>
  )
}
