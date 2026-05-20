export function plain(text) {
  return { text, studyWord: false };
}

export function word(text, reading, meaning) {
  return {
    text,
    reading,
    meaning,
    examples: [],
    note: '',
    studyWord: true
  };
}
