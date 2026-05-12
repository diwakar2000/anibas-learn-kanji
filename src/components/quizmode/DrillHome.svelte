<script>
  import { ChevronRight, Play } from 'lucide-svelte';

  export let selectedLevel;
  export let selectedProgress;
  export let onStartDrill = () => {};
</script>

<section class="study-home" aria-label="Kanji drill">
  <div class="section-title">
    <div>
      <p class="eyebrow">Secondary practice</p>
      <h2>{selectedLevel.name} Kanji Drill</h2>
    </div>
    <button class="primary-button" type="button" on:click={() => onStartDrill(selectedLevel)}>
      <Play size="18" aria-hidden="true" />
      Start 10
    </button>
  </div>

  <div class="stats-band">
    <div>
      <span>{selectedProgress.completedKanji.length}</span>
      <p>Saved kanji</p>
    </div>
    <div>
      <span>{selectedProgress.completedSets || 0}</span>
      <p>Perfect sets</p>
    </div>
    <div>
      <span>{selectedLevel.slug}</span>
      <p>API list</p>
    </div>
  </div>

  <div class="preview-strip" aria-label="Drill flow">
    <div>
      <strong>1</strong>
      <span>Cards</span>
    </div>
    <ChevronRight size="18" aria-hidden="true" />
    <div>
      <strong>2</strong>
      <span>Five-second meanings</span>
    </div>
    <ChevronRight size="18" aria-hidden="true" />
    <div>
      <strong>3</strong>
      <span>Four-choice quiz</span>
    </div>
  </div>
</section>
