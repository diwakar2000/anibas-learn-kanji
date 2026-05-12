<script>
  import { BookOpen, Sparkles } from 'lucide-svelte';

  export let selectedStory;
  export let selectedLevel;
  export let completedStoryCount = 0;
  export let onGoHome = () => {};
</script>

<section class="center-stage success" aria-live="polite">
  <Sparkles size="42" aria-hidden="true" />
  <p class="eyebrow">Story complete</p>
  <h2>{selectedStory.title}</h2>
  <p>{selectedLevel.label} now has {completedStoryCount} completed stories.</p>
  <div class="button-row">
    <button class="primary-button" type="button" on:click={onGoHome}>
      <BookOpen size="18" aria-hidden="true" />
      Stories
    </button>
  </div>
</section>
