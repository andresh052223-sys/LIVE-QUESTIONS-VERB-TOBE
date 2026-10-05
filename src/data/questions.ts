import { Question } from '../types/game';

export const QUESTIONS_BANK: Question[] = [
  // ==========================================
  // CATEGORY 1: TO BE (Affirmative, Negative, Contractions) - 20 Questions
  // ==========================================
  {
    id: 'tb-01',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'She ___ a student.',
    options: ['am', 'is', 'are', 'be'],
    correctIndex: 1,
    explanation: 'Con el pronombre "She" usamos la forma "is" en presente simple.',
    difficulty: 'easy'
  },
  {
    id: 'tb-02',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'I ___ very happy to meet you.',
    options: ['are', 'is', 'am', 'be'],
    correctIndex: 2,
    explanation: 'Con el pronombre "I" siempre usamos la forma "am".',
    difficulty: 'easy'
  },
  {
    id: 'tb-03',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'They ___ at the university library today.',
    options: ['is', 'are', 'am', 'be'],
    correctIndex: 1,
    explanation: 'Con sujetos en plural como "They", usamos "are".',
    difficulty: 'easy'
  },
  {
    id: 'tb-04',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'Carlos and Maria ___ excellent engineers.',
    options: ['is', 'am', 'are', 'be'],
    correctIndex: 2,
    explanation: 'Carlos y María forman un sujeto plural (They), por lo tanto corresponde "are".',
    difficulty: 'easy'
  },
  {
    id: 'tb-05',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'It ___ a beautiful sunny morning.',
    options: ['are', 'is', 'am', 'be'],
    correctIndex: 1,
    explanation: 'Para objetos, animales o el clima con "It", se usa "is".',
    difficulty: 'easy'
  },
  {
    id: 'tb-06',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'We ___ ready for the English challenge!',
    options: ['am', 'is', 'are', 'be'],
    correctIndex: 2,
    explanation: '"We" es la primera persona del plural y se conjuga con "are".',
    difficulty: 'easy'
  },
  {
    id: 'tb-07',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'My brother ___ at home right now; he is at work.',
    options: ["isn't", "aren't", "am not", "not is"],
    correctIndex: 0,
    explanation: '"My brother" es tercera persona singular (he), la forma negativa es "isn\'t".',
    difficulty: 'easy'
  },
  {
    id: 'tb-08',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'You and I ___ best friends.',
    options: ['am', 'is', 'are', 'be'],
    correctIndex: 2,
    explanation: '"You and I" equivale al pronombre "We" (nosotros), por lo que se usa "are".',
    difficulty: 'medium'
  },
  {
    id: 'tb-09',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'The classroom ___ cold in the mornings.',
    options: ['are', 'is', 'am', 'be'],
    correctIndex: 1,
    explanation: '"The classroom" es un sustantivo singular (it), por lo que lleva "is".',
    difficulty: 'easy'
  },
  {
    id: 'tb-10',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'I ___ an apprentice at SENA.',
    options: ['is', 'are', 'am', 'be'],
    correctIndex: 2,
    explanation: 'La primera persona "I" se conjuga con "am": "I am an apprentice".',
    difficulty: 'easy'
  },
  {
    id: 'tb-11',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'The new computers ___ in the tech lab.',
    options: ['is', 'am', 'are', 'be'],
    correctIndex: 2,
    explanation: '"Computers" es un sustantivo plural (they), por eso usamos "are".',
    difficulty: 'easy'
  },
  {
    id: 'tb-12',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'Which sentence has the correct contraction?',
    options: ["She's an architect.", "She're an architect.", "She'm an architect.", "She'be an architect."],
    correctIndex: 0,
    explanation: 'La contracción de "She is" es "She\'s".',
    difficulty: 'easy'
  },
  {
    id: 'tb-13',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'The students ___ tired after the long exam.',
    options: ["isn't", "aren't", "are", "am"],
    correctIndex: 2,
    explanation: '"The students" es plural, la forma afirmativa adecuada es "are".',
    difficulty: 'easy'
  },
  {
    id: 'tb-14',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'Complete the negative: "I ___ a doctor, I am a nurse."',
    options: ["am not", "aren't", "isn't", "not am"],
    correctIndex: 0,
    explanation: 'La forma negativa de "I am" es "I am not" (o "I\'m not").',
    difficulty: 'easy'
  },
  {
    id: 'tb-15',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'My parents ___ from Medellin, Colombia.',
    options: ['is', 'are', 'am', 'be'],
    correctIndex: 1,
    explanation: '"My parents" equivale a "They", por lo que corresponde "are".',
    difficulty: 'easy'
  },
  {
    id: 'tb-16',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'David ___ twenty years old.',
    options: ['have', 'has', 'is', 'are'],
    correctIndex: 2,
    explanation: '¡En inglés la edad se expresa con el verbo TO BE, no con "have"!',
    difficulty: 'medium'
  },
  {
    id: 'tb-17',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'We ___ late; we arrived exactly on time.',
    options: ["aren't", "isn't", "am not", "not are"],
    correctIndex: 0,
    explanation: 'La negación para "We" es "aren\'t" ("are not").',
    difficulty: 'easy'
  },
  {
    id: 'tb-18',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'This coffee ___ really delicious.',
    options: ['are', 'is', 'am', 'be'],
    correctIndex: 1,
    explanation: '"This coffee" es singular incontable (It), por lo que requiere "is".',
    difficulty: 'easy'
  },
  {
    id: 'tb-19',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'They ___ in the office; they are working from home.',
    options: ["aren't", "isn't", "am not", "not are"],
    correctIndex: 0,
    explanation: '"They aren\'t in the office" es la forma negativa plural correcta.',
    difficulty: 'easy'
  },
  {
    id: 'tb-20',
    category: 'to_be',
    categoryLabel: 'Verb TO BE',
    question: 'English and French ___ global languages.',
    options: ['is', 'are', 'am', 'be'],
    correctIndex: 1,
    explanation: 'Dos idiomas juntos forman un sujeto compuesto plural: "are".',
    difficulty: 'easy'
  },

  // ==========================================
  // CATEGORY 2: YES / NO QUESTIONS - 16 Questions
  // ==========================================
  {
    id: 'yn-01',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: 'Is he a chef?',
    options: ['Yes, he is.', 'Yes, he are.', 'No, he am.', 'No, he are.'],
    correctIndex: 0,
    explanation: 'Para "he", la respuesta corta afirmativa correcta es "Yes, he is."',
    difficulty: 'easy'
  },
  {
    id: 'yn-02',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: 'Are you from Colombia?',
    options: ['Yes, you are.', 'Yes, I am.', 'Yes, I is.', 'No, you aren\'t.'],
    correctIndex: 1,
    explanation: 'Cuando te preguntan "Are you...?", respondes en primera persona: "Yes, I am."',
    difficulty: 'easy'
  },
  {
    id: 'yn-03',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: '___ she your English instructor?',
    options: ['Are', 'Is', 'Am', 'Be'],
    correctIndex: 1,
    explanation: 'Para preguntas con "she" colocamos "Is" al inicio de la oración.',
    difficulty: 'easy'
  },
  {
    id: 'yn-04',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: 'Are they ready for the presentation?',
    options: ['No, they isn\'t.', 'No, they aren\'t.', 'No, they not are.', 'Yes, they is.'],
    correctIndex: 1,
    explanation: 'La respuesta corta negativa para "they" es "No, they aren\'t."',
    difficulty: 'easy'
  },
  {
    id: 'yn-05',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: '___ the meeting at 10:00 AM?',
    options: ['Are', 'Is', 'Am', 'Do'],
    correctIndex: 1,
    explanation: '"The meeting" es singular (it), por tanto la pregunta inicia con "Is".',
    difficulty: 'easy'
  },
  {
    id: 'yn-06',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: 'Is your computer new?',
    options: ['Yes, it is.', 'Yes, it are.', 'No, it aren\'t.', 'Yes, they are.'],
    correctIndex: 0,
    explanation: '"Your computer" es una cosa singular (it): "Yes, it is."',
    difficulty: 'easy'
  },
  {
    id: 'yn-07',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: 'Are we in the correct classroom?',
    options: ['Yes, we is.', 'Yes, we are.', 'No, we isn\'t.', 'Yes, you am.'],
    correctIndex: 1,
    explanation: 'Con "we" la respuesta afirmativa es "Yes, we are."',
    difficulty: 'easy'
  },
  {
    id: 'yn-08',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: '___ I on the attendance list?',
    options: ['Am', 'Are', 'Is', 'Be'],
    correctIndex: 0,
    explanation: 'Para preguntar con "I", invertimos: "Am I on the list?"',
    difficulty: 'easy'
  },
  {
    id: 'yn-09',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: 'Is Sofia an apprentice?',
    options: ['Yes, she is.', 'Yes, she are.', 'No, she am not.', 'Yes, he is.'],
    correctIndex: 0,
    explanation: 'Sofia es un nombre femenino singular (she): "Yes, she is."',
    difficulty: 'easy'
  },
  {
    id: 'yn-10',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: 'Are the documents on the desk?',
    options: ['No, it isn\'t.', 'No, they aren\'t.', 'Yes, it is.', 'No, they not.'],
    correctIndex: 1,
    explanation: '"The documents" es plural (they), por eso usamos "No, they aren\'t."',
    difficulty: 'easy'
  },
  {
    id: 'yn-11',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: '___ you thirsty?',
    options: ['Is', 'Am', 'Are', 'Be'],
    correctIndex: 2,
    explanation: 'Con la segunda persona "you", la pregunta comienza con "Are you...?"',
    difficulty: 'easy'
  },
  {
    id: 'yn-12',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: 'Is it cold outside today?',
    options: ['No, it isn\'t.', 'No, it aren\'t.', 'No, it am not.', 'Yes, he is.'],
    correctIndex: 0,
    explanation: 'Respuesta negativa corta con "it": "No, it isn\'t."',
    difficulty: 'easy'
  },
  {
    id: 'yn-13',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: 'Are you and Camilo classmates?',
    options: ['Yes, I am.', 'Yes, we are.', 'Yes, they are.', 'No, he isn\'t.'],
    correctIndex: 1,
    explanation: '"You and Camilo" = ustedes. Al responder los dos dicen "Yes, we are."',
    difficulty: 'medium'
  },
  {
    id: 'yn-14',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: '___ your parents at home right now?',
    options: ['Is', 'Are', 'Am', 'Do'],
    correctIndex: 1,
    explanation: '"Your parents" es plural (they), requiere "Are your parents...?"',
    difficulty: 'easy'
  },
  {
    id: 'yn-15',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: 'Is this your first English course?',
    options: ['Yes, it is.', 'Yes, this is.', 'Yes, I are.', 'No, it not is.'],
    correctIndex: 0,
    explanation: 'Para preguntas sobre cosas singulares ("this course"), el pronombre en respuesta es "it": "Yes, it is."',
    difficulty: 'easy'
  },
  {
    id: 'yn-16',
    category: 'yes_no',
    categoryLabel: 'Yes / No Questions',
    question: 'Are they from Canada?',
    options: ['Yes, they are.', 'Yes, they is.', 'No, they am not.', 'Yes, we is.'],
    correctIndex: 0,
    explanation: 'La respuesta afirmativa corta correcta para "they" es "Yes, they are."',
    difficulty: 'easy'
  },

  // ==========================================
  // CATEGORY 3: WH QUESTIONS - 16 Questions
  // ==========================================
  {
    id: 'wh-01',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: 'Where ___ you from?',
    options: ['am', 'is', 'are', 'be'],
    correctIndex: 2,
    explanation: 'Con el sujeto "you", la pregunta con WH lleva "are": "Where are you from?"',
    difficulty: 'easy'
  },
  {
    id: 'wh-02',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: 'What ___ your name?',
    options: ['are', 'is', 'am', 'be'],
    correctIndex: 1,
    explanation: '"Your name" es tercera persona singular (it), por tanto se usa "is".',
    difficulty: 'easy'
  },
  {
    id: 'wh-03',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: 'Who ___ your English teacher?',
    options: ['am', 'is', 'are', 'be'],
    correctIndex: 1,
    explanation: '"Your teacher" es una persona singular (he/she), por eso usamos "is".',
    difficulty: 'easy'
  },
  {
    id: 'wh-04',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: 'How ___ you today?',
    options: ['is', 'are', 'am', 'be'],
    correctIndex: 1,
    explanation: 'El saludo común es "How are you today?" usando "are" con "you".',
    difficulty: 'easy'
  },
  {
    id: 'wh-05',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: 'What ___ your job?',
    options: ['am', 'are', 'is', 'be'],
    correctIndex: 2,
    explanation: '"Your job" es singular (it), por lo que se formula con "is": "What is your job?"',
    difficulty: 'easy'
  },
  {
    id: 'wh-06',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: 'Where ___ the keys?',
    options: ['is', 'are', 'am', 'be'],
    correctIndex: 1,
    explanation: '"The keys" es un sustantivo plural, por lo que usamos "are": "Where are the keys?"',
    difficulty: 'easy'
  },
  {
    id: 'wh-07',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: 'Why ___ you late to class?',
    options: ['is', 'am', 'are', 'be'],
    correctIndex: 2,
    explanation: 'Pregunta con "Why" y sujeto "you": "Why are you late?"',
    difficulty: 'easy'
  },
  {
    id: 'wh-08',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: 'When ___ the final English presentation?',
    options: ['are', 'is', 'am', 'be'],
    correctIndex: 1,
    explanation: '"The presentation" es un evento singular: "When is the presentation?"',
    difficulty: 'easy'
  },
  {
    id: 'wh-09',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: 'How old ___ they?',
    options: ['is', 'are', 'am', 'have'],
    correctIndex: 1,
    explanation: 'Para preguntar la edad de "they", usamos "How old are they?"',
    difficulty: 'medium'
  },
  {
    id: 'wh-10',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: '___ is that girl near the door? - She is Laura.',
    options: ['What', 'Where', 'Who', 'When'],
    correctIndex: 2,
    explanation: 'Usamos "Who" para preguntar por la identidad de una persona.',
    difficulty: 'easy'
  },
  {
    id: 'wh-11',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: '___ is the library? - It is on the second floor.',
    options: ['Where', 'Who', 'What', 'Why'],
    correctIndex: 0,
    explanation: 'Usamos "Where" para preguntar por un lugar o ubicación.',
    difficulty: 'easy'
  },
  {
    id: 'wh-12',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: '___ is your favorite color? - Blue!',
    options: ['Who', 'What', 'Where', 'Why'],
    correctIndex: 1,
    explanation: 'Usamos "What" para preguntar por información o preferencias.',
    difficulty: 'easy'
  },
  {
    id: 'wh-13',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: 'Where ___ Bogotá located?',
    options: ['are', 'am', 'is', 'be'],
    correctIndex: 2,
    explanation: 'Bogotá es una ciudad singular: "Where is Bogotá located?"',
    difficulty: 'easy'
  },
  {
    id: 'wh-14',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: '___ are those people? - They are our new apprentices.',
    options: ['Who', 'Where', 'When', 'Why'],
    correctIndex: 0,
    explanation: '"Who are those people?" pregunta por la identidad de varias personas.',
    difficulty: 'easy'
  },
  {
    id: 'wh-15',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: 'Why ___ the instructor happy?',
    options: ['am', 'are', 'is', 'be'],
    correctIndex: 2,
    explanation: '"The instructor" es tercera persona singular (he/she): "Why is the instructor happy?"',
    difficulty: 'easy'
  },
  {
    id: 'wh-16',
    category: 'wh_questions',
    categoryLabel: 'WH Questions',
    question: 'What time ___ it right now?',
    options: ['are', 'is', 'am', 'be'],
    correctIndex: 1,
    explanation: 'La pregunta clásica de la hora en inglés es: "What time is it?"',
    difficulty: 'easy'
  }
];

export const DEMO_LEARNERS = [
  { name: 'Andrea Gómez', ficha: '2718290' },
  { name: 'Juan Carlos Pérez', ficha: '2718290' },
  { name: 'Carlos Mendoza', ficha: '2718291' },
  { name: 'María Fernanda Ríos', ficha: '2718290' },
  { name: 'Valentina Castro', ficha: '2718292' },
  { name: 'David Santiago Morales', ficha: '2718291' },
  { name: 'Sofía Ramirez', ficha: '2718290' },
  { name: 'Camilo Andrés Torres', ficha: '2718292' },
  { name: 'Laura Restrepo', ficha: '2718291' },
  { name: 'Daniel Duque', ficha: '2718290' }
];
