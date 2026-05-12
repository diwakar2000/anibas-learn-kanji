<script>
  import { BadgeCheck, ListChecks, Volume2 } from 'lucide-svelte';
  import {
    exampleText,
    hasKanji,
    isStudyWord,
    storyLengthLabel,
    storyText,
    wordId
  } from '../../lib/storyUtils.js';

  export let selectedLevel;
  export let selectedStory;
  export let selectedWord = null;
  export let selectedWordId = '';
  export let showStoryFurigana = true;
  export let speechSupported = false;
  export let speechMessage = '';
  export let pronunciationLabel = () => 'Play audio';
  export let onPronounce = () => {};
  export let onToggleFurigana = () => {};
  export let onCompleteStory = () => {};
  export let onChooseWord = () => {};
  export let onBackToWords = () => {};
</script>

<section class="reader-stage" aria-label="Story reader">
  <div class="section-title">
    <div>
      <p class="eyebrow">{selectedLevel.label} reader · {storyLengthLabel(selectedStory)}</p>
      <h2>{selectedStory.title}</h2>
    </div>
    <div class="section-actions">
      <label class="furigana-toggle">
        <input
          type="checkbox"
          checked={showStoryFurigana}
          on:change={(event) => onToggleFurigana(event.currentTarget.checked)}
        />
        <span>Furigana</span>
      </label>
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
      <button class="primary-button" type="button" on:click={onCompleteStory}>
        <BadgeCheck size="18" aria-hidden="true" />
        Complete
      </button>
    </div>
  </div>

  <div class="reader-layout">
    <article class="japanese-story" lang="ja">
      {#each selectedStory.tokens as token}
        {#if isStudyWord(token) && hasKanji(token.text)}
          <button
            class:active={selectedWordId === wordId(token)}
            class="reader-word"
            type="button"
            title={`${token.reading} - ${token.meaning}`}
            on:click={() => onChooseWord(token)}
          >
            {#if showStoryFurigana}
              <ruby>{token.text}<rt>{token.reading}</rt></ruby>
            {:else}
              <span>{token.text}</span>
            {/if}
          </button>
        {:else}
          <span>{token.text}</span>
        {/if}
      {/each}
    </article>

    <aside class="word-detail-panel" aria-label="Word meaning">
      {#if selectedWord}
        <p class="eyebrow">Selected word</p>
        <ruby class="panel-ruby">{selectedWord.text}<rt>{selectedWord.reading}</rt></ruby>
        <h3>{selectedWord.meaning}</h3>
        <div class="audio-row">
          <button
            class="ghost-button"
            type="button"
            disabled={!speechSupported}
            title={speechMessage || 'Play Japanese pronunciation'}
            on:click={() => onPronounce(selectedWord.text)}
          >
            <Volume2 size="18" aria-hidden="true" />
            {pronunciationLabel(selectedWord.text, 'word')}
          </button>
        </div>
        {#if selectedWord.examples?.length}
          <div class="example-list compact">
            {#each selectedWord.examples as item}
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
      {:else}
        <p class="eyebrow">Tap any marked word</p>
        <h3>Meaning and examples appear here.</h3>
        <p>The Furigana toggle only changes the main story text. Word details keep readings here.</p>
      {/if}
    </aside>
  </div>

  {#if selectedStory.summary}
    <p class="reader-summary">{selectedStory.summary}</p>
  {/if}
  {#if selectedStory.source}
    <p class="reader-source">
      Inspired by
      <a href={selectedStory.source.url} target="_blank" rel="noreferrer">{selectedStory.source.title}</a>.
    </p>
  {/if}

  <div class="button-row">
    <button class="ghost-button" type="button" on:click={onBackToWords}>
      <ListChecks size="18" aria-hidden="true" />
      Words
    </button>
  </div>
</section>
