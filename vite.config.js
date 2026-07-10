import { defineConfig } from 'vite';
import { sync } from 'glob';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
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
      name: 'copy-html-files',
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
      }
    }
  ]
});
