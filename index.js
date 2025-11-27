#!/usr/bin/env node

import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

/**
 * CSS Transformation Tool
 *
 * This script transforms Figma-exported CSS variables into a clean, organized format.
 *
 * Features:
 * - Removes comments and consolidates duplicate variables
 * - Simplifies variable names (removes redundant prefixes)
 * - Converts px values to rem (with exceptions for specific variables)
 * - Creates responsive font-size variables using CSS clamp()
 * - Separates light and dark mode variables
 * - Dynamically detects and groups color palettes
 * - Maintains preferred ordering while supporting new color additions
 * - Wraps output in @layer for better CSS cascade control
 *
 * Usage:
 *   node transform.js [input] [output]
 *
 * Arguments:
 *   input  - Path to the input CSS file (default: original.css)
 *   output - Path to the output CSS file (default: output.css)
 *
 * Examples:
 *   node transform.js
 *   node transform.js ./src/styles.css ./public/globals.css
 *   node transform.js input.css
 */

/**
 * Transforms the original CSS file into the expected format
 */
function transformCSS(inputPath = "original.css", outputPath = "output.css") {
  try {
    // Read input file
    const originalCSS = fs.readFileSync(inputPath, "utf8");

    // Process CSS
    const variables = parseVariables(originalCSS);
    const processed = processVariables(variables, originalCSS);
    const output = generateOutput(processed);

    // Write output file
    fs.writeFileSync(outputPath, output, "utf8");

    console.log("✅ Transformación completada exitosamente");
    console.log(`   Input:  ${inputPath}`);
    console.log(`   Output: ${outputPath}`);
  } catch (error) {
    console.error("❌ Error durante la transformación:");
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

/**
 * Parse CSS variables from content
 */
function parseVariables(content) {
  const variables = {};
  const regex = /--([^:]+):\s*([^;]+);/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const name = match[1].trim();
    const value = match[2].trim();
    variables[name] = value;
  }

  return variables;
}

/**
 * Process variables according to requirements
 */
function processVariables(variables, originalCSS) {
  const result = {
    primitives: {},
    lightMode: {},
    darkMode: {},
  };

  // Separate mode variables
  for (const [name, value] of Object.entries(variables)) {
    if (name.endsWith("-light-mode")) {
      const baseName = simplifyName(name.replace(/-light-mode$/, ""));
      const cleanValue = simplifyVariableReferences(value);
      result.lightMode[baseName] = cleanValue;
    } else if (name.endsWith("-dark-mode")) {
      const baseName = simplifyName(name.replace(/-dark-mode$/, ""));
      const cleanValue = simplifyVariableReferences(value);
      result.darkMode[baseName] = cleanValue;
    }
  }

  // Process primitives
  const processed = new Set();

  for (const [name, value] of Object.entries(variables)) {
    // Skip mode variables
    if (name.endsWith("-light-mode") || name.endsWith("-dark-mode")) continue;

    // Skip variables not in expected output
    if (
      name.startsWith("font-size-mid-") ||
      name.startsWith("font-weight-") ||
      name.startsWith("type-") ||
      name.startsWith("viewport-")
    )
      continue;

    // Handle -rem suffix
    if (name.endsWith("-rem")) {
      const baseName = name.replace(/-rem$/, "");

      // Exceptions: keep px version for font-size, radii-full, spacing-px
      if (
        baseName.startsWith("font-size-") ||
        baseName === "radii-full" ||
        baseName === "spacing-px"
      ) {
        if (baseName === "radii-full") {
          // Keep radii-full with px value
          result.primitives["radii-full"] = variables["radii-full"];
          processed.add("radii-full");
        } else if (baseName === "spacing-px") {
          // Keep spacing-px with px value
          result.primitives["spacing-px"] = variables["spacing-px"];
          processed.add("spacing-px");
        }
        continue;
      }

      // Use rem value with base name
      let cleanValue = value === "0rem" ? "0" : value;
      const cleanName = simplifyName(baseName);

      // Special case: resolve typography-font to font-family
      if (baseName.startsWith("typography-font-")) {
        const originalValue = variables[baseName];
        result.primitives[cleanName] = originalValue;
      } else {
        result.primitives[cleanName] = cleanValue;
      }

      processed.add(baseName);
      processed.add(name);
    }
  }

  // Add variables without -rem suffix
  for (const [name, value] of Object.entries(variables)) {
    if (processed.has(name) || name.endsWith("-rem")) continue;
    if (name.endsWith("-light-mode") || name.endsWith("-dark-mode")) continue;
    if (
      name.startsWith("font-size-mid-") ||
      name.startsWith("font-weight-") ||
      name.startsWith("type-") ||
      name.startsWith("viewport-")
    )
      continue;

    const remName = name + "-rem";
    if (!variables[remName]) {
      let cleanValue = value === "0px" ? "0" : value;
      const cleanName = simplifyName(name);

      // Special case: resolve typography-font references
      if (name.startsWith("font-family-") && cleanValue.startsWith("var(--typography-font-")) {
        const refName = cleanValue.match(/var\(--([^)]+)\)/)[1];
        cleanValue = variables[refName] || cleanValue;
      }

      result.primitives[cleanName] = cleanValue;
    }
  }

  // Process font-size with clamp
  const fontSizes = processFontSizes(variables, originalCSS);
  Object.assign(result.primitives, fontSizes);

  return result;
}

/**
 * Simplify variable names
 */
function simplifyName(name) {
  return name
    .replace(/^border-border-/, "border-")
    .replace(/^size-size-/, "size-")
    .replace(/^surface-surface-/, "surface-")
    .replace(/^text-text-/, "text-")
    .replace(/^icon-icon-/, "icon-")
    .replace(/^outline-outline-/, "outline-")
    .replace(/^typography-font-/, "font-family-");
}

/**
 * Simplify variable references in values (e.g. var(--surface-surface-xxx) -> var(--surface-xxx))
 */
function simplifyVariableReferences(value) {
  if (!value.includes("var(--")) {
    return value;
  }

  return value.replace(/var\(--([^)]+)\)/g, (match, varName) => {
    const simplified = simplifyName(varName);
    return `var(--${simplified})`;
  });
}

/**
 * Process font-size variables with clamp
 */
function processFontSizes(variables, originalCSS) {
  const minWidth = parseFloat(variables["viewport-min-width"].replace(/"/g, ""));
  const maxWidth = parseFloat(variables["viewport-max-width"].replace(/"/g, ""));

  // Parse CSS line by line to match min with corresponding max
  const lines = originalCSS.split("\n");
  const allSteps = [];

  for (let i = 0; i < lines.length; i++) {
    const minMatch = lines[i].match(/--font-size-min-step-(\d+)-rem:\s*([\d.]+)rem;/);

    if (minMatch) {
      const step = parseInt(minMatch[1]);
      const minRem = parseFloat(minMatch[2]);

      // Look for the corresponding max in the next few lines
      let maxRem = null;
      for (let j = i + 1; j < i + 5 && j < lines.length; j++) {
        const maxMatch = lines[j].match(/--font-size-max-step-(\d+)-rem:\s*([\d.]+)rem;/);
        if (maxMatch && parseInt(maxMatch[1]) === step) {
          maxRem = parseFloat(maxMatch[2]);
          break;
        }
      }

      allSteps.push({
        originalStep: step,
        min: minRem,
        max: maxRem,
        avgValue: minRem,
      });
    }
  }

  // Remove exact duplicates
  const uniqueSteps = [];
  const seen = new Set();

  for (const step of allSteps) {
    const key = `${step.min}-${step.max}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSteps.push(step);
    }
  }

  // Sort by value (ascending)
  uniqueSteps.sort((a, b) => a.avgValue - b.avgValue);

  // Find step-0 index
  let step0Index = -1;
  for (let i = 0; i < uniqueSteps.length; i++) {
    if (uniqueSteps[i].originalStep === 0) {
      step0Index = i;
      break;
    }
  }

  // Generate output with correct numbering
  const fontSizes = {};

  for (let i = 0; i < uniqueSteps.length; i++) {
    const data = uniqueSteps[i];
    let outputStep;

    if (i < step0Index) {
      // Steps below step-0 are negative
      outputStep = i - step0Index;
    } else if (i === step0Index) {
      // This is step-0
      outputStep = 0;
    } else {
      // Steps above step-0 keep their original step number
      outputStep = data.originalStep;
    }

    const varName = `font-size-step-${outputStep}`;

    if (data.min && data.max) {
      fontSizes[varName] = generateClamp(minWidth, maxWidth, data.min, data.max);
    } else if (data.min) {
      fontSizes[varName] = `${data.min}rem`;
    } else if (data.max) {
      fontSizes[varName] = `${data.max}rem`;
    }
  }

  return fontSizes;
}

/**
 * Generate clamp CSS function
 */
function generateClamp(minWidthPx, maxWidthPx, minFontSize, maxFontSize) {
  const pixelsPerRem = 16;
  const minWidth = minWidthPx / pixelsPerRem;
  const maxWidth = maxWidthPx / pixelsPerRem;
  const slope = (maxFontSize - minFontSize) / (maxWidth - minWidth);
  const yAxisIntersection = -minWidth * slope + minFontSize;

  return `clamp(${minFontSize}rem, ${yAxisIntersection.toFixed(4)}rem + ${(slope * 100).toFixed(4)}vw, ${maxFontSize}rem)`;
}

/**
 * Generate output CSS
 *
 * This function dynamically detects color groups while maintaining a preferred order.
 * Known colors appear first in the defined order, then any new colors are added
 * alphabetically, followed by other primitive groups.
 */
function generateOutput(processed) {
  let output = "@layer globals {\n";
  output += "  :root {\n";

  // Define the order of known groups (colors and other primitives)
  // These colors will appear in this order if they exist in the CSS
  // Any new colors not in this list will be added alphabetically after these
  //
  // Example: If you add --color-brand-500 to your CSS, it will automatically
  // be detected and placed alphabetically after 'color-accent' (brand comes after accent)
  // To control the order of new colors, add them to this array in your preferred position
  const knownColorOrder = [
    "color-default",
    "color-gray",
    "color-primary",
    "color-secondary",
    "color-tertiary",
    "color-highlight",
    "color-accent",
    // Add new color prefixes here if you want to control their order
    // Example: 'color-brand', 'color-custom', etc.
  ];

  const otherGroupsOrder = [
    "container",
    "header",
    "font-family",
    "border",
    "radii",
    "spacing",
    "size",
    "font-size",
    "surface",
    "text",
    "icon",
    "outline",
  ];

  // Initialize groups
  const groups = {};
  knownColorOrder.forEach((prefix) => (groups[prefix] = []));
  otherGroupsOrder.forEach((prefix) => (groups[prefix] = []));

  // Detect color groups dynamically
  const detectedColorGroups = new Set();
  for (const name of Object.keys(processed.primitives)) {
    if (name.startsWith("color-")) {
      const colorMatch = name.match(/^color-([a-z]+)/);
      if (colorMatch) {
        detectedColorGroups.add(`color-${colorMatch[1]}`);
      }
    }
  }

  // Add new color groups that aren't in the known list
  const newColorGroups = [...detectedColorGroups]
    .filter((g) => !knownColorOrder.includes(g))
    .sort();

  newColorGroups.forEach((prefix) => (groups[prefix] = []));

  // Group primitives
  for (const [name, value] of Object.entries(processed.primitives)) {
    let grouped = false;

    // Try to match with color groups first
    if (name.startsWith("color-")) {
      const colorMatch = name.match(/^color-([a-z]+)/);
      if (colorMatch) {
        const colorPrefix = `color-${colorMatch[1]}`;
        if (groups[colorPrefix]) {
          groups[colorPrefix].push([name, value]);
          grouped = true;
        }
      }
    }

    // Try other groups
    if (!grouped) {
      for (const prefix of otherGroupsOrder) {
        if (name.startsWith(prefix)) {
          groups[prefix].push([name, value]);
          grouped = true;
          break;
        }
      }
    }

    if (!grouped) {
      console.warn(`Variable no agrupada: ${name}`);
    }
  }

  // Create final group order: known colors + new colors + other groups
  const finalGroupOrder = [...knownColorOrder, ...newColorGroups, ...otherGroupsOrder];

  // Sort and output each group (primitives first, then light mode)
  for (const prefix of finalGroupOrder) {
    if (groups[prefix] && groups[prefix].length > 0) {
      groups[prefix].sort((a, b) => sortVariables(a[0], b[0], prefix));

      for (const [name, value] of groups[prefix]) {
        output += `    --${name}: ${value};\n`;
      }
      output += "\n";
    }
  }

  // Add light mode variables (semantic tokens)
  if (Object.keys(processed.lightMode).length > 0) {
    const lightGroups = {
      surface: [],
      text: [],
      icon: [],
      outline: [],
    };

    for (const [name, value] of Object.entries(processed.lightMode)) {
      for (const prefix in lightGroups) {
        if (name.startsWith(prefix)) {
          lightGroups[prefix].push([name, value]);
          break;
        }
      }
    }

    const prefixOrder = ["surface", "text", "icon", "outline"];
    let isFirst = true;

    for (const prefix of prefixOrder) {
      if (lightGroups[prefix].length > 0) {
        lightGroups[prefix].sort((a, b) => sortModeVariables(a[0], b[0]));

        if (!isFirst) output += "\n";
        isFirst = false;

        for (const [name, value] of lightGroups[prefix]) {
          output += `    --${name}: ${value};\n`;
        }
      }
    }
  }

  output += "  }\n";

  // Add dark mode if exists
  if (Object.keys(processed.darkMode).length > 0) {
    output += "\n  @media (prefers-color-scheme: dark) {\n";
    output += "    :root {\n";

    // Group mode variables by prefix
    const modeGroups = {
      surface: [],
      text: [],
      icon: [],
      outline: [],
    };

    for (const [name, value] of Object.entries(processed.darkMode)) {
      for (const prefix in modeGroups) {
        if (name.startsWith(prefix)) {
          modeGroups[prefix].push([name, value]);
          break;
        }
      }
    }

    // Output in the same order as lightMode, grouped by type
    const prefixOrder = ["surface", "text", "icon", "outline"];
    let isFirst = true;

    for (const prefix of prefixOrder) {
      if (modeGroups[prefix].length > 0) {
        // Sort by semantic order, not alphabetically
        modeGroups[prefix].sort((a, b) => sortModeVariables(a[0], b[0]));

        if (!isFirst) output += "\n";
        isFirst = false;

        for (const [name, value] of modeGroups[prefix]) {
          output += `      --${name}: ${value};\n`;
        }
      }
    }

    output += "\n    }\n";
    output += "  }\n";
  }

  output += "}\n";

  return output;
}

/**
 * Sort variables intelligently
 */
function sortVariables(a, b, prefix) {
  // Special handling for radii
  if (prefix === "radii") {
    const radiiOrder = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "full"];
    const aSize = a.replace("radii-", "");
    const bSize = b.replace("radii-", "");
    const aIndex = radiiOrder.indexOf(aSize);
    const bIndex = radiiOrder.indexOf(bSize);
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
  }

  // Special handling for border
  if (prefix === "border") {
    const borderOrder = ["xs", "sm", "md", "lg", "xl"];
    const aSize = a.replace("border-", "");
    const bSize = b.replace("border-", "");
    const aIndex = borderOrder.indexOf(aSize);
    const bIndex = borderOrder.indexOf(bSize);
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
  }

  // Special handling for font-size steps
  if (prefix === "font-size" && a.includes("step-") && b.includes("step-")) {
    const aStep = parseInt(a.match(/step-(-?\d+)/)[1]);
    const bStep = parseInt(b.match(/step-(-?\d+)/)[1]);
    return bStep - aStep; // Descending order
  }

  // Extract numeric parts for color scales (50-950)
  const aMatch = a.match(/-(\d+)$/);
  const bMatch = b.match(/-(\d+)$/);

  if (aMatch && bMatch) {
    const aNum = parseInt(aMatch[1]);
    const bNum = parseInt(bMatch[1]);
    return aNum - bNum; // Ascending order for colors
  }

  // For spacing and size, sort by numeric value
  if (prefix === "spacing" || prefix === "size") {
    // spacing-px should come first
    if (a === "spacing-px") return -1;
    if (b === "spacing-px") return 1;

    const aMatch = a.match(/(\d+)(_\d+)?$/);
    const bMatch = b.match(/(\d+)(_\d+)?$/);

    if (aMatch && bMatch) {
      const aNum = parseFloat(aMatch[0].replace("_", "."));
      const bNum = parseFloat(bMatch[0].replace("_", "."));
      return aNum - bNum;
    }
  }

  return a.localeCompare(b);
}

/**
 * Sort mode variables by semantic meaning
 *
 * This function maintains a preferred order for known variables while automatically
 * handling new variables. Variables follow the pattern: xxx-default, xxx-hover, xxx-active
 *
 * Behavior:
 * 1. Known variables appear in the defined order
 * 2. Unknown variables are added alphabetically after known ones
 * 3. Variables with -default, -hover, -active suffixes are automatically grouped:
 *    - xxx or xxx-default (first)
 *    - xxx-hover (second)
 *    - xxx-active (third)
 *
 * Examples:
 *   If you add --surface-brand, --surface-brand-hover, --surface-brand-active
 *   They will automatically appear together in that order after the known variables
 */
function sortModeVariables(a, b) {
  // Define semantic order for known variables in each category
  // New variables will be added alphabetically after these
  const categoryOrder = {
    surface: [
      "background",
      "background-0",
      "primary-default",
      "primary-hover",
      "primary-active",
      "secondary-default",
      "secondary-hover",
      "secondary-active",
      "tertiary-default",
      "tertiary-hover",
      "tertiary-active",
      "quaternary",
      "quinary",
      "senary",
      "septenary",
      "octonary",
      "accent",
      "highlight-default",
      "highlight-active",
      "highlight-hover",
      "focus",
      "error",
      "warning",
      "success",
      "info",
      // New surface variables will be added alphabetically here
    ],
    text: [
      "foreground-default",
      "foreground-hover",
      "foreground-active",
      "primary-default",
      "primary-hover",
      "primary-active",
      "secondary-default",
      "secondary-hover",
      "secondary-active",
      "tertiary-default",
      "tertiary-hover",
      "tertiary-active",
      "quaternary",
      "quinary",
      "senary",
      "septenary",
      "octonary",
      "inverted",
      "accent",
      "highlight-default",
      "highlight-hover",
      "highlight-active",
      "focus",
      "error",
      "warning",
      "success",
      "info",
      // New text variables will be added alphabetically here
    ],
    icon: [
      "foreground",
      "foreground-hover",
      "foreground-active",
      "primary-default",
      "primary-hover",
      "primary-active",
      "secondary-default",
      "secondary-hover",
      "secondary-active",
      "tertiary",
      "quaternary",
      "quinary",
      "senary",
      "septenary",
      "octonary",
      "inverted",
      "highlight-default",
      "highlight-hover",
      "highlight-active",
      // New icon variables will be added alphabetically here
    ],
    outline: [
      "primary-default",
      "primary-hover",
      "primary-active",
      "secondary-default",
      "secondary-hover",
      "secondary-active",
      "tertiary-default",
      "tertiary-hover",
      "tertiary-active",
      "quaternary",
      "quinary",
      "senary",
      "septenary",
      "octonary-default",
      "octonary-hover",
      "octonary-active",
      "disabled",
      "inverted",
      "focus",
      "error",
      "warning",
      "success",
      "info",
      // New outline variables will be added alphabetically here
    ],
  };

  // Determine category
  let category = null;
  for (const cat in categoryOrder) {
    if (a.startsWith(cat)) {
      category = cat;
      break;
    }
  }

  if (!category) {
    return a.localeCompare(b);
  }

  const aSuffix = a.replace(category + "-", "");
  const bSuffix = b.replace(category + "-", "");

  const aIndex = categoryOrder[category].indexOf(aSuffix);
  const bIndex = categoryOrder[category].indexOf(bSuffix);

  // Both are in the known list
  if (aIndex !== -1 && bIndex !== -1) {
    return aIndex - bIndex;
  }

  // Only 'a' is in the known list (a comes first)
  if (aIndex !== -1) return -1;

  // Only 'b' is in the known list (b comes first)
  if (bIndex !== -1) return 1;

  // Neither are in the known list - sort by semantic groups (default, hover, active)
  // Extract base name and state
  const aMatch = aSuffix.match(/^(.+?)(?:-(default|hover|active))?$/);
  const bMatch = bSuffix.match(/^(.+?)(?:-(default|hover|active))?$/);

  if (aMatch && bMatch) {
    const aBase = aMatch[1];
    const bBase = bMatch[1];
    const aState = aMatch[2] || "default"; // If no state, treat as default
    const bState = bMatch[2] || "default";

    // Same base name - sort by state (default, hover, active)
    if (aBase === bBase) {
      const stateOrder = { default: 0, hover: 1, active: 2 };
      return (stateOrder[aState] || 3) - (stateOrder[bState] || 3);
    }

    // Different base names - sort alphabetically
    return aBase.localeCompare(bBase);
  }

  // Fallback to alphabetical
  return aSuffix.localeCompare(bSuffix);
}

// Get __filename and __dirname equivalents in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this script is being run directly (not imported as a module)
// This handles multiple scenarios:
// 1. Direct execution: node index.js
// 2. Shebang execution: ./index.js
// 3. npx execution: npx @netzstrategen/figma-variables
// 4. Global installation: figma-variables
const isMainModule = () => {
  if (!process.argv[1]) return false;

  const scriptPath = process.argv[1];

  // Check if the script path matches this file
  if (import.meta.url === `file://${scriptPath}`) return true;
  if (__filename === scriptPath) return true;

  // Check if it ends with index.js (handles symlinks and npx)
  if (scriptPath.endsWith('/index.js') || scriptPath.endsWith('\\index.js')) return true;

  // Check if it's the bin name from package.json
  if (scriptPath.endsWith('/figma-variables') || scriptPath.endsWith('\\figma-variables')) return true;

  return false;
};

// Parse command line arguments and execute
if (isMainModule()) {
  const args = process.argv.slice(2);

  // Handle help flag
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Figma Variables Transformer

Usage:
  figma-variables [input] [output]
  figma-variables --help
  figma-variables --version

Arguments:
  input   Path to the input CSS file (default: original.css)
  output  Path to the output CSS file (default: output.css)

Options:
  --help, -h      Show this help message
  --version, -v   Show version number

Examples:
  figma-variables
  figma-variables ./src/figma-export.css ./src/globals.css
  figma-variables input.css
    `);
    process.exit(0);
  }

  // Handle version flag
  if (args.includes("--version") || args.includes("-v")) {
    const packageJson = JSON.parse(
      fs.readFileSync(new URL("./package.json", import.meta.url), "utf8"),
    );
    console.log(packageJson.version);
    process.exit(0);
  }

  const inputPath = args[0] || "original.css";
  const outputPath = args[1] || "output.css";

  transformCSS(inputPath, outputPath);
}

// Export functions for testing
export {
  transformCSS,
  parseVariables,
  processVariables,
  simplifyName,
  simplifyVariableReferences,
  processFontSizes,
  generateClamp,
  generateOutput,
  sortVariables,
  sortModeVariables,
};
