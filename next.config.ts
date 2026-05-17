/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: "C:\\Projects\\Medaura",
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;