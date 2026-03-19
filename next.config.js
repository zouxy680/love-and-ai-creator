/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.second.me',
      },
      {
        protocol: 'https',
        hostname: 'api.mindverse.com',
      },
      {
        protocol: 'https',
        hostname: '*.mindverse.com',
      },
      // 知乎图片
      {
        protocol: 'https',
        hostname: '*.zhimg.com',
      },
    ],
  },
}

module.exports = nextConfig
