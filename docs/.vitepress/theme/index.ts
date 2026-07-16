import DefaultTheme from 'vitepress/theme'
import VersionSwitcher from './components/VersionSwitcher.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('VersionSwitcher', VersionSwitcher)
  }
}
