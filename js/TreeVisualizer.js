// js/treeVisualizer.js
export class TreeVisualizer {
    constructor(containerSelector) {
        this.container = d3.select(containerSelector);
        this.data = null;
        this.margin = { top: 20, right: 120, bottom: 20, left: 120 };
        this.duration = 750;
        this.nodeWidth = 280;
        this.nodeHeight = 160;
        this.detailsPanel = d3.select("#detailsPanel");
        this.currentRoot = null;
        this.g = null; 
        // Responsive breakpoints
        this.breakpoints = {
            mobile: 768,
            tablet: 1024
        };
        this.zoom = null; // Initialize zoom reference
        this.initZoom(); // Create zoom behavior early

        this.init();
    }

    initZoom() {
        this.zoom = d3.zoom()
            .scaleExtent([0.5, 5])
            .on('zoom', (event) => {
                if (this.g) this.g.attr('transform', event.transform);
            });
    }

    init() {
        try {
            this.createSVG();
            if (this.g) { // Null check
                this.updateVisualization();
            }
            this.addEventListeners();
        } catch (error) {
            this.handleError(error);
        }
    }
    updateData(newData) {
        console.log('Received new data:', newData);
        
        // Ensure the data has the correct structure
        if (!newData || !newData.children) {
            console.error('Invalid data structure:', newData);
            this.container.html('<div class="alert alert-danger">Invalid data structure</div>');
            return;
        }
    
        // Explicitly set this.data
        this.data = newData;
        
        // Force complete redraw
        if (this.svg) {
            this.svg.selectAll('*').remove();
        }
        
        this.createSVG();
        
        // Explicitly create hierarchy
        this.root = d3.hierarchy(this.data);
        
        // Update visualization
        this.updateVisualization();
        
        console.log('Updated data:', this.data);
        console.log('Root hierarchy:', this.root);
    }

    createSVG() {
        // Remove existing elements first
        this.container.select('svg').remove();
    
        const { width, height } = this.calculateDimensions();
        
        this.svg = this.container
            .append('svg')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .call(this.zoom);
    
        // Initialize g element
        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }

    calculateDimensions() {
        const container = this.container.node();
        if (!container) return { width: 0, height: 0 };
        
        const isMobile = container.offsetWidth < this.breakpoints.mobile;
        return {
            width: isMobile ? container.offsetWidth : 1400,
            height: isMobile ? 600 : 800
        };
    }

    updateVisualization() {
        console.log('Data:', this.data);
        console.log('Data children:', this.data?.children);
        try {
            console.log('Data:', this.data);
            console.log('Data children:', this.data?.children);
            // Clear previous visualization
            if (this.g) {
                this.g.selectAll('.node').remove();
                this.g.selectAll('.link').remove();
            }
    
            // Check for valid data structure
            if (!this.data?.children || this.data.children.length === 0) {
                console.log('No visualizable data available');
                return;
            }
    
            // Create root hierarchy
            const root = d3.hierarchy(this.data);
            
            // Calculate dimensions
            const { width, height } = this.calculateDimensions();
            const treeLayout = d3.tree()
                .size([height - this.margin.top - this.margin.bottom, 
                      width - this.margin.left - this.margin.right]);
    
            // Generate tree layout
            treeLayout(root);
    
            // Create link generator
            const linkGenerator = d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x);
    
            // Process links
            const links = this.g.selectAll('.link')
                .data(root.links(), d => d.target.data.name)
                .join(
                    enter => enter.append('path')
                        .attr('class', 'link')
                        .attr('d', linkGenerator)
                        .style('opacity', 0)
                        .transition()
                        .duration(this.duration)
                        .style('opacity', 1),
                    update => update,
                    exit => exit.remove()
                );
    
        // Process nodes
        const nodes = this.g.selectAll('.node')
            .data(root.descendants(), d => d.data.name + d.depth)
            .join(
                enter => {
                    return enter.append('g')
                        .attr('class', 'node')
                        .attr('transform', d => `translate(${d.y},${d.x})`)
                        .style('opacity', 0)
                        .call(node => {
                            node.transition()
                                .duration(this.duration)
                                .style('opacity', 1);

                            node.append('circle')
                                .attr('r', 8)
                                .attr('fill', d => d.children ? '#3182bd' : '#c6dbef')
                                .attr('stroke', '#1d4e89')
                                .attr('stroke-width', 1.5);

                            node.append('text')
                                .attr('dx', d => d.children ? -12 : 12)
                                .attr('dy', '0.31em')
                                .attr('text-anchor', d => d.children ? 'end' : 'start')
                                .text(d => d.data.name)
                                .call(this.wrapText);
                        });
                },
                update => update,
                exit => exit.transition()
                    .duration(this.duration)
                    .style('opacity', 0)
                    .remove()
            );
    
            // Update node positions
            nodes.attr('transform', d => `translate(${d.y},${d.x})`);
    
            // Add interactivity
            nodes.on('click', (event, d) => this.handleNodeClick(d))
                .on('mouseover', (event, d) => this.showTooltip(event, d))
                .on('mouseout', () => this.hideTooltip());
    
            // Update links
            links.attr('d', linkGenerator);
    
            // Initialize zoom behavior
            if (!this.zoom) {
                this.zoom = d3.zoom()
                    .scaleExtent([0.5, 5])
                    .on('zoom', (event) => {
                        this.g.attr('transform', event.transform);
                    });
                
                this.svg.call(this.zoom);
            }
    
            // Reset view to center
            this.resetView(true);
    
        } catch (error) {
            console.error('Visualization error:', error);
            this.container.html(`
                <div class="alert alert-danger">
                    Rendering failed: ${error.message}
                    <div class="mt-2">${error.stack}</div>
                </div>
            `);
        }
    }
    
    validateDataStructure() {
        return this.data?.children?.some(section => 
            section?.children?.length > 0
        );
    }

    handleNodeClick(d) {
        // Store current state
        this.currentRoot = this.root;
        
        if (d.children) {
            // Toggle collapse/expand for parent nodes
            d._children = d.children;
            d.children = null;
            this.updateVisualization();
        } else {
            // Show details for leaf nodes
            this.showDetails(d.data);
            d3.select('#resetButton').style('display', 'block');
        }
    }

    showDetails(nodeData) {
        if (!nodeData) return;
    
        // Ensure valid content
        const content = `
            <h3>${nodeData.name || "Unnamed Rule"}</h3>
            ${nodeData.description ? `<p>${nodeData.description}</p>` : ''}
            ${nodeData.requirements?.length ? `
                <h4>Requirements:</h4>
                <ul>${nodeData.requirements.map(r => `<li>${r}</li>`).join('')}</ul>
            ` : ''}
            <button class="close-btn" onclick="this.closest('.details-panel').style.display='none'">
                Close
            </button>
        `;
    
        this.detailsPanel
            .style('display', 'block')
            .html(content);
    }

    getViewBox() {
        const { width, height } = this.calculateDimensions();
        return `0 0 ${width} ${height}`;
    }

    resetView(immediate = false) {
        const baseX = this.margin.left;
        const baseY = this.margin.top;
        const resetTransform = d3.zoomIdentity
            .translate(baseX, baseY)
            .scale(1);
    
        if (immediate) {
            this.svg.call(this.zoom.transform, resetTransform);
        } else {
            this.svg.transition()
                .duration(500)
                .call(this.zoom.transform, resetTransform);
        }
    }

    wrapText(selection) {
        selection.each(function() {
            const text = d3.select(this);
            const words = text.text().split(/\s+/);
            const lineHeight = 1.2;
            const y = text.attr('y');
            
            text.text(null)
                .selectAll('tspan')
                .data(words)
                .enter()
                .append('tspan')
                .attr('x', 0)
                .attr('y', (d, i) => y + (i * lineHeight * 10))
                .text(d => d);
        });
    }

    addEventListeners() {
        // Window resize handler only
        if (!this.svg) return;
    
        window.addEventListener('resize', () => {
            this.svg.remove();
            this.createSVG();
            this.updateVisualization();
        });
    }

    showTooltip(event, d) {
        const tooltipContent = `
            <strong>${d.data.name}</strong>
            ${d.data.description ? `<p>${d.data.description}</p>` : ''}
            ${d.data.requirements ? `
                <ul>
                    ${d.data.requirements.map(r => `<li>${r}</li>`).join('')}
                </ul>
            ` : ''}
        `;

        this.container.append('div')
            .classed('tooltip', true)
            .style('left', `${event.pageX + 15}px`)
            .style('top', `${event.pageY - 28}px`)
            .html(tooltipContent);
    }

    hideTooltip() {
        this.container.selectAll('.tooltip').remove();
    }

    handleError(error) {
        console.error('Visualization error:', error);
        this.container.html(`
            <div class="alert alert-danger">
                Error loading visualization: ${error.message}
            </div>
        `);
    }
    showError(message) {
        this.container.html(`
            <div class="alert alert-danger">
                ${message}<br>
                <small>Please try another appendix</small>
            </div>
        `);
    }
    createNodes(enter) {
        const node = enter.append('g')
            .attr('class', 'node')
            .on('click', (e, d) => this.handleNodeClick(d));
    
        node.append('circle')
            .attr('r', 8)
            .attr('fill', '#fff')
            .attr('stroke', '#3498db')
            .attr('stroke-width', 2);
    
        node.append('text')
            .attr('dy', '0.31em')
            .attr('x', d => d.children ? -12 : 12)
            .attr('text-anchor', d => d.children ? 'end' : 'start')
            .text(d => d.data.name);
    
        return node;
    }
    
    createLinks(enter) {
        return enter.append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', '#95a5a6')
            .attr('stroke-width', 1.5)
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x));
    }
}