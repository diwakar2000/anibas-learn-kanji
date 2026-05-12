<script>
  import { CheckCircle2 } from 'lucide-svelte';

  export let selectedLevel;
  export let onGoHome = () => {};
</script>

<section class="center-stage success" aria-live="polite">
  <CheckCircle2 size="42" aria-hidden="true" />
  <p class="eyebrow">Level complete</p>
  <h2>{selectedLevel.label} is fully saved.</h2>
  <p>Choose another JLPT level or story.</p>
  <div class="button-row">
    <button class="primary-button" type="button" on:click={onGoHome}>Levels</button>
  </div>
</section>
