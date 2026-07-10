import { defineConfig } from 'vite';
import { sync } from 'glob';
import { copyFileSync, mkdirSync, existsSync, readdirSync, copyFileSync as copyDirSync } from 'fs';
import { join, dirname } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
        login: './auth/login.html',
        register: './auth/register.html'
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  plugins: [
    {
      name: 'copy-static-files',
      writeBundle() {
        // Copy all HTML files to dist
        const htmlFiles = sync('**/*.html', {
          cwd: '.',
          ignore: ['node_modules/**', 'dist/**']
        });
        
        htmlFiles.forEach(file => {
          const src = join('.', file);
          const dest = join('dist', file);
          const destDir = dirname(dest);
          
          if (!existsSync(destDir)) {
            mkdirSync(destDir, { recursive: true });
          }
          
          copyFileSync(src, dest);
        });

        // Copy js directory
        const copyDir = (src, dest) => {
          if (!existsSync(dest)) {
            mkdirSync(dest, { recursive: true });
          }
          const entries = readdirSync(src, { withFileTypes: true });
          for (const entry of entries) {
            const srcPath = join(src, entry.name);
            const destPath = join(dest, entry.name);
            if (entry.isDirectory()) {
              copyDir(srcPath, destPath);
            } else {
              copyFileSync(srcPath, destPath);
            }
          }
        };

        if (existsSync('js')) {
          copyDir('js', 'dist/js');
        }

        // Copy assets directory
        if (existsSync('assets')) {
          copyDir('assets', 'dist/assets');
        }

        // Copy data directory
        if (existsSync('data')) {
          copyDir('data', 'dist/data');
        }
      }
    }
  ]
});
