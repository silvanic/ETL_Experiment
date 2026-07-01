import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Material from '@primeuix/themes/material'
import { i18n } from '@/i18n'
import { router } from '@/router'
import './style.css'
import 'primeicons/primeicons.css'
import App from './App.vue'
import Tooltip from 'primevue/tooltip';

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.use(router)
app.use(PrimeVue, {
	theme: {
		preset: Material,
		options: {
			darkModeSelector: ".app-dark",
		},
	}
})
app.use(ToastService)
app.use(ConfirmationService)
app.directive('tooltip', Tooltip);
app.mount('#app')