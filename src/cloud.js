// Tâches et repères partagés
import { sb } from './supabase.js'

export async function getTodos() {
  const { data } = await sb.from('overrides').select('*').eq('kind','todo').order('updated_at')
  return (data||[]).map(r=>r.value)
}
export async function saveTodo(t) {
  await sb.from('overrides').upsert({ kind:'todo', key:`todo_${t.id}`, value:t, updated_at:new Date().toISOString() }, { onConflict:'key' })
}
export async function deleteTodo(id) { await sb.from('overrides').delete().eq('key', `todo_${id}`) }

export async function getPins() {
  const { data } = await sb.from('overrides').select('*').eq('kind','pin').order('updated_at')
  return (data||[]).map(r=>r.value)
}
export async function savePin(p) {
  await sb.from('overrides').upsert({ kind:'pin', key:`pin_${p.id}`, value:p, updated_at:new Date().toISOString() }, { onConflict:'key' })
}
export async function deletePin(id) { await sb.from('overrides').delete().eq('key', `pin_${id}`) }

// Réglages du site (image d'accueil, etc.)
export async function getSetting(key) {
  const { data } = await sb.from('overrides').select('*').eq('key', `set_${key}`).maybeSingle()
  return data?.value ?? null
}
export async function setSetting(key, value) {
  await sb.from('overrides').upsert({ kind:'setting', key:`set_${key}`, value, updated_at:new Date().toISOString() }, { onConflict:'key' })
}

// Zones et tracés
export async function getZones() {
  const { data } = await sb.from('overrides').select('*').eq('kind','zone').order('updated_at')
  return (data||[]).map(r=>r.value)
}
export async function saveZone(z) {
  await sb.from('overrides').upsert({ kind:'zone', key:`zone_${z.id}`, value:z, updated_at:new Date().toISOString() }, { onConflict:'key' })
}
export async function deleteZone(id) { await sb.from('overrides').delete().eq('key', `zone_${id}`) }

// Types de pin personnalisés
export async function getPinTypes() {
  const { data } = await sb.from('overrides').select('*').eq('kind','pintype').order('updated_at')
  return (data||[]).map(r=>r.value)
}
export async function savePinType(t) {
  await sb.from('overrides').upsert({ kind:'pintype', key:`pintype_${t.id}`, value:t, updated_at:new Date().toISOString() }, { onConflict:'key' })
}
export async function deletePinType(id) { await sb.from('overrides').delete().eq('key', `pintype_${id}`) }

// Thèmes du calendrier ajoutés par les observateurs
export async function getThemes() {
  const { data } = await sb.from('overrides').select('*').eq('kind','theme').order('updated_at')
  return (data||[]).map(r=>r.value)
}
export async function saveTheme(t) {
  await sb.from('overrides').upsert({ kind:'theme', key:`theme_${t.id}`, value:t, updated_at:new Date().toISOString() }, { onConflict:'key' })
}
export async function deleteTheme(id) { await sb.from('overrides').delete().eq('key', `theme_${id}`) }

// Lignes du calendrier — ajouts et modifications (id partagé avec un évènement de base = remplacement)
export async function getCalEvents() {
  const { data } = await sb.from('overrides').select('*').eq('kind','calevent').order('updated_at')
  return (data||[]).map(r=>r.value)
}
export async function saveCalEvent(e) {
  await sb.from('overrides').upsert({ kind:'calevent', key:`calevent_${e.id}`, value:e, updated_at:new Date().toISOString() }, { onConflict:'key' })
}
export async function deleteCalEvent(id) { await sb.from('overrides').delete().eq('key', `calevent_${id}`) }

// Badges — déclaration d'un joueur qu'il a rempli les conditions d'un badge
// "manuel" (rien dans les données ne le prouve automatiquement, ex. "voir le
// lynx") : c'est cette déclaration qui fait progresser sa courbe de 0 à 100%
export async function getBadgeClaims() {
  const { data } = await sb.from('overrides').select('*').eq('kind','badgeclaim').order('updated_at')
  return (data||[]).map(r=>r.value)
}
export async function setBadgeClaim(achId, player, done) {
  const key = `badgeclaim_${achId}_${player}`
  if (done) await sb.from('overrides').upsert({ kind:'badgeclaim', key, value:{ achId, player, done:true }, updated_at:new Date().toISOString() }, { onConflict:'key' })
  else await sb.from('overrides').delete().eq('key', key)
}

// Badges — propositions (nouveau badge, ou modification du texte d'un badge
// existant) : n'affecte jamais le badge réel tout seul, reste "en attente"
// jusqu'à être repris à la main (par Claude Code) pour devenir fonctionnel
export async function getBadgeProposals() {
  const { data } = await sb.from('overrides').select('*').eq('kind','badgeproposal').order('updated_at')
  return (data||[]).map(r=>r.value)
}
export async function saveBadgeProposal(p) {
  await sb.from('overrides').upsert({ kind:'badgeproposal', key:`badgeproposal_${p.id}`, value:p, updated_at:new Date().toISOString() }, { onConflict:'key' })
}
export async function deleteBadgeProposal(id) { await sb.from('overrides').delete().eq('key', `badgeproposal_${id}`) }
