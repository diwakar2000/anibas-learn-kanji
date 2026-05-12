<script>
  import KanjiDrill from './components/KanjiDrill.svelte';
  import StoryMode from './components/StoryMode.svelte';
  import TopBar from './components/common/TopBar.svelte';

  let activeMode = 'story';

  function switchMode(mode) {
    activeMode = mode;
  }
</script>

<svelte:head>
  <title>JLPT Story Kanji</title>
  <meta name="description" content="A Svelte story-first JLPT kanji reader powered by kanjiapi.dev." />
</svelte:head>

<main class="app-shell">
  <TopBar {activeMode} onSwitchMode={switchMode} />

  {#if activeMode === 'story'}
    <StoryMode />
  {:else}
    <KanjiDrill />
  {/if}
</main>
