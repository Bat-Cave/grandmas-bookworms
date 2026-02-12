import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL('https://energized-parakeet-489.convex.cloud/**')],
  },
}

export default nextConfig
