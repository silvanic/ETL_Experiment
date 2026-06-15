import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Material from '@primeuix/themes/material'
import { i18n } from '@/i18n'
import './style.css'
import 'primeicons/primeicons.css'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.use(PrimeVue, {
	theme: {
		preset: Material,
		options: {
			darkModeSelector: true,
		},
	},
})
app.use(ToastService)
app.mount('#app')
