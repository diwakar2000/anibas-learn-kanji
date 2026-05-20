import { plain, word } from '../storyFactory.js';

export default [
  {
    id: 'n3-short-before-meeting',
    jlptLevel: 'jlpt-3',
    title: 'Before the Meeting',
    summary: 'A short workplace story about checking numbers before a presentation.',
    tokens: [
      word('会議', 'かいぎ', 'meeting'),
      plain('の'),
      word('前', 'まえ', 'before'),
      plain('に、'),
      word('課長', 'かちょう', 'section manager'),
      plain('から'),
      word('資料', 'しりょう', 'materials; documents'),
      plain('の'),
      word('数字', 'すうじ', 'numbers'),
      plain('を'),
      word('確認する', 'かくにんする', 'confirm; check'),
      plain('よう'),
      word('頼まれた', 'たのまれた', 'was asked'),
      plain('。'),
      word('間違い', 'まちがい', 'mistake'),
      plain('を'),
      word('見つけて', 'みつけて', 'found and'),
      word('直した', 'なおした', 'fixed'),
      plain('ので、'),
      word('発表', 'はっぴょう', 'presentation'),
      plain('は'),
      word('予定通り', 'よていどおり', 'as planned'),
      word('進んだ', 'すすんだ', 'went forward'),
      plain('。')
    ]
  }
];
