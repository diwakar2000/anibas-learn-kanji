<script>
  export let currentSet = [];
  export let revealIndex = 0;
  export let revealSecondsLeft = 0;
  export let revealSecondsTotal = 5;
  export let primaryMeaning = () => '';
  export let readingSummary = () => '';
  export let onStartQuiz = () => {};

  $: active = currentSet[revealIndex];
</script>

{#if active}
  <section class="reveal-stage" aria-live="polite">
    <div class="timer-ring" style={`--progress: ${(revealSecondsLeft / revealSecondsTotal) * 100}%`}>
      <span>{revealSecondsLeft}</span>
    </div>
    <div class="reveal-kanji">{active.kanji}</div>
    <div class="reveal-copy">
      <p class="eyebrow">{revealIndex + 1} of {currentSet.length}</p>
      <h2>{primaryMeaning(active)}</h2>
      <p>{readingSummary(active)}</p>
    </div>
    <div class="button-row">
      <button class="ghost-button" type="button" on:click={onStartQuiz}>Quiz now</button>
    </div>
  </section>
{/if}
