<script>
  import { LoaderCircle } from 'lucide-svelte';

  export let message;
</script>

<section class="center-stage" aria-live="polite">
  <LoaderCircle class="spin" size="34" aria-hidden="true" />
  <p>{message}</p>
</section>
