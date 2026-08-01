// ═══════════════════════════════════════════════════════════════════
//  PLUDINI — Questions du Quiz · stockées en dur, pas générées à la volée
// ═══════════════════════════════════════════════════════════════════
// Chaque question : un id unique, l'id de l'espèce concernée (pour aller
// chercher une photo dans la galerie), le texte, 4 réponses, l'index de
// la bonne (0-3) et une explication optionnelle affichée après le choix.
// L'ordre des réponses n'est PAS mélangé ici : ça se fait à l'affichage,
// pour que la bonne réponse ne soit jamais figée à une position.
// Texte et réponses sont bilingues ({fr, ru}) pour ces questions de base —
// les questions ajoutées depuis l'éditeur restent en une seule langue
// (simples chaînes), gérées séparément à l'affichage (voir quiz.jsx).

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
    q: { fr:'Comment le lynx capture-t-il ses proies ?', ru:'Как рысь охотится на добычу?' },
    answers: {
      fr: [
        'Il les épuise sur une longue course',
        'Il les approche puis bondit sur une courte distance',
        'Il les rabat vers un congénère embusqué',
        'Il les traque jusqu’à un point d’eau',
      ],
      ru: [
        'Изматывает её долгим преследованием',
        'Подкрадывается и совершает короткий прыжок',
        'Гонит её к затаившемуся сородичу',
        'Преследует её до водопоя',
      ],
    },
    correct: 1,
  },
  {
    id: 'lynx-2', spId: 'lynx',
    q: { fr:'Après avoir tué un ongulé, que fait le lynx de sa proie ?', ru:'Что рысь делает с добычей после того, как убивает копытное животное?' },
    answers: {
      fr: [
        'Il la consomme sur plusieurs jours en y revenant',
        'Il l’emporte en haut d’un arbre',
        'Il la partage avec les autres lynx du secteur',
        'Il n’en mange que le foie et abandonne le reste',
      ],
      ru: [
        'Возвращается к ней и ест несколько дней',
        'Затаскивает её на дерево',
        'Делится ею с другими рысями по соседству',
        'Съедает только печень, а остальное бросает',
      ],
    },
    correct: 0,
  },
  {
    id: 'lynx-3', spId: 'lynx',
    q: { fr:'Quelle nourriture le lynx refuse-t-il systématiquement ?', ru:'От какой пищи рысь всегда отказывается?' },
    answers: {
      fr: [
        'Les oiseaux au sol',
        'La viande déjà en décomposition',
        'Les proies plus petites qu’un lièvre',
        'Les animaux domestiques',
      ],
      ru: [
        'От птиц, пойманных на земле',
        'От уже разложившегося мяса',
        'От добычи мельче зайца',
        'От домашних животных',
      ],
    },
    correct: 1,
  },
  {
    id: 'lynx-4', spId: 'lynx',
    q: { fr:'Comment un lynx signale-t-il sa présence à ses congénères ?', ru:'Как рысь даёт знать сородичам о своём присутствии?' },
    answers: {
      fr: [
        'Par des marques d’urine et des griffades',
        'Par des hurlements portant à plusieurs kilomètres',
        'En laissant ses proies bien en évidence',
        'Par des passages boueux qu’il entretient',
      ],
      ru: [
        'Метками мочи и царапинами на коре',
        'Воем, слышным за несколько километров',
        'Оставляя добычу на видном месте',
        'Протаптывая грязевые тропы',
      ],
    },
    correct: 0,
  },

  // ── Renard roux ──
  {
    id: 'renard-1', spId: 'renard',
    q: { fr:'Quand il bondit sur une proie cachée sous la neige, qu’a-t-on remarqué sur ses sauts ?', ru:'Когда лиса прыгает на добычу под снегом, что заметили в её прыжках?' },
    answers: {
      fr: [
        'Il bondit toujours face au vent',
        'Il les oriente selon le nord-est magnétique',
        'Il vise dans la direction du soleil',
        'Il alterne régulièrement gauche et droite',
      ],
      ru: [
        'Она всегда прыгает против ветра',
        'Она ориентируется по северо-восточному направлению магнитного поля',
        'Она целится в сторону солнца',
        'Она чередует прыжки влево и вправо',
      ],
    },
    correct: 1,
  },
  {
    id: 'renard-2', spId: 'renard',
    q: { fr:'Sa manière de chasser rappelle celle de quel animal, alors qu’il n’en est pas un ?', ru:'Манера охоты лисы напоминает какое животное, хотя она им не является?' },
    answers: {
      fr: [
        'Le chat, à l’affût et par bonds',
        'Le loup, en poursuite endurante',
        'La loutre, en fouillant sous l’eau',
        'Le blaireau, en creusant ses proies',
      ],
      ru: [
        'Кошку — из засады, прыжками',
        'Волка — в упорном преследовании',
        'Выдру — роясь под водой',
        'Барсука — раскапывая добычу',
      ],
    },
    correct: 0,
  },
  {
    id: 'renard-3', spId: 'renard',
    q: { fr:'Quelle part importante et discrète de son régime surprend souvent ?', ru:'Какая значительная, но малозаметная часть её рациона часто удивляет?' },
    answers: {
      fr: [
        'Les vers de terre',
        'Les poissons de rivière',
        'Les jeunes faons',
        'Les champignons',
      ],
      ru: [
        'Дождевые черви',
        'Речная рыба',
        'Молодые оленята',
        'Грибы',
      ],
    },
    correct: 0,
  },
  {
    id: 'renard-4', spId: 'renard',
    q: { fr:'Comment s’organise parfois l’élevage d’une portée de renardeaux ?', ru:'Как иногда организовано воспитание выводка лисят?' },
    answers: {
      fr: [
        'Des femelles subordonnées aident le couple',
        'Les mâles se relaient sur une même portée',
        'Plusieurs femelles rassemblent leurs petits',
        'Les jeunes sont confiés à un terrier commun',
      ],
      ru: [
        'Подчинённые самки помогают паре',
        'Самцы по очереди заботятся об одном выводке',
        'Несколько самок объединяют своих детёнышей',
        'Детёнышей доверяют общей норе',
      ],
    },
    correct: 0,
  },

  // ── Chevreuil ──
  {
    id: 'chevreuil-1', spId: 'chevreuil',
    q: { fr:'Qu’a de particulier sa gestation, rare chez les mammifères ?', ru:'Что особенного, редкого для млекопитающих, в её беременности?' },
    answers: {
      fr: [
        'L’embryon suspend son développement plusieurs mois',
        'La femelle porte deux portées décalées à la fois',
        'La gestation dépend de la température extérieure',
        'Le mâle couve la portée après la naissance',
      ],
      ru: [
        'Развитие эмбриона приостанавливается на несколько месяцев',
        'Самка вынашивает два смещённых по срокам помёта одновременно',
        'Срок беременности зависит от температуры воздуха',
        'Самец высиживает потомство после рождения',
      ],
    },
    correct: 0,
  },
  {
    id: 'chevreuil-2', spId: 'chevreuil',
    q: { fr:'Le rut a lieu en été : quand naissent les faons, et pourquoi ?', ru:'Гон проходит летом: когда рождаются оленята и почему?' },
    answers: {
      fr: [
        'Au printemps suivant, quand la nourriture abonde',
        'À l’automne, avant les premiers froids',
        'Quelques semaines après le rut',
        'En plein hiver, pour endurcir les petits',
      ],
      ru: [
        'Следующей весной, когда много корма',
        'Осенью, до первых холодов',
        'Через несколько недель после гона',
        'Посреди зимы, чтобы закалить детёнышей',
      ],
    },
    correct: 0,
  },
  {
    id: 'chevreuil-3', spId: 'chevreuil',
    q: { fr:'Ce cri sec entendu parfois en forêt, c’est lui : à quoi ressemble-t-il ?', ru:'Этот резкий крик, который иногда слышен в лесу, — это она: на что он похож?' },
    answers: {
      fr: [
        'Un aboiement bref et rauque',
        'Un sifflement aigu prolongé',
        'Un feulement grave',
        'Un barrissement court',
      ],
      ru: [
        'Короткий хриплый лай',
        'Протяжный пронзительный свист',
        'Низкое шипение',
        'Короткий трубный рёв',
      ],
    },
    correct: 0,
  },
  {
    id: 'chevreuil-4', spId: 'chevreuil',
    q: { fr:'Comment le brocard poursuit-il la femelle avant l’accouplement ?', ru:'Как самец косули преследует самку перед спариванием?' },
    answers: {
      fr: [
        'En traçant des cercles répétés au sol',
        'En la rabattant vers son territoire',
        'En la suivant en ligne droite sur des kilomètres',
        'En l’attirant par un chant nuptial',
      ],
      ru: [
        'Описывая на земле повторяющиеся круги',
        'Загоняя её на свою территорию',
        'Следуя за ней по прямой на километры',
        'Привлекая её брачной песней',
      ],
    },
    correct: 0,
  },

  // ── Élan ──
  {
    id: 'elan-1', spId: 'elan',
    q: { fr:'Comment reste-t-il immergé pour brouter au fond des lacs ?', ru:'Как он остаётся под водой, чтобы кормиться на дне озёр?' },
    answers: {
      fr: [
        'Il obture ses narines par de petits clapets',
        'Il stocke de l’air dans une poche sous la gorge',
        'Il ralentit son cœur comme les phoques',
        'Il remonte respirer à intervalles très courts',
      ],
      ru: [
        'Закрывает ноздри маленькими клапанами',
        'Запасает воздух в мешке под горлом',
        'Замедляет сердцебиение, как тюлени',
        'Всплывает подышать через очень короткие промежутки',
      ],
    },
    correct: 0,
  },
  {
    id: 'elan-2', spId: 'elan',
    q: { fr:'Qu’est-ce qui rend l’élan unique parmi tous les cervidés ?', ru:'Что делает лося уникальным среди всех оленевых?' },
    answers: {
      fr: [
        'Il se nourrit la tête entièrement sous l’eau',
        'Il ne perd jamais ses bois',
        'Il vit en grands troupeaux serrés',
        'Il met bas deux fois par an',
      ],
      ru: [
        'Кормится, полностью погружая голову под воду',
        'Никогда не сбрасывает рога',
        'Живёт большими плотными стадами',
        'Телится дважды в год',
      ],
    },
    correct: 0,
  },
  {
    id: 'elan-3', spId: 'elan',
    q: { fr:'En dehors du rut, quel est son mode de vie ?', ru:'Каков его образ жизни вне периода гона?' },
    answers: {
      fr: [
        'Plutôt solitaire, sur un petit territoire',
        'En hardes conduites par une femelle',
        'En couples fidèles toute l’année',
        'En groupes de mâles célibataires',
      ],
      ru: [
        'Скорее одиночный, на небольшой территории',
        'В стадах, возглавляемых самкой',
        'В верных парах круглый год',
        'В группах самцов-холостяков',
      ],
    },
    correct: 0,
  },
  {
    id: 'elan-4', spId: 'elan',
    q: { fr:'Dans quelle situation devient-il réellement dangereux ?', ru:'В какой ситуации он становится по-настоящему опасным?' },
    answers: {
      fr: [
        'En période de rut ou pour défendre ses petits',
        'Dès qu’il a faim',
        'Uniquement acculé par des loups',
        'Seulement la nuit',
      ],
      ru: [
        'В период гона или защищая потомство',
        'Как только проголодается',
        'Только загнанный волками в тупик',
        'Только ночью',
      ],
    },
    correct: 0,
  },

  // ── Cerf élaphe ──
  {
    id: 'cerf-1', spId: 'cerf',
    q: { fr:'À quoi sert principalement le brame, au-delà d’attirer les femelles ?', ru:'Для чего в первую очередь служит рёв оленя, помимо привлечения самок?' },
    answers: {
      fr: [
        'À intimider et jauger les mâles rivaux',
        'À prévenir la harde d’un danger',
        'À délimiter les frontières avec les chevreuils',
        'À rassembler les faons dispersés',
      ],
      ru: [
        'Чтобы запугать соперников и оценить их силы',
        'Чтобы предупредить стадо об опасности',
        'Чтобы обозначить границы с косулями',
        'Чтобы собрать разбежавшихся оленят',
      ],
    },
    correct: 0,
  },
  {
    id: 'cerf-2', spId: 'cerf',
    q: { fr:'Qu’ont de remarquable les bois du cerf pendant leur croissance ?', ru:'Что примечательного в рогах оленя во время их роста?' },
    answers: {
      fr: [
        'Ils comptent parmi les tissus à pousse la plus rapide',
        'Ils sont creux et remplis d’air',
        'Ils continuent de grandir toute la vie',
        'Ils repoussent identiques chaque année',
      ],
      ru: [
        'Это одна из самых быстрорастущих тканей в природе',
        'Они полые и наполнены воздухом',
        'Они растут всю жизнь, не переставая',
        'Они отрастают каждый год одинаковыми',
      ],
    },
    correct: 0,
  },
  {
    id: 'cerf-3', spId: 'cerf',
    q: { fr:'Que deviennent les bois d’une année sur l’autre ?', ru:'Что происходит с рогами из года в год?' },
    answers: {
      fr: [
        'Ils tombent puis repoussent entièrement',
        'Ils s’allongent un peu plus chaque année',
        'Ils changent seulement de teinte',
        'Ils ne poussent que les années de reproduction',
      ],
      ru: [
        'Они опадают и отрастают заново полностью',
        'Они немного удлиняются каждый год',
        'Меняется только их оттенок',
        'Они растут только в годы размножения',
      ],
    },
    correct: 0,
  },
  {
    id: 'cerf-4', spId: 'cerf',
    q: { fr:'Comment vivent mâles et femelles hors de la période du rut ?', ru:'Как живут самцы и самки вне периода гона?' },
    answers: {
      fr: [
        'En hardes séparées selon le sexe',
        'En couples stables',
        'En un seul grand troupeau mixte',
        'Chacun strictement solitaire',
      ],
      ru: [
        'Раздельными стадами по полу',
        'Устойчивыми парами',
        'Одним большим смешанным стадом',
        'Каждый строго в одиночку',
      ],
    },
    correct: 0,
  },
]

export const QUIZ_QUESTIONS = ANIMAL_QUESTIONS.map(q => ({ theme: 'animaux', ...q }))
