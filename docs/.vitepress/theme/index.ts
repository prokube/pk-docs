import DefaultTheme from 'vitepress/theme'
import ControlledFlowsDiagram from './components/ControlledFlowsDiagram.vue'
import VersionSwitcher from './components/VersionSwitcher.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ControlledFlowsDiagram', ControlledFlowsDiagram)
    app.component('VersionSwitcher', VersionSwitcher)
  }
}
