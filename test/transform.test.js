import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("CSS Transformation", () => {
  const fixturesDir = path.join(__dirname, "fixtures");
  const originalPath = path.join(fixturesDir, "original.css");
  const expectedPath = path.join(fixturesDir, "expected.css");
  const outputPath = path.join(fixturesDir, "output.css");

  afterEach(() => {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  });

  test("should transform CSS correctly", () => {
    execSync(`node ${path.join(__dirname, "..", "index.js")} ${originalPath} ${outputPath}`, {
      encoding: "utf-8",
    });

    const output = fs.readFileSync(outputPath, "utf-8");
    const expected = fs.readFileSync(expectedPath, "utf-8");

    expect(output).toBe(expected);
  });

  test("should handle missing input file", () => {
    const nonExistentPath = path.join(fixturesDir, "non-existent.css");

    expect(() => {
      execSync(`node ${path.join(__dirname, "..", "index.js")} ${nonExistentPath} ${outputPath}`, {
        encoding: "utf-8",
      });
    }).toThrow();
  });

  test("should create output file", () => {
    execSync(`node ${path.join(__dirname, "..", "index.js")} ${originalPath} ${outputPath}`, {
      encoding: "utf-8",
    });

    expect(fs.existsSync(outputPath)).toBe(true);
  });

  test("should parse variables correctly", () => {
    execSync(`node ${path.join(__dirname, "..", "index.js")} ${originalPath} ${outputPath}`, {
      encoding: "utf-8",
    });

    const output = fs.readFileSync(outputPath, "utf-8");

    expect(output).toContain("--color-primary-50: #eaf0fc;");
    expect(output).toContain("--container-width: 80rem;");
    expect(output).toContain("--spacing-px: 1px;");
    expect(output).toContain("--radii-full: 9999px;");
  });

  test("should generate clamp functions for font-size", () => {
    execSync(`node ${path.join(__dirname, "..", "index.js")} ${originalPath} ${outputPath}`, {
      encoding: "utf-8",
    });

    const output = fs.readFileSync(outputPath, "utf-8");

    expect(output).toContain("--font-size-step-0: clamp(");
    expect(output).toContain("vw");
  });

  test("should separate light and dark mode variables", () => {
    execSync(`node ${path.join(__dirname, "..", "index.js")} ${originalPath} ${outputPath}`, {
      encoding: "utf-8",
    });

    const output = fs.readFileSync(outputPath, "utf-8");

    expect(output).toContain("@media (prefers-color-scheme: dark)");
    expect(output).toContain("--surface-background: var(--color-default-50);");
  });

  test("should wrap output in @layer", () => {
    execSync(`node ${path.join(__dirname, "..", "index.js")} ${originalPath} ${outputPath}`, {
      encoding: "utf-8",
    });

    const output = fs.readFileSync(outputPath, "utf-8");

    expect(output).toMatch(/^@layer globals \{/);
    expect(output.trim()).toMatch(/\}$/);
  });

  test("should simplify variable names", () => {
    execSync(`node ${path.join(__dirname, "..", "index.js")} ${originalPath} ${outputPath}`, {
      encoding: "utf-8",
    });

    const output = fs.readFileSync(outputPath, "utf-8");

    expect(output).not.toContain("--border-border-");
    expect(output).not.toContain("--size-size-");
    expect(output).toContain("--border-xs:");
    expect(output).toContain("--size-1:");
  });

  test("should convert px to rem except for specific variables", () => {
    execSync(`node ${path.join(__dirname, "..", "index.js")} ${originalPath} ${outputPath}`, {
      encoding: "utf-8",
    });

    const output = fs.readFileSync(outputPath, "utf-8");

    expect(output).toContain("--spacing-px: 1px;");
    expect(output).toContain("--radii-full: 9999px;");
    expect(output).toContain("--spacing-1: 0.25rem;");
    expect(output).toContain("--border-xs: 0.0625rem;");
  });

  test("should group variables by type", () => {
    execSync(`node ${path.join(__dirname, "..", "index.js")} ${originalPath} ${outputPath}`, {
      encoding: "utf-8",
    });

    const output = fs.readFileSync(outputPath, "utf-8");
    const lines = output.split("\n");

    const colorPrimaryIndex = lines.findIndex((l) => l.includes("--color-primary-50:"));
    const colorGrayIndex = lines.findIndex((l) => l.includes("--color-gray-50:"));
    const borderIndex = lines.findIndex((l) => l.includes("--border-xs:"));
    const spacingIndex = lines.findIndex((l) => l.includes("--spacing-px:"));

    expect(colorPrimaryIndex).toBeGreaterThan(-1);
    expect(colorGrayIndex).toBeGreaterThan(-1);
    expect(borderIndex).toBeGreaterThan(colorPrimaryIndex);
    expect(spacingIndex).toBeGreaterThan(borderIndex);
  });
});
