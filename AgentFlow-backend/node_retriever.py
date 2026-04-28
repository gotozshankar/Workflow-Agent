
import json
import os
from typing import List, Dict

try:
    import chromadb

    CHROMADB_AVAILABLE = True
except ImportError:
    chromadb = None
    CHROMADB_AVAILABLE = False
    print("⚠️  chromadb not installed — using local file fallback only")


def init_chromadb_client():
    if not CHROMADB_AVAILABLE:
        return None
    persist_dir = "./chroma_db"
    os.makedirs(persist_dir, exist_ok=True)
    return chromadb.PersistentClient(path=persist_dir)


def get_relevant_nodes(user_prompt: str, n_results: int = 15) -> List[Dict]:
    if not CHROMADB_AVAILABLE:
        return []

    try:
        client = init_chromadb_client()
        if client is None:
            return []
        collection = client.get_or_create_collection(name="n8n_nodes")

        count = collection.count()
        if count == 0:
            print("⚠️  ChromaDB empty. Run: python vector_store_nodes.py")
            return []

        results = collection.query(
            query_texts=[user_prompt],
            n_results=min(n_results, count),
            include=["documents", "metadatas"],
        )

        nodes = []
        metadatas = results.get("metadatas", [[]])[0]

        for i, meta in enumerate(metadatas):
            try:
                node_json = meta.get("node_json")
                if node_json:
                    node_data = json.loads(node_json)
                else:
                    doc = results["documents"][0][i]
                    node_data = json.loads(doc)
                nodes.append(node_data)
            except (json.JSONDecodeError, KeyError):
                continue

        print(f"✅ Retrieved {len(nodes)} nodes from ChromaDB")
        for n in nodes:
            print(f"   😎 {n.get('name')} | {n.get('displayName')}")

        return nodes

    except Exception as e:
        print(f"❌ ChromaDB retrieval error: {str(e)}")
        return []


def load_nodes_from_file(filepath: str = "clean_nodes.json") -> List[Dict]:
    try:
        if not os.path.exists(filepath):
            print(f"⚠️  File not found: {filepath}")
            return []

        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, dict):
            nodes = [
                n for v in data.values() for n in (v if isinstance(v, list) else [v])
            ]
        else:
            nodes = data if isinstance(data, list) else []

        print(f"✅ Loaded {len(nodes)} nodes from {filepath}")
        return nodes

    except Exception as e:
        print(f"❌ File loading error: {str(e)}")
        return []


def get_nodes_hybrid(user_prompt: str, n_results: int = 15) -> List[Dict]:
    nodes = get_relevant_nodes(user_prompt, n_results)

    if not nodes:
        print("📁 Falling back to local clean_nodes.json...")
        all_nodes = load_nodes_from_file()

        prompt_lower = user_prompt.lower()
        matched = [
            n
            for n in all_nodes
            if prompt_lower in n.get("displayName", "").lower()
            or prompt_lower in n.get("description", "").lower()
            or any(
                prompt_lower in a.get("actionName", "").lower()
                for a in n.get("available_actions", [])
            )
        ]
        if len(matched) < n_results:
            matched_names = {n["name"] for n in matched}
            others = [n for n in all_nodes if n["name"] not in matched_names]
            matched = matched + others

        nodes = matched[:n_results]

    print("\n=== RETRIEVED NODE TYPES ===")
    for node in nodes:
        print(f"  → {node.get('name')} | {node.get('displayName')}")
    print("============================\n")

    return nodes
