/**
 * Entry point for the Akashi sidebar webview (React).
 * Runs in the webview; communicates with the extension host via postMessage.
 */

import { createRoot } from 'react-dom/client';
import { SidebarApp } from './App';
import './styles.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Akashi: #root element not found');
}
const root = createRoot(container);
root.render(<SidebarApp />);
