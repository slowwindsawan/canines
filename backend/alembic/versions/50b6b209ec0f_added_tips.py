"""added tips

Revision ID: 50b6b209ec0f
Revises: d18679ad7954
Create Date: 2025-09-09 09:56:05.767251

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision: str = '50b6b209ec0f'
down_revision: Union[str, Sequence[str], None] = 'd18679ad7954'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add a 'tip' column to admin_settings.
    We add it nullable initially (safer for existing rows). If you want it NOT NULL,
    see the commented alternative below which sets a server_default and then makes it non-nullable.
    """
    op.add_column(
        "admin_settings",
        sa.Column("tip", sa.String(length=2000), nullable=True),
    )

def downgrade() -> None:
    """Remove the 'tip' column from admin_settings."""
    op.drop_column("admin_settings", "tip")