# graph-probelm

# technologoes used 

## 1. nodejs
## 2. PostgreSQL

# to run locally just clone the repo and run 
## use you own PostgreSQL credentials

   ```
     node index.js
  ```

## Approach : 
### I created 3 tables in the database for graphs, for nodes, and for edges 
### now for create nodes just indert thr node_id along with associated graph with other info 
### for create edge insert the info into into edge table 
### for edit edge we can easily adit the info into the edge table 
### for delete node delete the node and all the edges associated with it 
### for delete edge just delete the edge from the edge table 
### for run_config : 
### first we will check if there is any cycle or islands using out /islands , /toposort apis id there is no islands and no cycles then we can run run_config 
### it will do level wise traversal by using root node and dst node in run_config and enable and disable list 
### it will record a track of overwrite functionality also and after the flow is complete it will return the data_in and data_out at every node 

### for toposort the algorithms is using indegree concept from khans algo 
### for islands it is using dfs 

## now lets see how these all apis are working ( the code is having multiple grpahs functionality but at the time of testing the apis it contains only one graph in tha database )


### now i will attahed the screenshot of all tested apis 



![Screenshot 2024-11-03 211855](https://github.com/user-attachments/assets/1fa68a11-3361-4d1d-8208-65f07abf7f81)



![Screenshot 2024-11-03 211846](https://github.com/user-attachments/assets/ab3d5f01-6d19-49db-ace9-ba87f20fd712)



![Screenshot 2024-11-03 211837](https://github.com/user-attachments/assets/3e4a1b26-4942-4707-bd72-4c6b73dc4a06)



![Screenshot 2024-11-03 211830](https://github.com/user-attachments/assets/9c3f4226-e44e-4ee2-b635-62a2970292fd)


![Screenshot 2024-11-03 211822](https://github.com/user-attachments/assets/88fbf568-bd0a-485b-8b59-f7e44d0800ba)


![Screenshot 2024-11-03 211815](https://github.com/user-attachments/assets/7a96c3e7-9cb9-4abd-92c4-5d3ff5aea678)


![Screenshot 2024-11-03 211807](https://github.com/user-attachments/assets/4962ec02-65e4-4c83-8e9a-edaf8eb05194)



![Screenshot 2024-11-03 211758](https://github.com/user-attachments/assets/e11f2e56-8fd0-4870-b832-39173194ffde)
