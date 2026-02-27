/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for GitHub Pages
  output: "export",
  // Sub-path matching the GitHub repo name (case-sensitive)
  basePath: "/DocVault",
  assetPrefix: "/DocVault/",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
