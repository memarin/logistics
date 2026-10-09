import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Relay | Agentic Logistics PoC',description:'A guided warehouse demo with simulated agents, human approvals, and traceable actions.',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
