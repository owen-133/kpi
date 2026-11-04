import {defineConfig} from 'vite';
export default defineConfig({build:{outDir:'../public/pdf',emptyOutDir:true,lib:{entry:'src/report-pdf.js',formats:['es'],fileName:()=> 'report-pdf.js'},rollupOptions:{output:{inlineDynamicImports:true}}}});
