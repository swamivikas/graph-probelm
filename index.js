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
    password : "............",
    port : 5432,
  
  });

db.connect((err) => {
    if (err) {
        console.error('Connection error', err.stack);
    } else {
        console.log('Connected to the database');
    }
});

app.post('/create-edge', async (req, res) => {
    const { srcNode, dstNode, srcToDstDataKeys } = req.body;

    try {
        // Check if both srcNode and dstNode exist
        const srcNodeQuery = `SELECT * FROM nodes WHERE node_id = $1`;
        const dstNodeQuery = `SELECT * FROM nodes WHERE node_id = $1`;
        
        const srcNodeResult = await db.query(srcNodeQuery, [srcNode]);
        const dstNodeResult = await db.query(dstNodeQuery, [dstNode]);

        if (srcNodeResult.rows.length === 0) {
            return res.status(404).send(`Source node ${srcNode} not found.`);
        }

        if (dstNodeResult.rows.length === 0) {
            return res.status(404).send(`Destination node ${dstNode} not found.`);
        }

        // Insert the edge into the edges table
        const insertEdgeQuery = `INSERT INTO edges (src_node, dst_node, src_to_dst_data_keys) VALUES ($1, $2, $3)`;
        await db.query(insertEdgeQuery, [srcNode, dstNode, srcToDstDataKeys]);

        res.status(201).send(`Edge from ${srcNode} to ${dstNode} created successfully.`);
    } catch (error) {
        console.error('Error creating edge:', error);
        res.status(500).send('An error occurred while creating the edge.');
    }
});

// Delete Node
app.delete('/delete-node/:nodeId', async (req, res) => {
    const nodeId = req.params.nodeId;

    try {
        // First, delete all edges connected to this node
        const deleteEdgesQuery = `DELETE FROM edges WHERE src_node = $1 OR dst_node = $1`;
        await db.query(deleteEdgesQuery, [nodeId]);

        // Then, delete the node itself
        const deleteNodeQuery = `DELETE FROM nodes WHERE node_id = $1`;
        await db.query(deleteNodeQuery, [nodeId]);

        res.status(200).send(`Node ${nodeId} and its connected edges deleted successfully.`);
    } catch (error) {
        console.error('Error deleting node:', error);
        res.status(500).send('An error occurred while deleting the node.');
    }
});




// Delete Edge
app.delete('/delete-edge/:srcNode/:dstNode', async (req, res) => {
    const { srcNode, dstNode } = req.params;

    try {
        const deleteEdgeQuery = `DELETE FROM edges WHERE src_node = $1 AND dst_node = $2`;
        const result = await db.query(deleteEdgeQuery, [srcNode, dstNode]);

        if (result.rowCount > 0) {
            res.status(200).send(`Edge from ${srcNode} to ${dstNode} deleted successfully.`);
        } else {
            res.status(404).send(`Edge from ${srcNode} to ${dstNode} not found.`);
        }
    } catch (error) {
        console.error('Error deleting edge:', error);
        res.status(500).send('An error occurred while deleting the edge.');
    }
});


// Create Node
app.post('/create-node', async (req, res) => {
    const { nodeId, dataIn, dataOut } = req.body;

    try {
        const insertNodeQuery = `INSERT INTO nodes (node_id, data_in, data_out, paths_in, paths_out) VALUES ($1, $2, $3, '[]', '[]')`;
        await db.query(insertNodeQuery, [nodeId, dataIn, dataOut]);

        res.status(201).send(`Node ${nodeId} created successfully.`);
    } catch (error) {
        console.error('Error creating node:', error);
        res.status(500).send('An error occurred while creating the node.');
    }
});

// Edit Edge
app.put('/edit-edge/:srcNode/:dstNode', async (req, res) => {
    const { srcNode, dstNode } = req.params;
    const { srcToDstDataKeys } = req.body;

    try {
        const updateEdgeQuery = `UPDATE edges SET src_to_dst_data_keys = $1 WHERE src_node = $2 AND dst_node = $3`;
        const result = await db.query(updateEdgeQuery, [srcToDstDataKeys, srcNode, dstNode]);

        if (result.rowCount > 0) {
            res.status(200).send(`Edge from ${srcNode} to ${dstNode} updated successfully.`);
        } else {
            res.status(404).send(`Edge from ${srcNode} to ${dstNode} not found.`);
        }
    } catch (error) {
        console.error('Error editing edge:', error);
        res.status(500).send('An error occurred while editing the edge.');
    }
});


// Function to get all nodes from the database
async function getAllNodes() {
    try {
        const result = await db.query('SELECT * FROM nodes');
        return result.rows;
    } catch (error) {
        console.error('Error fetching nodes:', error);
        throw new Error('Failed to retrieve nodes from the database');
    }
}

// Function to get data for all nodes
async function getAllNodesData() {
    try {
        let allNodes = await getAllNodes();  // Fetch all nodes
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

// Function to get a single node from the database
async function getNode(nodeId) {
    try {
        const result = await db.query('SELECT * FROM nodes WHERE node_id = $1', [nodeId]);
        if (result.rows.length === 0) {
            throw new Error(`Node with ID ${nodeId} not found`);
        }
        return result.rows[0];
    } catch (error) {
        console.error('Error fetching node:', error);
        throw new Error('Failed to retrieve node from the database');
    }
}

// Function to get all edges for a specific node
async function getEdgesForNode(nodeId) {
    try {
        const result = await db.query('SELECT * FROM edges WHERE src_node = $1', [nodeId]);
        return result.rows;
    } catch (error) {
        console.error('Error fetching edges for node:', error);
        throw new Error('Failed to retrieve edges from the database');
    }
}

// Function to update the 'data_in' of a node in the database
async function updateNodeDataIn(nodeId, dataInValue) {
    try {
        const query = 'UPDATE nodes SET data_in = $1 WHERE node_id = $2';
        const values = [dataInValue, nodeId];
        await db.query(query, values);
        console.log(`Successfully updated data_in for node: ${nodeId}`);
    } catch (error) {
        console.error(`Error updating data_in for node ${nodeId}:`, error);
        throw new Error('Failed to update data_in');
    }
}

async function runConfig(src_node, dst_node) {
    try {
        let queue = [src_node];
        let visited = new Set();
        let nodeLevels = {};
        nodeLevels[src_node] = 0;
        let dataFlowComplete = false;
        let overwriteTracker = {};

        while (queue.length > 0) {
            let currentNodeId = queue.shift();

            if (visited.has(currentNodeId)) {
                continue;
            }
            visited.add(currentNodeId);

            let currentNode = await getNode(currentNodeId);
            console.log(`Processing Node: ${currentNodeId}, Data In:`, currentNode.data_in, `Data Out:`, currentNode.data_out);

            let outgoingEdges = await getEdgesForNode(currentNodeId);
            let currentLevel = nodeLevels[currentNodeId];

            for (let edge of outgoingEdges) {
                let dstNodeId = edge.dst_node;
                let dstNode = await getNode(dstNodeId);

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

                if (!visited.has(dstNodeId)) {
                    queue.push(dstNodeId);
                    nodeLevels[dstNodeId] = currentLevel + 1;
                }
            }

            if (dataFlowComplete) {
                break;
            }
        }

        // Return in-memory node data for debugging purposes
        return await getAllNodesData();
    } catch (error) {
        console.error("An error occurred while processing the graph:", error);
        return { error: "An error occurred while processing the graph." };
    }
}




// Topological Sort
app.get('/toposort', async (req, res) => {
    try {
        // Get all nodes and edges
        const nodesResult = await db.query('SELECT * FROM nodes');
        const edgesResult = await db.query('SELECT * FROM edges');

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
app.get('/islands', async (req, res) => {
    try {
        // Get all nodes and edges
        const nodesResult = await db.query('SELECT * FROM nodes');
        const edgesResult = await db.query('SELECT * FROM edges');

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
app.post('/run_config', async (req, res) => {
    const { src_node, dst_node } = req.body;
    console.log(req.body);
    if (!src_node || !dst_node) {
        return res.status(400).json({ error: 'src_node and dst_node are required' });
    }

    try {
        // Run the graph traversal and data propagation
        const finalNodeStates = await runConfig(src_node, dst_node);
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
