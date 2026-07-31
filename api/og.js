// ══════ Vignette d'aperçu de lien (og:image), générée à la volée ══════
// Superpose le logo Pludini sur la photo d'accueil actuelle de la page
// (Host/Doc/Farm) — se met donc à jour automatiquement dès qu'on change
// cette photo, sans rien à régénérer à la main. Repli sur un dégradé (ou,
// pour Farm, la photo de remplacement) tant qu'aucune photo n'est importée.
// Pas de JSX ici (extension .js, zéro-config hors Next.js) : les éléments
// sont construits à la main via React.createElement.
import { createElement as h } from 'react'
import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

const SUPABASE_URL = 'https://zzgcgowmuxqfzawursqi.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6Z2Nnb3dtdXhxZnphd3Vyc3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NjI3NTcsImV4cCI6MjEwMDEzODc1N30.FnvK_fbQ9TCUQPNhdKG0e418UoYrwVkPTIofbRYfYTg'
const LOGO_URL = 'https://pludini.lv/icons/bobber-mark.png'

const PAGES = {
  host: {
    target: 'exp:hero', title: 'Pludini Host', subtitle: 'Une nuit dans la forêt',
    fallback: 'linear-gradient(160deg,#2A2118 0%,#5C4A2E 45%,#A88B5C 100%)',
  },
  doc: {
    target: 'site:hero', title: 'Pludini Doc', subtitle: 'Inventaire naturaliste',
    fallback: 'linear-gradient(155deg,#22301C 0%,#3E5233 42%,#6E8557 78%,#94A874 100%)',
  },
  farm: {
    target: 'farm:hero', title: 'Pludini Farm', subtitle: 'Les produits de notre ferme',
    fallback: 'linear-gradient(160deg,#5C4A2E 0%,#8B6F3E 50%,#C9A046 100%)',
    fallbackImage: 'https://images.unsplash.com/photo-1732123280078-27d7997ab0fb?w=1600&q=75&auto=format&fit=crop',
  },
}

// même règle que côté appli : la vignette choisie prime, sinon la plus ancienne photo du target
async function heroPhotoUrl(target) {
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  try {
    const coverRes = await fetch(
      `${SUPABASE_URL}/rest/v1/overrides?kind=eq.cover&select=value&value->>target=eq.${encodeURIComponent(target)}`,
      { headers },
    )
    const covers = coverRes.ok ? await coverRes.json() : []
    const coverId = covers?.[0]?.value?.photoId

    let path = null
    if (coverId) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/photos?id=eq.${coverId}&select=path`, { headers })
      const rows = r.ok ? await r.json() : []
      path = rows?.[0]?.path || null
    }
    if (!path) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/photos?target=eq.${encodeURIComponent(target)}&select=path&order=created_at.asc&limit=1`,
        { headers },
      )
      const rows = r.ok ? await r.json() : []
      path = rows?.[0]?.path || null
    }
    return path ? `${SUPABASE_URL}/storage/v1/object/public/photos/${path}` : null
  } catch {
    return null
  }
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const page = PAGES[searchParams.get('page')] || PAGES.doc

  const photoUrl = await heroPhotoUrl(page.target)
  const bg = photoUrl || page.fallbackImage || null

  const tree = h('div', {
    style: { display:'flex', flexDirection:'column', justifyContent:'flex-end',
      width:'1200px', height:'630px', position:'relative', background: bg ? '#1E2418' : page.fallback },
  },
    bg && h('img', {
      src: bg, width: 1200, height: 630,
      style: { position:'absolute', top:0, left:0, width:'1200px', height:'630px', objectFit:'cover' },
    }),
    h('div', {
      style: { position:'absolute', inset:0,
        background:'linear-gradient(to top, rgba(16,14,10,.85) 0%, rgba(16,14,10,.05) 55%, rgba(16,14,10,.3) 100%)' },
    }),
    h('div', {
      style: { position:'relative', display:'flex', alignItems:'center', gap:18, padding:'0 56px 48px' },
    },
      h('img', { src: LOGO_URL, width: 54, height: 54, style: { borderRadius:12 } }),
      h('div', { style: { display:'flex', flexDirection:'column' } },
        h('div', { style: { fontSize:44, fontWeight:700, color:'#F2EEE2', letterSpacing:'-1px' } }, page.title),
        h('div', { style: { fontSize:23, color:'rgba(242,238,226,.85)', marginTop:4 } }, page.subtitle),
      ),
    ),
  )

  return new ImageResponse(tree, {
    width: 1200,
    height: 630,
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' },
  })
}
