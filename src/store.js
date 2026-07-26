// ══════════════════════════════════════════════════════════════
//  Magasin central — cache partagé, une seule source de vérité
// ══════════════════════════════════════════════════════════════
import { sb, publicUrl } from './supabase.js'
import { SPECIES as BASE_SPECIES, CATS as BASE_CATS, PLAYERS as BASE_PLAYERS,
         RARITY, METHODS, SIZE_MULT, ACHIEVEMENTS } from './data'

const S = {
  photos: {},        // target -> [{id,url,caption,by,path}]
  named: {},         // "spId::obsName" -> {name, traits}
  species: [],       // espèces ajoutées
  players: [],       // joueurs ajoutés
  edits: {},         // spId -> champs modifiés
  sightings: {},     // spId -> [{ind, ...}]
  sightEdits: {},    // "sedit_spId::indName" -> {fields}
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
  S.named = {}; S.species = []; S.players = []; S.edits = {}; S.sightings = {}; S.sightEdits = {}
  ;(ov.data || []).forEach(r => {
    if (r.kind === 'named')   S.named[r.key] = r.value
    if (r.kind === 'species') S.species.push({ ...r.value, key: r.key })
    if (r.kind === 'player')  S.players.push({ ...r.value, key: r.key })
    if (r.kind === 'spedit')  S.edits[r.value.id] = r.value
    if (r.kind === 'sighting') (S.sightings[r.value.spId] ||= []).push({ ...r.value, key: r.key })
    if (r.kind === 'sightedit') S.sightEdits[r.key] = r.value
  })
  S.ready = true
  notify()
}

// ══════ PHOTOS ══════
const EMPTY = Object.freeze([])
export function photosFor(target) { return S.photos[target] || EMPTY }
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
  notify()
}
export async function setPhotoPos(target, id, pos) {
  S.photos[target] = (S.photos[target] || []).map(p => p.id === id ? { ...p, pos } : p)
  notify()
  await sb.from('photos').update({ pos }).eq('id', id)
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

// ══════ SCORES (tiennent compte des ajouts) ══════
// humains/animaux domestiques : ne rapportent aucun point — arbres/arbustes : bien moins, mais pas zéro
const CAT_PT_MULT = { humains:0, domestiques:0, arbres:0.3, arbustes:0.3 }
export function calcPtsLive(sp, player) {
  const methods = sp.obs?.[player] || []
  if (!methods.length) return 0
  const best = methods.reduce((b,m)=>(METHODS[m]?.mult||0)>(METHODS[b]?.mult||0)?m:b, methods[0])
  const bonuses = sp.bonus?.[player] || []
  const catMult = CAT_PT_MULT[sp.cat] ?? 1
  const blurMult = sp.blurry?.[player] ? 0.5 : 1
  const base = (RARITY[sp.r]?.p || 0) * (SIZE_MULT[sp.sz] || 1) * (METHODS[best]?.mult || 1)
  const bonusPts = (bonuses.includes('bebe') ? 20 : 0) + (bonuses.includes('terrier') ? 30 : 0)
  return Math.round((base + bonusPts) * catMult * blurMult)
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

// ══════ IDENTITÉ ══════
export function getMe() { try { return localStorage.getItem('pludini_me') || localStorage.getItem('pluduni_me') || '' } catch { return '' } }
export function setMe(n) { try { localStorage.setItem('pludini_me', n) } catch {} ; notify() }
