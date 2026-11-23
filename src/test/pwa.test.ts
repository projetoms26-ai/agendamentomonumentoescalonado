import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8")) as {
  name: string;
  display: string;
  id: string;
  start_url: string;
  scope: string;
  icons: { src: string; sizes: string; purpose: string }[];
};

describe("PWA home-screen support", () => {
  it("launches App MME at the existing entry point in standalone mode", () => {
    expect(manifest.name).toBe("App MME");
    expect(manifest.display).toBe("standalone");
    expect(manifest.id).toBe("/");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
  });

  it("provides the required installation icons at their declared dimensions", () => {
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512", "512x512"]);
    expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
    for (const icon of manifest.icons) {
      const png = readFileSync(`public${icon.src}`);
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
    }
  });
});