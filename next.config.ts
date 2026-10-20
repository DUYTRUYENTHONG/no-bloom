import type { NextConfig } from "next";

const githubPages = process.env.GITHUB_PAGES === "true";
const config: NextConfig = githubPages
  ? { output: "export", basePath: "/no-bloom", trailingSlash: true, images: { unoptimized: true } }
  : {};

export default config;
