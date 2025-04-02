// js/main.js
import { NavigationManager } from './NavigationManager.js';
import { DiagramLoader } from './DiagramLoader.js';
import { TreeVisualizer } from './TreeVisualizer.js';

document.addEventListener('DOMContentLoaded',  async () => {
    // Initialize navigation
    const navManager = new NavigationManager('nav-container');
    await navManager.init();
    // Initialize visualizer
    const visualizer = new TreeVisualizer('#visualization');
    const diagramLoader = new DiagramLoader(visualizer);

        // Handle appendix selection
    document.addEventListener('appendix-changed', (e) => {
        console.log('Appendix selected:', e.detail);
        diagramLoader.loadAppendix(e.detail);
    });

        // Initialize with first appendix
    diagramLoader.loadAppendix(navManager.appendices[0]);
    
    // Reset button
    document.getElementById('resetButton').addEventListener('click', () => {
        visualizer.resetView();
    });
});