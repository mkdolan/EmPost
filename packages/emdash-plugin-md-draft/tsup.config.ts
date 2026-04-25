import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/plugin.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	sourcemap: true,
	target: "es2022",
	noExternal: ["@emplugins/shared"],
});
