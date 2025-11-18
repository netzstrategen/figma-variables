# Contributing to Figma Variables Transformer

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Running Tests

Run the test suite with Vitest:

```bash
npm test
```

Run tests in watch mode during development:

```bash
npm run test:watch
```

### Continuous Integration

This project uses GitHub Actions for automated testing:

- **Workflow File**: `.github/workflows/test.yml`
- **Triggers**:
  - All push events (any branch)
  - All pull requests
- **Test Matrix**: Tests run on Node.js versions 20.x and 22.x
- **Status**: Check the badge on the README for current test status

All pull requests must pass CI tests before being merged.

## Making Changes

1. Create a new branch for your feature or bugfix
2. Make your changes
3. Ensure all tests pass
4. Write new tests for new functionality
5. Update documentation if needed
6. Submit a pull request

## Code Style

- Use clear, descriptive variable and function names
- Add JSDoc comments for all public functions
- Follow existing code formatting conventions
- Keep functions focused and single-purpose

## Testing Guidelines

- Write tests for all new features
- Ensure edge cases are covered
- Tests should be descriptive and easy to understand
- Maintain or improve code coverage

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the CHANGELOG.md following the existing format
3. Ensure all tests pass
4. Request review from maintainers
5. Address any feedback or requested changes

## Reporting Issues

When reporting issues, please include:

- A clear description of the problem
- Steps to reproduce
- Expected behavior
- Actual behavior
- Your environment (Node.js version, OS, etc.)
- Sample CSS input if applicable

## Feature Requests

We welcome feature requests! Please:

- Check if the feature has already been requested
- Clearly describe the use case
- Explain why this feature would be useful
- Provide examples if possible

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain a welcoming environment

## Questions?

Feel free to open an issue for any questions about contributing.

