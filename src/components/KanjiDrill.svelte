<script>
  import { onDestroy, onMount } from 'svelte';

  import { JLPT_LEVELS } from '../data/levels.js';
  import { emptyProgress, getRecord, openDatabase, putRecord } from '../lib/database.js';
  import LevelPanel from './common/LevelPanel.svelte';
  import LoadingStage from './common/LoadingStage.svelte';
  import DeckStage from './quizmode/DeckStage.svelte';
  import DrillHome from './quizmode/DrillHome.svelte';
  import FinishedStage from './quizmode/FinishedStage.svelte';
  import QuizStage from './quizmode/QuizStage.svelte';
  import QuizSuccess from './quizmode/QuizSuccess.svelte';
  import ResultsStage from './quizmode/ResultsStage.svelte';
  import RevealStage from './quizmode/RevealStage.svelte';

  const API_ROOT = 'https://kanjiapi.dev/v1';
  const REVEAL_SECONDS = 5;
  const BATCH_SIZE = 10;

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
  let selectedLevelId = 'jlpt-5';
  let progressByLevel = {};
  let listCache = {};

  let phase = 'home';
  let currentSet = [];
  let quizQuestions = [];
  let quizIndex = 0;
  let selectedOption = '';
  let quizResults = [];
  let revealIndex = 0;
  let revealSecondsLeft = REVEAL_SECONDS;
  let revealTimer;

  $: selectedLevel = levels.find((level) => level.id === selectedLevelId) || levels[0];
  $: selectedProgress = selectedLevel ? progressByLevel[selectedLevel.id] || emptyProgress(selectedLevel.id) : null;
  $: currentQuestion = quizQuestions[quizIndex];
  $: correctCount = quizResults.filter((result) => result.correct).length;

  onMount(async () => {
    try {
      db = await openDatabase();
      await refreshProgress();
      ready = true;
    } catch (error) {
      appError = toMessage(error);
    }
  });

  onDestroy(() => {
    clearRevealTimer();
    db?.close();
  });

  async function refreshProgress() {
    const entries = await Promise.all(
      levels.map(async (level) => {
        const record = (await getRecord(db, 'progress', level.id)) || emptyProgress(level.id);
        return [level.id, record];
      })
    );

    progressByLevel = Object.fromEntries(entries);
  }

  function selectLevel(levelId) {
    clearRevealTimer();
    appError = '';
    loadingMessage = '';
    selectedLevelId = levelId;
    phase = 'home';
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
    const cached = await getRecord(db, 'kanjiDetails', character);

    if (cached) {
      return cached;
    }

    const response = await fetch(`${API_ROOT}/kanji/${encodeURIComponent(character)}`);

    if (!response.ok) {
      throw new Error(`Could not load details for ${character}.`);
    }

    const detail = await response.json();
    await putRecord(db, 'kanjiDetails', detail);
    return detail;
  }

  async function startDrillSet(level = selectedLevel) {
    if (!level) return;

    clearRevealTimer();
    appError = '';
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

    await putRecord(db, 'progress', record);
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

{#if appError}
  <div class="status error" role="alert">{appError}</div>
{/if}

{#if !ready}
  <LoadingStage message="Opening local kanji database" />
{:else if phase === 'loading'}
  <LoadingStage message={loadingMessage} />
{:else}
  <div class="workspace">
    <LevelPanel {levels} {selectedLevelId} {progressByLevel} showStoryCounts={false} onSelectLevel={selectLevel} />

    {#if phase === 'home'}
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
