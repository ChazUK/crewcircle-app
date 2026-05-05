const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withUniwindConfig } = require("uniwind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

// Add resolver for path aliases
config.resolver.alias = {
  "@": "./src",
  "@convex/api": "./convex/_generated/api",
  "@convex/server": "./convex/_generated/server",
};

const { withStorybook } = require("@storybook/react-native/metro/withStorybook");

module.exports = withUniwindConfig(withStorybook(config), {
  cssEntryFile: "./src/global.css",
  dtsFile: "./src/uniwind-types.d.ts",
});
