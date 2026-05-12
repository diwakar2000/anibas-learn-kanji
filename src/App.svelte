<script>
  import EasySpeech from 'easy-speech';
  import { onDestroy, onMount } from 'svelte';

  import DeckStage from './components/DeckStage.svelte';
  import DrillHome from './components/DrillHome.svelte';
  import FinishedStage from './components/FinishedStage.svelte';
  import LevelPanel from './components/LevelPanel.svelte';
  import LoadingStage from './components/LoadingStage.svelte';
  import QuizStage from './components/QuizStage.svelte';
  import QuizSuccess from './components/QuizSuccess.svelte';
  import ResultsStage from './components/ResultsStage.svelte';
  import RevealStage from './components/RevealStage.svelte';
  import StoryComplete from './components/StoryComplete.svelte';
  import StoryHome from './components/StoryHome.svelte';
  import StoryReader from './components/StoryReader.svelte';
  import TopBar from './components/TopBar.svelte';
  import WordStudy from './components/WordStudy.svelte';
  import { JLPT_LEVELS } from './data/levels.js';
  import { STORY_LIBRARY } from './data/stories/index.js';
  import {
    storyLengthCategory,
    storyText,
    vocabularyForStory,
    wordId
  } from './lib/storyUtils.js';

  const API_ROOT = 'https://kanjiapi.dev/v1';
  const DB_NAME = 'kanji-quiz-spa';
  const DB_VERSION = 3;
  const REVEAL_SECONDS = 5;
  const BATCH_SIZE = 10;
  const JAPANESE_SPEECH_LANG = 'ja-JP';

  const FALLBACK_MEANINGS = [
    'river',
    'bright',
    'festival',
    'arrival',
    'medicine',
    'quiet',
    'harbor',
    'origin',
    'victory',
    'thread'
  ];

  let db;
  let ready = false;
  let appError = '';
  let loadingMessage = '';

  let levels = JLPT_LEVELS;
  let stories = STORY_LIBRARY;
  let selectedLevelId = 'jlpt-5';
  let selectedLengthId = 'all';
  let selectedStoryId = '';
  let progressByLevel = {};
  let storyProgressById = {};
  let listCache = {};

  let activeMode = 'story';
  let phase = 'home';
  let currentSet = [];
  let quizQuestions = [];
  let quizIndex = 0;
  let selectedOption = '';
  let quizResults = [];
  let revealIndex = 0;
  let revealSecondsLeft = REVEAL_SECONDS;
  let revealTimer;
  let wordIndex = 0;
  let selectedWordId = '';
  let showStoryFurigana = true;
  let speechSupported = false;
  let japaneseVoice = null;
  let speechMessage = '';
  let speakingText = '';
  let speechRunId = 0;

  $: selectedLevel = levels.find((level) => level.id === selectedLevelId) || levels[0];
  $: selectedProgress = selectedLevel ? progressByLevel[selectedLevel.id] || emptyProgress(selectedLevel.id) : null;
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
  $: currentQuestion = quizQuestions[quizIndex];
  $: correctCount = quizResults.filter((result) => result.correct).length;
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
      await refreshProgress();
      await refreshStoryProgress();
      ready = true;
    } catch (error) {
      appError = toMessage(error);
    }
  });

  onDestroy(() => {
    clearRevealTimer();
    stopPronunciation();
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

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains('settings')) {
          database.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!database.objectStoreNames.contains('progress')) {
          database.createObjectStore('progress', { keyPath: 'levelId' });
        }

        if (!database.objectStoreNames.contains('kanjiDetails')) {
          database.createObjectStore('kanjiDetails', { keyPath: 'kanji' });
        }

        if (!database.objectStoreNames.contains('storyProgress')) {
          database.createObjectStore('storyProgress', { keyPath: 'storyId' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function storeRequest(storeName, mode, operation) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function getRecord(storeName, key) {
    return storeRequest(storeName, 'readonly', (store) => store.get(key));
  }

  function putRecord(storeName, value) {
    return storeRequest(storeName, 'readwrite', (store) => store.put(value));
  }

  async function refreshProgress() {
    const entries = await Promise.all(
      levels.map(async (level) => {
        const record = (await getRecord('progress', level.id)) || emptyProgress(level.id);
        return [level.id, record];
      })
    );

    progressByLevel = Object.fromEntries(entries);
  }

  async function refreshStoryProgress() {
    const entries = await Promise.all(
      stories.map(async (story) => {
        const record = (await getRecord('storyProgress', story.id)) || emptyStoryProgress(story.id, story.jlptLevel);
        return [story.id, normalizeStoryProgress(record, story)];
      })
    );

    storyProgressById = Object.fromEntries(entries);
  }

  function emptyProgress(levelId) {
    return {
      levelId,
      completedKanji: [],
      completedSets: 0,
      lastSet: [],
      updatedAt: null
    };
  }

  function emptyStoryProgress(storyId, levelId) {
    return {
      storyId,
      levelId,
      viewedWords: [],
      completed: false,
      completedAt: null,
      updatedAt: null
    };
  }

  function normalizeStoryProgress(record, story) {
    return {
      ...emptyStoryProgress(story.id, story.jlptLevel),
      ...record,
      viewedWords: Array.isArray(record.viewedWords) ? record.viewedWords : []
    };
  }

  function selectLevel(levelId) {
    clearRevealTimer();
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

  function switchMode(mode) {
    clearRevealTimer();
    activeMode = mode;
    phase = 'home';
    selectedWordId = '';
    appError = '';
  }

  function openStory(story) {
    clearRevealTimer();
    activeMode = 'story';
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

    await putRecord('storyProgress', record);
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

    await putRecord('storyProgress', record);
    storyProgressById = { ...storyProgressById, [selectedStory.id]: record };
    phase = 'storyComplete';
  }

  async function loadKanjiList(level) {
    if (listCache[level.slug]) {
      return listCache[level.slug];
    }

    const response = await fetch(`${API_ROOT}/kanji/${encodeURIComponent(level.slug)}`);

    if (!response.ok) {
      throw new Error(`KanjiAPI could not load "${level.slug}" (${response.status}).`);
    }

    const list = await response.json();

    if (!Array.isArray(list)) {
      throw new Error(`"${level.slug}" did not return a kanji list.`);
    }

    listCache = { ...listCache, [level.slug]: list };
    return list;
  }

  async function loadKanjiDetails(character) {
    const cached = await getRecord('kanjiDetails', character);

    if (cached) {
      return cached;
    }

    const response = await fetch(`${API_ROOT}/kanji/${encodeURIComponent(character)}`);

    if (!response.ok) {
      throw new Error(`Could not load details for ${character}.`);
    }

    const detail = await response.json();
    await putRecord('kanjiDetails', detail);
    return detail;
  }

  async function startDrillSet(level = selectedLevel) {
    if (!level) return;

    clearRevealTimer();
    appError = '';
    activeMode = 'drill';
    loadingMessage = `Loading ${level.label}`;
    phase = 'loading';
    selectedLevelId = level.id;

    try {
      const list = await loadKanjiList(level);
      const progress = progressByLevel[level.id] || emptyProgress(level.id);
      const completed = new Set(progress.completedKanji || []);
      const available = shuffle(list.filter((character) => !completed.has(character)));
      const batch = available.slice(0, BATCH_SIZE);

      if (!batch.length) {
        currentSet = [];
        loadingMessage = '';
        phase = 'finished';
        return;
      }

      loadingMessage = `Preparing ${batch.length} kanji`;
      currentSet = await Promise.all(batch.map(loadKanjiDetails));
      quizQuestions = [];
      quizResults = [];
      quizIndex = 0;
      selectedOption = '';
      loadingMessage = '';
      phase = 'deck';
    } catch (error) {
      appError = toMessage(error);
      loadingMessage = '';
      phase = 'home';
    }
  }

  function startReveal() {
    if (!currentSet.length) return;

    revealIndex = 0;
    revealSecondsLeft = REVEAL_SECONDS;
    phase = 'reveal';
    clearRevealTimer();

    revealTimer = window.setInterval(() => {
      revealSecondsLeft -= 1;

      if (revealSecondsLeft > 0) {
        return;
      }

      if (revealIndex < currentSet.length - 1) {
        revealIndex += 1;
        revealSecondsLeft = REVEAL_SECONDS;
        return;
      }

      startQuiz();
    }, 1000);
  }

  function clearRevealTimer() {
    if (revealTimer) {
      window.clearInterval(revealTimer);
      revealTimer = null;
    }
  }

  function startQuiz() {
    clearRevealTimer();
    quizQuestions = currentSet.map((item) => ({
      item,
      options: buildOptions(item, currentSet)
    }));
    quizResults = [];
    quizIndex = 0;
    selectedOption = '';
    phase = 'quiz';
  }

  function buildOptions(target, pool) {
    const correct = primaryMeaning(target);
    const distractors = unique(
      shuffle(pool)
        .filter((item) => item.kanji !== target.kanji)
        .map(primaryMeaning)
        .filter((meaning) => meaning !== correct)
    );

    const extras = FALLBACK_MEANINGS.filter((meaning) => meaning !== correct && !distractors.includes(meaning));
    return shuffle([correct, ...distractors, ...extras].slice(0, 4));
  }

  function answerQuestion(option) {
    if (!currentQuestion || selectedOption) return;

    selectedOption = option;
    quizResults = [
      ...quizResults,
      {
        kanji: currentQuestion.item.kanji,
        selected: option,
        answer: primaryMeaning(currentQuestion.item),
        correct: option === primaryMeaning(currentQuestion.item)
      }
    ];
  }

  async function nextQuestion() {
    if (!selectedOption) return;

    if (quizIndex < quizQuestions.length - 1) {
      quizIndex += 1;
      selectedOption = '';
      return;
    }

    if (quizResults.every((result) => result.correct)) {
      await markCurrentSetComplete();
      phase = 'success';
      return;
    }

    phase = 'results';
  }

  async function markCurrentSetComplete() {
    const levelId = selectedLevel.id;
    const previous = progressByLevel[levelId] || emptyProgress(levelId);
    const completedKanji = unique([...previous.completedKanji, ...currentSet.map((item) => item.kanji)]);
    const record = {
      ...previous,
      completedKanji,
      completedSets: (previous.completedSets || 0) + 1,
      lastSet: currentSet.map((item) => item.kanji),
      updatedAt: new Date().toISOString()
    };

    await putRecord('progress', record);
    progressByLevel = { ...progressByLevel, [levelId]: record };
  }

  function retrySet() {
    selectedOption = '';
    quizResults = [];
    quizIndex = 0;
    phase = 'deck';
  }

  function goHome() {
    clearRevealTimer();
    appError = '';
    loadingMessage = '';
    selectedWordId = '';
    phase = 'home';
  }

  function primaryMeaning(item) {
    return item?.meanings?.slice(0, 2).join(', ') || 'Meaning unavailable';
  }

  function readingSummary(item) {
    const on = item.on_readings?.slice(0, 3).join(', ') || 'none';
    const kun = item.kun_readings?.slice(0, 3).join(', ') || 'none';
    return `On ${on} · Kun ${kun}`;
  }

  function shuffle(source) {
    return [...source].sort(() => Math.random() - 0.5);
  }

  function unique(source) {
    return [...new Set(source)];
  }

  function toMessage(error) {
    return error instanceof Error ? error.message : 'Something went wrong.';
  }
</script>

<svelte:head>
  <title>JLPT Story Kanji</title>
  <meta name="description" content="A Svelte story-first JLPT kanji reader powered by kanjiapi.dev." />
</svelte:head>

<main class="app-shell">
  <TopBar {activeMode} onSwitchMode={switchMode} />

  {#if appError}
    <div class="status error" role="alert">{appError}</div>
  {/if}

  {#if !ready}
    <LoadingStage message="Opening local study database" />
  {:else if phase === 'loading'}
    <LoadingStage message={loadingMessage} />
  {:else}
    <div class="workspace">
      <LevelPanel
        {levels}
        {selectedLevelId}
        {progressByLevel}
        {storyCountsByLevel}
        onSelectLevel={selectLevel}
      />

      {#if activeMode === 'story' && phase === 'home'}
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
      {:else if activeMode === 'story' && phase === 'words' && selectedStory}
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
      {:else if activeMode === 'story' && phase === 'reader' && selectedStory}
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
      {:else if activeMode === 'story' && phase === 'storyComplete' && selectedStory}
        <StoryComplete {selectedStory} {selectedLevel} {completedStoryCount} onGoHome={goHome} />
      {:else if activeMode === 'drill' && phase === 'home'}
        <DrillHome {selectedLevel} {selectedProgress} onStartDrill={startDrillSet} />
      {:else if phase === 'deck'}
        <DeckStage {selectedLevel} {currentSet} onStartReveal={startReveal} />
      {:else if phase === 'reveal'}
        <RevealStage
          {currentSet}
          {revealIndex}
          {revealSecondsLeft}
          revealSecondsTotal={REVEAL_SECONDS}
          {primaryMeaning}
          {readingSummary}
          onStartQuiz={startQuiz}
        />
      {:else if phase === 'quiz'}
        <QuizStage
          {quizIndex}
          {quizQuestions}
          {selectedOption}
          {currentQuestion}
          {primaryMeaning}
          onAnswerQuestion={answerQuestion}
          onNextQuestion={nextQuestion}
        />
      {:else if phase === 'success'}
        <QuizSuccess {currentSet} {selectedLevel} {selectedProgress} onGoHome={goHome} onStartDrill={startDrillSet} />
      {:else if phase === 'results'}
        <ResultsStage {correctCount} {quizResults} onRetrySet={retrySet} />
      {:else if phase === 'finished'}
        <FinishedStage {selectedLevel} onGoHome={goHome} />
      {/if}
    </div>
  {/if}
</main>
