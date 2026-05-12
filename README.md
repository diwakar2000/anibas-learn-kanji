# JLPT Story Kanji

A Svelte single-page JLPT kanji reader powered by [kanjiapi.dev](https://kanjiapi.dev/#!/documentation).

## Features

- Story Mode is the primary flow for `jlpt-5` through `jlpt-1`.
- Stories are hardcoded as word tokens, not just raw text, so kanji compounds and verb forms can carry their own reading and meaning.
- Clicking a story first opens the vocabulary preview for that story.
- Stories are categorized as Short under 100 Japanese characters, Medium from 100 to 249, and Long at 250 or more.
- Each vocabulary word has furigana, English meaning, and contextual example sentences with furigana.
- Readers can jump to the full story at any time.
- The story reader shows furigana directly above kanji words and opens a meaning/examples panel when a word is clicked.
- Story Mode includes Japanese pronunciation playback for full stories, individual words, and example sentences via the browser Web Speech API with `ja-JP`.
- Story reading progress is saved in IndexedDB.
- Kanji Drill remains as a secondary ten-kanji practice mode powered by KanjiAPI.

## Run

```sh
npm install
npm run dev
```

Then open the local Vite URL, usually `http://127.0.0.1:5173/`.

## API Use

Story Mode uses hardcoded word-level story data. Kanji Drill uses these KanjiAPI endpoints:

- `GET https://kanjiapi.dev/v1/kanji/jlpt-5` through `jlpt-1` for JLPT lists.
- `GET https://kanjiapi.dev/v1/kanji/{character}` for meanings, readings, grade, and stroke count.

## Project Structure

- `src/components/` contains the Svelte UI sections used by `App.svelte`.
- `src/data/stories/n1` through `src/data/stories/n5` contain story data split into `short.js`, `mid.js`, and `long.js`.
- `src/lib/storyUtils.js` contains shared story helpers for text length, vocabulary extraction, and token rendering logic.

## Pronunciation

The app uses [Easy Speech](https://github.com/jankapunkt/easy-speech) as a lightweight wrapper around the browser-native [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance). Playback stays direct from Japanese text with a Japanese voice or `lang="ja-JP"` fallback instead of converting kanji to romaji first.

## Story Sources

The Aesop stories are original simplified Japanese retellings written for this app, inspired by public-domain fables from [Project Gutenberg's Three Hundred Aesop's Fables](https://www.gutenberg.org/files/21/21-h/21-h.htm).

The folklore stories are original simplified Japanese retellings of traditional Japanese folktales, with public-domain reference attribution to [Project Gutenberg's Japanese Fairy Tales](https://www.gutenberg.org/ebooks/4018).
