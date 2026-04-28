# import json

# def clean_n8n_api_json(raw_file_path, output_file_path):
#     print(f"🔄 Reading raw data from {raw_file_path}...")
    
#     with open(raw_file_path, 'r', encoding='utf-8') as f:
#         raw_data = json.load(f)
        
#     nodes_data = raw_data if isinstance(raw_data, list) else raw_data.get('data', [])
#     clean_nodes = []
#     seen_names = {}  # ✅ FIX: duplicate tracking


#     for node in nodes_data:
#         node_name    = node.get('name')
#         display_name = node.get('displayName')
#          # ✅ FIX: version field can be list [1, 1.1, 1.2] — always take latest
#         raw_version = node.get('defaultVersion', node.get('version', 1))
#         if isinstance(raw_version, list):
#             version = int(float(max(raw_version))) # Floor to integer        else:
#             # version = raw_version
#         else:
#             version = int(float(raw_version)) # Floor to integer
#         # version      = node.get('defaultVersion', node.get('version', 1))
#         description  = node.get('description', '')
#         group        = node.get('group', ['transform'])[0] if node.get('group') else 'transform'
        
#         inputs  = node.get('inputs', ['main'])
#         outputs = node.get('outputs', ['main'])

#         # 1. Credentials extraction
#         credentials = []
#         for cred in node.get('credentials', []):
#             if cred.get('required'):
#                 credentials.append({
#                     "name": cred.get('name'),
#                     "required": True
#                 })

#         # 2. Actions extraction
#         actions = []
#         seen_actions = set()
#         properties = node.get('properties', [])
        
#         for prop in properties:
#             if prop.get('name') in ['operation', 'action', 'resource']:
#                 options = prop.get('options', [])
#                 if isinstance(options, list):
#                     for opt in options:
#                         act_val = opt.get('value')
#                         if act_val and act_val not in seen_actions:
#                             actions.append({
#                                 "actionName": opt.get('name', act_val),
#                                 "actionValue": act_val
#                             })
#                             seen_actions.add(act_val)

#         # 3. Key Properties - HIGH ACCURACY UPDATES 🚀
#         key_properties = []
#         seen_props = set()
        
#         for prop in properties:
#             p_name = prop.get('name', '')
#             p_type = prop.get('type', 'string')
            
#             if p_type in ['notice', 'hidden'] or p_name in ['', 'authentication']:
#                 continue
            
#             if p_name in seen_props:
#                 continue
                
#             entry = {
#                 "name": p_name,
#                 "displayName": prop.get('displayName'), # ✅ Added for better LLM recognition
#                 "type": p_type,
#                 "default": prop.get('default', ''),
#                 "description": prop.get('description', ''), # ✅ Removed [:80] limit
#                 "displayOptions": prop.get('displayOptions') # ✅ Added dependency logic
#             }
            
#             if prop.get('required'): entry["required"] = True
            
#             # Options extraction
#             if p_type == 'options' and prop.get('options'):
#                 # ✅ Removed [:10] limit to get all resources/operations
#                 entry["options"] = [
#                     {"name": o.get('name'), "value": o.get('value')}
#                     for o in prop['options']
#                     if isinstance(o, dict) and o.get('value') != '__CUSTOM_API_CALL__'
#                 ] 

#             key_properties.append(entry)
#             seen_props.add(p_name)
            
#             # ✅ Increased limit to 50 for complex nodes like Gmail
#             if len(key_properties) >= 50: break 
#         new_node = {
#             "name": node_name,
#             "displayName": display_name,
#             "typeVersion": version,   # ✅ Always single float/int
#             "description": description,
#             "group": group,
#             "inputs": inputs,
#             "outputs": outputs,
#             "credentials": credentials,
#             "available_actions": actions,
#             "key_properties": key_properties
#         }
#          # ✅ FIX: Duplicate handling — keep highest typeVersion
#         if node_name in seen_names:
#             existing_tv = seen_names[node_name]['typeVersion']
#             if version > existing_tv:
#                 # Replace with higher version
#                 idx = next(i for i, n in enumerate(clean_nodes) if n['name'] == node_name)
#                 clean_nodes[idx] = new_node
#                 seen_names[node_name] = new_node
#                 print(f"  ♻️  Updated {node_name}: {existing_tv} → {version}")
#         else:
#             clean_nodes.append(new_node)
#             seen_names[node_name] = new_node
 
#     with open(output_file_path, 'w', encoding='utf-8') as f:
#         json.dump(clean_nodes, f, indent=2, ensure_ascii=False)
    
#     print(f"\n✅ Clean JSON Created!")
#     print(f"   Total unique nodes: {len(clean_nodes)}")
#     print(f"   Output: {output_file_path}")
 
# # Execute
# clean_n8n_api_json('nodes1.json', 'clean_nodes.json')
 

#          # ✅ FIX: Handle duplicate node names by appending version
#         clean_nodes.append({
#             "name": node_name,
#             "displayName": display_name,
#             "typeVersion": version,
#             "description": description,
#             "group": group,
#             "inputs": inputs,
#             "outputs": outputs,
#             "credentials": credentials,
#             "available_actions": actions,
#             "key_properties": key_properties
#         })

#     with open(output_file_path, 'w', encoding='utf-8') as f:
#         json.dump(clean_nodes, f, indent=4, ensure_ascii=False)
    
#     print(f"✅ Enhanced JSON Created! Total nodes: {len(clean_nodes)}")

# # Execute
# clean_n8n_api_json('nodes1.json', 'clean_nodes.json')



import json

def clean_n8n_api_json(raw_file_path, output_file_path):
    print(f"🔄 Reading raw data from {raw_file_path}...")
    
    with open(raw_file_path, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)
        
    nodes_data = raw_data if isinstance(raw_data, list) else raw_data.get('data', [])
    clean_nodes = []
    seen_names = {}  # ✅ Duplicate tracking logic

    for node in nodes_data:
        node_name    = node.get('name')
        display_name = node.get('displayName')
        
        # ✅ FIX 1: Version-ah Integer-ah maathuroam (n8n paste error thavirkka)
        raw_version = node.get('defaultVersion', node.get('version', 1))
        if isinstance(raw_version, list):
            version = int(float(max(raw_version))) # List-la irundha maximum eduthu integer-ah maathu
        else:
            version = int(float(raw_version)) # Single value-ah integer-ah maathu
            
        description  = node.get('description', '')
        group        = node.get('group', ['transform'])[0] if node.get('group') else 'transform'
        
        inputs  = node.get('inputs', ['main'])
        outputs = node.get('outputs', ['main'])

        # 1. Credentials extraction
        credentials = []
        for cred in node.get('credentials', []):
            if cred.get('required'):
                credentials.append({
                    "name": cred.get('name'),
                    "required": True
                })

        # 2. Actions (Resource/Operation) extraction
        actions = []
        seen_actions = set()
        properties = node.get('properties', [])
        
        for prop in properties:
            if prop.get('name') in ['operation', 'action', 'resource']:
                options = prop.get('options', [])
                if isinstance(options, list):
                    for opt in options:
                        act_val = opt.get('value')
                        if act_val and act_val not in seen_actions:
                            actions.append({
                                "actionName": opt.get('name', act_val),
                                "actionValue": act_val
                            })
                            seen_actions.add(act_val)

        # 3. Key Properties - HIGH ACCURACY UPDATES 🚀
        key_properties = []
        seen_props = set()
        
        for prop in properties:
            p_name = prop.get('name', '')
            p_type = prop.get('type', 'string')
            
            if p_type in ['notice', 'hidden'] or p_name in ['', 'authentication']:
                continue
            
            if p_name in seen_props:
                continue
                
            entry = {
                "name": p_name,
                "displayName": prop.get('displayName'), 
                "type": p_type,
                "default": prop.get('default', ''),
                "description": prop.get('description', ''), 
                "displayOptions": prop.get('displayOptions') # Dependency logic-ku idhu dhaan key
            }
            
            if prop.get('required'): entry["required"] = True
            
            # Options extraction
            if p_type == 'options' and prop.get('options'):
                entry["options"] = [
                    {"name": o.get('name'), "value": o.get('value')}
                    for o in prop['options']
                    if isinstance(o, dict) and o.get('value') != '__CUSTOM_API_CALL__'
                ] 

            key_properties.append(entry)
            seen_props.add(p_name)
            
            if len(key_properties) >= 50: break 

        # New node object build pandroam
        new_node = {
            "name": node_name,
            "displayName": display_name,
            "typeVersion": version,
            "description": description,
            "group": group,
            "inputs": inputs,
            "outputs": outputs,
            "credentials": credentials,
            "available_actions": actions,
            "key_properties": key_properties
        }

        # ✅ FIX 2: Handle Duplicates - Keep highest version
        if node_name in seen_names:
            existing_tv = seen_names[node_name]['typeVersion']
            if version > existing_tv:
                # Pazhaya node-ah find panni pudhu higher version-oda replace pannu
                idx = next(i for i, n in enumerate(clean_nodes) if n['name'] == node_name)
                clean_nodes[idx] = new_node
                seen_names[node_name] = new_node
                print(f"  ♻️  Updated {node_name}: {existing_tv} → {version}")
        else:
            clean_nodes.append(new_node)
            seen_names[node_name] = new_node

    # File-ah UTF-8 encoding-la save pandroam
    with open(output_file_path, 'w', encoding='utf-8') as f:
        json.dump(clean_nodes, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Clean JSON Created Successfully!")
    print(f"   Total unique nodes: {len(clean_nodes)}")
    print(f"   Output saved to: {output_file_path}")

# Run the process
if __name__ == "__main__":
    clean_n8n_api_json('nodes1.json', 'clean_nodes.json')