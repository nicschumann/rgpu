module.exports = function (config) {
  config.set({
    frameworks: ["mocha", "chai"],
    files: ["tests/**/*.js"],
    reporters: ["spec"],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: ["ChromeCanaryWebGPU", "FirefoxNightlyWebGPU"],
    autoWatch: false,
    singleRun: true,
    concurrency: Infinity,
    customLaunchers: {
      ChromeCanaryWebGPU: {
        base: "ChromeCanary",
        flags: [
          "--enable-unsafe-webgpu",
          "--headless",
          "--remote-debugging-port=9222",
        ],
      },
      FirefoxNightlyWebGPU: {
        base: "FirefoxNightly",
        flags: ["-headless"],
        prefs: {
          "dom.webgpu.enabled": true,
          "gfx.webrender.all": true,
          "gfx.webgpu.ignore-blocklist": true,
        },
        command: "/Applications/Firefox Nightly.app/Contents/MacOS/firefox",
      },
    },
    specReporter: {
      maxLogLines: 5,
      suppressErrorSummary: false, // Do not print error summary
      suppressFailed: false, // Do not suppress failed tests
      suppressPassed: false, // Do not suppress passed tests
      suppressSkipped: true, // Suppress skipped tests
      showSpecTiming: true, // Print the time elapsed for each spec
      failFast: true,
    },
  });
};
