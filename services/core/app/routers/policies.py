"""Admin publishes versioned policies; mobile reads latest published version."""
from fastapi import APIRouter,Depends
from pydantic import BaseModel,Field
from sqlalchemy import text
from common.db import engine
from common.security import CurrentUser,current_user,require_roles
router=APIRouter(prefix='/policies',tags=['policies'])
class PolicyIn(BaseModel):
    content: str=Field(min_length=20,max_length=30000)
@router.get('/current')
def current(_=Depends(current_user)):
    with engine().connect() as c:
        r=c.execute(text('SELECT version,content,published_at FROM rental_policies ORDER BY version DESC LIMIT 1')).first()
        return {'version':r.version,'content':r.content,'publishedAt':r.published_at.isoformat()} if r else {'version':None,'content':'Chưa có chính sách được công bố.','publishedAt':None}
@router.post('',status_code=201)
def publish(body:PolicyIn,user:CurrentUser=Depends(require_roles('ADMIN'))):
    with engine().begin() as c:
        r=c.execute(text('INSERT INTO rental_policies(content,published_by) VALUES (:content,CAST(:u AS uuid)) RETURNING version,published_at'),{'content':body.content.strip(),'u':user.id}).first()
        return {'version':r.version,'publishedAt':r.published_at.isoformat()}
