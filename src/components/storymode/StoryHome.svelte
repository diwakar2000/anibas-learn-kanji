<script>
  import { BookOpen } from 'lucide-svelte';
  import { STORY_LENGTHS } from '../../data/levels.js';
  import { storyLengthCategory, storyLengthLabel, storyStatus, vocabularyForStory } from '../../lib/storyUtils.js';

  export let selectedLevel;
  export let levelStories = [];
  export let allLevelStories = [];
  export let selectedLengthId = 'all';
  export let storyListWordTotal = 0;
  export let completedStoryCount = 0;
  export let storyProgressById = {};
  export let onSelectLength = () => {};
  export let onOpenStory = () => {};

  $: selectedLength = STORY_LENGTHS.find((option) => option.id === selectedLengthId);

  function storyCountForLength(lengthId) {
    if (lengthId === 'all') {
      return allLevelStories.length;
    }

    return allLevelStories.filter((story) => storyLengthCategory(story).id === lengthId).length;
  }
</script>

<section class="story-home" aria-label="Story mode">
  <div class="section-title">
    <div>
      <p class="eyebrow">{selectedLevel.name}</p>
      <h2>Choose a Story</h2>
    </div>
  </div>

  <div class="stats-band">
    <div>
      <span>{levelStories.length}</span>
      <p>{selectedLengthId === 'all' ? 'Stories' : `${selectedLength?.label} stories`}</p>
    </div>
    <div>
      <span>{storyListWordTotal}</span>
      <p>Vocabulary words</p>
    </div>
    <div>
      <span>{completedStoryCount}</span>
      <p>Completed</p>
    </div>
  </div>

  <div class="length-tabs" aria-label="Story length">
    {#each STORY_LENGTHS as lengthOption}
      <button
        class:active={selectedLengthId === lengthOption.id}
        type="button"
        on:click={() => onSelectLength(lengthOption.id)}
      >
        <span>
          <strong>{lengthOption.label}</strong>
          <small>{lengthOption.tone}</small>
        </span>
        <b>{storyCountForLength(lengthOption.id)}</b>
      </button>
    {/each}
  </div>

  <section class="story-library" aria-label="Stories">
    {#if !levelStories.length}
      <div class="empty-state">
        <BookOpen size="28" aria-hidden="true" />
        <h3>No {selectedLengthId} {selectedLevel.label} stories yet.</h3>
      </div>
    {:else}
      {#each levelStories as story}
        {@const words = vocabularyForStory(story)}
        {@const progress = storyProgressById[story.id] || { viewedWords: [] }}
        <article class="story-choice">
          <button class="story-choice-main" type="button" on:click={() => onOpenStory(story)}>
            <span class="story-card-topline">
              <span class="story-status">{storyStatus(story, storyProgressById)}</span>
              <span class="length-badge">{storyLengthLabel(story)}</span>
            </span>
            <strong>{story.title}</strong>
            <small>{story.summary}</small>
            {#if story.source}
              <small class="story-source">Inspired by {story.source.title}</small>
            {/if}
            <div class="progress-line">
              <span>{progress.viewedWords.length}/{words.length} words previewed</span>
              <span>{story.jlptLevel.replace('jlpt-', 'N')}</span>
            </div>
          </button>
        </article>
      {/each}
    {/if}
  </section>
</section>
