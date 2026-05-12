<script>
  import { BookOpen, ChevronRight, Volume2 } from 'lucide-svelte';
  import { exampleText, hasKanji, storyLengthLabel, storyText } from '../lib/storyUtils.js';

  export let selectedLevel;
  export let selectedStory;
  export let currentWord;
  export let wordIndex = 0;
  export let currentVocabulary = [];
  export let viewedWordIds = new Set();
  export let speechSupported = false;
  export let speechMessage = '';
  export let pronunciationLabel = () => 'Play audio';
  export let onPronounce = () => {};
  export let onJumpToStory = () => {};
  export let onPreviousWord = () => {};
  export let onNextWord = () => {};
  export let onSelectWordAt = () => {};
</script>

<section class="word-study" aria-label="Story vocabulary">
  <div class="section-title">
    <div>
      <p class="eyebrow">{selectedLevel.label} vocabulary · {storyLengthLabel(selectedStory)}</p>
      <h2>{selectedStory.title}</h2>
    </div>
    <div class="section-actions">
      <button
        class="ghost-button"
        type="button"
        disabled={!speechSupported}
        title={speechMessage || 'Play Japanese pronunciation'}
        on:click={() => onPronounce(storyText(selectedStory))}
      >
        <Volume2 size="18" aria-hidden="true" />
        {pronunciationLabel(storyText(selectedStory), 'story')}
      </button>
      <button class="primary-button" type="button" on:click={onJumpToStory}>
        <BookOpen size="18" aria-hidden="true" />
        Jump to Story
      </button>
    </div>
  </div>

  <div class="word-study-layout">
    <article class="word-focus">
      <p class="eyebrow">Word {wordIndex + 1} of {currentVocabulary.length}</p>
      {#if currentWord}
        <ruby class="focus-ruby">
          {currentWord.text}
          <rt>{currentWord.reading}</rt>
        </ruby>
        <h3>{currentWord.meaning}</h3>
        <div class="audio-row">
          <button
            class="ghost-button"
            type="button"
            disabled={!speechSupported}
            title={speechMessage || 'Play Japanese pronunciation'}
            on:click={() => onPronounce(currentWord.text)}
          >
            <Volume2 size="18" aria-hidden="true" />
            {pronunciationLabel(currentWord.text, 'word')}
          </button>
        </div>
        {#if currentWord.note}
          <p>{currentWord.note}</p>
        {/if}
        {#if currentWord.examples?.length}
          <div class="example-list">
            {#each currentWord.examples as item}
              <div class="example-card">
                <div class="example-head">
                  <p lang="ja">
                    {#each item.parts as part}
                      {#if part.reading && hasKanji(part.text)}
                        <ruby>{part.text}<rt>{part.reading}</rt></ruby>
                      {:else}
                        <span>{part.text}</span>
                      {/if}
                    {/each}
                  </p>
                  <button
                    class="icon-button compact"
                    type="button"
                    disabled={!speechSupported}
                    title={speechMessage || 'Play Japanese sentence'}
                    aria-label={pronunciationLabel(exampleText(item), 'sentence')}
                    on:click={() => onPronounce(exampleText(item))}
                  >
                    <Volume2 size="16" aria-hidden="true" />
                  </button>
                </div>
                <small>{item.translation}</small>
              </div>
            {/each}
          </div>
        {/if}
      {/if}

      <div class="button-row split-row">
        <button class="ghost-button" type="button" disabled={wordIndex === 0} on:click={onPreviousWord}>
          Previous
        </button>
        <button class="primary-button" type="button" on:click={onNextWord}>
          {wordIndex === currentVocabulary.length - 1 ? 'Go to Story' : 'Next word'}
          <ChevronRight size="18" aria-hidden="true" />
        </button>
      </div>
    </article>

    <section class="vocab-grid" aria-label="Words in this story">
      {#each currentVocabulary as wordItem, index}
        <button
          class:active={index === wordIndex}
          class:viewed={viewedWordIds.has(wordItem.id)}
          type="button"
          on:click={() => onSelectWordAt(index)}
        >
          <ruby>{wordItem.text}<rt>{wordItem.reading}</rt></ruby>
          <span>{wordItem.meaning}</span>
        </button>
      {/each}
    </section>
  </div>
</section>
