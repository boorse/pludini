// ═══════════════════════════════════════════════════════════════════
//  PLUDINI — Questions du Quiz · stockées en dur, pas générées à la volée
// ═══════════════════════════════════════════════════════════════════
// Chaque question : un id unique, l'id de l'espèce concernée (pour aller
// chercher une photo dans la galerie), le texte, 4 réponses, l'index de
// la bonne (0-3) et une explication optionnelle affichée après le choix.
// L'ordre des réponses n'est PAS mélangé ici : ça se fait à l'affichage,
// pour que la bonne réponse ne soit jamais figée à une position.

// ── Thèmes ── un thème n'est proposable en partie que s'il atteint ce
// nombre de questions ; en dessous il s'affiche « en préparation »
export const QUIZ_THEME_MIN_QUESTIONS = 15

export const QUIZ_THEMES = [
  { id: 'animaux',  icon: '🦌', name: { fr: 'Animaux',                       ru: 'Животные' } },
  { id: 'arbres',   icon: '🌳', name: { fr: 'Arbres & plantes',              ru: 'Деревья и растения' } },
  { id: 'foret',    icon: '🪓', name: { fr: 'Vie en forêt / savoir-faire',   ru: 'Жизнь в лесу' } },
  { id: 'astro',    icon: '🌌', name: { fr: 'Astronomie',                    ru: 'Астрономия' } },
  { id: 'histoire', icon: '📜', name: { fr: 'Histoire',                     ru: 'История' } },
]

const ANIMAL_QUESTIONS = [
  // ── Lynx boréal ──
  {
    id: 'lynx-1', spId: 'lynx',
    q: 'Comment le lynx capture-t-il ses proies ?',
    answers: [
      'Il les épuise sur une longue course',
      'Il les approche puis bondit sur une courte distance',
      'Il les rabat vers un congénère embusqué',
      'Il les traque jusqu’à un point d’eau',
    ],
    correct: 1,
  },
  {
    id: 'lynx-2', spId: 'lynx',
    q: 'Après avoir tué un ongulé, que fait le lynx de sa proie ?',
    answers: [
      'Il la consomme sur plusieurs jours en y revenant',
      'Il l’emporte en haut d’un arbre',
      'Il la partage avec les autres lynx du secteur',
      'Il n’en mange que le foie et abandonne le reste',
    ],
    correct: 0,
  },
  {
    id: 'lynx-3', spId: 'lynx',
    q: 'Quelle nourriture le lynx refuse-t-il systématiquement ?',
    answers: [
      'Les oiseaux au sol',
      'La viande déjà en décomposition',
      'Les proies plus petites qu’un lièvre',
      'Les animaux domestiques',
    ],
    correct: 1,
  },
  {
    id: 'lynx-4', spId: 'lynx',
    q: 'Comment un lynx signale-t-il sa présence à ses congénères ?',
    answers: [
      'Par des marques d’urine et des griffades',
      'Par des hurlements portant à plusieurs kilomètres',
      'En laissant ses proies bien en évidence',
      'Par des passages boueux qu’il entretient',
    ],
    correct: 0,
  },

  // ── Renard roux ──
  {
    id: 'renard-1', spId: 'renard',
    q: 'Quand il bondit sur une proie cachée sous la neige, qu’a-t-on remarqué sur ses sauts ?',
    answers: [
      'Il bondit toujours face au vent',
      'Il les oriente selon le nord-est magnétique',
      'Il vise dans la direction du soleil',
      'Il alterne régulièrement gauche et droite',
    ],
    correct: 1,
  },
  {
    id: 'renard-2', spId: 'renard',
    q: 'Sa manière de chasser rappelle celle de quel animal, alors qu’il n’en est pas un ?',
    answers: [
      'Le chat, à l’affût et par bonds',
      'Le loup, en poursuite endurante',
      'La loutre, en fouillant sous l’eau',
      'Le blaireau, en creusant ses proies',
    ],
    correct: 0,
  },
  {
    id: 'renard-3', spId: 'renard',
    q: 'Quelle part importante et discrète de son régime surprend souvent ?',
    answers: [
      'Les vers de terre',
      'Les poissons de rivière',
      'Les jeunes faons',
      'Les champignons',
    ],
    correct: 0,
  },
  {
    id: 'renard-4', spId: 'renard',
    q: 'Comment s’organise parfois l’élevage d’une portée de renardeaux ?',
    answers: [
      'Des femelles subordonnées aident le couple',
      'Les mâles se relaient sur une même portée',
      'Plusieurs femelles rassemblent leurs petits',
      'Les jeunes sont confiés à un terrier commun',
    ],
    correct: 0,
  },

  // ── Chevreuil ──
  {
    id: 'chevreuil-1', spId: 'chevreuil',
    q: 'Qu’a de particulier sa gestation, rare chez les mammifères ?',
    answers: [
      'L’embryon suspend son développement plusieurs mois',
      'La femelle porte deux portées décalées à la fois',
      'La gestation dépend de la température extérieure',
      'Le mâle couve la portée après la naissance',
    ],
    correct: 0,
  },
  {
    id: 'chevreuil-2', spId: 'chevreuil',
    q: 'Le rut a lieu en été : quand naissent les faons, et pourquoi ?',
    answers: [
      'Au printemps suivant, quand la nourriture abonde',
      'À l’automne, avant les premiers froids',
      'Quelques semaines après le rut',
      'En plein hiver, pour endurcir les petits',
    ],
    correct: 0,
  },
  {
    id: 'chevreuil-3', spId: 'chevreuil',
    q: 'Ce cri sec entendu parfois en forêt, c’est lui : à quoi ressemble-t-il ?',
    answers: [
      'Un aboiement bref et rauque',
      'Un sifflement aigu prolongé',
      'Un feulement grave',
      'Un barrissement court',
    ],
    correct: 0,
  },
  {
    id: 'chevreuil-4', spId: 'chevreuil',
    q: 'Comment le brocard poursuit-il la femelle avant l’accouplement ?',
    answers: [
      'En traçant des cercles répétés au sol',
      'En la rabattant vers son territoire',
      'En la suivant en ligne droite sur des kilomètres',
      'En l’attirant par un chant nuptial',
    ],
    correct: 0,
  },

  // ── Élan ──
  {
    id: 'elan-1', spId: 'elan',
    q: 'Comment reste-t-il immergé pour brouter au fond des lacs ?',
    answers: [
      'Il obture ses narines par de petits clapets',
      'Il stocke de l’air dans une poche sous la gorge',
      'Il ralentit son cœur comme les phoques',
      'Il remonte respirer à intervalles très courts',
    ],
    correct: 0,
  },
  {
    id: 'elan-2', spId: 'elan',
    q: 'Qu’est-ce qui rend l’élan unique parmi tous les cervidés ?',
    answers: [
      'Il se nourrit la tête entièrement sous l’eau',
      'Il ne perd jamais ses bois',
      'Il vit en grands troupeaux serrés',
      'Il met bas deux fois par an',
    ],
    correct: 0,
  },
  {
    id: 'elan-3', spId: 'elan',
    q: 'En dehors du rut, quel est son mode de vie ?',
    answers: [
      'Plutôt solitaire, sur un petit territoire',
      'En hardes conduites par une femelle',
      'En couples fidèles toute l’année',
      'En groupes de mâles célibataires',
    ],
    correct: 0,
  },
  {
    id: 'elan-4', spId: 'elan',
    q: 'Dans quelle situation devient-il réellement dangereux ?',
    answers: [
      'En période de rut ou pour défendre ses petits',
      'Dès qu’il a faim',
      'Uniquement acculé par des loups',
      'Seulement la nuit',
    ],
    correct: 0,
  },

  // ── Cerf élaphe ──
  {
    id: 'cerf-1', spId: 'cerf',
    q: 'À quoi sert principalement le brame, au-delà d’attirer les femelles ?',
    answers: [
      'À intimider et jauger les mâles rivaux',
      'À prévenir la harde d’un danger',
      'À délimiter les frontières avec les chevreuils',
      'À rassembler les faons dispersés',
    ],
    correct: 0,
  },
  {
    id: 'cerf-2', spId: 'cerf',
    q: 'Qu’ont de remarquable les bois du cerf pendant leur croissance ?',
    answers: [
      'Ils comptent parmi les tissus à pousse la plus rapide',
      'Ils sont creux et remplis d’air',
      'Ils continuent de grandir toute la vie',
      'Ils repoussent identiques chaque année',
    ],
    correct: 0,
  },
  {
    id: 'cerf-3', spId: 'cerf',
    q: 'Que deviennent les bois d’une année sur l’autre ?',
    answers: [
      'Ils tombent puis repoussent entièrement',
      'Ils s’allongent un peu plus chaque année',
      'Ils changent seulement de teinte',
      'Ils ne poussent que les années de reproduction',
    ],
    correct: 0,
  },
  {
    id: 'cerf-4', spId: 'cerf',
    q: 'Comment vivent mâles et femelles hors de la période du rut ?',
    answers: [
      'En hardes séparées selon le sexe',
      'En couples stables',
      'En un seul grand troupeau mixte',
      'Chacun strictement solitaire',
    ],
    correct: 0,
  },
]

export const QUIZ_QUESTIONS = ANIMAL_QUESTIONS.map(q => ({ theme: 'animaux', ...q }))
