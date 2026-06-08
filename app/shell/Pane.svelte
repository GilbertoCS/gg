<script lang="ts">
    import { hasModal } from "../stores";
</script>

<section inert={$hasModal}>
    <div class="header">
        <slot name="header" />
    </div>
    <div class="body">
        <slot name="body" />
    </div>
</section>

<style>
    section {
        display: grid;
        grid-template-rows: 36px 1fr;
        grid-template-columns: 100%;
        overflow: hidden;
    }

    .header {
        border-bottom: 1px solid var(--ctp-overlay0);
        padding: 4px 6px 3px 6px;
        background: var(--ctp-surface0);
    }

    .body {
        padding: 0;
        display: grid;
        overflow: hidden;
    }
</style>
