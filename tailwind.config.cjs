/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				"color-background": '#02111b',
				"color-secondary": '#3f4045',
				"color-primary": '#d3d0cb',
				"color-accent": '#5c95ff',
				"color-highlight": '#ff6b6b',
			}
		},
	},
	plugins: [],
}
