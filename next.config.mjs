/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The pset/finger/bank/exam workspace routes read content from disk at request
  // time (lib/content.ts via node:fs). On Vercel a serverless function only ships
  // files Next.js can statically trace, so include the content JSON/MDX explicitly.
  // (public/ — vendored Pyodide/Monaco, pset data files — is served statically and
  // needs no tracing.) In Next 14.2 this lives under `experimental`.
  experimental: {
    outputFileTracingIncludes: {
      '/**': ['./content/**/*.json', './content/**/*.mdx'],
    },
  },
};

export default nextConfig;
