<script>
  import { CheckCircle2, RotateCcw, XCircle } from 'lucide-svelte';

  export let correctCount = 0;
  export let quizResults = [];
  export let onRetrySet = () => {};
</script>

<section class="results-stage" aria-label="Quiz results">
  <div class="section-title">
    <div>
      <p class="eyebrow">Quiz result</p>
      <h2>{correctCount} of {quizResults.length} correct</h2>
    </div>
    <button class="primary-button" type="button" on:click={onRetrySet}>
      <RotateCcw size="18" aria-hidden="true" />
      Retry set
    </button>
  </div>

  <div class="results-list">
    {#each quizResults as result}
      <div class:miss={!result.correct}>
        <strong>{result.kanji}</strong>
        <span>{result.answer}</span>
        {#if result.correct}
          <CheckCircle2 size="18" aria-label="Correct" />
        {:else}
          <XCircle size="18" aria-label="Incorrect" />
        {/if}
      </div>
    {/each}
  </div>
</section>
