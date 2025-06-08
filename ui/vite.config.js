import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import Sitemap from 'vite-plugin-sitemap'
import path from 'path'
import {fileURLToPath} from 'url'
import tailwindcss from "@tailwindcss/vite"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        Sitemap({
            outDir: path.resolve(__dirname, '../app/src/main/resources/static')
        })
    ],
    watch: {
        include: 'src/**'
    },    build: {
        sourcemap: true,
        emptyOutDir: true,
        outDir: '../app/src/main/resources/static',
        rollupOptions: {
            output: {
                manualChunks: {
                    // React and React-related libraries
                    'react-vendor': ['react', 'react-dom'],
                    
                    // Material-UI components
                    'mui-core': ['@mui/material', '@emotion/react', '@emotion/styled'],
                    'mui-icons': ['@mui/icons-material'],
                    
                    // Icons and UI utilities
                    'icons': ['react-icons', 'lucide-react'],
                    
                    // State management and utilities
                    'state-utils': ['xstate', '@xstate/react'],
                    
                    // Communication libraries
                    'communication': ['axios', '@stomp/stompjs'],
                    
                    // Authentication and security
                    'auth': ['@auth0/auth0-react', 'jwt-decode'],
                    
                    // Content processing
                    'content': ['react-markdown']
                }
            }
        }
    }
})
