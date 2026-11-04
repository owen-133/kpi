import {defineConfig} from 'vite';
import {svelte} from '@sveltejs/vite-plugin-svelte';
export default defineConfig({plugins:[svelte()],build:{outDir:'../public/board',emptyOutDir:true,minify:true,lib:{entry:'src/main.js',formats:['es'],fileName:()=> 'board.js',cssFileName:'board'},rollupOptions:{output:{inlineDynamicImports:true}}}});
