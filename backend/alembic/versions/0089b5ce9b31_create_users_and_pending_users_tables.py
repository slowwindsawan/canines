"""create pending_users table only

Revision ID: 0089b5ce9b31
Revises: 3bbc3715e334
Create Date: 2025-09-19 21:10:59.159653
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0089b5ce9b31'
down_revision: Union[str, Sequence[str], None] = '3bbc3715e334'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: create pending_users only."""
    op.create_table(
        'pending_users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('username', sa.String(length=80), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=True, server_default=''),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('otp', sa.String(length=20), nullable=False),
        sa.Column('otp_expiry', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    # indexes
    op.create_index('ix_pending_users_email', 'pending_users', ['email'], unique=True)
    op.create_index('ix_pending_users_email_username', 'pending_users', ['email', 'username'], unique=False)
    op.create_index('ix_pending_users_id', 'pending_users', ['id'], unique=True)
    op.create_index('ix_pending_users_username', 'pending_users', ['username'], unique=False)


def downgrade() -> None:
    """Downgrade schema: drop pending_users only."""
    op.drop_index('ix_pending_users_username', table_name='pending_users')
    op.drop_index(op.f('ix_pending_users_id'), table_name='pending_users')
    op.drop_index('ix_pending_users_email_username', table_name='pending_users')
    op.drop_index('ix_pending_users_email', table_name='pending_users')
    op.drop_table('pending_users')
