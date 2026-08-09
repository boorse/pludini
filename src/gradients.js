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
// une teinte distincte par catégorie, choisie dans la palette naturelle du site
// (verts, terracotta, ocre, bleu ardoise…) — jamais deux catégories voisines
// avec la même famille de couleur
const CAT_COLORS = {
  mammiferes: ['#3E4A2C','#7D8C5A'],  // vert forêt
  oiseaux:    ['#3A4C52','#7B9AA0'],  // bleu ardoise
  arbres:     ['#2F4433','#6E8A6A'],  // vert pin
  arbustes:   ['#4A431E','#9B9250'],  // vert-doré mousse
  champignons:['#5C3A26','#B0764A'],  // brun terracotta
  lichens:    ['#4A5240','#93A07E'],  // gris-vert
  insectes:   ['#6B4419','#C99245'],  // ambre miel
  poissons:   ['#24434A','#5E96A0'],  // bleu-vert aquatique
  batraciens: ['#3A4A1E','#82A052'],  // vert jaune amphibien
  humains:    ['#4A3C2E','#96805F'],  // sable/bois
  domestiques:['#4A322E','#9C6E62'],  // terracotta rosé
}
export function gradientForCat(id) {
  const [a, b] = CAT_COLORS[id] || PALETTES[0]
  return `linear-gradient(140deg,${a} 0%,${b} 100%)`
}
// teinte pleine (unique, pas un dégradé) d'une catégorie — sert de repère
// (bandeau, puce) ailleurs que sur ses propres cartes, ex. la matrice
export function catAccentColor(id) {
  return (CAT_COLORS[id] || PALETTES[0])[1]
}
// dégradé des cartes d'ordre (famille) de la map du vivant : la couleur de sa
// catégorie, légèrement délavée — pour que chaque ordre reste visuellement
// rattaché à sa catégorie sans reprendre son intensité pleine
const SUB_COLORS = {
  mammiferes: ['#A8B48A','#93A176'],
  oiseaux:    ['#9FB7BD','#85A3AA'],
  arbres:     ['#96AC93','#7F9A7C'],
  arbustes:   ['#B7AC72','#A69B5C'],
  champignons:['#C99A78','#BB8760'],
  lichens:    ['#A9B394','#96A17F'],
  insectes:   ['#D3AC72','#C79A57'],
  poissons:   ['#7FA6AC','#6B96A0'],
  batraciens: ['#9BAE72','#88A05C'],
  humains:    ['#AC9977','#9C8768'],
  domestiques:['#B08D82','#A17A6E'],
}
export function gradientForSub(catId) {
  const [a, b] = SUB_COLORS[catId] || SUB_COLORS.mammiferes
  return `linear-gradient(140deg,${a} 0%,${b} 100%)`
}
