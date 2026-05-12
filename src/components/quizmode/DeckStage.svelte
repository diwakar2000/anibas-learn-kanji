<script>
  import { Play } from 'lucide-svelte';

  export let selectedLevel;
  export let currentSet = [];
  export let onStartReveal = () => {};
</script>

<section class="study-area" aria-label="Kanji cards">
  <div class="section-title">
    <div>
      <p class="eyebrow">{selectedLevel.name}</p>
      <h2>Study these {currentSet.length}</h2>
    </div>
    <button class="primary-button" type="button" on:click={onStartReveal}>
      <Play size="18" aria-hidden="true" />
      Meanings
    </button>
  </div>

  <div class="kanji-grid">
    {#each currentSet as item}
      <article class="kanji-card">
        <span>{item.kanji}</span>
        <small>{item.stroke_count || '-'} strokes</small>
      </article>
    {/each}
  </div>
</section>
