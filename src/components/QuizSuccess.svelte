<script>
  import { RotateCcw, Sparkles } from 'lucide-svelte';

  export let currentSet = [];
  export let selectedLevel;
  export let selectedProgress;
  export let onGoHome = () => {};
  export let onStartDrill = () => {};
</script>

<section class="center-stage success" aria-live="polite">
  <Sparkles size="42" aria-hidden="true" />
  <p class="eyebrow">Perfect score</p>
  <h2>Congrats, all {currentSet.length} saved.</h2>
  <p>{selectedLevel.label} now has {selectedProgress.completedKanji.length} completed kanji.</p>
  <div class="button-row">
    <button class="ghost-button" type="button" on:click={onGoHome}>
      <RotateCcw size="18" aria-hidden="true" />
      Play again
    </button>
    <button class="primary-button" type="button" on:click={() => onStartDrill(selectedLevel)}>
      Add more
    </button>
  </div>
</section>
