import socketio
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime
import json
import os
import uuid
from pathlib import Path
import mimetypes
import random
from typing import Dict, List, Optional

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Create Socket.IO server with proper configuration
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=[],
    logger=False,
    engineio_logger=False
)

# Create FastAPI app
app = FastAPI(title="Multi-Feature Chat API")
origins = [
    "http://localhost:3000",
    "https://*.vercel.app",  # Allow all Vercel subdomains
    "*"  # Remove this after deployment
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# EXISTING FEATURES - Store active users, rooms, and private conversations
active_users = {}
room_users = {}
user_join_status = {}
private_conversations = {}
message_reactions = {}  # messageId -> {emoji: [usernames]}

# NEW OMEGLE FEATURES - Stranger matching system
class StrangerChat:
    def __init__(self):
        # Active users waiting for stranger match
        self.waiting_queue: List[str] = []
        
        # Active stranger connections (paired users)
        self.stranger_connections: Dict[str, str] = {}  # socket_id -> partner_socket_id
        
        # Stranger user information
        self.stranger_users: Dict[str, dict] = {}  # socket_id -> user_info
        
        # Interest-based queues
        self.interest_queues: Dict[str, List[str]] = {}  # interest -> [socket_ids]
        
        # Video call states
        self.video_calls: Dict[str, dict] = {}  # room_id -> call_info

stranger_chat = StrangerChat()

# Create Socket.IO ASGI app
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

def generate_anonymous_username():
    """Generate random anonymous usernames for stranger chat"""
    adjectives = [
        "Anonymous", "Mystery", "Secret", "Hidden", "Unknown", "Phantom", 
        "Shadow", "Silent", "Quiet", "Invisible", "Stranger", "Random"
    ]
    nouns = [
        "User", "Person", "Individual", "Someone", "Visitor", "Guest",
        "Wanderer", "Explorer", "Seeker", "Friend", "Companion", "Soul"
    ]
    return f"{random.choice(adjectives)}{random.choice(nouns)}{random.randint(100, 999)}"

def create_stranger_room_id(user1_id: str, user2_id: str) -> str:
    """Create unique room ID for two strangers"""
    return f"stranger_{min(user1_id, user2_id)}_{max(user1_id, user2_id)}"

# DEBUG LOGGING FUNCTION
def log_stranger_connections(event_name, sid=None, extra_info=""):
    print(f"\n🔍 === {event_name} ===")
    print(f"🔍 Event: {event_name}")
    if sid:
        print(f"🔍 User: {sid}")
    if extra_info:
        print(f"🔍 Info: {extra_info}")
    print(f"🔍 Stranger connections: {stranger_chat.stranger_connections}")
    print(f"🔍 Stranger users: {list(stranger_chat.stranger_users.keys())}")
    print(f"🔍 Video calls: {stranger_chat.video_calls}")
    print(f"🔍 Waiting queue: {stranger_chat.waiting_queue}")
    print(f"🔍 === END {event_name} ===\n")

# Add catch-all event handler for debugging
@sio.event
async def catch_all(event, sid, *args):
    print(f"🔍 Received event '{event}' from {sid} with args: {args}")

@sio.event
async def connect(sid, environ):
    print(f"✅ Client {sid} connected")
    log_stranger_connections("CONNECT", sid)
    
    # Initialize for regular chat
    active_users[sid] = {
        'username': None,
        'room': None,
        'connected_at': datetime.now(),
        'joined': False,
        'mode': 'regular'  # 'regular' or 'stranger'
    }
    user_join_status[sid] = False
    
    # Send connection options
    await sio.emit('connection_options', {
        'modes': ['chat_rooms', 'stranger_chat'],
        'message': 'Choose your chat mode'
    }, room=sid)

@sio.event
async def disconnect(sid):
    print(f"❌ Client {sid} disconnected")
    log_stranger_connections("DISCONNECT_START", sid)
    
    # Clean up regular chat
    if sid in active_users:
        user_data = active_users[sid]
        username = user_data.get('username')
        room = user_data.get('room')
        
        if username and room:
            if room in room_users and sid in room_users[room]:
                room_users[room].remove(sid)
                
                await sio.emit('message', {
                    'type': 'system',
                    'content': f'{username} left the chat',
                    'room': room,
                    'timestamp': datetime.now().isoformat(),
                    'username': 'System'
                }, room=room)
                
                await update_room_users(room)
        
        del active_users[sid]
    
    if sid in user_join_status:
        del user_join_status[sid]
    
    # Clean up stranger chat
    if sid in stranger_chat.stranger_connections:
        partner_id = stranger_chat.stranger_connections[sid]
        print(f"🧹 Cleaning up stranger connection: {sid} <-> {partner_id}")
        
        if partner_id in stranger_chat.stranger_users:
            await sio.emit('stranger_disconnected', {
                'message': 'Stranger has disconnected'
            }, room=partner_id)
            
            # Remove partner from active connections
            if partner_id in stranger_chat.stranger_connections:
                del stranger_chat.stranger_connections[partner_id]
                print(f"🧹 Removed partner {partner_id} from connections")
        
        # Remove user from active connections
        del stranger_chat.stranger_connections[sid]
        print(f"🧹 Removed user {sid} from connections")
    
    # Remove from stranger waiting queue
    if sid in stranger_chat.waiting_queue:
        stranger_chat.waiting_queue.remove(sid)
        print(f"🧹 Removed {sid} from waiting queue")
    
    # Remove from interest queues
    for interest_queue in stranger_chat.interest_queues.values():
        if sid in interest_queue:
            interest_queue.remove(sid)
            print(f"🧹 Removed {sid} from interest queue")
    
    # Remove stranger user info
    if sid in stranger_chat.stranger_users:
        del stranger_chat.stranger_users[sid]
        print(f"🧹 Removed {sid} from stranger users")
    
    log_stranger_connections("DISCONNECT_END", sid)

# ============= EXISTING REGULAR CHAT FEATURES =============

@sio.event
async def join_room(sid, data):
    print(f"🚪 Received join_room from {sid}: {data}")
    
    if user_join_status.get(sid, False):
        print(f"⏭️ User {sid} already joined, ignoring duplicate request")
        return
    
    username = data.get('username') or data.get('user') or 'Anonymous'
    room = data.get('room') or data.get('roomId') or data.get('roomName')
    
    if not room:
        print(f"❌ No room specified in data: {data}")
        await sio.emit('error', {'message': 'Room not specified'}, room=sid)
        return
    
    user_join_status[sid] = True
    
    active_users[sid]['username'] = username
    active_users[sid]['room'] = room
    active_users[sid]['joined'] = True
    active_users[sid]['mode'] = 'regular'
    
    await sio.enter_room(sid, room)
    
    if room not in room_users:
        room_users[room] = []
    if sid not in room_users[room]:
        room_users[room].append(sid)
    
    print(f"✅ User {username} successfully joined room {room}")
    
    await sio.emit('join_success', {
        'room': room,
        'username': username,
        'message': f'Successfully joined {room}',
        'status': 'joined'
    }, room=sid)
    
    await sio.emit('message', {
        'type': 'system',
        'content': f'Welcome to {room}!',
        'room': room,
        'timestamp': datetime.now().isoformat(),
        'username': 'System',
        'id': f"system_{int(datetime.now().timestamp() * 1000)}"
    }, room=sid)
    
    await sio.emit('message', {
        'type': 'system',
        'content': f'{username} joined the chat',
        'room': room,
        'timestamp': datetime.now().isoformat(),
        'username': 'System',
        'id': f"system_{int(datetime.now().timestamp() * 1000)}"
    }, room=room, skip_sid=sid)
    
    await update_room_users(room)

@sio.event
async def send_message(sid, data):
    print(f"📨 Received public message from {sid}: {data}")
    
    if sid not in active_users:
        await sio.emit('error', {'message': 'User not found'}, room=sid)
        return
    
    user_data = active_users[sid]
    username = user_data.get('username', 'Anonymous')
    room = user_data.get('room')
    
    if not room:
        await sio.emit('error', {'message': 'You must join a room first'}, room=sid)
        return
    
    message_content = data.get('message') or data.get('content') or data.get('text')
    
    if not message_content or not message_content.strip():
        return
    
    message_data = {
        'type': 'message',
        'content': message_content.strip(),
        'username': username,
        'room': room,
        'timestamp': datetime.now().isoformat(),
        'id': f"{sid}_{int(datetime.now().timestamp() * 1000)}",
        'userId': sid
    }
    
    await sio.emit('message', message_data, room=room)
    print(f"✅ Public message sent to room {room}")

@sio.event
async def private_message(sid, data):
    print(f"🔒 PRIVATE MESSAGE EVENT RECEIVED from {sid}")
    
    if sid not in active_users:
        print(f"❌ Sender {sid} not found in active_users")
        await sio.emit('error', {'message': 'User not found'}, room=sid)
        return
    
    sender_data = active_users[sid]
    sender_username = sender_data.get('username', 'Anonymous')
    to_user_id = data.get('to') or data.get('toUserId')
    message_content = data.get('message') or data.get('content')
    
    if not to_user_id or not message_content or not message_content.strip():
        return
    
    if to_user_id not in active_users:
        await sio.emit('error', {'message': 'Recipient not found or offline'}, room=sid)
        return
    
    recipient_username = active_users[to_user_id].get('username', 'Unknown')
    
    private_msg = {
        'type': 'private',
        'content': message_content.strip(),
        'from': sender_username,
        'fromId': sid,
        'to': recipient_username,
        'toId': to_user_id,
        'timestamp': datetime.now().isoformat(),
        'id': f"private_{sid}_{int(datetime.now().timestamp() * 1000)}",
        'username': sender_username
    }
    
    conversation_key = f"{min(sid, to_user_id)}_{max(sid, to_user_id)}"
    if conversation_key not in private_conversations:
        private_conversations[conversation_key] = []
    private_conversations[conversation_key].append(private_msg)
    
    try:
        await sio.emit('private_message', private_msg, room=to_user_id)
        await sio.emit('private_message', {
            **private_msg,
            'fromSelf': True
        }, room=sid)
        print(f"✅ Private message sent: {sender_username} → {recipient_username}")
        
    except Exception as e:
        print(f"🚨 Error sending private message: {e}")
        await sio.emit('error', {'message': f'Failed to send message: {str(e)}'}, room=sid)
# Add health check endpoint
@app.get("/")
async def root():
    return {"message": "Chat API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# File upload endpoint
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        if file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")
        
        allowed_types = {
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain', 
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'audio/mpeg', 'audio/wav', 'audio/ogg'
        }
        
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="File type not allowed.")
        
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        file_info = {
            "id": str(uuid.uuid4()),
            "filename": file.filename,
            "unique_filename": unique_filename,
            "url": f"/uploads/{unique_filename}",
            "size": len(content),
            "type": file.content_type,
            "uploaded_at": datetime.now().isoformat()
        }
        
        return file_info
        
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")

@sio.event
async def send_file_message(sid, data):
    print(f"📎 Received file message from {sid}: {data}")
    
    if sid not in active_users:
        await sio.emit('error', {'message': 'User not found'}, room=sid)
        return
    
    user_data = active_users[sid]
    username = user_data.get('username', 'Anonymous')
    room = user_data.get('room')
    
    if not room:
        await sio.emit('error', {'message': 'You must join a room first'}, room=sid)
        return
    
    file_info = data.get('file')
    message_text = data.get('message', '')
    
    if not file_info:
        return
    
    message_data = {
        'type': 'file',
        'content': message_text,
        'username': username,
        'room': room,
        'timestamp': datetime.now().isoformat(),
        'id': f"file_{sid}_{int(datetime.now().timestamp() * 1000)}",
        'userId': sid,
        'file': file_info
    }
    
    await sio.emit('message', message_data, room=room)
    print(f"✅ File message sent to room {room}")

@sio.event
async def send_reply(sid, data):
    print(f"💬 REPLY EVENT RECEIVED from {sid}: {data}")
    
    if sid not in active_users:
        await sio.emit('error', {'message': 'User not found'}, room=sid)
        return
    
    user_data = active_users[sid]
    username = user_data.get('username', 'Anonymous')
    room = user_data.get('room')
    
    reply_to_id = data.get('replyToId')
    reply_to_username = data.get('replyToUsername')
    reply_to_content = data.get('replyToContent')
    message_content = data.get('message')
    
    if not all([reply_to_id, message_content, room]):
        await sio.emit('error', {'message': 'Missing reply data'}, room=sid)
        return
    
    reply_message = {
        'type': 'message',
        'content': message_content.strip(),
        'username': username,
        'room': room,
        'timestamp': datetime.now().isoformat(),
        'id': f"reply_{sid}_{int(datetime.now().timestamp() * 1000)}",
        'userId': sid,
        'replyTo': {
            'messageId': reply_to_id,
            'username': reply_to_username,
            'content': reply_to_content[:50] + ('...' if len(reply_to_content) > 50 else '')
        }
    }
    
    try:
        await sio.emit('message', reply_message, room=room)
        print(f"✅ Reply sent to room {room}")
        
    except Exception as e:
        print(f"🚨 Error sending reply: {e}")
        await sio.emit('error', {'message': f'Failed to send reply: {str(e)}'}, room=sid)

@sio.event
async def add_reaction(sid, data):
    print(f"🎭 Adding reaction from {sid}: {data}")
    
    if sid not in active_users:
        return
    
    message_id = data.get('messageId')
    emoji = data.get('emoji')
    room = data.get('room')
    
    if not message_id or not emoji or not room:
        return
    
    user_data = active_users[sid]
    username = user_data.get('username', 'Anonymous')
    
    if message_id not in message_reactions:
        message_reactions[message_id] = {}
    
    # Remove user's existing reaction (one reaction per user)
    for existing_emoji, users in list(message_reactions[message_id].items()):
        if username in users:
            users.remove(username)
            if not users:
                del message_reactions[message_id][existing_emoji]
            break
    
    # Add new reaction
    if emoji not in message_reactions[message_id]:
        message_reactions[message_id][emoji] = []
    
    if username not in message_reactions[message_id][emoji]:
        message_reactions[message_id][emoji].append(username)
        
        reactions_list = []
        for emoji_key, users in message_reactions[message_id].items():
            reactions_list.append({
                'emoji': emoji_key,
                'users': users,
                'count': len(users)
            })
        
        await sio.emit('reaction_updated', {
            'messageId': message_id,
            'reactions': reactions_list
        }, room=room)

@sio.event
async def remove_reaction(sid, data):
    if sid not in active_users:
        return
    
    message_id = data.get('messageId')
    emoji = data.get('emoji')
    room = data.get('room')
    
    if not message_id or not emoji or not room:
        return
    
    user_data = active_users[sid]
    username = user_data.get('username', 'Anonymous')
    
    if (message_id in message_reactions and 
        emoji in message_reactions[message_id] and 
        username in message_reactions[message_id][emoji]):
        
        message_reactions[message_id][emoji].remove(username)
        
        if not message_reactions[message_id][emoji]:
            del message_reactions[message_id][emoji]
        
        if not message_reactions[message_id]:
            del message_reactions[message_id]
        
        reactions_list = []
        if message_id in message_reactions:
            for emoji_key, users in message_reactions[message_id].items():
                reactions_list.append({
                    'emoji': emoji_key,
                    'users': users,
                    'count': len(users)
                })
        
        await sio.emit('reaction_updated', {
            'messageId': message_id,
            'reactions': reactions_list
        }, room=room)

@sio.event
async def typing_start(sid, data):
    if sid not in active_users:
        return
        
    user_data = active_users[sid]
    username = user_data.get('username', 'Anonymous')
    room = user_data.get('room')
    is_private = data.get('isPrivate', False)
    target_user_id = data.get('targetUserId')
    
    if is_private and target_user_id:
        await sio.emit('user_typing', {
            'username': username,
            'userId': sid,
            'typing': True,
            'isPrivate': True
        }, room=target_user_id)
    elif room:
        await sio.emit('user_typing', {
            'username': username,
            'userId': sid,
            'room': room,
            'typing': True,
            'isPrivate': False
        }, room=room, skip_sid=sid)

@sio.event
async def typing_stop(sid, data):
    if sid not in active_users:
        return
        
    user_data = active_users[sid]
    username = user_data.get('username', 'Anonymous')
    room = user_data.get('room')
    is_private = data.get('isPrivate', False)
    target_user_id = data.get('targetUserId')
    
    if is_private and target_user_id:
        await sio.emit('user_typing', {
            'username': username,
            'userId': sid,
            'typing': False,
            'isPrivate': True
        }, room=target_user_id)
    elif room:
        await sio.emit('user_typing', {
            'username': username,
            'userId': sid,
            'room': room,
            'typing': False,
            'isPrivate': False
        }, room=room, skip_sid=sid)

async def update_room_users(room):
    if room not in room_users:
        return
    
    users_in_room = []
    for user_sid in room_users[room]:
        if user_sid in active_users:
            user_data = active_users[user_sid]
            users_in_room.append({
                'username': user_data.get('username', 'Anonymous'),
                'id': user_sid,
                'isOnline': True
            })
    
    await sio.emit('room_users', {
        'room': room,
        'users': users_in_room,
        'count': len(users_in_room)
    }, room=room)

# ============= NEW STRANGER CHAT FEATURES =============

@sio.event
async def enter_stranger_mode(sid, data):
    """Switch to stranger chat mode"""
    print(f"🎭 User {sid} entering stranger mode")
    log_stranger_connections("ENTER_STRANGER_MODE_START", sid)
    
    # Generate anonymous username
    username = generate_anonymous_username()
    
    # Store stranger user info
    stranger_chat.stranger_users[sid] = {
        'username': username,
        'connected_at': datetime.now().isoformat(),
        'status': 'connected',
        'interests': [],
        'partner': None,
        'in_video_call': False
    }
    
    # Update regular user mode
    if sid in active_users:
        active_users[sid]['mode'] = 'stranger'
    
    log_stranger_connections("ENTER_STRANGER_MODE_END", sid)
    
    await sio.emit('stranger_mode_entered', {
        'username': username,
        'user_id': sid,
        'message': 'Welcome to Stranger Chat! Click "Find Stranger" to start.'
    }, room=sid)

@sio.event
async def find_stranger(sid, data):
    """Find a random stranger to chat with"""
    print(f"🔍 User {sid} looking for stranger")
    log_stranger_connections("FIND_STRANGER_START", sid)
    
    if sid not in stranger_chat.stranger_users:
        await sio.emit('error', {'message': 'Not in stranger mode'}, room=sid)
        return
    
    # If already in conversation, disconnect first
    if sid in stranger_chat.stranger_connections:
        print(f"⚠️ User {sid} already has connection, disconnecting first")
        await disconnect_from_stranger_chat(sid)
    
    interests = data.get('interests', []) if data else []
    stranger_chat.stranger_users[sid]['interests'] = interests
    stranger_chat.stranger_users[sid]['status'] = 'searching'
    
    # Try to find match based on interests first
    partner_id = None
    
    if interests:
        for interest in interests:
            if interest in stranger_chat.interest_queues and stranger_chat.interest_queues[interest]:
                partner_id = stranger_chat.interest_queues[interest].pop(0)
                print(f"🎯 Found interest match: {sid} <-> {partner_id} (interest: {interest})")
                break
    
    # If no interest match, try general queue
    if not partner_id and stranger_chat.waiting_queue:
        partner_id = stranger_chat.waiting_queue.pop(0)
        print(f"🎯 Found general match: {sid} <-> {partner_id}")
    
    if partner_id and partner_id in stranger_chat.stranger_users:
        # Match found!
        print(f"✅ Match confirmed: {sid} <-> {partner_id}")
        await create_stranger_chat_session(sid, partner_id)
    else:
        # No match, add to appropriate queue
        if interests:
            for interest in interests:
                if interest not in stranger_chat.interest_queues:
                    stranger_chat.interest_queues[interest] = []
                stranger_chat.interest_queues[interest].append(sid)
                print(f"📝 Added {sid} to interest queue: {interest}")
        else:
            stranger_chat.waiting_queue.append(sid)
            print(f"📝 Added {sid} to general waiting queue")
        
        log_stranger_connections("FIND_STRANGER_WAITING", sid)
        
        await sio.emit('searching_stranger', {
            'message': 'Looking for a stranger...',
            'interests': interests
        }, room=sid)

async def create_stranger_chat_session(user1_id: str, user2_id: str):
    """Create a chat session between two strangers"""
    print(f"👥 Creating stranger chat session: {user1_id} <-> {user2_id}")
    log_stranger_connections("CREATE_SESSION_START", user1_id, f"Partner: {user2_id}")
    
    # Update active connections - THIS IS CRITICAL
    stranger_chat.stranger_connections[user1_id] = user2_id
    stranger_chat.stranger_connections[user2_id] = user1_id
    print(f"✅ Added connections: {user1_id} -> {user2_id}, {user2_id} -> {user1_id}")
    
    # Update user status
    stranger_chat.stranger_users[user1_id]['status'] = 'chatting'
    stranger_chat.stranger_users[user1_id]['partner'] = user2_id
    stranger_chat.stranger_users[user2_id]['status'] = 'chatting'
    stranger_chat.stranger_users[user2_id]['partner'] = user1_id
    
    log_stranger_connections("CREATE_SESSION_CONNECTIONS_SET", user1_id, f"Partner: {user2_id}")
    
    # Create room
    room_id = create_stranger_room_id(user1_id, user2_id)
    await sio.enter_room(user1_id, room_id)
    await sio.enter_room(user2_id, room_id)
    print(f"🏠 Created room: {room_id}")
    
    # Notify both users
    await sio.emit('stranger_found', {
        'message': 'Stranger found! You can now start chatting.',
        'room_id': room_id,
        'partner_id': user2_id,
        'can_video_chat': True
    }, room=user1_id)
    
    await sio.emit('stranger_found', {
        'message': 'Stranger found! You can now start chatting.',
        'room_id': room_id,
        'partner_id': user1_id,
        'can_video_chat': True
    }, room=user2_id)
    
    log_stranger_connections("CREATE_SESSION_END", user1_id, f"Session created successfully with {user2_id}")
    print(f"✅ Stranger session created successfully: {user1_id} <-> {user2_id}")

@sio.event
async def send_stranger_message(sid, data):
    """Send message to current stranger chat partner"""
    print(f"💬 Stranger message from {sid}")
    log_stranger_connections("SEND_STRANGER_MESSAGE", sid)
    
    if sid not in stranger_chat.stranger_connections:
        await sio.emit('error', {'message': 'Not in a stranger chat session'}, room=sid)
        return
    
    partner_id = stranger_chat.stranger_connections[sid]
    message_content = data.get('message', '').strip()
    
    if not message_content:
        return
    
    username = stranger_chat.stranger_users[sid]['username']
    room_id = create_stranger_room_id(sid, partner_id)
    
    message_data = {
        'type': 'stranger_message',
        'content': message_content,
        'username': username,
        'userId': sid,
        'timestamp': datetime.now().isoformat(),
        'id': f"stranger_{sid}_{int(datetime.now().timestamp() * 1000)}"
    }
    
    await sio.emit('stranger_message', message_data, room=room_id)
    print(f"✅ Stranger message sent: {sid} -> {partner_id}")

@sio.event
async def skip_stranger(sid, data):
    """Skip current stranger and find new one"""
    print(f"⏭️ User {sid} skipping stranger")
    log_stranger_connections("SKIP_STRANGER_START", sid)
    
    await disconnect_from_stranger_chat(sid)
    
    log_stranger_connections("SKIP_STRANGER_AFTER_DISCONNECT", sid)
    
    # Automatically find new stranger
    await find_stranger(sid, data)

async def disconnect_from_stranger_chat(sid):
    """Disconnect user from current stranger chat"""
    print(f"🔌 Disconnecting {sid} from stranger chat")
    log_stranger_connections("DISCONNECT_STRANGER_START", sid)
    
    if sid in stranger_chat.stranger_connections:
        partner_id = stranger_chat.stranger_connections[sid]
        print(f"🔌 Found partner {partner_id} for {sid}")
        
        # Notify partner
        if partner_id in stranger_chat.stranger_users:
            await sio.emit('stranger_disconnected', {
                'message': 'Stranger has disconnected'
            }, room=partner_id)
            print(f"📢 Notified {partner_id} about disconnection")
            
            # Remove partner from active connections
            if partner_id in stranger_chat.stranger_connections:
                del stranger_chat.stranger_connections[partner_id]
                print(f"🧹 Removed partner {partner_id} from connections")
            
            # Update partner status
            stranger_chat.stranger_users[partner_id]['status'] = 'connected'
            stranger_chat.stranger_users[partner_id]['partner'] = None
            print(f"📝 Updated partner {partner_id} status to connected")
        
        # Remove user from active connections
        del stranger_chat.stranger_connections[sid]
        print(f"🧹 Removed user {sid} from connections")
        
        # Update user status
        stranger_chat.stranger_users[sid]['status'] = 'connected'
        stranger_chat.stranger_users[sid]['partner'] = None
        print(f"📝 Updated user {sid} status to connected")
    
    log_stranger_connections("DISCONNECT_STRANGER_END", sid)

# ============= VIDEO CHAT EVENTS FOR STRANGER CHAT =============

@sio.event
async def start_video_call(sid, data):
    """Initiate video call with current stranger chat partner"""
    print(f"📞 Starting video call from {sid}")
    log_stranger_connections("START_VIDEO_CALL", sid)
    
    # Validate user is in stranger mode
    if sid not in stranger_chat.stranger_users:
        print(f"❌ User {sid} not in stranger mode")
        await sio.emit('error', {'message': 'Please enter stranger mode first'}, room=sid)
        return
    
    # Validate user has stranger connection
    if sid not in stranger_chat.stranger_connections:
        print(f"❌ User {sid} not in stranger connections")
        print(f"❌ User stranger status: {stranger_chat.stranger_users[sid].get('status')}")
        
        # Check if user is still searching
        if stranger_chat.stranger_users[sid].get('status') == 'searching':
            await sio.emit('error', {'message': 'Still searching for stranger. Please wait.'}, room=sid)
        else:
            await sio.emit('error', {'message': 'No stranger connected. Please find a stranger first.'}, room=sid)
        return
    
    partner_id = stranger_chat.stranger_connections[sid]
    room_id = create_stranger_room_id(sid, partner_id)
    
    print(f"📞 Creating video call session for room: {room_id}")
    print(f"📞 Partner: {partner_id}")
    
    # Create video call session but KEEP stranger connections
    stranger_chat.video_calls[room_id] = {
        'initiator': sid,
        'partner': partner_id,
        'status': 'calling',
        'created_at': datetime.now().isoformat()
    }
    
    # Update user video status but KEEP stranger connection
    if sid in stranger_chat.stranger_users:
        stranger_chat.stranger_users[sid]['in_video_call'] = True
    if partner_id in stranger_chat.stranger_users:
        stranger_chat.stranger_users[partner_id]['in_video_call'] = True
    
    print(f"📞 Sending video call invitation to {partner_id}")
    
    # Notify partner about incoming video call
    await sio.emit('incoming_video_call', {
        'caller_id': sid,
        'room_id': room_id
    }, room=partner_id)
    
    # Notify caller that call was initiated
    await sio.emit('video_call_initiated', {
        'room_id': room_id,
        'partner_id': partner_id,
        'initiator': sid
    }, room=sid)
    
    log_stranger_connections("START_VIDEO_CALL_END", sid, f"Video call initiated with {partner_id}")
    print(f"✅ Video call initiated successfully")

@sio.event
async def accept_video_call(sid, data):
    """Accept incoming video call"""
    room_id = data.get('room_id')
    print(f"✅ Video call accepted by {sid} for room {room_id}")
    log_stranger_connections("ACCEPT_VIDEO_CALL", sid, f"Room: {room_id}")
    
    if room_id in stranger_chat.video_calls:
        call_info = stranger_chat.video_calls[room_id]
        call_info['status'] = 'active'
        
        # Update user video status but KEEP stranger connections
        if sid in stranger_chat.stranger_users:
            stranger_chat.stranger_users[sid]['in_video_call'] = True
        if call_info['initiator'] in stranger_chat.stranger_users:
            stranger_chat.stranger_users[call_info['initiator']]['in_video_call'] = True
        
        # Notify both users that call is accepted
        await sio.emit('video_call_accepted', {
            'room_id': room_id,
            'initiator': call_info['initiator'],
            'partner': sid
        }, room=call_info['initiator'])
        
        await sio.emit('video_call_accepted', {
            'room_id': room_id,
            'initiator': call_info['initiator'],
            'partner': sid
        }, room=sid)
        
        print(f"✅ Video call active in room {room_id}")
        log_stranger_connections("ACCEPT_VIDEO_CALL_END", sid, f"Video call accepted, connections maintained")

@sio.event
async def reject_video_call(sid, data):
    """Reject incoming video call"""
    room_id = data.get('room_id')
    print(f"❌ Video call rejected by {sid} for room {room_id}")
    
    if room_id in stranger_chat.video_calls:
        initiator_id = stranger_chat.video_calls[room_id]['initiator']
        
        # Remove call session
        del stranger_chat.video_calls[room_id]
        
        # Notify initiator
        await sio.emit('video_call_rejected', {
            'message': 'Video call was rejected'
        }, room=initiator_id)

@sio.event
async def end_video_call(sid, data):
    """End current video call"""
    room_id = data.get('room_id')
    print(f"📞 Ending video call by {sid} for room {room_id}")
    log_stranger_connections("END_VIDEO_CALL", sid, f"Room: {room_id}")
    
    if room_id in stranger_chat.video_calls:
        call_info = stranger_chat.video_calls[room_id]
        
        # Update user video status but KEEP stranger connections
        if call_info['initiator'] in stranger_chat.stranger_users:
            stranger_chat.stranger_users[call_info['initiator']]['in_video_call'] = False
        if call_info['partner'] in stranger_chat.stranger_users:
            stranger_chat.stranger_users[call_info['partner']]['in_video_call'] = False
        
        # Remove call session
        del stranger_chat.video_calls[room_id]
        
        # Notify both users
        await sio.emit('video_call_ended', {
            'message': 'Video call ended'
        }, room=call_info['initiator'])
        
        await sio.emit('video_call_ended', {
            'message': 'Video call ended'
        }, room=call_info['partner'])

@sio.event
async def webrtc_offer(sid, data):
    """Forward WebRTC offer to partner in peer-to-peer connection"""
    print(f"📡 WebRTC offer received from {sid}")
    log_stranger_connections("WEBRTC_OFFER", sid)
    
    if sid not in stranger_chat.stranger_connections:
        print(f"❌ User {sid} not in stranger connections")
        print(f"❌ Available connections: {list(stranger_chat.stranger_connections.keys())}")
        
        # Try to find the connection through video calls
        partner_id = None
        for room_id, call_info in stranger_chat.video_calls.items():
            if call_info['initiator'] == sid:
                partner_id = call_info['partner']
                print(f"📡 Found partner through video call (as initiator): {partner_id}")
                break
            elif call_info['partner'] == sid:
                partner_id = call_info['initiator']
                print(f"📡 Found partner through video call (as partner): {partner_id}")
                break
        
        if partner_id:
            print(f"📡 Using video call partner: {partner_id}")
        else:
            await sio.emit('error', {'message': 'Not in a stranger chat session'}, room=sid)
            return
    else:
        partner_id = stranger_chat.stranger_connections[sid]
        print(f"📡 Using stranger connection partner: {partner_id}")
    
    print(f"📡 Forwarding offer from {sid} to partner {partner_id}")
    
    try:
        await sio.emit('webrtc_offer', {
            'offer': data.get('offer'),
            'from': sid
        }, room=partner_id)
        
        print(f"✅ Offer forwarded successfully to {partner_id}")
    except Exception as e:
        print(f"❌ Error forwarding offer: {e}")

@sio.event
async def webrtc_answer(sid, data):
    """Forward WebRTC answer to partner in peer-to-peer connection"""
    print(f"📡 WebRTC answer received from {sid}")
    log_stranger_connections("WEBRTC_ANSWER", sid)
    
    partner_id = None
    
    # Try stranger connections first
    if sid in stranger_chat.stranger_connections:
        partner_id = stranger_chat.stranger_connections[sid]
        print(f"📡 Found partner via stranger connections: {partner_id}")
    else:
        # Try to find through video calls
        for room_id, call_info in stranger_chat.video_calls.items():
            if call_info['initiator'] == sid:
                partner_id = call_info['partner']
                print(f"📡 Found partner via video call (as initiator): {partner_id}")
                break
            elif call_info['partner'] == sid:
                partner_id = call_info['initiator']
                print(f"📡 Found partner via video call (as partner): {partner_id}")
                break
    
    if not partner_id:
        print(f"❌ No partner found for {sid}")
        return
    
    print(f"📡 Forwarding answer from {sid} to partner {partner_id}")
    
    try:
        await sio.emit('webrtc_answer', {
            'answer': data.get('answer'),
            'from': sid
        }, room=partner_id)
        
        print(f"✅ Answer forwarded successfully to {partner_id}")
    except Exception as e:
        print(f"❌ Error forwarding answer: {e}")

@sio.event
async def webrtc_ice_candidate(sid, data):
    """Forward ICE candidate to partner in peer-to-peer connection"""
    print(f"🧊 ICE candidate received from {sid}")
    
    partner_id = None
    
    # Try stranger connections first
    if sid in stranger_chat.stranger_connections:
        partner_id = stranger_chat.stranger_connections[sid]
    else:
        # Try to find through video calls
        for room_id, call_info in stranger_chat.video_calls.items():
            if call_info['initiator'] == sid:
                partner_id = call_info['partner']
                break
            elif call_info['partner'] == sid:
                partner_id = call_info['initiator']
                break
    
    if not partner_id:
        return
    
    try:
        await sio.emit('webrtc_ice_candidate', {
            'candidate': data.get('candidate'),
            'from': sid
        }, room=partner_id)
        
        print(f"✅ ICE candidate forwarded to {partner_id}")
    except Exception as e:
        print(f"❌ Error forwarding ICE candidate: {e}")

@sio.event
async def ping(sid, data):
    """Handle ping for debugging"""
    print(f"🏓 Ping received from {sid}: {data}")
    await sio.emit('pong', {'message': 'Server received ping'}, room=sid)

# ============= API ENDPOINTS =============

@app.get("/debug/connections")
async def debug_connections():
    return {
        "stranger_connections": stranger_chat.stranger_connections,
        "video_calls": stranger_chat.video_calls,
        "stranger_users": {k: {
            'username': v.get('username'),
            'status': v.get('status'),
            'in_video_call': v.get('in_video_call'),
            'partner': v.get('partner')
        } for k, v in stranger_chat.stranger_users.items()},
        "waiting_queue": stranger_chat.waiting_queue,
        "total_connections": len(stranger_chat.stranger_connections)
    }

@app.get("/debug/user/{user_id}")
async def debug_user(user_id: str):
    return {
        "user_id": user_id,
        "in_stranger_connections": user_id in stranger_chat.stranger_connections,
        "partner": stranger_chat.stranger_connections.get(user_id),
        "in_stranger_users": user_id in stranger_chat.stranger_users,
        "user_data": stranger_chat.stranger_users.get(user_id),
        "in_video_calls": any(
            call['initiator'] == user_id or call['partner'] == user_id 
            for call in stranger_chat.video_calls.values()
        ),
        "video_call_details": [
            call for call in stranger_chat.video_calls.values()
            if call['initiator'] == user_id or call['partner'] == user_id
        ]
    }

@app.get("/")
async def root():
    return {
        "message": "Multi-Feature Chat API",
        "status": "running",
        "features": [
            "Regular chat rooms",
            "Private messaging", 
            "File sharing",
            "Message reactions",
            "Message replies",
            "Random stranger matching",
            "Peer-to-peer video chat with WebRTC",
            "Interest-based matching",
            "Anonymous usernames"
        ]
    }

@app.get("/debug")
async def debug():
    return {
        "regular_chat": {
            "active_users": len(active_users),
            "room_users": {k: len(v) for k, v in room_users.items()},
            "private_conversations": len(private_conversations),
            "message_reactions": len(message_reactions)
        },
        "stranger_chat": {
            "total_stranger_users": len(stranger_chat.stranger_users),
            "waiting_users": len(stranger_chat.waiting_queue),
            "active_stranger_chats": len(stranger_chat.stranger_connections) // 2,
            "video_calls": len(stranger_chat.video_calls),
            "interest_queues": {k: len(v) for k, v in stranger_chat.interest_queues.items()},
            "stranger_connections": stranger_chat.stranger_connections,
            "video_call_details": stranger_chat.video_calls
        }
    }

@app.get("/debug/video_calls")
async def debug_video_calls():
    return {
        "active_video_calls": stranger_chat.video_calls,
        "stranger_connections": stranger_chat.stranger_connections,
        "stranger_users": {k: v for k, v in stranger_chat.stranger_users.items()}
    }

@app.get("/stats")
async def get_stats():
    return {
        "regular_chat": {
            "total_users": len(active_users),
            "active_rooms": len(room_users),
            "private_conversations": len(private_conversations)
        },
        "stranger_chat": {
            "total_stranger_users": len(stranger_chat.stranger_users),
            "waiting_users": len(stranger_chat.waiting_queue),
            "active_chats": len(stranger_chat.stranger_connections) // 2,
            "video_calls": len(stranger_chat.video_calls)
        }
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "total_connections": len(active_users) + len(stranger_chat.stranger_users),
        "regular_chat_active": len(active_users),
        "stranger_chat_active": len(stranger_chat.stranger_users),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print("🚀 Starting Multi-Feature Chat Server...")
    print("🌐 Server: http://localhost:8000")
    print("🔌 Socket.IO: ws://localhost:8000/socket.io/")
    print("📊 Stats: http://localhost:8000/stats")
    print("🐛 Debug: http://localhost:8000/debug")
    print("🏥 Health: http://localhost:8000/health")
    print("📋 Features: Regular Rooms + Stranger Chat + Peer-to-Peer Video Calls")
    print("🔍 Debug endpoints:")
    print("   - /debug/connections - View all stranger connections")
    print("   - /debug/user/{socket_id} - View specific user state")
    uvicorn.run(app, host="0.0.0.0", port=port)
