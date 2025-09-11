"""added health summary.

Revision ID: 3e50de129f9f
Revises: 6abf42b50a1f
Create Date: 2025-09-11 13:39:29.532802

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3e50de129f9f'
down_revision: Union[str, Sequence[str], None] = '6abf42b50a1f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('dogs', sa.Column('health_summary', sa.JSON(), nullable=True))

def downgrade() -> None:
    op.drop_column('dogs', 'health_summary')
