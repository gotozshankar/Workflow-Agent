# # """
# # workflow_generator_v2.py  —  N8N Cloud style with LangGraph
# # ============================================================
# # Exactly how N8N Cloud does it:
# #   Step 1 : Node Selector   — LLM picks node types from full catalogue
# #   Step 2 : Schema Builder  — Code fetches exact schemas
# #   Step 3 : Generator       — LLM builds JSON using exact schemas
# #   Step 4 : Validator       — Code validates + auto-fixes (dynamic, prompt-agnostic)
# #   Retry  : If validation fails → send error back to LLM (max 3x)
# # """

# # import json, os, re, uuid
# # from typing import TypedDict, List, Dict, Any, Optional

# # from openai import AzureOpenAI

# # try:
# #     from langgraph.graph import StateGraph, END
# # except ImportError:
# #     raise ImportError("pip install langgraph")


# # # ═══════════════════════════════════════════════════════════════════
# # # BUILT-IN AI NODES
# # # ═══════════════════════════════════════════════════════════════════
# # AI_NODES: List[Dict] = [
# #     {"name": "@n8n/n8n-nodes-langchain.agent",
# #      "displayName": "AI Agent", "typeVersion": 1.7,
# #      "description": "Orchestrates model, memory, and tools.",
# #      "available_actions": []},
# #     {"name": "@n8n/n8n-nodes-langchain.lmChatAzureOpenAi", 
# #      "displayName": "Azure OpenAI Chat Model", "typeVersion": 1,
# #      "description": "GPT-4 / GPT-3.5 language model hosted on Azure for AI Agent.",
# #      "available_actions": []},
# #     {"name": "@n8n/n8n-nodes-langchain.lmChatMistralCloud",
# #      "displayName": "Mistral Chat Model", "typeVersion": 1,
# #      "description": "Mistral language model for AI Agent.",
# #      "available_actions": []},
# #     {"name": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
# #      "displayName": "Window Buffer Memory", "typeVersion": 1.3,
# #      "description": "Short-term conversation memory for AI Agent.",
# #      "available_actions": []},
# #     {"name": "@n8n/n8n-nodes-langchain.vectorStoreInMemory",
# #      "displayName": "In-Memory Vector Store", "typeVersion": 1.1,
# #      "description": "RAG vector store tool attached to AI Agent.",
# #      "available_actions": []},
# #     {"name": "@n8n/n8n-nodes-langchain.embeddingsOpenAi",
# #      "displayName": "OpenAI Embeddings", "typeVersion": 1,
# #      "description": "Embeddings for vector store.",
# #      "available_actions": []},
# #     {"name": "@n8n/n8n-nodes-langchain.documentDefaultDataLoader",
# #      "displayName": "Default Data Loader", "typeVersion": 1,
# #      "description": "Loads documents into vector store.",
# #      "available_actions": []},
# #     {"name": "@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter",
# #      "displayName": "Recursive Text Splitter", "typeVersion": 1,
# #      "description": "Splits documents into chunks for vector store.",
# #      "available_actions": []},
# #     {"name": "n8n-nodes-base.switch",
# #      "displayName": "Switch", "typeVersion": 3,
# #      "description": "Route items to different branches based on multiple conditions (3+ outputs).",
# #      "available_actions": []},
# #     {"name": "n8n-nodes-base.webhook",
# #      "displayName": "Webhook", "typeVersion": 2,
# #      "description": "HTTP webhook trigger.",
# #      "available_actions": []},
# #     {"name": "n8n-nodes-base.respondToWebhook",
# #      "displayName": "Respond to Webhook", "typeVersion": 1.1,
# #      "description": "Sends HTTP response from webhook workflow.",
# #      "available_actions": []},
# # ]

# # # ═══════════════════════════════════════════════════════════════════
# # # NODE ROLE CLASSIFIER — dynamic, works for any prompt
# # # Maps node type substrings → their AI port role
# # # ═══════════════════════════════════════════════════════════════════
# # AI_PORT_RULES = {
# #     "langchain.lm":         "ai_languageModel",
# #     "langchain.memory":     "ai_memory",
# #     "langchain.embeddings": "ai_embedding",
# #     "embeddings":           "ai_embedding",
# #     "dataloader":           "ai_document",
# #     "textsplitter":         "ai_textSplitter",
# # }
# # VECTORSTORE_KEYWORDS = ["vectorstore", "pinecone", "qdrant", "weaviate", "supabase", "inmemory"]

# # def _classify_node_role(node_type: str) -> str:
# #     """Return the AI port role for a node type, or 'main' for regular nodes."""
# #     t = node_type.lower()
# #     for kw, port in AI_PORT_RULES.items():
# #         if kw in t:
# #             return port
# #     for kw in VECTORSTORE_KEYWORDS:
# #         if kw in t:
# #             return "ai_tool"
# #     if "textsplitter" in t or "text_splitter" in t:
# #         return "ai_textSplitter"
# #     return "main"


# # # ═══════════════════════════════════════════════════════════════════
# # # LANGGRAPH STATE
# # # ═══════════════════════════════════════════════════════════════════
# # class WorkflowState(TypedDict):
# #     user_prompt:     str
# #     planned_types:   List[str]
# #     schema_block:    str
# #     raw_json:        str
# #     workflow:        Optional[Dict]
# #     errors:          List[str]
# #     attempt:         int
# #     done:            bool


# # # ═══════════════════════════════════════════════════════════════════
# # # MAIN CLASS
# # # ═══════════════════════════════════════════════════════════════════
# # class WorkflowGeneratorV2:
    
# #     def __init__(self, clean_nodes_path: str = "clean_nodes.json"):
# #         print("WorkflowGeneratorV2 initializing......") 
# #         print("load nodes clean_nodes.json")
# #         self.llm = AzureOpenAI(
# #             api_key       = os.getenv("AZURE_OPENAI_KEY"),
# #             api_version   = "2024-12-01-preview",
# #             azure_endpoint= os.getenv("AZURE_OPENAI_ENDPOINT",
# #                                       os.getenv("AZURE_ENDPOINT", "")),
# #         )
# #         self.deployment = os.getenv("DEPLOYMENT_NAME", "gpt-4o")
# #         self.schema_map: Dict[str, Dict] = {}
# #         self._load_nodes(clean_nodes_path)
# #         self.catalogue = self._build_catalogue()
# #         self.graph = self._build_graph()

# #     def _load_nodes(self, path: str):
# #         if os.path.exists(path):
# #             with open(path, "r", encoding="utf-8") as f:
# #                 nodes = json.load(f)
# #             for n in nodes:
# #                 self.schema_map[n["name"]] = n
# #         for n in AI_NODES:
# #             self.schema_map.setdefault(n["name"], n)
# #         print(f"✅ Loaded {len(self.schema_map)} node schemas")

# #     def _build_catalogue(self) -> str:
# #         lines = []
# #         for node in self.schema_map.values():
# #             actions = [
# #                 a["actionName"] for a in node.get("available_actions", [])
# #                 if a.get("actionName") and a.get("actionValue") != "__CUSTOM_API_CALL__"
# #             ]
# #             line = f"{node['displayName']} | {node['name']}"
# #             if actions:
# #                 line += f" | ops: {', '.join(actions[:6])}"
# #             if node.get("description"):
# #                 line += f" | {node['description'][:80]}"
# #             lines.append(line)
# #         return "\n".join(lines)

# #     def _chat(self, system: str, user: str, max_tokens: int = 1000, temp: float = 0) -> str:
# #         r = self.llm.chat.completions.create(
# #             model    = self.deployment,
# #             messages = [{"role": "system", "content": system},
# #                         {"role": "user",   "content": user}],
# #             max_tokens  = max_tokens,
# #             temperature = temp,
# #         )
# #         return r.choices[0].message.content.strip()

# #     # ═══════════════════════════════════════════════════════════════
# #     # STEP 1 — NODE SELECTOR
# #     # ═══════════════════════════════════════════════════════════════
# #     def _node_selector(self, state: WorkflowState) -> WorkflowState:
# #         print("Entering node selector.....")
# #         print("🔍 Step 1: Selecting nodes...")
# #         system = """You are an expert n8n workflow planner.
# # Given a user request and a node catalogue, return ONLY a JSON array of internal node type strings.
# #         RULES:
# # - Return raw JSON array only. No markdown. No explanation.
# # - Include ALL nodes needed — trigger, logic, output.
# # - IMPORTANT: Select node types STRICTLY from the provided CATALOGUE. Do not invent node names.
# # - DYNAMIC SELECTION: Select ONLY the nodes actually required based on the prompt.
# # - AI MANDATORY PAIRING: If the prompt requires AI (e.g., intent detection, text analysis), you MUST select "@n8n/n8n-nodes-langchain.agent" as the main node. 
# # - CHAT MODEL RULE: Whenever you select an AI Agent, you MUST ALSO select "@n8n/n8n-nodes-langchain.lmChatAzureOpenAi" to act as its language model, and "@n8n/n8n-nodes-langchain.memoryBufferWindow" for memory. NEVER use a Chat Model as a standalone node without an Agent.
# # - For routing to MULTIPLE paths (3+ conditions), select "n8n-nodes-base.switch".
# # - For simple True/False or 2-way routing, select "n8n-nodes-base.if".
# # - Include DUPLICATE node types if the same node is used multiple times (e.g., multiple Gmail send nodes).
# # """

# #         user = f"CATALOGUE:\n{self.catalogue}\n\nUSER REQUEST:\n{state['user_prompt']}\n\nReturn JSON array:"
# #         raw  = self._chat(system, user, max_tokens=1500)
# #         raw  = raw.replace("```json","").replace("```","").strip()

# #         try:
# #             types = json.loads(raw)
# #             valid = [t for t in types if t in self.schema_map]
# #             print(f"   Planned {len(valid)} nodes: {valid}")
# #             return {**state, "planned_types": valid}
# #         except Exception as e:
# #             print(f"   ⚠️  Parse error: {e}. Using AI fallback.")
# #             return {**state, "planned_types": [
# #                 "n8n-nodes-base.webhook",
# #                 "@n8n/n8n-nodes-langchain.agent",
# #                 "@n8n/n8n-nodes-langchain.lmChatAzureOpenAi", 
# #                 "@n8n/n8n-nodes-langchain.memoryBufferWindow",
# #                 "n8n-nodes-base.respondToWebhook",
# #             ]}

# #     # ═══════════════════════════════════════════════════════════════
# #     # STEP 2 — SCHEMA BUILDER
# #     # ═══════════════════════════════════════════════════════════════
# #     def _schema_builder(self, state: WorkflowState) -> WorkflowState:
# #         print("📋 Step 2: Building schemas...")
# #         lines = []
# #         for nt in state["planned_types"]:
# #             node = self.schema_map.get(nt)
# #             if not node:
# #                 continue
            
# #             # Actions
# #             actions = [
# #                 a["actionName"] for a in node.get("available_actions", [])
# #                 if a.get("actionName") and a.get("actionValue") != "__CUSTOM_API_CALL__"
# #             ]
            
# #             # Key Properties
# #             props_lines = []
# #             for p in node.get("key_properties", []):
# #                 line = f"    - {p['name']} ({p['type']})"
# #                 if p.get("required"):
# #                     line += " [REQUIRED]"
# #                 if p.get("default") not in [None, ""]:
# #                     line += f" default='{p['default']}'"
# #                 if p.get("options"):
# #                     opts = [o["value"] for o in p["options"][:5]]
# #                     line += f" options={opts}"
# #                   # ✅ ADD THIS — example value from user prompt context
# #                 example_map = {
# #                     "string": "e.g. 'your text here'",
# #                     "number": "e.g. 1",
# #                     "boolean": "e.g. true",
# #                     "options": f"choose from above options",
# #                 }
# #                 ptype = p.get("type", "string")
# #                 line += f"  → {example_map.get(ptype, 'fill with relevant value')}"
# #                 props_lines.append(line)
                
# #             # Credentials
# #             cred_names = [c["name"] for c in node.get("credentials", []) if c.get("required")]

# #             lines.append(
# #                 f"NODE:\n"
# #                 f"  type        : {node['name']}\n"
# #                 f"  displayName : {node['displayName']}\n"
# #                 f"  typeVersion : {node['typeVersion']}\n"
# #                 f"  description : {node.get('description','')}\n"
# #                 f"  operations  : {', '.join(actions) if actions else 'N/A'}\n"
# #                 f"  parameters  :\n" +
# #                 ("\n".join(props_lines) if props_lines else "    (no schema)") + "\n" +
# #                 (f"  credentials : {', '.join(cred_names)}\n" if cred_names else "")
# #             )
            
# #         return {**state, "schema_block": "\n".join(lines)}

# #     # ═══════════════════════════════════════════════════════════════
# #     # STEP 3 — WORKFLOW GENERATOR
# #     # ═══════════════════════════════════════════════════════════════
# #     def _workflow_generator(self, state: WorkflowState) -> WorkflowState:
        
# #         attempt = state["attempt"]
# #         print(f"⚙️  Step 3: Generating workflow (attempt {attempt+1})...")

# #         types = state["planned_types"]
# #         has_ai  = any("langchain" in t for t in types)

# #        # AI-specific dynamic rules
# #         ai_rules = ""
# #         if has_ai:
# #             ai_rules = """
# #     ═══════════════════════════════════════
# #     AI CONNECTION RULES (CRITICAL - NO DAISY CHAINING):
# #     ═══════════════════════════════════════
# #     - DO NOT connect AI Sub-nodes (Models, Memory, Embeddings, Tools) to the "main" flow in a straight line.
# #     - Chat Models MUST connect to the Agent's "ai_languageModel" port.
# #     - Memory nodes MUST connect to the Agent's "ai_memory" port.
# #     - Vector Store nodes MUST connect to the Agent's "ai_tool" port.
# #     - Embedding nodes MUST connect to the Vector Store's "ai_embedding" port.
# #     - Document Loaders MUST connect to the Vector Store's "ai_document" port.
# #     """

# #         error_section = ""
# #         if state["errors"] and attempt > 0:
# #             error_section = f"\nFIX THESE ERRORS FROM LAST ATTEMPT:\n" + "\n".join(f"- {e}" for e in state["errors"])

# #         system = f"""You are a Master n8n Workflow Architect. Your goal is to generate a highly accurate, import-ready n8n workflow JSON.

# #     ═══════════════════════════════════════
# #     CRITICAL RULES FOR PARAMETER AUTO-FILLING (DO NOT IGNORE)
# #     ═══════════════════════════════════════
# #     1. YOU MUST POPULATE THE "parameters" OBJECT FOR EVERY NODE. Do NOT output empty parameters like "parameters": {{}}.
# #     2. Read the USER REQUEST carefully. Extract emails, logic, queries, and text, and inject them into the "parameters".
# #     3. Use ONLY the valid parameter names provided in the SCHEMAS below.
# #     4. EXPRESSION SYNTAX (CRITICAL): If a parameter combines text and dynamic data, it MUST start with an equals sign `=`.
# #        - ❌ BAD: "message": "Hello {{{{ $json.name }}}}"
# #        - ✅ GOOD: "message": "=Hello {{{{ $json.name }}}}"
# #        - ✅ GOOD: "sendTo": "={{{{ $json.email }}}}"
# #     5. For IF nodes, you MUST fill the "conditions" object based on the user's logic. NEVER leave it empty.
# #     6. For Gmail nodes, you MUST fill "operation", "toList" (or "sendTo"), "subject", and "htmlMessage" (or "message").
# #     ═══════════════════════════════════════
# #     TOPOLOGY AND CONNECTIONS RULES (CRITICAL)
# #     ═══════════════════════════════════════
# #     1. Every generated node MUST be connected in the "connections" object. No floating nodes.
# #     2. Sequential logic nodes (Triggers, APIs, IF, Switch, Set) connect via the "main" port.
# #     3. "main" connections structure:
# #        - The outer array determines the OUTGOING branch (e.g., branch 0 is True, branch 1 is False).
# #        - Inside the connection object, the `"index"` property is the INCOMING port of the target node. This MUST ALWAYS BE `0` for "main" connections.
# #     4. NEVER connect a Trigger node directly to an AI Sub-node (like Azure OpenAI) via the "main" port.

# #     ═══════════════════════════════════════
# #     SYNTAX CHEAT SHEET (MANDATORY STRUCTURES)
# #     ═══════════════════════════════════════
# #     If you use any of the nodes below, you MUST follow this exact parameter structure and fill the data dynamically:

# #     1. GMAIL NODE (n8n-nodes-base.gmail):
# #     "parameters": {{
# #       "operation": "send",
# #       "toList": "={{{{ $('Gmail Trigger').item.json.From }}}}",
# #       "subject": "Product Availability Update",
# #       "htmlMessage": "=Dear Customer, the product {{{{ $json.productName }}}} is available. Price: {{{{ $json.price }}}}"
# #     }}

# #     2. POSTGRES NODE (n8n-nodes-base.postgres):
# #     "parameters": {{
# #       "operation": "executeQuery",
# #       "query": "SELECT * FROM users WHERE id = $1",
# #       "additionalFields": {{
# #         "queryParams": "={{{{ $json.userId }}}}"
# #       }}
# #     }}

# #     3. IF NODE (n8n-nodes-base.if - typeVersion 2.3):
# #     "parameters": {{
# #       "conditions": {{
# #         "boolean": [ {{ "value1": "={{{{ $json.isProduct }}}}", "operation": "true" }} ],
# #         "string": [ {{ "value1": "={{{{ $json.status }}}}", "operation": "equals", "value2": "active" }} ]
# #       }}
# #     }}

# #     4. SWITCH NODE (n8n-nodes-base.switch - typeVersion 3):
# #     "parameters": {{
# #       "mode": "rules",
# #       "rules": {{
# #         "values": [
# #           {{
# #             "conditions": {{
# #               "options": {{"caseSensitive": false, "leftValue": "", "typeValidation": "strict"}},
# #               "conditions": [
# #                 {{ "leftValue": "={{{{ $json.category }}}}", "rightValue": "sales", "operator": {{"type": "string", "operation": "equals"}} }}
# #               ],
# #               "combinator": "and"
# #             }},
# #             "renameOutput": true,
# #             "outputKey": "sales_branch"
# #           }}
# #         ]
# #       }}
# #     }}

# #     5. SET NODE (n8n-nodes-base.set - typeVersion 3.4):
# #     "parameters": {{
# #       "assignments": {{
# #         "assignments": [ {{ "id": "uuid-1", "name": "newKey", "value": "={{{{ $json.oldValue }}}}", "type": "string" }} ]
# #       }}
# #     }}
# #     {ai_rules}"""
# #         extraction_hint = f"""
# # IMPORTANT — Extract these values from the REQUEST and inject into node parameters:
# # - Any email addresses → use in sendTo / toList fields
# # - Any SQL table names or conditions → use in query fields  
# # - Any text/subject lines mentioned → use in subject / message fields
# # - Any conditions or thresholds → use in IF/Switch conditions
# # - Any product names, user names, categories → use as dynamic values

# # REQUEST: {state['user_prompt']}
# # """
# #         user = (
# #             f"SCHEMAS:\n{state['schema_block']}\n\n"
# #             f"{extraction_hint}\n"
# #             f"{error_section}\n\n"
# #             f"Generate complete workflow JSON with ALL parameters filled:"
# #             )

# #         raw = self._chat(system, user, max_tokens=12000, temp=0.1)
# #         return {**state, "raw_json": raw, "attempt": attempt + 1}

# #     # ═══════════════════════════════════════════════════════════════
# #     # DYNAMIC AI CONNECTION FIXER
# #     # ═══════════════════════════════════════════════════════════════
# #     def _fix_ai_connections(self, nodes: List[Dict], connections: Dict, errors: List[str]) -> Dict:
# #         name_to_node: Dict[str, Dict] = {n["name"]: n for n in nodes}
# #         name_to_type: Dict[str, str]  = {n["name"]: n.get("type","") for n in nodes}

# #         def role(name: str) -> str:
# #             return _classify_node_role(name_to_type.get(name, ""))

# #         agents        = [n["name"] for n in nodes if "langchain.agent" in n.get("type","").lower()]
# #         chat_models   = [n["name"] for n in nodes if _classify_node_role(n.get("type","")) == "ai_languageModel"]
# #         memories      = [n["name"] for n in nodes if _classify_node_role(n.get("type","")) == "ai_memory"]
# #         vector_stores = [n["name"] for n in nodes if _classify_node_role(n.get("type","")) == "ai_tool"]
# #         embeddings    = [n["name"] for n in nodes if _classify_node_role(n.get("type","")) == "ai_embedding"]
# #         doc_loaders   = [n["name"] for n in nodes if _classify_node_role(n.get("type","")) == "ai_document"]
# #         text_splitters= [n["name"] for n in nodes if _classify_node_role(n.get("type","")) == "ai_textSplitter"]

# #         TRIGGER_KEYWORDS = [
# #             "webhook", "emailreadimap", "scheduletrigger", "manualTrigger",
# #             "cron", "interval", "emailtrigger", "formtrigger", "httprequest",
# #         ]
# #         def is_trigger(name: str) -> bool:
# #             t = name_to_type.get(name, "").lower()
# #             return any(kw in t for kw in TRIGGER_KEYWORDS)

# #         def is_ai_sub(name: str) -> bool:
# #             return role(name) != "main"

# #         triggers   = [n["name"] for n in nodes if is_trigger(n["name"])]
# #         main_nodes = [n["name"] for n in nodes if not is_ai_sub(n["name"])]

# #         if not agents:
# #             return connections

# #         primary_agent = agents[0]

# #         for cm in chat_models:
# #             already = self._is_connected(connections, cm, "ai_languageModel", primary_agent)
# #             if not already:
# #                 connections.setdefault(cm, {})
# #                 connections[cm]["ai_languageModel"] = [[{"node": primary_agent, "type": "ai_languageModel", "index": 0}]]
# #                 errors.append(f"Auto-fixed: {cm} → {primary_agent} (ai_languageModel)")

# #         for mem in memories:
# #             already = self._is_connected(connections, mem, "ai_memory", primary_agent)
# #             if not already:
# #                 connections.setdefault(mem, {})
# #                 connections[mem]["ai_memory"] = [[{"node": primary_agent, "type": "ai_memory", "index": 0}]]
# #                 errors.append(f"Auto-fixed: {mem} → {primary_agent} (ai_memory)")

# #         for vs in vector_stores:
# #             already = self._is_connected(connections, vs, "ai_tool", primary_agent)
# #             if not already:
# #                 connections.setdefault(vs, {})
# #                 connections[vs]["ai_tool"] = [[{"node": primary_agent, "type": "ai_tool", "index": 0}]]
# #                 errors.append(f"Auto-fixed: {vs} → {primary_agent} (ai_tool)")

# #         if vector_stores and embeddings:
# #             vs = vector_stores[0]
# #             for emb in embeddings:
# #                 already = self._is_connected(connections, emb, "ai_embedding", vs)
# #                 if not already:
# #                     connections.setdefault(emb, {})
# #                     connections[emb]["ai_embedding"] = [[{"node": vs, "type": "ai_embedding", "index": 0}]]
# #                     errors.append(f"Auto-fixed: {emb} → {vs} (ai_embedding)")

# #         if doc_loaders and text_splitters:
# #             dl = doc_loaders[0]
# #             for ts in text_splitters:
# #                 already = self._is_connected(connections, ts, "ai_textSplitter", dl)
# #                 if not already:
# #                     connections.setdefault(ts, {})
# #                     connections[ts]["ai_textSplitter"] = [[{"node": dl, "type": "ai_textSplitter", "index": 0}]]
# #                     errors.append(f"Auto-fixed: {ts} → {dl} (ai_textSplitter)")

# #         if vector_stores and doc_loaders:
# #             vs = vector_stores[0]
# #             for dl in doc_loaders:
# #                 already = self._is_connected(connections, dl, "ai_document", vs)
# #                 if not already:
# #                     connections.setdefault(dl, {})
# #                     connections[dl]["ai_document"] = [[{"node": vs, "type": "ai_document", "index": 0}]]
# #                     errors.append(f"Auto-fixed: {dl} → {vs} (ai_document)")

# #         chain_nodes = [n for n in main_nodes if not is_trigger(n)]

# #         for trig in triggers:
# #             trig_conns = connections.get(trig, {})
# #             main_outs  = trig_conns.get("main", [])
# #             has_real_output = any(len(slot) > 0 for slot in main_outs)

# #             if not has_real_output and chain_nodes:
# #                 first_chain = chain_nodes[0]
# #                 connections.setdefault(trig, {})
# #                 connections[trig]["main"] = [[{"node": first_chain, "type": "main", "index": 0}]]
# #                 errors.append(f"Auto-fixed: {trig} → {first_chain} (main)")

# #         agent_has_incoming = any(
# #                 any(
# #                     any(isinstance(c, dict) and c.get("node") == primary_agent for c in slot)
# #                     for slot in port_slots
# #                     if isinstance(slot, list)
# #                 )
# #                 for src, src_conn in connections.items()
# #                 for port, port_slots in src_conn.items()
# #                 if port == "main" and isinstance(port_slots, list)
# #             )

# #         if not agent_has_incoming:
# #             candidates = [n for n in chain_nodes if n != primary_agent]
# #             if candidates:
# #                 last_node = candidates[-1]
# #                 existing = connections.get(last_node, {}).get("main", [[]])
# #                 if existing and len(existing) > 0:
# #                     existing[0].append({"node": primary_agent, "type": "main", "index": 0})
# #                 else:
# #                     connections.setdefault(last_node, {})
# #                     connections[last_node]["main"] = [[{"node": primary_agent, "type": "main", "index": 0}]]
# #                 errors.append(f"Auto-fixed: {last_node} → {primary_agent} (main chain)")

# #         print(f"   🔧 AI connection fixer applied ({len([e for e in errors if 'Auto-fixed' in e])} fixes)")
# #         return connections

# #     def _is_connected(self, connections, source, port, target):
# #         src_conn = connections.get(source, {})
# #         for slot in src_conn.get(port, []):
# #             if isinstance(slot, list) and any(
# #                 isinstance(c, dict) and c.get("node") == target for c in slot
# #             ):
# #                 return True
# #         return False

# #     # ═══════════════════════════════════════════════════════════════
# #     # STEP 4 — VALIDATOR
# #     # ═══════════════════════════════════════════════════════════════
# #     # ═══════════════════════════════════════════════════════════════
# #     # STEP 4 — VALIDATOR
# #     # ═══════════════════════════════════════════════════════════════
# #     def _validator(self, state: WorkflowState) -> WorkflowState:
# #         print("✅ Step 4: Validating...")
# #         errors = []

# #         try:
# #             wf = self._parse_json(state["raw_json"])
# #         except Exception as e:
# #             return {**state, "errors": [f"JSON parse error: {e}"], "workflow": None, "done": False}

# #         wf.setdefault("nodes",       [])
# #         wf.setdefault("connections", {})
# #         wf.setdefault("settings",    {"executionOrder": "v1"})
# #         wf.setdefault("pinData",     {})

# #         node_names = set()
# #         node_type_map: Dict[str, str] = {}

# #         for i, node in enumerate(wf["nodes"]):

# #             if "connections" in node:
# #                 errors.append(f"Node '{node.get('name')}' had connections inside it — removed")
# #                 node.pop("connections")

# #             if isinstance(node.get("typeVersion"), list):
# #                 node["typeVersion"] = node["typeVersion"][0]
# #                 errors.append(f"Node '{node.get('name')}' typeVersion was array — fixed")

# #             if not node.get("id"):
# #                 node["id"] = str(uuid.uuid4())
# #                 errors.append(f"Node '{node.get('name')}' missing id — generated")

# #             if "parameters" not in node:
# #                 node["parameters"] = {}

# #             if isinstance(node.get("position"), dict):
# #                 pos = node["position"]
# #                 node["position"] = [pos.get("x", 300 + i*300), pos.get("y", 300)]

# #             name = node.get("name", f"Node_{i}")
# #             node["name"] = name  # 👈 NEW: LLM பெயர் கொடுக்க மறந்தால், நாமே ஒரு பெயரை செட் செய்துவிடுவோம்!
            
# #             if name in node_names:
# #                 errors.append(f"Duplicate node name: '{name}'")
# #             node_names.add(name)
# #             node_type_map[name] = node.get("type", "")
            
# #             if node.get("type") and node["type"] not in self.schema_map:
# #                 errors.append(f"Unknown node type: '{node['type']}'")
# #             elif node.get("type"):
# #                 schema = self.schema_map[node["type"]]
                
# #                 # 1. Basic Required Fields Check
# #                 for prop in schema.get("key_properties", []):
# #                     if prop.get("required") and prop["name"] not in node.get("parameters", {}):
# #                         errors.append(f"Node '{name}' is missing REQUIRED parameter: '{prop['name']}'")
                
# #                 # 👈 NEW: 2. STRICT VALIDATION FOR COMPLEX NODES (நீங்கள் விட்ட பகுதி இதுதான்)
# #                 ntype = node["type"]
# #                 params = node.get("parameters", {})
                
# #                 if ntype == "n8n-nodes-base.if":
# #                     conds = params.get("conditions", {})
# #                     if not conds or (not conds.get("boolean") and not conds.get("string") and not conds.get("number")):
# #                         errors.append(f"Node '{name}' (IF) has empty conditions! You MUST fill 'conditions.boolean' or 'string'.")
                        
# #                 elif ntype == "n8n-nodes-base.switch":
# #                     rules = params.get("rules", {}).get("values", [])
# #                     if not rules:
# #                         errors.append(f"Node '{name}' (Switch) is missing rules! You MUST fill 'rules.values'.")
                        
# #                 elif "gmail" in ntype.lower() and "trigger" not in ntype.lower():
# #                     has_to = params.get("sendTo") or params.get("toList")
# #                     has_msg = params.get("message") or params.get("htmlMessage") or params.get("textMessage")
# #                     if not has_to:
# #                         errors.append(f"Node '{name}' (Gmail) is missing recipient! You MUST add 'toList' with actual email or expression like '={{{{ $json.senderEmail }}}}'")
# #                     if not has_msg:
# #                         errors.append(f"Node '{name}' (Gmail) is missing email body! You MUST add 'htmlMessage' with actual content.")
                        
# #                 elif "postgres" in ntype.lower():
# #                     if not params.get("query"):
# #                         errors.append(f"Node '{name}' (Postgres) is missing SQL query! You MUST write the SQL query.")
                
# #         # 👈 NEW: AI Model & Memory Missing Check (FOR லூப்பிற்கு வெளியே இருக்க வேண்டும்)
# #         generated_types = [n.get("type", "") for n in wf["nodes"]]
# #         if "@n8n/n8n-nodes-langchain.agent" in generated_types:
# #             if not any("lmChat" in t for t in generated_types):
# #                 errors.append("CRITICAL: AI Agent is missing a Language Model node! Add '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi'")
# #             if not any("memory" in t for t in generated_types):
# #                 errors.append("CRITICAL: AI Agent is missing a Memory node! Add '@n8n/n8n-nodes-langchain.memoryBufferWindow'")

# #         wf["connections"] = self._fix_ai_connections(wf["nodes"], wf["connections"], errors)

# #         if len(wf["nodes"]) > 1 and not wf["connections"]:
# #             errors.append("No connections found — workflow nodes are all disconnected")

# #         # 👈 NEW: MUST மற்றும் CRITICAL என்ற வார்த்தைகள் வந்தாலும் அது Hard Error ஆக கருதப்பட வேண்டும்!
# #         hard_errors = [e for e in errors
# #                if not e.startswith("Auto-fixed")
# #                and (
# #                    "Unknown node type" in e
# #                    or "JSON parse" in e
# #                    or "disconnected" in e
# #                    or "missing REQUIRED parameter" in e
# #                    or "MUST fill" in e        # more specific than bare "MUST"
# #                    or "MUST add" in e
# #                    or "MUST write" in e
# #                    or "CRITICAL:" in e        # colon makes it specific
# #                )]
        
# #         if hard_errors and state["attempt"] < 5:
# #             print(f"   ❌ {len(hard_errors)} hard errors — will retry")
# #             return {**state, "errors": hard_errors, "workflow": wf, "done": False}

# #         auto_fixes = [e for e in errors if "Auto-fixed" in e]
# #         soft_errors = [e for e in errors if e not in auto_fixes and e not in hard_errors]

# #         if auto_fixes:
# #             print(f"   🔧 {len(auto_fixes)} connections auto-fixed")
# #         if soft_errors:
# #             print(f"   ⚠️  {len(soft_errors)} soft issues")
# #         if not hard_errors and not soft_errors:
# #             print("   ✅ Validation passed")

# #         return {**state, "errors": errors, "workflow": wf, "done": True}

# #     # ═══════════════════════════════════════════════════════════════
# #     # LANGGRAPH SETUP
# #     # ═══════════════════════════════════════════════════════════════
# #     def _should_retry(self, state: WorkflowState) -> str:
# #         if state["done"]:
# #             return "end"
# #         if state["attempt"] >= 5:
# #             print("   ⚠️  Max retries reached — returning best effort")
# #             return "end"
# #         return "retry"

# #     def _build_graph(self):
# #         g = StateGraph(WorkflowState)
# #         g.add_node("node_selector",      self._node_selector)
# #         g.add_node("schema_builder",     self._schema_builder)
# #         g.add_node("workflow_generator", self._workflow_generator)
# #         g.add_node("validator",          self._validator)
# #         g.set_entry_point("node_selector")
# #         g.add_edge("node_selector",      "schema_builder")
# #         g.add_edge("schema_builder",     "workflow_generator")
# #         g.add_edge("workflow_generator", "validator")
# #         g.add_conditional_edges(
# #             "validator",
# #             self._should_retry,
# #             {"retry": "workflow_generator", "end": END},
# #         )
# #         return g.compile()

# #     # ═══════════════════════════════════════════════════════════════
# #     # PUBLIC ENTRY POINT
# #     # ═══════════════════════════════════════════════════════════════
# #     def generate(self, user_prompt: str) -> Dict[str, Any]:
# #         print(f"\n{'='*60}")
# #         print(f"WorkflowGeneratorV2: {user_prompt}")
# #         print(f"{'='*60}")

# #         initial_state: WorkflowState = {
# #             "user_prompt":   user_prompt,
# #             "planned_types": [],
# #             "schema_block":  "",
# #             "raw_json":      "",
# #             "workflow":      None,
# #             "errors":        [],
# #             "attempt":       0,
# #             "done":          False,
# #         }

# #         final_state = self.graph.invoke(initial_state)
# #         wf = final_state.get("workflow")
# #         if not wf:
# #             raise Exception("Workflow generation failed after all retries")

# #         nodes = wf.get("nodes", [])
# #         conns = wf.get("connections", {})
# #         print(f"\n🎉 Done: {len(nodes)} nodes, {len(conns)} connections, "
# #               f"{final_state['attempt']} attempt(s)")
# #         return wf

# #     def _parse_json(self, content: str) -> Dict:
# #         content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
# #         content = content.replace("```json","").replace("```","").strip()
# #         try:
# #             parsed = json.loads(content)
# #             if "nodes" in parsed: return parsed
# #             for key in ["workflow","data"]:
# #                 if key in parsed and "nodes" in parsed.get(key, {}):
# #                     return parsed[key]
# #             return parsed
# #         except json.JSONDecodeError:
# #             s, e = content.find('{'), content.rfind('}') + 1
# #             if s != -1 and e > s:
# #                 return json.loads(content[s:e])
# #         raise Exception(f"Cannot parse JSON: {content[:200]}")





"""
workflow_generator_v2.py  —  N8N Cloud style with LangGraph (Enhanced)
======================================================================
Improvements:
- AI Agent always paired with Chat Model + Memory
- Switch node forced for multi-branch routing
- Auto-fill missing email recipients
- Stronger parameter validation
- Retry loop with specific error feedback
"""

import json, os, re, uuid
from typing import TypedDict, List, Dict, Any, Optional

from openai import AzureOpenAI

try:
    from langgraph.graph import StateGraph, END
except ImportError:
    raise ImportError("pip install langgraph")


# ═══════════════════════════════════════════════════════════════════
# BUILT-IN AI NODES
# ═══════════════════════════════════════════════════════════════════
AI_NODES: List[Dict] = [
    {"name": "@n8n/n8n-nodes-langchain.agent",
     "displayName": "AI Agent", "typeVersion": 1.7,
     "description": "Orchestrates model, memory, and tools.",
     "available_actions": []},
    {"name": "@n8n/n8n-nodes-langchain.lmChatAzureOpenAi",
     "displayName": "Azure OpenAI Chat Model", "typeVersion": 1,
     "description": "GPT-4 / GPT-3.5 language model hosted on Azure for AI Agent.",
     "available_actions": []},
    {"name": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
     "displayName": "Window Buffer Memory", "typeVersion": 1.3,
     "description": "Short-term conversation memory for AI Agent.",
     "available_actions": []},
    {"name": "@n8n/n8n-nodes-langchain.vectorStoreInMemory",
     "displayName": "In-Memory Vector Store", "typeVersion": 1.1,
     "description": "RAG vector store tool attached to AI Agent.",
     "available_actions": []},
    {"name": "@n8n/n8n-nodes-langchain.embeddingsOpenAi",
     "displayName": "OpenAI Embeddings", "typeVersion": 1,
     "description": "Embeddings for vector store.",
     "available_actions": []},
    {"name": "@n8n/n8n-nodes-langchain.documentDefaultDataLoader",
     "displayName": "Default Data Loader", "typeVersion": 1,
     "description": "Loads documents into vector store.",
     "available_actions": []},
    {"name": "@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter",
     "displayName": "Recursive Text Splitter", "typeVersion": 1,
     "description": "Splits documents into chunks for vector store.",
     "available_actions": []},
    {"name": "n8n-nodes-base.switch",
     "displayName": "Switch", "typeVersion": 3,
     "description": "Route items to different branches based on multiple conditions (3+ outputs).",
     "available_actions": []},
    {"name": "n8n-nodes-base.webhook",
     "displayName": "Webhook", "typeVersion": 2,
     "description": "HTTP webhook trigger.",
     "available_actions": []},
    {"name": "n8n-nodes-base.respondToWebhook",
     "displayName": "Respond to Webhook", "typeVersion": 1.1,
     "description": "Sends HTTP response from webhook workflow.",
     "available_actions": []},
    {"name": "n8n-nodes-base.gmail",
     "displayName": "Gmail", "typeVersion": 2.1,
     "description": "Consume Gmail API to send and read emails.",
     "available_actions": []},
]

AI_PORT_RULES = {
    "langchain.lm":         "ai_languageModel",
    "langchain.memory":     "ai_memory",
    "langchain.embeddings": "ai_embedding",
    "embeddings":           "ai_embedding",
    "dataloader":           "ai_document",
    "textsplitter":         "ai_textSplitter",
}
VECTORSTORE_KEYWORDS = ["vectorstore", "pinecone", "qdrant", "weaviate", "supabase", "inmemory"]

def _classify_node_role(node_type: str) -> str:
    t = node_type.lower()
    for kw, port in AI_PORT_RULES.items():
        if kw in t:
            return port
    for kw in VECTORSTORE_KEYWORDS:
        if kw in t:
            return "ai_tool"
    if "textsplitter" in t or "text_splitter" in t:
        return "ai_textSplitter"
    return "main"


class WorkflowState(TypedDict):
    user_prompt:     str
    planned_types:   List[str]
    schema_block:    str
    raw_json:        str
    workflow:        Optional[Dict]
    errors:          List[str]
    attempt:         int
    done:            bool


class WorkflowGeneratorV2:
    def __init__(self, clean_nodes_path: str = "clean_nodes.json"):
        print("🚀 WorkflowGeneratorV2 initializing...")
        self.llm = AzureOpenAI(
            api_key       = os.getenv("AZURE_OPENAI_KEY"),
            api_version   = "2024-12-01-preview",
            azure_endpoint= os.getenv("AZURE_OPENAI_ENDPOINT",
                                      os.getenv("AZURE_ENDPOINT", "")),
        )
        self.deployment = os.getenv("DEPLOYMENT_NAME", "gpt-4o")
        self.schema_map: Dict[str, Dict] = {}
        self._load_nodes(clean_nodes_path)
        self.catalogue = self._build_catalogue()
        self.graph = self._build_graph()

    def _load_nodes(self, path: str):
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                nodes = json.load(f)
            for n in nodes:
                self.schema_map[n["name"]] = n
        for n in AI_NODES:
            self.schema_map.setdefault(n["name"], n)
        print(f"✅ Loaded {len(self.schema_map)} node schemas")

    def _build_catalogue(self) -> str:
        lines = []
        for node in self.schema_map.values():
            actions = [
                a["actionName"] for a in node.get("available_actions", [])
                if a.get("actionName") and a.get("actionValue") != "__CUSTOM_API_CALL__"
            ]
            line = f"{node['displayName']} | {node['name']}"
            if actions:
                line += f" | ops: {', '.join(actions[:6])}"
            if node.get("description"):
                line += f" | {node['description'][:80]}"
            lines.append(line)
        return "\n".join(lines)

    def _chat(self, system: str, user: str, max_tokens: int = 1000, temp: float = 0) -> str:
        r = self.llm.chat.completions.create(
            model    = self.deployment,
            messages = [{"role": "system", "content": system},
                        {"role": "user",   "content": user}],
            max_tokens  = max_tokens,
            temperature = temp,
        )
        return r.choices[0].message.content.strip()

    # ═══════════════════════════════════════════════════════════════
    # STEP 1 — NODE SELECTOR (ENHANCED)
    # ═══════════════════════════════════════════════════════════════
    def _node_selector(self, state: WorkflowState) -> WorkflowState:
        print("🔍 Step 1: Selecting nodes...")
        system = """You are an expert n8n workflow planner.
Given a user request and a node catalogue, return ONLY a JSON array of internal node type strings.

STRICT RULES:
- Return raw JSON array only. No markdown. No explanation.
- Include ALL nodes needed — trigger, logic, output.
- Select node types STRICTLY from the provided CATALOGUE. Do not invent names.
- AI MANDATORY PAIRING: If the prompt requires AI (intent detection, text analysis), you MUST select:
    "@n8n/n8n-nodes-langchain.agent"
    "@n8n/n8n-nodes-langchain.lmChatAzureOpenAi"
    "@n8n/n8n-nodes-langchain.memoryBufferWindow"
- ROUTING RULES:
    * For 3 or more distinct branches, select "n8n-nodes-base.switch".
    * For simple True/False or 2-way routing, select "n8n-nodes-base.if".
- DUPLICATE node types are allowed if used multiple times.
"""

        user = f"CATALOGUE:\n{self.catalogue}\n\nUSER REQUEST:\n{state['user_prompt']}\n\nReturn JSON array:"
        raw  = self._chat(system, user, max_tokens=1500)
        raw  = raw.replace("```json","").replace("```","").strip()

        try:
            types = json.loads(raw)
            valid = [t for t in types if t in self.schema_map]
            # Force-add AI sub-nodes if Agent present but model/memory missing
            if "@n8n/n8n-nodes-langchain.agent" in valid:
                if "@n8n/n8n-nodes-langchain.lmChatAzureOpenAi" not in valid:
                    valid.append("@n8n/n8n-nodes-langchain.lmChatAzureOpenAi")
                if "@n8n/n8n-nodes-langchain.memoryBufferWindow" not in valid:
                    valid.append("@n8n/n8n-nodes-langchain.memoryBufferWindow")
            print(f"   Planned {len(valid)} nodes: {valid}")
            return {**state, "planned_types": valid}
        except Exception as e:
            print(f"   ⚠️  Parse error: {e}. Using fallback.")
            return {**state, "planned_types": [
                "n8n-nodes-base.gmailTrigger",
                "@n8n/n8n-nodes-langchain.agent",
                "@n8n/n8n-nodes-langchain.lmChatAzureOpenAi",
                "@n8n/n8n-nodes-langchain.memoryBufferWindow",
                "n8n-nodes-base.switch",
                "n8n-nodes-base.gmail",
            ]}

    # ═══════════════════════════════════════════════════════════════
    # STEP 2 — SCHEMA BUILDER
    # ═══════════════════════════════════════════════════════════════
    # def _schema_builder(self, state: WorkflowState) -> WorkflowState:
    #     print("📋 Step 2: Building schemas...")
    #     lines = []
    #     for nt in state["planned_types"]:
    #         node = self.schema_map.get(nt)
    #         if not node:
    #             continue
    #         actions = [
    #             a["actionName"] for a in node.get("available_actions", [])
    #             if a.get("actionName") and a.get("actionValue") != "__CUSTOM_API_CALL__"
    #         ]
    #         props_lines = []
    #         for p in node.get("key_properties", []):
    #             line = f"    - {p['name']} ({p['type']})"
    #             if p.get("required"):
    #                 line += " [REQUIRED]"
    #             if p.get("default") not in [None, ""]:
    #                 line += f" default='{p['default']}'"
    #             if p.get("options"):
    #                 opts = [o["value"] for o in p["options"][:5]]
    #                 line += f" options={opts}"
    #             props_lines.append(line)
    #         cred_names = [c["name"] for c in node.get("credentials", []) if c.get("required")]
    #         lines.append(
    #             f"NODE:\n"
    #             f"  type        : {node['name']}\n"
    #             f"  displayName : {node['displayName']}\n"
    #             f"  typeVersion : {node['typeVersion']}\n"
    #             f"  description : {node.get('description','')}\n"
    #             f"  operations  : {', '.join(actions) if actions else 'N/A'}\n"
    #             f"  parameters  :\n" +
    #             ("\n".join(props_lines) if props_lines else "    (no schema)") + "\n" +
    #             (f"  credentials : {', '.join(cred_names)}\n" if cred_names else "")
    #         )
    #     return {**state, "schema_block": "\n".join(lines)}
    def _schema_builder(self, state: WorkflowState) -> WorkflowState:
        print("📋 Step 2: Building high-accuracy schemas...")
        lines = []
        for nt in state["planned_types"]:
            node = self.schema_map.get(nt)
            if not node: continue

            props_lines = []
            for p in node.get("key_properties", []):
                # ✅ Semma accuracy-ku displayName matrum description sethurukkom
                line = f"    - {p.get('displayName')} (ID: {p['name']}, type: {p['type']})"
                if p.get("required"): line += " [REQUIRED]"
                
                # ✅ GPT-4o parameter eppo use pannanum-nu purinjikka idhu dhaan key
                if p.get("displayOptions"):
                    line += f" | Only show if: {json.dumps(p['displayOptions'])}"
                
                if p.get("description"):
                    line += f" | Info: {p['description']}"
                
                if p.get("options"):
                    opts = [o["value"] for o in p["options"][:10]] # Increased to 10
                    line += f" | options: {opts}"
                
                props_lines.append(line)

            lines.append(
                f"NODE: {node['displayName']} ({node['name']})\n"
                f"  Version: {node['typeVersion']}\n"
                f"  Description: {node.get('description','')}\n"
                f"  Parameters:\n" + ("\n".join(props_lines) if props_lines else "    (no schema)") + "\n"
            )
        return {**state, "schema_block": "\n".join(lines)}

    # ═══════════════════════════════════════════════════════════════
    # STEP 3 — WORKFLOW GENERATOR (STRONGER PROMPT)
    # ═══════════════════════════════════════════════════════════════
    def _workflow_generator(self, state: WorkflowState) -> WorkflowState:
        attempt = state["attempt"]
        print(f"⚙️  Step 3: Generating workflow (attempt {attempt+1})...")

        error_section = ""
        if state["errors"] and attempt > 0:
            error_section = "\nFIX THESE ERRORS FROM LAST ATTEMPT:\n" + "\n".join(f"- {e}" for e in state["errors"])

        system = f"""You are a Master n8n Workflow Architect. Generate a complete, import-ready n8n workflow JSON.

═══════════════════════════════════════
STEP 0 — ANALYZE USER INTENT (DO THIS FIRST, IT DRIVES EVERYTHING)
═══════════════════════════════════════
Read the user's REQUEST carefully and decide:
  (a) What IS the workflow's decision / extraction goal? (e.g. classify email as support vs sales, detect meeting requests, extract order details, triage bug reports, decide sentiment, etc.)
  (b) What specific JSON fields does the AI Agent need to OUTPUT so downstream IF / Switch nodes can route correctly?
  (c) What exact field names and value types do the IF / Switch conditions require?

The AI Agent's `systemMessage` and the downstream IF / Switch `leftValue` MUST be generated from THIS analysis — DO NOT copy a generic product-inquiry template. The fields the Agent extracts MUST match the user's actual workflow intent.

Field-naming rules (MUST follow):
- Use camelCase field names that reflect the user's domain (e.g. `isMeeting`, `urgencyLevel`, `customerName`, `category`, `sentiment`).
- The IF / Switch `leftValue` MUST reference the EXACT same field the Agent's systemMessage instructs it to return. If the Agent is told to output `{{"category": "..."}}`, the IF leftValue MUST be `={{{{ $json.category }}}}`.
- Boolean flags returned by the Agent arrive as strings — compare as `"true"` / `"false"` strings.

═══════════════════════════════════════
CRITICAL RULES (FAILURE TO FOLLOW WILL CAUSE REJECTION)
═══════════════════════════════════════
1. **POPULATE ALL REQUIRED PARAMETERS** – Never leave "parameters" empty.
2. **EMAIL RECIPIENTS** – Every Gmail send node MUST have "sendTo". To reply to a Gmail Trigger sender use: "={{ $node['Gmail Trigger'].json.From }}". Gmail Trigger fields are FLAT and CAPITALISED: From, Subject, To, snippet.
3. **CONDITIONS** – IF and Switch nodes MUST have properly filled "conditions". See CHEAT SHEET below.
4. **AI SUB-NODES** – When using AI Agent, you MUST also generate Chat Model and Memory nodes and connect them to the Agent via `ai_languageModel` and `ai_memory` ports.
5. **MULTI-BRANCH ROUTING** – For >2 distinct outcomes, use Switch node, NOT IF.
6. **EXPRESSION SYNTAX** – Combine text and data with `=`. Example: "message": "=Hello {{{{ $json.name }}}}"
7. **PARAMETER DEPENDENCIES** – Strictly look at the "Only show if" (displayOptions) in the schema. Do not fill a parameter if its parent resource/operation doesn't match the condition.
8. **DESCRIPTIVE FILLING** – Use the provided "Info" (description) for each parameter to understand what value to map from the user's request.
9. **NEVER LEAVE PARAMETERS EMPTY** - Fill every required field and any field mentioned in the user request.
10. **USE DESCRIPTIONS** - Look at the "Info" provided in the schema to map user data to the correct parameter ID.
11. **MANDATORY GMAIL FIELDS** - For 'send' operation, you MUST fill 'sendTo', 'subject', and 'message'.
12. **AGENT ↔ CONDITION ALIGNMENT** - Every field the AI Agent is told to emit MUST appear as a `$json.<fieldName>` in at least one downstream IF/Switch `leftValue`, AND every downstream condition's `leftValue` field MUST be a field the Agent is explicitly told to emit.
═══════════════════════════════════════
TOPOLOGY AND CONNECTIONS RULES (CRITICAL)
═══════════════════════════════════════
1. Every node MUST appear as a SOURCE in "connections" (except true terminal leaf nodes).
2. The `"index"` inside each connection object is the INCOMING port — always 0 for "main".
3. NEVER connect a Trigger directly to an AI sub-node via "main".
4. Node names in "connections" MUST exactly match the "name" field in the nodes array (case-sensitive).
5. IF NODE — outer array slot 0 = True branch, slot 1 = False branch. BOTH slots are required.
6. Parallel branch nodes (e.g. two Gmail sends after an IF) MUST NOT be connected to each other.

COMPLETE EXAMPLE — Gmail Trigger → AI Agent → IF → two Gmail sends:
"connections": {{
  "Gmail Trigger": {{
    "main": [[{{"node": "AI Agent", "type": "main", "index": 0}}]]
  }},
  "Azure OpenAI Chat Model": {{
    "ai_languageModel": [[{{"node": "AI Agent", "type": "ai_languageModel", "index": 0}}]]
  }},
  "Window Buffer Memory": {{
    "ai_memory": [[{{"node": "AI Agent", "type": "ai_memory", "index": 0}}]]
  }},
  "AI Agent": {{
    "main": [[{{"node": "Check Condition", "type": "main", "index": 0}}]]
  }},
  "Check Condition": {{
    "main": [
      [{{"node": "Send Approval Email", "type": "main", "index": 0}}],
      [{{"node": "Send Rejection Email", "type": "main", "index": 0}}]
    ]
  }},
  "Send Approval Email": {{}},
  "Send Rejection Email": {{}}
}}
NOTE: "Send Approval Email" and "Send Rejection Email" are leaf nodes — they have empty {{}} connections, NOT connected to each other.
═══════════════════════════════════════
GMAIL TRIGGER RULES (MANDATORY)
═══════════════════════════════════════
- "pollTimes" MUST be an array of cron strings. Example: ["*/5 * * * *"]
- DO NOT include "sendTo" or "simple" fields in Gmail Trigger.
- Use expression only inside parameters that support it.
═══════════════════════════════════════
SYNTAX CHEAT SHEET (COPY EXACT STRUCTURE)
═══════════════════════════════════════

**GMAIL NODE** (n8n-nodes-base.gmail) — sending a reply to a Gmail Trigger email:
CRITICAL: After an AI Agent node, $json is the AGENT OUTPUT, not the Gmail Trigger data.
Reference the Gmail Trigger node by its exact name to get sender info.
"parameters": {{
  "operation": "send",
  "sendTo": "={{{{ $node['Gmail Trigger'].json.From }}}}",
  "subject": "=Re: {{{{ $node['Gmail Trigger'].json.Subject }}}}",
  "message": "=Hello, here is your reply..."
}}
GMAIL TRIGGER REAL FIELD NAMES (capital letters, flat structure — verified from actual output):
- Sender (with name)  → $node['Gmail Trigger'].json.From      e.g. "John <john@gmail.com>"
- Subject             → $node['Gmail Trigger'].json.Subject
- Recipient           → $node['Gmail Trigger'].json.To
- Email body/snippet  → $node['Gmail Trigger'].json.snippet
- NEVER use .from.value[0].address or .from.text — those fields do NOT exist ❌

**IF NODE** (n8n-nodes-base.if – typeVersion 2):
IMPORTANT: ALWAYS use typeValidation "loose" and looseTypeValidation true — AI Agent output values
arrive as strings even when they look like booleans/numbers. Strict mode will throw type errors.

CRITICAL — WHEN THE IF NODE READS FROM AN AI AGENT:
The AI Agent does NOT emit flat fields. Its output is ALWAYS wrapped like:
  [ {{ "output": "{{\\"isProduct\\":\\"true\\",\\"productName\\":\\"Lenovo\\"}}" }} ]
So `$json.isProduct` is undefined and the IF ALWAYS falls through to False.
You MUST parse $json.output inside the expression:
  leftValue:  "={{{{ JSON.parse($json.output).isProduct }}}}"   ✅ CORRECT
  leftValue:  "={{{{ $json.isProduct }}}}"                        ❌ WRONG — will always be undefined
(If the node directly following the Agent is NOT the IF node — e.g. there's a Code/Set in between
that has already parsed the output — then plain $json.fieldName is fine.)

CRITICAL — WHEN ANY NODE READS FROM A DATABASE / HTTP NODE (not just IF):
Postgres, MySQL, MongoDB and HTTP Request nodes emit ONE ITEM PER ROW. Each item is ALREADY
the flat row object — there is NO `rows` wrapper. Example actual output:
  [ {{ "id": 1, "name": "Laptop", "price": "75000.00", "stock": 15 }} ]
This rule applies to EVERY downstream expression — IF leftValues, Gmail `message` / `subject` /
`sendTo`, HTTP Request bodies, Set node values, Slack text, etc.:
  "={{{{ $json.stock }}}}"            ✅ CORRECT (everywhere)
  "={{{{ $json.rows[0].stock }}}}"    ❌ WRONG — "rows" does not exist
  "={{{{ $json.data[0].stock }}}}"    ❌ WRONG — "data" does not exist
  "={{{{ $items[0].json.stock }}}}"   ❌ WRONG — use $json instead
Example Gmail reply that inlines DB data:
  "message": "=Hi {{{{ $json.name }}}}, the price is {{{{ $json.price }}}} and stock is {{{{ $json.stock }}}}."
To reference a specific upstream node's first item (e.g. when the current node runs in a different
branch after a fan-out), use $node['Postgres'].json.stock — NOT $json.rows[0].

"parameters": {{
  "looseTypeValidation": true,
  "conditions": {{
    "options": {{ "caseSensitive": true, "leftValue": "", "typeValidation": "loose" }},
    "conditions": [
      {{
        "id": "condition-1",
        "leftValue": "={{{{ JSON.parse($json.output).status }}}}",
        "rightValue": "active",
        "operator": {{ "type": "string", "operation": "equals", "name": "filter.operator.equals" }}
      }}
    ],
    "combinator": "and"
  }}
}}
RULES FOR IF NODE:
- ALWAYS set "looseTypeValidation": true and "typeValidation": "loose" — required when input comes from AI Agent
- If the upstream node is an AI Agent, leftValue MUST use JSON.parse($json.output).<field> (see above)
- For boolean fields from AI output, use operator.type "string" and compare rightValue as "true" or "false" (strings)
- "operator.type": use "string" for AI Agent output fields (even for booleans/numbers — they arrive as strings)
- "operator.operation" options: "equals", "notEquals", "contains", "startsWith", "endsWith", "exists"
- NEVER leave leftValue or rightValue as empty strings

**SWITCH NODE** (n8n-nodes-base.switch – typeVersion 3):
Same AI Agent rule as IF: if upstream is an AI Agent, leftValue MUST be JSON.parse($json.output).<field>.
"parameters": {{
  "mode": "rules",
  "rules": {{
    "values": [
      {{
        "conditions": {{
          "conditions": [ {{ "leftValue": "={{{{ JSON.parse($json.output).intent }}}}", "rightValue": "product", "operator": {{"type": "string", "operation": "equals"}} }} ],
          "combinator": "and"
        }},
        "renameOutput": true,
        "outputKey": "product"
      }},
      ... (one object per branch)
    ]
  }}
}}

**AI AGENT** (@n8n/n8n-nodes-langchain.agent):
The `text` field gives the agent the raw input. The `systemMessage` MUST be WRITTEN BY YOU
specifically for the current user request — it declares the extraction schema the workflow needs.

SHAPE (fill with fields derived from the user's workflow intent, NOT this example's field names):
"parameters": {{
  "promptType": "define",
  "text": "=From: {{{{ $json.From }}}}\nSubject: {{{{ $json.Subject }}}}\nMessage: {{{{ $json.snippet }}}}",
  "options": {{
    "systemMessage": "You are a <role that matches the user's workflow>. Read the input and return ONLY a valid JSON object — no prose, no markdown, no code block.\n\nReturn this EXACT structure:\n{{\n  \\"<fieldA>\\": <type>,\n  \\"<fieldB>\\": <type>,\n  ...\n}}\n\nField rules:\n- <fieldA>: <precise extraction rule tied to the user's goal>\n- <fieldB>: <precise extraction rule>\n- Use null when a field cannot be determined.\n- Return ONLY the JSON object. No extra text."
  }}
}}

HOW TO CHOOSE FIELDS (worked examples — DO NOT copy blindly, derive from REQUEST):
  • "Triage support emails into billing / technical / other" →
      fields: {{"category": "billing|technical|other", "priority": "low|medium|high", "customerName": "..."}}
      IF leftValue → "={{{{ JSON.parse($json.output).category }}}}"
  • "If the email is a meeting request, schedule it, else reply politely" →
      fields: {{"isMeetingRequest": true|false, "proposedTime": "...", "senderName": "..."}}
      IF leftValue → "={{{{ JSON.parse($json.output).isMeetingRequest }}}}"  rightValue "true"
  • "Detect order cancellation requests and forward to ops" →
      fields: {{"isCancellation": true|false, "orderId": "...", "reason": "..."}}
  • "Summarise the email and decide sentiment" →
      fields: {{"sentiment": "positive|neutral|negative", "summary": "...", "senderName": "..."}}
  In EVERY case: the IF / Switch conditions downstream MUST read the same field names you declared above,
  and MUST wrap them in JSON.parse($json.output).<fieldName> because the Agent returns a single stringified `output`.

CRITICAL — AI AGENT RULES:
1. "text" for Gmail Trigger MUST include From + Subject + snippet so the agent has the full context:
   "text": "=From: {{{{ $json.From }}}}\nSubject: {{{{ $json.Subject }}}}\nMessage: {{{{ $json.snippet }}}}"
2. systemMessage MUST be custom-written for THIS workflow. It MUST instruct the agent to return a concrete JSON object whose keys are exactly the field names used by downstream IF / Switch nodes.
3. Never reuse a templated schema (e.g. isProduct / productName / firstName) unless the user explicitly asked for a product-inquiry workflow.
4. Downstream IF / Switch `leftValue` MUST be `={{{{ $json.<exactFieldAgentEmits> }}}}`. Mismatched names are REJECTED.
5. Webhook → "text": "={{ $json.body }}"

**CHAT MODEL** (@n8n/n8n-nodes-langchain.lmChatAzureOpenAi):
"parameters": {{ "model": "gpt-4o" }}

**MEMORY** (@n8n/n8n-nodes-langchain.memoryBufferWindow):
"parameters": {{ "contextWindowLength": 10 }}

**WAIT NODE** (n8n-nodes-base.wait):
"parameters": {{ "amount": 24, "unit": "hours" }}

**POSTGRES / MYSQL NODE** (n8n-nodes-base.postgres, n8n-nodes-base.mySql):
CRITICAL: Inline values from the previous node using n8n expressions — do NOT use $1, $2, ?, :name placeholders.
The query is NOT parameter-bound here; n8n evaluates {{{{ $json.field }}}} at runtime and substitutes the literal.
"parameters": {{
  "operation": "executeQuery",
  "query": "=SELECT id, name, price, stock FROM products WHERE name = '{{{{ JSON.parse($json.output).productName }}}}' LIMIT 1;"
}}
RULES FOR DATABASE QUERIES:
- The query string MUST start with "=" so n8n evaluates embedded expressions.
- Inline every parameter as "={{{{ $json.<fieldName> }}}}" (or JSON.parse($json.output).<field> if upstream is an AI Agent).
- NEVER emit $1, $2, $3, ?, :param — n8n's Postgres node does not bind parameters from previous-node JSON that way.
- Quote string values with single quotes: WHERE email = '{{{{ $json.senderEmail }}}}'
- Numeric values: no quotes: WHERE stock > {{{{ $json.minStock }}}}
- For multi-row INSERTs from AI Agent output, parse once: SET productName = '{{{{ JSON.parse($json.output).productName }}}}'

{error_section}
"""

        user = (
            f"SCHEMAS:\n{state['schema_block']}\n\n"
            f"REQUEST: {state['user_prompt']}\n\n"
            f"Generate complete workflow JSON:"
        )

        raw = self._chat(system, user, max_tokens=12000, temp=0.1)
        # 2. VERSION FIXING LOGIC - IDHU DHAAN NEENGA KETADHU 🚀
        try:
            clean_json_str = raw.replace("```json", "").replace("```", "").strip()
            workflow_data = json.loads(clean_json_str)
            
            if "nodes" in workflow_data:
                for node in workflow_data["nodes"]:
                    node_type = node.get("type")
                    if node_type in self.schema_map:
                        db_version = self.schema_map[node_type].get("typeVersion", 1)
                        # Convert to integer (n8n expects number, not string)
                        try:
                            node["typeVersion"] = int(float(db_version))
                        except (ValueError, TypeError):
                            node["typeVersion"] = 1
            print(f"   ✅ Versions synced with local database.")
            
            return {
                **state, 
                "raw_json": json.dumps(workflow_data),
                "workflow": workflow_data, 
                "attempt": attempt + 1
            }
        except Exception as e:
            print(f"   ⚠️ JSON parse / version fix failed: {e}")
            return {**state, "raw_json": raw, "attempt": attempt + 1}
    # ═══════════════════════════════════════════════════════════════
    # DYNAMIC AI CONNECTION FIXER
    # ═══════════════════════════════════════════════════════════════
    # def _fix_ai_connections(self, nodes: List[Dict], connections: Dict, errors: List[str]) -> Dict:
    #     name_to_node = {n["name"]: n for n in nodes}
    #     name_to_type = {n["name"]: n.get("type","") for n in nodes}

    #     def role(name: str) -> str:
    #         return _classify_node_role(name_to_type.get(name, ""))

    #     agents        = [n["name"] for n in nodes if "langchain.agent" in n.get("type","").lower()]
    #     chat_models   = [n["name"] for n in nodes if _classify_node_role(n.get("type","")) == "ai_languageModel"]
    #     memories      = [n["name"] for n in nodes if _classify_node_role(n.get("type","")) == "ai_memory"]
    #     vector_stores = [n["name"] for n in nodes if _classify_node_role(n.get("type","")) == "ai_tool"]
    #     embeddings    = [n["name"] for n in nodes if _classify_node_role(n.get("type","")) == "ai_embedding"]
    #     doc_loaders   = [n["name"] for n in nodes if _classify_node_role(n.get("type","")) == "ai_document"]
    #     text_splitters= [n["name"] for n in nodes if _classify_node_role(n.get("type","")) == "ai_textSplitter"]

    #     TRIGGER_KEYWORDS = ["webhook", "emailreadimap", "scheduletrigger", "manualTrigger", "cron", "interval", "emailtrigger", "formtrigger", "httprequest"]
    def _fix_ai_connections(self, nodes: List[Dict], connections: Dict, errors: List[str]) -> Dict:
        import copy
        conns = copy.deepcopy(connections)

        # ── 1. AI sub-node ports (always enforce, direction is fixed) ────────
        agent = next((n["name"] for n in nodes if "langchain.agent" in n.get("type", "")), None)
        if agent:
            chat_model = next((n["name"] for n in nodes if "lmChatAzureOpenAi" in n.get("type", "")), None)
            memory     = next((n["name"] for n in nodes if "memoryBufferWindow" in n.get("type", "")), None)
            vs         = next((n["name"] for n in nodes if "vectorStoreInMemory" in n.get("type", "")), None)
            embeddings = next((n["name"] for n in nodes if "embeddingsOpenAi" in n.get("type", "")), None)
            doc_loader = next((n["name"] for n in nodes if "documentDefaultDataLoader" in n.get("type", "")), None)
            txt_split  = next((n["name"] for n in nodes if "textSplitter" in n.get("type", "")), None)

            for src, port, tgt in [
                (chat_model, "ai_languageModel", agent),
                (memory,     "ai_memory",        agent),
                (vs,         "ai_tool",          agent),
                (embeddings, "ai_embedding",     vs),
                (doc_loader, "ai_document",      vs),
                (txt_split,  "ai_textSplitter",  doc_loader),
            ]:
                if src and tgt:
                    conns.setdefault(src, {})
                    conns[src][port] = [[{"node": tgt, "type": port, "index": 0}]]
                    errors.append(f"Auto-fixed: {src} → {tgt} ({port})")

        # ── 2. Main-flow connections: NEVER auto-generate — LLM must supply them.
        #       Auto-generating a linear chain breaks branched workflows (IF/Switch).
        #       Missing connections are caught by PASS 4 validator and trigger a retry.

        return conns

    def _is_connected(self, connections: Dict, source: str, port: str, target: str) -> bool:
        src_conn = connections.get(source, {})
        for slot in src_conn.get(port, []):
            if any(c.get("node") == target for c in slot):
                return True
        return False

    # ═══════════════════════════════════════════════════════════════
    # STEP 4 — VALIDATOR (WITH AUTO-FILL FOR EMAIL & SHEETS)
    # ═══════════════════════════════════════════════════════════════
    def _validator(self, state: WorkflowState) -> WorkflowState:
        print("✅ Step 4: Validating & Auto-Fixing...")
        errors = []

        # Prefer already-parsed workflow from generator; fall back to re-parsing raw_json
        wf = state.get("workflow")
        if not wf or not isinstance(wf, dict) or "nodes" not in wf:
            try:
                wf = self._parse_json(state["raw_json"])
            except Exception as e:
                # If we still have nothing, bail out
                existing = state.get("workflow")
                if existing and isinstance(existing, dict) and "nodes" in existing:
                    wf = existing
                else:
                    print(f"   ❌ JSON parse failed: {e}")
                    return {**state, "errors": [f"JSON parse error: {e}"], "workflow": None, "done": False}

        wf.setdefault("nodes", [])
        wf.setdefault("connections", {})
        wf.setdefault("settings", {"executionOrder": "v1"})
        wf.setdefault("pinData", {})

        node_names = set()
        node_type_map = {}

        # ─────────────────────────────────────────────────────────────────
        # PASS 1: Fix each node (Gmail Trigger, Azure OpenAI, etc.)
        # ─────────────────────────────────────────────────────────────────
        for i, node in enumerate(wf["nodes"]):
            # Remove connections from inside node (top-level only)
            if "connections" in node:
                errors.append(f"Node '{node.get('name')}' had connections inside it — removed")
                node.pop("connections")

            # Fix typeVersion array → single number
            if isinstance(node.get("typeVersion"), list):
                node["typeVersion"] = node["typeVersion"][0]

            # Ensure id
            if not node.get("id"):
                node["id"] = str(uuid.uuid4())

            # Ensure name & type
            if "name" not in node:
                node["name"] = f"Node_{i}"
            if "type" not in node:
                node["type"] = ""
                errors.append(f"Node '{node['name']}' missing type")

            name = node["name"]
            if "parameters" not in node:
                node["parameters"] = {}

            # =============================================================
            # FIX 1: GMAIL TRIGGER
            # =============================================================
            if node["type"] == "n8n-nodes-base.gmailTrigger":
                params = node["parameters"]
                # Fix pollTimes: object → array of cron strings
                if "pollTimes" in params:
                    if isinstance(params["pollTimes"], dict) and "values" in params["pollTimes"]:
                        # Convert { "values": [{"time": "*/5 * * * *"}] } → ["*/5 * * * *"]
                        old = params["pollTimes"]["values"]
                        if isinstance(old, list) and len(old) > 0:
                            first = old[0]
                            if isinstance(first, dict) and "time" in first:
                                params["pollTimes"] = [first["time"]]
                            else:
                                params["pollTimes"] = ["*/5 * * * *"]
                        else:
                            params["pollTimes"] = ["*/5 * * * *"]
                    elif not isinstance(params["pollTimes"], list):
                        params["pollTimes"] = ["*/5 * * * *"]
                else:
                    params["pollTimes"] = ["*/5 * * * *"]

                # Remove invalid fields
                params.pop("sendTo", None)
                params.pop("simple", None)
                node["parameters"] = params
                errors.append(f"Auto-fixed: Gmail Trigger '{name}' – pollTimes and invalid fields")

            # =============================================================
            # FIX 2: GMAIL SEND — fix sendTo / subject using real Gmail Trigger field names
            # Gmail Trigger outputs FLAT CAPITALISED fields: From, Subject, To, snippet
            # =============================================================
            if node.get("type") == "n8n-nodes-base.gmail":
                params = node.get("parameters", {})

                # Find the actual Gmail Trigger node name
                gmail_trigger_name = next(
                    (n["name"] for n in wf["nodes"] if n.get("type") == "n8n-nodes-base.gmailTrigger"),
                    "Gmail Trigger"
                )
                has_agent = any("langchain.agent" in n.get("type", "") for n in wf["nodes"])

                # Correct expressions — Gmail Trigger fields are From, Subject, To, snippet (capitalised, flat)
                # After an AI Agent, $json context changes to agent output, so must use $node[] reference
                correct_email = f"={{{{ $node['{gmail_trigger_name}'].json.From }}}}"
                correct_subj  = f"=Re: {{{{ $node['{gmail_trigger_name}'].json.Subject }}}}"

                send_to = params.get("sendTo", "")

                # Patterns that are definitely wrong
                WRONG_PATTERNS = [
                    "from.value[0]", "$json.email", ".item.json.From",
                    "$json.from.text", "$json.from\"",
                ]
                # Also wrong: bare $json.From after an agent (context has shifted to agent output)
                bare_json_from = "$json.From" in send_to and f"$node['{gmail_trigger_name}']" not in send_to

                send_to_wrong = any(p in send_to for p in WRONG_PATTERNS) or (has_agent and bare_json_from) or not send_to

                if send_to_wrong:
                    params["sendTo"] = correct_email
                    node["parameters"] = params
                    errors.append(f"Auto-fixed: Gmail node '{name}' sendTo → {correct_email}")

                # Fix subject using correct capitalised field name
                subj = params.get("subject", "")
                subj_wrong = (
                    ("$json.subject" in subj and "$node" not in subj) or
                    (has_agent and "$json.Subject" in subj and f"$node['{gmail_trigger_name}']" not in subj)
                )
                if subj_wrong or not subj:
                    params["subject"] = correct_subj
                    node["parameters"] = params
                    errors.append(f"Auto-fixed: Gmail node '{name}' subject → {correct_subj}")

            # =============================================================
            # FIX 3: AZURE OPENAI CHAT MODEL – add mandatory fields
            # =============================================================
            if "lmChatAzureOpenAi" in node["type"]:
                params = node["parameters"]
                if "deploymentName" not in params:
                    params["deploymentName"] = "your-deployment-name"
                    errors.append(f"Auto-fixed: Added placeholder deploymentName to '{name}'")
                if "apiKey" not in params:
                    params["apiKey"] = "your-api-key"
                    errors.append(f"Auto-fixed: Added placeholder apiKey to '{name}'")
                if "endpoint" not in params:
                    params["endpoint"] = "https://your-resource.openai.azure.com/"
                    errors.append(f"Auto-fixed: Added placeholder endpoint to '{name}'")
                node["parameters"] = params

            # =============================================================
            # FIX 3: AI AGENT — correct "text" prompt field per trigger type
            # =============================================================
            if "langchain.agent" in node.get("type", ""):
                params = node.get("parameters", {})
                text_val = params.get("text", "")
                # Detect trigger type from other nodes in the workflow
                trigger_types = [n.get("type", "") for n in wf["nodes"]]
                has_gmail_trigger = any("gmailTrigger" in t for t in trigger_types)
                has_webhook       = any("webhook" in t.lower() and "respond" not in t.lower() for t in trigger_types)

                # Fix text field for Gmail — must include From + Subject + snippet for full extraction
                FULL_GMAIL_TEXT = "=From: {{ $json.From }}\nSubject: {{ $json.Subject }}\nMessage: {{ $json.snippet }}"
                if has_gmail_trigger and (
                    not text_val or
                    "$json.body" in text_val or
                    text_val == "={{ $json.snippet }}" or
                    ("$json.snippet" in text_val and "$json.From" not in text_val)
                ):
                    params["text"] = FULL_GMAIL_TEXT
                    node["parameters"] = params
                    errors.append(f"Auto-fixed: AI Agent '{name}' text → full Gmail context (From + Subject + snippet)")

                # Only flag a missing systemMessage — do NOT hardcode domain-specific fields here.
                # The systemMessage must be generated by the LLM based on the user's workflow intent.
                sys_msg = params.get("options", {}).get("systemMessage", "")
                if not sys_msg.strip():
                    errors.append(
                        f"CRITICAL: AI Agent '{name}' has no systemMessage. Analyze the user's workflow "
                        f"intent and write a systemMessage that instructs the agent to return a JSON object "
                        f"whose field names EXACTLY match the leftValue fields used by the downstream "
                        f"IF/Switch nodes. Do NOT reuse a product-inquiry template."
                    )
                # Ensure promptType is set (required for custom text)
                if "text" in params and params.get("promptType", "") != "define":
                    params["promptType"] = "define"
                    node["parameters"] = params
                    errors.append(f"Auto-fixed: AI Agent '{name}' promptType set to 'define'")
                # Ensure text is not empty or missing
                if not params.get("text") or params.get("text") in ("", "="):
                    if has_gmail_trigger:
                        params["text"] = "={{ $json.snippet }}"
                    elif has_webhook:
                        params["text"] = "={{ $json.body }}"
                    else:
                        params["text"] = "={{ $json.text || $json.input || $json.body }}"
                    params["promptType"] = "define"
                    node["parameters"] = params
                    errors.append(f"Auto-fixed: AI Agent '{name}' text was empty — set to correct prompt field")

            # =============================================================
            # FIX 4: EMAIL SEND (sendAndWait) – ensure approvalOptions
            # =============================================================
            if node["type"] == "n8n-nodes-base.emailSend" and node.get("parameters", {}).get("operation") == "sendAndWait":
                params = node["parameters"]
                if "approvalOptions" not in params or not params["approvalOptions"]:
                    params["approvalOptions"] = {
                        "values": [
                            {"name": "Approve", "value": "approve"},
                            {"name": "Reject", "value": "reject"}
                        ]
                    }
                    errors.append(f"Auto-fixed: Added approvalOptions to '{name}'")
                node["parameters"] = params

            # =============================================================
            # FIX 4: Remove Wait node if sendAndWait exists (redundant)
            # We'll do this after loop – mark for deletion
            # =============================================================

            # =============================================================
            # FIX 5: Fix expression syntax (remove $('...') and use $node[...])
            # =============================================================
            params = node["parameters"]
            for key, val in params.items():
                if isinstance(val, str) and val.startswith("="):
                    # Replace $('Node Name') with $node['Node Name']
                    new_val = re.sub(r"\$\(['\"](.+?)['\"]\)", r"$node['\1']", val)
                    if new_val != val:
                        params[key] = new_val
                        errors.append(f"Auto-fixed: expression syntax in '{name}.{key}'")

            # =============================================================
            # FIX 5b: Postgres / MySQL queries must inline previous-node JSON
            # via {{ $json.field }} — NOT $1, $2, ?, :name placeholders.
            # =============================================================
            if node.get("type") in ("n8n-nodes-base.postgres", "n8n-nodes-base.mySql"):
                p = node.get("parameters", {})
                q = p.get("query", "")
                if isinstance(q, str) and q:
                    # Ensure query starts with "=" so n8n evaluates embedded expressions
                    if not q.startswith("="):
                        p["query"] = "=" + q
                        q = p["query"]
                        errors.append(
                            f"Auto-fixed: '{name}' query prefixed with '=' so n8n evaluates embedded expressions"
                        )
                    # Detect any bind-style placeholder that will NOT work here
                    has_placeholder = (
                        re.search(r"\$\d+", q) is not None            # $1, $2, ...
                        or re.search(r"(?<!\w):[A-Za-z_]\w*", q)      # :name (skip ::cast)
                        or re.search(r"(?<![\'\"])\?(?![\'\"])", q)   # bare ?
                    )
                    if has_placeholder:
                        errors.append(
                            f"CRITICAL: '{name}' SQL query uses bind placeholders ($1/?/:name) — "
                            f"these do NOT work in n8n's {node['type'].split('.')[-1]} node. "
                            f"Replace each placeholder with an inline expression like "
                            f"'{{{{ $json.<fieldName> }}}}' (or JSON.parse($json.output).<field> if upstream is an AI Agent), "
                            f"using single quotes around string values."
                        )
                    node["parameters"] = p

            # Auto-fix IF node conditions to correct n8n v2 format
            if node["type"] == "n8n-nodes-base.if":
                params = node.get("parameters", {})
                conds = params.get("conditions", {})

                # Always force loose type validation — AI Agent output arrives as strings
                has_agent = any("langchain.agent" in n.get("type", "") for n in wf["nodes"])
                if has_agent or params.get("looseTypeValidation") is not True:
                    params["looseTypeValidation"] = True
                    if isinstance(conds, dict):
                        opts = conds.get("options", {})
                        if opts.get("typeValidation") != "loose":
                            opts["typeValidation"] = "loose"
                            conds["options"] = opts
                    errors.append(f"Auto-fixed: IF node '{name}' set to loose type validation (AI Agent output is always string)")

                # Case 1: Old v1 format (string/boolean/number keys) → migrate to v2
                if conds and not conds.get("conditions") and (conds.get("string") or conds.get("boolean") or conds.get("number")):
                    new_inner = []
                    for dtype in ("string", "number", "boolean"):
                        for old_c in conds.get(dtype, []):
                            op = old_c.get("operation", "equals")
                            new_inner.append({
                                "id": str(uuid.uuid4()),
                                "leftValue": old_c.get("value1", ""),
                                "rightValue": old_c.get("value2", ""),
                                "operator": {
                                    "type": dtype,
                                    "operation": op,
                                    "name": f"filter.operator.{op}"
                                }
                            })
                    conds = {
                        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                        "conditions": new_inner,
                        "combinator": "and"
                    }
                    errors.append(f"Auto-fixed: IF node '{name}' conditions migrated from v1 → v2 format")

                # Case 2: v2 format present — repair missing/broken fields so n8n renders them
                if isinstance(conds.get("conditions"), list):
                    fixed = False
                    # Ensure top-level options wrapper exists
                    if "options" not in conds:
                        conds["options"] = {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"}
                        fixed = True
                    if "combinator" not in conds:
                        conds["combinator"] = "and"
                        fixed = True
                    for c in conds["conditions"]:
                        if not isinstance(c, dict):
                            continue
                        # Ensure each condition has a proper UUID id
                        if not c.get("id") or len(str(c.get("id", ""))) < 10:
                            c["id"] = str(uuid.uuid4())
                            fixed = True
                        # Ensure operator.name is present (n8n uses this for UI rendering)
                        op = c.get("operator", {})
                        if op and "name" not in op:
                            op["name"] = f"filter.operator.{op.get('operation', 'equals')}"
                            fixed = True
                        # Ensure operator exists at all
                        if not c.get("operator"):
                            c["operator"] = {"type": "string", "operation": "equals", "name": "filter.operator.equals"}
                            fixed = True
                    if fixed:
                        errors.append(f"Auto-fixed: IF node '{name}' v2 conditions repaired (id/options/operator.name)")

                params["conditions"] = conds
                node["parameters"] = params

            # Fix position format (dict → list)
            if isinstance(node.get("position"), dict):
                pos = node["position"]
                node["position"] = [pos.get("x", 300 + i*300), pos.get("y", 300)]

            # Track names & types
            if name in node_names:
                errors.append(f"Duplicate node name: '{name}'")
            node_names.add(name)
            node_type_map[name] = node.get("type", "")

            # Validate against schema
            if node["type"] and node["type"] not in self.schema_map:
                errors.append(f"Unknown node type: '{node['type']}'")
            elif node["type"]:
                schema = self.schema_map[node["type"]]
                for prop in schema.get("key_properties", []):
                    if prop.get("required") and prop["name"] not in node.get("parameters", {}):
                        errors.append(f"Node '{name}' missing REQUIRED parameter: '{prop['name']}'")

            # Validate IF node conditions (never leave empty)
            if node["type"] == "n8n-nodes-base.if":
                params = node.get("parameters", {})
                conds = params.get("conditions", {})
                inner = conds.get("conditions", [])  # v2 format: conditions.conditions[]
                # Check v2 format: must have at least one condition with non-empty leftValue
                v2_ok = (
                    isinstance(inner, list) and
                    len(inner) > 0 and
                    any(c.get("leftValue", "") not in ("", None) for c in inner if isinstance(c, dict))
                )
                # Also accept old v1 format (string/boolean/number keys) as fallback
                v1_ok = bool(conds.get("string") or conds.get("boolean") or conds.get("number"))
                if not conds or (not v2_ok and not v1_ok):
                    errors.append(
                        f"Node '{name}' (IF) has empty conditions — MUST use v2 format: "
                        f"conditions.conditions[] with leftValue set to the data field expression "
                        f"(e.g. '={{{{ $json.status }}}}') and rightValue set to the comparison value. "
                        f"NEVER leave leftValue empty."
                    )

            # Validate Switch node rules (never leave empty)
            if node["type"] == "n8n-nodes-base.switch":
                params = node.get("parameters", {})
                rules = params.get("rules", {}).get("values", [])
                if not rules:
                    errors.append(
                        f"Node '{name}' (Switch) has empty rules — MUST fill 'rules.values' with at least one condition branch."
                    )

        # ─────────────────────────────────────────────────────────────────
        # PASS 2: Remove redundant Wait node if sendAndWait exists
        # ─────────────────────────────────────────────────────────────────
        has_send_and_wait = any(
            n.get("type") == "n8n-nodes-base.emailSend" and n.get("parameters", {}).get("operation") == "sendAndWait"
            for n in wf["nodes"]
        )
        if has_send_and_wait:
            original_count = len(wf["nodes"])
            wf["nodes"] = [n for n in wf["nodes"] if n["type"] != "n8n-nodes-base.wait"]
            if len(wf["nodes"]) < original_count:
                errors.append("Auto-fixed: Removed redundant Wait node (sendAndWait already handles waiting)")

        # ─────────────────────────────────────────────────────────────────
        # PASS 3: Fix AI connections (direction and ports)
        # ─────────────────────────────────────────────────────────────────
        wf["connections"] = self._fix_ai_connections(wf["nodes"], wf["connections"], errors)

        # ─────────────────────────────────────────────────────────────────
        # PASS 3b: Rewrite IF / Switch leftValues that read from an AI Agent.
        # Agent emits {"output": "<json-string>"}, so plain $json.<field> is
        # always undefined → IF always falls through to the False branch.
        # Fix by wrapping in JSON.parse($json.output).<field>.
        # ─────────────────────────────────────────────────────────────────
        type_by_name = {n["name"]: n.get("type", "") for n in wf["nodes"]}
        # Build reverse map: for every target node name, who feeds it on "main" port?
        upstream_main = {}
        for src, ports in wf["connections"].items():
            for slot in ports.get("main", []) or []:
                for c in (slot if isinstance(slot, list) else []):
                    if isinstance(c, dict) and c.get("type") == "main":
                        upstream_main.setdefault(c.get("node"), []).append(src)

        def _is_fed_by_agent(node_name: str) -> bool:
            for up in upstream_main.get(node_name, []):
                if "langchain.agent" in type_by_name.get(up, ""):
                    return True
            return False

        # Match =... $json.<field> but NOT already inside JSON.parse(...)
        plain_json_re = re.compile(r"(?<!JSON\.parse\()\$json\.([A-Za-z_][A-Za-z0-9_]*)")

        # Match wrapper-array access that n8n output does NOT actually have:
        #   $json.rows[0].foo  →  $json.foo
        #   $json.data[12].foo →  $json.foo
        #   $json.items[0].foo →  $json.foo
        # DB / HTTP nodes emit one item per row — each item IS the row object.
        row_wrapper_re = re.compile(r"\$json\.(?:rows|data|items|result|results)\[\d+\]\.")

        def _strip_row_wrapper(expr: str) -> str:
            if not isinstance(expr, str) or not expr.startswith("="):
                return expr
            return row_wrapper_re.sub("$json.", expr)

        def _wrap_agent_output(expr: str) -> str:
            if not isinstance(expr, str) or not expr.startswith("="):
                return expr
            return plain_json_re.sub(r"JSON.parse($json.output).\1", expr)

        for node in wf["nodes"]:
            ntype = node.get("type", "")
            nname = node.get("name", "")
            if ntype not in ("n8n-nodes-base.if", "n8n-nodes-base.switch"):
                continue

            fed_by_agent = _is_fed_by_agent(nname)
            params = node.get("parameters", {})
            # Collect every leftValue location we need to rewrite
            conds_to_fix = []
            cond_block = params.get("conditions")
            if isinstance(cond_block, dict):
                conds_to_fix.extend(cond_block.get("conditions", []) or [])
            rules = params.get("rules")
            if isinstance(rules, dict):
                for rule in rules.get("values", []) or []:
                    inner = rule.get("conditions") if isinstance(rule, dict) else None
                    if isinstance(inner, dict):
                        conds_to_fix.extend(inner.get("conditions", []) or [])

            stripped = False
            wrapped = False
            for c in conds_to_fix:
                if not isinstance(c, dict) or "leftValue" not in c:
                    continue
                orig = c["leftValue"]
                # Always strip wrapper-array access (rows/data/items/result/results)
                new = _strip_row_wrapper(orig)
                if new != orig:
                    stripped = True
                # If this IF is fed by an AI Agent, wrap $json.<field> in JSON.parse($json.output).<field>
                if fed_by_agent:
                    wrapped_val = _wrap_agent_output(new)
                    if wrapped_val != new:
                        wrapped = True
                    new = wrapped_val
                if new != orig:
                    c["leftValue"] = new

            if stripped:
                errors.append(
                    f"Auto-fixed: '{nname}' stripped non-existent row/data/items wrapper from leftValues "
                    f"(DB/HTTP nodes emit each row as its own item — use $json.<field> directly)"
                )
            if wrapped:
                errors.append(
                    f"Auto-fixed: '{nname}' leftValues wrapped in JSON.parse($json.output).<field> "
                    f"(upstream is AI Agent — flat $json.<field> would always be undefined)"
                )

        # ─────────────────────────────────────────────────────────────────
        # PASS 3c: Strip $json.rows[0]./$json.data[0]./... from EVERY expression
        # in EVERY node's parameters (email body, sendTo, subject, HTTP body,
        # Set node values, etc.) — not just IF/Switch leftValues.
        # ─────────────────────────────────────────────────────────────────
        def _walk_strip(obj, touched):
            if isinstance(obj, str):
                if obj.startswith("="):
                    new = row_wrapper_re.sub("$json.", obj)
                    if new != obj:
                        touched.append(True)
                        return new
                return obj
            if isinstance(obj, list):
                return [_walk_strip(v, touched) for v in obj]
            if isinstance(obj, dict):
                return {k: _walk_strip(v, touched) for k, v in obj.items()}
            return obj

        for node in wf["nodes"]:
            ntype = node.get("type", "")
            # IF/Switch already handled in PASS 3b — skip to avoid double-logging
            if ntype in ("n8n-nodes-base.if", "n8n-nodes-base.switch"):
                continue
            params = node.get("parameters", {})
            if not isinstance(params, dict):
                continue
            touched = []
            node["parameters"] = _walk_strip(params, touched)
            if touched:
                errors.append(
                    f"Auto-fixed: '{node.get('name')}' stripped non-existent row/data/items wrapper "
                    f"from expression values (DB/HTTP rows arrive flat as $json.<field>)"
                )

        # ─────────────────────────────────────────────────────────────────
        # PASS 4: Connection completeness validator
        # ─────────────────────────────────────────────────────────────────
        AI_SUB_KEYWORDS = ["lmChatAzureOpenAi", "memoryBufferWindow", "embeddingsOpenAi",
                           "vectorStoreInMemory", "documentDefaultDataLoader", "textSplitter"]
        conns = wf["connections"]
        node_names_set = {n["name"] for n in wf["nodes"]}

        # 1. Stale references — connection points to a node name that doesn't exist
        for src, ports in list(conns.items()):
            if src not in node_names_set:
                errors.append(f"CONNECTION ERROR: source node '{src}' not found in nodes list")
                continue
            for port, slots in ports.items():
                for slot in slots:
                    for c in (slot if isinstance(slot, list) else []):
                        if isinstance(c, dict) and c.get("node") not in node_names_set:
                            errors.append(
                                f"CONNECTION ERROR: '{src}' → '{c.get('node')}' references unknown node — "
                                f"check node names match exactly (case-sensitive)"
                            )

        # 2. Floating nodes — every main-flow node must have incoming OR outgoing "main" connection
        TRIGGER_KEYWORDS = ["trigger", "webhook", "manualTrigger"]

        all_targets = {
            c.get("node")
            for ports in conns.values()
            for port, slots in ports.items() if port == "main"
            for slot in slots if isinstance(slot, list)
            for c in slot if isinstance(c, dict)
        }
        all_sources_with_main = {src for src, ports in conns.items() if "main" in ports}

        for node in wf["nodes"]:
            nname = node["name"]
            ntype = node.get("type", "")
            if any(k in ntype for k in AI_SUB_KEYWORDS):
                continue
            has_outgoing = nname in all_sources_with_main
            has_incoming = nname in all_targets
            is_trigger   = any(k in ntype.lower() for k in TRIGGER_KEYWORDS)
            # Triggers only need outgoing; others need at minimum incoming
            if is_trigger and not has_outgoing:
                errors.append(
                    f"CONNECTION ERROR: Trigger node '{nname}' has no outgoing connection — "
                    f"add a 'main' connection from '{nname}' to the next node in the workflow"
                )
            elif not is_trigger and not has_incoming and not has_outgoing:
                errors.append(
                    f"CONNECTION ERROR: Node '{nname}' ({ntype.split('.')[-1]}) is completely disconnected — "
                    f"connect it in the 'connections' object using its exact name '{nname}'"
                )

        # 3. IF node must have BOTH true (index 0) and false (index 1) branches connected
        for node in wf["nodes"]:
            if node.get("type") == "n8n-nodes-base.if":
                nname = node["name"]
                branches = conns.get(nname, {}).get("main", [])
                if len(branches) < 2 or not branches[0] or not branches[1]:
                    errors.append(
                        f"CONNECTION ERROR: IF node '{nname}' must have BOTH branches connected — "
                        f"main[0] = True branch target, main[1] = False branch target. "
                        f"Currently has {len(branches)} branch(es)."
                    )

        # 4. Debug: print connection map
        print("   🔗 Connection map:")
        for src, ports in conns.items():
            for port, slots in ports.items():
                for i, slot in enumerate(slots):
                    targets = [c.get("node") for c in slot if isinstance(c, dict)]
                    if targets:
                        label = f"[{i}]" if port == "main" else ""
                        print(f"      {src} --{port}{label}--> {', '.join(targets)}")

        # ─────────────────────────────────────────────────────────────────
        # FINAL VALIDATION
        # ─────────────────────────────────────────────────────────────────
        if len(wf["nodes"]) > 1 and not wf["connections"]:
            errors.append("No connections found — workflow nodes are all disconnected")

        # Classify errors
        hard_errors = [e for e in errors if (
            "Unknown node type" in e or
            "JSON parse" in e or
            "disconnected" in e or
            "missing REQUIRED parameter" in e or
            "CRITICAL:" in e or
            "MUST fill" in e or
            "has empty conditions" in e or
            "has empty rules" in e or
            "CONNECTION ERROR" in e
        )]

        if hard_errors and state["attempt"] < 3:
            print(f"   ❌ {len(hard_errors)} hard errors — will retry (attempt {state['attempt']})")
            return {**state, "errors": hard_errors, "workflow": wf, "done": False}
        elif hard_errors:
            print(f"   ⚠️  {len(hard_errors)} hard errors remain on final attempt — returning best effort")

        auto_fixes = [e for e in errors if "Auto-fixed" in e]
        soft_errors = [e for e in errors if e not in auto_fixes and e not in hard_errors]

        if auto_fixes:
            print(f"   🔧 {len(auto_fixes)} auto-fixes applied")
        if soft_errors:
            print(f"   ⚠️  {len(soft_errors)} soft issues")
        if not hard_errors and not soft_errors:
            print("   ✅ Validation passed")

        return {**state, "errors": errors, "workflow": wf, "done": True}

    def _should_retry(self, state: WorkflowState) -> str:
        if state["done"]:
            return "end"
        if state["attempt"] >= 3:
            print("   ⚠️  Max retries reached — returning best effort")
            # Force done so generate() can return the best-effort workflow
            state["done"] = True
            return "end"
        return "retry"

    def _build_graph(self):
        g = StateGraph(WorkflowState)
        g.add_node("node_selector",      self._node_selector)
        g.add_node("schema_builder",     self._schema_builder)
        g.add_node("workflow_generator", self._workflow_generator)
        g.add_node("validator",          self._validator)
        g.set_entry_point("node_selector")
        g.add_edge("node_selector",      "schema_builder")
        g.add_edge("schema_builder",     "workflow_generator")
        g.add_edge("workflow_generator", "validator")
        g.add_conditional_edges(
            "validator",
            self._should_retry,
            {"retry": "workflow_generator", "end": END},
        )
        return g.compile()

    def generate(self, user_prompt: str) -> Dict[str, Any]:
        print(f"\n{'='*60}")
        print(f"WorkflowGeneratorV2: {user_prompt}")
        print(f"{'='*60}")

        initial_state: WorkflowState = {
            "user_prompt":   user_prompt,
            "planned_types": [],
            "schema_block":  "",
            "raw_json":      "",
            "workflow":      None,
            "errors":        [],
            "attempt":       0,
            "done":          False,
        }

        final_state = self.graph.invoke(initial_state)
        wf = final_state.get("workflow")

        # Last resort: try to parse raw_json if workflow is still None
        if not wf and final_state.get("raw_json"):
            print("   🔄 Trying last-resort raw_json parse...")
            try:
                wf = self._parse_json(final_state["raw_json"])
                print("   ✅ Last-resort parse succeeded")
            except Exception as e:
                print(f"   ❌ Last-resort parse also failed: {e}")

        if not wf:
            raise Exception("Workflow generation failed after all retries")

        # Ensure required top-level keys exist
        wf.setdefault("name", "Generated Workflow")
        wf.setdefault("nodes", [])
        wf.setdefault("connections", {})
        wf.setdefault("settings", {"executionOrder": "v1"})

        nodes = wf.get("nodes", [])
        conns = wf.get("connections", {})
        print(f"\n🎉 Done: {len(nodes)} nodes, {len(conns)} connections, {final_state['attempt']} attempt(s)")
        return wf

    def _parse_json(self, content: str) -> Dict:
        content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
        content = content.replace("```json","").replace("```","").strip()
        try:
            parsed = json.loads(content)
            if "nodes" in parsed: return parsed
            for key in ["workflow","data"]:
                if key in parsed and "nodes" in parsed.get(key, {}):
                    return parsed[key]
            return parsed
        except json.JSONDecodeError:
            s, e = content.find('{'), content.rfind('}') + 1
            if s != -1 and e > s:
                return json.loads(content[s:e])
        raise Exception(f"Cannot parse JSON: {content[:200]}")



