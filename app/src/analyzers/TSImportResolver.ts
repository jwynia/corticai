import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * TSImportResolver
 *
 * Pure utility class for resolving TypeScript import paths.
 * Handles relative imports, module resolution, and file extension resolution.
 *
 * Key responsibilities:
 * - Resolve relative import paths to absolute file paths
 * - Handle TypeScript file extension resolution (.ts, .tsx, .js, .jsx)
 * - Detect and filter external dependencies (node_modules)
 * - Normalize file paths across platforms
 *
 * Design: Pure functions with no side effects, easily testable
 */
export class TSImportResolver {
  private readonly TS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

  /**
   * Resolve an import specifier to an absolute file path
   *
   * @param fromPath - Absolute path of the file containing the import
   * @param importSpecifier - The import path (e.g., './utils', '../components/Button')
   * @returns Absolute path to the resolved file, or null if not a local file
   */
  async resolveDependencyPath(
    fromPath: string,
    importSpecifier: string
  ): Promise<string | null> {
    // Validate inputs
    if (!importSpecifier || importSpecifier.trim() === '') {
      return null;
    }

    // Filter out absolute imports (npm packages, built-in modules)
    if (!this.isRelativeImport(importSpecifier)) {
      return null;
    }

    // Normalize the import specifier (handle Windows paths)
    const normalizedSpecifier = this.normalizeFilePath(importSpecifier);

    // Get the directory containing the importing file
    const fromDir = path.dirname(fromPath);

    // Resolve the import path relative to the importing file
    let resolvedPath = path.resolve(fromDir, normalizedSpecifier);
    resolvedPath = path.normalize(resolvedPath);

    // Try to find the file with various extensions and patterns
    const actualPath = await this.findActualFilePath(resolvedPath);

    return actualPath;
  }

  /**
   * Find the actual file path by trying different extensions and patterns
   *
   * Resolution order:
   * 1. Exact path if it exists
   * 2. Path with .ts extension
   * 3. Path with .tsx extension
   * 4. Path with .js extension (for mixed projects)
   * 5. Path with .jsx extension
   * 6. Directory with index.ts
   * 7. Directory with index.tsx
   * 8. Directory with index.js
   * 9. Directory with index.jsx
   *
   * @param resolvedPath - The resolved path without extension
   * @returns Absolute path if file exists, null otherwise
   */
  private async findActualFilePath(resolvedPath: string): Promise<string | null> {
    // If the path already has an extension, handle it specially
    const ext = path.extname(resolvedPath);

    if (ext) {
      // If it's a TS extension, check if file exists
      if (this.TS_EXTENSIONS.includes(ext)) {
        if (await this.fileExists(resolvedPath)) {
          return resolvedPath;
        }
      }

      // Special case: .js/.jsx imports might reference .ts/.tsx files
      if (ext === '.js') {
        const tsPath = resolvedPath.replace(/\.js$/, '.ts');
        if (await this.fileExists(tsPath)) {
          return tsPath;
        }
        const tsxPath = resolvedPath.replace(/\.js$/, '.tsx');
        if (await this.fileExists(tsxPath)) {
          return tsxPath;
        }
      }

      if (ext === '.jsx') {
        const tsxPath = resolvedPath.replace(/\.jsx$/, '.tsx');
        if (await this.fileExists(tsxPath)) {
          return tsxPath;
        }
        const tsPath = resolvedPath.replace(/\.jsx$/, '.ts');
        if (await this.fileExists(tsPath)) {
          return tsPath;
        }
      }

      // If we still haven't found it, return null
      return null;
    }

    // Try direct file extensions first
    for (const extension of this.TS_EXTENSIONS) {
      const pathWithExt = resolvedPath + extension;
      if (await this.fileExists(pathWithExt)) {
        return pathWithExt;
      }
    }

    // Try index files in directory
    for (const extension of this.TS_EXTENSIONS) {
      const indexPath = path.join(resolvedPath, `index${extension}`);
      if (await this.fileExists(indexPath)) {
        return indexPath;
      }
    }

    // File not found
    return null;
  }

  /**
   * Check if a file exists
   *
   * @param filePath - Path to check
   * @returns true if file exists, false otherwise
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if an import specifier is a relative import
   *
   * Relative imports start with './' or '../'
   * Absolute imports are package names (e.g., 'react', '@testing-library/react')
   *
   * @param importSpecifier - The import path
   * @returns true if relative import, false otherwise
   */
  isRelativeImport(importSpecifier: string): boolean {
    if (!importSpecifier) {
      return false;
    }
    return importSpecifier.startsWith('./') || importSpecifier.startsWith('../');
  }

  /**
   * Normalize a file path
   *
   * - Convert Windows backslashes to forward slashes
   * - Remove redundant separators
   * - Resolve . and .. segments
   *
   * @param filePath - Path to normalize
   * @returns Normalized path
   */
  normalizeFilePath(filePath: string): string {
    // Convert Windows paths to POSIX for consistency during processing
    const posixPath = filePath.replace(/\\/g, '/');

    // Normalize using path.normalize to handle ., .., and redundant separators
    return path.normalize(posixPath);
  }

  /**
   * Get the list of supported TypeScript file extensions
   *
   * @returns Array of supported extensions
   */
  getTypeScriptExtensions(): string[] {
    return [...this.TS_EXTENSIONS];
  }
}
