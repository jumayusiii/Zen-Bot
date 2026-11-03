const QUESTIONS = Object.freeze([
  {
    category: 'Science',
    question: 'Which planet is known as the Red Planet?',
    options: ['Mars', 'Venus', 'Jupiter', 'Mercury'],
    answer: 0,
  },
  {
    category: 'Technology',
    question: 'What does HTTP stand for?',
    options: [
      'HyperText Transfer Protocol',
      'High Transfer Text Process',
      'Hyperlink Transfer Protocol',
      'Host Transfer Protocol',
    ],
    answer: 0,
  },
  {
    category: 'Geography',
    question: 'How many continents are commonly recognized?',
    options: ['5', '6', '7', '8'],
    answer: 2,
  },
  {
    category: 'Technology',
    question: 'Which language runs natively in a web browser?',
    options: ['JavaScript', 'Python', 'C#', 'Java'],
    answer: 0,
  },
  {
    category: 'Geography',
    question: 'Which is the largest ocean on Earth?',
    options: ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'],
    answer: 0,
  },
  {
    category: 'History',
    question: 'In which year did humans first land on the Moon?',
    options: ['1959', '1969', '1979', '1989'],
    answer: 1,
  },
  {
    category: 'Technology',
    question: 'What does CPU stand for?',
    options: [
      'Central Processing Unit',
      'Computer Personal Unit',
      'Central Program Utility',
      'Control Processing User',
    ],
    answer: 0,
  },
  {
    category: 'Geography',
    question: 'What is the capital of Japan?',
    options: ['Kyoto', 'Tokyo', 'Osaka', 'Sapporo'],
    answer: 1,
  },
  {
    category: 'Science',
    question: 'Which element has the chemical symbol O?',
    options: ['Hydrogen', 'Carbon', 'Oxygen', 'Nitrogen'],
    answer: 2,
  },
  {
    category: 'Math',
    question: 'How many sides does a hexagon have?',
    options: ['5', '6', '7', '8'],
    answer: 1,
  },
  {
    category: 'Math',
    question: 'Which of these is a prime number?',
    options: ['17', '21', '27', '33'],
    answer: 0,
  },
  {
    category: 'Gaming',
    question: 'In which year was Discord publicly released?',
    options: ['2013', '2014', '2015', '2016'],
    answer: 2,
  },
  {
    category: 'Technology',
    question: 'Which command lists files in a Unix shell?',
    options: ['ls', 'cd', 'rm', 'pwd'],
    answer: 0,
  },
  {
    category: 'Technology',
    question: 'What does CSS stand for?',
    options: [
      'Cascading Style Sheets',
      'Computer Style Syntax',
      'Creative Style System',
      'Colorful Style Sheets',
    ],
    answer: 0,
  },
  {
    category: 'Geography',
    question: 'The ancient city of Petra is in which country?',
    options: ['Egypt', 'Jordan', 'Greece', 'Turkey'],
    answer: 1,
  },
  {
    category: 'Science',
    question: 'What is the largest mammal on Earth?',
    options: ['Blue whale', 'African elephant', 'Giraffe', 'Orca'],
    answer: 0,
  },
  {
    category: 'Technology',
    question: 'What is the binary representation of decimal 5?',
    options: ['101', '110', '111', '100'],
    answer: 0,
  },
  {
    category: 'Gaming',
    question: 'In chess, which piece moves in an L-shape?',
    options: ['Knight', 'Bishop', 'Rook', 'Queen'],
    answer: 0,
  },
  {
    category: 'Science',
    question: 'Which gas do plants absorb from the atmosphere?',
    options: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'],
    answer: 0,
  },
  {
    category: 'Science',
    question: 'What is the chemical formula for water?',
    options: ['H2O', 'CO2', 'O2', 'NaCl'],
    answer: 0,
  },
  {
    category: 'Science',
    question: 'Which is the largest planet in our solar system?',
    options: ['Saturn', 'Jupiter', 'Neptune', 'Earth'],
    answer: 1,
  },
]);

const QUESTIONS_DE = Object.freeze([
  {
    category: 'Wissenschaft',
    question: 'Welcher Planet ist als Roter Planet bekannt?',
    options: ['Mars', 'Venus', 'Jupiter', 'Merkur'],
    answer: 0,
  },
  {
    category: 'Technologie',
    question: 'Wofür steht HTTP?',
    options: [
      'HyperText Transfer Protocol',
      'High Transfer Text Process',
      'Hyperlink Transfer Protocol',
      'Host Transfer Protocol',
    ],
    answer: 0,
  },
  {
    category: 'Geografie',
    question: 'Wie viele Kontinente werden üblicherweise anerkannt?',
    options: ['5', '6', '7', '8'],
    answer: 2,
  },
  {
    category: 'Technologie',
    question: 'Welche Sprache läuft nativ in einem Webbrowser?',
    options: ['JavaScript', 'Python', 'C#', 'Java'],
    answer: 0,
  },
  {
    category: 'Geografie',
    question: 'Welcher ist der größte Ozean der Erde?',
    options: ['Pazifik', 'Atlantik', 'Indischer Ozean', 'Arktischer Ozean'],
    answer: 0,
  },
  {
    category: 'Geschichte',
    question: 'In welchem Jahr landeten Menschen erstmals auf dem Mond?',
    options: ['1959', '1969', '1979', '1989'],
    answer: 1,
  },
  {
    category: 'Technologie',
    question: 'Wofür steht CPU?',
    options: [
      'Central Processing Unit',
      'Computer Personal Unit',
      'Central Program Utility',
      'Control Processing User',
    ],
    answer: 0,
  },
  {
    category: 'Geografie',
    question: 'Was ist die Hauptstadt von Japan?',
    options: ['Kyoto', 'Tokio', 'Osaka', 'Sapporo'],
    answer: 1,
  },
  {
    category: 'Wissenschaft',
    question: 'Welches Element hat das chemische Symbol O?',
    options: ['Wasserstoff', 'Kohlenstoff', 'Sauerstoff', 'Stickstoff'],
    answer: 2,
  },
  {
    category: 'Mathematik',
    question: 'Wie viele Seiten hat ein Sechseck?',
    options: ['5', '6', '7', '8'],
    answer: 1,
  },
  {
    category: 'Mathematik',
    question: 'Welche dieser Zahlen ist eine Primzahl?',
    options: ['17', '21', '27', '33'],
    answer: 0,
  },
  {
    category: 'Gaming',
    question: 'In welchem Jahr wurde Discord öffentlich veröffentlicht?',
    options: ['2013', '2014', '2015', '2016'],
    answer: 2,
  },
  {
    category: 'Technologie',
    question: 'Welcher Befehl listet Dateien in einer Unix-Shell?',
    options: ['ls', 'cd', 'rm', 'pwd'],
    answer: 0,
  },
  {
    category: 'Technologie',
    question: 'Wofür steht CSS?',
    options: [
      'Cascading Style Sheets',
      'Computer Style Syntax',
      'Creative Style System',
      'Colorful Style Sheets',
    ],
    answer: 0,
  },
  {
    category: 'Geografie',
    question: 'Die antike Stadt Petra liegt in welchem Land?',
    options: ['Ägypten', 'Jordanien', 'Griechenland', 'Türkei'],
    answer: 1,
  },
  {
    category: 'Wissenschaft',
    question: 'Was ist das größte Säugetier der Erde?',
    options: ['Blauwal', 'Afrikanischer Elefant', 'Giraffe', 'Orca'],
    answer: 0,
  },
  {
    category: 'Technologie',
    question: 'Wie lautet die Binärdarstellung von dezimal 5?',
    options: ['101', '110', '111', '100'],
    answer: 0,
  },
  {
    category: 'Gaming',
    question: 'Welche Figur zieht im Schach in L-Form?',
    options: ['Springer', 'Läufer', 'Turm', 'Dame'],
    answer: 0,
  },
  {
    category: 'Wissenschaft',
    question: 'Welches Gas nehmen Pflanzen aus der Atmosphäre auf?',
    options: ['Kohlendioxid', 'Sauerstoff', 'Stickstoff', 'Wasserstoff'],
    answer: 0,
  },
  {
    category: 'Wissenschaft',
    question: 'Wie lautet die chemische Formel für Wasser?',
    options: ['H2O', 'CO2', 'O2', 'NaCl'],
    answer: 0,
  },
  {
    category: 'Wissenschaft',
    question: 'Welcher ist der größte Planet unseres Sonnensystems?',
    options: ['Saturn', 'Jupiter', 'Neptun', 'Erde'],
    answer: 1,
  },
]);

/**
 * @param {() => number} [random]
 * @param {string[]} [exclude] Questions that should not be picked, e.g. the previous round
 * @returns {{category: string, question: string, options: string[], answer: number}}
 */
function randomQuestion(random = Math.random, exclude = [], language = 'en') {
  const questions = String(language ?? '').toLowerCase().startsWith('de')
    ? QUESTIONS_DE
    : QUESTIONS;
  const skipped = new Set(exclude);
  const pool = questions.filter((question) => !skipped.has(question.question));
  const source = pool.length > 0 ? pool : questions;
  const index = Math.min(source.length - 1, Math.floor(random() * source.length));
  return { ...source[index], options: [...source[index].options] };
}

module.exports = { QUESTIONS, QUESTIONS_DE, randomQuestion };
