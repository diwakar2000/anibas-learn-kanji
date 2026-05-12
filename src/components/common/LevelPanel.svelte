<script>
  import { Database, GraduationCap } from 'lucide-svelte';

  export let levels = [];
  export let selectedLevelId = '';
  export let progressByLevel = {};
  export let storyCountsByLevel = {};
  export let showStoryCounts = true;
  export let onSelectLevel = () => {};
</script>

<aside class="level-panel" aria-label="JLPT levels">
  <div class="panel-heading">
    <div>
      <p class="eyebrow">JLPT lists</p>
      <h2>N5 to N1</h2>
    </div>
    <GraduationCap size="24" aria-hidden="true" />
  </div>

  <div class="level-list">
    {#each levels as level}
      {@const progress = progressByLevel[level.id]}
      <button
        class:active={selectedLevelId === level.id}
        class="level-row"
        type="button"
        on:click={() => onSelectLevel(level.id)}
      >
        <span>
          <strong>{level.label}</strong>
          <small>{level.tone}</small>
        </span>
        <b>{progress?.completedKanji?.length || 0}</b>
        {#if showStoryCounts}
          <em>{storyCountsByLevel[level.id] || 0} stories</em>
        {/if}
      </button>
    {/each}
  </div>

  <div class="storage-note">
    <Database size="16" aria-hidden="true" />
    IndexedDB saves reading and kanji drill progress.
  </div>
</aside>
