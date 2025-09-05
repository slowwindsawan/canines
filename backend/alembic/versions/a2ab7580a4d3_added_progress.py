"""added progress.

Revision ID: a2ab7580a4d3
Revises: 8fae5f114df1
Create Date: 2025-09-05 22:16:49.229843

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision: str = 'a2ab7580a4d3'
down_revision: Union[str, Sequence[str], None] = '8fae5f114df1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('dogs', sa.Column('progress', sa.JSON(), nullable=True))

def downgrade() -> None:
    op.drop_column('dogs', 'progress')