export class NavigationManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.appendices = [];
        this.filteredAppendices = [];

                // Bind methods to maintain 'this' context
        this.filterAppendices = this.filterAppendices.bind(this);
        this.searchAppendices = this.searchAppendices.bind(this);
    }

        // Add these new methods
    filterAppendices(category) {
        this.filteredAppendices = category.toLowerCase() === 'all' 
            ? this.appendices 
            : this.appendices.filter(a => a.category.toLowerCase() === category.toLowerCase());
        
        this.renderList();
    }

    searchAppendices(query) {
        const searchTerm = query.toLowerCase();
        this.filteredAppendices = this.appendices.filter(a => 
            a.name.toLowerCase().includes(searchTerm) ||
            a.category.toLowerCase().includes(searchTerm)
        );
        this.renderList();
    }

    renderList() {
        const listContainer = this.container.querySelector('.appendix-list');
        listContainer.innerHTML = this.filteredAppendices.map(appendix => `
            <div class="appendix-item" data-id="${appendix.id}">
                <h3>${appendix.name}</h3>
                <span class="category">${appendix.category}</span>
            </div>
        `).join('');
        
        this.addEventListeners();
    }

    async init() {
        const res = await fetch('./data/config.json');
        const config = await res.json();
        this.appendices = config.appendices;
        this.filteredAppendices = [...this.appendices];
        this.render(); // Initialize with full list
    }

    render() {
        this.container.innerHTML = `
            <nav class="appendix-nav">
                <div class="nav-header">
                    <h2>UK Immigration Rules Visualizer</h2>
                    <div class="nav-controls">
                        <div class="search-box">
                            <input type="text" placeholder="Search appendices...">
                        </div>
                        <div class="category-filter">
                            <select>
                                <option value="all">All Categories</option>
                                ${[...new Set(this.appendices.map(a => a.category))].map(c => `
                                    <option value="${c.toLowerCase()}">${c}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                <div class="appendix-list"></div>
            </nav>
        `;
        
        this.renderList();
        this.addEventListeners();
    }

    addEventListeners() {
        // Category filter
        this.container.querySelector('.category-filter select')
            .addEventListener('change', (e) => this.filterAppendices(e.target.value));
        
        // Search input
        this.container.querySelector('.search-box input')
            .addEventListener('input', (e) => this.searchAppendices(e.target.value));
        
        // Item clicks
        this.container.querySelectorAll('.appendix-item').forEach(item => {
            item.addEventListener('click', () => {
                const appendix = this.appendices.find(a => a.id === item.dataset.id);
                this.onAppendixSelected(appendix);
            });
        });
    }

    onAppendixSelected(appendix) {
        console.log("Selected appendix:", appendix);
        if (!appendix?.configPath) {
            console.error("Invalid appendix config:", appendix);
            return;
        }
        
        const event = new CustomEvent('appendix-changed', {
            detail: appendix
        });
        document.dispatchEvent(event);
    }
}