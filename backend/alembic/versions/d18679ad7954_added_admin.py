"""added admin.

Revision ID: d18679ad7954
Revises: a2ab7580a4d3
Create Date: 2025-09-06 12:18:48.638346

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision: str = 'd18679ad7954'
down_revision: Union[str, Sequence[str], None] = 'a2ab7580a4d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_table(
        'admin_settings',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('singleton_key', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('admin_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('brand_settings', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('preferences', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('activities', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('singleton_key = 1', name='check_singleton_key'),
    )

    op.create_table(
        'articles',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('slug', sa.String(150), unique=True, nullable=False, index=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('cover_image', sa.String(255), nullable=True),
        sa.Column('author_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

def downgrade():
    op.drop_table('articles')
    op.drop_table('admin_settings')