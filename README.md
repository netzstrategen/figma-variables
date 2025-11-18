# Figma Variables Transformer

An opinionated translation utility that transforms Figma-exported CSS variables into clean, organized, production-ready CSS custom properties.

## Features

- **Removes comments and consolidates duplicate variables** - Cleans up Figma's verbose export format
- **Simplifies variable names** - Removes redundant prefixes (e.g., `--border-border-xs` → `--border-xs`)
- **Smart unit conversion** - Converts px values to rem (with smart exceptions)
- **Responsive typography** - Creates fluid font-size variables using CSS `clamp()`
- **Theme support** - Separates light and dark mode variables with media queries
- **Dynamic color detection** - Automatically detects and groups color palettes
- **Layer wrapping** - Wraps output in `@layer globals` for better CSS cascade control
- **Organized output** - Groups and sorts variables logically by type and purpose

## Installation

### Use with npx (Recommended - No Installation Required)

The easiest way to use this tool is with `npx`, which runs the package without installing it globally:

```bash
# Basic usage (reads original.css, outputs output.css)
npx @netzstrategen/figma-variables

# Custom input and output
npx @netzstrategen/figma-variables ./src/figma-export.css ./src/globals.css

# Only specify input (outputs to output.css)
npx @netzstrategen/figma-variables ./src/figma-export.css
```

### Install as Project Dependency (Optional)

If you use it frequently in a project:

```bash
npm install --save-dev @netzstrategen/figma-variables
```

### Install Globally (Optional)

For system-wide usage:

```bash
npm install -g @netzstrategen/figma-variables
figma-variables ./src/figma-export.css ./src/globals.css
```

## Usage

### With npx (Recommended)

```bash
# Basic usage
npx @netzstrategen/figma-variables

# Transform specific files
npx @netzstrategen/figma-variables ./src/figma-tokens.css ./dist/tokens.css

# Get help
npx @netzstrategen/figma-variables --help

# Check version
npx @netzstrategen/figma-variables --version
```

### As NPM Script

Add to your `package.json`:

```json
{
  "scripts": {
    "tokens": "npx @netzstrategen/figma-variables ./src/figma-tokens.css ./src/design-tokens.css"
  }
}
```

Then run:

```bash
npm run tokens
```

### Programmatic Usage (If Installed as Dependency)

```javascript
const { transformCSS } = require('@netzstrategen/figma-variables');

transformCSS('./input.css', './output.css');
```

## Input Format

This tool expects CSS exported from Figma with the following structure:

```css
:root {
  /* PRIMITIVES */
  --color-primary-50: #eaf0fc;
  --color-primary-100: #d9e5fa;
  --color-primary-500: #253fe4;
  --border-border-xs: 1px;
  --border-border-xs-rem: 0.0625rem;

  /* STYLEGUIDE */
  --surface-surface-background-light-mode: var(--color-default-50);
  --surface-surface-background-dark-mode: var(--color-default-950);
}
```

## Output Format

The tool generates clean, organized CSS:

```css
@layer globals {
  :root {
    --color-primary-50: #eaf0fc;
    --color-primary-100: #d9e5fa;
    --color-primary-500: #253fe4;

    --border-xs: 0.0625rem;

    --font-size-step-0: clamp(1.125rem, 1.0786rem + 0.1905vw, 1.25rem);

    --surface-background: var(--color-default-50);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --surface-background: var(--color-default-950);
    }
  }
}
```

## Transformation Rules

### Variable Name Simplification

- `--border-border-xs` → `--border-xs`
- `--size-size-24` → `--size-24`
- `--surface-surface-background` → `--surface-background`
- `--typography-font-body` → `--font-family-body`

### Unit Conversion

- **Converts to rem:** Most spacing, sizing, and border values
- **Keeps px:** `spacing-px`, `radii-full`, and specific edge cases
- **Removes redundant units:** `0px` → `0`, `0rem` → `0`

### Mode Variables

Variables ending in `-light-mode` and `-dark-mode` are:

1. Separated into base `:root` (light mode) and `@media (prefers-color-scheme: dark)` blocks
2. Stripped of their mode suffix
3. Organized by category (surface, text, icon, outline)

### Responsive Typography

Font size variables are transformed into fluid typography using `clamp()`:

```css
/* Input */
--font-size-min-step-0: 18px;
--font-size-max-step-0: 20px;

/* Output */
--font-size-step-0: clamp(1.125rem, 1.0786rem + 0.1905vw, 1.25rem);
```

### Variable Grouping

Variables are automatically organized into groups:

1. **Colors** (primary, secondary, tertiary, etc.)
2. **Layout** (container, header)
3. **Typography** (font-family)
4. **Borders & Radii**
5. **Spacing & Sizing**
6. **Semantic tokens** (surface, text, icon, outline)

## Dynamic Color Detection

The tool automatically detects color groups. Known colors appear in a preferred order, while new colors are added alphabetically:

**Known order:**
- `color-default`
- `color-gray`
- `color-primary`
- `color-secondary`
- `color-tertiary`
- `color-highlight`
- `color-accent`

**New colors** (e.g., `color-brand`, `color-custom`) are automatically detected and placed alphabetically.

## Testing

Run tests with Vitest:

```bash
npm test
```

Run tests in watch mode during development:

```bash
npm run test:watch
```

Tests verify:
- Correct transformation of CSS variables
- Variable name simplification
- Unit conversion accuracy
- Mode separation (light/dark)
- Output structure and formatting
- Error handling

## Development

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Transform example files (local development)
node index.js original.css output.css

# Or test with npx locally
npx . original.css output.css
```

## Requirements

- Node.js 12.x or higher
- No external dependencies for production (uses only Node.js built-in modules)
- Vitest for testing (dev dependency only)

## License

MIT

## Author

italodr@gmail.com

## Contributing

Issues and pull requests are welcome! Please ensure:

1. Tests pass (`npm test`)
2. Code follows existing style conventions
3. Commit messages are clear and descriptive

## Publishing to npm

Before publishing, ensure:

1. All tests pass: `npm test`
2. Version is updated in `package.json`
3. CHANGELOG.md is updated
4. You're logged in to npm: `npm login`

To publish:

```bash
npm publish --access public
```

## Roadmap

- [ ] Support for custom transformation rules
- [ ] Configuration file support
- [ ] Plugin system for custom processors
- [ ] CSS-in-JS output format option
- [ ] TypeScript type definitions generation
