#!/bin/bash

# CMakeMakers Packaging Script

set -e

echo "🚀 Starting CMakeMakers packaging..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf out
rm -rf *.vsix

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run linter
echo "🔍 Running linter..."
npm run lint

# Compile TypeScript
echo "⚙️  Compiling TypeScript..."
npm run compile

# Run tests
echo "🧪 Running tests..."
npm run test || {
  echo "❌ Tests failed! Fix them before packaging."
  exit 1
}

# Package extension
echo "📦 Packaging extension..."
npm run package

# List generated package
echo ""
echo "✅ Packaging complete!"
echo ""
ls -lh *.vsix

echo ""
echo "🎉 Package created successfully!"
echo ""
echo "To install locally:"
echo "  code --install-extension cmakemakers-0.0.1.vsix"
echo ""
echo "To publish:"
echo "  npm run publish"
