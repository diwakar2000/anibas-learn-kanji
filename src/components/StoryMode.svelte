<script>
  import EasySpeech from 'easy-speech';
  import { onDestroy, onMount } from 'svelte';

  import { JLPT_LEVELS } from '../data/levels.js';
  import { STORY_LIBRARY } from '../data/stories/index.js';
  import {
    emptyProgress,
    emptyStoryProgress,
    getRecord,
    normalizeStoryProgress,
    openDatabase,
    putRecord
  } from '../lib/database.js';
  import { storyLengthCategory, vocabularyForStory, wordId } from '../lib/storyUtils.js';
  import LevelPanel from './common/LevelPanel.svelte';
  import LoadingStage from './common/LoadingStage.svelte';
  import StoryComplete from './storymode/StoryComplete.svelte';
  import StoryHome from './storymode/StoryHome.svelte';
  import StoryReader from './storymode/StoryReader.svelte';
  import WordStudy from './storymode/WordStudy.svelte';

  const JAPANESE_SPEECH_LANG = 'ja-JP';

  let db;
  let ready = false;
  let appError = '';

  let levels = JLPT_LEVELS;
  let stories = STORY_LIBRARY;
  let selectedLevelId = 'jlpt-5';
  let selectedLengthId = 'all';
  let selectedStoryId = '';
  let progressByLevel = {};
  let storyProgressById = {};

  let phase = 'home';
  let wordIndex = 0;
  let selectedWordId = '';
  let showStoryFurigana = true;
  let speechSupported = false;
  let japaneseVoice = null;
  let speechMessage = '';
  let speakingText = '';
  let speechRunId = 0;

  $: selectedLevel = levels.find((level) => level.id === selectedLevelId) || levels[0];
  $: allLevelStories = stories.filter((story) => story.jlptLevel === selectedLevelId);
  $: levelStories = allLevelStories.filter(
    (story) => selectedLengthId === 'all' || storyLengthCategory(story).id === selectedLengthId
  );
  $: selectedStory = stories.find((story) => story.id === selectedStoryId) || levelStories[0];
  $: currentVocabulary = selectedStory ? vocabularyForStory(selectedStory) : [];
  $: selectedStoryProgress = selectedStory
    ? storyProgressById[selectedStory.id] || emptyStoryProgress(selectedStory.id, selectedStory.jlptLevel)
    : null;
  $: viewedWordIds = new Set(selectedStoryProgress?.viewedWords || []);
  $: currentWord = currentVocabulary[wordIndex] || currentVocabulary[0];
  $: selectedWord = selectedWordId ? currentVocabulary.find((wordItem) => wordItem.id === selectedWordId) : null;
  $: completedStoryCount = allLevelStories.filter((story) => storyProgressById[story.id]?.completed).length;
  $: storyListWordTotal = levelStories.reduce((sum, story) => sum + vocabularyForStory(story).length, 0);
  $: storyCountsByLevel = Object.fromEntries(
    levels.map((level) => [level.id, stories.filter((story) => story.jlptLevel === level.id).length])
  );

  onMount(async () => {
    initializePronunciation();

    try {
      db = await openDatabase();
      selectedStoryId = stories.find((story) => story.jlptLevel === selectedLevelId)?.id || '';
      await Promise.all([refreshProgress(), refreshStoryProgress()]);
      ready = true;
    } catch (error) {
      appError = toMessage(error);
    }
  });

  onDestroy(() => {
    stopPronunciation();
    db?.close();
  });

  async function initializePronunciation() {
    const detected = EasySpeech.detect();

    if (!detected.speechSynthesis || !detected.speechSynthesisUtterance) {
      speechSupported = false;
      speechMessage = 'Japanese voice playback is not available in this browser.';
      return;
    }

    speechSupported = true;

    try {
      await EasySpeech.init({ maxTimeout: 5000, interval: 250, quiet: true });
      loadJapaneseVoice();
      speechMessage = japaneseVoice ? `Voice: ${japaneseVoice.name}` : 'Using the browser Japanese voice.';
    } catch (error) {
      loadJapaneseVoice();
      speechMessage = 'Pronunciation is available, but no dedicated Japanese voice was found yet.';
    }
  }

  function loadJapaneseVoice() {
    const voices = EasySpeech.voices();
    japaneseVoice =
      voices.find((voice) => normalizeVoiceLang(voice.lang).startsWith('ja')) ||
      voices.find((voice) => voice.name.toLowerCase().includes('japanese')) ||
      null;
  }

  function normalizeVoiceLang(lang = '') {
    return lang.toLowerCase().replace('_', '-');
  }

  async function pronounce(text) {
    const normalizedText = normalizeSpeechText(text);

    if (!speechSupported || !normalizedText) {
      return;
    }

    if (speakingText === normalizedText) {
      stopPronunciation();
      return;
    }

    EasySpeech.cancel();
    const runId = speechRunId + 1;
    speechRunId = runId;
    speakingText = normalizedText;
    speechMessage = japaneseVoice ? `Voice: ${japaneseVoice.name}` : 'Using the browser Japanese voice.';

    try {
      if (japaneseVoice) {
        await EasySpeech.speak({
          text: normalizedText,
          voice: japaneseVoice,
          pitch: 1,
          rate: 0.82,
          volume: 1,
          force: true
        });
      } else {
        await speakNativeJapanese(normalizedText);
      }

      if (speechRunId === runId) {
        speakingText = '';
      }
    } catch (error) {
      if (speechRunId === runId) {
        speakingText = '';
        speechMessage = 'Could not play pronunciation with the current Japanese voice.';
      }
    }
  }

  function stopPronunciation() {
    speechRunId += 1;
    EasySpeech.cancel();

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    speakingText = '';
  }

  function speakNativeJapanese(text) {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        reject(new Error('Speech synthesis is unavailable.'));
        return;
      }

      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = JAPANESE_SPEECH_LANG;
      utterance.pitch = 1;
      utterance.rate = 0.82;
      utterance.volume = 1;
      utterance.onend = resolve;
      utterance.onerror = reject;
      window.speechSynthesis.speak(utterance);
    });
  }

  function normalizeSpeechText(text = '') {
    return text.replace(/\s+/g, '').trim();
  }

  function pronunciationLabel(text, noun = 'audio') {
    return speakingText === normalizeSpeechText(text) ? `Stop ${noun}` : `Play ${noun}`;
  }

  async function refreshProgress() {
    const entries = await Promise.all(
      levels.map(async (level) => {
        const record = (await getRecord(db, 'progress', level.id)) || emptyProgress(level.id);
        return [level.id, record];
      })
    );

    progressByLevel = Object.fromEntries(entries);
  }

  async function refreshStoryProgress() {
    const entries = await Promise.all(
      stories.map(async (story) => {
        const record =
          (await getRecord(db, 'storyProgress', story.id)) || emptyStoryProgress(story.id, story.jlptLevel);
        return [story.id, normalizeStoryProgress(record, story)];
      })
    );

    storyProgressById = Object.fromEntries(entries);
  }

  function selectLevel(levelId) {
    stopPronunciation();
    selectedLevelId = levelId;
    selectedLengthId = 'all';
    selectedStoryId = stories.find((story) => story.jlptLevel === levelId)?.id || '';
    wordIndex = 0;
    selectedWordId = '';
    phase = 'home';
  }

  function selectLength(lengthId) {
    selectedLengthId = lengthId;
    selectedWordId = '';
    wordIndex = 0;
    phase = 'home';
  }

  function openStory(story) {
    stopPronunciation();
    selectedLevelId = story.jlptLevel;
    selectedStoryId = story.id;
    wordIndex = 0;
    selectedWordId = '';
    phase = 'words';
  }

  async function markWordViewed(wordItem = currentWord) {
    if (!selectedStory || !wordItem) return;

    const previous = storyProgressById[selectedStory.id] || emptyStoryProgress(selectedStory.id, selectedStory.jlptLevel);
    const record = {
      ...previous,
      viewedWords: unique([...previous.viewedWords, wordItem.id]),
      updatedAt: new Date().toISOString()
    };

    await putRecord(db, 'storyProgress', record);
    storyProgressById = { ...storyProgressById, [selectedStory.id]: record };
  }

  async function nextWord() {
    await markWordViewed(currentWord);

    if (wordIndex < currentVocabulary.length - 1) {
      wordIndex += 1;
      selectedWordId = '';
      return;
    }

    jumpToStory();
  }

  function previousWord() {
    wordIndex = Math.max(0, wordIndex - 1);
    selectedWordId = '';
  }

  async function selectWordAt(index) {
    wordIndex = index;
    selectedWordId = '';
    await markWordViewed(currentVocabulary[index]);
  }

  async function chooseWord(tokenOrWord) {
    const id = wordId(tokenOrWord);
    selectedWordId = id;
    const index = currentVocabulary.findIndex((wordItem) => wordItem.id === id);

    if (index >= 0) {
      wordIndex = index;
      await markWordViewed(currentVocabulary[index]);
    }
  }

  async function jumpToStory() {
    if (currentWord) {
      await markWordViewed(currentWord);
    }

    selectedWordId = '';
    phase = 'reader';
  }

  async function completeStory() {
    if (!selectedStory) return;

    const previous = storyProgressById[selectedStory.id] || emptyStoryProgress(selectedStory.id, selectedStory.jlptLevel);
    const record = {
      ...previous,
      viewedWords: unique([...previous.viewedWords, ...currentVocabulary.map((wordItem) => wordItem.id)]),
      completed: true,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await putRecord(db, 'storyProgress', record);
    storyProgressById = { ...storyProgressById, [selectedStory.id]: record };
    phase = 'storyComplete';
  }

  function goHome() {
    stopPronunciation();
    appError = '';
    selectedWordId = '';
    phase = 'home';
  }

  function unique(source) {
    return [...new Set(source)];
  }

  function toMessage(error) {
    return error instanceof Error ? error.message : 'Something went wrong.';
  }
</script>

{#if appError}
  <div class="status error" role="alert">{appError}</div>
{/if}

{#if !ready}
  <LoadingStage message="Opening local story database" />
{:else}
  <div class="workspace">
    <LevelPanel
      {levels}
      {selectedLevelId}
      {progressByLevel}
      {storyCountsByLevel}
      showStoryCounts={true}
      onSelectLevel={selectLevel}
    />

    {#if phase === 'home'}
      <StoryHome
        {selectedLevel}
        {levelStories}
        {allLevelStories}
        {selectedLengthId}
        {storyListWordTotal}
        {completedStoryCount}
        {storyProgressById}
        onSelectLength={selectLength}
        onOpenStory={openStory}
      />
    {:else if phase === 'words' && selectedStory}
      <WordStudy
        {selectedLevel}
        {selectedStory}
        {currentWord}
        {wordIndex}
        {currentVocabulary}
        {viewedWordIds}
        {speechSupported}
        {speechMessage}
        {pronunciationLabel}
        onPronounce={pronounce}
        onJumpToStory={jumpToStory}
        onPreviousWord={previousWord}
        onNextWord={nextWord}
        onSelectWordAt={selectWordAt}
      />
    {:else if phase === 'reader' && selectedStory}
      <StoryReader
        {selectedLevel}
        {selectedStory}
        {selectedWord}
        {selectedWordId}
        {showStoryFurigana}
        {speechSupported}
        {speechMessage}
        {pronunciationLabel}
        onPronounce={pronounce}
        onToggleFurigana={(value) => (showStoryFurigana = value)}
        onCompleteStory={completeStory}
        onChooseWord={chooseWord}
        onBackToWords={() => (phase = 'words')}
      />
    {:else if phase === 'storyComplete' && selectedStory}
      <StoryComplete {selectedStory} {selectedLevel} {completedStoryCount} onGoHome={goHome} />
    {/if}
  </div>
{/if}
