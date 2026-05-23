/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/query_compiler_bg.*"
    ]
  }
};

export default nextConfig;
