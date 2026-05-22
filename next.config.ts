import type { NextConfig } from "next";

const isVercel = process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  typedRoutes: true,
  ...getLocalTurbopackConfig()
};

function getLocalTurbopackConfig(): Pick<NextConfig, "turbopack"> {
  if (isVercel) {
    return {};
  }

  const root = process.cwd();

  if (!root) {
    return {};
  }

  return {
    turbopack: {
      root
    }
  };
}

export default nextConfig;
