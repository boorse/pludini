// ══════════════════════════════════════════════════════════════
//  Magasin central — cache partagé, une seule source de vérité
// ══════════════════════════════════════════════════════════════
import { sb, publicUrl } from './supabase.js'
import { SPECIES as BASE_SPECIES, CATS as BASE_CATS, PLAYERS as BASE_PLAYERS,
         RARITY, METHODS, SIZE_MULT, FISH_SIZE_MULT, ACHIEVEMENTS } from './data'
import { QUIZ_QUESTIONS as BASE_QUIZ, QUIZ_THEMES, QUIZ_THEME_MIN_QUESTIONS } from './quizdata.js'

const S = {
  photos: {},        // target -> [{id,url,caption,by,path}]
  named: {},         // "spId::obsName" -> {name, traits}
  species: [],       // espèces ajoutées
  players: [],       // joueurs ajoutés
  edits: {},         // spId -> champs modifiés
  sightings: {},     // spId -> [{ind, ...}]
  sightEdits: {},    // "sedit_spId::indName" -> {fields}
  covers: {},        // target -> id de la photo choisie comme vignette
  activityEdits: {}, // activityId -> { fr:{title,text}, ru:{...}, en:{...} } (Pludini Host)
  farmTextEdits: {}, // id -> { fr:{...}, ru:{...}, en:{...} } (Pludini Farm)
  quizQuestions: [],  // questions du quiz ajoutées depuis l'éditeur
  quizEdits: {},      // questionId -> champs modifiés (y compris celles de quizdata.js)
  quizThemes: [],     // thèmes de quiz créés depuis l'éditeur (en plus des 5 prévus)
  forumTopics: [],    // sujets du forum
  forumPosts: [],      // messages du forum (topicId, author, text, createdAt)
  quizScores: [],     // parties de quiz jouées (player, score, total, createdAt)
  ready: false,
}
const subs = new Set()
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn) }
function notify() { subs.forEach(f => f()) }

export function isReady() { return S.ready }

// ── Chargement initial : tout en 2 requêtes ──
export async function loadAll() {
  const [ph, ov] = await Promise.all([
    sb.from('photos').select('*').order('created_at'),
    sb.from('overrides').select('*'),
  ])
  S.photos = {}
  ;(ph.data || []).forEach(p => {
    const rec = { id: p.id, path: p.path, url: publicUrl(p.path),
      thumbUrl: publicUrl(p.path.replace(/\.jpg$/, '_t.jpg')),
      caption: p.caption, by: p.author, pos: p.pos || '50% 50%' }
    ;(S.photos[p.target] ||= []).push(rec)
  })
  S.named = {}; S.species = []; S.players = []; S.edits = {}; S.sightings = {}; S.sightEdits = {}; S.covers = {}
  S.activityEdits = {}
  S.farmTextEdits = {}
  S.quizQuestions = []; S.quizEdits = {}; S.quizThemes = []
  S.forumTopics = []; S.forumPosts = []
  S.quizScores = []
  ;(ov.data || []).forEach(r => {
    if (r.kind === 'named')   S.named[r.key] = r.value
    if (r.kind === 'species') S.species.push({ ...r.value, key: r.key })
    if (r.kind === 'player')  S.players.push({ ...r.value, key: r.key })
    if (r.kind === 'spedit')  S.edits[r.value.id] = r.value
    if (r.kind === 'sighting') (S.sightings[r.value.spId] ||= []).push({ ...r.value, key: r.key })
    if (r.kind === 'sightedit') S.sightEdits[r.key] = r.value
    if (r.kind === 'cover')  S.covers[r.value.target] = r.value.photoId
    if (r.kind === 'activityedit') S.activityEdits[r.value.id] = r.value
    if (r.kind === 'farmtextedit') S.farmTextEdits[r.value.id] = r.value
    if (r.kind === 'quizq')     S.quizQuestions.push({ ...r.value, key: r.key })
    if (r.kind === 'quizqedit') S.quizEdits[r.value.id] = r.value
    if (r.kind === 'quiztheme') S.quizThemes.push({ ...r.value, key: r.key })
    if (r.kind === 'forumtopic') S.forumTopics.push({ ...r.value, key: r.key })
    if (r.kind === 'forumpost')  S.forumPosts.push({ ...r.value, key: r.key })
    if (r.kind === 'quizscore') S.quizScores.push({ ...r.value, key: r.key })
  })
  S.ready = true
  notify()
}

// ══════ PHOTOS ══════
const EMPTY = Object.freeze([])
// la vignette choisie (réglages) passe en tête de liste — c'est elle que
// PhotoBg/PhotoHero/etc. affichent par défaut (photos[0]), sans rien changer
// ailleurs dans l'appli
// Résultat mis en cache par target : useSyncExternalStore exige un snapshot
// stable (même référence tant que rien n'a changé), sinon boucle infinie.
const photosForCache = {}
export function photosFor(target) {
  const list = S.photos[target] || EMPTY
  const coverId = S.covers[target] || null
  const cached = photosForCache[target]
  if (cached && cached.list === list && cached.coverId === coverId) return cached.result
  let result = list
  if (coverId) {
    const idx = list.findIndex(p => p.id === coverId)
    if (idx > 0) {
      const copy = list.slice()
      const [chosen] = copy.splice(idx, 1)
      copy.unshift(chosen)
      result = copy
    }
  }
  photosForCache[target] = { list, coverId, result }
  return result
}
export function allPhotos() {
  return Object.entries(S.photos).flatMap(([target, list]) => list.map(p => ({ ...p, target })))
}
export async function addPhotoRec({ target, path, caption, by }) {
  const ins = await sb.from('photos').insert({ target, path, caption, author: by }).select().single()
  if (ins.error) throw new Error(ins.error.message)
  const rec = { id: ins.data.id, path, url: publicUrl(path),
    thumbUrl: publicUrl(path.replace(/\.jpg$/, '_t.jpg')), caption, by, pos: '50% 50%' }
  S.photos[target] = [...(S.photos[target] || []), rec]
  notify(); return rec
}
export async function removePhoto(target, id, path) {
  if (path) await sb.storage.from('photos').remove([path, path.replace(/\.jpg$/, '_t.jpg')])
  await sb.from('photos').delete().eq('id', id)
  S.photos[target] = (S.photos[target] || []).filter(p => p.id !== id)
  if (S.covers[target] === id) delete S.covers[target]
  notify()
}
// écrit l'aperçu tout de suite (réactif), mais différe l'envoi réseau : sans
// ça, cliquer plusieurs fois de suite pour affiner le point envoie une
// requête par clic, et rien ne garantit que la dernière arrivée au serveur
// soit la dernière envoyée — le point choisi ne "tenait" pas au rechargement
const posTimers = {}
const posPending = {}
export async function setPhotoPos(target, id, pos) {
  S.photos[target] = (S.photos[target] || []).map(p => p.id === id ? { ...p, pos } : p)
  notify()
  posPending[id] = pos
  clearTimeout(posTimers[id])
  posTimers[id] = setTimeout(() => flushPhotoPos(id), 500)
}
// à appeler à la fermeture du sélecteur de point focal : sans ça, un envoi
// encore en attente (moins de 500ms) est perdu si l'utilisateur ferme tout
// de suite après avoir choisi son point
export async function flushPhotoPos(id) {
  if (!(id in posPending)) return
  clearTimeout(posTimers[id])
  delete posTimers[id]
  const pos = posPending[id]
  delete posPending[id]
  await sb.from('photos').update({ pos }).eq('id', id)
}

// ══════ VIGNETTE CHOISIE (par cible, pour tout type de photo) ══════
export function coverIdFor(target) { return S.covers[target] || null }
export async function setPhotoCover(target, photoId) {
  S.covers[target] = photoId; notify()
  const key = 'cover_' + String(target).replace(/[^a-zA-Z0-9_:.-]/g, '_')
  await sb.from('overrides').upsert({ kind:'cover', key, value:{ target, photoId }, updated_at:new Date().toISOString() }, { onConflict:'key' })
}
export async function clearPhotoCover(target) {
  delete S.covers[target]; notify()
  const key = 'cover_' + String(target).replace(/[^a-zA-Z0-9_:.-]/g, '_')
  await sb.from('overrides').delete().eq('key', key)
}

// ══════ FAMILIERS ══════
export function namedOf(spId, obsName) { return S.named[`${spId}::${obsName}`] || null }
export async function promote(spId, obsName, name, traits = '') {
  const key = `${spId}::${obsName}`, value = { named: true, name, traits, at: Date.now() }
  S.named[key] = value; notify()
  await sb.from('overrides').upsert({ kind: 'named', key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}
export async function demote(spId, obsName) {
  const key = `${spId}::${obsName}`
  delete S.named[key]; notify()
  await sb.from('overrides').delete().eq('key', key)
}
export function splitInds(sp) {
  const all = (sp.inds || []).map(ind => {
    const ov = S.named[`${sp.id}::${ind.n}`]
    return ov ? { ...ind, named: true, displayName: ov.name, traits: ov.traits }
              : { ...ind, displayName: ind.n, named: !!ind.named }
  })
  return { named: all.filter(i => i.named), sightings: all.filter(i => !i.named) }
}

// ══════ COUVERTURE D'ESPÈCE (issue des photos de ses individus) ══════
// une entrée par individu qui a au moins une photo — sert au carrousel de la fiche et au sélecteur de vignette
export function individualCovers(sp) {
  return (sp.inds || []).map(ind => {
    const ov = S.named[`${sp.id}::${ind.n}`]
    const photos = photosFor(`ind:${sp.id}:${ind.n}`)
    return photos.length ? { ind: ind.n, displayName: ov ? ov.name : ind.n, photo: photos[0] } : null
  }).filter(Boolean)
}
// toutes les photos de l'espèce (tous individus confondus) — sert au carrousel de la fiche espèce
export function speciesPhotos(sp) {
  return (sp.inds || []).flatMap(ind => {
    const ov = S.named[`${sp.id}::${ind.n}`]
    return photosFor(`ind:${sp.id}:${ind.n}`).map(photo => ({ ind: ind.n, displayName: ov ? ov.name : ind.n, photo }))
  })
}
// la vignette choisie manuellement (réglages), sinon la première photo d'individu disponible
export function coverPhoto(sp) {
  const covers = individualCovers(sp)
  if (!covers.length) return null
  const chosen = sp.cover
  if (chosen) {
    const found = covers.find(c => c.ind === chosen.ind && c.photo.id === chosen.photoId)
    if (found) return found.photo
  }
  return covers[0].photo
}
export async function setCover(spId, ind, photoId) { await editSpecies(spId, { cover: { ind, photoId } }) }
export async function clearCover(spId) { await editSpecies(spId, { cover: null }) }

// ══════ ESPÈCES ══════
export function allSpecies() {
  const custom = S.species.map(c => ({
    inds: [], obs: {}, bonus: {}, alim: '', hab: '', dng: '',
    r: 'commun', sz: 'm', e: '❓', n: '?', lat: '',
    ...c, custom: true,
  }))
  const merged = [...BASE_SPECIES, ...custom]
  return merged.map(sp => {
    const base = S.edits[sp.id] ? { ...sp, ...S.edits[sp.id].fields } : sp
    const extra = S.sightings[sp.id]
    const rawInds = extra && extra.length ? [...(base.inds || []), ...extra.map(x => x.ind)] : (base.inds || [])
    if (!rawInds.length) return { ...base, inds: rawInds }
    const inds = rawInds
      .map(ind => {
        const se = S.sightEdits[`sedit_${sp.id}::${ind.n}`]
        return se ? { ...ind, ...se.fields } : ind
      })
      .filter(ind => !ind.removed)
    return { ...base, inds }
  }).filter(sp => !sp.removed)
}
export async function addSpecies(sp) {
  const id = sp.id || ('c_' + Date.now().toString(36))
  const value = { ...sp, id }
  S.species.push({ ...value, key: 'sp_' + id }); notify()
  await sb.from('overrides').upsert({ kind: 'species', key: 'sp_' + id, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  return id
}
export async function editSpecies(id, fields) {
  const value = { id, fields: { ...(S.edits[id]?.fields || {}), ...fields } }
  S.edits[id] = value; notify()
  await sb.from('overrides').upsert({ kind: 'spedit', key: 'edit_' + id, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}
export async function removeSpecies(id) {
  const isCustom = S.species.some(s => s.id === id)
  if (isCustom) {
    S.species = S.species.filter(s => s.id !== id); notify()
    await sb.from('overrides').delete().eq('key', 'sp_' + id)
  } else {
    // espèce de base (ex. un individu de la catégorie Humains) : masquée via une surcharge, jamais retirée de data.js
    const prev = S.edits[id]?.fields || {}
    await editSpecies(id, { ...prev, removed: true })
  }
}

// ── Observations : marquer qu'un joueur a vu une espèce ──
export async function setObservation(spId, player, methods) {
  const sp = allSpecies().find(s => s.id === spId); if (!sp) return
  const obs = { ...(sp.obs || {}) }
  if (methods && methods.length) obs[player] = methods; else delete obs[player]
  const prev = S.edits[spId]?.fields || {}
  await editSpecies(spId, { ...prev, obs })
}
// ── Marque les observations d'un joueur pour une espèce comme provenant d'une photo floue (÷2 points) ──
export async function setBlurry(spId, player, isBlurry) {
  const sp = allSpecies().find(s => s.id === spId); if (!sp) return
  const blurry = { ...(sp.blurry || {}) }
  if (isBlurry) blurry[player] = true; else delete blurry[player]
  const prev = S.edits[spId]?.fields || {}
  await editSpecies(spId, { ...prev, blurry })
}
// ── Même principe, pour une photo pixelisée / basse résolution (÷2 points, cumulable avec le flou) ──
export async function setPixelated(spId, player, isPixelated) {
  const sp = allSpecies().find(s => s.id === spId); if (!sp) return
  const pixelated = { ...(sp.pixelated || {}) }
  if (isPixelated) pixelated[player] = true; else delete pixelated[player]
  const prev = S.edits[spId]?.fields || {}
  await editSpecies(spId, { ...prev, pixelated })
}
// ── Photo de près / très bonne qualité (×2 points) — mammifères et oiseaux uniquement ──
export async function setQuality(spId, player, isHighQuality) {
  const sp = allSpecies().find(s => s.id === spId); if (!sp) return
  const quality = { ...(sp.quality || {}) }
  if (isHighQuality) quality[player] = true; else delete quality[player]
  const prev = S.edits[spId]?.fields || {}
  await editSpecies(spId, { ...prev, quality })
}

// ══════ CHAPITRES DE PLUDINI HOST (titres/textes éditables) ══════
export function activityEditsFor(id) { return S.activityEdits[id] || null }
export async function editActivity(id, lang, fields) {
  const key = `actedit_${id}`
  const prev = S.activityEdits[id] || { id }
  const value = { ...prev, [lang]: { ...(prev[lang] || {}), ...fields } }
  S.activityEdits[id] = value; notify()
  await sb.from('overrides').upsert({ kind:'activityedit', key, value, updated_at:new Date().toISOString() }, { onConflict:'key' })
}

// ══════ TEXTES ÉDITABLES DE PLUDINI FARM (accueil, thèmes, histoire, contact) ══════
export function farmTextEditsFor(id) { return S.farmTextEdits[id] || null }
export async function editFarmText(id, lang, fields) {
  const key = `farmtext_${id}`
  const prev = S.farmTextEdits[id] || { id }
  const value = { ...prev, [lang]: { ...(prev[lang] || {}), ...fields } }
  S.farmTextEdits[id] = value; notify()
  await sb.from('overrides').upsert({ kind:'farmtextedit', key, value, updated_at:new Date().toISOString() }, { onConflict:'key' })
}

// ══════ OBSERVATIONS ══════
export async function addSighting(spId, ind) {
  const key = `sight_${spId}_${Date.now().toString(36)}`
  const value = { spId, ind, key }
  ;(S.sightings[spId] ||= []).push(value); notify()
  await sb.from('overrides').upsert({ kind:'sighting', key, value, updated_at:new Date().toISOString() }, { onConflict:'key' })
  return key
}
export async function editSighting(spId, indName, fields) {
  const key = `sedit_${spId}::${indName}`
  const value = { spId, indName, fields: { ...(S.sightEdits[key]?.fields || {}), ...fields } }
  S.sightEdits[key] = value; notify()
  await sb.from('overrides').upsert({ kind:'sightedit', key, value, updated_at:new Date().toISOString() }, { onConflict:'key' })
}
export async function removeSighting(spId, indName) {
  const orig = (S.sightings[spId] || []).find(x => x.ind?.n === indName)
  const seKey = `sedit_${spId}::${indName}`
  if (orig) {
    S.sightings[spId] = S.sightings[spId].filter(x => x.key !== orig.key)
    delete S.sightEdits[seKey]; notify()
    await Promise.all([
      sb.from('overrides').delete().eq('key', orig.key),
      sb.from('overrides').delete().eq('key', seKey),
    ])
  } else {
    await editSighting(spId, indName, { removed: true })
  }
}

// ══════ TYPE D'ESPÈCE (détermine quel formulaire d'ajout d'observation s'applique) ══════
// 1 = mammifères/oiseaux (formulaire complet, assistant guidé)
// 3 = humains/animaux domestiques (formulaire simplifié, mais avec la notion de passage)
// 2 = tout le reste : végétaux, champignons, insectes… (formulaire simplifié, sans passage)
export function speciesType(sp) {
  if (['mammiferes','oiseaux'].includes(sp.cat)) return 1
  if (['humains','domestiques'].includes(sp.cat)) return 3
  return 2
}

// ══════ POISSONS : "pêché" remplace "observation", taille remplace qualité de photo ══════
export function isFish(sp) { return sp.cat === 'poissons' }

// ══════ SCORES (tiennent compte des ajouts) ══════
// humains/animaux domestiques : ne rapportent aucun point — arbres/arbustes : bien moins, mais pas zéro
export const CAT_PT_MULT = { humains:0, domestiques:0, arbres:0.3, arbustes:0.3 }
export function calcPtsLive(sp, player) {
  const bonuses = sp.bonus?.[player] || []
  const catMult = CAT_PT_MULT[sp.cat] ?? 1
  // "photo floue" (malus) remplacée par "photo de près / très bonne qualité" (bonus) —
  // le malus reste calculé pour ne pas changer rétroactivement les scores déjà
  // enregistrés, mais l'interface ne permet plus d'en cocher de nouvelles
  const blurMult = sp.blurry?.[player] ? 0.5 : 1
  const pixelMult = sp.pixelated?.[player] ? 0.5 : 1
  const qualityMult = sp.quality?.[player] ? 2 : 1
  const bonusPts = (bonuses.includes('bebe') ? 20 : 0) + (bonuses.includes('terrier') ? 30 : 0)
  const rarityPts = (RARITY[sp.r]?.p || 0) * (SIZE_MULT[sp.sz] || 1)
  const myInds = (sp.inds || []).filter(i => i.by === player)
  let base
  if (myInds.length) {
    // chaque passage compte pour les points de sa propre méthode d'observation :
    // seul le tout premier passage ajouté rapporte 100% des points de base,
    // les suivants n'en rapportent que 10% (sinon cumuler les photos d'un
    // même animal déjà reconnu gonflerait le score sans limite)
    const isFishSp = isFish(sp)
    base = myInds.reduce((sum, ind, i) => {
      const mult = isFishSp ? (FISH_SIZE_MULT[ind.size] || 1) : (METHODS[ind.method]?.mult || 1)
      return sum + rarityPts * mult * (i === 0 ? 1 : 0.1)
    }, 0)
  } else {
    // pas encore de passage enregistré : méthode(s) cochée(s) sans individu
    const methods = sp.obs?.[player] || []
    if (!methods.length) return 0
    const best = methods.reduce((b,m)=>(METHODS[m]?.mult||0)>(METHODS[b]?.mult||0)?m:b, methods[0])
    base = rarityPts * (METHODS[best]?.mult || 1)
  }
  return Math.round((base + bonusPts) * catMult * blurMult * pixelMult * qualityMult)
}
export function speciesPtsLive(player) {
  return allSpecies().reduce((s, sp) => s + calcPtsLive(sp, player), 0)
}
export function badgePtsLive(player) {
  return ACHIEVEMENTS.filter(a => a.on && a.w.includes(player)).reduce((s,a)=>s+(a.pts||0), 0)
}
export function totalPtsLive(player) { return speciesPtsLive(player) + badgePtsLive(player) }

// ══════ JOUEURS ══════
export function allPlayers() {
  return [...BASE_PLAYERS, ...S.players.map(p => ({ id: p.id, name: p.name, custom: true }))]
}
export async function addPlayer(name) {
  const id = name.trim()[0]?.toUpperCase() || '?'
  const value = { id, name: name.trim() }
  S.players.push({ ...value, key: 'pl_' + value.name }); notify()
  await sb.from('overrides').upsert({ kind: 'player', key: 'pl_' + value.name, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}
export async function removePlayer(name) {
  S.players = S.players.filter(p => p.name !== name); notify()
  await sb.from('overrides').delete().eq('key', 'pl_' + name)
}

// ══════ CATÉGORIES (familles ajoutées à la volée) ══════
export function allCats() {
  const extra = {}
  S.species.forEach(c => {
    if (!c.cat) return
    const base = BASE_CATS.find(x => x.id === c.cat)
    if (base && c.sub && !base.subs.some(s => s.id === c.sub)) (extra[c.cat] ||= new Set()).add(c.sub)
  })
  return BASE_CATS.map(c => extra[c.id]
    ? { ...c, subs: [...c.subs, ...[...extra[c.id]].map(id => ({ id, lat: '' }))] }
    : c)
}

// ══════ QUIZ (questions ajoutées/modifiées depuis l'éditeur) ══════
// même principe que les espèces : base statique (quizdata.js) + surcharges
// (édition d'une question existante, ou question entièrement nouvelle)
export function allQuizQuestions(themeId) {
  const custom = S.quizQuestions.map(c => ({ answers:['','','',''], correct:0, explain:'', theme:'animaux', ...c }))
  const merged = [...BASE_QUIZ, ...custom]
  const all = merged
    .map(q => S.quizEdits[q.id] ? { ...q, ...S.quizEdits[q.id].fields } : q)
    .filter(q => !q.removed)
  return (themeId && themeId !== 'all') ? all.filter(q => q.theme === themeId) : all
}
// un thème n'est jouable qu'à partir de QUIZ_THEME_MIN_QUESTIONS questions —
// en dessous il reste visible mais « en préparation », non lançable ;
// les 5 thèmes prévus + ceux créés depuis l'éditeur (mode édition)
export function allQuizThemes() {
  const all = allQuizQuestions()
  const custom = S.quizThemes.map(t => ({ id: t.id, icon: t.icon, name: t.name }))
  return [...QUIZ_THEMES, ...custom].map(t => {
    const count = all.filter(q => q.theme === t.id).length
    return { ...t, count, playable: count >= QUIZ_THEME_MIN_QUESTIONS }
  })
}
export async function addQuizTheme(name, icon) {
  const id = 'theme_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  const value = { id, icon, name: { fr: name, ru: name } }
  S.quizThemes.push({ ...value, key: 'quiztheme_' + id }); notify()
  await sb.from('overrides').upsert({ kind: 'quiztheme', key: 'quiztheme_' + id, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  return id
}
export async function addQuizQuestion(q) {
  const id = q.id || ('quizq_' + Date.now().toString(36))
  const value = { theme: 'animaux', by: getMe(), ...q, id }
  S.quizQuestions.push({ ...value, key: 'quizq_' + id }); notify()
  await sb.from('overrides').upsert({ kind: 'quizq', key: 'quizq_' + id, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  return id
}
export async function editQuizQuestion(id, fields) {
  const value = { id, fields: { ...(S.quizEdits[id]?.fields || {}), ...fields } }
  S.quizEdits[id] = value; notify()
  await sb.from('overrides').upsert({ kind: 'quizqedit', key: 'quizqedit_' + id, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}
export async function removeQuizQuestion(id) {
  const isCustom = S.quizQuestions.some(q => q.id === id)
  if (isCustom) {
    S.quizQuestions = S.quizQuestions.filter(q => q.id !== id); notify()
    await sb.from('overrides').delete().eq('key', 'quizq_' + id)
  } else {
    const prev = S.quizEdits[id]?.fields || {}
    await editQuizQuestion(id, { ...prev, removed: true })
  }
}

// ══════ FORUM (sujets + messages) ══════
export function allForumTopics() {
  return [...S.forumTopics].sort((a, b) => b.createdAt - a.createdAt)
}
export function forumPostsFor(topicId) {
  return S.forumPosts.filter(p => p.topicId === topicId).sort((a, b) => a.createdAt - b.createdAt)
}
export function forumPostCount(topicId) {
  return S.forumPosts.filter(p => p.topicId === topicId).length
}
// crée le sujet et son premier message ensemble — un sujet sans message n'a pas de sens
export async function addForumTopic(title, author, text) {
  const id = 'ftopic_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  const postId = 'fpost_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  const createdAt = Date.now()
  const topic = { id, title, author, createdAt }
  const post = { id: postId, topicId: id, author, text, createdAt }
  S.forumTopics.push({ ...topic, key: 'forumtopic_' + id })
  S.forumPosts.push({ ...post, key: 'forumpost_' + postId })
  notify()
  await Promise.all([
    sb.from('overrides').upsert({ kind: 'forumtopic', key: 'forumtopic_' + id, value: topic, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
    sb.from('overrides').upsert({ kind: 'forumpost', key: 'forumpost_' + postId, value: post, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
  ])
  return id
}
export async function addForumPost(topicId, author, text) {
  const id = 'fpost_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  const post = { id, topicId, author, text, createdAt: Date.now() }
  S.forumPosts.push({ ...post, key: 'forumpost_' + id }); notify()
  await sb.from('overrides').upsert({ kind: 'forumpost', key: 'forumpost_' + id, value: post, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  return id
}
export async function removeForumTopic(id) {
  const posts = S.forumPosts.filter(p => p.topicId === id)
  S.forumTopics = S.forumTopics.filter(t => t.id !== id)
  S.forumPosts = S.forumPosts.filter(p => p.topicId !== id)
  notify()
  await Promise.all([
    sb.from('overrides').delete().eq('key', 'forumtopic_' + id),
    ...posts.map(p => sb.from('overrides').delete().eq('key', 'forumpost_' + p.id)),
  ])
}
export async function removeForumPost(id) {
  S.forumPosts = S.forumPosts.filter(p => p.id !== id); notify()
  await sb.from('overrides').delete().eq('key', 'forumpost_' + id)
}

// ══════ QUIZ — scores (une entrée par partie jouée, pour le classement) ══════
export function allQuizScores() {
  return [...S.quizScores]
}
export async function addQuizScore(player, score, total, theme = 'all') {
  const id = 'qscore_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  const value = { id, player, score, total, theme, createdAt: Date.now() }
  S.quizScores.push({ ...value, key: 'quizscore_' + id }); notify()
  await sb.from('overrides').upsert({ kind: 'quizscore', key: 'quizscore_' + id, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  return id
}

// ══════ IDENTITÉ ══════
export function getMe() { try { return localStorage.getItem('pludini_me') || localStorage.getItem('pluduni_me') || '' } catch { return '' } }
export function setMe(n) { try { localStorage.setItem('pludini_me', n) } catch {} ; notify() }
