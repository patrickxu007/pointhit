module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Ensure async generators are properly transpiled
      '@babel/plugin-proposal-async-generator-functions',
      // Required for Expo Router
      'expo-router/babel',
    ],
  };
};