import os
import json

file_path = "history.json"

def store_conversation(created_time,user_question,url):
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            conversations = json.load(f)
    else:
        conversations = []
    for conversation in conversations:
        if conversation['created_time'] == created_time:
            return
    conversation = {
        "created_time":created_time,
        "user_question":user_question, 
        "url": url
    }
    conversations.append(conversation)

    with open(file_path, 'w') as f:
        json.dump(conversations, f, indent=4)

def get_all_conversations():
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            return json.load(f)
    else:
        return []

def delete_conversations_by_date(date_str: str):
        with open(file_path, 'r') as f:
            conversations = json.load(f)
        updated_conversations = [
            conversation for conversation in conversations 
            if not conversation['created_time'].startswith(date_str)
        ]
        with open(file_path, 'w') as f:
            json.dump(updated_conversations, f, indent=4)

def delete_conversations():
    if os.path.exists(file_path):
        os.remove(file_path)
    
