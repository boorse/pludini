import { useState } from 'react'
import { allSpecies, allCats, speciesPhotos, photosFor, removePhoto,
         allQuizQuestions, addQuizQuestion, editQuizQuestion, removeQuizQuestion,
         allQuizScores, addQuizScore, getMe } from './store.js'
import { LUT, uploadPhotoFile, usePhotos } from './photoui.jsx'
import { gradientFor } from './gradients.js'
import { UI, nameOf } from './i18n.js'
import { T, Modal, label, input, ValidateBar, ConfirmDialog, visuallyHiddenFileInput, IdentityPicker } from './editui.jsx'

const QUESTIONS_PER_GAME = 10

function Back({ onBack, label: l }) {
  return (
    <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:T.soft, marginBottom:12 }}>
      <i className="ti ti-arrow-left" aria-hidden="true" /> {l}
    </button>
  )
}

// Fisher-Yates — jamais de biais de position comme avec un simple .sort(()=>Math.random()-.5)
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// une partie = un tirage de questions (ordre mélangé, sous-ensemble) + pour
// chacune, un ordre de réponses mélangé et son nouvel index correct associé —
// calculé une seule fois au démarrage, jamais recalculé au fil des rendus
function buildRounds() {
  const all = allQuizQuestions()
  const picked = shuffle(all).slice(0, Math.min(QUESTIONS_PER_GAME, all.length))
  return picked.map(q => {
    const order = shuffle([0, 1, 2, 3])
    return { ...q, answers: order.map(i => q.answers[i]), correctIndex: order.indexOf(q.correct) }
  })
}

// la photo dédiée à la question (uploadée depuis l'éditeur) passe en priorité,
// puis une photo de la galerie de l'espèce, sinon le dégradé de repli habituel
function photoFor(q, sp) {
  const own = photosFor(`quiz:${q.id}`)[0]
  if (own) return own
  return sp ? speciesPhotos(sp)[0]?.photo : null
}

// classement par joueur — total des bonnes réponses ("réussites") cumulées sur toutes ses parties
function leaderboard() {
  const byPlayer = {}
  allQuizScores().forEach(s => {
    const e = byPlayer[s.player] || (byPlayer[s.player] = { player: s.player, games: 0, correct: 0, total: 0 })
    e.games += 1; e.correct += s.score; e.total += s.total
  })
  return Object.values(byPlayer).sort((a, b) => b.correct - a.correct)
}

export default function Quiz({ wide, lang, onBack, edit }) {
  const t = UI[lang]
  const [phase, setPhase] = useState('intro') // 'intro' | 'playing' | 'end'
  const [rounds, setRounds] = useState(null)
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [managing, setManaging] = useState(false)
  const [editingQ, setEditingQ] = useState(null) // null | {} (nouvelle) | {...existante}
  const [idPicker, setIdPicker] = useState(false)

  const start = () => {
    if (!getMe()) { setIdPicker(true); return }
    setRounds(buildRounds()); setIdx(0); setSelected(null); setScore(0); setPhase('playing')
  }

  if (managing) {
    if (editingQ) return (
      <QuestionEditor lang={lang} initial={editingQ.id ? editingQ : null}
        onClose={()=>setEditingQ(null)}
        onSaved={()=>setEditingQ(null)} />
    )
    return <QuestionManager lang={lang} onClose={()=>setManaging(false)}
      onEdit={q=>setEditingQ(q)} onAdd={()=>setEditingQ({})} />
  }

  if (phase === 'intro') {
    const total = allQuizQuestions().length
    const board = leaderboard()
    return (
      <div style={{ padding: wide?'16px 40px 40px':'14px 18px 30px', maxWidth:560, margin:'0 auto' }}>
        <Back onBack={onBack} label={t.home} />
        <div style={{ textAlign:'center', padding: wide?'40px 20px':'24px 10px' }}>
          <div style={{ fontSize:44, marginBottom:10 }}>🧠</div>
          <h2 className="serif" style={{ fontSize: wide?30:23, fontWeight:900, color:T.ink, marginBottom:8 }}>
            {lang==='ru'?'Викторина':'Le Quiz'}
          </h2>
          <p style={{ fontSize:13, color:T.soft, lineHeight:1.65, marginBottom:24, maxWidth:420, marginLeft:'auto', marginRight:'auto' }}>
            {lang==='ru'
              ? `${Math.min(QUESTIONS_PER_GAME, total)} вопросов о животных Покедекса, иллюстрированных фотографиями из вашей галереи. Порядок вопросов и ответов каждый раз новый.`
              : `${Math.min(QUESTIONS_PER_GAME, total)} questions sur les animaux du Pokédex, illustrées par les photos de votre galerie. L'ordre change à chaque partie.`}
          </p>
          <button onClick={start} disabled={total===0} className="serif" style={{ padding:'14px 32px', borderRadius:14,
            background: total===0?'#DDD3BE':T.clay, color: total===0?T.mute:'#fff', fontSize:15.5, fontWeight:700,
            display:'inline-flex', alignItems:'center', gap:8 }}>
            <i className="ti ti-player-play" style={{ fontSize:18 }} aria-hidden="true" />
            {lang==='ru'?'Начать':'Commencer'}
          </button>
          {edit && (
            <button onClick={()=>setManaging(true)} style={{ display:'flex', alignItems:'center', gap:6,
              margin:'18px auto 0', color:T.soft, fontSize:12.5, fontWeight:600 }}>
              <i className="ti ti-settings" style={{ fontSize:15 }} aria-hidden="true" />
              {lang==='ru'?'Управление вопросами':'Gérer les questions'}
            </button>
          )}
          {board.length>0 && (
            <div style={{ marginTop:32, textAlign:'left' }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.mute, textTransform:'uppercase',
                letterSpacing:'.5px', marginBottom:10, textAlign:'center' }}>
                {lang==='ru'?'Рейтинг':'Classement'}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {board.map((e,i)=>{
                  const pct = e.total ? Math.round((e.correct/e.total)*100) : 0
                  return (
                    <div key={e.player} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 13px',
                      borderRadius:12, border:`1px solid ${T.line}`, background: i===0?'#F0DDD0':T.card }}>
                      <span className="serif" style={{ width:20, textAlign:'center', fontSize:13.5, fontWeight:900,
                        color: i===0?T.clay:T.mute, flexShrink:0 }}>{i+1}</span>
                      <span style={{ flex:1, fontSize:13, fontWeight:700, color:T.ink }}>{e.player}</span>
                      <span style={{ fontSize:11.5, color:T.soft, flexShrink:0 }}>
                        {e.games} {lang==='ru'?'игр':(e.games>1?'parties':'partie')}
                      </span>
                      <span className="serif" style={{ fontSize:14, fontWeight:800, color:T.clay, flexShrink:0 }}>
                        {e.correct} <span style={{ fontSize:10.5, color:T.mute, fontWeight:500 }}>({pct}%)</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        {idPicker && <IdentityPicker lang={lang} onClose={()=>setIdPicker(false)} />}
      </div>
    )
  }

  if (phase === 'end') {
    const total = rounds.length
    const pct = Math.round((score / total) * 100)
    const msg = pct===100 ? (lang==='ru'?'Идеально ! Вы настоящий эксперт.':'Parfait ! Un vrai expert.')
      : pct>=70 ? (lang==='ru'?'Отличный результат !':'Très beau score !')
      : pct>=40 ? (lang==='ru'?'Неплохо, продолжайте наблюдать.':'Pas mal, continue à observer.')
      : (lang==='ru'?'À revoir — retourne sur le terrain !':'À revoir — retourne sur le terrain !')
    return (
      <div style={{ padding: wide?'16px 40px 40px':'14px 18px 30px', maxWidth:560, margin:'0 auto' }}>
        <Back onBack={onBack} label={t.home} />
        <div style={{ textAlign:'center', padding: wide?'32px 20px':'20px 10px' }}>
          <div style={{ fontSize:40, marginBottom:6 }}>{pct===100?'🏆':pct>=70?'🎉':pct>=40?'👍':'🌱'}</div>
          <div className="serif" style={{ fontSize: wide?52:40, fontWeight:900, color:T.clay, lineHeight:1 }}>
            {score}<span style={{ fontSize: wide?26:20, color:T.mute }}>/{total}</span>
          </div>
          <p style={{ fontSize:14, color:T.ink, marginTop:10, marginBottom:26, fontWeight:600 }}>{msg}</p>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={start} className="serif" style={{ padding:'13px 26px', borderRadius:13,
              background:T.clay, color:'#fff', fontSize:14.5, fontWeight:700, display:'flex',
              alignItems:'center', gap:7 }}>
              <i className="ti ti-refresh" style={{ fontSize:16 }} aria-hidden="true" />
              {lang==='ru'?'Ещё раз':'Rejouer'}
            </button>
            <button onClick={onBack} style={{ padding:'13px 22px', borderRadius:13, border:`1px solid ${T.line}`,
              color:T.soft, fontSize:14, fontWeight:600 }}>
              {t.home}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // phase === 'playing'
  const round = rounds[idx]
  const sp = allSpecies().find(s => s.id === round.spId)
  const photo = photoFor(round, sp)
  const answered = selected !== null

  const pick = (i) => {
    if (answered) return
    setSelected(i)
    if (i === round.correctIndex) setScore(s => s + 1)
  }
  const next = () => {
    if (idx + 1 >= rounds.length) {
      if (getMe()) addQuizScore(getMe(), score, rounds.length)
      setPhase('end')
      return
    }
    setIdx(idx + 1); setSelected(null)
  }

  return (
    <div style={{ padding: wide?'16px 40px 40px':'14px 18px 30px', maxWidth:560, margin:'0 auto' }}>
      <Back onBack={onBack} label={t.home} />

      <div style={{ display:'flex', gap:4, marginBottom:16 }}>
        {rounds.map((_,i)=>(
          <div key={i} style={{ flex:1, height:4, borderRadius:2, background: i<idx?T.sageDark:i===idx?T.clay:T.line }} />
        ))}
      </div>
      <div style={{ fontSize:11, color:T.mute, marginBottom:14, fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>
        {lang==='ru'?`Вопрос ${idx+1} из ${rounds.length}`:`Question ${idx+1} sur ${rounds.length}`}
      </div>

      {sp && (
        <div style={{ position:'relative', height: wide?260:180, borderRadius:16, overflow:'hidden', marginBottom:16,
          background: photo ? '#1E2418' : gradientFor(sp.id) }}>
          {photo && (
            <img src={photo.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover',
              objectPosition:photo.pos||'50% 50%', filter:LUT, display:'block' }} />
          )}
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(16,18,12,.75), transparent 55%)' }} />
          <div style={{ position:'absolute', left:14, bottom:10, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:26 }}>{sp.e}</span>
            <span className="serif" style={{ fontSize:16, fontWeight:800, color:'#F2EEE2' }}>{nameOf(sp,lang).main}</span>
          </div>
        </div>
      )}

      <h3 className="serif" style={{ fontSize: wide?21:17, fontWeight:800, color:T.ink, marginBottom:16, lineHeight:1.35 }}>
        {round.q}
      </h3>

      <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:18 }}>
        {round.answers.map((a,i)=>{
          const isCorrect = i === round.correctIndex
          const isPicked = i === selected
          let bg = T.card, border = T.line, color = T.ink, icon = null
          if (answered && isPicked) {
            if (isCorrect) { bg = '#DDEBD0'; border = T.sageDark; color = '#2F4A22'; icon = 'ti-circle-check' }
            else { bg = '#F5DCD5'; border = '#B5602F'; color = '#7A2E1C'; icon = 'ti-circle-x' }
          }
          return (
            <button key={i} onClick={()=>pick(i)} disabled={answered} style={{ display:'flex', alignItems:'center',
              gap:10, width:'100%', padding: wide?'16px 18px':'15px 16px', borderRadius:14,
              border:`2px solid ${border}`, background:bg, textAlign:'left', color, fontSize: wide?14.5:13.5,
              fontWeight: (answered && isPicked) ? 700 : 500, lineHeight:1.4 }}>
              {icon && <i className={`ti ${icon}`} style={{ fontSize:19, flexShrink:0 }} aria-hidden="true" />}
              <span>{a}</span>
            </button>
          )
        })}
      </div>

      {answered && round.explain && (
        <div style={{ background:'#F0E4CF', border:'1px solid #DCC79E', borderRadius:12, padding:13, marginBottom:16 }}>
          <div style={{ fontSize:10.5, fontWeight:700, color:'#8F6A2E', textTransform:'uppercase', letterSpacing:'.5px',
            marginBottom:5, display:'flex', alignItems:'center', gap:5 }}>
            <i className="ti ti-sparkles" style={{ fontSize:13 }} aria-hidden="true" />
            {lang==='ru'?'Знаете ли вы':'Le saviez-vous'}
          </div>
          <div style={{ fontSize:12.5, color:'#6B5330', lineHeight:1.6 }}>{round.explain}</div>
        </div>
      )}

      {answered && (
        <button onClick={next} className="serif" style={{ width:'100%', padding:'14px', borderRadius:14,
          background:T.clay, color:'#fff', fontSize:14.5, fontWeight:700, display:'flex',
          alignItems:'center', justifyContent:'center', gap:8 }}>
          {idx+1 >= rounds.length ? (lang==='ru'?'Посмотреть результат':'Voir le score') : (lang==='ru'?'Вопрос дальше':'Question suivante')}
          <i className="ti ti-arrow-right" style={{ fontSize:17 }} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

// ══════ Gestion des questions (mode édition) ══════
function QuestionManager({ lang, onClose, onEdit, onAdd }) {
  const [confirmDel, setConfirmDel] = useState(null)
  const questions = allQuizQuestions()
  const SPECIES = allSpecies()

  return (
    <Modal onClose={onClose} max={640}>
      <div style={{ padding:'20px 22px 0', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
        <div>
          <div className="serif" style={{ fontSize:19, fontWeight:900, color:T.ink }}>
            {lang==='ru'?'Вопросы викторины':'Questions du quiz'}
          </div>
          <div style={{ fontSize:12, color:T.soft, marginTop:3 }}>
            {questions.length} {lang==='ru'?'вопрос(ов)':'question'}{questions.length>1?'s':''}
          </div>
        </div>
        <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
          background:T.card, color:T.soft, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <i className="ti ti-x" style={{ fontSize:14 }} aria-hidden="true" />
        </button>
      </div>
      <div style={{ padding:'14px 22px 20px' }}>
        <button onClick={onAdd} className="serif" style={{ width:'100%', padding:'11px', borderRadius:12,
          background:T.sageDark, color:'#fff', fontSize:13.5, fontWeight:700, display:'flex',
          alignItems:'center', justifyContent:'center', gap:7, marginBottom:14 }}>
          <i className="ti ti-plus" style={{ fontSize:16 }} aria-hidden="true" />
          {lang==='ru'?'Добавить вопрос':'Ajouter une question'}
        </button>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {questions.map(q => {
            const sp = SPECIES.find(s=>s.id===q.spId)
            const photo = photoFor(q, sp)
            return (
              <div key={q.id} style={{ display:'flex', alignItems:'center', gap:10, padding:9,
                borderRadius:12, border:`1px solid ${T.line}`, background:T.card }}>
                <div style={{ width:52, height:52, borderRadius:9, overflow:'hidden', flexShrink:0,
                  background: photo ? '#1E2418' : (sp ? gradientFor(sp.id) : T.line) }}>
                  {photo && <img src={photo.thumbUrl||photo.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', filter:LUT, display:'block' }} />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10.5, color:T.mute, fontWeight:600 }}>{sp ? nameOf(sp,lang).main : q.spId}</div>
                  <div style={{ fontSize:12.5, color:T.ink, lineHeight:1.35, overflow:'hidden', textOverflow:'ellipsis',
                    display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{q.q}</div>
                </div>
                <button onClick={()=>onEdit(q)} style={{ width:30, height:30, borderRadius:'50%', flexShrink:0,
                  border:`1px solid ${T.line}`, color:T.clay, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="ti ti-pencil" style={{ fontSize:14 }} aria-hidden="true" />
                </button>
                <button onClick={()=>setConfirmDel(q)} style={{ width:30, height:30, borderRadius:'50%', flexShrink:0,
                  border:'1px solid #C9877C', color:'#8F4A22', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="ti ti-trash" style={{ fontSize:14 }} aria-hidden="true" />
                </button>
              </div>
            )
          })}
          {questions.length===0 && (
            <div style={{ fontSize:12.5, color:T.mute, textAlign:'center', padding:'16px 0', fontStyle:'italic' }}>
              {lang==='ru'?'Пока нет вопросов.':'Aucune question pour l’instant.'}
            </div>
          )}
        </div>
      </div>
      {confirmDel && <ConfirmDialog lang={lang}
        title={lang==='ru'?'Удалить этот вопрос?':'Supprimer cette question ?'}
        message={lang==='ru'?'Это действие необратимо.':'Cette action est irréversible.'}
        onCancel={()=>setConfirmDel(null)}
        onConfirm={async()=>{ await removeQuizQuestion(confirmDel.id); setConfirmDel(null) }} />}
    </Modal>
  )
}

// ══════ Formulaire d'une question — espèce, photo, texte, réponses, bonne réponse, explication ══════
function QuestionEditor({ lang, initial, onClose, onSaved }) {
  const isEdit = !!initial
  const [id] = useState(() => initial?.id || ('quizq_' + Date.now().toString(36) + Math.random().toString(36).slice(2,5)))
  const [spId, setSpId] = useState(initial?.spId || '')
  const [pickCat, setPickCat] = useState(null)
  const [q, setQ] = useState(initial?.q || '')
  const [answers, setAnswers] = useState(initial?.answers || ['', '', '', ''])
  const [correct, setCorrect] = useState(initial?.correct ?? 0)
  const [explain, setExplain] = useState(initial?.explain || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [stagedFile, setStagedFile] = useState(null)

  const target = `quiz:${id}`
  const { photos } = usePhotos(target)
  const cats = allCats()
  const SPECIES = allSpecies()
  const sp = SPECIES.find(s => s.id === spId)
  const catResults = pickCat ? SPECIES.filter(s => s.cat === pickCat) : []

  const setAnswer = (i, v) => setAnswers(a => a.map((x, idx) => idx === i ? v : x))
  const valid = spId && q.trim() && answers.every(a => a.trim())

  const save = async () => {
    if (!valid) return
    setBusy(true); setErr(null)
    try {
      const fields = { spId, q: q.trim(), answers: answers.map(a => a.trim()), correct, explain: explain.trim() }
      if (isEdit) await editQuizQuestion(id, fields)
      else await addQuizQuestion({ id, ...fields })
      if (stagedFile) await uploadPhotoFile(target, stagedFile, '', '')
      onSaved()
    } catch (e) {
      setErr(e?.message || (lang==='ru'?'Не удалось сохранить. Проверьте соединение и попробуйте снова.'
        :'Échec de l’enregistrement. Vérifie ta connexion et réessaie.'))
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} max={560}>
      <div style={{ padding:'20px 22px 0' }}>
        <div className="serif" style={{ fontSize:19, fontWeight:900, color:T.ink }}>
          {isEdit ? (lang==='ru'?'Изменить вопрос':'Modifier la question') : (lang==='ru'?'Nouvelle question':'Nouvelle question')}
        </div>
      </div>
      <div style={{ padding:'0 22px 12px' }}>
        <label style={label}>{lang==='ru'?'Вид':'Espèce concernée'}</label>
        {sp ? (
          <div style={{ display:'flex', alignItems:'center', gap:9, background:T.card,
            border:`1px solid ${T.line}`, borderRadius:10, padding:'9px 11px' }}>
            <span style={{ fontSize:20 }}>{sp.e}</span>
            <span style={{ flex:1, fontSize:13.5, fontWeight:600, color:T.ink }}>{sp.n}</span>
            <button onClick={()=>{ setSpId(''); setPickCat(null) }} style={{ color:T.mute, fontSize:12 }}>
              {lang==='ru'?'изменить':'changer'}
            </button>
          </div>
        ) : pickCat ? (
          <>
            <button onClick={()=>setPickCat(null)}
              style={{ display:'flex', alignItems:'center', gap:5, color:T.clay, fontSize:12, fontWeight:600, marginBottom:8 }}>
              <i className="ti ti-arrow-left" style={{ fontSize:13 }} aria-hidden="true" />
              {lang==='ru'?'Все царства':'Tous les règnes'}
            </button>
            <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:200, overflowY:'auto' }}>
              {catResults.map(s2=>(
                <button key={s2.id} onClick={()=>setSpId(s2.id)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:9,
                    border:`1px solid ${T.line}`, background:T.card, textAlign:'left' }}>
                  <span style={{ fontSize:17 }}>{s2.e}</span>
                  <span style={{ fontSize:12.5, color:T.ink, flex:1 }}>{s2.n}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))', gap:6 }}>
            {cats.map(c=>(
              <button key={c.id} onClick={()=>setPickCat(c.id)}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'9px 6px',
                  borderRadius:11, border:`1px solid ${T.line}`, background:T.card, textAlign:'center' }}>
                <span style={{ fontSize:20 }}>{c.e}</span>
                <span style={{ fontSize:10.5, color:T.ink, fontWeight:600, lineHeight:1.2 }}>{c.n}</span>
              </button>
            ))}
          </div>
        )}

        <label style={label}>{lang==='ru'?'Фото':'Photo'}</label>
        {photos.length>0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
            {photos.map(p=>(
              <div key={p.id} style={{ position:'relative', width:64, height:64, borderRadius:9, overflow:'hidden', border:`1px solid ${T.line}` }}>
                <img src={p.thumbUrl||p.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', filter:LUT, display:'block' }} />
                <button onClick={()=>removePhoto(target, p.id, p.path)} style={{ position:'absolute', top:2, right:2,
                  width:18, height:18, borderRadius:'50%', background:'rgba(0,0,0,.6)', color:'#fff', fontSize:11 }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <label onDrop={e=>{ e.preventDefault(); const f=e.dataTransfer.files[0]; if(f?.type.startsWith('image/')) setStagedFile(f) }}
          onDragOver={e=>e.preventDefault()}
          style={{ display:'block', border:`2px dashed ${T.line}`, borderRadius:12, padding:'14px', textAlign:'center',
            cursor:'pointer', background:T.card }}>
          <i className="ti ti-camera-plus" style={{ fontSize:20, color:T.clay }} aria-hidden="true" />
          <div style={{ fontSize:11.5, color:T.soft, marginTop:4 }}>
            {stagedFile ? stagedFile.name : (lang==='ru'?'Добавить фото (необязательно, иначе фото вида)':'Ajoute une photo (facultatif — sinon celle de l’espèce)')}
          </div>
          <input type="file" accept="image/*" style={visuallyHiddenFileInput}
            onChange={e=>{ const f=e.target.files[0]; if(f) setStagedFile(f); e.target.value='' }} />
        </label>

        <label style={label}>{lang==='ru'?'Вопрос':'La question'}</label>
        <textarea value={q} onChange={e=>setQ(e.target.value)} rows={2} style={{ ...input, fontSize:13, resize:'vertical' }}
          placeholder={lang==='ru'?'Например: Как охотится рысь?':'Ex. Comment le lynx capture-t-il ses proies ?'} />

        <label style={label}>{lang==='ru'?'Ответы (отметьте правильный)':'Réponses (coche la bonne)'}</label>
        {answers.map((a,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <button onClick={()=>setCorrect(i)} title={lang==='ru'?'Правильный ответ':'Bonne réponse'}
              style={{ width:24, height:24, borderRadius:'50%', flexShrink:0,
                border:`2px solid ${correct===i?T.sageDark:T.line}`, background:correct===i?T.sageDark:'transparent',
                color:'#fff', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {correct===i ? <i className="ti ti-check" aria-hidden="true" /> : null}
            </button>
            <input value={a} onChange={e=>setAnswer(i,e.target.value)} style={{ ...input, flex:1, fontSize:13 }}
              placeholder={lang==='ru'?`Ответ ${i+1}`:`Réponse ${i+1}`} />
          </div>
        ))}

        <label style={label}>{lang==='ru'?'Объяснение (необязательно)':'Explication (facultatif)'}</label>
        <textarea value={explain} onChange={e=>setExplain(e.target.value)} rows={3}
          style={{ ...input, fontSize:12.5, resize:'vertical' }}
          placeholder={lang==='ru'?'Показано после ответа…':'Affichée après la réponse…'} />

        {err && <div style={{ fontSize:12, color:'#B91C1C', background:'#FEF2F2', border:'1px solid #FCA5A5',
          borderRadius:9, padding:'8px 11px', marginTop:11 }}>{err}</div>}
      </div>
      <ValidateBar lang={lang} onCancel={onClose} onSave={save} busy={busy} disabled={!valid} />
    </Modal>
  )
}
