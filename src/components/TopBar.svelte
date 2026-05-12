<script>
  import { BookOpen, Brain } from 'lucide-svelte';

  export let activeMode;
  export let onSwitchMode = () => {};
</script>

<section class="topbar" aria-label="App controls">
  <div>
    <p class="eyebrow">KanjiAPI JLPT reader</p>
    <h1>JLPT Story Kanji</h1>
  </div>

  <div class="mode-tabs" aria-label="Study mode">
    <button class:active={activeMode === 'story'} type="button" on:click={() => onSwitchMode('story')}>
      <BookOpen size="18" aria-hidden="true" />
      Story Mode
    </button>
    <button class:active={activeMode === 'drill'} type="button" on:click={() => onSwitchMode('drill')}>
      <Brain size="18" aria-hidden="true" />
      Kanji Drill
    </button>
  </div>
</section>
