import { defineConfig, UserConfig } from "vitest/config";
const config: UserConfig = {
  test: {
    globals: true,
    environment: "node",
  },
};

export default config;
