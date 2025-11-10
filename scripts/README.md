# CMakeMakers Build Scripts

This directory contains scripts for building, testing, and packaging the CMakeMakers extension.

## Scripts

### `package.sh` (Linux/Mac)

Packages the extension into a `.vsix` file.

```bash
bash scripts/package.sh
```

### `package.bat` (Windows)

Packages the extension into a `.vsix` file on Windows.

```cmd
scripts\package.bat
```

## What the scripts do:

1. Clean previous builds
2. Install npm dependencies
3. Run ESLint
4. Compile TypeScript
5. Run all tests
6. Package extension as `.vsix`

## Manual packaging steps:

If you prefer to run steps manually:

```bash
# Install dependencies
npm install

# Lint
npm run lint

# Compile
npm run compile

# Test
npm run test

# Package
npm run package
```

## Installing the package locally:

```bash
code --install-extension cmakemakers-0.0.1.vsix
```

## Publishing to VS Code Marketplace:

```bash
npm run publish
```

(Requires authentication token)
