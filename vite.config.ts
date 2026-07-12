import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	server: {
		fs: {
			strict: false,
		},
	},
	plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
	define: {
		// @react-pdf/renderer uses Buffer internally — polyfill for the browser
		global: "globalThis",
	},
	optimizeDeps: {
		include: ["buffer"],
	},
	resolve: {
		alias: {
			buffer: "buffer",
		},
	},
});
