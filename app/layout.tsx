import './globals.css';
import type { Metadata, Viewport } from 'next';
export const metadata: Metadata = { title:'AWS Hack — Artificial Workstation System Hack', description:'Legal simuliertes Jarvis Cyber-OS als PWA.', manifest:'/manifest.webmanifest' };
export const viewport: Viewport = { themeColor:'#020604', width:'device-width', initialScale:1, viewportFit:'cover' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="de"><body>{children}</body></html>}
