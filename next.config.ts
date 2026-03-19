import { withSerwist } from "@serwist/turbopack";

export default withSerwist({
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cmsassets.rgpub.io",
      },
    ],
  },
});
