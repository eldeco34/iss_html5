export class DiagramLoader {
    constructor(visualizer) {
        this.visualizer = visualizer;
    }

    // Add to DiagramLoader.js
    // const SECTION_SCHEMA = {
    //     type: "object",
    //     required: ["sectionTitle", "rules"],
    //     properties: {
    //         sectionTitle: { type: "string" },
    //         sectionDescription: { type: "string" },
    //         rules: {
    //             type: "array",
    //             items: {
    //                 type: "object",
    //                 required: ["ruleCode"],
    //                 properties: {
    //                     ruleCode: { type: "string" },
    //                     ruleDescription: { type: "string" },
    //                     requirements: { type: "array" }
    //                 }
    //             }
    //         }
    //     }
    // };

    async loadAppendix(appendixConfig) {
        try {
            // Validate input thoroughly
            if (!appendixConfig) {
                throw new Error("No appendix configuration provided");
            }
    
            console.group('Appendix Loading');
            console.log('Appendix Config:', appendixConfig);
    
            // Validate configuration
            if (!appendixConfig.configPath) {
                throw new Error(`Invalid appendix config: Missing configPath for ${appendixConfig.name}`);
            }
    
            const fullConfigPath = `./data/${appendixConfig.configPath}`;
            console.log("Loading config from:", fullConfigPath);
            
            // Load appendix-specific config
            const configRes = await fetch(fullConfigPath);
            if (!configRes.ok) {
                throw new Error(`Config load failed: ${configRes.status} for ${fullConfigPath}`);
            }
            
            const config = await configRes.json();
            console.log("Loaded config:", config);
    
            // Validate config structure
            if (!config?.endpoints || !Array.isArray(config.endpoints)) {
                throw new Error("Invalid config format: Missing or invalid endpoints");
            }
    
            // Load data files
            const basePath = appendixConfig.configPath.split('/')[0];
            console.log("Base path:", basePath);
            
            const data = await Promise.all(
                config.endpoints.map(async (endpoint) => {
                    const fullEndpointPath = `./data/${basePath}/${endpoint}`;
                    console.log(`Loading endpoint: ${fullEndpointPath}`);
                    
                    try {
                        const response = await fetch(fullEndpointPath);
                        if (!response.ok) {
                            console.error(`Failed to load endpoint: ${fullEndpointPath}`);
                            return null;
                        }
                        const jsonData = await response.json();
                        console.log(`Loaded endpoint ${endpoint}:`, jsonData);
                        return jsonData;
                    } catch (error) {
                        console.error(`Endpoint load error for ${fullEndpointPath}:`, error);
                        return null;
                    }
                })
            );
    
            // Detailed logging for data loading
            console.log("Raw loaded data:", data);
            
            // Filter out failed loads
            const validData = data.filter(Boolean);
            if (validData.length === 0) {
                throw new Error("No valid data loaded from endpoints");
            }
    
            // Transform and update
            const transformed = this.transformData(validData, config.name || appendixConfig.name);
            console.log("Final transformed data:", transformed);
            
            // Additional validation
            if (!transformed || !transformed.children || transformed.children.length === 0) {
                throw new Error("Transformed data is empty");
            }
    
            // Ensure method is called with complete data
            this.visualizer.updateData(transformed);
    
            console.groupEnd();
    
        } catch (error) {
            console.error("Load failed:", error);
            console.groupEnd();
            
            // More informative error handling
            this.visualizer.showError(`Failed to load appendix: ${error.message}`);
            
            // Fallback with minimal data structure
            this.visualizer.updateData({
                name: appendixConfig.name || "Unnamed Appendix",
                children: []
            });
        }
    }

    transformData(rawData, title) {
        return {
            name: title,
            children: rawData.filter(section => 
                section?.rules?.length > 0
            ).map(section => ({
                name: section.sectionTitle,
                description: section.sectionDescription,
                children: section.rules.map(rule => ({
                    name: rule.ruleCode,
                    description: rule.ruleDescription,
                    requirements: rule.requirements,
                    type: 'leaf-node'
                }))
            }))
        };
    }
}