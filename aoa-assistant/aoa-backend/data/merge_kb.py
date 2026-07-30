import json
import sys

def merge_knowledge_bases(existing_path, new_path, output_path):
    # Load existing
    with open(existing_path, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    # Load new
    with open(new_path, 'r', encoding='utf-8') as f:
        new_topics = json.load(f)
    
    print(f"Existing topics: {len(existing)}")
    print(f"New topics: {len(new_topics)}")
    
    # Build lookup by id and name
    existing_ids   = {t.get('id', '').lower(): i for i, t in enumerate(existing)}
    existing_names = {t.get('name', '').lower(): i for i, t in enumerate(existing)}
    
    merged  = list(existing)  # start with all existing
    added   = 0
    updated = 0
    
    for new_topic in new_topics:
        new_id   = new_topic.get('id', '').lower()
        new_name = new_topic.get('name', '').lower()
        
        # Check if topic already exists
        idx = existing_ids.get(new_id) or existing_names.get(new_name)
        
        if idx is not None:
            # Topic exists — ENRICH it (add missing fields, merge aliases)
            old = merged[idx]
            
            # Merge aliases (combine both lists, remove duplicates)
            old_aliases = old.get('aliases', [])
            new_aliases = new_topic.get('aliases', [])
            merged_aliases = list(set(
                [a.lower() for a in old_aliases] + 
                [a.lower() for a in new_aliases]
            ))
            merged[idx]['aliases'] = merged_aliases
            
            # Merge keywords
            old_kw = old.get('keywords', [])
            new_kw = new_topic.get('keywords', [])
            merged[idx]['keywords'] = list(set(
                [k.lower() for k in old_kw] + 
                [k.lower() for k in new_kw]
            ))
            
            # Add missing fields from new topic
            for key, value in new_topic.items():
                if key not in old or not old[key]:
                    merged[idx][key] = value
            
            updated += 1
            print(f"  Updated: {old.get('name')}")
        else:
            # New topic — add it
            merged.append(new_topic)
            added += 1
            print(f"  Added: {new_topic.get('name')}")
    
    # Save merged result
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)
    
    print(f"\nResult: {len(merged)} total topics")
    print(f"Added: {added} new topics")
    print(f"Updated: {updated} existing topics")
    print(f"Saved to: {output_path}")
    
    return merged

if __name__ == "__main__":
    merge_knowledge_bases(
        existing_path=sys.argv[1] if len(sys.argv) > 1 else "existing_kb.json",
        new_path=sys.argv[2]      if len(sys.argv) > 2 else "new_kb.json",
        output_path=sys.argv[3]   if len(sys.argv) > 3 else "merged_kb.json"
    )