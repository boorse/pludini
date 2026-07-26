// ── Calendrier des travaux & observations, par thème ──
export const THEMES = {
  agri:   { l:'Agriculture',  ru:'Сельское хозяйство', c:'#8B9B6E', e:'🌾' },
  brico:  { l:'Bricolage',    ru:'Строительство',      c:'#B5602F', e:'🔨' },
  bois:   { l:'Bois',         ru:'Заготовка дров',     c:'#7A5A3A', e:'🪓' },
  faune:  { l:'Faune',        ru:'Наблюдение',         c:'#4A5D32', e:'🦌' },
  chasse: { l:'Chasse',       ru:'Охота',              c:'#6B2E2E', e:'🎯' },
  ciel:   { l:'Ciel',         ru:'Небо',               c:'#5B6B7E', e:'🔭' },
  recolte:{ l:'Récolte',      ru:'Урожай',             c:'#C08A3E', e:'🧺' },
  cueil:  { l:'Cueillette',   ru:'Сбор',               c:'#9A7B4F', e:'🍄' },
  fleur:  { l:'Floraison',    ru:'Цветение',           c:'#A9799A', e:'🌸' },
  plant:  { l:'Plantation',   ru:'Посадка',            c:'#6E8A6A', e:'🌱' },
}

export const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
export const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

// m : index du mois (0-11), peut couvrir plusieurs mois
export const EVENTS = [
  // Agriculture
  { id:'ev01', m:[2,3],   t:'agri',   l:'Taille de l\u2019argousier',            d:'Avant le débourrement. Aérer le centre des plants.' },
  { id:'ev02', m:[3,4],   t:'agri',   l:'Semis potager sous abri',              d:'Tomates, courges, poivrons en godets.' },
  { id:'ev03', m:[4,5],   t:'agri',   l:'Mise en terre du potager',             d:'Après les dernières gelées (mi-mai en Vidzeme).' },
  { id:'ev04', m:[5,6,7], t:'agri',   l:'Désherbage & paillage',                d:'Entre les rangs d\u2019argousier et au potager.' },
  { id:'ev05', m:[9,10],  t:'agri',   l:'Fumure d\u2019automne',                 d:'Compost au pied des arbres fruitiers.' },
  // Récolte
  { id:'ev06', m:[7,8],   t:'recolte',l:'Récolte de l\u2019argousier',           d:'Coupe des branches, congélation puis vibration.' },
  { id:'ev07', m:[8,9],   t:'recolte',l:'Récolte des pommes',                   d:'Verger — tri cidre / table / jus.' },
  { id:'ev08', m:[8,9],   t:'recolte',l:'Pressage & fermentation cidre',        d:'Presse, cuves, contrôle des densités.' },
  { id:'ev09', m:[6,7,8], t:'recolte',l:'Potager en pleine production',         d:'Récolte continue, conserves et lacto-fermentation.' },
  { id:'ev10', m:[8,9],   t:'recolte',l:'Coupe des hortensias à sécher',        d:'Quand les panicules ont rosi. Séchage tête en bas.' },
  // Cueillette
  { id:'ev11', m:[4,5],   t:'cueil',  l:'Morilles & premières pousses',         d:'Lisières, vieux vergers, sols sableux.' },
  { id:'ev12', m:[6,7],   t:'cueil',  l:'Myrtilles sauvages',                   d:'Pinèdes acides. Pic mi-juillet.' },
  { id:'ev13', m:[7,8,9], t:'cueil',  l:'Cèpes, bolets, girolles',              d:'Après les pluies, sous épicéas et bouleaux.' },
  { id:'ev14', m:[8,9],   t:'cueil',  l:'Airelles & canneberges',               d:'Tourbières et sous-bois humides.' },
  { id:'ev15', m:[9],     t:'cueil',  l:'Noisettes & sorbes',                   d:'Lisières. Sorbes après la première gelée.' },
  // Bois
  { id:'ev16', m:[10,11,0,1], t:'bois', l:'Abattage & débardage',               d:'Sève descendue, sol gelé — meilleure période.' },
  { id:'ev17', m:[1,2],   t:'bois',   l:'Fendage & mise en stères',             d:'Séchage 18 mois minimum avant usage.' },
  { id:'ev18', m:[9,10],  t:'bois',   l:'Rentrer le bois de l\u2019année',       d:'Bûcher couvert, à l\u2019abri du vent d\u2019est.' },
  // Bricolage
  { id:'ev19', m:[3,4],   t:'brico',  l:'Réfection des clôtures',               d:'Basse-cour : grillage enterré 30 cm (chien viverrin).' },
  { id:'ev20', m:[4,5,6], t:'brico',  l:'Chantier affût semi-enterré',          d:'Terrassement puis coffrage. Sol ressuyé.' },
  { id:'ev21', m:[5,6],   t:'brico',  l:'Plateforme sur pilotis (Līčupe)',      d:'Étiage bas. Yakisugi sur les bois immergés.' },
  { id:'ev22', m:[6,7],   t:'brico',  l:'Hangar argousier',                     d:'Base en pierres de champ, bardage sombre.' },
  { id:'ev23', m:[9,10],  t:'brico',  l:'Hivernage des bâtiments',              d:'Purge des circuits d\u2019eau, calfeutrage.' },
  // Plantation
  { id:'ev24', m:[3,4],   t:'plant',  l:'Plantation d\u2019arbres fruitiers',    d:'Antonovka, Sīpoliņš, Pepiņš, Yarlington Mill.' },
  { id:'ev25', m:[9,10],  t:'plant',  l:'Plantation d\u2019automne',             d:'Meilleure reprise pour arbustes et haies.' },
  { id:'ev26', m:[3],     t:'plant',  l:'Bouturage des hortensias',             d:'Multiplication gratuite des pieds existants.' },
  // Floraison
  { id:'ev27', m:[3,4],   t:'fleur',  l:'Floraison de l\u2019argousier',         d:'Discrète. Vérifier le ratio mâles / femelles.' },
  { id:'ev28', m:[4,5],   t:'fleur',  l:'Vergers en fleurs',                    d:'Pommiers, cerisiers. Surveiller les gelées tardives.' },
  { id:'ev29', m:[6,7],   t:'fleur',  l:'Tilleuls en fleurs',                   d:'Miellée majeure. Récolte des fleurs pour tisane.' },
  { id:'ev30', m:[6,7,8], t:'fleur',  l:'Hortensias paniculés',                 d:'Blanc-vert en juillet, rosé en septembre.' },
  // Faune
  { id:'ev31', m:[2,3],   t:'faune',  l:'Retour des grues cendrées',            d:'Passages migratoires spectaculaires.' },
  { id:'ev32', m:[3,4],   t:'faune',  l:'Parade du grand tétras',               d:'À l\u2019aube, vieilles pinèdes. Très sensible au dérangement.' },
  { id:'ev33', m:[4,5],   t:'faune',  l:'Naissance des renardeaux',             d:'Terrier actif — observation depuis l\u2019affût.' },
  { id:'ev34', m:[4,5],   t:'faune',  l:'Mise bas chevreuils & élans',          d:'Prudence : femelles très défensives.' },
  { id:'ev35', m:[6,7],   t:'faune',  l:'Rut du chevreuil',                     d:'Poursuites en cercles. Brocards très actifs.' },
  { id:'ev36', m:[8,9],   t:'faune',  l:'Brame du cerf',                        d:'Le grand rendez-vous sonore de l\u2019année.' },
  { id:'ev37', m:[10,11], t:'faune',  l:'Traces dans la neige',                 d:'Lynx, loup, martre — pistage idéal.' },
  { id:'ev38', m:[1,2],   t:'faune',  l:'Rut du lynx',                          d:'Cris nocturnes. Fenêtre d\u2019observation rare.' },
  // Chasse — périodes indicatives, à vérifier chaque année (Service forestier d'État VMD / Medību noteikumi)
  { id:'ch01', m:[4,5,6,7,8,9],               t:'chasse', l:'Chevreuil (brocard)',        d:'≈ mi-mai à mi-octobre, à l\u2019approche/affût. Dates indicatives — à vérifier (VMD).' },
  { id:'ch02', m:[8,9,10,11],                 t:'chasse', l:'Chevreuil (chevrette/faon)', d:'≈ septembre à décembre. Dates indicatives — à vérifier (VMD).' },
  { id:'ch03', m:[7,8,9,10,11,0],             t:'chasse', l:'Cerf élaphe',                d:'≈ août à mi-janvier selon classe d\u2019âge/sexe. Dates indicatives — à vérifier (VMD).' },
  { id:'ch04', m:[8,9,10,11],                 t:'chasse', l:'Élan',                       d:'≈ septembre à décembre, quota individuel. Dates indicatives — à vérifier (VMD).' },
  { id:'ch05', m:[0,1,2,3,4,5,6,7,8,9,10,11], t:'chasse', l:'Sanglier',                   d:'Quasi toute l\u2019année (lutte contre la peste porcine africaine). Vérifier les arrêtés locaux.' },
  { id:'ch06', m:[10,11],                     t:'chasse', l:'Lièvre d\u2019Europe',        d:'≈ novembre-décembre, battues autorisées. Dates indicatives — à vérifier (VMD).' },
  { id:'ch07', m:[6,7,8,9,10,11,0,1,2],       t:'chasse', l:'Loup gris',                  d:'Quota très restreint, souvent suspendu — statut à confirmer avant toute sortie (VMD).' },
  // Ciel
  { id:'ev39', m:[0,1],   t:'ciel',   l:'Nuits les plus noires',                d:'Orion, Pléiades. 17 h de nuit en janvier.' },
  { id:'ev40', m:[7],     t:'ciel',   l:'Perséides',                            d:'Pic autour du 12 août. Idéal depuis la prairie.' },
  { id:'ev41', m:[9,10],  t:'ciel',   l:'Draconides & Orionides',               d:'Ciel dégagé fréquent début octobre.' },
  { id:'ev42', m:[11,0],  t:'ciel',   l:'Géminides',                            d:'Mi-décembre. La plus riche pluie de l\u2019année.' },
  { id:'ev43', m:[8,9,10],t:'ciel',   l:'Aurores boréales possibles',           d:'Rare mais réel à cette latitude, par forte activité.' },
]

// ── Points d'intérêt du territoire ──
// x,y = pourcentage sur la carte schématique
export const CENTER = { lat:57.286361, lon:25.593917 }

export const POIS = []

export const DEFAULT_TYPES = {
  cam:    { c:'#4A5D32', e:'📷', l:'Caméra' },
  terrier:{ c:'#7A5A3A', e:'🕳️', l:'Terrier' },
  projet: { c:'#B5602F', e:'🔨', l:'Projet' },
  eau:    { c:'#5B7E8E', e:'💧', l:'Eau' },
  cueil:  { c:'#9A7B4F', e:'🍄', l:'Cueillette' },
  agri:   { c:'#8B9B6E', e:'🌾', l:'Culture' },
  bati:   { c:'#8A7B62', e:'🏠', l:'Bâti' },
  ciel:   { c:'#5B6B7E', e:'🔭', l:'Ciel' },
  explo:  { c:'#8B3A2E', e:'❓', l:'À explorer' },
}

// compat : les anciens types restent disponibles comme base
export const POI_TYPES = DEFAULT_TYPES
