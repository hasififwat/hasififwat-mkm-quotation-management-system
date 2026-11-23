import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	turbopack: {
		resolveAlias: {
			buffer: "buffer",
		},
	},
	webpack: (config) => {
		config.resolve.fallback = {
			...config.resolve.fallback,
			buffer: require("buffer"),
			global: false,
		};
		config.resolve.alias = {
			...config.resolve.alias,
			buffer: "buffer",
		};
		return config;
	},
};

export default nextConfig;
