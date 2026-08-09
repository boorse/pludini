// Dégradés naturels — placeholders en attendant les vraies photos
// Chaque espèce reçoit un dégradé stable dérivé de son id
const PALETTES = [
  ['#4A5D32','#8B9B6E'], ['#5C4A2E','#A88B5C'], ['#3E5245','#7A9481'],
  ['#6B4A2F','#B5824F'], ['#44513A','#8E9B72'], ['#5A4636','#9C7B58'],
  ['#3A4A3E','#75897A'], ['#6E5330','#C09A5E'], ['#48533F','#909C77'],
  ['#59422F','#A37B54'], ['#3F4E42','#7E9284'], ['#655334','#B49C63'],
  ['#4E5836','#96A171'], ['#5F4733','#AA855C'], ['#425044','#7C9080'],
]
export function gradientFor(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  const [a, b] = PALETTES[h % PALETTES.length]
  const angle = 120 + (h % 7) * 15
  return `linear-gradient(${angle}deg, ${a} 0%, ${b} 100%)`
}
export function gradientForCat(id) {
  const map = {
    mammiferes: 'linear-gradient(140deg,#3E4A2C 0%,#7D8C5A 100%)',
    oiseaux:    'linear-gradient(140deg,#3A4C52 0%,#7B9AA0 100%)',
    arbres:     'linear-gradient(140deg,#2F4433 0%,#6E8A6A 100%)',
    arbustes:   'linear-gradient(140deg,#3D4A28 0%,#8A9B5E 100%)',
    champignons:'linear-gradient(140deg,#5C3A26 0%,#B0764A 100%)',
    lichens:    'linear-gradient(140deg,#4A5240 0%,#93A07E 100%)',
    insectes:   'linear-gradient(140deg,#5A4A2A 0%,#AE9455 100%)',
  }
  return map[id] || PALETTES[0]
}
// dégradé pastel unique pour les cartes d'ordre (famille) de la map du vivant —
// même teinte sauge que le dégradé "mammifères" ci-dessus, très éclaircie
export const GRADIENT_SUB = 'linear-gradient(140deg,#E9EFDD 0%,#D6E1BF 100%)'
