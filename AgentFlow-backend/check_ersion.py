from node_retriever import get_relevant_nodes
# from node_retriver import get_relevant_nodes
nodes = get_relevant_nodes("gmail", n_results=1)
for node in nodes:
    print(node.get("typeVersion"))   # 1 or 2