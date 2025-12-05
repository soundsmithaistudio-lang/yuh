import os
from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import JSON, Column, DateTime, ForeignKey, String, Text, create_engine, func
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)
Base = declarative_base()


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    title = Column(String, nullable=False)
    parent_id = Column(String, ForeignKey("conversations.id"), nullable=True)
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    transcripts = relationship("Transcript", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    sender = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    parent_message_id = Column(String, ForeignKey("messages.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    speaker = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="transcripts")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Lambeck AI Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="."), name="static")


class ConversationCreate(BaseModel):
    title: str
    parent_id: Optional[str] = None
    metadata: Dict = Field(default_factory=dict)


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    metadata: Optional[Dict] = None


class MessageCreate(BaseModel):
    sender: str
    content: str
    parent_message_id: Optional[str] = None


class TranscriptCreate(BaseModel):
    speaker: str
    content: str


class ConversationExport(BaseModel):
    conversation: ConversationCreate
    messages: List[MessageCreate] = Field(default_factory=list)
    transcripts: List[TranscriptCreate] = Field(default_factory=list)


class SettingsUpdate(BaseModel):
    values: Dict[str, object]


class SettingsResponse(BaseModel):
    values: Dict[str, object]


class ConversationSummary(BaseModel):
    id: str
    title: str
    parent_id: Optional[str]
    message_count: int
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    id: str
    sender: str
    content: str
    parent_message_id: Optional[str]
    created_at: datetime


class ExportResponse(BaseModel):
    conversation: ConversationSummary
    messages: List[MessageResponse]
    transcripts: List[TranscriptCreate]


async def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/", include_in_schema=False)
async def root():
    return FileResponse("index.html")


@app.get("/api/conversations", response_model=List[ConversationSummary])
async def list_conversations(db: Session = Depends(get_db)):
    conversations = (
        db.query(
            Conversation.id,
            Conversation.title,
            Conversation.parent_id,
            Conversation.created_at,
            Conversation.updated_at,
            func.count(Message.id).label("message_count"),
        )
        .outerjoin(Message, Conversation.id == Message.conversation_id)
        .group_by(Conversation.id)
        .order_by(Conversation.created_at.desc())
        .all()
    )
    return [ConversationSummary(**dict(conv)) for conv in conversations]


@app.post("/api/conversations", response_model=ConversationSummary)
async def create_conversation(payload: ConversationCreate, db: Session = Depends(get_db)):
    conversation = Conversation(
        title=payload.title,
        parent_id=payload.parent_id,
        metadata=payload.metadata,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return ConversationSummary(
        id=conversation.id,
        title=conversation.title,
        parent_id=conversation.parent_id,
        message_count=0,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@app.put("/api/conversations/{conversation_id}", response_model=ConversationSummary)
async def update_conversation(conversation_id: str, payload: ConversationUpdate, db: Session = Depends(get_db)):
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if payload.title is not None:
        conversation.title = payload.title
    if payload.metadata is not None:
        conversation.metadata = payload.metadata

    db.commit()
    db.refresh(conversation)
    message_count = db.query(Message).filter(Message.conversation_id == conversation.id).count()
    return ConversationSummary(
        id=conversation.id,
        title=conversation.title,
        parent_id=conversation.parent_id,
        message_count=message_count,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@app.get("/api/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def list_messages(conversation_id: str, db: Session = Depends(get_db)):
    if not db.get(Conversation, conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return [
        MessageResponse(
            id=msg.id,
            sender=msg.sender,
            content=msg.content,
            parent_message_id=msg.parent_message_id,
            created_at=msg.created_at,
        )
        for msg in messages
    ]


@app.post("/api/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def create_message(conversation_id: str, payload: MessageCreate, db: Session = Depends(get_db)):
    if not db.get(Conversation, conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")

    message = Message(
        conversation_id=conversation_id,
        sender=payload.sender,
        content=payload.content,
        parent_message_id=payload.parent_message_id,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return MessageResponse(
        id=message.id,
        sender=message.sender,
        content=message.content,
        parent_message_id=message.parent_message_id,
        created_at=message.created_at,
    )


@app.post("/api/conversations/{conversation_id}/transcripts", response_model=TranscriptCreate)
async def create_transcript(conversation_id: str, payload: TranscriptCreate, db: Session = Depends(get_db)):
    if not db.get(Conversation, conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")

    transcript = Transcript(
        conversation_id=conversation_id,
        speaker=payload.speaker,
        content=payload.content,
    )
    db.add(transcript)
    db.commit()
    return payload


@app.get("/api/conversations/{conversation_id}/export", response_model=ExportResponse)
async def export_conversation(conversation_id: str, db: Session = Depends(get_db)):
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    transcripts = (
        db.query(Transcript)
        .filter(Transcript.conversation_id == conversation_id)
        .order_by(Transcript.created_at.asc())
        .all()
    )

    message_count = len(messages)
    summary = ConversationSummary(
        id=conversation.id,
        title=conversation.title,
        parent_id=conversation.parent_id,
        message_count=message_count,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )

    return ExportResponse(
        conversation=summary,
        messages=[
            MessageResponse(
                id=msg.id,
                sender=msg.sender,
                content=msg.content,
                parent_message_id=msg.parent_message_id,
                created_at=msg.created_at,
            )
            for msg in messages
        ],
        transcripts=[
            TranscriptCreate(speaker=t.speaker, content=t.content) for t in transcripts
        ],
    )


@app.post("/api/conversations/import", response_model=ConversationSummary)
async def import_conversation(payload: ExportResponse, db: Session = Depends(get_db)):
    conversation = Conversation(
        title=payload.conversation.title,
        parent_id=payload.conversation.parent_id,
        metadata={},
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    for message in payload.messages:
        db.add(
            Message(
                conversation_id=conversation.id,
                sender=message.sender,
                content=message.content,
                parent_message_id=message.parent_message_id,
                created_at=message.created_at,
            )
        )
    for transcript in payload.transcripts:
        db.add(
            Transcript(
                conversation_id=conversation.id,
                speaker=transcript.speaker,
                content=transcript.content,
            )
        )
    db.commit()

    message_count = db.query(Message).filter(Message.conversation_id == conversation.id).count()
    return ConversationSummary(
        id=conversation.id,
        title=conversation.title,
        parent_id=conversation.parent_id,
        message_count=message_count,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@app.get("/api/settings", response_model=SettingsResponse)
async def get_settings(db: Session = Depends(get_db)):
    settings = db.query(Setting).all()
    values = {setting.key: setting.value for setting in settings}
    return SettingsResponse(values=values)


@app.put("/api/settings", response_model=SettingsResponse)
async def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    for key, value in payload.values.items():
        setting = db.get(Setting, key)
        if setting:
            setting.value = value
        else:
            db.add(Setting(key=key, value=value))
    db.commit()
    return await get_settings(db)


@app.get("/health", include_in_schema=False)
async def healthcheck():
    return {"status": "ok"}
