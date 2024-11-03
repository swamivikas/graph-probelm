import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
const app = express();

app.use(express.json());
app.use(bodyParser.json());
const db = new pg.Client({
    user : "postgres",
    host  : "localhost",
    database : "graphs",
    password : ".........",
    port : 5432,
  
  });

db.connect((err) => {
    if (err) {
        console.error('Connection error', err.stack);
    } else {
        console.log('Connected to the database');
    }
});



app.post('/create-graph', async (req, res) => {
    const { graphId, graphName } = req.body;

    try {
        const insertGraphQuery = `INSERT INTO graphs (graph_id, graph_name) VALUES ($1, $2)`;
        await db.query(insertGraphQuery, [graphId, graphName]);

        res.status(201).send(`Graph ${graphName} created successfully with ID ${graphId}.`);
    } catch (error) {
        console.error('Error creating graph:', error);
        res.status(500).send('An error occurred while creating the graph.');
    }
});




app.post('/create-edge', async (req, res) => {
    const { graphId, srcNode, dstNode, srcToDstDataKeys } = req.body;

    try {
        // Check if both srcNode and dstNode exist in the same graph
        const srcNodeQuery = `SELECT * FROM nodes WHERE node_id = $1 AND graph_id = $2`;
        const dstNodeQuery = `SELECT * FROM nodes WHERE node_id = $1 AND graph_id = $2`;
        
        const srcNodeResult = await db.query(srcNodeQuery, [srcNode, graphId]);
        const dstNodeResult = await db.query(dstNodeQuery, [dstNode, graphId]);

        if (srcNodeResult.rows.length === 0) {
            return res.status(404).send(`Source node ${srcNode} not found in graph ${graphId}.`);
        }

        if (dstNodeResult.rows.length === 0) {
            return res.status(404).send(`Destination node ${dstNode} not found in graph ${graphId}.`);
        }

        // Insert the edge into the edges table
        const insertEdgeQuery = `INSERT INTO edges (graph_id, src_node, dst_node, src_to_dst_data_keys) VALUES ($1, $2, $3, $4)`;
        await db.query(insertEdgeQuery, [graphId, srcNode, dstNode, srcToDstDataKeys]);

        res.status(201).send(`Edge from ${srcNode} to ${dstNode} created successfully in graph ${graphId}.`);
    } catch (error) {
        console.error('Error creating edge:', error);
        res.status(500).send('An error occurred while creating the edge.');
    }
});

// Delete Node
app.delete('/delete-node/:graphId/:nodeId', async (req, res) => {
    const { graphId, nodeId } = req.params;

    try {
        // First, delete all edges connected to this node within the specified graph
        const deleteEdgesQuery = `DELETE FROM edges WHERE (src_node = $1 OR dst_node = $1) AND graph_id = $2`;
        await db.query(deleteEdgesQuery, [nodeId, graphId]);

        // Then, delete the node itself from the specified graph
        const deleteNodeQuery = `DELETE FROM nodes WHERE node_id = $1 AND graph_id = $2`;
        await db.query(deleteNodeQuery, [nodeId, graphId]);

        res.status(200).send(`Node ${nodeId} from graph ${graphId} and its connected edges deleted successfully.`);
    } catch (error) {
        console.error('Error deleting node:', error);
        res.status(500).send('An error occurred while deleting the node.');
    }
});



// Delete Edge
app.delete('/delete-edge/:graphId/:srcNode/:dstNode', async (req, res) => {
    const { graphId, srcNode, dstNode } = req.params;

    try {
        const deleteEdgeQuery = `DELETE FROM edges WHERE src_node = $1 AND dst_node = $2 AND graph_id = $3`;
        const result = await db.query(deleteEdgeQuery, [srcNode, dstNode, graphId]);

        if (result.rowCount > 0) {
            res.status(200).send(`Edge from ${srcNode} to ${dstNode} in graph ${graphId} deleted successfully.`);
        } else {
            res.status(404).send(`Edge from ${srcNode} to ${dstNode} in graph ${graphId} not found.`);
        }
    } catch (error) {
        console.error('Error deleting edge:', error);
        res.status(500).send('An error occurred while deleting the edge.');
    }
});


// Create Node
app.post('/create-node', async (req, res) => {
    const { graphId, nodeId, dataIn, dataOut } = req.body;

    try {
        const insertNodeQuery = `INSERT INTO nodes (graph_id, node_id, data_in, data_out, paths_in, paths_out) VALUES ($1, $2, $3, $4, '[]', '[]')`;
        await db.query(insertNodeQuery, [graphId, nodeId, dataIn, dataOut]);

        res.status(201).send(`Node ${nodeId} in graph ${graphId} created successfully.`);
    } catch (error) {
        console.error('Error creating node:', error);
        res.status(500).send('An error occurred while creating the node.');
    }
});



// Edit Edge
app.put('/edit-edge/:graphId/:srcNode/:dstNode', async (req, res) => {
    const { graphId, srcNode, dstNode } = req.params;
    const { srcToDstDataKeys } = req.body;

    try {
        const updateEdgeQuery = `UPDATE edges SET src_to_dst_data_keys = $1 WHERE src_node = $2 AND dst_node = $3 AND graph_id = $4`;
        const result = await db.query(updateEdgeQuery, [srcToDstDataKeys, srcNode, dstNode, graphId]);

        if (result.rowCount > 0) {
            res.status(200).send(`Edge from ${srcNode} to ${dstNode} in graph ${graphId} updated successfully.`);
        } else {
            res.status(404).send(`Edge from ${srcNode} to ${dstNode} in graph ${graphId} not found.`);
        }
    } catch (error) {
        console.error('Error editing edge:', error);
        res.status(500).send('An error occurred while editing the edge.');
    }
});




// Function to get all nodes from the database for a specific graph
async function getAllNodes(graphId) {
    try {
        const result = await db.query('SELECT * FROM nodes WHERE graph_id = $1', [graphId]);
        return result.rows;
    } catch (error) {
        console.error('Error fetching nodes:', error);
        throw new Error('Failed to retrieve nodes from the database');
    }
}

// Function to get data for all nodes in a specific graph
async function getAllNodesData(graphId) {
    try {
        let allNodes = await getAllNodes(graphId);  // Fetch all nodes for the specified graph
        let nodeData = allNodes.map(node => {
            return {
                node_id: node.node_id,
                data_in: node.data_in,
                data_out: node.data_out
            };
        });
        return nodeData;
    } catch (error) {
        console.error("Error fetching nodes data:", error);
        throw new Error("Failed to retrieve node data");
    }
}

// Function to get a single node from the database for a specific graph
async function getNode(graphId, nodeId) {
    try {
        const result = await db.query('SELECT * FROM nodes WHERE graph_id = $1 AND node_id = $2', [graphId, nodeId]);
        if (result.rows.length === 0) {
            throw new Error(`Node with ID ${nodeId} not found in graph ${graphId}`);
        }
        return result.rows[0];
    } catch (error) {
        console.error('Error fetching node:', error);
        throw new Error('Failed to retrieve node from the database');
    }
}

// Function to get all edges for a specific node in a specific graph
async function getEdgesForNode(graphId, nodeId) {
    try {
        const result = await db.query('SELECT * FROM edges WHERE graph_id = $1 AND src_node = $2', [graphId, nodeId]);
        return result.rows;
    } catch (error) {
        console.error('Error fetching edges for node:', error);
        throw new Error('Failed to retrieve edges from the database');
    }
}

// Function to update the 'data_in' of a node in the database for a specific graph
async function updateNodeDataIn(graphId, nodeId, dataInValue) {
    try {
        const query = 'UPDATE nodes SET data_in = $1 WHERE graph_id = $2 AND node_id = $3';
        const values = [dataInValue, graphId, nodeId];
        await db.query(query, values);
        console.log(`Successfully updated data_in for node: ${nodeId} in graph ${graphId}`);
    } catch (error) {
        console.error(`Error updating data_in for node ${nodeId} in graph ${graphId}:`, error);
        throw new Error('Failed to update data_in');
    }
}

async function runConfig(graphId, src_node, dst_node, root_inputs = {}, data_overwrites = {}, enable_list = [], disable_list = []) {
    try {
        let queue = [src_node];
        let visited = new Set();
        let nodeLevels = {};
        nodeLevels[src_node] = 0;
        let dataFlowComplete = false;
        let overwriteTracker = {};

        // Ensure root_inputs is a valid object before iterating
        if (root_inputs && typeof root_inputs === 'object' && Object.keys(root_inputs).length > 0) {
            // Handle root inputs
            for (let [nodeId, dataIn] of Object.entries(root_inputs)) {
                await updateNodeDataIn(graphId, nodeId, dataIn);  // Set the provided root node data_in
            }
        } else {
            console.warn("Warning: No root inputs provided or root_inputs is not an object.");
        }

        // Ensure data_overwrites is a valid object before applying overwrites
        if (data_overwrites && typeof data_overwrites === 'object' && Object.keys(data_overwrites).length > 0) {
            // Apply data overwrites before the run starts
            for (let [nodeId, overwrites] of Object.entries(data_overwrites)) {
                let node = await getNode(graphId, nodeId);
                for (let [key, value] of Object.entries(overwrites)) {
                    node.data_in[key] = value;
                }
                node.data_out = { ...node.data_in };  // Set data_out based on overwritten data_in
                console.log(`Applied overwrites for Node ${nodeId}:`, node.data_in);
                await updateNodeDataIn(graphId, nodeId, node.data_in);  // Save overwritten data to database
            }
        } else {
            console.warn("Warning: No data overwrites provided or data_overwrites is not an object.");
        }

        // Handle enabled and disabled lists
        let activeNodes = new Set();
        if (enable_list.length > 0) {
            activeNodes = new Set(enable_list);  // Only consider nodes in the enable list
        } else if (disable_list.length > 0) {
            // Exclude nodes from disable list
            let allNodes = await getAllNodes(graphId);
            for (let node of allNodes) {
                if (!disable_list.includes(node.node_id)) {
                    activeNodes.add(node.node_id);
                }
            }
        }

        while (queue.length > 0) {
            let currentNodeId = queue.shift();

            // Skip if node is not enabled
            if (activeNodes.size > 0 && !activeNodes.has(currentNodeId)) {
                continue;
            }

            if (visited.has(currentNodeId)) {
                continue;
            }
            visited.add(currentNodeId);

            let currentNode = await getNode(graphId, currentNodeId);
            console.log(`Processing Node: ${currentNodeId}, Data In:`, currentNode.data_in, `Data Out:`, currentNode.data_out);

            let outgoingEdges = await getEdgesForNode(graphId, currentNodeId);
            let currentLevel = nodeLevels[currentNodeId];

            for (let edge of outgoingEdges) {
                let dstNodeId = edge.dst_node;
                let dstNode = await getNode(graphId, dstNodeId);

                if (!overwriteTracker[dstNodeId]) {
                    overwriteTracker[dstNodeId] = {};
                }

                if (edge.src_to_dst_data_keys) {
                    for (let [srcKey, dstKey] of Object.entries(edge.src_to_dst_data_keys)) {
                        let overwriteInfo = overwriteTracker[dstNodeId][dstKey];

                        // Check if data should be overwritten based on level
                        if (!overwriteInfo || overwriteInfo.level < currentLevel ||
                            (overwriteInfo.level === currentLevel && overwriteInfo.srcNodeId > currentNodeId)) {

                            // Transfer data from current node (src) to destination node (dst)
                            dstNode.data_in[dstKey] = currentNode.data_out[srcKey];
                            console.log(`Node ${currentNodeId} -> Node ${dstNodeId}, ${srcKey}: ${currentNode.data_out[srcKey]} to ${dstKey}`);

                            // Update overwrite tracker
                            overwriteTracker[dstNodeId][dstKey] = {
                                srcNodeId: currentNodeId,
                                level: currentLevel
                            };

                            // After setting data_in, set data_out to the same value
                            dstNode.data_out[dstKey] = dstNode.data_in[dstKey];
                            console.log(`Updated Node ${dstNodeId} Data Out:`, dstNode.data_out);
                        }
                    }
                }

                // Only update in memory, no database calls
                currentNode.data_out = { ...currentNode.data_in };
                console.log(`Updated Node ${currentNodeId} Data Out (in-memory):`, currentNode.data_out);

                // Stop if data reached destination
                if (dstNodeId === dst_node) {
                    dataFlowComplete = true;
                    break;
                }

                if (!visited.has(dstNodeId) && (!activeNodes.size || activeNodes.has(dstNodeId))) {
                    queue.push(dstNodeId);
                    nodeLevels[dstNodeId] = currentLevel + 1;
                }
            }

            if (dataFlowComplete) {
                break;
            }
        }

        // Return in-memory node data for debugging purposes
        return await getAllNodesData(graphId);
    } catch (error) {
        console.error("An error occurred while processing the graph:", error);
        return { error: "An error occurred while processing the graph." };
    }
}



// Topological Sort
app.get('/toposort/:graphId', async (req, res) => {
    const { graphId } = req.params;
    try {
        // Get all nodes and edges for the specified graph
        const nodesResult = await db.query('SELECT * FROM nodes WHERE graph_id = $1', [graphId]);
        const edgesResult = await db.query('SELECT * FROM edges WHERE graph_id = $1', [graphId]);

        const nodes = nodesResult.rows;
        const edges = edgesResult.rows;

        const graph = {};
        const indegree = {};

        // Initialize graph and indegree count
        nodes.forEach(node => {
            graph[node.node_id] = [];
            indegree[node.node_id] = 0;
        });

        // Build the graph
        edges.forEach(edge => {
            graph[edge.src_node].push(edge.dst_node);
            indegree[edge.dst_node]++;
        });

        // Perform topological sort
        const queue = [];
        for (const node in indegree) {
            if (indegree[node] === 0) {
                queue.push(node);
            }
        }

        const sortedOrder = [];
        while (queue.length > 0) {
            const currentNode = queue.shift();
            sortedOrder.push(currentNode);

            graph[currentNode].forEach(neighbor => {
                indegree[neighbor]--;
                if (indegree[neighbor] === 0) {
                    queue.push(neighbor);
                }
            });
        }

        // Check for cycle
        if (sortedOrder.length !== nodes.length) {
            return res.status(400).send('Graph has at least one cycle.');
        }

        res.status(200).json(sortedOrder);
    } catch (error) {
        console.error('Error performing topological sort:', error);
        res.status(500).send('An error occurred while performing the topological sort.');
    }
});

// Islands (Connected Components)
app.get('/islands/:graphId', async (req, res) => {
    const { graphId } = req.params;
    try {
        // Get all nodes and edges for the specified graph
        const nodesResult = await db.query('SELECT * FROM nodes WHERE graph_id = $1', [graphId]);
        const edgesResult = await db.query('SELECT * FROM edges WHERE graph_id = $1', [graphId]);

        const nodes = nodesResult.rows;
        const edges = edgesResult.rows;

        const graph = {};
        const visited = {};

        // Initialize graph
        nodes.forEach(node => {
            graph[node.node_id] = [];
            visited[node.node_id] = false;
        });

        // Build the graph
        edges.forEach(edge => {
            graph[edge.src_node].push(edge.dst_node);
            graph[edge.dst_node].push(edge.src_node); // Undirected graph
        });

        const islands = [];

        const dfs = (node, island) => {
            visited[node] = true;
            island.push(node);

            graph[node].forEach(neighbor => {
                if (!visited[neighbor]) {
                    dfs(neighbor, island);
                }
            });
        };

        // Find connected components (islands)
        for (const node in visited) {
            if (!visited[node]) {
                const island = [];
                dfs(node, island);
                islands.push(island);
            }
        }

        res.status(200).json(islands);
    } catch (error) {
        console.error('Error finding islands:', error);
        res.status(500).send('An error occurred while finding the islands.');
    }
});

// API endpoint to process graph flow
app.post('/run_config/:graphId', async (req, res) => {
    const { graphId } = req.params;
    const { src_node, dst_node } = req.body;
    console.log(req.body);
    if (!src_node || !dst_node) {
        return res.status(400).json({ error: 'src_node and dst_node are required' });
    }

    try {
        // Run the graph traversal and data propagation
        const finalNodeStates = await runConfig(src_node, dst_node, graphId);
        return res.status(200).json(finalNodeStates);
    } catch (error) {
        console.error('Error in run_config:', error);
        return res.status(500).json({ error: 'An error occurred while processing the graph.' });
    }
});










/**
 * Start the server
 */
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
