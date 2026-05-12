<script>
  import { CheckCircle2, ChevronRight, XCircle } from 'lucide-svelte';

  export let quizIndex = 0;
  export let quizQuestions = [];
  export let selectedOption = '';
  export let currentQuestion = null;
  export let primaryMeaning = () => '';
  export let onAnswerQuestion = () => {};
  export let onNextQuestion = () => {};
</script>

{#if currentQuestion}
  <section class="quiz-stage" aria-label="Kanji quiz">
    <div class="quiz-topline">
      <p class="eyebrow">{quizIndex + 1} of {quizQuestions.length}</p>
      <progress max={quizQuestions.length} value={quizIndex + (selectedOption ? 1 : 0)}></progress>
    </div>

    <div class="quiz-prompt">
      <span>{currentQuestion.item.kanji}</span>
      <p>Choose the meaning</p>
    </div>

    <div class="option-grid">
      {#each currentQuestion.options as option}
        <button
          class:correct={selectedOption && option === primaryMeaning(currentQuestion.item)}
          class:wrong={selectedOption === option && option !== primaryMeaning(currentQuestion.item)}
          disabled={Boolean(selectedOption)}
          type="button"
          on:click={() => onAnswerQuestion(option)}
        >
          {#if selectedOption && option === primaryMeaning(currentQuestion.item)}
            <CheckCircle2 size="18" aria-hidden="true" />
          {:else if selectedOption === option}
            <XCircle size="18" aria-hidden="true" />
          {/if}
          <span>{option}</span>
        </button>
      {/each}
    </div>

    <div class="button-row">
      <button class="primary-button" type="button" disabled={!selectedOption} on:click={onNextQuestion}>
        {quizIndex === quizQuestions.length - 1 ? 'Finish' : 'Next'}
        <ChevronRight size="18" aria-hidden="true" />
      </button>
    </div>
  </section>
{/if}
