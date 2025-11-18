# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-18

### Added
- Initial release
- CSS variable transformation from Figma exports
- Variable name simplification
- Smart px to rem conversion
- Responsive typography with clamp()
- Light/dark mode separation
- Dynamic color palette detection
- @layer wrapping for cascade control
- Comprehensive test suite with Vitest
- CLI tool support with --help and --version flags
- Full documentation with npx-first approach
- Zero production dependencies

### Features
- Removes comments and consolidates duplicates
- Simplifies redundant variable names
- Converts units intelligently
- Creates fluid font-size variables
- Separates theme variables with media queries
- Automatically detects and groups color palettes
- Maintains organized output structure
- Works seamlessly with npx (no installation required)

### Technical
- Node.js 12+ support
- Vitest for testing
- ES modules configuration
- CLI with proper argument parsing

