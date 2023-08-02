/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				"color-1": '#2f2f2f',
				"color-2": '#e1b07e',
				"color-3": '#e5be9e',
				"color-4": '#cbc0ad',
				"color-5": '#86a397',
			}
		},
	},
	plugins: [],
}
