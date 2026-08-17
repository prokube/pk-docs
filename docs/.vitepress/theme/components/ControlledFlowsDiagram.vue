<script setup lang="ts">
const modelItems = ['Locally hosted LLMs', 'External provider LLMs']
const clientItems = ['Internal AI apps', 'Upstream agents', 'External client apps']
const runtimeItems = ['Agent identity', 'Sessions and memory', 'Secure sandboxes']
const capabilityItems = ['MCP tools', 'Other agents', 'Skills']
const observabilityItems = ['Logs', 'Metrics', 'Traces', 'Evals', 'Audit']
</script>

<template>
  <div class="controlled-flows">
    <div class="controlled-flows__canvas">
      <div class="controlled-flows__models">
        <div class="controlled-flows__heading controlled-flows__heading--center">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20v2M12 2v2M17 20v2M17 2v2M2 12h2M2 17h2M2 7h2M20 12h2M20 17h2M20 7h2M7 20v2M7 2v2" />
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <rect x="8" y="8" width="8" height="8" rx="1" />
          </svg>
          <span>Model providers</span>
        </div>
        <div class="controlled-flows__model-grid">
          <div v-for="item in modelItems" :key="item" class="controlled-flows__item controlled-flows__item--bordered">
            {{ item }}
          </div>
        </div>
      </div>

      <div class="controlled-flows__connector controlled-flows__connector--vertical">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2v20M8 18l4 4 4-4M8 6l4-4 4 4" />
        </svg>
      </div>

      <div class="controlled-flows__middle">
        <div class="controlled-flows__side-card">
          <div class="controlled-flows__heading controlled-flows__heading--muted">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 5H3M12 19H3M14 3v4M16 17v4M21 12h-9M21 19h-5M21 5h-7M8 10v4M8 12H3" />
            </svg>
            <span>Clients and apps</span>
          </div>
          <div class="controlled-flows__stack">
            <div v-for="item in clientItems" :key="item" class="controlled-flows__item">
              {{ item }}
            </div>
          </div>
        </div>

        <div class="controlled-flows__connector">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8l4 4-4 4M2 12h20M6 8l-4 4 4 4" />
          </svg>
        </div>

        <div class="controlled-flows__gateway">
          <div class="controlled-flows__gateway-heading">
            <div class="controlled-flows__heading">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="6" cy="19" r="3" />
                <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
                <circle cx="18" cy="5" r="3" />
              </svg>
              <span>Agent Gateway</span>
            </div>
            <span class="controlled-flows__gateway-copy">policy, routing, quotas</span>
          </div>

          <div class="controlled-flows__runtime">
            <div class="controlled-flows__heading controlled-flows__heading--center">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="16" y="16" width="6" height="6" rx="1" />
                <rect x="2" y="16" width="6" height="6" rx="1" />
                <rect x="9" y="2" width="6" height="6" rx="1" />
                <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3M12 12V8" />
              </svg>
              <span>Agent runtime</span>
            </div>
            <div class="controlled-flows__runtime-grid">
              <div v-for="item in runtimeItems" :key="item" class="controlled-flows__runtime-item">
                {{ item }}
              </div>
            </div>
          </div>
        </div>

        <div class="controlled-flows__connector">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8l4 4-4 4M2 12h20M6 8l-4 4 4 4" />
          </svg>
        </div>

        <div class="controlled-flows__side-card controlled-flows__side-card--accent">
          <div class="controlled-flows__heading">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
              <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
            </svg>
            <span>Agent capabilities</span>
          </div>
          <div class="controlled-flows__stack">
            <div v-for="item in capabilityItems" :key="item" class="controlled-flows__item">
              {{ item }}
            </div>
          </div>
        </div>
      </div>

      <div class="controlled-flows__connector controlled-flows__connector--vertical controlled-flows__connector--spaced">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2v20M8 18l4 4 4-4M8 6l4-4 4 4" />
        </svg>
      </div>

      <div class="controlled-flows__observability">
        <div class="controlled-flows__heading">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Observability and audit</span>
        </div>
        <div class="controlled-flows__observability-grid">
          <div v-for="item in observabilityItems" :key="item" class="controlled-flows__item controlled-flows__item--centered">
            {{ item }}
          </div>
        </div>
      </div>

      <div class="controlled-flows__foundation">
        Kubernetes-native foundation: GPUs, data layer, identity, GitOps, backups, and air-gapped operations
      </div>
    </div>
  </div>
</template>

<style scoped>
.controlled-flows {
  background: #faf9fb;
  border: 1px solid #e9eaec;
  border-radius: 1.25rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  color: #111827;
  margin: 1.5rem 0;
  overflow-x: auto;
  padding: 1rem;
}

.controlled-flows__canvas {
  min-width: 620px;
}

.controlled-flows__models {
  background: #f5f5ff;
  border: 1px solid #c7c2ff;
  border-radius: 1rem;
  margin: 0 auto 0.85rem;
  max-width: 440px;
  padding: 0.8rem;
  text-align: center;
}

.controlled-flows__heading {
  align-items: center;
  color: #645ade;
  display: flex;
  font-size: 0.7rem;
  font-weight: 700;
  gap: 0.35rem;
  letter-spacing: 0.025em;
  line-height: 1.25rem;
  text-transform: uppercase;
}

.controlled-flows__heading--center {
  justify-content: center;
  margin-bottom: 0.65rem;
}

.controlled-flows__heading--muted {
  color: #535965;
  margin-bottom: 0.65rem;
}

.controlled-flows__heading svg {
  fill: none;
  flex: 0 0 auto;
  height: 1rem;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
  width: 1rem;
}

.controlled-flows__model-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.controlled-flows__item {
  background: #ffffff;
  border: 1px solid #e9eaec;
  border-radius: 0.6rem;
  color: #111827;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.375;
  padding: 0.65rem;
}

.controlled-flows__item--bordered {
  border-color: #e9eaec;
}

.controlled-flows__item--centered {
  padding: 0.55rem 0.7rem;
  text-align: center;
}

.controlled-flows__connector {
  align-items: center;
  color: #645ade;
  display: flex;
  justify-content: center;
}

.controlled-flows__connector svg {
  fill: none;
  height: 1.1rem;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.25;
  width: 1.1rem;
}

.controlled-flows__connector--vertical {
  height: 1.25rem;
  margin: 0 auto 0.45rem;
  width: 1.25rem;
}

.controlled-flows__connector--spaced {
  margin-bottom: 0.7rem;
  margin-top: 0.7rem;
}

.controlled-flows__middle {
  align-items: center;
  display: grid;
  gap: 0.4rem;
  grid-template-columns: 1fr 20px 1.4fr 20px 1fr;
}

.controlled-flows__side-card {
  background: #ffffff;
  border: 1px solid #e9eaec;
  border-radius: 1rem;
  padding: 0.8rem;
}

.controlled-flows__side-card--accent {
  background: #f5f5ff;
  border-color: #c7c2ff;
}

.controlled-flows__stack {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.65rem;
}

.controlled-flows__gateway {
  background: #ebebff;
  border: 2px solid #958dff;
  border-radius: 1.25rem;
  padding: 0.8rem;
}

.controlled-flows__gateway-heading {
  align-items: center;
  color: #645ade;
  display: flex;
  gap: 0.7rem;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.controlled-flows__gateway-copy {
  color: #656cad;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.375;
  max-width: 12rem;
}

.controlled-flows__runtime {
  background: #ffffff;
  border: 1px solid #c7c2ff;
  border-radius: 1rem;
  padding: 0.8rem;
}

.controlled-flows__runtime-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.controlled-flows__runtime-item {
  align-items: center;
  background: #faf9fb;
  border: 1px solid #e9eaec;
  border-radius: 0.6rem;
  color: #111827;
  display: flex;
  font-size: 0.72rem;
  font-weight: 600;
  justify-content: center;
  line-height: 1.375;
  min-height: 4rem;
  padding: 0.65rem 0.5rem;
  text-align: center;
}

.controlled-flows__observability {
  background: #f5f5ff;
  border: 1px solid #c7c2ff;
  border-radius: 1rem;
  padding: 0.8rem;
}

.controlled-flows__observability .controlled-flows__heading {
  margin-bottom: 0.65rem;
}

.controlled-flows__observability-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.controlled-flows__foundation {
  background: #ffffff;
  border: 1px solid #e9eaec;
  border-radius: 0.75rem;
  color: #111827;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.5;
  margin-top: 0.7rem;
  padding: 0.7rem 1rem;
  text-align: center;
}

@media (max-width: 767px) {
  .controlled-flows {
    padding: 0.75rem;
  }
}
</style>
