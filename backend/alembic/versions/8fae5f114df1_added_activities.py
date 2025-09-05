"""added activities.

Revision ID: 8fae5f114df1
Revises: 5bcafed47bb5
Create Date: 2025-09-05 12:21:43.909525

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision: str = '8fae5f114df1'
down_revision: Union[str, Sequence[str], None] = '5bcafed47bb5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('dogs', sa.Column('activities', sa.JSON(), nullable=True))

def downgrade() -> None:
    op.drop_column('dogs', 'activities')
