// Aperçu de lien distinct pour Pludini Host (racine du domaine), Pludini Doc
// (/doc) et Pludini Farm (/farm) — intercepte ces URLs et sert un index.html
// dont les balises og:*/twitter:* sont adaptées à la page. Le reste du site
// (React, assets) n'est pas concerné : c'est le même bundle, juste des
// balises différentes pour les robots d'aperçu (WhatsApp, iMessage…).
// /host reste servi à l'identique de / pour ne pas casser d'anciens liens.
// L'image (og:image) est générée à la volée par /api/og.jsx à partir de la
// photo d'accueil actuelle de chaque page : elle se met donc à jour toute
// seule dès que cette photo change, sans balise statique à régénérer.
export const config = {
  matcher: ['/', '/host', '/doc', '/farm'],
}

const HOST_PAGE = {
  title: 'Pludini Host — Une nuit dans la forêt',
  description: 'Faune sauvage, autosuffisance et nuits sans une seule lumière — une propriété familiale nichée dans la forêt du Vidzeme.',
  image: '/api/og?page=host',
}

const PAGES = {
  '/': HOST_PAGE,
  '/host': HOST_PAGE,
  '/doc': {
    title: 'Pludini Doc — Inventaire naturaliste',
    description: 'Inventaire naturaliste collaboratif de la forêt, des lacs et de la rivière — faune, flore et souvenirs partagés en famille.',
    image: '/api/og?page=doc',
  },
  '/farm': {
    title: 'Pludini Farm — Les produits de notre ferme',
    description: 'Cidre, argousier, miel, fromage de chèvre et légumes du potager — une petite production familiale du Vidzeme.',
    image: '/api/og?page=farm',
  },
}

export default async function middleware(request) {
  const url = new URL(request.url)
  const path = url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, '')
  const page = PAGES[path]
  if (!page) return

  const res = await fetch(new URL('/index.html', url))
  let html = await res.text()

  const imageUrl = new URL(page.image, url).toString()
  const pageUrl = url.toString()

  html = html
    .replace(/<title>.*?<\/title>/s, `<title>${page.title}</title>`)
    .replace(/(name="description" content=")[^"]*(")/, `$1${page.description}$2`)
    .replace(/(property="og:url" content=")[^"]*(")/, `$1${pageUrl}$2`)
    .replace(/(property="og:title" content=")[^"]*(")/, `$1${page.title}$2`)
    .replace(/(property="og:description" content=")[^"]*(")/, `$1${page.description}$2`)
    .replace(/(property="og:image" content=")[^"]*(")/, `$1${imageUrl}$2`)
    .replace(/(name="twitter:title" content=")[^"]*(")/, `$1${page.title}$2`)
    .replace(/(name="twitter:description" content=")[^"]*(")/, `$1${page.description}$2`)
    .replace(/(name="twitter:image" content=")[^"]*(")/, `$1${imageUrl}$2`)

  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
