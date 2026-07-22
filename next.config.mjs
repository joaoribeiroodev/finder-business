/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["playwright", "exceljs"],
    outputFileTracingIncludes: {
      "/api/leads/export": ["./node_modules/exceljs/**/*"],
    },
  },
};

export default nextConfig;
