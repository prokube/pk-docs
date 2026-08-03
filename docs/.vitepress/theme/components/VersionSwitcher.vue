<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute, withBase } from 'vitepress'
import { latestReleasedVersion, visibleVersions } from '../../versions'

const versions = [...visibleVersions]
const pages = new Set(
  Object.keys(import.meta.glob('../../../versions/**/*.md')).map((path) =>
    path.replace('../../../versions/', '')
  )
)

const route = useRoute()
const { site } = useData()

const routeSegments = computed(() => {
  const base = site.value.base.replace(/\/$/, '')
  const path = base && route.path.startsWith(base)
    ? route.path.slice(base.length)
    : route.path

  return path.split('/').filter(Boolean)
})

const currentVersion = computed(() => {
  const segment = routeSegments.value[0]
  return versions.includes(segment) ? segment : latestReleasedVersion
})

const currentSuffix = computed(() => {
  const segments = routeSegments.value
  const preserveTrailingSlash = route.path.endsWith('/')
  const suffix = versions.includes(segments[0])
    ? segments.slice(1).join('/')
    : segments.join('/')

  return suffix && preserveTrailingSlash ? `${suffix}/` : suffix
})

function pageFor(version: string, suffix: string) {
  if (!suffix) {
    return `${version}/index.md`
  }

  if (suffix.endsWith('/')) {
    return `${version}/${suffix}index.md`
  }

  if (suffix.endsWith('.html')) {
    return `${version}/${suffix.replace(/\.html$/, '.md')}`
  }

  return `${version}/${suffix}/index.md`
}

function targetFor(version: string) {
  const suffix = currentSuffix.value

  if (!pages.has(pageFor(version, suffix))) {
    return withBase(`/${version}/`)
  }

  return withBase(`/${version}/${suffix}`)
}
</script>

<template>
  <div class="pk-version-switcher">
    <button class="pk-version-switcher-button" type="button">
      Version {{ currentVersion }}
      <span aria-hidden="true">▾</span>
    </button>
    <div class="pk-version-switcher-menu">
      <a
        v-for="version in versions"
        :key="version"
        :href="targetFor(version)"
        :aria-current="version === currentVersion ? 'page' : undefined"
      >
        {{ version }}
      </a>
    </div>
  </div>
</template>
