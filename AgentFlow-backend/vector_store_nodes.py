"""

vector_store_nodes.py

=====================

clean_nodes.json → ChromaDB-la properly embed பண்ண இந்த file run பண்ணுங்க.



Run: python vector_store_nodes.py

Re-embed: python vector_store_nodes.py --reset

"""



import json

import os

import sys



try:

    import chromadb

except ImportError:

    raise ImportError("Run: pip install chromadb")



CLEAN_NODES_PATH  = "clean_nodes.json"

CHROMA_PERSIST_DIR = "./chroma_db"

COLLECTION_NAME   = "n8n_nodes"

BATCH_SIZE        = 100

def build_document_text(node: dict) -> str:
    display_name = node.get("displayName", "")
    description  = node.get("description", "")
    name = node.get("name", "") # Internal name (e.g., n8n-nodes-base.googleGmail)

    actions = node.get("available_actions", [])
    action_names = [a.get("actionName", "") for a in actions]
    action_values = [a.get("actionValue", "") for a in actions]

    # ✅ Intha format-la text build panna search accuracy nalla irukkum
    text = f"Node Name: {display_name}\n"
    text += f"Internal Name: {name}\n"
    text += f"Description: {description}\n"
    text += f"Available Actions: {', '.join(action_names)}\n"
    text += f"Action Values: {', '.join(action_values)}"
    
    return text
def store_nodes_in_chromadb(nodes_file: str = CLEAN_NODES_PATH, reset: bool = False):

    if not os.path.exists(nodes_file):

        print(f"❌ {nodes_file} not found!")

        sys.exit(1)



    print(f"📂 Loading nodes from {nodes_file}...")

    with open(nodes_file, "r", encoding="utf-8") as f:

        data = json.load(f)



    if isinstance(data, dict):

        nodes = []

        for items in data.values():

            nodes.extend(items if isinstance(items, list) else [items])

    else:

        nodes = data if isinstance(data, list) else []



    if not nodes:

        print("❌ No nodes found!")

        sys.exit(1)



    print(f"✅ Loaded {len(nodes)} nodes")



    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)

    client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)



    if reset:

        try:

            client.delete_collection(name=COLLECTION_NAME)

            print("🗑️  Old collection deleted")

        except Exception:

            pass



    collection = client.get_or_create_collection(name=COLLECTION_NAME)



    existing_count = collection.count()

    if existing_count > 0 and not reset:

        print(f"⚠️  ChromaDB already has {existing_count} nodes.")

        print("    Re-embed பண்ண: python vector_store_nodes.py --reset")

        return



    print(f"🚀 Embedding {len(nodes)} nodes...")



    ids, documents, metadatas = [], [], []



    for i, node in enumerate(nodes):

        ids.append(f"node_{i}")

        documents.append(build_document_text(node))   # ✅ Rich text - search பண்றது இதை

        metadatas.append({

            "node_json":   json.dumps(node),           # ✅ Full data - retrieval-க்கு

            "name":        node.get("name", ""),

            "displayName": node.get("displayName", ""),

        })



    total = len(ids)

    for start in range(0, total, BATCH_SIZE):

        end = min(start + BATCH_SIZE, total)

        collection.add(

            ids=ids[start:end],

            documents=documents[start:end],

            metadatas=metadatas[start:end],

        )

        print(f"   ✅ Batch {start}–{end} done")



    print(f"\n🎉 {total} nodes embedded successfully!")

    print(f"📁 Saved at: {CHROMA_PERSIST_DIR}")





if __name__ == "__main__":

    reset_flag = "--reset" in sys.argv

    store_nodes_in_chromadb(CLEAN_NODES_PATH, reset=reset_flag)