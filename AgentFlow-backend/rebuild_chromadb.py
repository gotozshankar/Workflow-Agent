# rebuild_chromadb.py
import json, os, chromadb
from vector_store_nodes import build_document_text

def rebuild():
    with open("clean_nodes.json", "r", encoding="utf-8") as f: # 👈 encoding="utf-8" kandippa venum
        nodes = json.load(f)
    
    client = chromadb.PersistentClient(path="./chroma_db")
    try: client.delete_collection("n8n_nodes")
    except: pass
    
    collection = client.create_collection("n8n_nodes")
    # Embedding logic...
    print("✅ ChromaDB Rebuilt with Integer typeVersions")

if __name__ == "__main__":
    rebuild()