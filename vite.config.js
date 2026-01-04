/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  HEXAGON 3D - Vite Configuration
 * ═══════════════════════════════════════════════════════════════════════════
 *  © 2025 Allync. All rights reserved.
 *  www.allync.com.tr | www.allyncai.com
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { defineConfig } from 'vite';

export default defineConfig({
  // ═══════════════════════════════════════════════════════════════
  // BUILD CONFIGURATION - Security Optimized
  // ═══════════════════════════════════════════════════════════════
  build: {
    // Disable source maps in production (IMPORTANT for security)
    sourcemap: false,

    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.log in production (keep warnings/errors)
        drop_console: false,
        drop_debugger: true,
        // Dead code elimination
        dead_code: true,
        // Optimize conditionals
        conditionals: true,
        // Optimize booleans
        booleans: true,
        // Remove unused variables
        unused: true,
        // Optimize if statements
        if_return: true,
        // Join consecutive statements
        sequences: true,
        // Optimize property access
        properties: true,
      },
      mangle: {
        // Mangle variable names for obfuscation
        toplevel: true,
        // Keep class names intact (needed for some features)
        keep_classnames: false,
        // Keep function names intact
        keep_fnames: false,
        // Reserved names that should not be mangled
        reserved: ['__ALLYNC_PROTECTED__', '__COPYRIGHT__'],
      },
      format: {
        // Remove comments
        comments: false,
        // Compact output
        beautify: false,
      },
    },

    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,

    // Rollup options
    rollupOptions: {
      output: {
        // Randomize chunk names to make reverse engineering harder
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',

        // Manual chunks for better code splitting
        manualChunks: {
          'vendor-three': ['three'],
          'vendor-gsap': ['gsap'],
        },
      },
    },

    // Target modern browsers only
    target: 'es2020',

    // CSS code splitting
    cssCodeSplit: true,

    // Asset inlining threshold (4kb)
    assetsInlineLimit: 4096,
  },

  // ═══════════════════════════════════════════════════════════════
  // SERVER CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  server: {
    // Development server port
    port: 3000,
    // Open browser on start
    open: true,
    // Enable CORS
    cors: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // PREVIEW CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  preview: {
    port: 4173,
  },

  // ═══════════════════════════════════════════════════════════════
  // OPTIMIZATION
  // ═══════════════════════════════════════════════════════════════
  optimizeDeps: {
    include: ['three', 'gsap'],
  },

  // ═══════════════════════════════════════════════════════════════
  // DEFINE GLOBAL CONSTANTS
  // ═══════════════════════════════════════════════════════════════
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __COPYRIGHT__: JSON.stringify('© 2025 Allync. All Rights Reserved.'),
  },
});
