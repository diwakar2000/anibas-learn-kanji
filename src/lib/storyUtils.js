import { STORY_LENGTHS } from '../data/levels.js';

export function storyText(story) {
  return story?.tokens.map((token) => token.text).join('') || '';
}

export function storyLength(story) {
  return storyText(story).length;
}

export function storyLengthCategory(story) {
  const length = storyLength(story);

  if (length < 100) {
    return STORY_LENGTHS.find((option) => option.id === 'short');
  }

  if (length < 250) {
    return STORY_LENGTHS.find((option) => option.id === 'medium');
  }

  return STORY_LENGTHS.find((option) => option.id === 'long');
}

export function storyLengthLabel(story) {
  const category = storyLengthCategory(story);
  return `${category.label} · ${storyLength(story)} chars`;
}

export function vocabularyForStory(story) {
  const seen = new Set();

  return story.tokens
    .filter(isStudyWord)
    .map((token) => ({ ...token, id: wordId(token) }))
    .filter((token) => {
      if (seen.has(token.id) || !hasKanji(token.text)) {
        return false;
      }

      seen.add(token.id);
      return true;
    });
}

export function storyStatus(story, storyProgressById) {
  const progress = storyProgressById[story.id];

  if (progress?.completed) {
    return 'Complete';
  }

  const viewed = progress?.viewedWords?.length || 0;
  const total = vocabularyForStory(story).length;
  return viewed ? `${viewed}/${total} words` : 'New';
}

export function exampleText(item) {
  return item.parts.map((part) => part.text).join('');
}

export function wordId(token) {
  return `${token.text}-${token.reading}`;
}

export function isStudyWord(token) {
  return Boolean(token?.studyWord && token.meaning);
}

export function hasKanji(text) {
  return /[\u3400-\u4dbf\u4e00-\u9fff]/u.test(text);
}
